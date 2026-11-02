"use client";

import { useActionState } from "react";
import { importItems } from "@/lib/actions/import";
import { Button } from "@/components/ui";

export function ImportForm() {
  const [state, action, pending] = useActionState(importItems, {});
  return (
    <form action={action} className="space-y-3">
      <input type="file" name="file" accept=".xlsx" required className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-50" />
      <div className="flex gap-2">
        <Button type="submit" name="mode" value="check" variant="secondary" disabled={pending}>{pending ? "Working…" : "Check file"}</Button>
        <Button type="submit" name="mode" value="import" disabled={pending}>Import</Button>
      </div>
      {state.error && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{state.error}</p>
          {state.details && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
              {state.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </div>
      )}
      {state.ok && state.message && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>}
    </form>
  );
}
