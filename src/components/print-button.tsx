"use client";

export function PrintButton({ label = "Save as PDF / Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
      {label}
    </button>
  );
}
