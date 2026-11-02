"use client";

import { createContext, useContext, type ReactNode } from "react";

const ReadOnlyContext = createContext(false);

/** Wraps the signed-in pages. When `readOnly` is true every editing control below it switches itself off. */
export function RoleProvider({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  return <ReadOnlyContext.Provider value={readOnly}>{children}</ReadOnlyContext.Provider>;
}

/** True for the view-only account. */
export const useReadOnly = () => useContext(ReadOnlyContext);
