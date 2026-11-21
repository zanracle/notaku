import { findDateInText, isReasonableReceiptDate, todayISO } from '@/lib/dates';
import { isReasonableAmount, parseMoney } from '@/lib/money';

export type ParsedItem = { name: string; qty: number; price: number };

export type ParsedReceipt = {
  merchant: string;
  date: string | null;
  amount: number | null;
  subtotal: number | null;
  tax: number | null;
  category: string;
  items: ParsedItem[];
  confidence: number;
  reasons: string[];
};

const TOTAL_LABELS = [
  'GRAND TOTAL', 'TOTAL BAYAR', 'TOTAL BELANJA', 'TOTAL TAGIHAN', 'JUMLAH BAYAR',
  'TOTAL', 'JUMLAH', 'AMOUNT DUE', 'TOTAL DUE',
];
const CASH_LABELS = ['TUNAI', 'CASH', 'BAYAR', 'PEMBAYARAN'];
const CHANGE_LABELS = ['KEMBALI', 'KEMBALIAN', 'CHANGE'];
const TAX_LABELS = ['PPN', 'PB1', 'PBI', 'TAX', 'SERVICE', 'SVC', 'PAJAK'];

const IGNORE_MERCHANT = [
  'JL', 'JALAN', 'NPWP', 'TELP', 'TELEPON', 'HP', 'KASIR', 'INVOICE', 'STRUK',
  'NOTA', 'BUKTI', 'TERIMA', 'SELAMAT', 'ALAMAT', 'KODE', 'TANGGAL', 'NO.',
  'FAKTUR', 'COPY', 'RESI', 'MEMBER', 'DISKON', 'HEMAT',
];

/** Baris yang bukan item belanja. */
const NON_ITEM = [
  ...TOTAL_LABELS, ...CASH_LABELS, ...CHANGE_LABELS, ...TAX_LABELS,
  'SUBTOTAL', 'SUB TOTAL', 'DISKON', 'DISCOUNT', 'HEMAT', 'POTONGAN',
  'KARTU', 'DEBIT', 'KREDIT', 'TUNAI', 'QRIS', 'SALDO', 'POIN', 'POINT',
  'KEMBALI', 'BAYAR', 'HARGA', 'BIAYA', 'TARIF', 'DENDA', 'ADMIN', 'BUNGA',
  'NPWP', 'TELP', 'TEL', 'KASIR', 'INVOICE', 'STRUK', 'NOTA', 'TERIMA KASIH',
  'JL.', 'JALAN', 'ALAMAT', 'TANGGAL', 'JAM', 'MEMBER', 'CARD', 'VOUCHER',
];

const CATEGORY_RULES: { category: string; words: string[] }[] = [
  { category: 'Makan', words: ['RESTORAN', 'RESTAURANT', 'WARUNG', 'CAFE', 'KAFE', 'KOPI', 'COFFEE', 'BAKSO', 'NASI', 'AYAM', 'MIE', 'MARTABAK', 'SATE', 'PADANG', 'PIZZA', 'BURGER', 'BAKERY', 'DONAT', 'ES TEH', 'FOOD', 'KANTIN', 'HOKBEN', 'MCD', 'KFC', 'STARBUCKS'] },
  { category: 'Penginapan', words: ['HOTEL', 'INN', 'RESORT', 'GUEST', 'LOSMEN', 'HOMESTAY', 'VILLA', 'APARTEMEN', 'APARTMENT', 'PENGINAPAN'] },
  { category: 'Parkir', words: ['PARKIR', 'PARKING'] },
  { category: 'BBM', words: ['PERTAMINA', 'SPBU', 'SHELL', 'PERTALITE', 'PERTAMAX', 'SOLAR', 'BENSIN', 'BBM'] },
  { category: 'Transport', words: ['TAKSI', 'TAXI', 'GRAB', 'GOJEK', 'GO-JEK', 'MAXIM', 'BLUEBIRD', 'TRAVEL', 'TIKET', 'KERETA', 'KAI', 'DAMRI', 'BUS', 'BANDARA', 'TERMINAL', 'OJEK', 'ANGKOT'] },
  { category: 'ATK', words: ['ATK', 'ALAT TULIS', 'TOKO BUKU', 'GRAMEDIA', 'FOTOKOPI', 'PRINT', 'STATIONERY', 'MAP'] },
  { category: 'Belanja', words: ['INDOMARET', 'ALFAMART', 'ALFAMIDI', 'MINIMARKET', 'SUPERMARKET', 'HYPERMART', 'TRANSMART', 'TOKO', 'MART'] },
];

export function numbersInLine(line: string): number[] {
  const matches = line.match(/\d[\d.,]*/g) ?? [];
  const values: number[] = [];
  for (const raw of matches) {
    const value = parseMoney(raw);
    if (value == null || value <= 0) continue;
    if (/^20[2-3]\d$/.test(raw) && !/[.,]/.test(raw)) continue;
    values.push(value);
  }
  return values;
}

function containsAny(line: string, labels: string[]): boolean {
  return labels.some((label) => line.includes(label));
}

function valueForLabel(
  lines: string[],
  labels: string[],
  opts: { skipSubtotal?: boolean; skipWords?: string[] } = {},
): { value: number; fromNextLine: boolean } | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (opts.skipSubtotal && line.includes('SUBTOTAL')) continue;
    if (opts.skipWords?.some((word) => line.includes(word))) continue;
    if (!containsAny(line, labels)) continue;
    const values = numbersInLine(line);
    if (values.length > 0) return { value: Math.max(...values), fromNextLine: false };
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const next = numbersInLine(lines[j]);
      if (next.length > 0) return { value: Math.max(...next), fromNextLine: true };
    }
  }
  return null;
}

export function findTotal(lines: string[]): {
  amount: number | null;
  via: 'label' | 'cash' | 'fallback' | 'none';
} {
  const labeled = valueForLabel(lines, TOTAL_LABELS, { skipSubtotal: true });
  const cash = valueForLabel(lines, CASH_LABELS, {
    skipWords: ['TOTAL', 'SUBTOTAL', 'KEMBALI', 'KEMBALIAN', 'CHANGE'],
  });
  const change = valueForLabel(lines, CHANGE_LABELS);

  if (cash && change && cash.value > change.value) {
    const diff = cash.value - change.value;
    if (isReasonableAmount(diff)) {
      if (labeled && Math.abs(labeled.value - diff) / diff > 0.05) return { amount: diff, via: 'cash' };
      if (!labeled) return { amount: diff, via: 'cash' };
    }
  }

  if (labeled && isReasonableAmount(labeled.value)) return { amount: labeled.value, via: 'label' };

  const tail = lines.slice(-10);
  const candidates = tail
    .flatMap((line) => numbersInLine(line))
    .filter((v) => v >= 500 && isReasonableAmount(v));
  if (candidates.length > 0) return { amount: Math.max(...candidates), via: 'fallback' };
  return { amount: null, via: 'none' };
}

export function guessMerchant(lines: string[]): string {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line.length < 3) continue;
    const upper = line.toUpperCase();
    if (IGNORE_MERCHANT.some((w) => upper.startsWith(w))) continue;
    const letters = line.replace(/[^A-Za-z]/g, '').length;
    if (letters < 3) continue;
    if (numbersInLine(line).length > 0 && letters / line.length < 0.5) continue;
    return line.slice(0, 60);
  }
  return '';
}

export function guessCategory(text: string, fallback = 'Lain-lain'): string {
  const upper = text.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((word) => upper.includes(word))) return rule.category;
  }
  return fallback;
}

export function findTax(lines: string[], total: number | null): number | null {
  const found = valueForLabel(lines, TAX_LABELS);
  if (!found || !isReasonableAmount(found.value)) return null;
  if (total && found.value > total * 0.15) return null;
  return found.value;
}

/**
 * Ambil baris item: "Nama ....... harga" atau "Nama 2 x 25.000".
 * Baris total/pajak/kembalian sudah disaring lebih dulu.
 */
export function extractItems(lines: string[], amount: number | null): ParsedItem[] {
  const items: ParsedItem[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line.length < 4) continue;
    const upper = line.toUpperCase();
    if (NON_ITEM.some((word) => upper.includes(word))) continue;
    // Baris tanggal/jam bukan item.
    if (/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(line)) continue;
    if (/^\s*\d{1,2}\s+[A-Za-z]{3,9}\.?\s+20\d{2}\s*$/.test(line)) continue;
    if (/\d{1,2}:\d{2}/.test(line)) continue;

    const withQty = line.match(/^(.*?)\s+(\d{1,3})\s*[xX×]\s*(\d[\d.,]*)$/);
    if (withQty) {
      const name = withQty[1].replace(/[-•*:]+$/, '').trim();
      const qty = Number(withQty[2]);
      const price = parseMoney(withQty[3]);
      if (name.length >= 2 && price && qty > 0 && qty <= 99) {
        items.push({ name: name.slice(0, 80), qty, price });
        continue;
      }
    }

    const plain = line.match(/^(.*?)(\d[\d.,]*)$/);
    if (!plain) continue;
    if (/^20[2-3]\d$/.test(plain[2]) && !/[.,]/.test(plain[2])) continue;
    const name = plain[1].replace(/[-•*:.\s]+$/, '').trim();
    const price = parseMoney(plain[2]);
    if (!name || name.length < 2) continue;
    if (name.replace(/[^A-Za-z]/g, '').length < 2) continue;
    if (!price || price < 100) continue;
    if (amount && price > amount * 1.05) continue;
    if (price > 50_000_000) continue;
    items.push({ name: name.slice(0, 80), qty: 1, price });
  }
  return items.slice(0, 40);
}

function subtotalMatches(lines: string[], total: number | null): boolean {
  if (!total) return false;
  const subtotal = valueForLabel(lines, ['SUBTOTAL', 'SUB TOTAL'], {});
  const tax = valueForLabel(lines, TAX_LABELS);
  if (!subtotal) return false;
  const expected = subtotal.value + (tax?.value ?? 0);
  return Math.abs(expected - total) / total <= 0.05;
}

export function parseReceipt(text: string, today: string = todayISO()): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  const reasons: string[] = [];
  const merchant = guessMerchant(lines);
  const totalInfo = findTotal(lines);
  const amount = totalInfo.amount;
  const date = findDateInText(text, today);
  const tax = findTax(lines, amount);
  const category = guessCategory(`${merchant}\n${text}`);
  const items = extractItems(lines, amount);
  const subtotal = items.length > 0 ? items.reduce((sum, item) => sum + item.price * item.qty, 0) : null;

  let confidence = 0;
  if (totalInfo.via === 'label') confidence += 40;
  else if (totalInfo.via === 'cash') confidence += 30;
  else if (totalInfo.via === 'fallback') confidence += 15;
  else reasons.push('Total tidak ditemukan');

  if (date) confidence += 20;
  else reasons.push('Tanggal tidak terbaca');

  if (subtotalMatches(lines, amount)) confidence += 20;
  else if (amount) reasons.push('Subtotal dan pajak tidak cocok');

  if (merchant) confidence += 10;
  else reasons.push('Nama toko tidak terbaca');

  if (isReasonableAmount(amount)) confidence += 10;
  else reasons.push('Nominal di luar rentang wajar');

  if (items.length > 0) confidence += 10;
  else reasons.push('Item tidak terbaca satu per satu');

  if (date && !isReasonableReceiptDate(date)) reasons.push('Tanggal tidak wajar');

  return {
    merchant,
    date,
    amount,
    subtotal,
    tax,
    category,
    items,
    confidence: Math.max(0, Math.min(100, confidence)),
    reasons,
  };
}

