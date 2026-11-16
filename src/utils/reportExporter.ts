import { downloadTextFile } from './auditEngine';

export interface ReportExportPayload {
  title: string;
  subtitle: string;
  dir: 'rtl' | 'ltr';
  columns: string[];
  rows: (string | number)[][];
  metadata?: Record<string, string | number>;
}

function escapeCsvCell(val: string | number): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function escapeHtml(val: string | number): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportReportCsv(filenameBase: string, payload: ReportExportPayload) {
  const headerLine = payload.columns.map(escapeCsvCell).join(',');
  const dataLines = payload.rows.map((row) => row.map(escapeCsvCell).join(','));
  const csv = [headerLine, ...dataLines].join('\r\n');
  downloadTextFile(`${filenameBase}.csv`, csv, true);
}

export function exportReportExcelXls(filenameBase: string, payload: ReportExportPayload) {
  const metaRows = payload.metadata
    ? Object.entries(payload.metadata)
        .map(
          ([k, v]) =>
            `<tr><td colspan="2" style="font-weight:bold;background:#F1F5F9;">${escapeHtml(k)}</td><td colspan="${Math.max(1, payload.columns.length - 2)}">${escapeHtml(v)}</td></tr>`
        )
        .join('')
    : '';

  const html = `<!DOCTYPE html>
<html dir="${payload.dir}">
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: Arial, Tahoma, sans-serif; font-size: 12px; color: #0F172A; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #0F1E36; color: #FFFFFF; font-weight: bold; padding: 8px 10px; border: 1px solid #CBD5E1; text-align: ${payload.dir === 'rtl' ? 'right' : 'left'}; }
  td { padding: 7px 10px; border: 1px solid #CBD5E1; }
  h2 { color: #0F1E36; margin: 0 0 4px 0; }
  p { color: #475569; margin: 0 0 12px 0; }
</style>
</head>
<body>
  <h2>${escapeHtml(payload.title)}</h2>
  <p>${escapeHtml(payload.subtitle)}</p>
  <table>
    ${metaRows}
    <thead>
      <tr>${payload.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${payload.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportReportJson(filenameBase: string, payload: ReportExportPayload) {
  const structured = {
    title: payload.title,
    subtitle: payload.subtitle,
    exportedAt: new Date().toISOString(),
    metadata: payload.metadata ?? {},
    columns: payload.columns,
    rows: payload.rows.map((r) => {
      const obj: Record<string, string | number> = {};
      payload.columns.forEach((col, i) => {
        obj[col] = r[i] ?? '';
      });
      return obj;
    }),
  };
  downloadTextFile(`${filenameBase}.json`, JSON.stringify(structured, null, 2), false);
}

export function exportReportHtml(filenameBase: string, payload: ReportExportPayload) {
  const metaHtml = payload.metadata
    ? `<div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;font-size:12px;">
        ${Object.entries(payload.metadata)
          .map(
            ([k, v]) =>
              `<div><span style="color:#64748B;">${escapeHtml(k)}:</span> <strong style="color:#0F172A;">${escapeHtml(v)}</strong></div>`
          )
          .join('')}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html dir="${payload.dir}">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(payload.title)}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 32px; background: #FFFFFF; color: #0F172A; }
  .header { border-bottom: 2px solid #0F1E36; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
  h1 { margin: 0; font-size: 20px; color: #0F1E36; }
  .sub { margin: 4px 0 0 0; font-size: 12px; color: #64748B; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th { background: #0F1E36; color: #FFFFFF; padding: 9px 10px; text-align: ${payload.dir === 'rtl' ? 'right' : 'left'}; }
  td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
  tr:nth-child(even) td { background: #F8FAFC; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(payload.title)}</h1>
      <p class="sub">${escapeHtml(payload.subtitle)}</p>
    </div>
    <div style="font-size:11px;color:#64748B;">Hotel Income Auditor</div>
  </div>
  ${metaHtml}
  <table>
    <thead>
      <tr>${payload.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${payload.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  downloadTextFile(`${filenameBase}.html`, html, true);
}
