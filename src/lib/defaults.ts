export type CategoryDef = { name: string; icon: string; color: string };

export const DEFAULT_CATEGORY_DEFS: CategoryDef[] = [
  { name: 'Makan', icon: 'food', color: '#F0A83C' },
  { name: 'Transport', icon: 'car', color: '#E4572E' },
  { name: 'Belanja', icon: 'bag', color: '#2F6FD0' },
  { name: 'Penginapan', icon: 'bed', color: '#0E7C5F' },
  { name: 'Parkir', icon: 'parking', color: '#0EA5A5' },
  { name: 'BBM', icon: 'fuel', color: '#B45309' },
  { name: 'ATK', icon: 'pencil', color: '#8B5CF6' },
  { name: 'Lain-lain', icon: 'tag', color: '#6D7B73' },
];

export const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_DEFS.map((c) => c.name);

export const DEFAULT_SETTINGS: Record<string, string> = {
  nama: '',
  email: '',
  categories: JSON.stringify(DEFAULT_CATEGORY_DEFS),
  ai_model: 'gemini-3.5-flash-lite',
  ai_consent_at: '',
  ai_auto: '1',
  app_lock: '0',
  hide_amounts: '0',
  onboarding_done: '0',
  last_backup_at: '',
  default_category: 'Lain-lain',
  currency: 'IDR',
};

export const MAX_AMOUNT = 50_000_000;
export const AI_CONFIDENCE_THRESHOLD = 60;
export const AI_DIFF_THRESHOLD = 0.05;
export const MAX_PHOTO_MB = 12;

const FALLBACK_COLORS = ['#F0A83C', '#E4572E', '#2F6FD0', '#0E7C5F', '#0EA5A5', '#8B5CF6'];

export function categoryDef(name: string): CategoryDef {
  const found = DEFAULT_CATEGORY_DEFS.find((def) => def.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 9973;
  return { name, icon: 'tag', color: FALLBACK_COLORS[hash % FALLBACK_COLORS.length] };
}

/** Membaca format lama (string[]) maupun baru ({name,icon,color}[]). */
export function readCategoryDefs(raw: string | undefined): CategoryDef[] {
  if (!raw) return DEFAULT_CATEGORY_DEFS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const defs: CategoryDef[] = [];
      for (const item of parsed) {
        if (typeof item === 'string' && item.trim()) {
          defs.push(categoryDef(item.trim()));
        } else if (item && typeof item === 'object' && typeof item.name === 'string' && item.name.trim()) {
          const fallback = categoryDef(item.name.trim());
          defs.push({
            name: item.name.trim(),
            icon: typeof item.icon === 'string' && item.icon ? item.icon : fallback.icon,
            color: typeof item.color === 'string' && item.color ? item.color : fallback.color,
          });
        }
      }
      if (defs.length > 0) return defs;
    }
  } catch {
    // data rusak: pakai default, jangan crash
  }
  return DEFAULT_CATEGORY_DEFS;
}

export function serializeCategories(defs: CategoryDef[]): string {
  return JSON.stringify(defs.map((def) => ({ name: def.name, icon: def.icon, color: def.color })));
}

export function readCategories(raw: string | undefined): string[] {
  return readCategoryDefs(raw).map((def) => def.name);
}
