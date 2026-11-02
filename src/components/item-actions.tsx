"use client";

import { useState, useTransition } from "react";
import { moveToNextSprint, quickAssign, quickEstimate, setItemSprint } from "@/lib/actions/sprints";
import { setSprintRelease } from "@/lib/actions/releases";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/components/ui";

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionState>, onFail?: () => void) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) {
        setError(res.error);
        onFail?.();
      }
    });
  };
  return { pending, error, run };
}

const Err = ({ msg }: { msg: string | null }) => (msg ? <span role="alert" className="text-xs text-red-600">{msg}</span> : null);

const btn = "rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50";

/** Button that plans an item into a sprint, or takes it out when sprintId is null. */
export function SprintButton({ itemId, sprintId, label, variant = "secondary" }: { itemId: string; sprintId: string | null; label: string; variant?: "primary" | "secondary" | "danger" }) {
  const { pending, error, run } = useRun();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setItemSprint(itemId, sprintId))}
        className={cn(btn, variant === "primary" && "border-orange-600 bg-orange-600 text-white hover:bg-orange-700", variant === "secondary" && "border-slate-300 bg-white text-slate-700 hover:bg-slate-50", variant === "danger" && "border-red-300 bg-white text-red-600 hover:bg-red-50")}
      >
        {pending ? "…" : label}
      </button>
      <Err msg={error} />
    </span>
  );
}

export function NextSprintButton({ itemId }: { itemId: string }) {
  const { pending, error, run } = useRun();
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={pending} onClick={() => run(() => moveToNextSprint(itemId))} className={cn(btn, "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}>
        {pending ? "…" : "Move to next sprint"}
      </button>
      <Err msg={error} />
    </span>
  );
}

/** Choose the sprint of a story/bug; saves immediately. */
export function SprintSelect({ itemId, value, options }: { itemId: string; value: string; options: { id: string; name: string }[] }) {
  const [current, setCurrent] = useState(value);
  const { pending, error, run } = useRun();
  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label="Sprint"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const previous = current;
          setCurrent(e.target.value);
          run(() => setItemSprint(itemId, e.target.value || null), () => setCurrent(previous));
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
      >
        <option value="">No sprint (backlog)</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <Err msg={error} />
    </span>
  );
}

export function AssigneeSelect({ taskId, value, options }: { taskId: string; value: string; options: { id: string; name: string }[] }) {
  const [current, setCurrent] = useState(value);
  const { pending, error, run } = useRun();
  return (
    <span className="inline-flex items-center gap-1">
      <select
        aria-label="Assignee"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const previous = current;
          setCurrent(e.target.value);
          run(() => quickAssign(taskId, e.target.value || null), () => setCurrent(previous));
        }}
        className="max-w-[9rem] rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs"
      >
        <option value="">Unassigned</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <Err msg={error} />
    </span>
  );
}

export function EstimateInput({ taskId, value }: { taskId: string; value: number | null }) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const { pending, error, run } = useRun();
  return (
    <span className="inline-flex items-center gap-1">
      <input
        aria-label="Estimate in hours"
        type="number"
        min="0"
        max="1000"
        step="0.25"
        value={text}
        disabled={pending}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = text === "" ? null : Number(text);
          if (n === value || Number.isNaN(n)) return;
          run(() => quickEstimate(taskId, n), () => setText(value == null ? "" : String(value)));
        }}
        className="w-16 rounded-md border border-slate-300 px-1.5 py-1 text-xs"
      />
      <span className="text-xs text-slate-500">h</span>
      <Err msg={error} />
    </span>
  );
}

export function ReleaseSelect({ sprintId, value, options }: { sprintId: string; value: string; options: { id: string; name: string }[] }) {
  const [current, setCurrent] = useState(value);
  const { pending, error, run } = useRun();
  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label="Release"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const previous = current;
          setCurrent(e.target.value);
          run(() => setSprintRelease(sprintId, e.target.value || null), () => setCurrent(previous));
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
      >
        <option value="">No release</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <Err msg={error} />
    </span>
  );
}
