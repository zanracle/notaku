import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark';

const light = {
  mode: 'light' as ThemeMode,
  bg: '#F7F2E8',
  card: '#FFFFFF',
  cardAlt: '#EFE8DA',
  text: '#13201A',
  textMuted: '#6D7B73',
  border: '#E7DFD1',
  primary: '#0E7C5F',
  primaryDeep: '#0B3D31',
  onPrimary: '#FFFFFF',
  accent: '#F0A83C',
  accentSoft: '#FBEFD9',
  mint: '#E3F1EA',
  danger: '#C2410C',
  dangerSoft: '#FBE4DC',
  success: '#0E7C5F',
  successSoft: '#E3F1EA',
  warning: '#B45309',
  warningSoft: '#FBEFD9',
  overlay: 'rgba(11,61,49,0.55)',
  shadow: '0 10px 30px rgba(19,32,26,0.07)',
};

const dark: typeof light = {
  mode: 'dark',
  bg: '#0F1512',
  card: '#18211D',
  cardAlt: '#202B26',
  text: '#EFF4F0',
  textMuted: '#9AA9A1',
  border: '#29352F',
  primary: '#3DDC97',
  primaryDeep: '#0B3D31',
  onPrimary: '#06231B',
  accent: '#F5B855',
  accentSoft: '#3A2E15',
  mint: '#1B3A2F',
  danger: '#F58B6B',
  dangerSoft: '#3A2118',
  success: '#3DDC97',
  successSoft: '#1B3A2F',
  warning: '#F5B855',
  warningSoft: '#3A2E15',
  overlay: 'rgba(0,0,0,0.65)',
  shadow: '0 10px 30px rgba(0,0,0,0.35)',
};

export type Theme = typeof light;

export const radii = { sm: 10, md: 14, lg: 20, xl: 24, xxl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36 };

export const categoryColors = ['#F0A83C', '#E4572E', '#2F6FD0', '#0E7C5F', '#8B5CF6', '#0EA5A5'];
export const walletColors = ['#E4572E', '#2F6FD0', '#0E7C5F', '#F0A83C', '#8B5CF6', '#0EA5A5'];

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

/** Warna stabil per kategori, bukan acak, supaya chart tidak berubah tiap render. */
export function colorForCategory(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) % 9973;
  return categoryColors[hash % categoryColors.length];
}
