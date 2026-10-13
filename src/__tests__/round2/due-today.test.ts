import type { ChargeRow } from '@/api/charges';
import { bookFlows, ledgerEntries, type BillRow, type SubscriptionRow } from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { toCents } from '@/lib/money';
import { moneyBook } from '@/lib/money-book';
import { rangeFor, restOfMonth } from '@/lib/range';

/**
 * A bill or subscription due today, before and after a recorder writes its charge. The recorders
 * run on opening and every few minutes on the server, so between the person's midnight and the next
 * run the day's due is projected; once it is written, the charge stands for it. Every figure Home
 * shows, and the money book, must read the same either way: one row, the same total.
 *
 * Home's windows as home.tsx asks for them: the month for the tiles, the chosen day for Recent,
 * tomorrow to the month's end for Coming up. Expected figures worked out by hand, in cents.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const ACCOUNT = 'acct-everyday';
const CREATED = '2026-08-01T09:00:00Z';

const RENT: BillRow = {
  id: 'rent',
  name: 'Rent',
  amount: 1234.56,
  category_id: 'housing',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2027-01-31',
  starts_on: '2026-08-31',
  ends_on: null,
  anchor_day: 31,
  card_id: null,
  bank_account_id: ACCOUNT,
  created_at: CREATED,
};

const MUSIC: SubscriptionRow = {
  id: 'music',
  brand_id: null,
  name: 'Music',
  amount: 10.99,
  cycle: 'monthly',
  next_renewal_on: '2027-01-31',
  started_on: '2026-08-31',
  anchor_day: 31,
  created_at: CREATED,
  category_id: 'entertainment',
  card_id: null,
  bank_account_id: ACCOUNT,
  note: null,
  active: true,
  brands: null,
};

/** The 31st, clamped: what both have been charged, worked out by hand. */
const BEFORE_TODAY = ['2026-08-31', '2026-09-30', '2026-10-31', '2026-11-30', '2026-12-31'];

function charged(day: string): ChargeRow[] {
  return [
    {
      id: `rent-${day}`,
      bill_id: 'rent',
      subscription_id: null,
      label: 'Rent',
      amount: 1234.56,
      charged_on: day,
      card_id: null,
      bank_account_id: ACCOUNT,
    },
    {
      id: `music-${day}`,
      bill_id: null,
      subscription_id: 'music',
      label: 'Music',
      amount: 10.99,
      charged_on: day,
      card_id: null,
      bank_account_id: ACCOUNT,
    },
  ];
}

function ledger(charges: readonly ChargeRow[], from: string, to: string, today: string) {
  return ledgerEntries({
    receipts: [],
    subscriptions: [MUSIC],
    bills: [RENT],
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

/** Everything Home and the money book read on `today`, in cents and rows. */
function home(charges: readonly ChargeRow[], today: string) {
  const day = new Date(`${today}T00:00:00`);
  const month = rangeFor('month', day);
  const tiles = ledger(charges, month.from, month.to, today);
  const sum = (entries: readonly { amount: number }[]) =>
    entries.reduce((total, entry) => total + Math.abs(toCents(entry.amount)), 0);

  const recent = ledger(charges, today, today, today);
  const comingUp = restOfMonth(day);
  const upcoming = ledger(charges, comingUp.from, comingUp.to, today);

  const book = ledger(charges, historyFloor(true, day), today, today);
  const flows = bookFlows({ entries: book, subscriptions: [MUSIC], bills: [RENT], charges });
  const balances = moneyBook({
    today,
    sources: [
      { id: ACCOUNT, kind: 'account', name: 'Everyday', balance: 10000, asOf: '2026-08-01' },
    ],
    spending: flows.spending,
    payments: [],
    income: flows.income,
  });

  return {
    billsTile: sum(tiles.filter((entry) => entry.kind === 'bill')),
    subscriptionsTile: sum(tiles.filter((entry) => entry.kind === 'subscription')),
    recent: recent.map((entry) => `${entry.kind} ${entry.date} ${entry.amount}`).sort(),
    comingUp: upcoming.map((entry) => `${entry.kind} ${entry.date}`),
    account: toCents(balances.sources.get(ACCOUNT)!.balance),
    current: toCents(balances.current.balance),
  };
}

describe('a due today, before and after its charge is written', () => {
  const today = '2027-01-31';
  const before = BEFORE_TODAY.flatMap(charged);
  const after = [...before, ...charged(today)];

  // 10,000.00 less six of each: 6 × 1,234.56 = 7,407.36 and 6 × 10.99 = 65.94.
  const EXPECTED = {
    billsTile: 123456,
    subscriptionsTile: 1099,
    recent: ['bill 2027-01-31 -1234.56', 'subscription 2027-01-31 -10.99'],
    comingUp: [],
    account: 252670,
    current: 252670,
  };

  it('reads one row each and the same totals before the recorder has run', () => {
    expect(home(before, today)).toEqual(EXPECTED);
  });

  it('reads the same once the charges are written', () => {
    expect(home(after, today)).toEqual(EXPECTED);
  });

  it('lists the written charge in place of the projection, never both', () => {
    const ids = (charges: readonly ChargeRow[]) =>
      ledger(charges, today, today, today)
        .map((entry) => entry.id)
        .sort();
    expect(ids(before)).toEqual(['bill-rent@2027-01-31', 'subscription-music@2027-01-31']);
    expect(ids(after)).toEqual(['charge-music-2027-01-31', 'charge-rent-2027-01-31']);
  });

  it('still lists the day before as it was, and tomorrow as coming up', () => {
    const yesterday = home(before, '2027-01-30');
    expect(yesterday.recent).toEqual([]);
    expect(yesterday.comingUp).toEqual(['bill 2027-01-31', 'subscription 2027-01-31']);
    // The day before, the January charges are not out yet: 5 × each.
    expect(yesterday.account).toBe(1000000 - 5 * 123456 - 5 * 1099);
  });
});
