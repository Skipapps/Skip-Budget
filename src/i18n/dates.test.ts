import { clockText } from '@/i18n/calendar';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import {
  formatClock,
  formatDateRange,
  formatDayLabel,
  formatFullDate,
  formatRelativeDay,
  PAY_FREQUENCIES,
} from '@/lib/date';
import { periodLabel, PERIODS } from '@/lib/period';
import { LEDGER_RANGES, RANGES } from '@/lib/range';

beforeEach(() => {
  resetLocaleForTests();
});

const may4 = new Date(2026, 4, 4);

describe('dates follow the language on screen', () => {
  it('writes the same day in each language', () => {
    expect(formatFullDate(may4)).toBe('4 May 2026');
    setLanguage('es');
    expect(formatFullDate(may4)).toBe('4 may 2026');
    setLanguage('fr');
    expect(formatFullDate(may4)).toBe('4 mai 2026');
    expect(formatFullDate(new Date(2026, 0, 9))).toBe('9 janv. 2026');
  });

  it('names the weekday for the day stepper', () => {
    expect(formatDayLabel(may4)).toEqual({ weekday: 'Mon', date: '04.05' });
    setLanguage('es');
    expect(formatDayLabel(may4).weekday).toBe('lun');
    setLanguage('fr');
    expect(formatDayLabel(may4).weekday).toBe('lun.');
  });

  it('collapses a range in every language', () => {
    expect(formatDateRange(new Date(2026, 7, 22), new Date(2026, 7, 28))).toBe('22 – 28 Aug 2026');
    setLanguage('fr');
    expect(formatDateRange(new Date(2026, 7, 22), new Date(2026, 7, 28))).toBe('22 – 28 août 2026');
  });

  it('says today, yesterday and tomorrow in words', () => {
    expect(formatRelativeDay('2026-05-04', '2026-05-04')).toBe('Today');
    setLanguage('es');
    expect(formatRelativeDay('2026-05-03', '2026-05-04')).toBe('Ayer');
    setLanguage('fr');
    expect(formatRelativeDay('2026-05-05', '2026-05-04')).toBe('Demain');
    expect(formatRelativeDay('', '2026-05-04')).toBe('Pas encore de date');
  });

  it('reads a time of day the way each language writes it', () => {
    expect(formatClock(9, 0)).toBe('9:00 AM');
    expect(formatClock(0, 5)).toBe('12:05 AM');
    expect(formatClock(12, 30)).toBe('12:30 PM');
    expect(clockText(14, 30, 'es')).toBe('2:30 p. m.');
    expect(clockText(9, 0, 'es')).toBe('9:00 a. m.');
    expect(clockText(9, 0, 'fr')).toBe('9\u00A0h\u00A000');
    expect(clockText(14, 30, 'fr')).toBe('14\u00A0h\u00A030');
  });

  it('relabels the option lists without being rebuilt', () => {
    expect(PAY_FREQUENCIES.map((option) => option.label)).toEqual([
      'Weekly',
      'Every 2 weeks',
      'Twice a month',
      'Monthly',
      'Just this time',
    ]);
    expect(RANGES.map((option) => option.label)).toEqual(['Today', 'Week', 'Month', 'Year']);

    setLanguage('fr');
    expect(PAY_FREQUENCIES.map((option) => option.label)).toEqual([
      'Chaque semaine',
      'Toutes les 2 semaines',
      'Deux fois par mois',
      'Chaque mois',
      'Juste cette fois',
    ]);
    expect(LEDGER_RANGES.map((option) => option.label)).toEqual([
      'Aujourd’hui',
      'Semaine',
      'Mois',
      'Année',
      'Tout',
    ]);
    expect(PERIODS.map((option) => option.label)).toEqual(['Semaine', 'Mois', 'Année', 'Tout']);
    expect(PAY_FREQUENCIES.map((option) => option.value)).toEqual([
      'weekly',
      'biweekly',
      'semimonthly',
      'monthly',
      'once',
    ]);
  });

  it('labels a period with the month in the language on screen', () => {
    expect(periodLabel('month', may4)).toBe('May 2026');
    setLanguage('es');
    expect(periodLabel('month', new Date(2026, 7, 1))).toBe('ago 2026');
  });
});
