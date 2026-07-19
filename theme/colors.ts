export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  brand: string;
  brandDark: string;
  danger: string;
  success: string;
  warning: string;
};

// Today's look, unchanged.
export const lightColors: ThemeColors = {
  background: '#F5F9F8',
  surface: '#FFFFFF',
  surfaceMuted: '#E8F4F3',
  border: '#E5E7EB',
  divider: '#F0F7F6',
  textPrimary: '#1C2B2A',
  textSecondary: '#5A7270',
  textMuted: '#9BBAB8',
  brand: '#295C59',
  brandDark: '#1E4542',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#E8A317',
};

export const darkColors: ThemeColors = {
  background: '#0F1716',
  surface: '#182422',
  surfaceMuted: '#1F2E2B',
  border: '#2A3B38',
  divider: '#233330',
  textPrimary: '#EAF3F1',
  textSecondary: '#9FB8B5',
  textMuted: '#6E8A87',
  brand: '#3D9C90',
  brandDark: '#295C59',
  danger: '#f87171',
  success: '#4ade80',
  warning: '#f2b84b',
};
