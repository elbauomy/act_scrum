import { Nav } from "@/components/nav";
import { logout } from "@/lib/actions/auth";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/credentials";
import { RoleProvider } from "@/components/role-provider";
import { SidebarShell } from "@/components/sidebar-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const viewer = session.role === "viewer";
  const name = displayName(session.name);
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarShell>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-1">
          <Nav />
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-[#f97a1f] text-sm font-semibold uppercase text-neutral-950">
              {name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium capitalize text-white">{name}</div>
              {viewer ? (
                <span className="mt-0.5 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">View only</span>
              ) : (
                <span className="text-xs text-neutral-400">Owner</span>
              )}
            </div>
          </div>
          <form action={logout} className="mt-3">
            <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-white">
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4h3.5A2.5 2.5 0 0120 6.5v11a2.5 2.5 0 01-2.5 2.5H14M10 8l-4 4m0 0l4 4m-4-4h11" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </SidebarShell>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-9">
        <div className="mx-auto max-w-[1500px]">
          <RoleProvider readOnly={viewer}>
            {viewer && (
              <p role="note" className="no-print mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                You are signed in with a view-only account: you can look at everything and download reports, but nothing can be changed.
              </p>
            )}
            {children}
          </RoleProvider>
        </div>
      </main>
    </div>
  );
}
