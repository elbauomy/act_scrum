// Who can sign in. Pure logic (no Next.js imports) so it can be unit-tested.
import { createHash, timingSafeEqual } from "node:crypto";

export type Role = "admin" | "viewer";
export type Account = { username: string; role: Role; password: string | undefined };

/** "  Khaled   ElBauomy " and "khaled elbauomy" are the same user name. */
export const normalizeName = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** "khaled elbauomy" -> "Khaled Elbauomy" */
export const displayName = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

/**
 * The two accounts. The owner can change everything; the viewer can only look.
 * Passwords come from the environment (`APP_PASSWORD`, `VIEWER_PASSWORD`), never from the code.
 */
export function accountsFromEnv(env: Record<string, string | undefined>): Account[] {
  return [
    { username: env.ADMIN_USERNAME?.trim() || "khaled elbauomy", role: "admin", password: env.APP_PASSWORD },
    { username: env.VIEWER_USERNAME?.trim() || "remoon milad", role: "viewer", password: env.VIEWER_PASSWORD },
  ];
}

/** Compare two strings in constant time. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/** The matching account, or null. An account without a password can never sign in. The work done does not depend on whether the user name exists. */
export function authenticate(username: string, password: string, accounts: Account[]): Account | null {
  const match = accounts.find((a) => normalizeName(a.username) === normalizeName(username)) ?? null;
  const samePassword = safeEqual(password, match?.password || "\u0000no-account\u0000");
  return match && match.password && password.length > 0 && samePassword ? match : null;
}
