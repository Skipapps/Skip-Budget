import { buildBillValues, buildSubscriptionValues } from '@/api/entry-values';
import { nextDueAfter } from '@/lib/bill-month';
import { nextOccurrenceFrom, occurrencesInRange, type Recurrence } from '@/lib/card-ledger';
import { effectiveNextDue, type PaidCycleLabel } from '@/lib/next-due-hint';

/**
 * Where a picked due date lands once the plan's charges count. The table is the oracle: every floor,
 * next date and paid cycle was worked out by hand from the calendar (12 Oct 2026 is a Monday; 2027
 * has a 28-day February, 2028 a 29-day one), not taken from the code it checks. A line:
 *
 *   picked anchor-day recurrence last-charged | floor next paid-cycle-start
 *
 * "-" is none: no anchor day (the picked date's own day), never charged, no paid cycle (no hint).
 * The floor is the database's: the later of starts_on as Save writes it and the start of the cycle
 * after the newest charge. The next date is what the database stores once its next-due floor rule
 * has run. The SQL check copies this text between $nextdue$ markers, so the
 * trigger and `effectiveNextDue` are held to the same rows. Blank lines and "#" lines are notes.
 *
 * Set-period rows are a period paid monthly on its anchor day, its cycle the calendar month. They
 * are checked here once `occurrencesInRange` walks a period that way (PERIODS_WALK below).
 */
export const NEXT_DUE_FLOOR_TABLE = `
# Due on the 1st, charged 1 Oct, moved to the 15th
2026-10-15  - monthly   2026-10-01 | 2026-11-01 2026-11-15 2026-10-01

# A 31st picked in a charged October lands on 30 Nov; kept on the 31st, the 30 Nov walks to 31 Dec
2026-10-31  - monthly   2026-10-01 | 2026-11-01 2026-11-30 2026-10-01
2026-11-30 31 monthly   2026-11-30 | 2026-12-01 2026-12-31 2026-11-01
2027-02-28 31 monthly   2027-02-28 | 2027-03-01 2027-03-31 2027-02-01

# Edited on the charge day with the date left as stored
2026-10-01  - monthly   2026-10-01 | 2026-11-01 2026-11-01 2026-10-01

# Picked before the floor: past every charged month, the newest one named
2026-09-15  - monthly   2026-10-01 | 2026-11-01 2026-11-15 2026-10-01
2026-09-25  - monthly   2026-09-20 | 2026-10-01 2026-10-25 2026-09-01

# On or after the floor: the date stands, no hint (a past one is recorded by the recorders)
2026-11-15  - monthly   2026-10-01 | 2026-11-15 2026-11-15 -
2026-11-01  - monthly   2026-10-01 | 2026-11-01 2026-11-01 -
2026-10-25  - monthly   2026-09-20 | 2026-10-25 2026-10-25 -
2026-10-05  - monthly   2026-09-20 | 2026-10-05 2026-10-05 -

# Across the new year
2026-12-20  - monthly   2026-12-01 | 2027-01-01 2027-01-20 2026-12-01

# A loan keeps its payment day whatever date the form holds
2026-10-20 15 monthly   2026-10-15 | 2026-11-01 2026-11-15 2026-10-01

# Weekly, Monday to Sunday; a day of the month means nothing to it
2026-10-15  - weekly    2026-10-12 | 2026-10-19 2026-10-22 2026-10-12
2026-10-15 31 weekly    2026-10-12 | 2026-10-19 2026-10-22 2026-10-12
2026-12-31  - weekly    2026-12-28 | 2027-01-04 2027-01-07 2026-12-28
2026-10-22  - weekly    2026-10-12 | 2026-10-22 2026-10-22 -

# Quarterly, calendar quarters
2026-11-15  - quarterly 2026-10-01 | 2027-01-01 2027-02-15 2026-10-01
2026-08-31  - quarterly 2026-11-30 | 2027-01-01 2027-02-28 2026-10-01
2027-01-15  - quarterly 2026-10-01 | 2027-01-15 2027-01-15 -

# Yearly, calendar years
2026-12-01  - yearly    2026-01-05 | 2027-01-01 2027-12-01 2026-01-01
2028-02-29 29 yearly    2028-02-29 | 2029-01-01 2029-02-28 2028-01-01
2027-03-01  - yearly    2026-01-05 | 2027-03-01 2027-03-01 -

# Never charged: no hint
2026-10-15  - monthly   -          | 2026-10-15 2026-10-15 -
2026-10-15  - weekly    -          | 2026-10-15 2026-10-15 -
2026-10-15  - quarterly -          | 2026-10-15 2026-10-15 -
2026-10-15  - yearly    -          | 2026-10-15 2026-10-15 -

# A set period paid monthly, as a monthly bill
2026-10-15  - period    2026-10-01 | 2026-11-01 2026-11-15 2026-10-01
2026-10-31  - period    2026-10-01 | 2026-11-01 2026-11-30 2026-10-01
2026-11-30 31 period    2026-11-30 | 2026-12-01 2026-12-31 2026-11-01
2026-10-01  - period    2026-10-01 | 2026-11-01 2026-11-01 2026-10-01
2026-11-15  - period    2026-10-01 | 2026-11-15 2026-11-15 -
2026-10-15  - period    -          | 2026-10-15 2026-10-15 -
`;

/** A set period walks month by month on its anchor day, as the table's period rows take it. */
const PERIODS_WALK =
  occurrencesInRange('2026-10-01', 'period', '2026-10-01', '2026-12-31').length === 3;
const whenPeriodsWalk = PERIODS_WALK ? it : it.skip;
const whilePeriodsLandOnce = PERIODS_WALK ? it.skip : it;

type Row = {
  picked: string;
  anchorDay: number | null;
  recurrence: Recurrence;
  lastChargedOn: string | null;
  floor: string;
  next: string;
  paidStart: string | null;
};

const RECURRENCES: readonly Recurrence[] = ['weekly', 'monthly', 'quarterly', 'yearly', 'period'];

/** A real calendar day, not just the shape of one: 2027-02-29 fails. */
function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function rows(): Row[] {
  return NEXT_DUE_FLOOR_TABLE.split('\n')
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
    .map((line) => {
      const [inputs, outputs = ''] = line.split('|');
      const [picked, day, recurrence, last, ...extraIn] = inputs.trim().split(/\s+/);
      const [floor, next, paid, ...extraOut] = outputs.trim().split(/\s+/);
      if (
        extraIn.length > 0 ||
        extraOut.length > 0 ||
        !paid ||
        !RECURRENCES.includes(recurrence as Recurrence)
      ) {
        throw new Error(`Unreadable row: ${line}`);
      }
      return {
        picked,
        anchorDay: day === '-' ? null : Number(day),
        recurrence: recurrence as Recurrence,
        lastChargedOn: last === '-' ? null : last,
        floor,
        next,
        paidStart: paid === '-' ? null : paid,
      };
    });
}

const TABLE = rows();
const REPEATING = TABLE.filter((row) => row.recurrence !== 'period');
const PERIODS = TABLE.filter((row) => row.recurrence === 'period');

const label = (row: Row) =>
  `${row.picked} ${row.anchorDay ?? '-'} ${row.recurrence} ${row.lastChargedOn ?? '-'}`;

/** The edit happens on or after the newest charge, as it does in the app. */
const hintFor = (row: Row, today = row.lastChargedOn ?? row.picked) =>
  effectiveNextDue({
    picked: row.picked,
    recurrence: row.recurrence,
    anchorDay: row.anchorDay,
    lastChargedOn: row.lastChargedOn,
    today,
  });

const localDay = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const dayBefore = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
};

const STEP_MONTHS = { monthly: 1, quarterly: 3, yearly: 12, period: 1 } as const;
const DAY_MS = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const utc = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date);
};
const days = (from: string, to: string, every: number) => {
  const found: string[] = [];
  for (let time = utc(from); time <= utc(to); time += every * DAY_MS) found.push(iso(time));
  return found;
};

/** The first day of the cycle after `day`'s, by calendar arithmetic alone; a set period's is the month. */
function cycleAfter(day: string, recurrence: Recurrence): string {
  if (recurrence === 'weekly') {
    const weekday = (new Date(utc(day)).getUTCDay() + 6) % 7;
    return iso(utc(day) + (7 - weekday) * DAY_MS);
  }
  const [year, month] = day.split('-').map(Number);
  const months = STEP_MONTHS[recurrence];
  const index = year * 12 + (month - 1);
  const next = index - (index % months) + months;
  return iso(Date.UTC(Math.floor(next / 12), next % 12, 1));
}

/**
 * The trigger on a row as Save writes it, worked apart from the helper: its floor is the later of the
 * saved start and `cycleAfter` the newest charge, and a next date before the floor becomes the first
 * schedule date on or after it (`nextOccurrenceFrom`).
 */
function triggerStores(next: string, startsOn: string | null, row: Row) {
  const after = row.lastChargedOn ? cycleAfter(row.lastChargedOn, row.recurrence) : null;
  const floor = after && (!startsOn || after > startsOn) ? after : (startsOn ?? next);
  return {
    floor,
    next: next >= floor ? next : nextOccurrenceFrom(next, row.recurrence, floor, row.anchorDay),
  };
}

function checkRow(row: Row) {
  const hint = hintFor(row);
  expect([label(row), hint.next, hint.paidCycle?.start ?? null]).toEqual([
    label(row),
    row.next,
    row.paidStart,
  ]);
  expect([label(row), hint.paidCycle !== null]).toEqual([label(row), hint.next !== row.picked]);
}

function savedBill(row: Row) {
  const built = buildBillValues(
    {
      name: 'Rent',
      amount: '1500',
      issuer: null,
      categoryId: 'housing',
      iconId: 'other',
      recurrence: row.recurrence,
      startDate: localDay(row.picked),
      endDate: null,
      sourceId: '',
      note: '',
    },
    { sources: [], lastChargedOn: row.lastChargedOn },
  );
  if (!built.ok) throw new Error(`Refused: ${label(row)}`);
  return built.values;
}

function checkTrigger(row: Row) {
  const saved = savedBill(row);
  expect([label(row), triggerStores(saved.next_due_on as string, saved.starts_on, row)]).toEqual([
    label(row),
    { floor: row.floor, next: row.next },
  ]);
}

/**
 * What the month page calls next on the row as the trigger leaves it, on a day the edit could be
 * made: after the newest charge and before the day picked. The stored anchor is the picked day's
 * unless the row names one.
 */
function checkMonthPage(row: Row) {
  const editDay = [row.lastChargedOn ?? '', dayBefore(row.picked)].sort()[1];
  const shown = nextDueAfter(
    {
      anchor: row.next,
      recurrence: row.recurrence,
      anchorDay: row.anchorDay ?? Number(row.picked.slice(8, 10)),
      startsOn: savedBill(row).starts_on,
      lastCharged: row.lastChargedOn,
    },
    editDay,
  );
  expect([label(row), editDay, shown]).toEqual([label(row), editDay, row.next]);
}

describe('the next-due floor table', () => {
  it('is read as written: 33 rows of real days, each next on or after its floor', () => {
    expect([TABLE.length, REPEATING.length, PERIODS.length]).toEqual([33, 27, 6]);
    for (const row of TABLE) {
      const days = [row.picked, row.floor, row.next, row.lastChargedOn, row.paidStart].filter(
        (value): value is string => value !== null,
      );
      expect([label(row), days.every(isDay), row.next >= row.floor]).toEqual([
        label(row),
        true,
        true,
      ]);
    }
  });

  it('is plain text in both copies: nothing a template literal or dollar quote would change', () => {
    expect(NEXT_DUE_FLOOR_TABLE).not.toMatch(/[`\\]|\$\{|\$nextdue\$/);
  });

  it('gives the next date and the paid cycle of every repeating row, and hints only on a move', () => {
    REPEATING.forEach(checkRow);
  });

  it('saves the picked date as next_due_on, the floor as starts_on, and a set period its own start', () => {
    for (const row of TABLE) {
      const saved = savedBill(row);
      expect([label(row), saved.next_due_on, saved.starts_on]).toEqual([
        label(row),
        row.picked,
        row.recurrence === 'period' ? row.picked : row.floor,
      ]);
    }
  });

  it('is what the trigger stores for every repeating row', () => {
    REPEATING.forEach(checkTrigger);
  });

  it('agrees with the subscription form, whose start may count from an earlier renewal', () => {
    for (const row of REPEATING) {
      if (row.recurrence === 'period') continue;
      for (const countsFrom of [null, '2025-01-01', row.picked]) {
        const built = buildSubscriptionValues(
          {
            service: { brandId: null, name: 'Gym', domain: null, categoryId: 'health' },
            amount: '40',
            cycle: row.recurrence,
            renewsOn: localDay(row.picked),
            sourceId: '',
            note: '',
            active: true,
          },
          { sources: [], lastChargedOn: row.lastChargedOn, countsFrom },
        );
        if (!built.ok) throw new Error(`Refused: ${label(row)}`);
        const { next_renewal_on: next, started_on: startsOn } = built.values;
        expect([label(row), countsFrom, next]).toEqual([label(row), countsFrom, row.picked]);
        expect([label(row), countsFrom, triggerStores(next as string, startsOn, row).next]).toEqual(
          [label(row), countsFrom, row.next],
        );
      }
    }
  });

  it('is the date the month page reads as next on the stored row', () => {
    REPEATING.forEach(checkMonthPage);
  });

  whenPeriodsWalk('gives the next date and the paid cycle of every set-period row', () => {
    PERIODS.forEach(checkRow);
    for (const row of PERIODS) {
      if (row.paidStart)
        expect([label(row), hintFor(row).paidCycle?.label]).toEqual([label(row), 'month']);
    }
  });

  whenPeriodsWalk('is what the trigger stores for every set-period row', () => {
    PERIODS.forEach(checkTrigger);
  });

  // A set period keeps its own start, so the month page agrees only if it skips a charged cycle.
  whenPeriodsWalk('is the date the month page reads as next for a set period', () => {
    PERIODS.forEach(checkMonthPage);
  });
});

describe('effectiveNextDue', () => {
  const FOUNDER = {
    picked: '2026-10-15',
    recurrence: 'monthly' as const,
    lastChargedOn: '2026-10-01',
    today: '2026-10-12',
  };

  it('says October is paid and the next payment is 15 Nov', () => {
    expect(effectiveNextDue(FOUNDER)).toEqual({
      next: '2026-11-15',
      paidCycle: { start: '2026-10-01', label: 'month', current: true },
    });
  });

  it('keeps a 31st on the 31st after the 30 Nov it lands on, and only with the anchor day', () => {
    const next = effectiveNextDue({ ...FOUNDER, picked: '2026-10-31' }).next as string;
    expect(next).toBe('2026-11-30');
    expect(occurrencesInRange(next, 'monthly', next, '2027-03-31', 31).sort()).toEqual([
      '2026-11-30',
      '2026-12-31',
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
    ]);
    // Stored with no anchor day, the clamped date is all the walk has to go on.
    expect(occurrencesInRange(next, 'monthly', next, '2027-03-31').sort()).toEqual([
      '2026-11-30',
      '2026-12-30',
      '2027-01-30',
      '2027-02-28',
      '2027-03-30',
    ]);
  });

  it("walks on the anchor day it is given, and on the picked date's own day without one", () => {
    const base = { ...FOUNDER, picked: '2026-10-31' };
    expect(effectiveNextDue({ ...base, anchorDay: 15 }).next).toBe('2026-11-15');
    expect(effectiveNextDue({ ...base, anchorDay: null }).next).toBe('2026-11-30');
    expect(effectiveNextDue({ ...base, anchorDay: undefined }).next).toBe('2026-11-30');
    // Out of range or not a whole day: the database refuses such an anchor, so the walk ignores it.
    for (const anchorDay of [0, 32, 2.5, Number.NaN]) {
      expect([anchorDay, effectiveNextDue({ ...base, anchorDay }).next]).toEqual([
        anchorDay,
        '2026-11-30',
      ]);
    }
  });

  it('leaves a past date in a cycle with no charge where it is: the recorders write it today', () => {
    expect(
      effectiveNextDue({
        picked: '2026-10-05',
        recurrence: 'monthly',
        lastChargedOn: '2026-09-20',
        today: '2026-10-12',
      }),
    ).toEqual({ next: '2026-10-05', paidCycle: null });
  });

  it('names the newest paid cycle, which may be last month', () => {
    expect(
      effectiveNextDue({
        picked: '2026-09-25',
        recurrence: 'monthly',
        lastChargedOn: '2026-09-20',
        today: '2026-10-12',
      }),
    ).toEqual({
      next: '2026-10-25',
      paidCycle: { start: '2026-09-01', label: 'month', current: false },
    });
  });

  it('moves Next on the charge day itself', () => {
    expect(
      effectiveNextDue({
        picked: '2026-10-01',
        recurrence: 'monthly',
        lastChargedOn: '2026-10-01',
        today: '2026-10-01',
      }),
    ).toEqual({
      next: '2026-11-01',
      paidCycle: { start: '2026-10-01', label: 'month', current: true },
    });
  });

  it('labels each kind of cycle and knows when it is the current one', () => {
    const cases: [Recurrence, string, string, string, PaidCycleLabel, string, boolean][] = [
      // recurrence, picked, last charged, today, label, start, current
      ['weekly', '2026-10-15', '2026-10-12', '2026-10-18', 'week', '2026-10-12', true],
      ['weekly', '2026-10-15', '2026-10-12', '2026-10-19', 'week', '2026-10-12', false],
      ['monthly', '2026-10-15', '2026-10-01', '2026-10-31', 'month', '2026-10-01', true],
      ['monthly', '2026-10-15', '2026-10-01', '2026-11-01', 'month', '2026-10-01', false],
      ['quarterly', '2026-11-15', '2026-10-01', '2026-12-31', 'quarter', '2026-10-01', true],
      ['quarterly', '2026-11-15', '2026-10-01', '2027-01-01', 'quarter', '2026-10-01', false],
      ['yearly', '2026-12-01', '2026-01-05', '2026-06-01', 'year', '2026-01-01', true],
      ['yearly', '2026-12-01', '2026-01-05', '2027-01-01', 'year', '2026-01-01', false],
    ];
    for (const [recurrence, picked, lastChargedOn, today, cycle, start, current] of cases) {
      expect([
        recurrence,
        today,
        effectiveNextDue({ picked, recurrence, lastChargedOn, today }).paidCycle,
      ]).toEqual([recurrence, today, { start, label: cycle, current }]);
    }
  });

  it('names no next payment once a loan has made its last one', () => {
    const loan = {
      picked: '2026-10-15',
      recurrence: 'monthly' as const,
      anchorDay: 15,
      lastChargedOn: '2026-10-15',
      today: '2026-10-20',
    };
    expect(effectiveNextDue({ ...loan, endsOn: '2026-10-15' })).toEqual({
      next: null,
      paidCycle: { start: '2026-10-01', label: 'month', current: true },
    });
    // One payment left, on the last day itself; then one day short of it.
    expect(effectiveNextDue({ ...loan, endsOn: '2026-11-15' }).next).toBe('2026-11-15');
    expect(effectiveNextDue({ ...loan, endsOn: '2026-11-14' }).next).toBeNull();
    // No end, or an end far off.
    expect(effectiveNextDue({ ...loan, endsOn: null }).next).toBe('2026-11-15');
    expect(effectiveNextDue({ ...loan, endsOn: undefined }).next).toBe('2026-11-15');
    expect(effectiveNextDue({ ...loan, endsOn: '2029-10-15' }).next).toBe('2026-11-15');

    // Paid on the 31st, its last payment on a clamped 30 Nov.
    const late = { ...loan, picked: '2026-10-31', anchorDay: 31, lastChargedOn: '2026-10-31' };
    expect(effectiveNextDue({ ...late, today: '2026-11-02', endsOn: '2026-11-30' })).toEqual({
      next: '2026-11-30',
      paidCycle: { start: '2026-10-01', label: 'month', current: false },
    });
    expect(effectiveNextDue({ ...late, endsOn: '2026-11-29' }).next).toBeNull();
  });

  it('leaves a date on its last day alone while that payment is still to come', () => {
    expect(
      effectiveNextDue({
        picked: '2026-10-15',
        recurrence: 'monthly',
        anchorDay: 15,
        lastChargedOn: '2026-09-15',
        today: '2026-10-12',
        endsOn: '2026-10-15',
      }),
    ).toEqual({ next: '2026-10-15', paidCycle: null });
  });

  whenPeriodsWalk('names no next payment for a set period whose paid month was its last', () => {
    const course = {
      picked: '2026-10-15',
      recurrence: 'period' as const,
      lastChargedOn: '2026-10-01',
      today: '2026-10-12',
    };
    expect(effectiveNextDue({ ...course, endsOn: '2026-10-31' })).toEqual({
      next: null,
      paidCycle: { start: '2026-10-01', label: 'month', current: true },
    });
    expect(effectiveNextDue({ ...course, endsOn: '2026-11-15' }).next).toBe('2026-11-15');
    expect(effectiveNextDue({ ...course, endsOn: '2026-11-14' }).next).toBeNull();
  });

  it('never hints for a plan never charged', () => {
    for (const recurrence of RECURRENCES) {
      expect(
        effectiveNextDue({
          picked: '2026-10-15',
          recurrence,
          lastChargedOn: null,
          today: '2026-10-12',
        }),
      ).toEqual({ next: '2026-10-15', paidCycle: null });
    }
  });

  // While a set period lands on its one date, the walk finds nothing after a charge, so the date
  // stands and nothing is said.
  whilePeriodsLandOnce('leaves a set period that lands once on its date, with no hint', () => {
    for (const [picked, lastChargedOn] of [
      ['2026-10-15', '2026-10-01'],
      ['2026-10-01', '2026-10-01'],
      ['2026-09-01', '2026-10-01'],
    ]) {
      for (const endsOn of [null, '2026-10-31']) {
        expect([
          picked,
          endsOn,
          effectiveNextDue({
            picked,
            recurrence: 'period',
            lastChargedOn,
            today: '2026-10-12',
            endsOn,
          }),
        ]).toEqual([picked, endsOn, { next: picked, paidCycle: null }]);
      }
    }
  });
});

describe('effectiveNextDue against a walk counted by hand', () => {
  /** The schedule from the picked date: itself, then every step on `anchor`, clamped per month. */
  function firstOnOrAfter(
    picked: string,
    recurrence: Recurrence,
    anchor: number,
    floor: string,
  ): string {
    if (picked >= floor) return picked;
    const [year, month] = picked.split('-').map(Number);
    for (let step = 1; step < 200; step += 1) {
      let date: string;
      if (recurrence === 'weekly') {
        date = iso(utc(picked) + 7 * step * DAY_MS);
      } else {
        const index = year * 12 + (month - 1) + step * STEP_MONTHS[recurrence];
        const toYear = Math.floor(index / 12);
        const toMonth = index % 12;
        const last = new Date(Date.UTC(toYear, toMonth + 1, 0)).getUTCDate();
        date = iso(Date.UTC(toYear, toMonth, Math.min(anchor, last)));
      }
      if (date >= floor) return date;
    }
    throw new Error('no date');
  }

  function sweep(recurrences: readonly Recurrence[]) {
    // Every day around two year-ends and a leap February, against charges spread across them.
    const picks = [...days('2026-09-20', '2027-01-10', 1), ...days('2028-01-25', '2028-03-05', 1)];
    const charges = [
      ...days('2026-08-03', '2027-01-31', 9),
      ...days('2028-01-20', '2028-03-05', 5),
    ];
    let checked = 0;
    let hinted = 0;
    for (const recurrence of recurrences) {
      // A week has no day of the month to keep.
      for (const anchorDay of recurrence === 'weekly' ? [null] : [null, 29, 30, 31]) {
        for (const picked of picks) {
          for (const last of charges) {
            const after = cycleAfter(last, recurrence);
            const floor = after > picked ? after : picked;
            const expected = firstOnOrAfter(
              picked,
              recurrence,
              anchorDay ?? Number(picked.slice(8, 10)),
              floor,
            );
            const hint = effectiveNextDue({
              picked,
              recurrence,
              anchorDay,
              lastChargedOn: last,
              today: last,
            });
            if (hint.next !== expected || (hint.paidCycle !== null) !== picked < floor) {
              throw new Error(
                `${recurrence} ${anchorDay ?? '-'} ${picked} ${last}: got ${hint.next} ${hint.paidCycle?.start ?? '-'}, expected ${expected}`,
              );
            }
            checked += 1;
            if (hint.paidCycle) hinted += 1;
          }
        }
      }
    }
    return { checked, hinted };
  }

  it('matches for every picked day and charge across two year-ends, a leap February and four anchors', () => {
    const { checked, hinted } = sweep(['weekly', 'monthly', 'quarterly', 'yearly']);
    // Both branches are exercised many times over, not just the one.
    expect([checked, hinted]).toEqual([62_062, 40_229]);
  });

  whenPeriodsWalk('matches for a set period paid monthly', () => {
    const { checked, hinted } = sweep(['period']);
    expect(checked).toBe(19_096);
    expect(hinted).toBeGreaterThan(5_000);
  });
});
