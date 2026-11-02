"use client";

import { useState } from "react";
import { saveLobAllocations } from "@/lib/actions/members";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { Input } from "@/components/ui";

export type SplitLob = { id: string; key: string; name: string; hours: number | null };

/** Reserve part of a member's squad hours for individual lines of business. */
export function LobSplitForm({ membershipId, squadName, weeklyHours, lobs }: { membershipId: string; squadName: string; weeklyHours: number; lobs: SplitLob[] }) {
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(lobs.map((l) => [l.id, l.hours ? String(l.hours) : ""])));
  const reserved = Object.values(values).reduce((sum, v) => sum + (Number(v) > 0 ? Number(v) : 0), 0);
  const left = Math.round((weeklyHours - reserved) * 100) / 100;

  return (
    <ActionForm action={saveLobAllocations} className="space-y-3" successMessage="Saved." resetOnSuccess={false}>
      <input type="hidden" name="membershipId" value={membershipId} />
      <p className="text-sm text-slate-600">
        {weeklyHours} h/week in <strong>{squadName}</strong>. Reserve hours for a line of business, or leave it empty so it shares the remaining hours with the other lines.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {lobs.map((l) => (
          <label key={l.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span><span className="font-mono text-xs text-slate-500">{l.key}</span> {l.name}</span>
            <span className="flex items-center gap-1">
              <Input
                type="number"
                name={`hours_${l.id}`}
                min="0"
                max={weeklyHours}
                step="0.5"
                value={values[l.id]}
                onChange={(e) => setValues((v) => ({ ...v, [l.id]: e.target.value }))}
                className="w-20 py-1 text-right"
                aria-label={`Hours per week reserved for ${l.name}`}
              />
              <span className="text-xs text-slate-500">h</span>
            </span>
          </label>
        ))}
      </div>
      <p className={left < 0 ? "text-sm font-medium text-red-700" : "text-sm text-slate-600"}>
        {left < 0 ? `${-left} h too many: the lines add up to ${reserved} h but the squad hours are ${weeklyHours} h.` : `${left} h/week stay shared by all lines of ${squadName}.`}
      </p>
      <SubmitButton disabled={left < 0}>Save split</SubmitButton>
    </ActionForm>
  );
}
