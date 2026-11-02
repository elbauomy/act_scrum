import "server-only";
import ExcelJS from "exceljs";
import type { Col, Row } from "./reports";

export type Sheet = { title: string; columns: Col[]; rows: Row[]; note?: string };

function sheetName(title: string, used: Set<string>): string {
  const base = title.replace(/[\\/?*[\]:]/g, " ").slice(0, 28).trim() || "Sheet";
  let name = base;
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base.slice(0, 26)} ${i}`;
  used.add(name.toLowerCase());
  return name;
}

/** Build an .xlsx file with one sheet per table. */
export async function buildWorkbook(sheets: Sheet[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Solo Scrum";
  wb.created = new Date();
  const used = new Set<string>();
  for (const s of sheets) {
    const ws = wb.addWorksheet(sheetName(s.title, used));
    let headerRow = 1;
    if (s.note) {
      ws.addRow([s.note]).font = { italic: true, color: { argb: "FF64748B" } };
      ws.mergeCells(1, 1, 1, Math.max(1, s.columns.length));
      ws.getRow(1).alignment = { wrapText: true, vertical: "top" };
      ws.getRow(1).height = Math.min(120, 15 * Math.ceil(s.note.length / 110));
      headerRow = 2;
    }
    ws.columns = s.columns.map((c) => ({ key: c.key, width: Math.max(10, c.label.length + 2) }));
    const header = ws.getRow(headerRow);
    s.columns.forEach((c, i) => (header.getCell(i + 1).value = c.label));
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };
    header.alignment = { vertical: "middle", wrapText: true };
    for (const r of s.rows) {
      const row = ws.addRow(s.columns.map((c) => r[c.key] ?? null));
      s.columns.forEach((c, i) => {
        if (c.numeric) row.getCell(i + 1).alignment = { horizontal: "right" };
      });
    }
    // Width from content (capped)
    s.columns.forEach((c, i) => {
      const longest = Math.max(c.label.length, ...s.rows.slice(0, 300).map((r) => String(r[c.key] ?? "").length));
      ws.getColumn(i + 1).width = Math.min(60, Math.max(10, longest + 2));
    });
    ws.views = [{ state: "frozen", ySplit: headerRow }];
    if (s.rows.length > 0) ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: s.columns.length } };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Read the first worksheet as rows of text, keyed by the header names in row 1. */
export async function readFirstSheet(data: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };
  const text = (v: ExcelJS.CellValue): string => {
    if (v == null) return "";
    if (typeof v === "object") {
      if ("richText" in v) return v.richText.map((t) => t.text).join("");
      if ("text" in v) return String((v as { text: unknown }).text ?? "");
      if ("result" in v) return String((v as { result: unknown }).result ?? "");
      if (v instanceof Date) return v.toISOString().slice(0, 10);
    }
    return String(v);
  };
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => (headers[col - 1] = text(cell.value).trim()));
  const rows: Record<string, string>[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const rec: Record<string, string> = {};
    let any = false;
    headers.forEach((h, i) => {
      const v = text(row.getCell(i + 1).value).trim();
      if (h) rec[h] = v;
      if (v) any = true;
    });
    if (any) rows.push(rec);
  });
  return { headers, rows };
}
