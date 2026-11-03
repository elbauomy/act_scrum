import Image from "next/image";
import { login } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";

export const metadata = { title: "Sign in · Solo Scrum" };

const POINTS = [
  ["Plan", "Squads, lines of business, sprints and releases in one place."],
  ["Follow", "A timeline built automatically from everyone's availability."],
  ["Report", "Burndown, velocity and health scores, ready to export."],
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-neutral-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 55% at 15% 0%, rgba(252,106,40,0.30), transparent 65%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(252,106,40,0.14), transparent 60%)" }} />
        {/* echoes the swoosh in the logo */}
        <div aria-hidden className="absolute -right-32 top-[58%] h-[3px] w-[150%] -rotate-[8deg] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-70" />
        <div aria-hidden className="absolute -right-32 top-[58%] mt-5 h-px w-[150%] -rotate-[8deg] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        <Image src="/brand/act-logo.png" alt="ACT" width={640} height={257} priority className="relative h-16 w-auto self-start" />
        <div className="relative max-w-xl">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Every squad. Every sprint.
            <span className="block bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">One clear picture.</span>
          </h2>
          <ul className="mt-9 space-y-5">
            {POINTS.map(([title, text]) => (
              <li key={title} className="flex gap-4">
                <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(252,106,40,0.9)]" />
                <p className="text-[15px] text-neutral-300">
                  <strong className="font-semibold text-white">{title}.</strong> {text}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-neutral-500">Advanced Computer Technology · Solo Scrum</p>
      </section>

      {/* Form */}
      <section className="flex flex-col bg-slate-50">
        <div className="bg-neutral-950 px-6 py-5 lg:hidden">
          <Image src="/brand/act-logo.png" alt="ACT" width={640} height={257} priority className="h-10 w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to Solo Scrum to continue.</p>
            <div className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-20px_rgba(0,0,0,0.15)]">
              <ActionForm action={login} className="space-y-4" resetOnSuccess={false}>
                <Field label="User name">
                  <Input name="username" required autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} />
                </Field>
                <Field label="Password">
                  <PasswordInput name="password" required autoComplete="current-password" />
                </Field>
                <SubmitButton className="w-full py-2.5">Sign in</SubmitButton>
              </ActionForm>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
