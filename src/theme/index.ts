import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark';

const light = {
  mode: 'light' as ThemeMode,
  bg: '#F6F7F9',
  card: '#FFFFFF',
  cardAlt: '#F1F3F6',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  primary: '#0F766E',
  primarySoft: '#CCFBF1',
  onPrimary: '#FFFFFF',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  success: '#047857',
  successSoft: '#D1FAE5',
  overlay: 'rgba(17,24,39,0.45)',
};

const dark: typeof light = {
  mode: 'dark',
  bg: '#0B1114',
  card: '#141C21',
  cardAlt: '#1B252B',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  border: '#243038',
  primary: '#2DD4BF',
  primarySoft: '#0F3B38',
  onPrimary: '#04211F',
  danger: '#F87171',
  dangerSoft: '#3B1212',
  warning: '#FBBF24',
  warningSoft: '#3B2A0A',
  success: '#34D399',
  successSoft: '#0B3226',
  overlay: 'rgba(0,0,0,0.6)',
};

export type Theme = typeof light;

export const radii = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
