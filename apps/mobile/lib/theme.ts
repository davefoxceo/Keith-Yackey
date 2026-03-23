export const colors = {
  brand: {
    navy: '#0f172a',
    charcoal: '#1e293b',
    steel: '#334155',
    gold: '#f59e0b',
    goldLight: '#fbbf24',
    goldDark: '#d97706',
    amber: '#f59e0b',
  },
  surface: {
    base: '#0f172a',
    raised: '#1e293b',
    overlay: '#334155',
    subtle: '#1a2332',
  },
  accent: {
    default: '#f59e0b',
    hover: '#fbbf24',
    muted: 'rgba(245, 158, 11, 0.15)',
  },
  success: {
    default: '#10b981',
    muted: 'rgba(16, 185, 129, 0.15)',
  },
  danger: {
    default: '#f43f5e',
    muted: 'rgba(244, 63, 94, 0.15)',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
    inverse: '#0f172a',
  },
  border: {
    default: '#334155',
    subtle: '#1e293b',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  gold: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

/** Dial-specific colors for charts and UI. */
export const dialColors: Record<string, string> = {
  PARENT: '#8b5cf6',
  PARTNER: '#ec4899',
  PRODUCER: '#3b82f6',
  PLAYER: '#10b981',
  POWER: '#f59e0b',
};
