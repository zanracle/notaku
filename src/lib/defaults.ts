export const DEFAULT_CATEGORIES = [
  'Transport',
  'Penginapan',
  'Makan',
  'Parkir',
  'BBM',
  'ATK',
  'Lain-lain',
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  nama: '',
  nip: '',
  jabatan: '',
  departemen: '',
  perusahaan: '',
  logo_path: '',
  ttd_pemohon: 'Pemohon',
  ttd_mengetahui: 'Mengetahui',
  categories: JSON.stringify(DEFAULT_CATEGORIES),
  ai_model: 'gemini-3.5-flash-lite',
  ai_consent_at: '',
  report_mode: 'lengkap',
  require_photo: '0',
  app_lock: '0',
  last_backup_at: '',
  default_category: 'Lain-lain',
};

export const MAX_AMOUNT = 50_000_000;
export const AI_CONFIDENCE_THRESHOLD = 60;
export const AI_DIFF_THRESHOLD = 0.05;

export function readCategories(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_CATEGORIES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const items = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      if (items.length > 0) return items;
    }
  } catch {
    // data rusak: pakai default, jangan crash
  }
  return DEFAULT_CATEGORIES;
}
