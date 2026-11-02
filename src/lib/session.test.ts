import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, isValidSessionToken, readSession } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
});

describe("session tokens", () => {
  it("carry the role and the user name", async () => {
    expect(await readSession(await createSessionToken("admin", "khaled elbauomy"))).toEqual({ role: "admin", name: "khaled elbauomy" });
    expect(await readSession(await createSessionToken("viewer", "remoon milad"))).toEqual({ role: "viewer", name: "remoon milad" });
  });
  it("reject a missing, damaged or forged token", async () => {
    const good = await createSessionToken("viewer", "remoon milad");
    expect(await readSession(undefined)).toBeNull();
    expect(await readSession("not-a-token")).toBeNull();
    // changing the payload (viewer -> admin) breaks the signature
    const [h, p, sig] = good.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ role: "admin", name: "remoon milad" })).toString("base64url");
    expect(await readSession(`${h}.${forgedPayload}.${sig}`)).toBeNull();
    expect(await isValidSessionToken(`${h}.${p}.${sig.slice(0, -2)}xx`)).toBe(false);
  });
  it("reject a token signed with another secret or with an unknown role", async () => {
    const other = await new SignJWT({ role: "admin", name: "x" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode("another-secret-another-secret-another-123"));
    expect(await readSession(other)).toBeNull();
    const unknown = await new SignJWT({ role: "root", name: "x" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode(process.env.SESSION_SECRET!));
    expect(await readSession(unknown)).toBeNull();
  });
  it("reject an expired token", async () => {
    const old = await new SignJWT({ role: "admin", name: "x" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt(1).setExpirationTime(2).sign(new TextEncoder().encode(process.env.SESSION_SECRET!));
    expect(await readSession(old)).toBeNull();
  });
});
