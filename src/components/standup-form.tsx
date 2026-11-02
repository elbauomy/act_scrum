"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveStandup } from "@/lib/actions/standup";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { Field, Textarea } from "@/components/ui";

/** One member's status for the day, typed by hand. The suggestion from task activity is only inserted when asked for. */
export function StandupMemberForm({
  date,
  squadId,
  memberId,
  initialStatus,
  initialBlockers,
  suggestion,
  blockerSuggestion,
}: {
  date: string;
  squadId: string;
  memberId: string;
  initialStatus: string;
  initialBlockers: string;
  suggestion: string;
  blockerSuggestion: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [blockers, setBlockers] = useState(initialBlockers);
  const add = (current: string, extra: string) => (current.trim() ? `${current.trimEnd()}\n${extra}` : extra);

  return (
    <ActionForm action={saveStandup} className="space-y-3" successMessage="Saved." resetOnSuccess={false}>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="squadId" value={squadId} />
      <input type="hidden" name="memberId" value={memberId} />
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <Field label="Status">
          <Textarea name="status" rows={4} maxLength={4000} value={status} onChange={(e) => setStatus(e.target.value)} placeholder="What is this person working on? Anything worth noting?" />
        </Field>
        <Field label="Blockers (optional)">
          <Textarea name="blockers" rows={4} maxLength={4000} value={blockers} onChange={(e) => setBlockers(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Save</SubmitButton>
        {suggestion && (
          <button type="button" onClick={() => setStatus(add(status, suggestion))} className="text-xs text-orange-700 hover:underline">
            Add task activity to the status
          </button>
        )}
        {blockerSuggestion && (
          <button type="button" onClick={() => setBlockers(add(blockers, blockerSuggestion))} className="text-xs text-orange-700 hover:underline">
            Add blocked tasks
          </button>
        )}
      </div>
      {suggestion && <pre className="whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">{suggestion}</pre>}
    </ActionForm>
  );
}

/** Submits its form as soon as the squad, date or member changes. */
export function AutoSubmitForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form className={className} onChange={(e) => e.currentTarget.requestSubmit()}>
      {children}
    </form>
  );
}

/** When no date is in the address, use the date on the user's own clock (the server may be in another time zone). */
export function LocalDateDefault({ serverDate, query }: { serverDate: string; query: string }) {
  const router = useRouter();
  useEffect(() => {
    const d = new Date();
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (local !== serverDate) router.replace(`/standup?${query ? `${query}&` : ""}date=${local}`);
  }, [router, serverDate, query]);
  return null;
}
