/** Uang selalu integer rupiah. Tidak ada float di jalur data. */

const MAX_AMOUNT = 50_000_000;

export function onlyDigits(input: string): string {
  return input.replace(/\D+/g, '');
}

/**
 * Baca nominal dari teks struk atau input manusia.
 * "1.234.500" -> 1234500, "Rp 25.000,-" -> 25000, "12,500" -> 12500.
 * Koma yang diikuti tepat 2 digit dibaca sebagai desimal lalu dibulatkan.
 */
export function parseMoney(input: string): number | null {
  if (!input) return null;
  const cleaned = input
    .replace(/rp\.?/gi, '')
    .replace(/[^\d.,-]/g, '')
    .trim();
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const negative = cleaned.startsWith('-');
  const body = cleaned.replace(/-/g, '');
  const lastDot = body.lastIndexOf('.');
  const lastComma = body.lastIndexOf(',');

  let whole = body;
  let fraction = '';

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalAt = Math.max(lastDot, lastComma);
    whole = body.slice(0, decimalAt);
    fraction = body.slice(decimalAt + 1);
  } else if (lastComma >= 0) {
    const tail = body.slice(lastComma + 1);
    if (tail.length === 2) {
      whole = body.slice(0, lastComma);
      fraction = tail;
    }
  }

  const wholeDigits = whole.replace(/\D/g, '');
  if (!wholeDigits) return null;

  let value = Number(wholeDigits);
  if (fraction && /^\d{2}$/.test(fraction)) {
    value = Math.round(value + Number(fraction) / 100);
  }
  if (!Number.isFinite(value)) return null;
  if (negative) value = -value;
  return value;
}

export function isReasonableAmount(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_AMOUNT;
}

/** 1234500 -> "1.234.500" (tanpa Rp, untuk input) */
export function groupDigits(value: number | string): string {
  const digits = typeof value === 'number' ? String(Math.trunc(Math.abs(value))) : onlyDigits(value);
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1234500 -> "Rp 1.234.500" */
export function formatRupiah(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Rp 0';
  const sign = value < 0 ? '-' : '';
  return `${sign}Rp ${groupDigits(Math.abs(value))}`;
}

export function formatRupiahCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const juta = value / 1_000_000;
    return `Rp ${juta.toFixed(juta >= 10 ? 0 : 1).replace('.', ',')} jt`;
  }
  if (Math.abs(value) >= 10_000) {
    return `Rp ${Math.round(value / 1000)} rb`;
  }
  return formatRupiah(value);
}
