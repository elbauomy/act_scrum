import { login } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { Field, Input } from "@/components/ui";

export const metadata = { title: "Sign in · ACT Scrum" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">A</div>
          <h1 className="text-xl font-semibold text-slate-900">ACT Scrum</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        </div>
        <ActionForm action={login} className="space-y-4" resetOnSuccess={false}>
          <Field label="Password">
            <Input type="password" name="password" required autoFocus autoComplete="current-password" />
          </Field>
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
