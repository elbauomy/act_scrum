import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";

/** Shows its content to the owner only. The view-only account does not see create forms, delete buttons and the like. */
export async function EditOnly({ children }: { children: ReactNode }) {
  const session = await getSession();
  return session?.role === "admin" ? <>{children}</> : null;
}

/** True when the signed-in user may change things. For server pages that need the answer itself. */
export async function canEdit(): Promise<boolean> {
  return (await getSession())?.role === "admin";
}
