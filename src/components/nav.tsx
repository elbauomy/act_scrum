"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

type NavItem = { href: string; label: string; soon?: boolean; also?: string[] };

const sections: { title: string; items: NavItem[] }[] = [
  { title: "Overview", items: [{ href: "/", label: "Dashboard" }] },
  {
    title: "Organization",
    items: [
      { href: "/squads", label: "Squads" },
      { href: "/lobs", label: "Lines of Business" },
      { href: "/members", label: "Members" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { href: "/backlog", label: "Backlog", also: ["/items"] },
      { href: "/sprints", label: "Sprints" },
      { href: "/board", label: "Sprint Board" },
      { href: "/releases", label: "Releases" },
      { href: "/timeline", label: "Timeline" },
      { href: "/standup", label: "Daily Standup" },
      { href: "/reports", label: "Reports" },
    ],
  },
  { title: "System", items: [{ href: "/settings", label: "Settings" }, { href: "/data", label: "Import & Backup" }] },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-5">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.title}</div>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              if (item.soon) {
                return (
                  <li key={item.label} className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-slate-400">
                    {item.label}
                    <span className="text-[10px] uppercase">soon</span>
                  </li>
                );
              }
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : [item.href, ...(item.also ?? [])].some((p) => pathname.startsWith(p));
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-md px-3 py-1.5 text-sm",
                      active ? "bg-orange-50 font-medium text-orange-700" : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
