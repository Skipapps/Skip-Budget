import { anchorDayOf, shiftMonths } from '@/lib/month-step';

describe('shiftMonths', () => {
  it('lands on the day given, clamped to the month it lands in', () => {
    expect(shiftMonths('2027-01-31', 1, 31)).toBe('2027-02-28');
    expect(shiftMonths('2028-01-31', 1, 31)).toBe('2028-02-29');
    expect(shiftMonths('2027-03-31', 1, 31)).toBe('2027-04-30');
    expect(shiftMonths('2027-01-15', 1, 15)).toBe('2027-02-15');
  });

  it('takes the day from its argument, never from the date it moves', () => {
    expect(shiftMonths('2027-02-28', 1, 31)).toBe('2027-03-31');
    expect(shiftMonths('2027-04-30', 1, 31)).toBe('2027-05-31');
    expect(shiftMonths('2028-02-29', 1, 30)).toBe('2028-03-30');
    expect(shiftMonths('2027-03-31', 1, 15)).toBe('2027-04-15');
  });

  it('goes back when negative, without spilling into the next month', () => {
    expect(shiftMonths('2027-03-31', -1, 31)).toBe('2027-02-28');
    expect(shiftMonths('2028-03-31', -1, 31)).toBe('2028-02-29');
    expect(shiftMonths('2027-02-28', -1, 31)).toBe('2027-01-31');
    expect(shiftMonths('2027-07-31', -1, 31)).toBe('2027-06-30');
  });

  it('crosses years both ways, by quarters and years too', () => {
    expect(shiftMonths('2027-12-31', 1, 31)).toBe('2028-01-31');
    expect(shiftMonths('2028-01-31', -1, 31)).toBe('2027-12-31');
    expect(shiftMonths('2027-11-30', 3, 31)).toBe('2028-02-29');
    expect(shiftMonths('2028-02-29', 12, 29)).toBe('2029-02-28');
    expect(shiftMonths('2029-02-28', 36, 29)).toBe('2032-02-29');
    expect(shiftMonths('2028-02-29', -12, 29)).toBe('2027-02-28');
    expect(shiftMonths('2027-01-31', -25, 31)).toBe('2024-12-31');
  });

  it('leaves the date alone at zero months, when the day is its own', () => {
    expect(shiftMonths('2027-02-28', 0, 28)).toBe('2027-02-28');
    expect(shiftMonths('2027-02-28', 0, 31)).toBe('2027-02-28');
  });
});

describe('anchorDayOf', () => {
  it('is the anchor day when there is one', () => {
    expect(anchorDayOf('2027-02-28', 31)).toBe(31);
    expect(anchorDayOf('2027-02-28', 1)).toBe(1);
  });

  it('is the date’s own day when there is none', () => {
    expect(anchorDayOf('2027-02-28')).toBe(28);
    expect(anchorDayOf('2027-02-28', null)).toBe(28);
    expect(anchorDayOf('2027-04-30', undefined)).toBe(30);
  });

  it('ignores a day no month has', () => {
    expect(anchorDayOf('2027-02-28', 0)).toBe(28);
    expect(anchorDayOf('2027-02-28', 32)).toBe(28);
    expect(anchorDayOf('2027-02-28', 30.5)).toBe(28);
    expect(anchorDayOf('2027-02-28', Number.NaN)).toBe(28);
  });
});
