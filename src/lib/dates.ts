const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const MONTH_LOOKUP: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4,
  mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agustus: 8, aug: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, nov: 11, november: 11,
  des: 12, desember: 12, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "2026-11-18" -> "18 Nov 2026" */
export function formatDateID(iso: string | null | undefined): string {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_ID[m - 1] ?? m} ${y}`;
}

/** "2026-11-18" -> "18 Nov" */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  if (!m || !d) return iso;
  return `${d} ${MONTHS_ID[m - 1] ?? m}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
    'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${names[m - 1]} ${y}`;
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T12:00:00`);
  return !Number.isNaN(d.getTime()) && toISODate(d) === iso;
}

/** Tanggal wajar untuk struk: tidak di masa depan, tidak lebih dari 400 hari lalu. */
export function isReasonableReceiptDate(iso: string): boolean {
  if (!isValidISODate(iso)) return false;
  const d = new Date(`${iso}T12:00:00`).getTime();
  const now = Date.now();
  return d <= now + 36 * 60 * 60 * 1000 && d >= now - 400 * 24 * 60 * 60 * 1000;
}

export function daysBetween(a: string, b: string): number {
  const t1 = new Date(`${a}T12:00:00`).getTime();
  const t2 = new Date(`${b}T12:00:00`).getTime();
  return Math.round((t2 - t1) / 86_400_000);
}

/**
 * Cari tanggal di teks struk. Mengembalikan null kalau tidak ketemu.
 * Mendukung 18/11/2026, 18-11-26, 18 Nov 2026, 2026-11-18.
 */
export function findDateInText(text: string, today: string = todayISO()): string | null {
  const candidates: string[] = [];
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) candidates.push(`${iso[1]}-${iso[2]}-${iso[3]}`);

  const numeric = /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = numeric.exec(text))) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      candidates.push(`${year}-${pad(month)}-${pad(day)}`);
    }
  }

  const named = /\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(20\d{2})\b/g;
  while ((m = named.exec(text))) {
    const month = MONTH_LOOKUP[m[2].toLowerCase()];
    const day = Number(m[1]);
    if (month && day >= 1 && day <= 31) {
      candidates.push(`${m[3]}-${pad(month)}-${pad(day)}`);
    }
  }

  const valid = candidates.filter(isReasonableReceiptDate);
  if (valid.length > 0) return valid[0];

  // Tahun dua digit bisa jadi tahun lalu; tetap terima kalau memang yang ada.
  const fallback = candidates.find(isValidISODate);
  if (fallback && isValidISODate(fallback)) {
    const year = Number(fallback.slice(0, 4));
    const nowYear = Number(today.slice(0, 4));
    if (year > nowYear) return fallback.replace(String(year), String(year - 1));
    return null;
  }
  return null;
}
