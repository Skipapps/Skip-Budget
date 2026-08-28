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
  /**
   * Things meant to be pressed.
   *
   * Deeper than a resting card and paired with no border: an outline and a
   * shadow together flatten each other out, and it is the shadow alone that
   * makes a surface look like it would move under a finger.
   */
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
