"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { importSprintPlan } from "@/lib/actions/sprint-import";
import type { ActionState } from "@/lib/action-state";
import type { PreviewMember, SprintImportPreview } from "@/lib/sprint-sheet";
import { fmtH } from "@/components/sprint-ui";
import { Badge, Button, Card, Select, Table, Td, Th, cn } from "@/components/ui";

const STATUS: Record<PreviewMember["status"], { label: string; tone: "green" | "amber" | "orange" | "red" }> = {
  matched: { label: "In the system", tone: "green" },
  "added-to-squad": { label: "Added to the squad", tone: "amber" },
  new: { label: "New member", tone: "orange" },
  ambiguous: { label: "Unclear", tone: "red" },
};

export function SprintImportForm({ lobs }: { lobs: { id: string; label: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [lobId, setLobId] = useState("");
  const [result, setResult] = useState<(ActionState & { mode: "check" | "import" }) | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function run(mode: "check" | "import") {
    if (!file) {
      setResult({ mode, error: "Please choose your sprint planning file first." });
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", mode);
    if (lobId) fd.set("lobId", lobId);
    setResult(null);
    start(async () => {
      try {
        setResult({ ...(await importSprintPlan({}, fd)), mode });
      } catch {
        setResult({ mode, error: "Something went wrong while reading the file. Please try again." });
      }
    });
  }

  const imported = result?.ok && result.mode === "import";
  return (
    <div className="space-y-6">
      <Card title="1. Choose your sprint planning sheet">
        <div className="space-y-4">
          <div>
            <input
              ref={input}
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-50"
              aria-label="Sprint planning file"
            />
            <p className="mt-1 text-xs text-slate-500">The sheet you use in sprint planning, as Excel (.xlsx) or CSV. If the workbook has several tabs, the one with the &ldquo;Team Member&rdquo; table is used.</p>
          </div>
          <label className="block max-w-md space-y-1">
            <span className="text-sm font-medium text-slate-700">Line of Business</span>
            <Select value={lobId} onChange={(e) => setLobId(e.target.value)} aria-label="Line of Business">
              <option value="">Detect from the sheet title</option>
              {lobs.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </Select>
            <span className="block text-xs text-slate-500">&ldquo;Sonata - Release 6 - Sprint 62&rdquo; means line of business Sonata, release &ldquo;Release 6&rdquo;, sprint &ldquo;Sprint 62&rdquo;.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={pending || !file} onClick={() => run("check")}>{pending ? "Working…" : "2. Check the sheet"}</Button>
            <Button type="button" disabled={pending || !file} onClick={() => run("import")}>3. Import into the system</Button>
          </div>
        </div>
      </Card>

      {result?.error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">{result.error}</p>
          {result.details && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {result.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </div>
      )}
      {result?.ok && result.message && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>{result.message}</span>
          {result.link && <Link href={result.link.href} className="rounded-md bg-green-700 px-3 py-1.5 font-medium text-white hover:bg-green-800">{result.link.label} →</Link>}
        </div>
      )}
      {result?.preview && <PreviewView p={result.preview} imported={Boolean(imported)} />}
    </div>
  );
}

function PreviewView({ p, imported }: { p: SprintImportPreview; imported: boolean }) {
  const verb = imported ? "was" : "will be";
  return (
    <div className="space-y-6">
      <Card title={`${p.sprint.lobKey} · ${p.sprint.name} ${imported ? "(imported)" : "(preview)"}`}>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-slate-500">Line of Business</dt><dd>{p.sprint.lobName} · {p.sprint.squadName}</dd></div>
          <div><dt className="text-slate-500">Dates</dt><dd>{p.sprint.from} → {p.sprint.to}</dd></div>
          <div><dt className="text-slate-500">Working days</dt><dd>{p.sprint.days ?? "—"} in the sheet · {p.sprint.calendarDays} in Settings</dd></div>
          <div><dt className="text-slate-500">Sprint</dt><dd>{p.sprint.exists ? `Existing sprint ${verb} updated` : `New sprint ${verb} created`}</dd></div>
          <div><dt className="text-slate-500">Release</dt><dd>{p.sprint.releaseName ?? "Not attached"}</dd></div>
          <div>
            <dt className="text-slate-500">Work</dt>
            <dd>{p.totals.stories} stories ({p.totals.newStories} new) · {p.totals.tasks} tasks ({p.totals.newTasks} new, {p.totals.updatedTasks} updated) · {fmtH(p.totals.hours)}</dd>
          </div>
        </dl>
        {(p.totals.newMembers > 0 || p.totals.addedToSquad > 0) && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {p.totals.newMembers > 0 && <>{p.totals.newMembers} member(s) {verb} created. </>}
            {p.totals.addedToSquad > 0 && <>{p.totals.addedToSquad} existing member(s) {verb} added to {p.sprint.squadName}. </>}
            Their weekly hours come from the sheet; you can change them on the Members page.
          </p>
        )}
      </Card>

      {p.warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Please read ({p.warnings.length})</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {p.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <Card title={`Team capacity (${p.members.length} members)`}>
        <Table>
          <thead>
            <tr>
              <Th>Member</Th><Th>In the system</Th><Th className="text-right">Initial</Th><Th className="text-right">Meetings</Th><Th className="text-right">Vacation</Th>
              <Th className="text-right">Other</Th><Th className="text-right">Capacity</Th><Th className="text-right">Assigned</Th><Th className="text-right">Remaining</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {p.members.map((m) => (
              <tr key={m.header}>
                <Td>{m.name}{m.role && <span className="ml-1 text-xs text-slate-500">{m.role}</span>}</Td>
                <Td><Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge></Td>
                <Td className="text-right">{fmtH(m.initialHours)}</Td>
                <Td className="text-right">{fmtH(m.meetingsHours)}</Td>
                <Td className="text-right">{fmtH(m.vacationHours)}</Td>
                <Td className="text-right">{fmtH(m.otherHours)}</Td>
                <Td className="text-right font-medium">{fmtH(m.capacity)}</Td>
                <Td className="text-right">{fmtH(m.assigned)}</Td>
                <Td className={cn("text-right font-medium", m.remaining < 0 ? "text-red-700" : m.assigned > 0 && m.remaining < 8 ? "text-amber-700" : "text-slate-700")}>{fmtH(m.remaining)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="mt-2 text-xs text-slate-500">Capacity = initial hours − meetings − vacation − other fixed work (the sheet&apos;s Final Buffer). Remaining = capacity − assigned hours (the sheet&apos;s Remaining Buffer).</p>
      </Card>

      <Card title={`Stories and tasks (${p.stories.length})`}>
        {p.stories.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No story has hours in this sheet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {p.stories.map((s) => (
              <li key={s.number + s.title} className="py-2">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                    <span className="font-mono text-xs text-slate-500">#{s.number}</span>
                    <span className="min-w-0 flex-1 font-medium text-slate-900">{s.title}</span>
                    <Badge tone={s.isNew ? "orange" : "slate"}>{s.note}</Badge>
                    <span className="text-slate-600">{s.tasks.length} task(s) · {fmtH(s.hours)}</span>
                  </summary>
                  <ul className="mt-2 space-y-1 pl-6 text-sm text-slate-700">
                    {s.tasks.map((t) => (
                      <li key={t.type + t.member} className="flex items-center gap-3">
                        <span className="w-48 truncate">{t.type}</span>
                        <span className="w-32 truncate text-slate-500">{t.member}</span>
                        <span className="w-12 text-right">{fmtH(t.hours)}</span>
                        <Badge tone={t.action === "new" ? "orange" : t.action === "update" ? "amber" : "slate"}>{t.action === "new" ? "new task" : t.action === "update" ? "hours changed" : "no change"}</Badge>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
        {p.skipped.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Left out because they have no hours: {p.skipped.join(", ")}.
          </p>
        )}
      </Card>
    </div>
  );
}
