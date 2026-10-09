import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { dayOrdinal, nextDueOn, nextReminderOn, shortDay } from '@/lib/due-day';

/**
 * The dates the card form promises are the scheduler's: `next_month_day(day, today)` clamps the day
 * to short months, and a reminder goes out on the day `due - lead` equals today.
 */

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('nextDueOn', () => {
  it('is this month while the day is still to come, today included', () => {
    expect(nextDueOn(22, '2026-10-09')).toBe('2026-10-22');
    expect(nextDueOn(9, '2026-10-09')).toBe('2026-10-09');
  });

  it('is next month once the day has passed, across a year end', () => {
    expect(nextDueOn(4, '2026-10-09')).toBe('2026-11-04');
    expect(nextDueOn(5, '2026-12-20')).toBe('2027-01-05');
  });

  it('clamps to the last day of a short month', () => {
    expect(nextDueOn(31, '2026-04-10')).toBe('2026-04-30');
    expect(nextDueOn(31, '2026-02-01')).toBe('2026-02-28');
    expect(nextDueOn(30, '2028-02-15')).toBe('2028-02-29');
    // The 31st on the 28th of February is today, as in next_month_day.
    expect(nextDueOn(31, '2026-02-28')).toBe('2026-02-28');
  });
});

describe('nextReminderOn', () => {
  it('is the due date less the lead', () => {
    expect(nextReminderOn(22, 3, '2026-10-09')).toBe('2026-10-19');
    expect(nextReminderOn(22, 0, '2026-10-09')).toBe('2026-10-22');
    expect(nextReminderOn(22, 7, '2026-10-09')).toBe('2026-10-15');
  });

  it('moves to the next due date when this one’s reminder day has gone', () => {
    // Due on the 22nd, three days before is the 19th: gone on the 20th.
    expect(nextReminderOn(22, 3, '2026-10-20')).toBe('2026-11-19');
    // The 1st, a week before, from the middle of the month: into the month before the due date.
    expect(nextReminderOn(1, 7, '2026-10-09')).toBe('2026-10-25');
  });

  it('counts back from the clamped day in a short month', () => {
    expect(nextReminderOn(31, 1, '2026-04-10')).toBe('2026-04-29');
  });

  it('agrees with the scheduler on every day of a year, for every lead', () => {
    // The scheduler sends on D when next_month_day(day, D) - lead = D.
    const fires = (day: number, lead: number, on: Date) => {
      const iso = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const due = new Date(`${nextDueOn(day, iso(on))}T00:00:00`);
      return Math.round((due.getTime() - on.getTime()) / 86_400_000) === lead;
    };
    for (const day of [1, 15, 28, 29, 30, 31]) {
      for (const lead of [0, 1, 3, 7]) {
        for (let offset = 0; offset < 366; offset += 1) {
          const today = new Date(2026, 0, 1 + offset);
          const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const promised = new Date(`${nextReminderOn(day, lead, iso)}T00:00:00`);
          let first = new Date(today);
          while (!fires(day, lead, first))
            first = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1);
          expect([day, lead, iso, promised.getTime()]).toEqual([day, lead, iso, first.getTime()]);
        }
      }
    }
  });
});

describe('dayOrdinal and shortDay', () => {
  it('writes English ordinals, teens included', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(dayOrdinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '31st',
    ]);
  });

  it('writes the day alone in Spanish, and "1er" for the first in French', () => {
    setLanguage('es');
    expect([1, 22].map(dayOrdinal)).toEqual(['1', '22']);
    setLanguage('fr');
    expect([1, 22].map(dayOrdinal)).toEqual(['1er', '22']);
  });

  it('shortens a date to its day and month', () => {
    expect(shortDay('2026-10-19')).toBe('19 Oct');
  });
});
