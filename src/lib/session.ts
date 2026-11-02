// Session token helpers. Safe to use from proxy.ts (no Node-only imports).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "act_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export type SessionRole = "admin" | "viewer";
export type SessionData = { role: SessionRole; name: string };

export async function createSessionToken(role: SessionRole, name: string): Promise<string> {
  return new SignJWT({ role, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Who is signed in, or null when the token is missing, forged or expired. */
export async function readSession(token: string | undefined): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.role !== "admin" && payload.role !== "viewer") return null;
    return { role: payload.role, name: typeof payload.name === "string" && payload.name ? payload.name : "khaled elbauomy" };
  } catch {
    return null;
  }
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  return (await readSession(token)) != null;
}
