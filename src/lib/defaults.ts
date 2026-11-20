export const DEFAULT_CATEGORIES = [
  'Makan',
  'Transport',
  'Belanja',
  'Penginapan',
  'Parkir',
  'BBM',
  'ATK',
  'Lain-lain',
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  nama: '',
  email: '',
  categories: JSON.stringify(DEFAULT_CATEGORIES),
  ai_model: 'gemini-3.5-flash-lite',
  ai_consent_at: '',
  ai_auto: '1',
  app_lock: '0',
  last_backup_at: '',
  default_category: 'Lain-lain',
  currency: 'IDR',
};

export const MAX_AMOUNT = 50_000_000;
export const AI_CONFIDENCE_THRESHOLD = 60;
export const AI_DIFF_THRESHOLD = 0.05;
export const MAX_PHOTO_MB = 12;

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
