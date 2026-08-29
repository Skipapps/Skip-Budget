/**
 * The fixed reference tones, for decisions that are not about the theme.
 *
 * Almost every colour in Skip now comes from the theme provider, because
 * almost every colour depends on the mode and the accent the user chose. These
 * two do not. A card face is a colour the user picked for that card, and
 * whether it needs black or white type on top is a fact about that colour
 * alone — the same card reads the same way in light mode and dark. Deciding it
 * against a moving reference would flip the type on a card nobody touched.
 *
 * For anything that should follow the theme, use `useColors()`.
 */
export const colors = {
  /** The darkest type the app ever draws, used as the contrast reference. */
  ink: '#111111',
} as const;
