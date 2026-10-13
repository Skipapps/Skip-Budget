import { buildBillValues } from '@/api/entry-values';
import type { ChargeRow } from '@/api/charges';
import { ledgerEntries, type BillRow } from '@/api/queries';
import { lastChargedBy, monthBounds, nextDueAfter, planMonth } from '@/lib/bill-month';
import type { Recurrence } from '@/lib/card-ledger';

/**
 * "Next" on the month page never lands inside a cycle already charged: the floor is the later of
 * the plan's start and the cycle after its newest charge, the rule the database keeps the stored
 * date by. A set period keeps its own start, so without the charge it would name a paid day.
 *
 * The rows are the bills/subs session's next-due table, as written there (picked, anchor day,
 * recurrence, newest charge | floor, next, paid cycle), every date worked out by hand.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const FLOOR_TABLE = `
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

type Row = {
  picked: string;
  anchorDay: number | null;
  recurrence: Recurrence;
  lastCharged: string | null;
  next: string;
};

const ROWS: Row[] = FLOOR_TABLE.split('\n')
  .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'))
  .map((line) => {
    const [inputs, outputs] = line.split('|');
    const [picked, day, recurrence, last] = inputs.trim().split(/\s+/);
    const [, next] = outputs.trim().split(/\s+/);
    return {
      picked,
      anchorDay: day === '-' ? null : Number(day),
      recurrence: recurrence as Recurrence,
      lastCharged: last === '-' ? null : last,
      next,
    };
  });

const label = (row: Row) =>
  `${row.picked} ${row.anchorDay ?? '-'} ${row.recurrence} ${row.lastCharged ?? '-'}`;

function dayBefore(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/** The start as Save writes it: the floor, or a set period's own first day. */
function savedStart(row: Row): string | null {
  const [year, month, day] = row.picked.split('-').map(Number);
  const built = buildBillValues(
    {
      name: 'Rent',
      amount: '1500',
      issuer: null,
      categoryId: 'housing',
      iconId: 'other',
      recurrence: row.recurrence,
      startDate: new Date(year, month - 1, day),
      endDate: null,
      sourceId: '',
      note: '',
    },
    { sources: [], lastChargedOn: row.lastCharged },
  );
  if (!built.ok) throw new Error(`Refused: ${label(row)}`);
  return built.values.starts_on ?? null;
}

/** A day the edit could be made on: after the newest charge and before the day picked. */
const editDay = (row: Row) => [row.lastCharged ?? '', dayBefore(row.picked)].sort()[1];

const shown = (row: Row, stored: string) =>
  nextDueAfter(
    {
      anchor: stored,
      recurrence: row.recurrence,
      anchorDay: row.anchorDay ?? Number(row.picked.slice(8, 10)),
      startsOn: savedStart(row),
      lastCharged: row.lastCharged,
    },
    editDay(row),
  );

describe('Next after a cycle already charged', () => {
  it('reads all 33 rows, 6 of them set periods', () => {
    expect([ROWS.length, ROWS.filter((row) => row.recurrence === 'period').length]).toEqual([
      33, 6,
    ]);
  });

  it('is the date the database stores, for every row', () => {
    for (const row of ROWS) {
      expect([label(row), shown(row, row.next)]).toEqual([label(row), row.next]);
    }
  });

  it('is the same from the picked date as stored before the floor ran', () => {
    for (const row of ROWS) {
      expect([label(row), shown(row, row.picked)]).toEqual([label(row), row.next]);
    }
  });

  it('would name the paid day for a set period moved later, without its newest charge', () => {
    const moved = ROWS.find((row) => row.recurrence === 'period' && row.picked === '2026-10-15')!;
    expect(
      nextDueAfter(
        { anchor: moved.next, recurrence: 'period', anchorDay: 15, startsOn: moved.picked },
        editDay(moved),
      ),
    ).toBe('2026-10-15');
  });
});

describe('the month page names it', () => {
  // Paid on 1 Oct, then moved to the 15th or the 31st; seen on 14 Oct in September, when it was
  // not due.
  const course = (day: string, stored: string, anchorDay: number): BillRow => ({
    id: `course-${day}`,
    name: `Course ${day}`,
    amount: 200,
    category_id: 'education',
    icon_id: null,
    recurrence: 'period',
    next_due_on: stored,
    starts_on: day,
    ends_on: '2027-06-30',
    anchor_day: anchorDay,
    card_id: null,
    bank_account_id: null,
    created_at: '2026-09-20T09:00:00Z',
  });
  const paid = (bill: BillRow): ChargeRow => ({
    id: `${bill.id}-2026-10-01`,
    bill_id: bill.id,
    subscription_id: null,
    label: bill.name,
    amount: 200,
    charged_on: '2026-10-01',
    card_id: null,
    bank_account_id: null,
  });

  it.each([
    { day: '2026-10-15', stored: '2026-11-15', anchorDay: 15, next: '2026-11-15' },
    { day: '2026-10-31', stored: '2026-11-30', anchorDay: 31, next: '2026-11-30' },
  ])('moved to $day: Next $next, as stored', ({ day, stored, anchorDay, next }) => {
    const bill = course(day, stored, anchorDay);
    const charges = [paid(bill)];
    const today = '2026-10-14';
    const month = planMonth({
      kind: 'bill',
      month: '2026-09',
      today,
      entries: ledgerEntries({
        receipts: [],
        subscriptions: [],
        bills: [bill],
        salaries: [],
        charges,
        pay: [],
        payoffs: [],
        accountOrder: [],
        from: monthBounds('2026-09').from,
        to: monthBounds('2026-09').to,
        today,
      }),
      bills: [bill],
      subscriptions: [],
      lastCharged: lastChargedBy(charges),
    });
    expect(month.rows.map((row) => row.status)).toEqual([
      { kind: 'next', date: next, inMonth: false },
    ]);
  });
});
