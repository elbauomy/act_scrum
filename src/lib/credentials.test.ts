import { describe, expect, it } from "vitest";
import { accountsFromEnv, authenticate, displayName, normalizeName } from "./credentials";

const accounts = accountsFromEnv({ APP_PASSWORD: "owner-pass", VIEWER_PASSWORD: "viewer-pass" });

describe("accounts", () => {
  it("has the owner and a view-only user with the agreed user names", () => {
    expect(accounts.map((a) => [a.username, a.role])).toEqual([["khaled elbauomy", "admin"], ["remoon milad", "viewer"]]);
  });
  it("user names can be changed from the environment", () => {
    expect(accountsFromEnv({ ADMIN_USERNAME: " Boss ", VIEWER_USERNAME: "guest" }).map((a) => a.username)).toEqual(["Boss", "guest"]);
  });
});

describe("authenticate", () => {
  it("signs in each user with their own password", () => {
    expect(authenticate("khaled elbauomy", "owner-pass", accounts)?.role).toBe("admin");
    expect(authenticate("remoon milad", "viewer-pass", accounts)?.role).toBe("viewer");
  });
  it("ignores capital letters and extra spaces in the user name", () => {
    expect(authenticate("  Khaled   ElBauomy ", "owner-pass", accounts)?.role).toBe("admin");
    expect(authenticate("REMOON MILAD", "viewer-pass", accounts)?.role).toBe("viewer");
  });
  it("does not let one user use the other's password", () => {
    expect(authenticate("remoon milad", "owner-pass", accounts)).toBeNull();
    expect(authenticate("khaled elbauomy", "viewer-pass", accounts)).toBeNull();
  });
  it("rejects wrong passwords, unknown users and empty passwords", () => {
    expect(authenticate("khaled elbauomy", "nope", accounts)).toBeNull();
    expect(authenticate("someone else", "owner-pass", accounts)).toBeNull();
    expect(authenticate("khaled elbauomy", "", accounts)).toBeNull();
  });
  it("an account whose password is not set cannot sign in, not even with an empty password", () => {
    const none = accountsFromEnv({ APP_PASSWORD: "owner-pass" });
    expect(authenticate("remoon milad", "", none)).toBeNull();
    expect(authenticate("remoon milad", "undefined", none)).toBeNull();
    expect(authenticate("remoon milad", "\u0000no-account\u0000", none)).toBeNull();
  });
  it("formats names", () => {
    expect(normalizeName("  A   B ")).toBe("a b");
    expect(displayName("khaled elbauomy")).toBe("Khaled Elbauomy");
  });
});
