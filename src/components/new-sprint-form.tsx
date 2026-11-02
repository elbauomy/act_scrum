"use client";

import { useState } from "react";
import { createSprint } from "@/lib/actions/sprints";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";

export type SprintLob = { id: string; name: string; key: string; squadName: string; lengthDays: number; nextNumber: number };

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function NewSprintForm({ lobs, defaultLobId, today }: { lobs: SprintLob[]; defaultLobId?: string; today: string }) {
  const first = lobs.find((l) => l.id === defaultLobId) ?? (lobs.length === 1 ? lobs[0] : undefined);
  const [lobId, setLobId] = useState(first?.id ?? "");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(first ? addDaysISO(today, first.lengthDays - 1) : "");
  const [name, setName] = useState(first ? `Sprint ${first.nextNumber}` : "");
  const lob = lobs.find((l) => l.id === lobId);

  return (
    <ActionForm action={createSprint} className="space-y-3" resetOnSuccess={false}>
      <Field label="Line of Business">
        <Select
          name="lobId"
          required
          value={lobId}
          onChange={(e) => {
            const l = lobs.find((x) => x.id === e.target.value);
            setLobId(e.target.value);
            if (l) {
              setEnd(addDaysISO(start, l.lengthDays - 1));
              setName(`Sprint ${l.nextNumber}`);
            }
          }}
        >
          <option value="">Choose…</option>
          {lobs.map((l) => (
            <option key={l.id} value={l.id}>{l.key} · {l.name} ({l.squadName})</option>
          ))}
        </Select>
      </Field>
      <Field label="Name">
        <Input name="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input
            type="date"
            name="startDate"
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (lob && e.target.value) setEnd(addDaysISO(e.target.value, lob.lengthDays - 1));
            }}
          />
        </Field>
        <Field label="End" hint={lob ? `Default length: ${lob.lengthDays} days` : undefined}>
          <Input type="date" name="endDate" required value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <Field label="Goal">
        <Textarea name="goal" maxLength={1000} />
      </Field>
      <SubmitButton>Create sprint</SubmitButton>
    </ActionForm>
  );
}
