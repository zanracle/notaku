import type { Expense, ExpenseItem, Wallet } from '@/db/queries';
import { formatDateID } from '@/lib/dates';
import { formatRupiahExact } from '@/lib/money';

export type ReceiptData = {
  wallet: Wallet;
  expense: Expense;
  items: ExpenseItem[];
  settings: Record<string, string>;
};

export type ReceiptWidth = 58 | 80;

function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function itemRows(items: ExpenseItem[], expense: Expense): string {
  if (items.length === 0) {
    return `<div class="row"><span>${esc(expense.merchant)}</span><span>${esc(formatRupiahExact(expense.amount))}</span></div>`;
  }
  return items
    .map((item) => {
      const lineTotal = Math.round(item.price * (item.qty || 1));
      return `<div class="item">
        <div class="iname">${esc(item.name)}</div>
        <div class="row small"><span>${item.qty && item.qty !== 1 ? `${item.qty} x ${formatRupiahExact(item.price)}` : ''}</span><span>${esc(formatRupiahExact(lineTotal))}</span></div>
      </div>`;
    })
    .join('');
}

export function receiptFileName(data: ReceiptData): string {
  const safe = data.expense.merchant
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 32) || 'Struk';
  return `Struk-${safe}-${data.expense.date}.pdf`;
}

export function buildReceiptHtml(receipts: ReceiptData[], width: ReceiptWidth = 80): string {
  const body = receipts
    .map((data) => {
      const { expense, items, wallet } = data;
      const subtotal = expense.subtotal ?? items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
      const hasItems = items.length > 0;
      return `<section class="receipt">
        <div class="merchant">${esc(expense.merchant)}</div>
        <div class="center muted">${esc(formatDateID(expense.date))}</div>
        <div class="rule"></div>
        ${itemRows(items, expense)}
        <div class="rule"></div>
        ${
          hasItems
            ? `<div class="row"><span>Subtotal</span><span>${esc(formatRupiahExact(subtotal))}</span></div>`
            : ''
        }
        ${expense.tax > 0 ? `<div class="row"><span>Pajak</span><span>${esc(formatRupiahExact(expense.tax))}</span></div>` : ''}
        <div class="row total"><span>TOTAL</span><span>${esc(formatRupiahExact(expense.amount))}</span></div>
        <div class="rule"></div>
        <div class="row small muted"><span>${esc(wallet.name)}</span><span>${esc(expense.category)}</span></div>
        ${expense.note ? `<div class="note">${esc(expense.note)}</div>` : ''}
        <div class="center muted footer">Dicetak dari NotaKu</div>
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${width}mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    width: ${width === 58 ? '52mm' : '74mm'};
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace;
    font-size: ${width === 58 ? '9px' : '10px'};
    line-height: 1.35;
    color: #111111;
  }
  .receipt { padding-bottom: 10mm; page-break-after: always; break-after: page; }
  .receipt:last-child { page-break-after: auto; break-after: auto; }
  .merchant { text-align: center; font-weight: 700; font-size: ${width === 58 ? '11px' : '12px'}; text-transform: uppercase; letter-spacing: 0.3px; }
  .center { text-align: center; }
  .muted { color: #555555; }
  .rule { border-top: 1px dashed #999999; margin: 5px 0; }
  .item { margin: 2px 0 4px; }
  .iname { font-weight: 600; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row.small { font-size: ${width === 58 ? '8px' : '9px'}; color: #444444; }
  .total { font-weight: 700; font-size: ${width === 58 ? '11px' : '12px'}; margin-top: 2px; }
  .note { margin-top: 4px; font-style: italic; color: #444444; }
  .footer { margin-top: 8px; font-size: ${width === 58 ? '7.5px' : '8px'}; }
</style>
</head>
<body>${body}</body>
</html>`;
}

export function buildReceiptCsv(receipts: ReceiptData[]): string {
  const cell = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value);
    return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = ['Tanggal;Toko;Kategori;Dompet;Item;Subtotal;Pajak;Total;Catatan'];
  for (const { expense, items, wallet } of receipts) {
    const itemText = items.map((item) => `${item.name} x${item.qty}`).join(' | ');
    lines.push(
      [
        expense.date,
        cell(expense.merchant),
        cell(expense.category),
        cell(wallet.name),
        cell(itemText),
        expense.subtotal ?? '',
        expense.tax,
        expense.amount,
        cell(expense.note),
      ].join(';'),
    );
  }
  const total = receipts.reduce((sum, r) => sum + r.expense.amount, 0);
  lines.push(['', '', '', '', '', '', '', total, ''].join(';'));
  return `\ufeff${lines.join('\r\n')}`;
}

