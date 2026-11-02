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
  initialOff,
  initialOffReason,
  leaveNote,
}: {
  date: string;
  squadId: string;
  memberId: string;
  initialStatus: string;
  initialBlockers: string;
  suggestion: string;
  blockerSuggestion: string;
  initialOff: boolean;
  initialOffReason: string;
  /** Set when the member is on leave that was added on their own page (it cannot be undone here) */
  leaveNote: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [blockers, setBlockers] = useState(initialBlockers);
  const [off, setOff] = useState(initialOff);
  const [reason, setReason] = useState(initialOffReason);
  const add = (current: string, extra: string) => (current.trim() ? `${current.trimEnd()}\n${extra}` : extra);

  return (
    <ActionForm action={saveStandup} className="space-y-3" successMessage="Saved." resetOnSuccess={false}>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="squadId" value={squadId} />
      <input type="hidden" name="memberId" value={memberId} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input type="checkbox" name="off" checked={off} disabled={leaveNote != null} onChange={(e) => setOff(e.target.checked)} />
          Off today
        </label>
        {off && leaveNote == null && (
          <input
            name="offReason"
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional), e.g. sick, annual leave"
            aria-label="Reason for being off"
            className="w-72 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        )}
        {leaveNote != null && <span className="text-xs text-amber-800">On leave: {leaveNote}. Change it on the member&apos;s page.</span>}
      </div>

      {off ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Not working this day{leaveNote == null ? ". Saving adds a day of leave, so capacity and the timeline plan around it." : "."}
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <Field label="Status">
              <Textarea name="status" rows={4} maxLength={4000} value={status} onChange={(e) => setStatus(e.target.value)} placeholder="What is this person working on? Anything worth noting?" />
            </Field>
            <Field label="Blockers (optional)">
              <Textarea name="blockers" rows={4} maxLength={4000} value={blockers} onChange={(e) => setBlockers(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
        </>
      )}
      <SubmitButton>Save</SubmitButton>
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
