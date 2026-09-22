/* ==========================================================================
   Data export — CSV / JSON download, and print-to-PDF.
   Section 45 (privacy) and 56 (profile export).
   ========================================================================== */

export function toCSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows.length) return '';
  const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    // Guard against spreadsheet formula injection from user-entered text.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}

export function download(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[], columns?: string[]): void {
  download(filename, toCSV(rows, columns), 'text/csv;charset=utf-8');
}

export function downloadJSON(filename: string, data: unknown): void {
  download(filename, JSON.stringify(data, null, 2), 'application/json');
}

/** PDF export goes through the browser's print pipeline + print.css. */
export function printPDF(): void {
  window.print();
}
