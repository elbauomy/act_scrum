"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth";
import { accountsFromEnv, authenticate } from "@/lib/credentials";
import type { ActionState } from "@/lib/action-state";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 500);
  const account = authenticate(username, password, accountsFromEnv(process.env));
  if (!account) {
    // Small delay makes guessing slower. The message does not say which of the two was wrong.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Wrong user name or password." };
  }
  await startSession(account);
  redirect("/");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
