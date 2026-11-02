"use client";

import { useActionState, useEffect, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * "Select all" and "Delete selected" for a table. The row checkboxes sit in the table and are tied to this form with
 * `form={formId} name="id"`, so the table itself can stay a server component.
 */
export function BulkDeleteBar({ formId, action, noun, warning }: { formId: string; action: Action; noun: string; warning: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [count, setCount] = useState(0);
  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>(`input[form="${formId}"][name="id"]`));

  useEffect(() => {
    const update = () => setCount(boxes().filter((b) => b.checked).length);
    const form = document.getElementById(formId);
    document.addEventListener("change", update);
    form?.addEventListener("reset", () => setTimeout(update, 0));
    update();
    return () => document.removeEventListener("change", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const total = typeof document === "undefined" ? 0 : boxes().filter((b) => !b.disabled).length;

  return (
    <div className="mb-3 space-y-2">
      <form
        id={formId}
        action={formAction}
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          if (count === 0 || !confirm(`Delete ${count} ${noun}${count === 1 ? "" : "s"}? ${warning}`)) e.preventDefault();
        }}
      >
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            aria-label={`Select all ${noun}s`}
            checked={total > 0 && count >= total}
            onChange={(e) => {
              boxes().forEach((b) => {
                if (!b.disabled) b.checked = e.target.checked;
              });
              document.dispatchEvent(new Event("change"));
            }}
          />
          Select all
        </label>
        <Button type="submit" variant="danger" disabled={pending || count === 0} className="px-3 py-1.5 text-xs">
          {pending ? "Deleting…" : count > 0 ? `Delete selected (${count})` : "Delete selected"}
        </Button>
      </form>
      {state.error && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{state.error}</p>
          {state.details && <ul className="mt-1 list-disc pl-5 text-xs">{state.details.map((d) => <li key={d}>{d}</li>)}</ul>}
        </div>
      )}
      {state.ok && state.message && (
        <div role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          <p>{state.message}</p>
          {state.details && <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">{state.details.map((d) => <li key={d}>{d}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
