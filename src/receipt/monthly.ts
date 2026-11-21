import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';

import { formatRupiahExact } from '@/lib/money';
import { shareFile } from './export';

export type MonthlyReportData = {
  name: string;
  monthLabel: string;
  total: number;
  count: number;
  months: { label: string; total: number }[];
  categories: { label: string; total: number; count: number; color: string }[];
  merchants: { merchant: string; total: number; count: number }[];
};

function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildMonthlyHtml(data: MonthlyReportData): string {
  const maxMonth = Math.max(1, ...data.months.map((row) => row.total));
  const maxCategory = Math.max(1, ...data.categories.map((row) => row.total));

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #13201A; font-size: 10.5pt; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0E7C5F; padding-bottom: 10px; }
  .brand { font-weight: 800; letter-spacing: 0.5px; font-size: 11pt; color: #0E7C5F; }
  .muted { color: #6D7B73; }
  h1 { font-size: 20pt; margin: 18px 0 2px; }
  .total { font-size: 26pt; font-weight: 800; letter-spacing: -0.5px; margin: 4px 0 2px; }
  .chart { display: flex; align-items: flex-end; gap: 10px; height: 120px; margin: 16px 0 4px; }
  .bar { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; }
  .bar .fill { width: 100%; border-radius: 6px 6px 2px 2px; background: #EFE8DA; }
  .bar .fill.hi { background: #0E7C5F; }
  .bar .lbl { font-size: 8pt; color: #6D7B73; }
  .bar .val { font-size: 7.5pt; color: #6D7B73; }
  h2 { font-size: 12pt; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.4px; color: #6D7B73; border-bottom: 1px solid #D9D2C4; padding: 6px 4px; }
  td { padding: 7px 4px; border-bottom: 1px solid #EFE8DA; vertical-align: middle; }
  .right { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; margin-right: 6px; }
  .track { height: 6px; border-radius: 3px; background: #EFE8DA; margin-top: 4px; }
  .barinline { height: 6px; border-radius: 3px; }
  footer { margin-top: 24px; color: #9AA9A1; font-size: 8pt; }
</style></head>
<body>
  <div class="head">
    <div class="brand">NOTAKU</div>
    <div class="muted">${esc(data.name || 'Laporan pengeluaran')}</div>
  </div>

  <h1>${esc(data.monthLabel)}</h1>
  <div class="muted">${data.count} catatan</div>
  <div class="total">${formatRupiahExact(data.total)}</div>

  <div class="chart">
    ${data.months
      .map(
        (row) => `<div class="bar">
          <div class="val">${row.total > 0 ? formatRupiahExact(row.total).replace('Rp ', '') : ''}</div>
          <div class="fill ${row.total >= Math.max(...data.months.map((m) => m.total)) ? 'hi' : ''}" style="height:${Math.max(4, Math.round((row.total / maxMonth) * 92))}px"></div>
          <div class="lbl">${esc(row.label)}</div>
        </div>`,
      )
      .join('')}
  </div>

  <h2>Per kategori</h2>
  <table>
    <thead><tr><th>Kategori</th><th class="right">Catatan</th><th class="right">Total</th></tr></thead>
    <tbody>
      ${data.categories
        .map(
          (row) => `<tr>
            <td><span class="dot" style="background:${esc(row.color)}"></span>${esc(row.label)}
              <div class="track"><div class="barinline" style="width:${Math.round((row.total / maxCategory) * 100)}%;background:${esc(row.color)}"></div></div>
            </td>
            <td class="right">${row.count}</td>
            <td class="right">${formatRupiahExact(row.total)}</td>
          </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  ${data.merchants.length > 0 ? `<h2>Tokoh paling sering</h2>
  <table>
    <thead><tr><th>Toko</th><th class="right">Kunjungan</th><th class="right">Total</th></tr></thead>
    <tbody>
      ${data.merchants
        .map(
          (row) => `<tr><td>${esc(row.merchant)}</td><td class="right">${row.count}</td><td class="right">${formatRupiahExact(row.total)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>` : ''}

  <footer>Dibuat dengan NotaKu · data tersimpan di perangkat</footer>
</body></html>`;
}

export async function shareMonthlyPdf(data: MonthlyReportData): Promise<string> {
  const html = buildMonthlyHtml(data);
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const dir = new Directory(Paths.document, 'receipts-out');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const target = new File(dir, `NotaKu-${data.monthLabel.replace(/\s+/g, '-')}.pdf`);
  await target.write(await new File(uri).bytes());
  await shareFile(target.uri, 'application/pdf', 'Kirim laporan bulanan');
  return target.uri;
}
