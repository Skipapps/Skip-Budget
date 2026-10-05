import { contrast } from '@/lib/tone';
import { colors } from '@/theme/colors';

/**
 * Whether a colour needs dark type on top of it. Compares the contrast of both candidates rather
 * than using a luminance threshold, which picks white on coral at 2.3:1 where ink gives 8.3:1.
 */
export function isLightColor(hex: string): boolean {
  return contrast(colors.ink, hex) >= contrast('#FFFFFF', hex);
}
