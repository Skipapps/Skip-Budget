/** Elevation presets. Kept here so cards and floating elements stay consistent. */
export const shadows = {
  /** Resting cards — barely there, just enough to lift off white. */
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Floating elements that sit above content: FAB, tab bar. */
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
