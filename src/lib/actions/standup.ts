"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDate } from "@/lib/dates";
import { type ActionState, isoDate, toActionError } from "@/lib/action-state";

const text = z.string().max(4000, "Text is too long").default("");
const schema = z.object({ date: isoDate, squadId: z.string().min(1), memberId: z.string().min(1), yesterday: text, today: text, blockers: text });

export async function saveStandup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  try {
    const d = schema.parse(Object.fromEntries(formData.entries()));
    const date = parseDate(d.date);
    const empty = !d.yesterday.trim() && !d.today.trim() && !d.blockers.trim();
    if (empty) {
      await db.standupEntry.deleteMany({ where: { date, squadId: d.squadId, memberId: d.memberId } });
    } else {
      await db.standupEntry.upsert({
        where: { date_squadId_memberId: { date, squadId: d.squadId, memberId: d.memberId } },
        update: { yesterday: d.yesterday, today: d.today, blockers: d.blockers },
        create: { date, squadId: d.squadId, memberId: d.memberId, yesterday: d.yesterday, today: d.today, blockers: d.blockers },
      });
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/standup");
  return { ok: true };
}
