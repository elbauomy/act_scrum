import type { ReportTable } from "@/lib/reports";
import { cn } from "@/components/ui";

const LEVEL = { green: "bg-green-100 text-green-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-700" } as const;

export function ReportTableView({ table }: { table: ReportTable }) {
  if (table.rows.length === 0) return <p className="py-6 text-center text-sm text-slate-500">No data for these filters.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th key={c.key} className={cn("px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500", c.numeric ? "text-right" : "text-left")}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.rows.map((r, i) => (
            <tr key={i}>
              {table.columns.map((c) => {
                const v = r[c.key];
                const text = v == null || v === "" ? "—" : String(v);
                return (
                  <td key={c.key} className={cn("px-3 py-2 text-slate-700", c.numeric && "text-right tabular-nums")}>
                    {c.key === "level" && typeof v === "string" && v in LEVEL ? <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", LEVEL[v as keyof typeof LEVEL])}>{v}</span> : text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
