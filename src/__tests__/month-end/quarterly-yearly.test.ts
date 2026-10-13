import { nextOccurrenceFrom, occurrencesInRange, type Recurrence } from '@/lib/card-ledger';
import { unrecordedDates } from '@/lib/charges';

const days = (list: string) => list.split(' ');

function plus(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

/** One sweep a day from `start` to `to`: write what is due, then roll the stored date on. */
function rollDaily(start: string, anchorDay: number, recurrence: Recurrence, to: string) {
  let stored = start;
  const recorded = new Set<string>();
  const storedOn: string[] = [];
  for (let today = start; today <= to; today = plus(today, 1)) {
    const plan = { id: 'plan', recurrence, nextDate: stored, anchorDay, startsOn: start };
    for (const date of unrecordedDates(plan, today, recorded)) recorded.add(date);
    if (stored < today) {
      stored = nextOccurrenceFrom(stored, recurrence, today, anchorDay);
      storedOn.push(stored);
    }
  }
  return { recorded: [...recorded].sort(), stored: [...new Set(storedOn)] };
}

describe('quarterly on the 31st', () => {
  const YEAR = days('2027-01-31 2027-04-30 2027-07-31 2027-10-31');

  it('lands on 31 Jan, 30 Apr, 31 Jul and 31 Oct', () => {
    expect(
      occurrencesInRange('2027-01-31', 'quarterly', '2027-01-01', '2027-12-31', 31).sort(),
    ).toEqual(YEAR);
  });

  it('is back on the 31st after a 30 April, walked from either', () => {
    expect(nextOccurrenceFrom('2027-04-30', 'quarterly', '2027-05-01', 31)).toBe('2027-07-31');
    expect(
      occurrencesInRange('2027-04-30', 'quarterly', '2027-01-01', '2027-12-31', 31).sort(),
    ).toEqual(YEAR);
  });

  it('records and rolls on those days, every day of the year', () => {
    const { recorded, stored } = rollDaily('2027-01-31', 31, 'quarterly', '2027-12-31');
    expect(recorded).toEqual(YEAR);
    expect(stored).toEqual(days('2027-04-30 2027-07-31 2027-10-31 2028-01-31'));
  });
});

describe('yearly on 29 February 2028', () => {
  const FIVE_YEARS = days('2028-02-29 2029-02-28 2030-02-28 2031-02-28 2032-02-29');

  it('is 28 February from 2029 to 2031, then 29 February 2032', () => {
    expect(occurrencesInRange('2028-02-29', 'yearly', '2028-01-01', '2032-12-31').sort()).toEqual(
      FIVE_YEARS,
    );
  });

  it('comes back to the 29th from a stored 28th that keeps 29 as its day', () => {
    expect(nextOccurrenceFrom('2031-02-28', 'yearly', '2031-03-01', 29)).toBe('2032-02-29');
    expect(
      occurrencesInRange('2031-02-28', 'yearly', '2028-01-01', '2032-12-31', 29).sort(),
    ).toEqual(FIVE_YEARS);
  });

  it('records and rolls on those days, every day from 2028 to 2032', () => {
    const { recorded, stored } = rollDaily('2028-02-29', 29, 'yearly', '2032-12-31');
    expect(recorded).toEqual(FIVE_YEARS);
    expect(stored).toEqual(days('2029-02-28 2030-02-28 2031-02-28 2032-02-29 2033-02-28'));
  });
});
