import { Nav } from "@/components/nav";
import { logout } from "@/lib/actions/auth";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAuth();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">A</div>
          <span className="font-semibold text-slate-900">ACT Scrum</span>
        </div>
        <div className="px-2 pb-4">
          <Nav />
          <form action={logout} className="mt-6 px-3">
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-800">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
