import { contrast, moneyTone } from '@/lib/tone';
import { CARD_COLORS } from '@/theme/card-colors';

describe('contrast', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrast('#FA8F6F', '#FA8F6F')).toBeCloseTo(1, 5);
  });
});

describe('moneyTone', () => {
  it('has a readable answer for every colour a card can be', () => {
    for (const card of CARD_COLORS) {
      for (const intent of ['debt', 'asset'] as const) {
        const tone = moneyTone(card.value, intent);
        // Null would be legal, but the ramps are wide enough that no palette
        // colour should need the plain-type fallback. If one starts to, the
        // ramp is too narrow rather than the card being at fault.
        expect(tone).not.toBeNull();
        expect(contrast(tone!, card.value)).toBeGreaterThanOrEqual(3.2);
      }
    }
  });

  it('never answers with the same tone for money owed and money held', () => {
    for (const card of CARD_COLORS) {
      expect(moneyTone(card.value, 'debt')).not.toBe(moneyTone(card.value, 'asset'));
    }
  });

  it('goes light on a dark card and dark on a light one', () => {
    // Ink is nearly black, snow is white; the ramp has to run both ways.
    expect(contrast(moneyTone('#161616', 'debt')!, '#FFFFFF')).toBeLessThan(4.5);
    expect(contrast(moneyTone('#FFFFFF', 'debt')!, '#000000')).toBeLessThan(4.5);
  });

  it('leaves a neutral amount uncoloured', () => {
    expect(moneyTone('#FFFFFF', 'neutral')).toBeNull();
  });
});
