import { parseDate } from "./dates";

export const selectCls = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";
export const applyCls = "rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700";

/** Parse a YYYY-MM-DD query value, or null when missing or invalid. */
export function dateParam(v: string | undefined): Date | null {
  if (!v) return null;
  try {
    return parseDate(v);
  } catch {
    return null;
  }
}

/** Build "?a=1&b=2" from the non-empty values. */
export function toQuery(params: Record<string, string | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** First value when Next gives an array. */
export function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
