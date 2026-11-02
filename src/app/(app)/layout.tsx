import { Nav } from "@/components/nav";
import { logout } from "@/lib/actions/auth";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/credentials";
import { RoleProvider } from "@/components/role-provider";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const viewer = session.role === "viewer";
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-600 text-sm font-bold text-white">S</div>
          <span className="font-semibold text-slate-900">Solo Scrum</span>
        </div>
        <div className="px-2 pb-4">
          <Nav />
          <div className="mt-6 px-3 text-xs text-slate-500">
            <div className="font-medium text-slate-700">{displayName(session.name)}</div>
            {viewer ? <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">View only</span> : <span>Owner</span>}
          </div>
          <form action={logout} className="mt-3 px-3">
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <RoleProvider readOnly={viewer}>
          {viewer && (
            <p role="note" className="no-print mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You are signed in with a view-only account: you can look at everything and download reports, but nothing can be changed.
            </p>
          )}
          {children}
        </RoleProvider>
      </main>
    </div>
  );
}
