"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { BacklogRow } from "@/lib/backlog";
import { reorderWorkItems } from "@/lib/actions/work-items";
import { statusesFor } from "@/lib/work-items";
import { cn } from "@/components/ui";
import { PriorityLabel, ProgressBar, TypeBadge, formatHours } from "./badges";
import { StatusSelect } from "./status-select";

export function BacklogTree({ rows, canReorder }: { rows: BacklogRow[]; canReorder: boolean }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Hide rows whose ancestor is collapsed.
  const visible = useMemo(() => {
    const out: BacklogRow[] = [];
    let hideDepth: number | null = null;
    for (const r of rows) {
      if (hideDepth != null && r.depth > hideDepth) continue;
      hideDepth = null;
      out.push(r);
      if (collapsed.has(r.id) && r.childCount > 0) hideDepth = r.depth;
    }
    return out;
  }, [rows, collapsed]);

  const parentOf = useMemo(() => new Map(rows.map((r) => [r.id, r.parentId])), [rows]);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function drop(targetId: string) {
    const from = dragId;
    setDragId(null);
    setOverId(null);
    if (!from || from === targetId || parentOf.get(from) !== parentOf.get(targetId)) return;
    const parent = parentOf.get(from) ?? null;
    const siblings = rows.filter((r) => (r.parentId ?? null) === parent).map((r) => r.id);
    const without = siblings.filter((id) => id !== from);
    const fromIndex = siblings.indexOf(from);
    const targetIndex = siblings.indexOf(targetId);
    const insertAt = without.indexOf(targetId) + (fromIndex < targetIndex ? 1 : 0);
    without.splice(insertAt, 0, from);
    setError(null);
    startTransition(async () => {
      const res = await reorderWorkItems(without);
      if (res.error) setError(res.error);
    });
  }

  const parents = rows.filter((r) => r.childCount > 0).map((r) => r.id);

  return (
    <div className={cn(pending && "opacity-60")}>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <button type="button" className="hover:text-orange-700" onClick={() => setCollapsed(new Set())}>
          Expand all
        </button>
        <button type="button" className="hover:text-orange-700" onClick={() => setCollapsed(new Set(parents))}>
          Collapse all
        </button>
        <span>
          {canReorder
            ? "Drag ⋮⋮ to change the order of items under the same parent."
            : "Clear the item filters to change the order."}
        </span>
        {error && <span role="alert" className="text-red-600">{error}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              {canReorder && <th className="w-6" />}
              <th className="px-2 py-2 font-semibold">Item</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-2 py-2 font-semibold">Priority</th>
              <th className="px-2 py-2 font-semibold">Assignee</th>
              <th className="px-2 py-2 text-right font-semibold">Hours</th>
              <th className="px-2 py-2 font-semibold">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((r) => {
              const statuses = statusesFor(r.type);
              const sameParentAsDrag = dragId != null && parentOf.get(dragId) === r.parentId;
              return (
                <tr
                  key={r.id}
                  onDragOver={(e) => {
                    if (sameParentAsDrag) {
                      e.preventDefault();
                      setOverId(r.id);
                    }
                  }}
                  onDragLeave={() => setOverId((o) => (o === r.id ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    drop(r.id);
                  }}
                  className={cn(
                    !r.matched && "text-slate-400",
                    dragId === r.id && "opacity-40",
                    overId === r.id && "bg-orange-50 outline outline-2 outline-orange-300",
                  )}
                >
                  {canReorder && (
                    <td className="w-6 pl-1">
                      <span
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", r.id);
                          setDragId(r.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverId(null);
                        }}
                        className="cursor-grab select-none px-1 text-slate-400 hover:text-slate-700"
                        title="Drag to re-order"
                        aria-label={`Drag ${r.key} to re-order`}
                      >
                        ⋮⋮
                      </span>
                    </td>
                  )}
                  <td className="px-2 py-1.5">
                    <div className="flex min-w-[18rem] items-center gap-2" style={{ paddingLeft: r.depth * 20 }}>
                      {r.childCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggle(r.id)}
                          className="w-4 text-xs text-slate-500 hover:text-slate-900"
                          aria-label={collapsed.has(r.id) ? `Expand ${r.key}` : `Collapse ${r.key}`}
                          aria-expanded={!collapsed.has(r.id)}
                        >
                          {collapsed.has(r.id) ? "▸" : "▾"}
                        </button>
                      ) : (
                        <span className="w-4" />
                      )}
                      <TypeBadge type={r.type} short />
                      <Link href={`/items/${r.id}`} className="shrink-0 font-mono text-xs text-slate-500 hover:underline">
                        {r.key}
                      </Link>
                      <Link href={`/items/${r.id}`} className={cn("hover:underline", r.matched && "text-slate-900")}>
                        {r.title}
                      </Link>
                      {r.blocked && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700" title={r.blockedReason || "Blocked"}>
                          Blocked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    {statuses.length ? <StatusSelect key={`${r.id}-${r.status}`} id={r.id} status={r.status} options={statuses} /> : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    <PriorityLabel priority={r.priority} />
                  </td>
                  <td className="px-2 py-1.5 text-xs">{r.type === "TASK" ? r.assigneeName ?? <span className="text-amber-700">Unassigned</span> : ""}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs">
                    {r.type === "TASK" ? (
                      r.estimateHours == null ? (
                        <span className="text-amber-700">No estimate</span>
                      ) : (
                        formatHours(r.estimateHours)
                      )
                    ) : r.totalHours > 0 ? (
                      <span title="Done / total task hours">
                        {formatHours(r.doneHours)} / {formatHours(r.totalHours)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {r.type !== "TASK" && r.unestimatedTasks > 0 && (
                      <span className="ml-1 text-amber-700" title={`${r.unestimatedTasks} task(s) without estimate`}>
                        ⚠
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{r.type === "TASK" ? null : <ProgressBar value={r.progress} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
