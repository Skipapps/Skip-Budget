import {
  nextOccurrenceFrom,
  occurrencesInRange,
  planOccurrences,
  type Recurrence,
} from '@/lib/card-ledger';
import { unrecordedDates } from '@/lib/charges';

/**
 * The daily sweep, played out over 2027 and 2028: write what is due (`unrecordedDates`), then roll
 * the stored date on (`nextOccurrenceFrom`), the order both the phone and the server use. Walking
 * again from the rolled date must land on the same days as walking from the date first saved.
 */

const days = (list: string) => list.split(' ');

function plus(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

// Wide enough to walk back past the start and forward past the end.
const WIDE_FROM = '2026-01-01';
const WIDE_TO = '2029-12-31';

type Case = {
  name: string;
  start: string;
  anchorDay: number;
  recurrence: Recurrence;
  /** Every due date from `start` to the end of 2028, worked out by hand. */
  expected: string[];
};

const CASES: Case[] = [
  {
    name: 'monthly on the 29th',
    start: '2027-01-29',
    anchorDay: 29,
    recurrence: 'monthly',
    expected: days(
      '2027-01-29 2027-02-28 2027-03-29 2027-04-29 2027-05-29 2027-06-29 2027-07-29 2027-08-29 2027-09-29 2027-10-29 2027-11-29 2027-12-29 ' +
        '2028-01-29 2028-02-29 2028-03-29 2028-04-29 2028-05-29 2028-06-29 2028-07-29 2028-08-29 2028-09-29 2028-10-29 2028-11-29 2028-12-29',
    ),
  },
  {
    name: 'monthly on the 30th',
    start: '2027-01-30',
    anchorDay: 30,
    recurrence: 'monthly',
    expected: days(
      '2027-01-30 2027-02-28 2027-03-30 2027-04-30 2027-05-30 2027-06-30 2027-07-30 2027-08-30 2027-09-30 2027-10-30 2027-11-30 2027-12-30 ' +
        '2028-01-30 2028-02-29 2028-03-30 2028-04-30 2028-05-30 2028-06-30 2028-07-30 2028-08-30 2028-09-30 2028-10-30 2028-11-30 2028-12-30',
    ),
  },
  {
    name: 'monthly on the 31st',
    start: '2027-01-31',
    anchorDay: 31,
    recurrence: 'monthly',
    expected: days(
      '2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31 ' +
        '2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31',
    ),
  },
  {
    name: 'quarterly on the 31st',
    start: '2027-01-31',
    anchorDay: 31,
    recurrence: 'quarterly',
    expected: days(
      '2027-01-31 2027-04-30 2027-07-31 2027-10-31 2028-01-31 2028-04-30 2028-07-31 2028-10-31',
    ),
  },
  {
    name: 'quarterly on the 31st, from the end of November',
    start: '2027-11-30',
    anchorDay: 31,
    recurrence: 'quarterly',
    expected: days('2027-11-30 2028-02-29 2028-05-31 2028-08-31 2028-11-30'),
  },
  {
    name: 'yearly on 29 February',
    start: '2027-02-28',
    anchorDay: 29,
    recurrence: 'yearly',
    expected: days('2027-02-28 2028-02-29'),
  },
];

type Sweep = { today: string; stored: string };

/** Sweeps on each of `sweepDays`; returns what was written and the stored date after each. */
function play(
  plan: { start: string; anchorDay: number | null; recurrence: Recurrence },
  sweepDays: readonly string[],
): { recorded: string[]; sweeps: Sweep[] } {
  let stored = plan.start;
  const recorded = new Set<string>();
  const sweeps: Sweep[] = [];
  for (const today of sweepDays) {
    const due = unrecordedDates(
      {
        id: 'plan',
        recurrence: plan.recurrence,
        nextDate: stored,
        anchorDay: plan.anchorDay,
        startsOn: plan.start,
      },
      today,
      recorded,
    );
    for (const date of due) recorded.add(date);
    if (stored < today) stored = nextOccurrenceFrom(stored, plan.recurrence, today, plan.anchorDay);
    sweeps.push({ today, stored });
  }
  return { recorded: [...recorded].sort(), sweeps };
}

function sweepDays(from: string, to: string, every = 1): string[] {
  const found: string[] = [];
  for (let day = from; day <= to; day = plus(day, every)) found.push(day);
  return found;
}

describe('rolling on the anchor day', () => {
  it.each(CASES)(
    '$name: every day of 2027 and 2028, the rolled date walks to the same days',
    ({ start, anchorDay, recurrence, expected }) => {
      const original = occurrencesInRange(start, recurrence, WIDE_FROM, WIDE_TO, anchorDay);
      const { recorded, sweeps } = play(
        { start, anchorDay, recurrence },
        sweepDays(start, '2028-12-31'),
      );

      expect(recorded).toEqual(expected);
      for (const { today, stored } of sweeps) {
        expect([today, stored]).toEqual([
          today,
          nextOccurrenceFrom(start, recurrence, today, anchorDay),
        ]);
        expect([
          today,
          occurrencesInRange(stored, recurrence, WIDE_FROM, WIDE_TO, anchorDay),
        ]).toEqual([today, original]);
      }
    },
  );

  it.each(CASES)(
    '$name: opened only every 45 days, it catches up on the same days',
    ({ start, anchorDay, recurrence, expected }) => {
      const sparse = sweepDays(start, '2028-12-31', 45);
      const { recorded, sweeps } = play({ start, anchorDay, recurrence }, [
        ...sparse,
        '2028-12-31',
      ]);
      expect(recorded).toEqual(expected);
      for (const { today, stored } of sweeps) {
        expect([today, stored]).toEqual([
          today,
          nextOccurrenceFrom(start, recurrence, today, anchorDay),
        ]);
      }
    },
  );

  it('rolls a stored 28 February on to 31 March, and walks back to 31 January', () => {
    expect(nextOccurrenceFrom('2027-02-28', 'monthly', '2027-03-01', 31)).toBe('2027-03-31');
    expect(nextOccurrenceFrom('2027-03-31', 'monthly', '2027-04-01', 31)).toBe('2027-04-30');
    expect(nextOccurrenceFrom('2027-04-30', 'monthly', '2027-05-01', 31)).toBe('2027-05-31');
    expect(nextOccurrenceFrom('2028-02-29', 'monthly', '2028-03-01', 30)).toBe('2028-03-30');
    expect(occurrencesInRange('2027-03-31', 'monthly', '2027-01-01', '2027-02-28', 31)).toEqual([
      '2027-02-28',
      '2027-01-31',
    ]);
  });

  it('keeps a stored date that has not passed', () => {
    expect(nextOccurrenceFrom('2027-02-28', 'monthly', '2027-02-28', 31)).toBe('2027-02-28');
    expect(nextOccurrenceFrom('2027-02-28', 'monthly', '2027-01-15', 31)).toBe('2027-02-28');
  });
});

describe('catching up from a stored date on a shortened day', () => {
  it('writes the months since on the anchor day', () => {
    const plan = {
      id: 'plan',
      recurrence: 'monthly' as const,
      nextDate: '2027-02-28',
      anchorDay: 31,
      startsOn: '2027-01-31',
    };
    const recorded = new Set(days('2027-01-31 2027-02-28'));
    expect(unrecordedDates(plan, '2027-04-30', recorded)).toEqual(days('2027-03-31 2027-04-30'));
  });
});

describe('rolling with no anchor day, as every schedule rolled before it had one', () => {
  it('keeps to the day of whatever date was stored last', () => {
    const { recorded } = play(
      { start: '2027-01-31', anchorDay: null, recurrence: 'monthly' },
      sweepDays('2027-01-31', '2027-06-30'),
    );
    expect(recorded).toEqual(
      days('2027-01-31 2027-02-28 2027-03-28 2027-04-28 2027-05-28 2027-06-28'),
    );
  });
});

describe('the ledger forecasts on the anchor day', () => {
  it('projects 31 March and 30 April from a stored 28 February', () => {
    const found = planOccurrences({
      plan: {
        id: 'bill-rent',
        label: 'Rent',
        amount: 1234.56,
        nextDate: '2027-02-28',
        anchorDay: 31,
        recurrence: 'monthly',
        kind: 'bill',
        startsOn: '2027-01-31',
      },
      charges: [],
      isRecorded: false,
      from: '2027-01-01',
      to: '2027-04-30',
      today: '2027-02-28',
    });
    expect(found.map((entry) => entry.date)).toEqual(
      days('2027-01-31 2027-02-28 2027-03-31 2027-04-30'),
    );
  });
});
