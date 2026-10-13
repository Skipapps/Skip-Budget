import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { useSyncExternalStore, type Context, type ReactElement } from 'react';
import { AccessibilityInfo, Dimensions, Text, View } from 'react-native';

import PaymentFilterScreen from '@/app/payment-filter';
import PaymentSearchScreen from '@/app/payment-search';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { onPaymentPicked, pickPayment } from '@/lib/payment-pick';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';
import { contrast } from '@/lib/tone';
import { ThemeProvider } from '@/providers/theme-provider';
import { buildTokens, type Scheme } from '@/theme/palette';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The search page and its three filter pages, walked as a person walks them: the real routes
 * (`payment-search`, `payment-filter`) over the real `usePayments` and ledger, a stack that keeps
 * every page mounted under the one on top, and fakes only for the database, the phone's storage and
 * the router's bookkeeping. A choice made on a filter page comes back to the search that opened it
 * and no other; the results are read against a bank statement written in whole cents.
 */

// A loaded machine can be slow to settle a page; a wait that is really stuck still fails.
configure({ asyncUtilTimeout: 3000 });
// Some walks open four pages in turn; a machine under load needs more than Jest's five seconds.
jest.setTimeout(20000);

jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    {
      get:
        (_target, name) =>
        ({ color }: { color?: string }) =>
          createElement(View, { testID: `icon-${String(name)}`, iconColor: color }),
    },
  );
});
// A stack of pages, as expo-router's native stack keeps them: every page stays mounted under the
// one on top, hidden from VoiceOver, and a page is told its own params.
jest.mock('expo-router', () => {
  const { createContext, useContext, useEffect } = jest.requireActual('react');
  const ParamsContext = createContext({});
  return {
    __ParamsContext: ParamsContext,
    router: {
      push: jest.fn((href: unknown) => mockNav.push(href)),
      back: jest.fn(() => mockNav.back()),
      replace: jest.fn((href: unknown) => mockNav.replace(href)),
      canGoBack: () => mockNav.stack.length > 1,
    },
    useLocalSearchParams: () => useContext(ParamsContext),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('@/theme/artwork', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useArtwork: () =>
      new Proxy(
        {},
        { get: (_target, name) => () => createElement(View, { testID: `art-${String(name)}` }) },
      ),
  };
});
// Reanimated's shimmer does not run under Jest; the page only needs to know a skeleton is drawn.
jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: () => createElement(View, { testID: 'skeleton' }),
    SkeletonList: () => createElement(View, { testID: 'skeleton-list' }),
  };
});
jest.mock('@/components/bills/bill-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BillMark: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'bill-mark', mark: props }),
  };
});
jest.mock('@/components/brands/brand-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BrandMark: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'brand-mark', mark: props }),
  };
});
// RevenueCat's bundle does not load under Jest; the real usePro() reads this same store.
jest.mock('@/api/pro', () => ({
  usePro: () => jest.requireActual('@/lib/pro-status').useProStatus(),
}));

let mockToday = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));
let mockUserId: string | null = 'user-1';
jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));

// The phone's storage: the recent searches and the theme's choice live in it.
const mockStore = new Map<string, string>();
const mockStorage = { refuseRead: false, refuseWrite: false };
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      if (mockStorage.refuseRead) throw new Error('storage refused');
      return mockStore.get(key) ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      if (mockStorage.refuseWrite) throw new Error('storage refused');
      mockStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
  },
}));

// The database, table by table. A fresh copy of the rows on every read, as the network gives.
const mockDatabase: Record<string, unknown[]> = {};
const mockReads: string[] = [];
const mockFailing = new Set<string>();
const mockHeld: (() => void)[] = [];
let mockHold = false;
jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      then: (resolve: (value: unknown) => unknown) => {
        const answer = () => {
          mockReads.push(table);
          if (mockFailing.has(table)) {
            return resolve({ data: null, error: { code: '08006', message: 'offline' } });
          }
          return resolve({
            data: JSON.parse(JSON.stringify(mockDatabase[table] ?? [])),
            error: null,
          });
        };
        if (mockHold) mockHeld.push(answer);
        else answer();
      },
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

// ---------------------------------------------------------------------------------------------
// The statement: what the bank says went out, in whole cents. Never derived from the app's code.

const VISA = 'card-visa';
const DISCOVER = 'card-discover';
const CHASE = 'acct-chase';
const ALLY = 'acct-ally';

type Plan = {
  id: string;
  kind: 'bill' | 'subscription';
  name: string;
  day: number;
  from: string;
  /** Last day it was charged; open for a plan still running. */
  to?: string;
  cents: (date: string) => number;
  /** What each charge was recorded under, when that was not the plan's name now. */
  label?: (date: string) => string;
  source: string;
  category?: string;
  icon?: string;
  domain?: string;
};

const winter = (date: string) => ['12', '01', '02'].includes(date.slice(5, 7));
const summer = (date: string) => ['06', '07', '08'].includes(date.slice(5, 7));

const PLANS: Plan[] = [
  {
    id: 'netflix',
    kind: 'subscription',
    name: 'Netflix',
    day: 9,
    from: '2021-09-09',
    cents: (date) =>
      date < '2023-01-01' ? 1399 : date < '2024-01-01' ? 1499 : date < '2025-01-01' ? 1549 : 1599,
    source: '',
    domain: 'netflix.com',
  },
  {
    id: 'spotify',
    kind: 'subscription',
    name: 'Spotify',
    day: 12,
    from: '2024-03-12',
    cents: (date) => (date < '2025-07-01' ? 1099 : 1199),
    source: DISCOVER,
    domain: 'spotify.com',
  },
  {
    id: 'hulu',
    kind: 'subscription',
    name: 'Hulu',
    day: 14,
    from: '2022-01-14',
    to: '2024-06-14',
    cents: () => 799,
    source: VISA,
    domain: 'hulu.com',
  },
  {
    id: 'aep',
    kind: 'bill',
    name: 'AEP',
    day: 22,
    from: '2023-01-22',
    cents: (date) => (winter(date) ? 16840 : summer(date) ? 14217 : 9655),
    source: CHASE,
    category: 'energy',
  },
  {
    id: 'rent',
    kind: 'bill',
    name: 'Rent',
    day: 1,
    from: '2021-03-01',
    cents: (date) => (date < '2025-01-01' ? 98500 : 103500),
    source: CHASE,
    category: 'housing',
  },
  {
    id: 'car',
    kind: 'bill',
    name: 'Car loan',
    day: 28,
    from: '2024-04-28',
    cents: () => 55400,
    source: VISA,
    category: 'loans',
    icon: 'loan-car',
  },
  // Charged as "Fios" until it was renamed.
  {
    id: 'internet',
    kind: 'bill',
    name: 'Internet',
    day: 18,
    from: '2023-01-18',
    cents: (date) => (date < '2025-01-01' ? 7999 : 8499),
    label: (date) => (date < '2025-01-01' ? 'Fios' : 'Internet'),
    source: CHASE,
    category: 'internet',
  },
  {
    id: 'nationwide',
    kind: 'bill',
    name: 'Nationwide',
    day: 3,
    from: '2025-02-03',
    cents: () => 14500,
    source: '',
    category: 'insurance',
  },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** The `day`th of every month from `from` to `to`, both ends included. */
function monthly(from: string, day: number, to: string): string[] {
  const dates: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  for (;;) {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    if (date > to) return dates;
    if (date >= from) dates.push(date);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

const nextAfter = (day: number, today: string): string => {
  const [first] = monthly(today, day, `${Number(today.slice(0, 4)) + 1}-12-31`).filter(
    (date) => date > today,
  );
  return first;
};

type Paid = {
  /** The ledger's id for it, which is also the row's test id after `payment-`. */
  id: string;
  date: string;
  name: string;
  cents: number;
  kind: 'bill' | 'subscription';
  status: 'paid' | 'extraPayment';
  source: string;
  plan: string;
  route: { pathname: string; id: string };
};

/** A $1,000 extra payment on the car loan, from the Chase account. */
const PAYOFF = { id: 'car-extra', date: '2025-09-10', cents: 100000 };

/** Every payment up to `today`, newest first. */
function statement(today: string): Paid[] {
  const paid: Paid[] = [];
  for (const plan of PLANS) {
    for (const date of monthly(plan.from, plan.day, plan.to ?? today)) {
      paid.push({
        id: `charge-${plan.id}-${date}`,
        date,
        name: plan.label?.(date) ?? plan.name,
        cents: plan.cents(date),
        kind: plan.kind,
        status: 'paid',
        source: plan.source,
        plan: plan.id,
        route: {
          pathname:
            plan.kind === 'subscription'
              ? '/subscription/[id]'
              : plan.category === 'loans'
                ? '/loan/[id]'
                : '/bill/[id]',
          id: plan.id,
        },
      });
    }
  }
  if (PAYOFF.date <= today) {
    paid.push({
      id: `payoff-${PAYOFF.id}`,
      date: PAYOFF.date,
      name: 'Car loan',
      cents: PAYOFF.cents,
      kind: 'bill',
      status: 'extraPayment',
      source: CHASE,
      plan: 'car',
      route: { pathname: '/loan/[id]', id: 'car' },
    });
  }
  return paid.sort((a, b) =>
    a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? 1 : -1,
  );
}

/** The database as it would hold that account on `today`. */
function load(today: string) {
  const row = (plan: Plan) => ({
    id: plan.id,
    name: plan.name,
    amount: plan.cents(today) / 100,
    created_at: '2019-06-01T12:00:00Z',
    card_id: plan.source.startsWith('card') ? plan.source : null,
    bank_account_id: plan.source.startsWith('acct') ? plan.source : null,
    brand_id: null,
    brands: plan.domain ? { domain: plan.domain } : null,
  });
  mockDatabase.cards = [
    { id: VISA, holder: 'Sam', network: 'Visa', last4: '4421', color: '#111111', balance: 0 },
    { id: DISCOVER, holder: '', network: 'Discover', last4: '6334', color: '#222222', balance: 0 },
  ];
  mockDatabase.bank_accounts = [
    {
      id: CHASE,
      bank_name: 'Chase',
      nickname: 'Komal',
      account_type: 'checking',
      last4: '7010',
      color: '#333333',
      balance: 0,
    },
    {
      id: ALLY,
      bank_name: 'Ally',
      nickname: null,
      account_type: 'savings',
      last4: null,
      color: '#444444',
      balance: 0,
    },
  ];
  mockDatabase.subscriptions = PLANS.filter((plan) => plan.kind === 'subscription').map((plan) => ({
    ...row(plan),
    cycle: 'monthly',
    next_renewal_on: plan.to ? null : nextAfter(plan.day, today),
    started_on: plan.from,
    category_id: 'entertainment',
    note: null,
    active: !plan.to,
  }));
  mockDatabase.bills = PLANS.filter((plan) => plan.kind === 'bill').map((plan) => ({
    ...row(plan),
    category_id: plan.category ?? 'other',
    icon_id: plan.icon ?? null,
    recurrence: 'monthly',
    next_due_on: nextAfter(plan.day, today),
    starts_on: plan.from,
    ends_on: null,
  }));
  mockDatabase.charges = statement(today)
    .filter((paid) => paid.status === 'paid')
    .map((paid) => {
      const plan = PLANS.find((candidate) => candidate.id === paid.plan)!;
      return {
        id: `${paid.plan}-${paid.date}`,
        bill_id: plan.kind === 'bill' ? plan.id : null,
        subscription_id: plan.kind === 'subscription' ? plan.id : null,
        label: paid.name,
        amount: paid.cents / 100,
        charged_on: paid.date,
        card_id: paid.source.startsWith('card') ? paid.source : null,
        bank_account_id: paid.source.startsWith('acct') ? paid.source : null,
      };
    });
  mockDatabase.loan_payoffs = [
    {
      id: PAYOFF.id,
      bill_id: 'car',
      paid_on: PAYOFF.date,
      amount: PAYOFF.cents / 100,
      kind: 'partial',
      card_id: null,
      bank_account_id: CHASE,
      counted: true,
      created_at: `${PAYOFF.date}T12:00:00Z`,
      card: null,
      account: null,
    },
  ];
}

/** "$1,035.00" from whole cents. */
const usd = (cents: number) =>
  `$${String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${pad(cents % 100)}`;

const sum = (rows: readonly { cents: number }[]) =>
  rows.reduce((total, row) => total + row.cents, 0);

// ---------------------------------------------------------------------------------------------
// The stack.

type Entry = { key: number; pathname: string; params: Record<string, string> };

function entryOf(href: unknown, key: number): Entry {
  const given = typeof href === 'string' ? { pathname: href, params: {} } : (href as Entry);
  return {
    key,
    pathname: given.pathname,
    params: Object.fromEntries(
      Object.entries(given.params ?? {}).map(([name, value]) => [name, String(value)]),
    ),
  };
}

const mockNav = {
  stack: [] as Entry[],
  next: 1,
  listeners: new Set<() => void>(),
  set(stack: Entry[]) {
    this.stack = stack;
    this.listeners.forEach((listener) => listener());
  },
  push(href: unknown) {
    this.set([...this.stack, entryOf(href, this.next++)]);
  },
  back() {
    this.set(this.stack.slice(0, -1));
  },
  replace(href: unknown) {
    this.set([...this.stack.slice(0, -1), entryOf(href, this.next++)]);
  },
  reset(pages: unknown[]) {
    this.next = 1;
    this.stack = pages.map((page) => entryOf(page, this.next++));
    this.listeners.clear();
  },
  subscribe: (listener: () => void) => {
    mockNav.listeners.add(listener);
    return () => {
      mockNav.listeners.delete(listener);
    };
  },
};

const ParamsContext = (
  jest.requireMock('expo-router') as { __ParamsContext: Context<Record<string, string>> }
).__ParamsContext;

function Host() {
  const stack = useSyncExternalStore(mockNav.subscribe, () => mockNav.stack);
  return (
    <>
      {stack.map((entry, index) => {
        const covered = index < stack.length - 1;
        return (
          <View
            key={entry.key}
            testID={`page-${entry.key}`}
            accessibilityElementsHidden={covered}
            importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
          >
            <ParamsContext.Provider value={entry.params}>
              {entry.pathname === '/payment-search' ? (
                <PaymentSearchScreen />
              ) : entry.pathname === '/payment-filter' ? (
                <PaymentFilterScreen />
              ) : (
                <Text testID="stub">{`${entry.pathname} ${JSON.stringify(entry.params)}`}</Text>
              )}
            </ParamsContext.Provider>
          </View>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Mounting and reading.

let client: QueryClient;

function app(node: ReactElement) {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{node}</ThemeProvider>
    </QueryClientProvider>
  );
}

/** Every table read and no read still on its way. */
const loaded = () =>
  waitFor(() => {
    expect(new Set(mockReads).size).toBe(6);
    expect(client.isFetching()).toBe(0);
  });

const search = (params: Record<string, string> = {}) => ({
  pathname: '/payment-search',
  params,
});
const filter = (params: Record<string, string>) => ({ pathname: '/payment-filter', params });

/** The pages open, bottom to top, once the account has been read. */
async function openStack(...pages: unknown[]) {
  mockNav.reset(pages);
  const view = await render(app(<Host />));
  if (pages.some((page) => entryOf(page, 0).pathname === '/payment-search')) await loaded();
  return view;
}

const hidden = { includeHiddenElements: true };
const top = () => mockNav.stack[mockNav.stack.length - 1];
const paths = () => mockNav.stack.map((entry) => entry.pathname);
const pageAt = (index: number) => screen.getByTestId(`page-${mockNav.stack[index].key}`, hidden);

const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');
const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');
const labelOf = (node: { props: Record<string, unknown> }) => String(node.props.accessibilityLabel);

const type = (text: string) => fireEvent.changeText(screen.getByTestId('search-input'), text);
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const radio = (name: string | RegExp) => screen.getByRole('radio', { name });
const inputs = () => screen.getAllByDisplayValue(/.*/);

const rowIds = () =>
  screen
    .queryAllByTestId(/^payment-/)
    .map((node) => String(node.props.testID))
    .filter((id) => !id.endsWith('-words'))
    .map((id) => id.replace(/^payment-/, ''));
const rowLabels = () =>
  screen
    .queryAllByTestId(/^payment-/)
    .filter((node) => !String(node.props.testID).endsWith('-words'))
    .map(labelOf);

/** "$159.90 · 10", the total and count on a year's heading, in whatever language is drawn. */
const yearCaption = (year: number) =>
  textOf(
    within(within(screen.getByTestId(`results-${year}`)).getByRole('header')).getAllByText(/./)[1],
  );

const NOTICE = /^Older history is saved/;

// ---------------------------------------------------------------------------------------------
// What the results must be, from the statement and the rules the page states.

const TODAY = '2026-10-12';
const ALL = statement(TODAY);
const only = (plan: string, rows: readonly Paid[] = ALL) => rows.filter((p) => p.plan === plan);
const inYear = (rows: readonly Paid[], year: number) =>
  rows.filter((p) => p.date.startsWith(`${year}-`));

/**
 * The page the matches should draw: a count over the years it spans, the two newest years that have
 * a row to list in full (each with its whole total and count), the rest folded, rows only from the
 * floor, and whether older matches are being held back.
 */
function expected(matches: readonly Paid[], floor = '2020-01-01') {
  const years = [...new Set(matches.map((p) => Number(p.date.slice(0, 4))))].sort((a, b) => b - a);
  const listed = (year: number) => inYear(matches, year).filter((p) => p.date >= floor);
  const withRows = years.filter((year) => listed(year).length > 0);
  const rest = withRows.slice(2);
  const folded = rest.reduce((total, year) => total + listed(year).length, 0);
  const span =
    years.length === 0
      ? ''
      : years[0] === years[years.length - 1]
        ? String(years[0])
        : `${years[years.length - 1]} – ${years[0]}`;
  return {
    header: `${matches.length} ${matches.length === 1 ? 'result' : 'results'} · ${span}`,
    groups: withRows.slice(0, 2).map((year) => ({
      year,
      caption: `${usd(sum(inYear(matches, year)))} · ${inYear(matches, year).length}`,
      ids: listed(year).map((p) => p.id),
    })),
    fold:
      rest.length === 0
        ? null
        : rest.length === 1
          ? `${rest[0]} · ${folded} more`
          : `${rest[0]} – ${rest[rest.length - 1]} · ${folded} more`,
    held: matches.some((p) => p.date < floor),
  };
}

/** The top page shows exactly these matches. */
function expectResults(matches: readonly Paid[], floor = '2020-01-01') {
  if (matches.length === 0) {
    expect(screen.getByText('No payments match')).toBeTruthy();
    return;
  }
  const want = expected(matches, floor);
  expect(screen.getByText(want.header)).toBeTruthy();
  for (const group of want.groups) expect(yearCaption(group.year)).toBe(group.caption);
  expect(rowIds()).toEqual(want.groups.flatMap((group) => group.ids));
  if (want.fold) expect(screen.getByRole('button', { name: want.fold })).toBeTruthy();
  else expect(screen.queryByTestId('results-folded')).toBeNull();
  if (want.held) expect(screen.getByRole('button', { name: NOTICE })).toBeTruthy();
  else expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();
}

beforeEach(() => {
  resetLocaleForTests();
  resetProStatusForTests();
  publishProStatus({ pro: true, ready: true });
  mockToday = TODAY;
  mockUserId = 'user-1';
  mockStore.clear();
  mockStorage.refuseRead = false;
  mockStorage.refuseWrite = false;
  mockReads.length = 0;
  mockFailing.clear();
  mockHeld.length = 0;
  mockHold = false;
  load(mockToday);
  jest.clearAllMocks();
  const window = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window, screen: window });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
  client.clear();
});

/** Opens the Amount page from the search on top, fills it in and shows the payments. */
async function setAmount(min: string | null, max: string | null) {
  await press('Amount, Any amount');
  if (min !== null) await fireEvent.changeText(inputs()[0], min);
  if (max !== null) await fireEvent.changeText(inputs()[1], max);
  await press('Show payments');
}

const between = (min: number | null, max: number | null, rows: readonly Paid[] = ALL) =>
  rows.filter((p) => (min === null || p.cents >= min) && (max === null || p.cents <= max));

// ---------------------------------------------------------------------------------------------
// Amount.

describe('an amount, set on its own page', () => {
  it('walks from the search to the page and back, narrows the results, and Clear filters undoes it', async () => {
    await openStack(search());
    await press('Amount, Any amount');
    expect(paths()).toEqual(['/payment-search', '/payment-filter']);
    expect(top().params).toEqual({ type: 'amount', owner: expect.stringMatching(/\S/) });
    expect(screen.getByText('Amount')).toBeTruthy();

    await fireEvent.changeText(inputs()[0], '100');
    await press('Show payments');
    expect(paths()).toEqual(['/payment-search']);
    // A filter is a search: every payment of $100.00 or more, newest first.
    expectResults(between(10000, null));
    expect(screen.queryByTestId('search-filters')).toBeNull();

    // With a word as well, it narrows further.
    await type('aep');
    expectResults(between(10000, null, only('aep')));
    expect(rowIds().every((id) => id.startsWith('charge-aep-'))).toBe(true);
    // The $96.55 spring and autumn months are under $100.00 and left out.
    expect(rowIds()).not.toContain('charge-aep-2026-09-22');

    await press('Clear filters');
    expectResults(only('aep'));
    expect(rowIds()).toContain('charge-aep-2026-09-22');
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();

    // And with the word gone too, the page is the start page again, with nothing set.
    await press('Clear search');
    expect(screen.getByRole('button', { name: 'Amount, Any amount' })).toBeTruthy();
  });

  it.each([
    ['at least', '1000', null, 100000, null],
    ['at most', null, '7.99', null, 799],
    ['between', '100', '150', 10000, 15000],
    ['exactly the same amount twice', '15.99', '15.99', 1599, 1599],
    ['a price a year apart', '15.49', '15.99', 1549, 1599],
    ['one exact amount', '145', '145', 14500, 14500],
  ] as const)(
    '%s: both ends are included, to the cent',
    async (_, min, max, minCents, maxCents) => {
      await openStack(search());
      await setAmount(min, max);
      const matches = between(minCents, maxCents);
      expect(matches.length).toBeGreaterThan(0);
      expectResults(matches);
      for (const label of rowLabels()) {
        const cents = Number(/\$([\d,]+\.\d\d)/.exec(label)![1].replace(/[,.]/g, ''));
        expect([label, cents >= (minCents ?? 0), cents <= (maxCents ?? Infinity)]).toEqual([
          label,
          true,
          true,
        ]);
      }
    },
  );

  it('keeps the $1,000.00 extra payment at "$1,000.00 or more", and the $554.00 instalment out', async () => {
    await openStack(search());
    await setAmount('1000', null);
    expect(rowIds()).toContain('payoff-car-extra');
    expect(rowIds().some((id) => id.startsWith('charge-car-'))).toBe(false);
  });

  it('shows nothing it can find plainly, with a way back', async () => {
    await openStack(search());
    await setAmount('5000', null);
    expect(await screen.findByText('No payments match')).toBeTruthy();
    await press('Clear filters');
    expect(screen.getByTestId('search-filters')).toBeTruthy();
  });

  it('refuses a smaller "at most" with the hint, keeps the page open, and takes the corrected amounts', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await openStack(search());
    await press('Amount, Any amount');
    await fireEvent.changeText(inputs()[0], '200');
    await fireEvent.changeText(inputs()[1], '100');
    await press('Show payments');

    expect(screen.getByRole('alert').props.children).toBe('The smaller amount must come first.');
    expect(announce).toHaveBeenCalledWith('The smaller amount must come first.');
    // Nothing was handed back, and the page is still the one on top.
    expect(paths()).toEqual(['/payment-search', '/payment-filter']);
    expect(
      within(pageAt(0)).getByRole('button', { name: 'Amount, Any amount', ...hidden }),
    ).toBeTruthy();

    await fireEvent.changeText(inputs()[1], '250');
    expect(screen.queryByRole('alert')).toBeNull();
    await press('Show payments');
    expect(paths()).toEqual(['/payment-search']);
    expectResults(between(20000, 25000));
  });

  it('refuses every smaller maximum, and takes an equal one', async () => {
    await openStack(search());
    await press('Amount, Any amount');
    for (const [min, max] of [
      ['15.99', '15.98'],
      ['1000', '999.99'],
      ['0.02', '0.01'],
    ]) {
      await fireEvent.changeText(inputs()[0], min);
      await fireEvent.changeText(inputs()[1], max);
      await press('Show payments');
      expect([min, max, screen.queryByRole('alert') !== null]).toEqual([min, max, true]);
      expect(paths()).toEqual(['/payment-search', '/payment-filter']);
    }
    await fireEvent.changeText(inputs()[0], '15.99');
    await fireEvent.changeText(inputs()[1], '15.99');
    await press('Show payments');
    expect(paths()).toEqual(['/payment-search']);
  });

  it('Clear empties both fields and hands back no amount, so the search is as it was', async () => {
    await openStack(search());
    await press('Amount, Any amount');
    await fireEvent.changeText(inputs()[0], '200');
    await fireEvent.changeText(inputs()[1], '100');
    await press('Show payments');
    await press('Clear');
    expect(inputs().map((field) => field.props.value)).toEqual(['', '']);
    expect(screen.queryByRole('alert')).toBeNull();

    await press('Show payments');
    expect(paths()).toEqual(['/payment-search']);
    expect(screen.getByRole('button', { name: 'Amount, Any amount' })).toBeTruthy();
  });

  it('leaves the search as it was when the page is left with the back arrow', async () => {
    await openStack(search());
    await press('Amount, Any amount');
    await fireEvent.changeText(inputs()[0], '100');
    await press('Go back');
    expect(paths()).toEqual(['/payment-search']);
    expect(screen.getByRole('button', { name: 'Amount, Any amount' })).toBeTruthy();
    expect(screen.queryByTestId('search-results')).toBeNull();
  });

  it('opens the page with what is set when a link says so, in whole cents', async () => {
    await openStack(
      search(),
      filter({ type: 'amount', owner: 'none', min: '1599', max: '100000' }),
    );
    expect(inputs().map((field) => field.props.value)).toEqual(['15.99', '1,000']);
  });
});

// ---------------------------------------------------------------------------------------------
// The pick comes back to the search that opened it, and to no other.

describe('which search a filter is handed to', () => {
  it('hands a pick to the search that opened the page, never to another open under it', async () => {
    await openStack(search(), search());
    // Two searches are open: A underneath, B on top.
    expect(paths()).toEqual(['/payment-search', '/payment-search']);

    await setAmount('100', null);
    expect(paths()).toEqual(['/payment-search', '/payment-search']);
    // B, on top, narrowed.
    expectResults(between(10000, null));
    // A, underneath, is exactly as it was.
    expect(
      within(pageAt(0)).getByRole('button', { name: 'Amount, Any amount', ...hidden }),
    ).toBeTruthy();
    expect(within(pageAt(0)).queryByTestId('search-results', hidden)).toBeNull();
  });

  it('hands it to the opener even when another search is the one on top', async () => {
    await openStack(search(), search());
    // A person can only press the top page; the page underneath opens its filter here as if it
    // had been the one in front, which is what a late tap on a page sliding away looks like.
    await fireEvent.press(
      within(pageAt(0)).getByRole('button', { name: 'Date range, Any time', ...hidden }),
    );
    expect(paths()).toEqual(['/payment-search', '/payment-search', '/payment-filter']);
    await fireEvent.press(radio(/^Last year/));
    expect(paths()).toEqual(['/payment-search', '/payment-search']);

    // A (the opener) took it; B did not.
    expect(within(pageAt(0)).getByText(expected(inYear(ALL, 2025)).header, hidden)).toBeTruthy();
    expect(within(pageAt(1)).queryByTestId('search-results')).toBeNull();
    expect(within(pageAt(1)).getByRole('button', { name: 'Date range, Any time' })).toBeTruthy();
  });

  it('goes nowhere for a search that is not there, and for another kind of pick', async () => {
    await openStack(search());
    await press('Amount, Any amount');
    const closed = top().params.owner;
    await fireEvent.changeText(inputs()[0], '100');
    await press('Show payments');
    const owner = closed;
    expectResults(between(10000, null));

    // A pick for a search that is not mounted, or of a kind this page does not listen to, changes
    // nothing and throws nothing.
    await act(async () => {
      pickPayment({ owner: 'gone', type: 'filters', filter: { minCents: 1, maxCents: 2 } });
      pickPayment({ owner, type: 'month', month: '2026-09' });
      pickPayment({ owner, type: 'year', year: 2025 });
    });
    expectResults(between(10000, null));
  });

  it('hands a link-opened filter page’s choice to nobody, and still goes back', async () => {
    await openStack(search(), filter({ type: 'date' }));
    const listener = jest.fn();
    const stop = onPaymentPicked('anyone', 'filters', listener);
    await fireEvent.press(radio(/^Last year/));
    stop();
    expect(listener).not.toHaveBeenCalled();
    expect(paths()).toEqual(['/payment-search']);
    expect(screen.getByRole('button', { name: 'Date range, Any time' })).toBeTruthy();
  });

  it('goes back from a link that names no filter', async () => {
    await openStack(search(), filter({ type: 'colour', owner: 'x' }));
    expect(paths()).toEqual(['/payment-search']);
  });
});

// ---------------------------------------------------------------------------------------------
// Date range.

/** The account on 12 Jan 2027: "Last 3 months" reaches back across the year end. */
const NEW_YEAR = '2027-01-12';
const AT_NEW_YEAR = statement(NEW_YEAR);

describe('a date range across a year end', () => {
  beforeEach(() => {
    mockToday = NEW_YEAR;
    load(NEW_YEAR);
  });

  const within3Months = (rows: readonly Paid[]) =>
    rows.filter((p) => p.date >= '2026-11-01' && p.date <= NEW_YEAR);

  it('offers each range with the days it covers, today being 12 Jan 2027', async () => {
    await openStack(search());
    await press('Date range, Any time');
    expect(
      screen
        .getAllByRole('radio')
        .map((node) => [labelOf(node), node.props.accessibilityState.checked]),
    ).toEqual([
      ['Any time', true],
      ['This month, 1 Jan 2027 – 12 Jan 2027', false],
      ['Last 3 months, 1 Nov 2026 – 12 Jan 2027', false],
      ['This year, 1 Jan 2027 – 12 Jan 2027', false],
      ['Last year, 1 Jan 2026 – 31 Dec 2026', false],
      ['Pick dates', false],
    ]);
  });

  it('"Last 3 months" is 1 Nov to today, both days included, over two years', async () => {
    await openStack(search());
    await press('Date range, Any time');
    await fireEvent.press(radio(/^Last 3 months/));
    expect(paths()).toEqual(['/payment-search']);

    const matches = within3Months(AT_NEW_YEAR);
    expectResults(matches);
    expect(screen.getByText(expected(matches).header)).toBeTruthy();
    expect(screen.getByText(/ · 2026 – 2027$/)).toBeTruthy();
    // The days on its edges: rent on 1 Nov is in, rent on 1 Oct is out, and so is AEP on 22 Oct.
    expect(rowIds()).toEqual(expect.arrayContaining(['charge-rent-2026-11-01']));
    expect(rowIds()).not.toContain('charge-rent-2026-10-01');
    expect(rowIds()).not.toContain('charge-aep-2026-10-22');
    // Today's own payment is in: Spotify goes out on the 12th.
    expect(labelOf(screen.getByTestId('payment-charge-spotify-2027-01-12'))).toBe(
      'Spotify, $11.99, 12 Jan 2027, Discover ••6334, Paid',
    );
    // 2027 holds only January's, and is a group of its own above 2026.
    expect(yearCaption(2027)).toBe(
      `${usd(sum(inYear(matches, 2027)))} · ${inYear(matches, 2027).length}`,
    );
    expect(inYear(matches, 2027).every((p) => p.date >= '2027-01-01')).toBe(true);
  });

  it('opens the Date range link on the range in use, and each other range replaces it', async () => {
    await openStack(search());
    await press('Date range, Any time');
    await fireEvent.press(radio(/^Last 3 months/));

    // The link says what is set.
    expect(screen.getByRole('button', { name: 'Date range: Last 3 months' })).toBeTruthy();
    await press(/^Date range/);
    expect(top().params).toEqual({
      type: 'date',
      owner: expect.stringMatching(/\S/),
      range: 'last3Months',
    });
    expect(screen.getByRole('radio', { name: /^Last 3 months/, checked: true })).toBeTruthy();

    await fireEvent.press(radio(/^This year/));
    expectResults(AT_NEW_YEAR.filter((p) => p.date >= '2027-01-01'));
    expect(screen.getByText(/ · 2027$/)).toBeTruthy();

    await press(/^Date range/);
    await fireEvent.press(radio(/^Last year/));
    expectResults(inYear(AT_NEW_YEAR, 2026));
    expect(screen.getByText(/ · 2026$/)).toBeTruthy();

    await press(/^Date range/);
    await fireEvent.press(radio(/^This month/));
    expectResults(AT_NEW_YEAR.filter((p) => p.date >= '2027-01-01'));

    // Any time with no word is no search at all: back to the start.
    await press(/^Date range/);
    await fireEvent.press(radio('Any time'));
    expect(screen.getByRole('button', { name: 'Date range, Any time' })).toBeTruthy();
    expect(screen.queryByTestId('search-results')).toBeNull();
  });

  it('narrows a word to the range, and Clear filters brings the other years back', async () => {
    await openStack(search());
    await type('netflix');
    await screen.findByTestId('search-results');
    await press('Date range');
    await fireEvent.press(radio(/^Last 3 months/));
    expectResults(within3Months(only('netflix', AT_NEW_YEAR)));
    // Netflix on the 9th of Nov, Dec and Jan.
    expect(rowIds()).toEqual([
      'charge-netflix-2027-01-09',
      'charge-netflix-2026-12-09',
      'charge-netflix-2026-11-09',
    ]);

    await press('Clear filters');
    expectResults(only('netflix', AT_NEW_YEAR));
  });
});

// ---------------------------------------------------------------------------------------------
// Picked dates, on the real calendar.

describe('picked dates', () => {
  const pick = async (monthName: string, dayLabel: RegExp) => {
    await fireEvent.press(screen.getByRole('button', { name: monthName }));
    await fireEvent.press(screen.getByRole('button', { name: dayLabel }));
    await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
  };

  const openCustom = async () => {
    await openStack(search());
    await press('Date range, Any time');
    await fireEvent.press(radio('Pick dates'));
  };

  it('shows From and To on this month, with Show payments pinned below the scroll', async () => {
    await openCustom();
    expect(screen.getByRole('button', { name: 'From. 1 Oct 2026' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'To. 12 Oct 2026' })).toBeTruthy();
    expect(insideScrollOf(screen.getByRole('button', { name: 'Show payments' }))).toBe(false);
    expect(insideScrollOf(screen.getByRole('button', { name: 'To. 12 Oct 2026' }))).toBe(true);
    // Nothing is handed back until Show payments.
    expect(paths()).toEqual(['/payment-search', '/payment-filter']);
  });

  it('searches the days picked, both ends included', async () => {
    await openCustom();
    await fireEvent.press(screen.getByRole('button', { name: 'From. 1 Oct 2026' }));
    await pick('Sep', / 5 September 2026$/);
    expect(screen.getByRole('button', { name: 'From. 5 Sep 2026' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'To. 12 Oct 2026' }));
    await pick('Sep', / 28 September 2026$/);
    expect(screen.getByRole('button', { name: 'To. 28 Sep 2026' })).toBeTruthy();

    await press('Show payments');
    expect(paths()).toEqual(['/payment-search']);
    const matches = ALL.filter((p) => p.date >= '2026-09-05' && p.date <= '2026-09-28');
    expectResults(matches);
    // The car loan on the 28th, the last day, is in; rent on the 1st and Nationwide on the 3rd are out.
    expect(rowIds()).toContain('charge-car-2026-09-28');
    expect(rowIds()).not.toContain('charge-rent-2026-09-01');
    expect(rowIds()).not.toContain('charge-nationwide-2026-09-03');
  });

  it('cannot be made backwards: To’s calendar starts at From', async () => {
    await openCustom();
    await fireEvent.press(screen.getByRole('button', { name: 'From. 1 Oct 2026' }));
    await pick('Sep', / 5 September 2026$/);

    await fireEvent.press(screen.getByRole('button', { name: 'To. 12 Oct 2026' }));
    // Every month before September is dead, and September itself is open.
    for (const month of ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']) {
      expect(screen.getByRole('button', { name: month, disabled: true })).toBeTruthy();
    }
    for (const month of ['Sep', 'Oct', 'Nov', 'Dec']) {
      expect(screen.getByRole('button', { name: month, disabled: false })).toBeTruthy();
    }
    await fireEvent.press(screen.getByRole('button', { name: 'Sep' }));
    // Within September, the 1st to the 4th are dead; the 5th, From itself, is open.
    for (const day of [1, 2, 3, 4]) {
      expect(
        screen.getByRole('button', { name: new RegExp(` ${day} September 2026$`), disabled: true }),
      ).toBeTruthy();
    }
    expect(
      screen.getByRole('button', { name: / 5 September 2026$/, disabled: false }),
    ).toBeTruthy();
    // A dead day does nothing: the draft stays on the 12th, and that is what OK confirms.
    await fireEvent.press(screen.getByRole('button', { name: / 4 September 2026$/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('button', { name: 'To. 12 Sep 2026' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'To. 4 Sep 2026' })).toBeNull();

    // Stepping the year back keeps the day and lands before From: OK is held back.
    await fireEvent.press(screen.getByRole('button', { name: 'To. 12 Sep 2026' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sep' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByRole('button', { name: 'OK', disabled: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('button', { name: 'OK' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'To. 12 Sep 2026' })).toBeTruthy();

    await press('Show payments');
    expectResults(ALL.filter((p) => p.date >= '2026-09-05' && p.date <= '2026-09-12'));
  });

  it('brings To along when From is moved past it, so a backwards range cannot be built', async () => {
    await openCustom();
    await fireEvent.press(screen.getByRole('button', { name: 'From. 1 Oct 2026' }));
    await pick('Nov', / 5 November 2026$/);
    expect(screen.getByRole('button', { name: 'From. 5 Nov 2026' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'To. 5 Nov 2026' })).toBeTruthy();

    await press('Show payments');
    // 5 Nov is after today: a valid range with nothing in it, said plainly, never an inverted one.
    expect(await screen.findByText('No payments match')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeTruthy();
  });

  it('changes nothing when a calendar is cancelled', async () => {
    await openCustom();
    await fireEvent.press(screen.getByRole('button', { name: 'From. 1 Oct 2026' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aug' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'From. 1 Oct 2026' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aug' })).toBeNull();
  });

  it('reopens on the days in use from the Date range link', async () => {
    await openCustom();
    await press('Show payments');
    // The default days are this month, 1 – 12 Oct.
    expectResults(ALL.filter((p) => p.date >= '2026-10-01' && p.date <= '2026-10-12'));
    expect(
      screen.getByRole('button', { name: 'Date range: 1 Oct 2026 – 12 Oct 2026' }),
    ).toBeTruthy();
    await press(/^Date range/);
    expect(top().params).toEqual({
      type: 'date',
      owner: expect.stringMatching(/\S/),
      range: 'custom',
      from: '2026-10-01',
      to: '2026-10-12',
    });
    expect(screen.getByRole('radio', { name: 'Pick dates', checked: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'From. 1 Oct 2026' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'To. 12 Oct 2026' })).toBeTruthy();
  });
});

type HostNode = { type: unknown; parent: HostNode | null; props: Record<string, any> };

/** The scroll view a node is drawn in, or null when it is pinned outside it. */
function scrollOf(node: HostNode | null): HostNode | null {
  for (let at = node; at; at = at.parent) {
    if (String(at.type) === 'RCTScrollView') return at;
  }
  return null;
}
function insideScrollOf(node: unknown) {
  return scrollOf(node as HostNode) !== null;
}

// ---------------------------------------------------------------------------------------------
// Paid from.

describe('paid from', () => {
  const free = () => publishProStatus({ pro: false, ready: true });
  const FLOOR = '2026-07-15';
  const sources = () => screen.getAllByRole('radio');

  it('lists every card and account on a free account, the locked second card included', async () => {
    free();
    await openStack(search());
    await press('Paid from, All accounts');
    await waitFor(() => expect(sources()).toHaveLength(6));
    expect(sources().map(labelOf)).toEqual([
      'All accounts',
      'Visa ••4421',
      'Discover ••6334',
      'Komal ••7010',
      'Ally',
      'Card not set',
    ]);
    expect(screen.getByRole('radio', { name: 'All accounts', checked: true })).toBeTruthy();
  });

  it('finds the payments on a free account’s locked card, named by their card, not "Card not set"', async () => {
    free();
    await openStack(search());
    await press('Paid from, All accounts');
    await waitFor(() => expect(sources()).toHaveLength(6));
    await fireEvent.press(radio('Discover ••6334'));
    expect(paths()).toEqual(['/payment-search']);

    const matches = ALL.filter((p) => p.source === DISCOVER);
    expect(matches).toHaveLength(32);
    // Whole counts and totals; rows stop at 15 Jul; the notice says why.
    expectResults(matches, FLOOR);
    expect(rowIds()).toEqual([
      'charge-spotify-2026-10-12',
      'charge-spotify-2026-09-12',
      'charge-spotify-2026-08-12',
    ]);
    for (const label of rowLabels()) expect(label).toMatch(/, Discover ••6334, Paid$/);
    expect(screen.queryByText(/Card not set/)).toBeNull();
  });

  it('finds the payments with no card set, and only those', async () => {
    await openStack(search());
    await press('Paid from, All accounts');
    await waitFor(() => expect(sources()).toHaveLength(6));
    await fireEvent.press(radio('Card not set'));

    const matches = ALL.filter((p) => p.source === '');
    // Netflix since Sep 2021 and Nationwide since Feb 2025, to the cent.
    expect(matches).toHaveLength(62 + 21);
    expectResults(matches);
    expect(rowIds().every((id) => /^charge-(netflix|nationwide)-/.test(id))).toBe(true);
    for (const label of rowLabels()) expect(label).toMatch(/, Card not set, Paid$/);
  });

  it.each([
    ['Komal ••7010', CHASE],
    ['Visa ••4421', VISA],
    ['Ally', ALLY],
  ])('finds what went out of %s', async (name, id) => {
    await openStack(search());
    await press('Paid from, All accounts');
    await waitFor(() => expect(sources()).toHaveLength(6));
    await fireEvent.press(radio(name));
    expectResults(ALL.filter((p) => p.source === id));
  });

  it('says so, with a way back, when nothing was paid from the one chosen', async () => {
    await openStack(search());
    await press('Paid from, All accounts');
    await waitFor(() => expect(sources()).toHaveLength(6));
    await fireEvent.press(radio('Ally'));
    expect(await screen.findByText('No payments match')).toBeTruthy();
    await press('Clear filters');
    expect(screen.getByRole('button', { name: 'Paid from, All accounts' })).toBeTruthy();
  });

  it('shows a failed read of the cards and accounts as the one failure line, then tries again', async () => {
    mockFailing.add('cards');
    await openStack(search());
    await press('Paid from, All accounts');
    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryAllByRole('radio')).toEqual([]);

    mockFailing.clear();
    await press('Try again');
    await waitFor(() => expect(sources()).toHaveLength(6));
  });
});

// ---------------------------------------------------------------------------------------------
// The links above the results: every filter is changed, or undone, from here.

describe('the filter links above the results', () => {
  const links = () =>
    within(screen.getByTestId('results-filters')).getAllByRole('button').map(labelOf);
  const sources = () => screen.getAllByRole('radio');
  const clearButtons = () => screen.queryAllByRole('button', { name: 'Clear filters' });

  /** From the results: opens the Amount link, fills it in, shows the payments. */
  async function amountFromResults(min: string | null, max: string | null) {
    await fireEvent.press(screen.getByTestId('results-amount'));
    await fireEvent.changeText(inputs()[0], min ?? '');
    await fireEvent.changeText(inputs()[1], max ?? '');
    await press('Show payments');
  }

  /** From the results: opens the Paid from link and picks one. */
  async function sourceFromResults(name: string) {
    await fireEvent.press(screen.getByTestId('results-paid-from'));
    await waitFor(() => expect(sources()).toHaveLength(6));
    await fireEvent.press(radio(name));
  }

  it('are all three there with nothing set, each named alone, and no Clear filters', async () => {
    await openStack(search());
    await type('netflix');
    await screen.findByTestId('search-results');
    expect(links()).toEqual(['Date range', 'Amount', 'Paid from']);
    expect(clearButtons()).toEqual([]);
    expect(screen.getByTestId('results-filters')).toBeTruthy();
  });

  it('are not on the start page, where the filter rows are', async () => {
    await openStack(search());
    expect(screen.queryByTestId('results-filters')).toBeNull();
    expect(screen.getByTestId('search-filters')).toBeTruthy();
  });

  it('Amount opens its page with the amounts in use, and a new pair replaces them', async () => {
    await openStack(search());
    await setAmount('100', null);
    expect(links()).toEqual([
      'Date range',
      'Amount: $100.00 or more',
      'Paid from',
      'Clear filters',
    ]);

    await fireEvent.press(screen.getByTestId('results-amount'));
    expect(top().params).toEqual({
      type: 'amount',
      owner: expect.stringMatching(/\S/),
      min: '10000',
    });
    expect(inputs().map((field) => field.props.value)).toEqual(['100', '']);

    await fireEvent.changeText(inputs()[1], '150');
    await press('Show payments');
    expectResults(between(10000, 15000));
    expect(links()).toContain('Amount: $100.00 – $150.00');
  });

  it('Amount, set from the results with nothing set yet, opens empty', async () => {
    await openStack(search());
    await type('aep');
    await screen.findByTestId('search-results');
    await fireEvent.press(screen.getByTestId('results-amount'));
    expect(top().params).toEqual({ type: 'amount', owner: expect.stringMatching(/\S/) });
    expect(inputs().map((field) => field.props.value)).toEqual(['', '']);
    await fireEvent.changeText(inputs()[0], '150');
    await press('Show payments');
    expectResults(between(15000, null, only('aep')));
    expect(links()).toContain('Amount: $150.00 or more');
  });

  it('Paid from opens its page on the account in use, and a new pick replaces it', async () => {
    await openStack(search());
    await type('rent');
    await screen.findByTestId('search-results');
    await sourceFromResults('Komal ••7010');
    expectResults(
      only(
        'rent',
        ALL.filter((p) => p.source === CHASE),
      ),
    );
    expect(links()).toEqual(['Date range', 'Amount', 'Paid from: Komal ••7010', 'Clear filters']);

    await fireEvent.press(screen.getByTestId('results-paid-from'));
    expect(top().params).toEqual({
      type: 'from',
      owner: expect.stringMatching(/\S/),
      source: CHASE,
    });
    await waitFor(() => expect(sources()).toHaveLength(6));
    expect(screen.getByRole('radio', { name: 'Komal ••7010', checked: true })).toBeTruthy();

    // Rent was always paid from the account, so "Card not set" finds none of it.
    await fireEvent.press(radio('Card not set'));
    expect(await screen.findByText('No payments match')).toBeTruthy();
    expect(links()).toContain('Paid from: Card not set');
  });

  it('keep what is already set when another is chosen, and show every value at once', async () => {
    await openStack(search());
    await setAmount('100', null);
    await sourceFromResults('Komal ••7010');
    await fireEvent.press(screen.getByTestId('results-date-range'));
    await fireEvent.press(radio(/^Last year/));

    const matches = ALL.filter(
      (p) => p.cents >= 10000 && p.source === CHASE && p.date.startsWith('2025-'),
    );
    expect(matches.length).toBeGreaterThan(0);
    expectResults(matches);
    expect(links()).toEqual([
      'Date range: Last year',
      'Amount: $100.00 or more',
      'Paid from: Komal ••7010',
      'Clear filters',
    ]);

    // Each link opens its page on its own value, the others untouched.
    await amountFromResults('1000', null);
    expectResults(
      ALL.filter((p) => p.cents >= 100000 && p.source === CHASE && p.date.startsWith('2025-')),
    );
    expect(links()).toContain('Date range: Last year');
    expect(links()).toContain('Paid from: Komal ••7010');
  });

  it('say Clear filters once, and it clears all three', async () => {
    await openStack(search());
    await setAmount('100', null);
    await sourceFromResults('Komal ••7010');
    expect(clearButtons()).toHaveLength(1);

    await press('Clear filters');
    // Nothing set and no word: the start page, its three rows as they began.
    expect(screen.getByRole('button', { name: 'Date range, Any time' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Amount, Any amount' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Paid from, All accounts' })).toBeTruthy();
    expect(screen.queryByTestId('results-filters')).toBeNull();
  });

  it('stay on a result with nothing in it, so a filter can be loosened without starting again', async () => {
    await openStack(search());
    await setAmount('5000', null);
    expect(await screen.findByText('No payments match')).toBeTruthy();

    expect(links()).toEqual(['Date range', 'Amount: $5,000.00 or more', 'Paid from']);
    // The empty page offers Clear filters itself: one button of the name, not two.
    expect(clearButtons()).toHaveLength(1);
    expect(
      within(screen.getByTestId('search-empty')).getByText(
        'No matches? Try a shorter word or another year.',
      ),
    ).toBeTruthy();

    await amountFromResults('100', '150');
    expectResults(between(10000, 15000));
    expect(clearButtons()).toHaveLength(1);
  });

  it('stay on an empty result for a word, with no Clear filters until one is set', async () => {
    await openStack(search());
    await type('zzzz');
    expect(await screen.findByText('No payments match')).toBeTruthy();
    expect(links()).toEqual(['Date range', 'Amount', 'Paid from']);
    expect(clearButtons()).toEqual([]);

    await fireEvent.press(screen.getByTestId('results-date-range'));
    await fireEvent.press(radio(/^Last year/));
    // A year's payments of a word that is in none of them: still empty, and now Clear filters is
    // there, once, as the empty page's own button.
    expect(await screen.findByText('No payments match')).toBeTruthy();
    expect(links()).toEqual(['Date range: Last year', 'Amount', 'Paid from']);
    expect(clearButtons()).toHaveLength(1);
  });

  it.each([
    [
      'es',
      'Rango de fechas: El año pasado',
      'Importe: $100.00 o más',
      'Pagado con: Komal ••7010',
      'Borrar filtros',
    ],
    [
      'fr',
      'Période\u00A0: L’année dernière',
      'Montant\u00A0: 100,00\u00A0$ ou plus',
      'Payé avec\u00A0: Komal ••7010',
      'Effacer les filtres',
    ],
  ] as const)(
    '%s: the set values read in that language',
    async (language, date, amount, from, clear) => {
      setLanguage(language);
      await openStack(search());
      await fireEvent.press(screen.getByTestId('filter-amount'));
      await fireEvent.changeText(inputs()[0], '100');
      await fireEvent.press(
        screen
          .getAllByRole('button')
          .find((node) => /^(Ver pagos|Voir les paiements)$/.test(labelOf(node)))!,
      );
      await fireEvent.press(screen.getByTestId('results-paid-from'));
      await waitFor(() => expect(sources()).toHaveLength(6));
      await fireEvent.press(sources()[3]);
      await fireEvent.press(screen.getByTestId('results-date-range'));
      await fireEvent.press(screen.getAllByRole('radio')[4]);

      expect(links()).toEqual([date, amount, from, clear]);
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Free and Pro, through the filters.

describe('free and Pro through the filters', () => {
  const FLOOR = '2026-07-15';

  it('free: an amount filter counts every match, lists from 15 Jul, and the notice says why', async () => {
    publishProStatus({ pro: false, ready: true });
    await openStack(search());
    await setAmount('500', null);
    const matches = between(50000, null);
    expectResults(matches, FLOOR);
    // Rent on 1 Oct, 1 Sep and 1 Aug and the car loan on 28 Sep, 28 Aug and 28 Jul: the six listed.
    expect(rowIds()).toEqual([
      'charge-rent-2026-10-01',
      'charge-car-2026-09-28',
      'charge-rent-2026-09-01',
      'charge-car-2026-08-28',
      'charge-rent-2026-08-01',
      'charge-car-2026-07-28',
    ]);

    await fireEvent.press(screen.getByRole('button', { name: NOTICE }));
    expect(top()).toEqual(
      expect.objectContaining({ pathname: '/pro-feature', params: { id: 'history' } }),
    );
  });

  it('free: a range wholly older than 90 days counts and totals, lists none, and says why', async () => {
    publishProStatus({ pro: false, ready: true });
    await openStack(search());
    await press('Date range, Any time');
    await fireEvent.press(radio(/^Last year/));
    const matches = inYear(ALL, 2025);
    expect(matches.length).toBeGreaterThan(40);
    expectResults(matches, FLOOR);
    expect(rowIds()).toEqual([]);
    expect(screen.getByText(`${matches.length} results · 2025`)).toBeTruthy();
  });

  it('Pro: the same range lists its rows, with no notice', async () => {
    await openStack(search());
    await press('Date range, Any time');
    await fireEvent.press(radio(/^Last year/));
    expectResults(inYear(ALL, 2025));
    expect(rowIds().length).toBe(inYear(ALL, 2025).length);
    expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// Spanish and French.

describe('in Spanish and French', () => {
  const WORDS = {
    es: {
      date: 'Rango de fechas',
      radios: [
        'Todas las fechas',
        'Este mes, 1 oct 2026 – 12 oct 2026',
        'Últimos 3 meses, 1 ago 2026 – 12 oct 2026',
        'Este año, 1 ene 2026 – 12 oct 2026',
        'El año pasado, 1 ene 2025 – 31 dic 2025',
        'Elegir fechas',
      ],
      from: 'Desde. 1 oct 2026',
      to: 'Hasta. 12 oct 2026',
      amount: ['Importe', 'Mínimo', 'Máximo'],
      refusal: 'El importe menor debe ir primero.',
      apply: 'Ver pagos',
      clear: 'Borrar',
      sources: [
        'Todas las cuentas',
        'Visa ••4421',
        'Discover ••6334',
        'Komal ••7010',
        'Ally',
        'Sin tarjeta',
      ],
      paidFrom: 'Pagado con',
      results: (n: number, span: string) => `${n} resultados · ${span}`,
      cardNotSet: 'Sin tarjeta',
      clearFilters: 'Borrar filtros',
      none: 'Ningún pago coincide',
      row: (date: string) => `Spotify, $11.99, ${date}, Discover ••6334, Pagado`,
      spotify: '12 oct 2026',
    },
    fr: {
      date: 'Période',
      radios: [
        'Toutes les dates',
        'Ce mois-ci, 1 oct. 2026 – 12 oct. 2026',
        '3 derniers mois, 1 août 2026 – 12 oct. 2026',
        'Cette année, 1 janv. 2026 – 12 oct. 2026',
        'L’année dernière, 1 janv. 2025 – 31 déc. 2025',
        'Choisir les dates',
      ],
      from: 'Début. 1 oct. 2026',
      to: 'Fin. 12 oct. 2026',
      amount: ['Montant', 'Minimum', 'Maximum'],
      refusal: 'Le plus petit montant doit venir en premier.',
      apply: 'Voir les paiements',
      clear: 'Effacer',
      sources: [
        'Tous les comptes',
        'Visa ••4421',
        'Discover ••6334',
        'Komal ••7010',
        'Ally',
        'Aucune carte',
      ],
      paidFrom: 'Payé avec',
      results: (n: number, span: string) => `${n} résultats · ${span}`,
      cardNotSet: 'Aucune carte',
      clearFilters: 'Effacer les filtres',
      none: 'Aucun paiement ne correspond',
      row: (date: string) => `Spotify, 11,99 $, ${date}, Discover ••6334, Payé`,
      spotify: '12 oct. 2026',
    },
  } as const;

  it.each<Exclude<Language, 'en'>>(['es', 'fr'])(
    '%s: the date range page, ranges and picked days',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      await openStack(search());
      await fireEvent.press(screen.getByTestId('filter-date'));
      expect(screen.getByText(words.date)).toBeTruthy();
      expect(screen.getAllByRole('radio').map(labelOf)).toEqual(words.radios);

      await fireEvent.press(screen.getAllByRole('radio')[5]);
      expect(screen.getByRole('button', { name: words.from })).toBeTruthy();
      expect(screen.getByRole('button', { name: words.to })).toBeTruthy();
      expect(screen.getByRole('button', { name: words.apply })).toBeTruthy();
    },
  );

  it.each<Exclude<Language, 'en'>>(['es', 'fr'])(
    '%s: the amount page, its refusal, and the results it gives',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await openStack(search());
      await fireEvent.press(screen.getByTestId('filter-amount'));
      for (const word of words.amount) expect(screen.getByText(word)).toBeTruthy();

      await fireEvent.changeText(inputs()[0], '200');
      await fireEvent.changeText(inputs()[1], '100');
      await fireEvent.press(screen.getByRole('button', { name: words.apply }));
      expect(screen.getByRole('alert').props.children).toBe(words.refusal);
      expect(announce).toHaveBeenCalledWith(words.refusal);
      expect(paths()).toEqual(['/payment-search', '/payment-filter']);

      await fireEvent.changeText(inputs()[0], '100');
      await fireEvent.changeText(inputs()[1], '150');
      await fireEvent.press(screen.getByRole('button', { name: words.apply }));
      const matches = between(10000, 15000);
      expect(screen.getByText(words.results(matches.length, '2023 – 2026'))).toBeTruthy();
      expect(screen.getByRole('button', { name: words.clearFilters })).toBeTruthy();
      // Clear: back to the start, the amount filter gone.
      await fireEvent.press(screen.getByRole('button', { name: words.clearFilters }));
      expect(screen.getByTestId('search-filters')).toBeTruthy();
    },
  );

  it.each<Exclude<Language, 'en'>>(['es', 'fr'])(
    '%s: the Paid from page, and a locked card’s rows named by it',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      publishProStatus({ pro: false, ready: true });
      await openStack(search());
      await fireEvent.press(screen.getByTestId('filter-from'));
      await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
      expect(screen.getByText(words.paidFrom)).toBeTruthy();
      expect(screen.getAllByRole('radio').map(labelOf)).toEqual(words.sources);

      await fireEvent.press(screen.getAllByRole('radio')[2]);
      expect(labelOf(screen.getByTestId('payment-charge-spotify-2026-10-12'))).toBe(
        words.row(words.spotify),
      );
      expect(screen.queryByText(new RegExp(words.cardNotSet))).toBeNull();
    },
  );

  it.each<Exclude<Language, 'en'>>(['es', 'fr'])(
    '%s: a range with nothing in it says so',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      await openStack(search());
      await fireEvent.press(screen.getByTestId('filter-from'));
      await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
      await fireEvent.press(screen.getAllByRole('radio')[4]);
      expect(await screen.findByText(words.none)).toBeTruthy();
      expect(screen.getByRole('button', { name: words.clearFilters })).toBeTruthy();
    },
  );

  it.each<Language>(['en', 'es', 'fr'])(
    '%s: no raw key, unfilled {token} or undefined on any filter page',
    async (language) => {
      setLanguage(language);
      await openStack(search());
      const scan = () => {
        const lines = [
          ...screen.getAllByText(/./, hidden).map(textOf),
          ...screen.queryAllByRole('button').map(labelOf),
          ...screen.queryAllByRole('radio').map(labelOf),
        ];
        expect(lines.length).toBeGreaterThan(5);
        for (const line of lines) {
          expect(line).not.toMatch(/\b(payments|pro|common|ui)\.[a-z]/);
          expect(line).not.toMatch(/\{\w+\}/);
          expect(line).not.toMatch(/undefined|NaN|\[object/);
        }
      };
      const leave = () => act(async () => mockNav.back());
      await fireEvent.press(screen.getByTestId('filter-date'));
      scan();
      await fireEvent.press(screen.getAllByRole('radio')[5]);
      scan();
      await leave();
      await fireEvent.press(screen.getByTestId('filter-amount'));
      await fireEvent.changeText(inputs()[0], '200');
      await fireEvent.changeText(inputs()[1], '100');
      await fireEvent.press(
        screen
          .getAllByRole('button')
          .find((node) => /^(Show payments|Ver pagos|Voir les paiements)$/.test(labelOf(node)))!,
      );
      expect(screen.getByRole('alert')).toBeTruthy();
      scan();
      await leave();
      await fireEvent.press(screen.getByTestId('filter-from'));
      await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
      scan();
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Light and dark.

type Surface = 'surface' | 'card' | 'tint' | 'accent';

/** What a node is drawn on: the nearest ancestor that paints a surface; the page itself otherwise. */
function surfaceOf(node: unknown): Surface {
  for (let at = (node as HostNode).parent; at; at = at.parent) {
    const names = String(at.props.className ?? '');
    if (/(^|\s)bg-card(\s|$)/.test(names)) return 'card';
    if (/(^|\s)bg-tint(\s|$)/.test(names)) return 'tint';
    if (/(^|\s)bg-(accent|control)(\s|$)/.test(names)) return 'accent';
    if (/(^|\s)bg-surface(\s|$)/.test(names)) return 'surface';
  }
  return 'surface';
}

const TEXT_COLOUR = /\btext-(ink|body|muted|accent-ink|tint-ink|money-in|danger|on-control)\b/g;
const TOKEN_OF = {
  'text-ink': 'ink',
  'text-body': 'body',
  'text-muted': 'muted',
  'text-accent-ink': 'accentInk',
  'text-tint-ink': 'tintInk',
  'text-money-in': 'moneyIn',
  'text-danger': 'danger',
  'text-on-control': 'onControl',
} as const;

/** Every colour a line of text is drawn in on the top page, and what it sits on. */
function colourPairs() {
  const found: { colour: keyof typeof TOKEN_OF; surface: Surface; line: string }[] = [];
  for (const node of screen.getAllByText(/./, hidden)) {
    // Only the page in front: the ones under it are the search's own, read in its own suite.
    let covered = false;
    for (let at: HostNode | null = node as unknown as HostNode; at; at = at.parent) {
      if (at.props.accessibilityElementsHidden === true) covered = true;
    }
    if (covered) continue;
    for (const colour of classOf(node).match(TEXT_COLOUR) ?? []) {
      found.push({
        colour: colour as keyof typeof TOKEN_OF,
        surface: surfaceOf(node),
        line: textOf(node),
      });
    }
  }
  return found;
}

describe.each<Scheme>(['light', 'dark'])('in %s', (scheme) => {
  const tokens = buildTokens(scheme);
  const ratio = (colour: keyof typeof TOKEN_OF, surface: Surface) =>
    contrast(tokens[TOKEN_OF[colour]], tokens[surface]);

  beforeEach(() => {
    mockStore.set('skip.theme.mode', scheme);
  });

  const checkPage = (seen: Set<string>) => {
    const pairs = colourPairs();
    expect(pairs.length).toBeGreaterThan(3);
    for (const { colour, surface, line } of pairs) {
      seen.add(`${colour} on ${surface}`);
      expect([line, colour, surface, ratio(colour, surface) >= 4.5]).toEqual([
        line,
        colour,
        surface,
        true,
      ]);
    }
  };

  it('draws every filter page in colours that read on what they sit on, 4.5 to 1', async () => {
    publishProStatus({ pro: false, ready: true });
    const seen = new Set<string>();
    await openStack(search());
    // The start page, with its three filter rows.
    checkPage(seen);

    await press('Date range, Any time');
    checkPage(seen);
    await fireEvent.press(radio('Pick dates'));
    checkPage(seen);
    await act(async () => mockNav.back());

    await press('Amount, Any amount');
    await fireEvent.changeText(inputs()[0], '200');
    await fireEvent.changeText(inputs()[1], '100');
    await press('Show payments');
    expect(screen.getByRole('alert')).toBeTruthy();
    checkPage(seen);
    await act(async () => mockNav.back());

    await press('Paid from, All accounts');
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
    checkPage(seen);
    await fireEvent.press(radio('Visa ••4421'));
    // The results under a filter, with both of their links and the free notice.
    await screen.findByTestId('search-results');
    checkPage(seen);

    expect([...seen]).toEqual(
      expect.arrayContaining([
        'text-ink on card',
        'text-body on card',
        'text-muted on card',
        'text-ink on surface',
        'text-danger on surface',
        'text-accent-ink on surface',
        'text-on-control on accent',
      ]),
    );
  });

  it('draws every link above the results in accent-ink on the page itself, never on a card', async () => {
    await openStack(search());
    await setAmount('100', null);
    for (const testID of [
      'results-clear-filters',
      'results-date-range',
      'results-amount',
      'results-paid-from',
    ]) {
      const link = within(screen.getByTestId(testID)).getAllByText(/./)[0];
      expect([testID, classOf(link).includes('text-accent-ink'), surfaceOf(link)]).toEqual([
        testID,
        true,
        'surface',
      ]);
    }
    expect(ratio('text-accent-ink', 'surface')).toBeGreaterThanOrEqual(4.5);
  });

  it('draws the tick on the chosen range in this mode’s accent ink, 3 to 1 on its card', async () => {
    await openStack(search());
    await press('Date range, Any time');
    const tick = within(radio('Any time')).getByTestId('icon-Check');
    expect(tick.props.iconColor).toBe(tokens.accentInk);
    expect(contrast(tokens.accentInk, tokens.card)).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------------------------
// Large text.

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

/** Every Text drawn on the top page. */
function drawnTexts() {
  const texts: { line: string; props: Json['props'] }[] = [];
  const walk = (node: Json | string, covered: boolean) => {
    if (typeof node === 'string') return;
    const here = covered || node.props.accessibilityElementsHidden === true;
    if (node.type === 'Text' && !here) {
      texts.push({
        line: (node.children ?? []).filter((part) => typeof part === 'string').join(''),
        props: node.props,
      });
    }
    node.children?.forEach((child) => walk(child, here));
  };
  const tree = screen.toJSON() as Tree;
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach((node) => walk(node, false));
  return texts;
}

describe.each<Language>(['en', 'es', 'fr'])('at large text, in %s', (language) => {
  const APPLY = { en: 'Show payments', es: 'Ver pagos', fr: 'Voir les paiements' }[language];
  const CLEAR = { en: 'Clear', es: 'Borrar', fr: 'Effacer' }[language];

  beforeEach(() => {
    setLanguage(language);
    const window = { width: 390, height: 844, scale: 3, fontScale: 3 };
    Dimensions.set({ window, screen: window });
  });

  const ceilings = new Set<number>(Object.values(TEXT_CAP));
  const checkTexts = () => {
    const texts = drawnTexts();
    expect(texts.length).toBeGreaterThan(2);
    for (const { line, props } of texts) {
      expect([line, ceilings.has(props.maxFontSizeMultiplier as number)]).toEqual([line, true]);
      expect([line, props.numberOfLines]).toEqual([line, undefined]);
      expect([line, props.adjustsFontSizeToFit]).toEqual([line, undefined]);
    }
  };
  const named = (name: string) => screen.getByRole('button', { name });

  it('gives every line of every filter page its role’s ceiling, never cut or shrunk', async () => {
    await openStack(search());
    await fireEvent.press(screen.getByTestId('filter-date'));
    checkTexts();
    await fireEvent.press(screen.getAllByRole('radio')[5]);
    checkTexts();
    await act(async () => mockNav.back());
    await fireEvent.press(screen.getByTestId('filter-amount'));
    await fireEvent.changeText(inputs()[0], '200');
    await fireEvent.changeText(inputs()[1], '100');
    await fireEvent.press(named(APPLY));
    checkTexts();
    await act(async () => mockNav.back());
    await fireEvent.press(screen.getByTestId('filter-from'));
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
    checkTexts();
  });

  it('keeps Show payments, Clear and the refusal pinned below the scroll, the fields inside it', async () => {
    await openStack(search());
    await fireEvent.press(screen.getByTestId('filter-amount'));
    await fireEvent.changeText(inputs()[0], '200');
    await fireEvent.changeText(inputs()[1], '100');
    await fireEvent.press(named(APPLY));

    expect(insideScrollOf(named(APPLY))).toBe(false);
    expect(insideScrollOf(named(CLEAR))).toBe(false);
    expect(insideScrollOf(screen.getByRole('alert'))).toBe(false);
    for (const field of inputs()) expect(insideScrollOf(field)).toBe(true);
    // The refusal sits in the footer block with the button that was pressed.
    const footerOf = (node: unknown) => {
      for (let at = node as HostNode | null; at; at = at.parent) {
        if (/\bpb-2 pt-3\b/.test(String(at.props.className ?? ''))) return at;
      }
      return null;
    };
    expect(footerOf(screen.getByRole('alert'))).not.toBeNull();
    expect(footerOf(screen.getByRole('alert'))).toBe(footerOf(named(APPLY)));
  });

  it('keeps Show payments pinned for picked days, with From and To in the scroll', async () => {
    await openStack(search());
    await fireEvent.press(screen.getByTestId('filter-date'));
    await fireEvent.press(screen.getAllByRole('radio')[5]);
    expect(insideScrollOf(named(APPLY))).toBe(false);
    for (const radioNode of screen.getAllByRole('radio')) {
      expect(insideScrollOf(radioNode)).toBe(true);
    }
    const days = screen.getAllByRole('button').filter((node) => /^[^.]+\. \d/.test(labelOf(node)));
    expect(days).toHaveLength(2);
    for (const day of days) expect(insideScrollOf(day)).toBe(true);
  });

  it('keeps the search page’s links to the filters reachable in its scroll', async () => {
    await openStack(search());
    for (const id of ['filter-date', 'filter-amount', 'filter-from']) {
      expect([id, insideScrollOf(screen.getByTestId(id))]).toEqual([id, true]);
    }
    // The field and Cancel stay pinned above it.
    expect(insideScrollOf(screen.getByTestId('search-field'))).toBe(false);
    expect(insideScrollOf(screen.getByTestId('search-cancel'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// VoiceOver.

describe('for VoiceOver', () => {
  it('reads the date range page: a headed page, a radio group, each range with its days and the chosen one', async () => {
    await openStack(search());
    await press('Date range, Any time');
    expect(screen.getByRole('header', { name: 'Date range' })).toBeTruthy();
    expect(screen.getByTestId('date-range-card').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
    expect(
      screen.getAllByRole('radio').map((node) => [labelOf(node), node.props.accessibilityState]),
    ).toEqual([
      ['Any time', { selected: true, checked: true }],
      ['This month, 1 Oct 2026 – 12 Oct 2026', { selected: false, checked: false }],
      ['Last 3 months, 1 Aug 2026 – 12 Oct 2026', { selected: false, checked: false }],
      ['This year, 1 Jan 2026 – 12 Oct 2026', { selected: false, checked: false }],
      ['Last year, 1 Jan 2025 – 31 Dec 2025', { selected: false, checked: false }],
      ['Pick dates', { selected: false, checked: false }],
    ]);
  });

  it('reads picked days as two buttons that say which day they hold, and a Show payments button', async () => {
    await openStack(search());
    await press('Date range, Any time');
    await fireEvent.press(radio('Pick dates'));
    expect(screen.getAllByRole('button').map(labelOf)).toEqual([
      'Go back',
      'From. 1 Oct 2026',
      'To. 12 Oct 2026',
      'Show payments',
    ]);
    expect(screen.getByRole('radio', { name: 'Pick dates', checked: true })).toBeTruthy();
  });

  it('reads the amount page: its title, Clear, Show payments, and a refusal as an alert', async () => {
    await openStack(search());
    await press('Amount, Any amount');
    expect(screen.getByRole('header', { name: 'Amount' })).toBeTruthy();
    expect(screen.getAllByRole('button').map(labelOf)).toEqual([
      'Go back',
      'Clear',
      'Show payments',
    ]);
    expect(screen.queryByRole('alert')).toBeNull();
    await fireEvent.changeText(inputs()[0], '2');
    await fireEvent.changeText(inputs()[1], '1');
    await press('Show payments');
    expect(screen.getByRole('alert')).toBeTruthy();
    // Fixing a field takes the line away, so the next read is not about a mistake already fixed.
    await fireEvent.changeText(inputs()[1], '3');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // The input carries its own name: the words beside it on screen are a separate line to VoiceOver.
  it.each([
    ['en', 'At least', 'At most'],
    ['es', 'Mínimo', 'Máximo'],
    ['fr', 'Minimum', 'Maximum'],
  ] as const)('%s: names the two amount fields for VoiceOver', async (language, least, most) => {
    setLanguage(language);
    await openStack(search());
    await fireEvent.press(screen.getByTestId('filter-amount'));
    const [min, max] = inputs();
    expect(screen.getByLabelText(least)).toBe(min);
    expect(screen.getByLabelText(most)).toBe(max);
  });

  it('reads the Paid from page: a headed radio group of every source, the chosen one marked', async () => {
    await openStack(search());
    await press('Paid from, All accounts');
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
    expect(screen.getByRole('header', { name: 'Paid from' })).toBeTruthy();
    expect(screen.getByTestId('paid-from-card').props.accessibilityRole).toBe('radiogroup');
    expect(
      screen
        .getAllByRole('radio')
        .map((node) => [labelOf(node), node.props.accessibilityState.checked]),
    ).toEqual([
      ['All accounts', true],
      ['Visa ••4421', false],
      ['Discover ••6334', false],
      ['Komal ••7010', false],
      ['Ally', false],
      ['Card not set', false],
    ]);
  });

  it('reads the links above the results as buttons, each with the value it is set to', async () => {
    await openStack(search());
    await setAmount('100', null);
    expect(
      within(screen.getByTestId('results-filters')).getAllByRole('button').map(labelOf),
    ).toEqual(['Date range', 'Amount: $100.00 or more', 'Paid from', 'Clear filters']);
    for (const testID of [
      'results-date-range',
      'results-amount',
      'results-paid-from',
      'results-clear-filters',
    ]) {
      expect([testID, screen.getByTestId(testID).props.hitSlop]).toEqual([
        testID,
        expect.objectContaining({ top: 12, bottom: 12 }),
      ]);
    }
  });
});
