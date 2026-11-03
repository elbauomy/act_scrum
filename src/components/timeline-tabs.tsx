import Link from "next/link";
import { toQuery } from "@/lib/filters";
import { tabClass } from "@/components/ui";

/** Switch between the hours-per-member timeline and the daily plan, keeping the filters. */
export function TimelineTabs({ current, filters }: { current: "hours" | "daily"; filters: Record<string, string | undefined> }) {
  const keep = { squad: filters.squad, lob: filters.lob, member: filters.member, sprint: filters.sprint, release: filters.release };
  const tab = tabClass;
  return (
    <nav className="no-print mb-4 flex flex-wrap gap-1" aria-label="Timeline views">
      <Link href={`/timeline${toQuery(keep)}`} className={tab(current === "hours")}>Hours per member</Link>
      <Link href={`/timeline/daily${toQuery(keep)}`} className={tab(current === "daily")}>Daily plan: who works on what each day</Link>
    </nav>
  );
}
