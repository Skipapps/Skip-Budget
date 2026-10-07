import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { amountForDisplay, dayChoice, dayFor, formatEntryDay } from '@/lib/entry-day';

// Wednesday 7 October 2026.
const TODAY = new Date(2026, 9, 7, 15, 30);

afterEach(() => resetLocaleForTests());

describe('dayChoice', () => {
  it('knows today and yesterday whatever the time of day', () => {
    expect(dayChoice(new Date(2026, 9, 7, 0, 0), TODAY)).toBe('today');
    expect(dayChoice(new Date(2026, 9, 7, 23, 59), TODAY)).toBe('today');
    expect(dayChoice(new Date(2026, 9, 6), TODAY)).toBe('yesterday');
  });

  it('calls every other day other, tomorrow included', () => {
    expect(dayChoice(new Date(2026, 9, 5), TODAY)).toBe('other');
    expect(dayChoice(new Date(2026, 9, 8), TODAY)).toBe('other');
    expect(dayChoice(new Date(2025, 9, 7), TODAY)).toBe('other');
  });

  it('crosses a month and a year boundary', () => {
    expect(dayChoice(new Date(2026, 8, 30), new Date(2026, 9, 1))).toBe('yesterday');
    expect(dayChoice(new Date(2025, 11, 31), new Date(2026, 0, 1))).toBe('yesterday');
  });
});

describe('dayFor', () => {
  it('gives midnight of the day a chip stands for', () => {
    expect(dayFor('today', TODAY)).toEqual(new Date(2026, 9, 7));
    expect(dayFor('yesterday', TODAY)).toEqual(new Date(2026, 9, 6));
  });

  it('agrees with dayChoice', () => {
    expect(dayChoice(dayFor('today', TODAY), TODAY)).toBe('today');
    expect(dayChoice(dayFor('yesterday', TODAY), TODAY)).toBe('yesterday');
  });
});

describe('formatEntryDay', () => {
  it('puts the relative word first, then the day', () => {
    expect(formatEntryDay(new Date(2026, 9, 6), TODAY)).toBe('Yesterday, Tue Oct 6');
    expect(formatEntryDay(new Date(2026, 9, 7), TODAY)).toBe('Today, Wed Oct 7');
  });

  it('is just the day for any other', () => {
    expect(formatEntryDay(new Date(2026, 9, 2), TODAY)).toBe('Fri Oct 2');
  });

  it('follows each language’s own order', () => {
    setLanguage('es');
    expect(formatEntryDay(new Date(2026, 9, 6), TODAY)).toMatch(/^Ayer, \S+ 6 \S+$/);
    expect(formatEntryDay(new Date(2026, 9, 2), TODAY)).toMatch(/^\S+ 2 \S+$/);

    setLanguage('fr');
    expect(formatEntryDay(new Date(2026, 9, 6), TODAY)).toMatch(/^Hier, \S+ 6 \S+$/);
  });
});

describe('amountForDisplay', () => {
  it('draws whole cents', () => {
    expect(amountForDisplay('49.11')).toBe('49.11');
    expect(amountForDisplay('12.5')).toBe('12.50');
    expect(amountForDisplay('1030')).toBe('1030.00');
    expect(amountForDisplay('0.07')).toBe('0.07');
  });

  it('is null for nothing, zero or what is not a number, never a $0', () => {
    for (const raw of ['', '0', '0.00', '-3', 'abc', '.']) {
      expect(amountForDisplay(raw)).toBeNull();
    }
  });
});
