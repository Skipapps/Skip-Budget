import { isLightColor } from '@/lib/color';
import { CARD_COLORS } from '@/theme/card-colors';

/**
 * A store's initials on its own colour: what is drawn where its logo would be. The push server
 * draws the same (supabase/functions/send-push/card.ts), so a notification matches the app.
 */
export type Monogram = { letters: string; background: string; ink: string };

/** First letter of the first two words: "Trader Joe's" reads better as TJ than T. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Deterministic per name, so a brand looks the same everywhere; hashing the name rather than
 * cycling an index means adding brands never reshuffles the ones on screen.
 */
function colourFor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 100000;
  }
  return CARD_COLORS[hash % CARD_COLORS.length].value;
}

export function monogramOf(name: string): Monogram {
  const background = colourFor(name || '?');
  return {
    letters: initials(name),
    background,
    ink: isLightColor(background) ? '#161616' : '#FFFFFF',
  };
}
