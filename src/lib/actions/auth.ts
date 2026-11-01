"use server";

import { redirect } from "next/navigation";
import { checkPassword, endSession, startSession } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    // Small delay makes password guessing slower.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Wrong password." };
  }
  await startSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
