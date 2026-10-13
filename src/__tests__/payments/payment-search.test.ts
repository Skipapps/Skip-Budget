import type { ChargeRow } from '@/api/charges';
import {
  ledgerEntries,
  type BillRow,
  type LedgerPayoff,
  type SubscriptionRow,
} from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { toCents } from '@/lib/money';
import { paymentEntries, type PaymentEntry } from '@/lib/payment-entries';
import {
  NO_FILTERS,
  activeFilterCount,
  isSearching,
  matchesPayment,
  rangeBounds,
  searchGroups,
  searchPayments,
  type PaymentFilters,
} from '@/lib/payment-search';

/**
 * Payment search over the real ledger. The design's "netflix" search: 62 results across 2021 – 2026,
 * 2026 $159.90 · 10, 2025 $191.88 · 12, and "2024 – 2021 · 40 more". Matching takes the name a
 * payment went out under and the plan's name now. On free the counts and totals stay whole and the
 * rows stop at the 90-day floor, with the hidden matches counted for the HistoryNotice.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-12';
/** Jan 1 of this year − 6: what the payment pages read from. */
const PRO_FLOOR = '2020-01-01';
const FREE_FLOOR = historyFloor(false, new Date(`${TODAY}T00:00:00`));
const ACCOUNT = 'acct-1';
const CARD = 'card-1';
const CARD_2 = 'card-2';

/** yyyy-mm-dd on `day` of every month from `from` to `to` (yyyy-mm), oldest first. */
function monthly(from: string, to: string, day: string): string[] {
  const dates: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  while (`${year}-${String(month).padStart(2, '0')}` <= to) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${day}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return dates;
}

function subscription(id: string, fields: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id,
    brand_id: null,
    name: id,
    amount: 0,
    cycle: 'monthly',
    next_renewal_on: null,
    started_on: null,
    created_at: '2021-01-05T12:00:00Z',
    category_id: 'entertainment',
    card_id: null,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

function bill(id: string, fields: Partial<BillRow>): BillRow {
  return {
    id,
    name: id,
    amount: 0,
    category_id: 'housing',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: null,
    starts_on: null,
    ends_on: null,
    card_id: null,
    bank_account_id: null,
    created_at: '2021-01-05T12:00:00Z',
    ...fields,
  };
}

function charges(
  plan: { bill?: string; subscription?: string },
  dates: readonly string[],
  label: string,
  amount: number,
  source: { card?: string; account?: string } = {},
): ChargeRow[] {
  const owner = plan.bill ?? plan.subscription;
  return dates.map((on) => ({
    id: `${owner}-${on}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label,
    amount,
    charged_on: on,
    card_id: source.card ?? null,
    bank_account_id: source.account ?? null,
  }));
}

/** The design's Netflix: $15.99 on the 9th since Sep 2021, no card set. */
const NETFLIX = subscription('netflix', {
  name: 'Netflix',
  amount: 15.99,
  next_renewal_on: '2026-11-09',
  started_on: '2021-09-09',
  logo_domain: 'netflix.com',
});

/** Paid from the second card, which free locks for new spending. */
const SPOTIFY = subscription('spotify', {
  name: 'Spotify',
  amount: 10,
  next_renewal_on: '2026-11-09',
  started_on: '2025-01-09',
  card_id: CARD_2,
});

/** Renamed since: its charges went out as "Ashword Hill Apartments". */
const RENT = bill('rent', {
  name: 'Rent',
  amount: 1035,
  next_due_on: '2026-11-01',
  starts_on: '2026-01-01',
  bank_account_id: ACCOUNT,
});

const POWER = bill('power', {
  name: 'Électricité',
  amount: 82.4,
  category_id: 'utilities',
  next_due_on: '2026-11-05',
  starts_on: '2026-09-05',
  card_id: CARD,
});

const CAR = bill('car', {
  name: 'Car loan',
  amount: 554,
  category_id: 'loans',
  next_due_on: '2026-10-28',
  starts_on: '2026-09-28',
  card_id: CARD,
});

const PAYOFFS: LedgerPayoff[] = [
  {
    id: 'car-extra',
    bill_id: 'car',
    paid_on: '2026-10-02',
    amount: 1000,
    kind: 'partial',
    card_id: null,
    bank_account_id: ACCOUNT,
    counted: true,
  },
];

const BILLS = [RENT, POWER, CAR];
const SUBSCRIPTIONS = [NETFLIX, SPOTIFY];

const PAYMENTS: PaymentEntry[] = paymentEntries(
  ledgerEntries({
    receipts: [],
    subscriptions: SUBSCRIPTIONS,
    bills: BILLS,
    salaries: [],
    charges: [
      ...charges(
        { subscription: 'netflix' },
        monthly('2021-09', '2026-10', '09'),
        'Netflix',
        15.99,
      ),
      ...charges({ subscription: 'spotify' }, monthly('2025-01', '2026-10', '09'), 'Spotify', 10, {
        card: CARD_2,
      }),
      ...charges(
        { bill: 'rent' },
        monthly('2026-01', '2026-10', '01'),
        'Ashword Hill Apartments',
        1035,
        {
          account: ACCOUNT,
        },
      ),
      ...charges({ bill: 'power' }, ['2026-09-05', '2026-10-05'], 'Électricité', 82.4, {
        card: CARD,
      }),
      ...charges({ bill: 'car' }, ['2026-09-28'], 'Car loan', 554, { card: CARD }),
    ],
    pay: [],
    payoffs: PAYOFFS,
    accountOrder: [ACCOUNT],
    from: PRO_FLOOR,
    to: TODAY,
    today: TODAY,
  }),
  { bills: BILLS, subscriptions: SUBSCRIPTIONS },
  TODAY,
);

const search = (
  query: string,
  over: Partial<PaymentFilters> = {},
  kind: 'all' | 'bill' | 'subscription' = 'all',
) => searchPayments(PAYMENTS, { query, kind, filters: { ...NO_FILTERS, ...over }, today: TODAY });

const dates = (rows: readonly PaymentEntry[]) => rows.map((row) => row.date);
const names = (rows: readonly PaymentEntry[]) => [...new Set(rows.map((row) => row.name))];

describe('the design: "netflix"', () => {
  const matches = search('netflix');

  it('finds every Netflix payment and nothing else, newest first', () => {
    expect(FREE_FLOOR).toBe('2026-07-15');
    expect(matches).toHaveLength(62);
    expect(names(matches)).toEqual(['Netflix']);
    expect(matches[0].date).toBe('2026-10-09');
    expect(matches[61].date).toBe('2021-09-09');
    expect(dates(matches)).toEqual([...dates(matches)].sort().reverse());
  });

  it('on Pro: two years in full, the rest folded as "2024 – 2021 · 40 more"', () => {
    const view = searchGroups(matches, PRO_FLOOR, false);

    expect(view.count).toBe(62);
    expect(view.total).toBe(991.38);
    expect(view.span).toEqual({ first: 2021, last: 2026 });
    expect(view.groups.map((g) => [g.year, g.total, g.count, g.rows.length])).toEqual([
      [2026, 159.9, 10, 10],
      [2025, 191.88, 12, 12],
    ]);
    expect(view.groups[0].rows[0].date).toBe('2026-10-09');
    expect(view.groups[1].rows.at(-1)?.date).toBe('2025-01-09');
    expect(view.folded).toEqual({ newest: 2024, oldest: 2021, count: 40 });
    expect(view.hiddenOlder).toBe(false);
    expect(view.hiddenCount).toBe(0);
  });

  it('opens the folded years in place', () => {
    const view = searchGroups(matches, PRO_FLOOR, true);

    expect(view.groups.map((g) => [g.year, g.total, g.count])).toEqual([
      [2026, 159.9, 10],
      [2025, 191.88, 12],
      [2024, 191.88, 12],
      [2023, 191.88, 12],
      [2022, 191.88, 12],
      [2021, 63.96, 4],
    ]);
    expect(view.folded).toBeNull();
    const yearCents = view.groups.reduce((sum, g) => sum + toCents(g.total), 0);
    expect(yearCents).toBe(toCents(view.total));
    expect(view.groups.flatMap((g) => g.rows)).toEqual(matches);
  });

  it('on free: whole counts and totals, rows from the floor, the rest counted as hidden', () => {
    for (const expanded of [false, true]) {
      const view = searchGroups(matches, FREE_FLOOR, expanded);

      expect(view.count).toBe(62);
      expect(view.total).toBe(991.38);
      expect(view.span).toEqual({ first: 2021, last: 2026 });
      expect(view.groups.map((g) => [g.year, g.total, g.count])).toEqual([[2026, 159.9, 10]]);
      expect(dates(view.groups[0].rows)).toEqual(['2026-10-09', '2026-09-09', '2026-08-09']);
      expect(view.folded).toBeNull();
      expect(view.hiddenOlder).toBe(true);
      expect(view.hiddenCount).toBe(59);
    }
  });

  it('keeps to its tab', () => {
    expect(search('netflix', {}, 'subscription')).toHaveLength(62);
    expect(search('netflix', {}, 'bill')).toEqual([]);
  });
});

describe('searchGroups', () => {
  it('has nothing to group with no match', () => {
    expect(searchGroups([], PRO_FLOOR, false)).toEqual({
      count: 0,
      total: 0,
      span: null,
      groups: [],
      folded: null,
      hiddenOlder: false,
      hiddenCount: 0,
    });
  });

  it('draws every year in full when there are two or fewer', () => {
    const view = searchGroups(search('spotify'), PRO_FLOOR, false);
    expect(view.groups.map((g) => [g.year, g.total, g.count])).toEqual([
      [2026, 100, 10],
      [2025, 120, 12],
    ]);
    expect(view.folded).toBeNull();
  });

  it('folds a single older year as itself', () => {
    const rows = search('netflix').filter((row) => row.date >= '2024-01-01');
    expect(searchGroups(rows, PRO_FLOOR, false).folded).toEqual({
      newest: 2024,
      oldest: 2024,
      count: 12,
    });
  });

  it('orders rows newest first whatever order they arrive in', () => {
    const matches = search('netflix');
    const view = searchGroups([...matches].reverse(), PRO_FLOOR, true);
    expect(view.groups.flatMap((g) => g.rows)).toEqual(matches);
    expect(
      searchPayments([...PAYMENTS].reverse(), {
        query: 'netflix',
        kind: 'all',
        filters: NO_FILTERS,
        today: TODAY,
      }),
    ).toEqual(matches);
  });

  it('lists a payment made on the floor day itself', () => {
    const view = searchGroups(search('netflix'), '2026-08-09', false);
    expect(dates(view.groups[0].rows)).toEqual(['2026-10-09', '2026-09-09', '2026-08-09']);
    expect(view.hiddenCount).toBe(59);
  });

  it('folds only the rows it can list, and leaves out a year with none', () => {
    const view = searchGroups(search('netflix'), '2022-06-15', false);
    expect(view.count).toBe(62);
    expect(view.span).toEqual({ first: 2021, last: 2026 });
    expect(view.folded).toEqual({ newest: 2024, oldest: 2022, count: 12 + 12 + 6 });
    expect(view.hiddenCount).toBe(4 + 6);

    const open = searchGroups(search('netflix'), '2022-06-15', true);
    expect(open.groups.map((g) => [g.year, g.count, g.rows.length])).toEqual([
      [2026, 10, 10],
      [2025, 12, 12],
      [2024, 12, 12],
      [2023, 12, 12],
      [2022, 12, 6],
    ]);
  });

  it('sums mixed amounts to the cent', () => {
    const matches = search('', { range: 'thisMonth' });
    expect(matches.map((row) => [row.date, row.name, row.amount])).toEqual([
      ['2026-10-09', 'Netflix', 15.99],
      ['2026-10-09', 'Spotify', 10],
      ['2026-10-05', 'Électricité', 82.4],
      ['2026-10-02', 'Car loan', 1000],
      ['2026-10-01', 'Ashword Hill Apartments', 1035],
    ]);
    expect(searchGroups(matches, FREE_FLOOR, false).total).toBe(2143.39);
  });
});

describe('matching', () => {
  it.each(['NETFLIX', '  netflix ', 'Netflix', 'netflx', 'netlfix', 'net', 'flix'])(
    'finds Netflix by %j',
    (query) => {
      expect(names(search(query))).toEqual(['Netflix']);
    },
  );

  it('allows no typo in a short word', () => {
    expect(search('nef')).toEqual([]);
  });

  it('finds a renamed plan by either name, shown as it went out', () => {
    for (const query of ['rent', 'ashword hill']) {
      const found = search(query);
      expect(found).toHaveLength(10);
      expect(names(found)).toEqual(['Ashword Hill Apartments']);
    }
  });

  it('ignores accents', () => {
    expect(names(search('electricite'))).toEqual(['Électricité']);
  });

  it('finds a loan payoff by its loan', () => {
    expect(search('car loan').map((row) => [row.date, row.status])).toEqual([
      ['2026-10-02', 'extraPayment'],
      ['2026-09-28', 'paid'],
    ]);
  });

  it('matchesPayment reads the plan name only when there is one', () => {
    expect(matchesPayment({ name: 'Ashword Hill', planName: 'Rent' }, 'rent')).toBe(true);
    expect(matchesPayment({ name: 'Ashword Hill', planName: null }, 'rent')).toBe(false);
    expect(matchesPayment({ name: 'Rent', planName: null }, 'rent')).toBe(true);
    expect(matchesPayment({ name: 'Rent', planName: null }, '')).toBe(true);
  });
});

describe('filters', () => {
  it('narrow by date range, both ends included', () => {
    expect(dates(search('netflix', { range: 'thisMonth' }))).toEqual(['2026-10-09']);
    expect(dates(search('netflix', { range: 'last3Months' }))).toEqual([
      '2026-10-09',
      '2026-09-09',
      '2026-08-09',
    ]);
    expect(search('netflix', { range: 'thisYear' })).toHaveLength(10);
    expect(search('netflix', { range: 'lastYear' })).toHaveLength(12);
    expect(dates(search('netflix', { range: { from: '2024-03-09', to: '2024-05-09' } }))).toEqual([
      '2024-05-09',
      '2024-04-09',
      '2024-03-09',
    ]);
    expect(search('netflix', { range: { from: '2024-05-10', to: '2024-03-08' } })).toEqual([]);
  });

  it('narrow by amount in cents, both ends included', () => {
    expect(names(search('', { minCents: 1599, maxCents: 1599 }))).toEqual(['Netflix']);
    expect(names(search('', { minCents: 1600, maxCents: 8240 }))).toEqual(['Électricité']);
    expect(names(search('', { minCents: 8241, maxCents: 200_000 }))).toEqual([
      'Car loan',
      'Ashword Hill Apartments',
    ]);
    expect(names(search('', { maxCents: 1000 }))).toEqual(['Spotify']);
    expect(search('', { minCents: 1600, maxCents: 1599 })).toEqual([]);
  });

  it('narrow by where it was paid from: a locked card, an account, or none set', () => {
    expect(names(search('', { source: CARD_2 }))).toEqual(['Spotify']);
    expect(names(search('', { source: '' }))).toEqual(['Netflix']);
    expect(names(search('', { source: ACCOUNT }))).toEqual(['Car loan', 'Ashword Hill Apartments']);
    expect(search('', { source: null })).toHaveLength(PAYMENTS.length);
  });

  it('combine with the query and the tab', () => {
    expect(
      dates(search('netflix', { range: 'lastYear', source: '', minCents: 1599 }, 'subscription')),
    ).toHaveLength(12);
    expect(search('netflix', { source: CARD_2 })).toEqual([]);
    expect(names(search('', { range: 'thisMonth' }, 'bill'))).toEqual([
      'Électricité',
      'Car loan',
      'Ashword Hill Apartments',
    ]);
  });

  it('count the rows that narrow the search', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, range: 'lastYear' })).toBe(1);
    expect(activeFilterCount({ ...NO_FILTERS, minCents: 0 })).toBe(1);
    expect(activeFilterCount({ ...NO_FILTERS, maxCents: 500 })).toBe(1);
    expect(activeFilterCount({ ...NO_FILTERS, minCents: 100, maxCents: 500 })).toBe(1);
    expect(activeFilterCount({ ...NO_FILTERS, source: '' })).toBe(1);
    expect(
      activeFilterCount({
        range: { from: '2026-01-01', to: '2026-02-01' },
        minCents: 1,
        maxCents: null,
        source: CARD,
      }),
    ).toBe(3);
  });

  it('show results for a query or a filter, never for neither', () => {
    expect(isSearching('', NO_FILTERS)).toBe(false);
    expect(isSearching('   ', NO_FILTERS)).toBe(false);
    expect(isSearching('n', NO_FILTERS)).toBe(true);
    expect(isSearching('', { ...NO_FILTERS, source: '' })).toBe(true);
    expect(isSearching(' ', { ...NO_FILTERS, range: 'thisMonth' })).toBe(true);
  });

  it('start from a shared no-filters value nobody can change', () => {
    expect(Object.isFrozen(NO_FILTERS)).toBe(true);
    expect(NO_FILTERS).toEqual({ range: 'any', minCents: null, maxCents: null, source: null });
  });
});

describe('rangeBounds', () => {
  it.each([
    ['any', TODAY, null, null],
    ['thisMonth', TODAY, '2026-10-01', TODAY],
    ['last3Months', TODAY, '2026-08-01', TODAY],
    ['thisYear', TODAY, '2026-01-01', TODAY],
    ['lastYear', TODAY, '2025-01-01', '2025-12-31'],
    ['last3Months', '2026-01-15', '2025-11-01', '2026-01-15'],
    ['last3Months', '2026-02-28', '2025-12-01', '2026-02-28'],
    ['last3Months', '2026-03-31', '2026-01-01', '2026-03-31'],
    ['thisMonth', '2027-01-01', '2027-01-01', '2027-01-01'],
    ['lastYear', '2027-01-01', '2026-01-01', '2026-12-31'],
  ] as const)('%s on %s', (range, today, from, to) => {
    expect(rangeBounds(range, today)).toEqual({ from, to });
  });

  it('takes picked days as they are, and a day that is not one as open', () => {
    expect(rangeBounds({ from: '2024-03-01', to: '2024-05-31' }, TODAY)).toEqual({
      from: '2024-03-01',
      to: '2024-05-31',
    });
    expect(rangeBounds({ from: '2024-13-01', to: 'soon' }, TODAY)).toEqual({
      from: null,
      to: null,
    });
    expect(rangeBounds({ from: '2024-02-30x', to: '2024-00-10' }, TODAY)).toEqual({
      from: null,
      to: null,
    });
  });
});
