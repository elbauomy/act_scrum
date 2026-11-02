"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDate } from "@/lib/dates";
import { type ActionState, isoDate, toActionError } from "@/lib/action-state";

const text = z.string().max(4000, "Text is too long (4000 characters at most)").default("");
const schema = z.object({ date: isoDate, squadId: z.string().min(1), memberId: z.string().min(1), status: text, blockers: text });

/** Save one member's status for one day. Saving an empty status and no blockers removes the note. */
export async function saveStandup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  try {
    const d = schema.parse(Object.fromEntries(formData.entries()));
    const date = parseDate(d.date);
    const empty = !d.status.trim() && !d.blockers.trim();
    if (empty) {
      await db.standupEntry.deleteMany({ where: { date, squadId: d.squadId, memberId: d.memberId } });
    } else {
      // Notes saved in the earlier format (yesterday / today) are folded into the status the first time they are edited.
      await db.standupEntry.upsert({
        where: { date_squadId_memberId: { date, squadId: d.squadId, memberId: d.memberId } },
        update: { status: d.status, blockers: d.blockers, yesterday: "", today: "" },
        create: { date, squadId: d.squadId, memberId: d.memberId, status: d.status, blockers: d.blockers },
      });
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/standup");
  return { ok: true };
}
