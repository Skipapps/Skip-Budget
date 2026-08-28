import { contrast } from '@/lib/tone';
import { colors } from '@/theme/colors';

/**
 * Decides whether a colour needs dark or light type on top of it.
 *
 * Cards can be any colour from the palette, so foreground cannot be hardcoded
 * per card. It used to be derived from a luminance threshold, which is the
 * usual shortcut and quietly wrong at the edges: coral sat just under the line
 * and took white type at 2.3:1 where ink would have given 8.3:1.
 *
 * There is no need to guess where the line falls. Both candidates are known,
 * so the question is simply which of the two reads better on this background —
 * and that is a measurement, not a threshold.
 */
export function isLightColor(hex: string): boolean {
  return contrast(colors.ink, hex) >= contrast('#FFFFFF', hex);
}
