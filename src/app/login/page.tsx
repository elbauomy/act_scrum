import { login } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";

export const metadata = { title: "Sign in · Solo Scrum" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 font-bold text-white">S</div>
          <h1 className="text-xl font-semibold text-slate-900">Solo Scrum</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        </div>
        <ActionForm action={login} className="space-y-4" resetOnSuccess={false}>
          <Field label="User name">
            <Input name="username" required autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </Field>
          <Field label="Password">
            <PasswordInput name="password" required autoComplete="current-password" />
          </Field>
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
