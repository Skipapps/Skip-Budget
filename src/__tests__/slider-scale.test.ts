import { sliderRatio, sliderValue, type SliderScale } from '@/lib/slider-scale';

/**
 * The loan sliders' tracks. The amount is curved (orders of magnitude), the rate and term straight.
 * Dragging gives a value, the value places the thumb, and placing the thumb again gives the same
 * value: no drift anywhere along the track, ends included.
 */

const AMOUNT: SliderScale = { min: 500, max: 1_000_000, step: 500, scale: 'log' };
const RATE: SliderScale = { min: 0, max: 30, step: 0.01, scale: 'linear' };
const TERM: SliderScale = { min: 6, max: 480, step: 1, scale: 'linear' };

/** The track widths of a 320, 375 and 402pt phone, less the card's padding. */
const WIDTHS = [242, 297, 324];

const significantDigits = (value: number) => String(value).replace(/0+$/, '').length;

describe('the curved amount track', () => {
  it('starts at 500 and ends at 1,000,000 exactly, both ways', () => {
    expect(sliderValue(0, AMOUNT)).toBe(500);
    expect(sliderValue(1, AMOUNT)).toBe(1_000_000);
    expect(sliderRatio(500, AMOUNT)).toBe(0);
    expect(sliderRatio(1_000_000, AMOUNT)).toBe(1);
  });

  it('puts a $25,000 loan mid-track, where a straight track would leave it at the far left', () => {
    expect(sliderRatio(25_000, AMOUNT)).toBeCloseTo(Math.log(50) / Math.log(2000), 12);
    expect(sliderRatio(25_000, AMOUNT)).toBeGreaterThan(0.5);
    expect(sliderRatio(25_000, { ...AMOUNT, scale: 'linear' })).toBeLessThan(0.03);
  });

  it('parks a typed amount past either end at that end', () => {
    expect(sliderRatio(2_500_000, AMOUNT)).toBe(1);
    expect(sliderRatio(999_999_999.99, AMOUNT)).toBe(1);
    expect(sliderRatio(250, AMOUNT)).toBe(0);
    expect(sliderRatio(0.01, AMOUNT)).toBe(0);
  });

  it.each(WIDTHS)('maps every point of a %ipt track to a value and back without drift', (width) => {
    let previous = 0;
    for (let x = 0; x <= width; x += 0.5) {
      const value = sliderValue(x / width, AMOUNT);
      const thumb = sliderRatio(value, AMOUNT);
      // The thumb lands on the value, and the value at the thumb is the same value.
      expect([x, sliderValue(thumb, AMOUNT)]).toEqual([x, value]);
      // Never backwards under the finger, and the thumb within one snap of the finger.
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(Math.abs(thumb - x / width)).toBeLessThan(0.02);
      previous = value;
    }
    expect(sliderValue(0 / width, AMOUNT)).toBe(500);
    expect(sliderValue(width / width, AMOUNT)).toBe(1_000_000);
  });

  it('snaps to round figures: whole units, two significant digits', () => {
    const seen = new Set<number>();
    for (let x = 0; x <= 324; x += 1) seen.add(sliderValue(x / 324, AMOUNT));
    for (const value of seen) {
      expect([value, Number.isInteger(value)]).toEqual([value, true]);
      expect([value, significantDigits(value) <= 2]).toEqual([value, true]);
    }
    for (const round of [500, 1_000, 5_000, 25_000, 100_000, 250_000, 1_000_000]) {
      expect([round, sliderValue(sliderRatio(round, AMOUNT), AMOUNT)]).toEqual([round, round]);
    }
  });
});

describe('the straight rate and term tracks', () => {
  it('give back every rate to the hundredth and every term to the month', () => {
    for (let cents = 0; cents <= 3000; cents += 1) {
      const rate = cents / 100;
      expect([rate, sliderValue(sliderRatio(rate, RATE), RATE)]).toEqual([rate, rate]);
    }
    for (let months = 6; months <= 480; months += 1) {
      expect([months, sliderValue(sliderRatio(months, TERM), TERM)]).toEqual([months, months]);
    }
  });

  it('park a typed rate over 30% at the end', () => {
    expect(sliderRatio(45.25, RATE)).toBe(1);
    expect(sliderRatio(7.5, RATE)).toBe(0.25);
  });
});
