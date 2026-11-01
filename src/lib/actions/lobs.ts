"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { type ActionState, formObject, optionalInt, optionalText, requiredName, toActionError } from "@/lib/action-state";

const lobSchema = z.object({
  name: requiredName,
  description: optionalText,
  squadId: z.string().min(1, "Please choose the squad that owns this line of business"),
  sprintLengthDays: optionalInt,
});

export async function createLob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  try {
    await db.lineOfBusiness.create({ data: lobSchema.parse(formObject(formData)) });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateLob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  try {
    const id = String(formData.get("id"));
    await db.lineOfBusiness.update({ where: { id }, data: lobSchema.parse(formObject(formData)) });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect("/lobs");
}

export async function deleteLob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAuth();
  try {
    // From phase 2, deletion will be blocked while the LOB has work items or sprints.
    await db.lineOfBusiness.delete({ where: { id: String(formData.get("id")) } });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect("/lobs");
}
