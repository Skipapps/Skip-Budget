import { historyFloor, keptFrom, keptFromDate } from '@/lib/allowance';
import { toIsoDate } from '@/lib/date';

/**
 * The app's first kept day must be the deletion job's (`retention_cutoff`: the person's today less
 * seven years in Postgres), to the day, or a picker allows a day deleted that night, or the window
 * shows one fewer than is kept. Postgres keeps the day of the month and clamps it to the month's
 * length, so 29 February goes back to the 28th; JavaScript's Date rolls it on to 1 March.
 */

/** `(day - interval '7 years')::date`, written from the Postgres rule, not from the app's code. */
function postgresSevenYearsBefore(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const last = new Date(Date.UTC(year - 7, month, 0)).getUTCDate();
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(year - 7, 4)}-${pad(month)}-${pad(Math.min(date, last))}`;
}

function plus(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

describe('the first kept day', () => {
  it('is the Postgres day on every day from 2026 to 2036, and so is the Pro floor', () => {
    const differ: string[] = [];
    for (let day = '2026-01-01'; day <= '2036-12-31'; day = plus(day, 1)) {
      const expected = postgresSevenYearsBefore(day);
      const floor = historyFloor(true, new Date(`${day}T00:00:00`));
      const picker = toIsoDate(keptFromDate(day));
      if (keptFrom(day) !== expected || floor !== expected || picker !== expected) {
        differ.push(`${day}: ${keptFrom(day)} ${floor} ${picker}, not ${expected}`);
      }
    }
    expect(differ).toEqual([]);
  });

  it('pins the two days the brief names', () => {
    expect(keptFrom('2028-02-29')).toBe('2021-02-28');
    expect(keptFrom('2033-03-01')).toBe('2026-03-01');
  });
});
