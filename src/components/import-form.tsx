"use client";

import { useState, useTransition } from "react";
import { importItems } from "@/lib/actions/import";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui";

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  // The chosen file is kept in the page so "Check file" and then "Import" use the same file.
  function run(mode: "check" | "import") {
    if (!file) {
      setState({ error: "Please choose an Excel (.xlsx) file." });
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", mode);
    setState({});
    start(async () => setState(await importItems({}, fd)));
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        name="file"
        accept=".xlsx"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setState({});
        }}
        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-50"
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => run("check")}>{pending ? "Working…" : "Check file"}</Button>
        <Button type="button" disabled={pending} onClick={() => run("import")}>Import</Button>
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
    </div>
  );
}
