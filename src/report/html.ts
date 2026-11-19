import { formatDateID, todayISO } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import type { Expense, Trip } from '@/db/queries';

export type ReportMode = 'lengkap' | 'ringkas';

export type ReportMeta = {
  trip: Trip;
  expenses: Expense[];
  settings: Record<string, string>;
  mode: ReportMode;
  generatedAt?: string;
};

export function reportTotals(meta: ReportMeta): { total: number; tax: number; count: number } {
  let total = 0;
  let tax = 0;
  for (const expense of meta.expenses) {
    total += expense.amount;
    tax += expense.tax ?? 0;
  }
  return { total, tax, count: meta.expenses.length };
}

export function reportFileName(meta: ReportMeta, ext: string): string {
  const safe = meta.trip.name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'Dinas';
  return `Reimburse-${safe}-${todayISO()}.${ext}`;
}

function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageBreak(index: number): string {
  return index > 0 && index % 6 === 0 ? 'style="page-break-before: always"' : '';
}

/**
 * Satu template untuk PDF dan print. Gambar dikirim sebagai data URI base64
 * karena iOS tidak memuat file:// di dalam WebView print.
 */
export function buildReportHtml(meta: ReportMeta, images: Record<string, string>): string {
  const { trip, expenses, settings, mode } = meta;
  const totals = reportTotals(meta);
  const generated = meta.generatedAt ?? new Date().toISOString();

  const identity = [
    ['Nama', settings.nama],
    ['NIP / ID', settings.nip],
    ['Jabatan', settings.jabatan],
    ['Departemen', settings.departemen],
  ].filter(([, value]) => Boolean(value && value.trim()));

  const rows = expenses
    .map(
      (expense, index) => `<tr>
        <td class="num">${index + 1}</td>
        <td class="nowrap">${esc(formatDateID(expense.date))}</td>
        <td>
          <div class="merchant">${esc(expense.merchant)}</div>
          ${expense.note ? `<div class="note">${esc(expense.note)}</div>` : ''}
          ${!expense.receiptPath ? '<div class="note warn">tanpa struk</div>' : ''}
        </td>
        <td>${esc(expense.category)}</td>
        <td class="amount">${esc(formatRupiah(expense.amount))}</td>
      </tr>`,
    )
    .join('');

  const attachments =
    mode === 'lengkap'
      ? `<section class="attachments">
          <h2>Lampiran struk</h2>
          <div class="grid">
            ${expenses
              .map((expense, index) => {
                const src = images[expense.id];
                return `<figure ${pageBreak(index)}>
                  <figcaption>${index + 1}. ${esc(expense.merchant)} — ${esc(formatRupiah(expense.amount))}</figcaption>
                  ${
                    src
                      ? `<img src="${src}" alt="Struk ${index + 1}" />`
                      : '<div class="noimg">Foto struk tidak tersedia</div>'
                  }
                </figure>`;
              })
              .join('')}
          </div>
        </section>`
      : '';

  const logo = settings.logo_path && images.__logo ? images.__logo : '';
  const signatureName = settings.nama || '';
  const signatureNip = settings.nip ? `NIP. ${esc(settings.nip)}` : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(reportFileName(meta, 'pdf'))}</title>
<style>
  @page { size: A4; margin: 12mm 12mm 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #111827; background: #ffffff;
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt; line-height: 1.45;
  }
  header { display: flex; gap: 14px; align-items: flex-start; border-bottom: 2px solid #0F766E; padding-bottom: 10px; }
  header img { width: 54px; height: 54px; object-fit: contain; }
  .company { font-size: 12.5pt; font-weight: 700; letter-spacing: 0.2px; }
  .subtitle { color: #4B5563; font-size: 9pt; margin-top: 2px; }
  h1 { font-size: 13pt; margin: 14px 0 2px; }
  .muted { color: #6B7280; font-size: 9pt; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 10px 0 14px; }
  .meta div { font-size: 9.5pt; }
  .meta span { color: #6B7280; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.4px;
    color: #374151; border-bottom: 1.5px solid #D1D5DB; padding: 6px 6px;
  }
  tbody td { padding: 7px 6px; vertical-align: top; border-bottom: 1px solid #E5E7EB; }
  tr { break-inside: avoid; }
  .num { width: 26px; color: #6B7280; }
  .nowrap { white-space: nowrap; }
  .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .merchant { font-weight: 600; }
  .note { color: #6B7280; font-size: 8.5pt; }
  .warn { color: #B45309; }
  tfoot td { padding: 9px 6px; font-weight: 700; border-top: 2px solid #0F766E; }
  tfoot .amount { font-size: 11pt; }
  .signatures { display: flex; justify-content: space-between; gap: 40px; margin-top: 28px; break-inside: avoid; }
  .sign { width: 42%; text-align: center; font-size: 9.5pt; }
  .sign .line { margin-top: 58px; border-top: 1px solid #9CA3AF; padding-top: 5px; }
  .attachments { margin-top: 26px; break-before: page; }
  .attachments h2 { font-size: 11pt; margin: 0 0 10px; border-bottom: 1px solid #D1D5DB; padding-bottom: 6px; }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; }
  figure { width: 31.5%; margin: 0 0 8px; break-inside: avoid; }
  figcaption { font-size: 7.5pt; color: #374151; margin-bottom: 3px; }
  figure img { width: 100%; max-height: 150px; object-fit: contain; border: 1px solid #E5E7EB; }
  .noimg {
    height: 90px; display: flex; align-items: center; justify-content: center;
    border: 1px dashed #D1D5DB; color: #9CA3AF; font-size: 7.5pt; text-align: center;
  }
  footer { margin-top: 18px; color: #9CA3AF; font-size: 7.5pt; }
</style>
</head>
<body>
  <header>
    ${logo ? `<img src="${logo}" alt="Logo" />` : ''}
    <div>
      <div class="company">${esc(settings.perusahaan || 'Laporan Reimburse')}</div>
      <div class="subtitle">Laporan Pengeluaran Dinas</div>
    </div>
  </header>

  <h1>${esc(trip.name)}</h1>
  <div class="muted">${esc(formatDateID(trip.startDate))} – ${esc(formatDateID(trip.endDate))}${trip.city ? ` · ${esc(trip.city)}` : ''}${trip.refNo ? ` · Ref ${esc(trip.refNo)}` : ''}</div>

  <div class="meta">
    ${identity.map(([label, value]) => `<div><span>${esc(label)}:</span> ${esc(value)}</div>`).join('')}
    <div><span>Jumlah biaya:</span> ${totals.count}</div>
    <div><span>Dibuat:</span> ${esc(formatDateID(generated.slice(0, 10)))}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">No</th>
        <th>Tanggal</th>
        <th>Keterangan</th>
        <th>Kategori</th>
        <th class="amount">Nominal</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5" class="muted">Belum ada biaya.</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4">Total${totals.tax > 0 ? ` (termasuk pajak ${esc(formatRupiah(totals.tax))})` : ''}</td>
        <td class="amount">${esc(formatRupiah(totals.total))}</td>
      </tr>
    </tfoot>
  </table>

  <div class="signatures">
    <div class="sign">
      <div>${esc(settings.ttd_pemohon || 'Pemohon')}</div>
      <div class="line">${esc(signatureName)}${signatureNip ? `<br/>${signatureNip}` : ''}</div>
    </div>
    <div class="sign">
      <div>${esc(settings.ttd_mengetahui || 'Mengetahui')}</div>
      <div class="line">&nbsp;</div>
    </div>
  </div>

  ${attachments}

  <footer>Dibuat dengan NotaKu · ${esc(new Date(generated).toLocaleString('id-ID'))}</footer>
</body>
</html>`;
}
