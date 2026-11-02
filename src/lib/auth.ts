import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, readSession, type SessionData } from "./session";
import type { Account } from "./credentials";
import { ForbiddenError } from "./forbidden";

export async function startSession(account: Account): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(account.role, account.username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Who is signed in (null when nobody). */
export async function getSession(): Promise<SessionData | null> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For pages and downloads that anyone signed in may see (the owner and the view-only user). */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Call at the top of every Server Action: only the owner may change anything.
 * Someone not signed in goes to the login page; the view-only user is refused.
 */
export async function requireAuth(): Promise<void> {
  const session = await requireSession();
  if (session.role !== "admin") throw new ForbiddenError();
}
