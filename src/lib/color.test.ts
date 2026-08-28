import { isLightColor } from '@/lib/color';
import { contrast } from '@/lib/tone';
import { CARD_COLORS } from '@/theme/card-colors';
import { colors } from '@/theme/colors';

/** What a caller does with the answer. */
const foreground = (background: string) => (isLightColor(background) ? colors.ink : '#FFFFFF');

describe('isLightColor', () => {
  it('answers the obvious ends correctly', () => {
    expect(isLightColor('#FFFFFF')).toBe(true);
    expect(isLightColor('#000000')).toBe(false);
  });

  it('never picks the less readable of the two foregrounds', () => {
    for (const card of CARD_COLORS) {
      const chosen = contrast(foreground(card.value), card.value);
      const other = contrast(
        foreground(card.value) === colors.ink ? '#FFFFFF' : colors.ink,
        card.value,
      );
      expect(chosen).toBeGreaterThanOrEqual(other);
    }
  });

  it('clears the large-text bar on every palette colour', () => {
    // The bug this guards: coral and violet both took white type on a
    // luminance threshold, landing at 2.3:1 and 3.4:1 respectively.
    for (const card of CARD_COLORS) {
      expect(contrast(foreground(card.value), card.value)).toBeGreaterThanOrEqual(3);
    }
  });

  it('puts dark type on coral, which is what the threshold got wrong', () => {
    expect(isLightColor('#FA8F6F')).toBe(true);
    expect(contrast(colors.ink, '#FA8F6F')).toBeGreaterThan(4.5);
  });

  it('still puts light type on the dark palette colours', () => {
    expect(isLightColor('#161616')).toBe(false);
    expect(isLightColor('#2E6E5B')).toBe(false);
  });
});
