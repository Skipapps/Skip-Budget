import type { ChargeRow } from '@/api/charges';
import { bookFlows, ledgerEntries, type BillRow, type LedgerInput } from '@/api/queries';
import { unwrittenDatesIn } from '@/api/savings';

/**
 * A bill kept out of spending ("Add to monthly bills" off on a loan) in the ledger, the money book
 * and the month close. Off: nothing new is projected; what was recorded while it counted stays
 * counted, exactly once. Its own page can still ask for its payments.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-12';

function bill(id: string, fields: Partial<BillRow>): BillRow {
  return {
    id,
    name: id,
    amount: 100,
    category_id: 'loans',
    icon_id: 'loan-car',
    recurrence: 'monthly',
    next_due_on: null,
    starts_on: null,
    ends_on: null,
    card_id: 'card-1',
    bank_account_id: null,
    created_at: '2026-07-01T12:00:00Z',
    ...fields,
  };
}

function charge(billId: string, on: string, amount = 100): ChargeRow {
  return {
    id: `${billId}-${on}`,
    bill_id: billId,
    subscription_id: null,
    label: billId,
    amount,
    charged_on: on,
    card_id: 'card-1',
    bank_account_id: null,
  };
}

const RENT = bill('rent', {
  category_id: 'housing',
  icon_id: null,
  amount: 1500,
  next_due_on: '2026-11-01',
  starts_on: '2026-07-01',
});
/** Added today with the switch off, a payment due later this month. */
const KEPT_OUT = bill('kept-out', {
  amount: 424.8,
  next_due_on: '2026-10-27',
  starts_on: '2026-10-12',
  ends_on: '2028-12-27',
  in_spending: false,
});
/** Counted July and August, switched off before September's payment. */
const SWITCHED_OFF = bill('switched-off', {
  amount: 250,
  next_due_on: '2026-10-15',
  starts_on: '2026-07-15',
  in_spending: false,
});
/** Off from the start, and never recorded: the ledger would otherwise work out its past too. */
const NEVER_RECORDED = bill('never-recorded', {
  amount: 75,
  next_due_on: '2026-10-05',
  starts_on: '2026-08-05',
  in_spending: false,
});

const CHARGES = [
  charge('rent', '2026-07-01', 1500),
  charge('rent', '2026-08-01', 1500),
  charge('rent', '2026-09-01', 1500),
  charge('rent', '2026-10-01', 1500),
  charge('switched-off', '2026-07-15', 250),
  charge('switched-off', '2026-08-15', 250),
];

function input(overrides: Partial<LedgerInput> = {}): LedgerInput {
  return {
    receipts: [],
    subscriptions: [],
    bills: [RENT, KEPT_OUT, SWITCHED_OFF, NEVER_RECORDED],
    salaries: [],
    charges: CHARGES,
    pay: [],
    accountOrder: [],
    from: '2026-07-01',
    to: '2026-12-31',
    today: TODAY,
    ...overrides,
  };
}

const datesOf = (entries: ReturnType<typeof ledgerEntries>, planId: string) =>
  entries
    .filter((entry) => entry.planId === planId)
    .map((entry) => entry.date)
    .sort();

describe('ledgerEntries with a bill kept out of spending', () => {
  const entries = ledgerEntries(input());

  it('projects nothing for it, past or future', () => {
    expect(datesOf(entries, 'kept-out')).toEqual([]);
    expect(datesOf(entries, 'never-recorded')).toEqual([]);
  });

  it('keeps what it recorded while it counted, and nothing after', () => {
    expect(datesOf(entries, 'switched-off')).toEqual(['2026-07-15', '2026-08-15']);
    expect(
      entries
        .filter((entry) => entry.planId === 'switched-off')
        .every((e) => e.id.startsWith('charge-')),
    ).toBe(true);
  });

  it('leaves every other bill as it was', () => {
    expect(datesOf(entries, 'rent')).toEqual([
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
      '2026-12-01',
    ]);
    expect(ledgerEntries(input({ bills: [RENT] }))).toEqual(
      entries.filter((entry) => entry.planId === 'rent'),
    );
  });

  it('counts a row read before the column existed', () => {
    const { in_spending: _gone, ...unflagged } = KEPT_OUT;
    expect(datesOf(ledgerEntries(input({ bills: [unflagged] })), 'kept-out')).toEqual([
      '2026-10-27',
      '2026-11-27',
      '2026-12-27',
    ]);
  });

  it("lists its payments for its own page when asked ('show')", () => {
    const shown = ledgerEntries(input({ uncounted: 'show' }));
    expect(datesOf(shown, 'kept-out')).toEqual(['2026-10-27', '2026-11-27', '2026-12-27']);
    // On the record, the gaps stay gaps: September was never written down.
    expect(datesOf(shown, 'switched-off')).toEqual([
      '2026-07-15',
      '2026-08-15',
      '2026-10-15',
      '2026-11-15',
      '2026-12-15',
    ]);
    expect(datesOf(shown, 'never-recorded')).toEqual([
      '2026-08-05',
      '2026-09-05',
      '2026-10-05',
      '2026-11-05',
      '2026-12-05',
    ]);
  });
});

describe('bookFlows with a bill kept out of spending', () => {
  const book = (bills: readonly BillRow[]) =>
    bookFlows({
      entries: ledgerEntries(input({ from: '0000-01-01', to: TODAY })),
      subscriptions: [],
      bills,
      charges: CHARGES,
    });

  it('spends what it recorded exactly once, and nothing it did not', () => {
    const { spending } = book([RENT, KEPT_OUT, SWITCHED_OFF, NEVER_RECORDED]);
    const of = (id: string) => spending.filter((entry) => entry.id.startsWith(`charge-${id}`));

    expect(of('switched-off').map((entry) => entry.date)).toEqual(['2026-08-15', '2026-07-15']);
    expect(new Set(spending.map((entry) => entry.id)).size).toBe(spending.length);
    expect(spending.reduce((sum, entry) => sum + entry.amount, 0)).toBe(-(4 * 1500 + 2 * 250));
  });

  it('a stopped bill kept out still counts what it was charged, once', () => {
    const stopped = { ...SWITCHED_OFF, next_due_on: null };
    const { spending } = bookFlows({
      entries: ledgerEntries(input({ bills: [RENT, stopped], from: '0000-01-01', to: TODAY })),
      subscriptions: [],
      bills: [RENT, stopped],
      charges: CHARGES,
    });
    expect(spending.filter((entry) => entry.id.startsWith('charge-switched-off'))).toHaveLength(2);
  });
});

describe('unwrittenDatesIn with a bill kept out of spending', () => {
  const september = { from: '2026-09-01', to: '2026-09-30', today: TODAY };

  it('does not hold a month open for a date it will never record', () => {
    expect(
      unwrittenDatesIn({
        bills: [RENT, SWITCHED_OFF],
        subscriptions: [],
        charges: CHARGES,
        ...september,
      }),
    ).toBe(false);
  });

  it('still waits for the same date on a bill that counts', () => {
    expect(
      unwrittenDatesIn({
        bills: [RENT, { ...SWITCHED_OFF, in_spending: true }],
        subscriptions: [],
        charges: CHARGES,
        ...september,
      }),
    ).toBe(true);
  });
});
