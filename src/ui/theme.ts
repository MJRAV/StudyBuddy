export const colors = {
  bg: '#fef3c7',
  bgCard: '#ffffff',
  textStrong: '#14532d',
  textBody: '#374151',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  green: '#16a34a',
  greenSoft: '#dcfce7',
  greenBright: '#16a34a',
  gold: '#d97706',
  goldSoft: '#facc15',
  red: '#dc2626',
  redDark: '#b91c1c',
  blue: '#1d4ed8',
  white: '#ffffff',
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const typography = {
  heading: {
    fontSize: 32,
    fontWeight: '900' as const,
    lineHeight: 40,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};
