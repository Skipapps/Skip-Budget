import type { ChargeRow } from '@/api/charges';
import { bookFlows, ledgerEntries, type BillRow } from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { lastChargedBy, monthBounds, nextDueAfter, planMonth } from '@/lib/bill-month';
import {
  cycleStart,
  nextOccurrenceFrom,
  occurrencesInRange,
  planOccurrences,
} from '@/lib/card-ledger';
import { floorAfterCharges, unrecordedDates } from '@/lib/charges';
import { toCents } from '@/lib/money';
import { moneyBook } from '@/lib/money-book';

/**
 * A "specific period" bill repeats monthly on its anchor day from its start to its end, both
 * included: walked, recorded, rolled and projected like a monthly bill inside that window, and
 * charged once a month. Every expected date and figure was worked out by hand from the calendar.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const ACCOUNT = 'acct-everyday';
const days = (list: string) => list.split(' ');

function plus(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

function periodBill(fields: Partial<BillRow>): BillRow {
  return {
    id: 'course',
    name: 'Course',
    amount: 0,
    category_id: 'education',
    icon_id: null,
    recurrence: 'period',
    next_due_on: null,
    starts_on: null,
    ends_on: null,
    card_id: null,
    bank_account_id: ACCOUNT,
    created_at: '2026-01-01T09:00:00Z',
    ...fields,
  };
}

function chargesOn(bill: BillRow, dates: readonly string[]): ChargeRow[] {
  return dates.map((date) => ({
    id: `${bill.id}-${date}`,
    bill_id: bill.id,
    subscription_id: null,
    label: bill.name,
    amount: bill.amount,
    charged_on: date,
    card_id: null,
    bank_account_id: ACCOUNT,
  }));
}

function ledger(
  bill: BillRow,
  charges: readonly ChargeRow[],
  from: string,
  to: string,
  today: string,
) {
  return ledgerEntries({
    receipts: [],
    subscriptions: [],
    bills: [bill],
    salaries: [],
    charges,
    pay: [],
    payoffs: [],
    accountOrder: [ACCOUNT],
    from,
    to,
    today,
  });
}

const planOf = (bill: BillRow) => ({
  id: bill.id,
  recurrence: bill.recurrence,
  nextDate: bill.next_due_on,
  anchorDay: bill.anchor_day ?? null,
  startsOn: bill.starts_on,
  createdAt: bill.created_at,
  endsOn: bill.ends_on,
});

/** One sweep a day: write what is due, then roll the stored date on, as the app and server do. */
function sweep(bill: BillRow, from: string, to: string) {
  let stored = bill.next_due_on!;
  const written: string[] = [];
  for (let today = from; today <= to; today = plus(today, 1)) {
    const plan = planOf({ ...bill, next_due_on: stored });
    for (const date of unrecordedDates(plan, today, new Set(written))) {
      // Written on its own day, never late.
      expect([today, date]).toEqual([today, today]);
      written.push(date);
    }
    if (stored < today) stored = nextOccurrenceFrom(stored, 'period', today, bill.anchor_day);
  }
  return written;
}

const CASES = [
  {
    name: 'anchor 15, 2027',
    bill: periodBill({
      amount: 120,
      next_due_on: '2027-01-15',
      starts_on: '2027-01-15',
      ends_on: '2027-06-30',
      anchor_day: 15,
    }),
    expected: days('2027-01-15 2027-02-15 2027-03-15 2027-04-15 2027-05-15 2027-06-15'),
  },
  {
    name: 'anchor 31, 2027',
    bill: periodBill({
      amount: 120,
      next_due_on: '2027-01-31',
      starts_on: '2027-01-15',
      ends_on: '2027-06-30',
      anchor_day: 31,
    }),
    expected: days('2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30'),
  },
  {
    name: 'anchor 31, leap 2028',
    bill: periodBill({
      amount: 99.99,
      next_due_on: '2028-01-31',
      starts_on: '2028-01-15',
      ends_on: '2028-06-30',
      anchor_day: 31,
    }),
    expected: days('2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30'),
  },
];

describe('a set period repeats monthly from its start to its end', () => {
  it.each(CASES)('$name: walks to exactly its months', ({ bill, expected }) => {
    expect(
      occurrencesInRange(
        bill.next_due_on!,
        'period',
        bill.starts_on!,
        bill.ends_on!,
        bill.anchor_day,
      ).sort(),
    ).toEqual(expected);
  });

  it.each(CASES)(
    '$name: swept daily, records each on its day and none after its end',
    ({ bill, expected }) => {
      const year = bill.starts_on!.slice(0, 4);
      expect(sweep(bill, bill.starts_on!, `${year}-09-30`)).toEqual(expected);
    },
  );

  it.each(CASES)(
    '$name: projected before anything is written, the same months',
    ({ bill, expected }) => {
      const year = bill.starts_on!.slice(0, 4);
      const found = planOccurrences({
        plan: {
          ...planOf(bill),
          nextDate: bill.next_due_on!,
          label: bill.name,
          amount: bill.amount,
          kind: 'bill',
        },
        charges: [],
        isRecorded: false,
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        today: `${year}-12-31`,
      });
      expect(found.map((occurrence) => occurrence.date)).toEqual(expected);
    },
  );

  it('moves the money once a month, to the cent, and nothing after its end', () => {
    // 1,000.00 typed on 1 Jan 2028, less 6 × 99.99 = 599.94.
    const bill = CASES[2].bill;
    const written = chargesOn(bill, CASES[2].expected);
    const balanceOn = (today: string) => {
      const charges = written.filter((row) => row.charged_on <= today);
      const entries = ledger(
        bill,
        charges,
        historyFloor(true, new Date(`${today}T00:00:00`)),
        today,
        today,
      );
      const flows = bookFlows({ entries, subscriptions: [], bills: [bill], charges });
      const book = moneyBook({
        today,
        sources: [
          { id: ACCOUNT, kind: 'account', name: 'Everyday', balance: 1000, asOf: '2028-01-01' },
        ],
        spending: flows.spending,
        payments: [],
        income: flows.income,
      });
      return toCents(book.current.balance);
    };
    expect(balanceOn('2028-02-28')).toBe(100000 - 9999);
    expect(balanceOn('2028-02-29')).toBe(100000 - 2 * 9999);
    expect(balanceOn('2028-04-29')).toBe(100000 - 3 * 9999);
    expect(balanceOn('2028-04-30')).toBe(100000 - 4 * 9999);
    expect(balanceOn('2028-06-30')).toBe(40006);
    expect(balanceOn('2028-07-31')).toBe(40006);
  });
});

describe('a set period is charged once a month', () => {
  it('has the month as its cycle', () => {
    expect(cycleStart('2027-02-20', 'period')).toBe('2027-02-01');
    expect(floorAfterCharges(null, '2027-02-15', 'period')).toBe('2027-03-01');
    expect(floorAfterCharges('2027-01-15', '2027-02-15', 'period')).toBe('2027-03-01');
  });

  it('records nothing twice when its day moves inside a month already charged', () => {
    // Charged on the 15th of January and February, then moved to the 20th on 25 Feb. A set period
    // keeps its own start, so the walk reaches back into February.
    const moved = planOf(
      periodBill({
        next_due_on: '2027-02-20',
        starts_on: '2027-01-15',
        ends_on: '2027-06-30',
        anchor_day: 20,
      }),
    );
    const charged = new Set(['2027-01-15', '2027-02-15']);
    expect(unrecordedDates(moved, '2027-02-25', charged)).toEqual([]);
    expect(unrecordedDates(moved, '2027-03-20', charged)).toEqual(['2027-03-20']);
  });
});

describe('the live set-period bill', () => {
  // 500.00 from 5 Sep 2026 to 5 Feb 2027 on the 5th, charged once so far, on 5 Sep 2026.
  const live = (nextDueOn: string) =>
    periodBill({
      id: 'live-period',
      name: 'Instalments',
      amount: 500,
      next_due_on: nextDueOn,
      starts_on: '2026-09-05',
      ends_on: '2027-02-05',
      anchor_day: 5,
      created_at: '2026-09-01T09:00:00Z',
    });
  const today = '2026-10-13';

  // As stored now (never rolled), and as the roller will leave it.
  it.each(['2026-09-05', '2026-11-05'])(
    'stored %s: on 13 Oct, owes 5 Oct and is next due 5 Nov',
    (stored) => {
      const bill = live(stored);
      const once = chargesOn(bill, ['2026-09-05']);

      expect(unrecordedDates(planOf(bill), today, new Set(['2026-09-05']))).toEqual(['2026-10-05']);
      expect(nextOccurrenceFrom(stored, 'period', today, 5)).toBe('2026-11-05');
      expect(
        nextDueAfter(
          {
            anchor: stored,
            recurrence: 'period',
            anchorDay: 5,
            startsOn: bill.starts_on,
            createdAt: bill.created_at,
            endsOn: bill.ends_on,
          },
          today,
        ),
      ).toBe('2026-11-05');

      // The month page holds 5 Oct, paid, before it is written.
      const october = planMonth({
        kind: 'bill',
        month: '2026-10',
        today,
        entries: ledger(bill, once, monthBounds('2026-10').from, monthBounds('2026-10').to, today),
        bills: [bill],
        subscriptions: [],
        lastCharged: lastChargedBy(once),
      });
      expect(
        october.rows.flatMap((row) => row.occurrences.map((o) => `${o.date} ${o.paid}`)),
      ).toEqual(['2026-10-05 true']);
      expect(october.total).toBe(500);

      // What is still to come stops at its end.
      expect(
        ledger(bill, once, '2026-10-14', '2027-06-30', today)
          .map((entry) => entry.date)
          .sort(),
      ).toEqual(days('2026-11-05 2026-12-05 2027-01-05 2027-02-05'));
    },
  );

  it('once 5 Oct is written, owes nothing and counts it once', () => {
    const bill = live('2026-11-05');
    const both = chargesOn(bill, ['2026-09-05', '2026-10-05']);
    expect(unrecordedDates(planOf(bill), today, new Set(['2026-09-05', '2026-10-05']))).toEqual([]);
    const october = planMonth({
      kind: 'bill',
      month: '2026-10',
      today,
      entries: ledger(bill, both, monthBounds('2026-10').from, monthBounds('2026-10').to, today),
      bills: [bill],
      subscriptions: [],
      lastCharged: lastChargedBy(both),
    });
    expect(october.total).toBe(500);
    expect(october.rows.flatMap((row) => row.occurrences)).toHaveLength(1);
  });
});
