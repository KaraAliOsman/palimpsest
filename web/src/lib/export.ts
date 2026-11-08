// Client-side exports: CSV/JSON downloads and clipboard copies. Nothing leaves the browser.

export type Cell = string | number | boolean | null | undefined;

function csvCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV<T>(rows: T[], columns: { key: string; get: (r: T) => Cell }[]): string {
  const head = columns.map((c) => csvCell(c.key)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(c.get(r))).join(","));
  // BOM so spreadsheet software reads the Greek as UTF-8.
  return "﻿" + [head, ...body].join("\r\n") + "\r\n";
}

export function download(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the textarea route */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export const SITE = {
  name: "Palimpsest",
  url: "https://karaaliosman.github.io/palimpsest/",
  repo: "https://github.com/KaraAliOsman/palimpsest",
  raw: "https://raw.githubusercontent.com/KaraAliOsman/palimpsest/main/",
  year: 2026,
};

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
