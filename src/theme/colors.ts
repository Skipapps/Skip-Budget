/**
 * Fixed reference tones for decisions that are not about the theme: whether a card face needs black
 * or white type depends on the colour the user picked alone, so it must not move with the mode.
 * Anything that should follow the theme uses `useColors()`.
 */
export const colors = {
  /** The darkest type the app ever draws, used as the contrast reference. */
  ink: '#111111',
} as const;
