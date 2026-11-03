"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

/**
 * The dark ACT sidebar. On a phone it becomes a top bar with a menu button; the menu closes by itself
 * when you open a page (it is only "open" for the page where it was opened).
 */
export function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  return (
    <aside className="no-print z-20 bg-neutral-950 text-neutral-200 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-white/5">
      <div className="flex items-center justify-between px-5 py-3.5 md:py-6">
        <Link href="/" aria-label="Solo Scrum home" className="flex items-center gap-3">
          <Image src="/brand/act-logo.png" alt="ACT" width={640} height={257} priority className="h-9 w-auto md:h-10" />
          <span className="hidden h-6 w-px bg-white/15 sm:block" aria-hidden />
          <span className="hidden text-sm font-semibold tracking-tight text-neutral-200 sm:block">Solo Scrum</span>
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpenOn(open ? null : pathname)}
          className="rounded-lg p-2 text-neutral-300 hover:bg-white/10 md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      <div className={cn(open ? "flex" : "hidden", "max-h-[calc(100vh-4.5rem)] flex-col md:flex md:max-h-none md:min-h-0 md:flex-1")}>{children}</div>
    </aside>
  );
}
