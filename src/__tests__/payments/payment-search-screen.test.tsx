import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Dimensions } from 'react-native';

import PaymentSearchScreen from '@/app/payment-search';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';
import { contrast } from '@/lib/tone';
import { ThemeProvider } from '@/providers/theme-provider';
import { buildTokens, type Scheme } from '@/theme/palette';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Search payments as a person meets it: the real route over the real `usePayments`, the real ledger
 * and the real recent-searches store. Only the network edge (the database), the phone's storage and
 * the router are fakes. The account is one bank statement, written here in whole cents, and every
 * figure on screen is read against it.
 */

// A loaded machine can be slow to settle a page; a wait that is really stuck still fails.
configure({ asyncUtilTimeout: 3000 });

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
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));
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
// Mounting and reading.

let client: QueryClient;

function app(node: ReactElement) {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{node}</ThemeProvider>
    </QueryClientProvider>
  );
}

/** The route, once the account has been read. */
async function openSearch(kind?: string) {
  mockParams = kind ? { kind } : {};
  const view = await render(app(<PaymentSearchScreen />));
  if (!mockHold) await loaded();
  return view;
}

/** Every table read and no read still on its way. */
const loaded = () =>
  waitFor(() => {
    expect(new Set(mockReads).size).toBe(6);
    expect(client.isFetching()).toBe(0);
  });

const type = (text: string) => fireEvent.changeText(screen.getByTestId('search-input'), text);

/** Every result row on screen, in order, as a person is told it. */
const rowLabels = () =>
  screen
    .queryAllByTestId(/^payment-/)
    .filter((node) => !String(node.props.testID).endsWith('-words'))
    .map((node) => String(node.props.accessibilityLabel));

const rowIds = () =>
  screen
    .queryAllByTestId(/^payment-/)
    .map((node) => String(node.props.testID))
    .filter((id) => !id.endsWith('-words'))
    .map((id) => id.replace(/^payment-/, ''));

beforeEach(() => {
  resetLocaleForTests();
  resetProStatusForTests();
  publishProStatus({ pro: true, ready: true });
  mockToday = '2026-10-12';
  mockParams = {};
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

const hidden = { includeHiddenElements: true };
const TODAY = '2026-10-12';
const KEY = 'skip.paymentSearches.user-1';

const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');
const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');
const labelOf = (node: { props: Record<string, unknown> }) => String(node.props.accessibilityLabel);

/** Every line a node draws, top to bottom, each once. */
const linesIn = (node: Parameters<typeof within>[0]) => [
  ...new Set(within(node).getAllByText(/./).map(textOf)),
];
const pageLines = () => [...new Set(screen.getAllByText(/./).map(textOf))];

const seedRecent = (...queries: string[]) => mockStore.set(KEY, JSON.stringify(queries));
const kept = (): string[] | null => {
  const raw = mockStore.get(KEY);
  return raw === undefined ? null : (JSON.parse(raw) as string[]);
};
const row = (id: string) => screen.getByTestId(`payment-${id}`);
/** "$159.90 · 10", the total and count on a year's heading, in whatever language is drawn. */
const yearCaption = (year: number) =>
  textOf(
    within(within(screen.getByTestId(`results-${year}`)).getByRole('header')).getAllByText(/./)[1],
  );
const pushed = () => jest.mocked(router.push).mock.calls.map(([href]) => href);

const ALL = statement(TODAY);
const only = (plan: string, rows: readonly Paid[] = ALL) => rows.filter((p) => p.plan === plan);
const inYear = (rows: readonly Paid[], year: number) =>
  rows.filter((p) => p.date.startsWith(`${year}-`));
const NETFLIX = only('netflix');

// ---------------------------------------------------------------------------------------------
// The statement itself, so a wrong fixture fails here and not as a puzzling figure further down.

describe('the account the screens are read against', () => {
  it('has the design’s Netflix: 62 payments since Sep 2021, 2026 $159.90 · 10, 2025 $191.88 · 12', () => {
    expect(NETFLIX).toHaveLength(62);
    expect(usd(sum(NETFLIX))).toBe('$941.38');
    expect(
      [2026, 2025, 2024, 2023, 2022, 2021].map((year) => [
        year,
        usd(sum(inYear(NETFLIX, year))),
        inYear(NETFLIX, year).length,
      ]),
    ).toEqual([
      [2026, '$159.90', 10],
      [2025, '$191.88', 12],
      [2024, '$185.88', 12],
      [2023, '$179.88', 12],
      [2022, '$167.88', 12],
      [2021, '$55.96', 4],
    ]);
  });
});

// ---------------------------------------------------------------------------------------------
// 4.png: before a search.

describe('before a search (4.png)', () => {
  it('draws the design: the field and Cancel, the tabs, Recent, the three filters, the footer', async () => {
    seedRecent('Car loan', 'AEP', 'Rent');
    await openSearch();
    await screen.findByTestId('recent-searches');

    expect(screen.getByTestId('search-input').props.autoFocus).toBe(true);
    expect(screen.getByTestId('search-input').props.placeholder).toBe('Search payments');
    expect(pageLines()).toEqual([
      'Cancel',
      'All',
      'Bills',
      'Subscriptions',
      'Recent',
      'Car loan',
      'AEP',
      'Rent',
      'Filters',
      'Date range',
      'Any time',
      'Amount',
      'Any amount',
      'Paid from',
      'All accounts',
      'Search across up to 7 years of payments.',
    ]);
    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeTruthy();
    expect(screen.queryByTestId('search-results')).toBeNull();
  });

  it('Cancel goes back', async () => {
    await openSearch();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows no Recent card with nothing kept', async () => {
    await openSearch();
    expect(screen.queryByTestId('recent-searches')).toBeNull();
    expect(screen.getByTestId('search-filters')).toBeTruthy();
  });

  it('starts on the tab it was opened with, and on All for a link that makes no sense', async () => {
    const first = await openSearch('subscription');
    expect(screen.getByRole('tab', { name: 'Subscriptions', selected: true })).toBeTruthy();
    await first.unmount();
    await openSearch('everything');
    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeTruthy();
  });

  it('searches again from a recent search, and × forgets one so the next older takes its place', async () => {
    seedRecent('Rent', 'AEP', 'Car loan', 'Netflix', 'Spotify', 'Hulu', 'Nationwide');
    await openSearch();
    const recent = await screen.findByTestId('recent-searches');
    // Seven are kept, five are shown.
    expect(
      within(recent)
        .getAllByRole('button')
        .map(labelOf)
        .filter((name) => !name.startsWith('Remove')),
    ).toEqual(['Rent', 'AEP', 'Car loan', 'Netflix', 'Spotify']);

    await fireEvent.press(screen.getByRole('button', { name: 'Remove AEP' }));
    expect(
      within(screen.getByTestId('recent-searches'))
        .getAllByRole('button')
        .map(labelOf)
        .filter((name) => !name.startsWith('Remove')),
    ).toEqual(['Rent', 'Car loan', 'Netflix', 'Spotify', 'Hulu']);
    await waitFor(() =>
      expect(kept()).toEqual(['Rent', 'Car loan', 'Netflix', 'Spotify', 'Hulu', 'Nationwide']),
    );

    await fireEvent.press(screen.getByTestId('recent-Rent'));
    expect(screen.getByTestId('search-input').props.value).toBe('Rent');
    await screen.findByTestId('search-results');
    expect(rowIds().every((id) => id.startsWith('charge-rent-'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// 5.png: "netflix".

describe('a search for netflix (5.png)', () => {
  beforeEach(async () => {
    await openSearch();
    await type('netflix');
    await screen.findByText('62 results · 2021 – 2026');
  });

  it('counts every match over the years it spans, with a Date range link', () => {
    expect(screen.getByText('62 results · 2021 – 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Date range' })).toBeTruthy();
    expect(screen.queryByTestId('search-filters')).toBeNull();
    expect(screen.getByText('No matches? Try a shorter word or another year.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('groups the newest two years in full, each with its year total and count to the cent', () => {
    for (const [year, caption, count] of [
      [2026, '$159.90 · 10', 10],
      [2025, '$191.88 · 12', 12],
    ] as const) {
      const group = screen.getByTestId(`results-${year}`);
      expect(within(group).getByText(String(year))).toBeTruthy();
      expect(within(group).getByText(caption)).toBeTruthy();
      expect(
        within(group).getByRole('header', {
          name: `${year}, ${count} payments, ${caption.split(' · ')[0]}`,
        }),
      ).toBeTruthy();
    }
    expect(rowIds()).toEqual([
      ...inYear(NETFLIX, 2026).map((p) => p.id),
      ...inYear(NETFLIX, 2025).map((p) => p.id),
    ]);
    expect(rowIds()).toHaveLength(22);
  });

  it('writes each row as the design does: the name, its date and where from, the amount, Paid', () => {
    expect(rowLabels().slice(0, 3)).toEqual([
      'Netflix, $15.99, 9 Oct 2026, Card not set, Paid',
      'Netflix, $15.99, 9 Sep 2026, Card not set, Paid',
      'Netflix, $15.99, 9 Aug 2026, Card not set, Paid',
    ]);
    const newest = row('charge-netflix-2026-10-09');
    expect(within(newest).getByText('9 Oct 2026 · Card not set')).toBeTruthy();
    expect(within(newest).getByText('$15.99')).toBeTruthy();
    expect(within(newest).getByText('Paid')).toBeTruthy();
    expect(linesIn(newest)).toEqual(['Netflix', '9 Oct 2026 · Card not set', '$15.99', 'Paid']);
    // The Netflix logo, drawn from the plan's own domain.
    expect(within(newest).getByTestId('brand-mark').props.mark).toEqual(
      expect.objectContaining({ name: 'Netflix', domain: 'netflix.com', size: 40 }),
    );
  });

  it('marks the word searched in plum, on the card it sits on', () => {
    const marked = within(row('charge-netflix-2026-10-09')).getByTestId('marked-name');
    const plum = within(marked).getByText('Netflix');
    expect(plum).not.toBe(marked);
    expect(classOf(plum)).toContain('text-tint-ink');
  });

  it('folds 2024 – 2021 into one row of 40, and opens them in place with every year to the cent', async () => {
    expect(screen.queryByTestId('results-2024')).toBeNull();
    const fold = screen.getByRole('button', { name: '2024 – 2021 · 40 more' });
    expect(insideScrollOf(fold)).toBe(true);

    await fireEvent.press(fold);

    expect(screen.queryByTestId('results-folded')).toBeNull();
    // Opened in place: the page, its count and the two years above are what they were.
    expect(screen.getByText('62 results · 2021 – 2026')).toBeTruthy();
    expect([2024, 2023, 2022, 2021].map(yearCaption)).toEqual([
      '$185.88 · 12',
      '$179.88 · 12',
      '$167.88 · 12',
      '$55.96 · 4',
    ]);
    expect(rowIds()).toEqual(NETFLIX.map((p) => p.id));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('folds the older years again for a new search', async () => {
    await fireEvent.press(screen.getByTestId('results-folded'));
    expect(screen.queryByTestId('results-folded')).toBeNull();

    await type('netfli');
    await screen.findByText('62 results · 2021 – 2026');
    expect(screen.getByRole('button', { name: '2024 – 2021 · 40 more' })).toBeTruthy();
    expect(rowIds()).toHaveLength(22);
  });

  it('folds them again when the tab changes', async () => {
    await fireEvent.press(screen.getByTestId('results-folded'));
    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    expect(screen.getByRole('button', { name: '2024 – 2021 · 40 more' })).toBeTruthy();
  });

  it('clears the field with its own button and returns to the start', async () => {
    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByTestId('search-input').props.value).toBe('');
    expect(screen.getByTestId('search-filters')).toBeTruthy();
    expect(screen.queryByTestId('search-results')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// Opening a row.

describe('opening a result', () => {
  const OPENS = [
    ['a subscription', 'netflix', 'charge-netflix-2026-10-09', '/subscription/[id]', 'netflix'],
    ['a cancelled subscription', 'hulu', 'charge-hulu-2024-06-14', '/subscription/[id]', 'hulu'],
    ['a bill', 'aep', 'charge-aep-2026-09-22', '/bill/[id]', 'aep'],
    ['a loan’s instalment', 'car loan', 'charge-car-2026-09-28', '/loan/[id]', 'car'],
    ['a loan’s extra payment', 'car loan', 'payoff-car-extra', '/loan/[id]', 'car'],
  ] as const;

  it.each(OPENS)(
    '%s opens its own page and never an add form',
    async (_, query, id, path, plan) => {
      await openSearch();
      await type(query);
      await screen.findByTestId('search-results');
      await fireEvent.press(row(id));

      expect(pushed()).toEqual([{ pathname: path, params: { id: plan } }]);
      expect(String((pushed()[0] as { pathname: string }).pathname)).not.toMatch(/\/add-/);
      expect(kept()?.[0]).toBe(query);
    },
  );

  it('says what a loan’s extra payment was, and where it came from', async () => {
    await openSearch();
    await type('car loan');
    await screen.findByTestId('search-results');
    expect(labelOf(row('payoff-car-extra'))).toBe(
      'Car loan, $1,000.00, 10 Sep 2025, Komal ••7010, Extra payment',
    );
    expect(labelOf(row('charge-car-2026-09-28'))).toBe(
      'Car loan, $554.00, 28 Sep 2026, Visa ••4421, Paid',
    );
  });

  it('keeps the search when a result is opened, ahead of the ones kept before', async () => {
    seedRecent('Car loan', 'AEP', 'Rent');
    await openSearch();
    await screen.findByTestId('recent-searches');
    await type('netflix');
    await screen.findByTestId('search-results');
    await fireEvent.press(row('charge-netflix-2026-10-09'));
    await waitFor(() => expect(kept()).toEqual(['netflix', 'Car loan', 'AEP', 'Rent']));
  });
});

// ---------------------------------------------------------------------------------------------
// Recent searches kept on the phone.

describe('recent searches', () => {
  it('survive the page being closed and opened again', async () => {
    const first = await openSearch();
    await type('netflix');
    await screen.findByTestId('search-results');
    await fireEvent.press(row('charge-netflix-2026-10-09'));
    await waitFor(() => expect(kept()).toEqual(['netflix']));
    await first.unmount();

    await openSearch();
    const recent = await screen.findByTestId('recent-searches');
    expect(within(recent).getByRole('button', { name: 'netflix' })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('recent-netflix'));
    expect(await screen.findByText('62 results · 2021 – 2026')).toBeTruthy();
  });

  it('are kept for the keyboard’s Search, never per letter, never blank', async () => {
    await openSearch();
    for (const text of ['n', 'ne', 'net']) await type(text);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    await type('   ');
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    await type('  Netflix ');
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    await waitFor(() => expect(kept()).toEqual(['Netflix']));
  });

  it('keep one entry per spelling, newest first, ten at most', async () => {
    seedRecent('a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10');
    await openSearch();
    await screen.findByTestId('recent-searches');

    await type('NEW');
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    await waitFor(() => expect(kept()?.[0]).toBe('NEW'));
    expect(kept()).toEqual(['NEW', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']);

    await type('new ');
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    await waitFor(() => expect(kept()?.[0]).toBe('new'));
    expect(kept()).toHaveLength(10);
    expect(kept()?.filter((query) => query.toLowerCase() === 'new')).toEqual(['new']);
  });

  it('are one person’s: another account on the phone sees its own', async () => {
    mockStore.set('skip.paymentSearches.user-2', JSON.stringify(['Their rent']));
    seedRecent('Mine');
    const mine = await openSearch();
    await screen.findByTestId('recent-searches');
    expect(screen.queryByText('Their rent')).toBeNull();
    await mine.unmount();

    mockUserId = 'user-2';
    await openSearch();
    await screen.findByText('Their rent');
    expect(screen.queryByText('Mine')).toBeNull();
  });

  it('are none when nobody is signed in, and nothing is written', async () => {
    mockUserId = null;
    seedRecent('Mine');
    await render(app(<PaymentSearchScreen />));
    await type('netflix');
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    expect(AsyncStorage.getItem).not.toHaveBeenCalledWith(KEY);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(KEY, expect.anything());
  });

  it('read as empty when the phone refuses the read, and the page still works', async () => {
    seedRecent('Car loan');
    mockStorage.refuseRead = true;
    await openSearch();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(screen.queryByTestId('recent-searches')).toBeNull();
    expect(screen.getByTestId('search-filters')).toBeTruthy();

    await type('netflix');
    await screen.findByText('62 results · 2021 – 2026');
    await fireEvent.press(row('charge-netflix-2026-10-09'));
    expect(pushed()).toEqual([{ pathname: '/subscription/[id]', params: { id: 'netflix' } }]);
  });

  it('are still shown for this visit when the phone refuses the write', async () => {
    mockStorage.refuseWrite = true;
    await openSearch();
    await type('aep');
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    await type('');
    expect(
      await within(await screen.findByTestId('recent-searches')).findByRole('button', {
        name: 'aep',
      }),
    ).toBeTruthy();
    expect(kept()).toBeNull();
  });

  it.each([
    ['not json at all', 'not json{', []],
    ['an object', '{"a":1}', []],
    ['a number', '7', []],
    ['empty', '', []],
    [
      'strings mixed with junk, blanks and a repeat',
      '[1,null,"  ","Rent","rent"," AEP "]',
      ['Rent', 'AEP'],
    ],
  ])('read %s as %j', async (_, stored, shown) => {
    mockStore.set(KEY, stored);
    await openSearch();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(KEY));
    if (shown.length === 0) {
      expect(screen.queryByTestId('recent-searches')).toBeNull();
      return;
    }
    const recent = await screen.findByTestId('recent-searches');
    expect(
      within(recent)
        .getAllByRole('button')
        .map(labelOf)
        .filter((name) => !name.startsWith('Remove')),
    ).toEqual(shown);
  });
});

// ---------------------------------------------------------------------------------------------
// The tabs and the names a payment can be found by.

describe('the tabs and the names', () => {
  it('Netflix is no bill, and is a subscription', async () => {
    await openSearch('bill');
    await type('netflix');
    expect(await screen.findByText('No payments match')).toBeTruthy();
    expect(screen.getByTestId('art-noResults')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    expect(screen.getByText('62 results · 2021 – 2026')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'All' }));
    expect(screen.getByText('62 results · 2021 – 2026')).toBeTruthy();
  });

  it('a car loan counts as a bill, its extra payment included', async () => {
    await openSearch('bill');
    await type('car loan');
    await screen.findByTestId('search-results');
    const loan = only('car');
    expect(loan).toHaveLength(31);
    expect(screen.getByText('31 results · 2024 – 2026')).toBeTruthy();
    expect(yearCaption(2025)).toBe(
      `${usd(sum(inYear(loan, 2025)))} · ${inYear(loan, 2025).length}`,
    );
  });

  it('finds a payment by the name it was recorded under and by the plan’s name now', async () => {
    await openSearch();
    await type('fios');
    await screen.findByTestId('search-results');
    const recorded = ALL.filter((p) => p.plan === 'internet' && p.name === 'Fios');
    expect(recorded).toHaveLength(24);
    expect(screen.getByText('24 results · 2023 – 2024')).toBeTruthy();

    await type('internet');
    const everyCharge = only('internet');
    expect(everyCharge).toHaveLength(45);
    await screen.findByText('45 results · 2023 – 2026');
    // A charge recorded as "Fios" is listed as Fios: the name it went out under.
    await fireEvent.press(screen.getByTestId('results-folded'));
    expect(rowLabels()).toContain('Fios, $79.99, 18 Dec 2024, Komal ••7010, Paid');
    expect(within(row('charge-internet-2024-12-18')).queryByTestId('marked-name')).toBeNull();
  });

  it('finds a word a little off, as search does everywhere', async () => {
    await openSearch();
    await type('netflx');
    expect(await screen.findByText('62 results · 2021 – 2026')).toBeTruthy();
  });

  it('shows what has no match plainly, never a blank page', async () => {
    await openSearch();
    await type('zzzz');
    expect(await screen.findByText('No payments match')).toBeTruthy();
    expect(screen.getByText('No matches? Try a shorter word or another year.')).toBeTruthy();
  });
});

type Host = { type: unknown; parent: Host | null; props: Record<string, any> };

/** The scroll view a node is drawn in, or null when it is pinned outside it. */
function scrollOf(node: Host | null): Host | null {
  for (let at = node; at; at = at.parent) {
    if (String(at.type) === 'RCTScrollView') return at;
  }
  return null;
}
function insideScrollOf(node: unknown) {
  return scrollOf(node as Host) !== null;
}

// ---------------------------------------------------------------------------------------------
// Free and Pro: the figures are whole, only the rows stop at the floor.

describe('free and Pro', () => {
  const FLOOR = '2026-07-15';
  const free = () => publishProStatus({ pro: false, ready: true });
  const NOTICE =
    'Older history is saved. Free shows the last 90 days. Skip Pro shows up to 7 years.';

  it('free: every count and total is whole, rows stop at 15 Jul, and the notice says why', async () => {
    free();
    await openSearch();
    await type('netflix');
    await screen.findByText('62 results · 2021 – 2026');

    expect(yearCaption(2026)).toBe('$159.90 · 10');
    const listed = NETFLIX.filter((p) => p.date >= FLOOR);
    expect(listed.map((p) => p.date)).toEqual(['2026-10-09', '2026-09-09', '2026-08-09']);
    expect(rowIds()).toEqual(listed.map((p) => p.id));
    expect(screen.queryByTestId('results-2025')).toBeNull();
    expect(screen.queryByTestId('results-folded')).toBeNull();
    expect(screen.getByRole('button', { name: NOTICE })).toBeTruthy();
    expect(screen.getByText('No matches? Try a shorter word or another year.')).toBeTruthy();
  });

  it('free: the notice opens the history explainer', async () => {
    free();
    await openSearch();
    await type('netflix');
    await fireEvent.press(await screen.findByRole('button', { name: NOTICE }));
    expect(pushed()).toEqual([{ pathname: '/pro-feature', params: { id: 'history' } }]);
  });

  it('free: a search that only older payments answer counts them all, lists none, and says why', async () => {
    free();
    await openSearch();
    await type('hulu');
    const hulu = only('hulu');
    expect(hulu).toHaveLength(30);
    await screen.findByText('30 results · 2022 – 2024');
    expect(rowIds()).toEqual([]);
    expect(screen.queryByText('No payments match')).toBeNull();
    expect(screen.getByRole('button', { name: NOTICE })).toBeTruthy();
  });

  it('free: says what it searches, and what Pro would', async () => {
    free();
    await openSearch();
    expect(
      screen.getByText('Search your last 90 days of payments. Pro searches up to 7 years.'),
    ).toBeTruthy();
  });

  it('Pro: the same searches list back to 2020, with no notice', async () => {
    await openSearch();
    await type('hulu');
    await screen.findByText('30 results · 2022 – 2024');
    expect(rowIds()).toEqual(
      [...inYear(only('hulu'), 2024), ...inYear(only('hulu'), 2023)].map((p) => p.id),
    );
    expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();
    expect(screen.getByRole('button', { name: '2022 · 12 more' })).toBeTruthy();
  });

  it('while Pro is not yet known it reads as Pro, then drops to the floor when free is known', async () => {
    resetProStatusForTests();
    await openSearch();
    await type('netflix');
    await screen.findByText('62 results · 2021 – 2026');
    expect(rowIds()).toHaveLength(22);
    expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();

    await act(async () => publishProStatus({ pro: false, ready: true }));
    expect(rowIds()).toHaveLength(3);
    expect(screen.getByRole('button', { name: NOTICE })).toBeTruthy();
    expect(screen.getByText('62 results · 2021 – 2026')).toBeTruthy();

    await act(async () => publishProStatus({ pro: true, ready: true }));
    expect(rowIds()).toHaveLength(22);
  });
});

// ---------------------------------------------------------------------------------------------
// Reading the account, and failing to.

describe('while the account is read and when it cannot be', () => {
  it('draws a skeleton for a search made before the account has been read, never "nothing"', async () => {
    mockHold = true;
    await openSearch();
    expect(screen.getByTestId('search-filters')).toBeTruthy();

    await type('netflix');
    expect(screen.getByTestId('skeleton-list')).toBeTruthy();
    expect(screen.queryByText('No payments match')).toBeNull();

    mockHold = false;
    await act(async () => {
      for (const answer of mockHeld.splice(0)) answer();
    });
    expect(await screen.findByText('62 results · 2021 – 2026')).toBeTruthy();
    expect(screen.queryByTestId('skeleton-list')).toBeNull();
  });

  it.each(['charges', 'cards', 'bills', 'loan_payoffs'])(
    'a failed read of %s is the one failure line with Try again, never "no payments"',
    async (table) => {
      mockFailing.add(table);
      await openSearch();
      await type('netflix');
      expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryByText('No payments match')).toBeNull();
      expect(rowIds()).toEqual([]);

      mockFailing.clear();
      await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('62 results · 2021 – 2026')).toBeTruthy();
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    },
  );

  it('says nothing of a failed read until a search needs it: the start page is still there', async () => {
    mockFailing.add('charges');
    await openSearch();
    expect(screen.getByTestId('search-filters')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// Languages.

describe('in Spanish and French', () => {
  const WORDS = {
    es: {
      start: [
        'Cancelar',
        'Todos',
        'Facturas',
        'Suscripciones',
        'Recientes',
        'Car loan',
        'Filtros',
        'Rango de fechas',
        'Todas las fechas',
        'Importe',
        'Cualquier importe',
        'Pagado con',
        'Todas las cuentas',
        'La búsqueda abarca hasta 7 años de pagos.',
      ],
      results: '62 resultados · 2021 – 2026',
      caption: '$159.90 · 10',
      header: '2026, 10 pagos, $159.90',
      first: 'Netflix, $15.99, 9 oct 2026, Sin tarjeta, Pagado',
      fold: '2024 – 2021 · 40 más',
      none: 'Ningún pago coincide',
      noMatches: '¿No lo encuentras? Prueba con una palabra más corta u otro año.',
      freeFooter: 'Busca en tus pagos de los últimos 90 días. Con Pro, hasta 7 años.',
      notice:
        'Tu historial anterior está guardado. Gratis muestra los últimos 90 días. Skip Pro muestra hasta 7 años.',
    },
    fr: {
      start: [
        'Annuler',
        'Tous',
        'Factures',
        'Abonnements',
        'Récentes',
        'Car loan',
        'Filtres',
        'Période',
        'Toutes les dates',
        'Montant',
        'Tous les montants',
        'Payé avec',
        'Tous les comptes',
        'La recherche couvre jusqu’à 7 ans de paiements.',
      ],
      results: '62 résultats · 2021 – 2026',
      caption: '159,90 $ · 10',
      header: '2026, 10 paiements, 159,90 $',
      first: 'Netflix, 15,99 $, 9 oct. 2026, Aucune carte, Payé',
      fold: '2024 – 2021 · 40 de plus',
      none: 'Aucun paiement ne correspond',
      noMatches: 'Rien trouvé ? Essaie un mot plus court ou une autre année.',
      freeFooter: 'Cherche parmi tes paiements des 90 derniers jours. Avec Pro, jusqu’à 7 ans.',
      notice:
        'Ton historique plus ancien est conservé. Gratuit affiche les 90 derniers jours. Skip Pro affiche jusqu’à 7 ans.',
    },
  } as const;

  it.each<Exclude<Language, 'en'>>(['es', 'fr'])(
    '%s: the start page, the results and the fold',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      seedRecent('Car loan');
      await openSearch();
      await screen.findByTestId('recent-searches');
      expect(pageLines()).toEqual(words.start);

      await type('netflix');
      await screen.findByText(words.results);
      expect(yearCaption(2026)).toBe(words.caption);
      expect(screen.getByRole('header', { name: words.header })).toBeTruthy();
      expect(rowLabels()[0]).toBe(words.first);
      expect(screen.getByRole('button', { name: words.fold })).toBeTruthy();
      expect(screen.getByText(words.noMatches)).toBeTruthy();
    },
  );

  it.each<Exclude<Language, 'en'>>(['es', 'fr'])(
    '%s: nothing found, and what free searches',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      publishProStatus({ pro: false, ready: true });
      await openSearch();
      expect(screen.getByText(words.freeFooter)).toBeTruthy();

      await type('netflix');
      await screen.findByText(words.results);
      expect(screen.getByRole('button', { name: words.notice })).toBeTruthy();

      await type('zzzz');
      expect(await screen.findByText(words.none)).toBeTruthy();
    },
  );

  it.each<Language>(['en', 'es', 'fr'])(
    '%s: no raw key, unfilled {token} or undefined, drawn or read aloud',
    async (language) => {
      setLanguage(language);
      publishProStatus({ pro: false, ready: true });
      seedRecent('Car loan');
      await openSearch();
      await screen.findByTestId('recent-searches');
      const scan = (least = 10) => {
        const lines = [
          ...screen.getAllByText(/./, hidden).map(textOf),
          ...screen.queryAllByRole('button').map(labelOf),
          ...screen.queryAllByRole('header').map(labelOf),
        ];
        expect(lines.length).toBeGreaterThan(least);
        for (const line of lines) {
          expect(line).not.toMatch(/\b(payments|pro|common|ui)\.[a-z]/);
          expect(line).not.toMatch(/\{\w+\}/);
          expect(line).not.toMatch(/undefined|NaN|\[object/);
        }
      };
      scan();
      await type('hulu');
      await screen.findByTestId('search-results');
      scan();
      await type('zzzz');
      await screen.findByTestId('search-empty');
      scan(5);
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Light and dark.

type Surface = 'surface' | 'card' | 'tint' | 'accent';

/** What a node is drawn on: the nearest ancestor that paints a surface; the page itself otherwise. */
function surfaceOf(node: unknown): Surface {
  for (let at = (node as Host).parent; at; at = at.parent) {
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

/** Every colour a line of text is drawn in on this screen, and what it sits on. */
function colourPairs() {
  const found: { colour: keyof typeof TOKEN_OF; surface: Surface; line: string }[] = [];
  for (const node of screen.getAllByText(/./, hidden)) {
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

  /** The start page, a result page, a page of nothing and a free page with its notice. */
  async function eachPage(check: () => void) {
    seedRecent('Car loan');
    mockStore.set('skip.theme.mode', scheme);
    await openSearch();
    await screen.findByTestId('recent-searches');
    check();
    await type('netflix');
    await screen.findByTestId('search-results');
    check();
    await type('zzzz');
    await screen.findByTestId('search-empty');
    check();
    await act(async () => publishProStatus({ pro: false, ready: true }));
    await type('hulu');
    await screen.findByTestId('search-results');
    expect(screen.getByText('Older history is saved')).toBeTruthy();
    check();
  }

  it('draws the page in this mode’s own colours', async () => {
    await eachPage(() => {
      expect(screen.queryAllByTestId('icon-Search')[0].props.iconColor).toBe(tokens.muted);
    });
    expect(screen.getAllByTestId('icon-History')[0].props.iconColor).toBe(tokens.muted);
  });

  it('draws every line in a colour that reads on what it sits on, 4.5 to 1', async () => {
    const seen = new Set<string>();
    await eachPage(() => {
      for (const { colour, surface, line } of colourPairs()) {
        seen.add(`${colour} on ${surface}`);
        expect([line, colour, surface, ratio(colour, surface) >= 4.5]).toEqual([
          line,
          colour,
          surface,
          true,
        ]);
      }
    });
    // The pages do use these, so the check cannot pass on an empty set.
    expect([...seen]).toEqual(
      expect.arrayContaining([
        'text-ink on card',
        'text-ink on surface',
        'text-muted on card',
        'text-muted on surface',
        'text-tint-ink on card',
        'text-accent-ink on surface',
      ]),
    );
  });

  it('draws Cancel and the Date range link in accent-ink on the page itself, never on a card', async () => {
    seedRecent('Car loan');
    mockStore.set('skip.theme.mode', scheme);
    await openSearch();
    const cancel = await screen.findByText('Cancel');
    expect(classOf(cancel)).toContain('text-accent-ink');
    expect(surfaceOf(cancel)).toBe('surface');

    await type('netflix');
    await screen.findByTestId('search-results');
    const link = within(screen.getByTestId('results-date-range')).getByText('Date range');
    expect(classOf(link)).toContain('text-accent-ink');
    expect(surfaceOf(link)).toBe('surface');

    // The ratio of the colour really drawn, on the surface it is really drawn on.
    expect(ratio('text-accent-ink', 'surface')).toBeGreaterThanOrEqual(4.5);
    // A row's own lines do sit on the card, so this reads the card where it is one.
    expect(surfaceOf(within(row('charge-netflix-2026-10-09')).getByText('Paid'))).toBe('card');
  });

  it('draws the plum mark on the searched word with the ink made for the card', async () => {
    mockStore.set('skip.theme.mode', scheme);
    await openSearch();
    await type('netflix');
    await screen.findByTestId('search-results');
    const plum = within(
      within(row('charge-netflix-2026-10-09')).getByTestId('marked-name'),
    ).getByText('Netflix');
    expect(classOf(plum)).toContain('text-tint-ink');
    expect(surfaceOf(plum)).toBe('card');
    expect(ratio('text-tint-ink', 'card')).toBeGreaterThanOrEqual(4.5);
  });

  it('rings the focused field in a colour that stands out from the page and from the field, 3 to 1', async () => {
    mockStore.set('skip.theme.mode', scheme);
    await openSearch();
    expect(classOf(screen.getByTestId('search-field'))).toContain('border-accent-ink');
    expect(contrast(tokens.accentInk, tokens.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(tokens.accentInk, tokens.card)).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------------------------
// Large text.

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

/** Every Text drawn, with its line. */
function drawnTexts() {
  const texts: { line: string; props: Json['props'] }[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    if (node.type === 'Text') {
      texts.push({
        line: (node.children ?? []).filter((part) => typeof part === 'string').join(''),
        props: node.props,
      });
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Tree;
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return texts;
}

describe('at large text', () => {
  const layout = (node: Parameters<typeof fireEvent>[0], width: number) =>
    fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });

  beforeEach(() => {
    const window = { width: 390, height: 844, scale: 3, fontScale: 3 };
    Dimensions.set({ window, screen: window });
  });

  async function eachPage(check: () => void) {
    seedRecent('Car loan');
    await openSearch();
    await screen.findByTestId('recent-searches');
    check();
    await type('netflix');
    await screen.findByTestId('search-results');
    await fireEvent.press(screen.getByTestId('results-folded'));
    check();
    await type('zzzz');
    await screen.findByTestId('search-empty');
    check();
    await act(async () => publishProStatus({ pro: false, ready: true }));
    await type('hulu');
    await screen.findByTestId('search-results');
    check();
  }

  it('gives every line its role’s ceiling and never cuts or shrinks one', async () => {
    const ceilings = new Set<number>(Object.values(TEXT_CAP));
    await eachPage(() => {
      const { length } = drawnTexts();
      expect(length).toBeGreaterThan(4);
      for (const { line, props } of drawnTexts()) {
        expect([line, ceilings.has(props.maxFontSizeMultiplier as number)]).toEqual([line, true]);
        expect([line, props.numberOfLines]).toEqual([line, undefined]);
        expect([line, props.adjustsFontSizeToFit]).toEqual([line, undefined]);
      }
    });
  });

  it('keeps the field, Cancel and the tabs pinned above the scroll, and all else reachable inside it', async () => {
    await eachPage(() => {
      for (const id of ['search-field', 'search-cancel', 'kind-tabs']) {
        expect([id, insideScrollOf(screen.getByTestId(id))]).toEqual([id, false]);
      }
    });

    // Reachable by scrolling: the start page, every part of the results, and the notice.
    await type('');
    expect(insideScrollOf(screen.getByTestId('search-start'))).toBe(true);
    expect(insideScrollOf(screen.getByTestId('recent-searches'))).toBe(true);
    expect(insideScrollOf(screen.getByTestId('search-filters'))).toBe(true);
    expect(
      insideScrollOf(
        screen.getByText('Search your last 90 days of payments. Pro searches up to 7 years.'),
      ),
    ).toBe(true);
    await type('hulu');
    for (const node of [
      screen.getByTestId('results-date-range'),
      screen.getByRole('button', { name: /^Older history is saved/ }),
      screen.getByText('No matches? Try a shorter word or another year.'),
    ]) {
      expect(insideScrollOf(node)).toBe(true);
    }
  });

  it('puts a row’s amount and status under its name once a word of the name cannot sit beside them', async () => {
    await openSearch();
    await type('netflix');
    await screen.findByTestId('search-results');
    const newest = row('charge-netflix-2026-10-09');
    expect(linesIn(newest)).toEqual(['Netflix', '9 Oct 2026 · Card not set', '$15.99', 'Paid']);

    await layout(newest, 300);
    await layout(within(newest).getByTestId('fit-slot-name', hidden), 90);
    await layout(within(newest).getByTestId('fit-copy-name', hidden), 140);
    // Name, then the amount, then when and from where, then where it stands: nothing lost.
    expect(linesIn(row('charge-netflix-2026-10-09'))).toEqual([
      'Netflix',
      '$15.99',
      '9 Oct 2026 · Card not set',
      'Paid',
    ]);
    // The row beside it, with room, is untouched.
    expect(linesIn(row('charge-netflix-2026-09-09'))).toEqual([
      'Netflix',
      '9 Sep 2026 · Card not set',
      '$15.99',
      'Paid',
    ]);
  });

  it('lets the tabs and a filter’s value wrap rather than cut a word', async () => {
    await openSearch();
    expect(classOf(screen.getByTestId('kind-tabs'))).toContain('flex-wrap');
    const filter = screen.getByRole('button', { name: 'Date range, Any time' });
    const names = within(filter)
      .getAllByText(/./)
      .map((node) => classOf(node.parent as unknown as { props: Record<string, unknown> }));
    expect(names.some((name) => name.includes('flex-wrap'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// VoiceOver.

describe('for VoiceOver', () => {
  const nameOf = (node: Parameters<typeof within>[0]) =>
    String((node as { props: Record<string, unknown> }).props.accessibilityLabel ?? '') ||
    within(node).queryAllByText(/./).map(textOf).join(' ');

  it('reads the start page: a search field, Cancel, tabs with the chosen one, headed groups', async () => {
    seedRecent('Car loan', 'AEP');
    await openSearch();
    await screen.findByTestId('recent-searches');

    expect(screen.getByRole('search', { name: 'Search payments' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByTestId('kind-tabs').props.accessibilityRole).toBe('tablist');
    expect(
      within(screen.getByTestId('kind-tabs'))
        .getAllByRole('tab')
        .map((tab) => [labelOf(tab), tab.props.accessibilityState.selected]),
    ).toEqual([
      ['All', true],
      ['Bills', false],
      ['Subscriptions', false],
    ]);
    expect(screen.getAllByRole('header').map(labelOf)).toEqual(['Recent', 'Filters']);
    expect(
      within(screen.getByTestId('recent-searches')).getAllByRole('button').map(labelOf),
    ).toEqual(['Car loan', 'Remove Car loan', 'AEP', 'Remove AEP']);
    expect(
      within(screen.getByTestId('search-filters')).getAllByRole('button').map(labelOf),
    ).toEqual(['Date range, Any time', 'Amount, Any amount', 'Paid from, All accounts']);
  });

  it('moves the chosen tab, and says so', async () => {
    await openSearch();
    await fireEvent.press(screen.getByRole('tab', { name: 'Bills' }));
    expect(screen.getByRole('tab', { name: 'Bills', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'All', selected: false })).toBeTruthy();
  });

  it('reads the results: a count, each year with its figures, each row as one sentence', async () => {
    await openSearch();
    await type('netflix');
    await screen.findByTestId('search-results');
    expect(screen.getAllByRole('header').map(labelOf)).toEqual([
      '2026, 10 payments, $159.90',
      '2025, 12 payments, $191.88',
    ]);
    expect(rowLabels()[0]).toBe('Netflix, $15.99, 9 Oct 2026, Card not set, Paid');
    for (const node of screen
      .queryAllByTestId(/^payment-/)
      .filter((candidate) => !String(candidate.props.testID).endsWith('-words'))) {
      expect(node.props.accessibilityRole).toBe('button');
    }
    expect(screen.getByRole('button', { name: '2024 – 2021 · 40 more' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Date range' })).toBeTruthy();
  });

  it('gives every button and tab a name, and every small target room around it', async () => {
    seedRecent('Car loan');
    publishProStatus({ pro: false, ready: true });
    await openSearch();
    await screen.findByTestId('recent-searches');
    const check = () => {
      const targets = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('tab')];
      expect(targets.length).toBeGreaterThan(5);
      for (const target of targets) {
        expect([String(target.props.testID), nameOf(target).trim() !== '']).toEqual([
          String(target.props.testID),
          true,
        ]);
      }
    };
    check();
    await type('hulu');
    await screen.findByTestId('search-results');
    check();

    // The × is 44pt square; Cancel and the results' links have room around the word.
    await type('');
    expect(classOf(screen.getByTestId('forget-Car loan'))).toMatch(/\bh-11 w-11\b/);
    expect(screen.getByTestId('search-cancel').props.hitSlop).toEqual(
      expect.objectContaining({ top: 10, bottom: 10 }),
    );
    await type('hulu');
    expect(screen.getByTestId('results-date-range').props.hitSlop).toEqual(
      expect.objectContaining({ top: 12, bottom: 12 }),
    );
  });

  it('announces in Spanish: the field, the tabs, the filters and the years', async () => {
    setLanguage('es');
    await openSearch();
    expect(screen.getByRole('search', { name: 'Buscar pagos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rango de fechas, Todas las fechas' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Importe, Cualquier importe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pagado con, Todas las cuentas' })).toBeTruthy();
    await type('netflix');
    await screen.findByTestId('search-results');
    expect(screen.getAllByRole('header').map(labelOf)[0]).toBe('2026, 10 pagos, $159.90');
  });
});
