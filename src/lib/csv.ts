/**
 * RFC 4180 CSV with spreadsheet formula-injection protection (OWASP):
 * cells starting with = + - @ TAB or CR are prefixed with a single quote so
 * Excel/Sheets treat them as text. Output starts with a UTF-8 BOM so Excel
 * shows Indonesian names correctly.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";

  let text = value;
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return "﻿" + rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}
