import Link from "next/link";
import { toQuery } from "@/lib/filters";
import { cn } from "@/components/ui";

/** Switch between the hours-per-member timeline and the daily plan, keeping the filters. */
export function TimelineTabs({ current, filters }: { current: "hours" | "daily"; filters: Record<string, string | undefined> }) {
  const keep = { squad: filters.squad, lob: filters.lob, member: filters.member, sprint: filters.sprint, release: filters.release };
  const tab = (active: boolean) => cn("rounded-md px-3 py-1.5 text-sm", active ? "bg-orange-600 font-medium text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50");
  return (
    <nav className="no-print mb-4 flex flex-wrap gap-1" aria-label="Timeline views">
      <Link href={`/timeline${toQuery(keep)}`} className={tab(current === "hours")}>Hours per member</Link>
      <Link href={`/timeline/daily${toQuery(keep)}`} className={tab(current === "daily")}>Daily plan: who works on what each day</Link>
    </nav>
  );
}
