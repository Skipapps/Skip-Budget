import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Dimensions } from 'react-native';

import type { ChargeRow } from '@/api/charges';
import type { BillRow, SubscriptionRow } from '@/api/queries';
import PaymentHistoryScreen from '@/app/payment-history';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { pickPayment } from '@/lib/payment-pick';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';
import { contrast } from '@/lib/tone';
import { ThemeProvider } from '@/providers/theme-provider';
import { buildTokens, mix, type Scheme } from '@/theme/palette';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Payment history (3.png) as a person meets it, on 12 Oct 2026. The page's own hook, `usePayments`,
 * runs for real over the real ledger; only the five reads under it (bills, subscriptions, charges,
 * loan payoffs, the names of cards and accounts) are fakes, held in `mockWorld`. Whether the account
 * is free or Pro is the app's own store, so the 90-day floor is the real one (15 Jul 2026).
 *
 * The account is the design's: four bills and three subscriptions charged on their days, and the six
 * years before as All years (2.png) gives them, so every figure is the design's, to the cent.
 *
 *   2026 All            $18,548.81 · 67 payments · Avg / month $1,854.88 (÷ 10)
 *   2026 Bills          $18,172.00 · 38 · $1,817.20
 *   2026 Subscriptions  $376.81 · 29 · $37.68
 *   October $1,205.99 (4 rows) · September $1,922.98 (7 rows) · Jan to Aug $1,927.48 each
 *   2025                $22,407.36 · 84 · $1,867.28
 */

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
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
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
// Reanimated cannot start under Jest; the page only needs to know a skeleton is drawn.
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
  return { BillMark: () => createElement(View, { testID: 'bill-mark' }) };
});
jest.mock('@/components/brands/brand-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { BrandMark: () => createElement(View, { testID: 'brand-mark' }) };
});
// The failure line imports Sentry, whose timer would keep Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));

// The real theme, over a phone that stores its choice.
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
let mockMode: Scheme = 'light';
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(mockMode)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

let mockToday = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));
// What the export buttons ask; what `usePayments` reads is the store `publishProStatus` fills.
let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

// The pull is the app's own refresh, which runs the sweep; it needs a QueryClient of its own.
const mockRefreshAll = jest.fn(() => Promise.resolve());
let mockRefreshing = false;
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: mockRefreshAll, refreshing: mockRefreshing }),
}));

// The five reads under `usePayments`, as fake queries on one shared world: a test loads, fails and
// refetches them as the network would, and the page re-reads when it changes.
type ReadName = 'bills' | 'subscriptions' | 'charges' | 'payoffs' | 'labels';
type World = {
  data: Data;
  loading: ReadName | null;
  failed: ReadName | null;
  /** Told of every refetch, with the read it was for. */
  refetched: (name: ReadName) => void;
};
let mockWorld: World = { data: {}, loading: null, failed: null, refetched: () => {} };
const mockListeners = new Set<() => void>();
const mockSubscribe = (listener: () => void) => {
  mockListeners.add(listener);
  return () => {
    mockListeners.delete(listener);
  };
};
function mockChange(next: Partial<World>) {
  mockWorld = { ...mockWorld, ...next };
  mockListeners.forEach((listener) => listener());
}
const mockNoRows: readonly never[] = Object.freeze([]);
function mockQuery(name: ReadName, rows: unknown) {
  const world = mockWorld;
  return {
    data: world.loading === name || world.failed === name ? undefined : rows,
    isLoading: world.loading === name,
    isError: world.failed === name,
    // The world as it is when the page asks, not as it was drawn.
    refetch: () => mockWorld.refetched(name),
  };
}
const mockLabels = new Map([
  ['acct-komal-7010', 'Komal ••7010'],
  ['card-discover-6334', 'Discover ••6334'],
]);

jest.mock('@/api/queries', () => {
  const actual = jest.requireActual('@/api/queries');
  const { useSyncExternalStore } = jest.requireActual('react');
  const read = (name: ReadName, rows: (data: Data) => unknown) => () => {
    useSyncExternalStore(mockSubscribe, () => mockWorld);
    return mockQuery(name, rows(mockWorld.data));
  };
  return {
    ...actual,
    useBills: read('bills', (data) => data.bills ?? mockNoRows),
    useSubscriptions: read('subscriptions', (data) => data.subscriptions ?? mockNoRows),
    useLoanPayoffRows: read('payoffs', () => mockNoRows),
  };
});
jest.mock('@/api/charges', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  return {
    ...jest.requireActual('@/api/charges'),
    useCharges: () => {
      useSyncExternalStore(mockSubscribe, () => mockWorld);
      return mockQuery('charges', mockWorld.data.charges ?? mockNoRows);
    },
  };
});
jest.mock('@/api/payment-labels', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  return {
    usePaymentLabels: () => {
      useSyncExternalStore(mockSubscribe, () => mockWorld);
      const query = mockQuery('labels', null);
      return {
        sources: [],
        labelOf: (id: string) => mockLabels.get(id) ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
      };
    },
  };
});

// ---------------------------------------------------------------------------------------------
// The design's account, charged as the recorders write it.

const TODAY = '2026-10-12';
const KOMAL = 'acct-komal-7010';
const DISCOVER = 'card-discover-6334';

type Data = { bills?: BillRow[]; subscriptions?: SubscriptionRow[]; charges?: ChargeRow[] };

function bill(id: string, fields: Partial<BillRow>): BillRow {
  return {
    id,
    name: id,
    amount: 0,
    category_id: 'other',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: null,
    starts_on: null,
    ends_on: null,
    card_id: null,
    bank_account_id: null,
    created_at: '2019-12-01T12:00:00Z',
    ...fields,
  };
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
    created_at: '2019-12-01T12:00:00Z',
    category_id: 'entertainment',
    card_id: null,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

const BILLS = [
  bill('rent', {
    name: 'Ashword Hill Apartments',
    amount: 1035,
    category_id: 'housing',
    next_due_on: '2020-01-01',
    starts_on: '2020-01-01',
    bank_account_id: KOMAL,
  }),
  bill('nationwide', {
    name: 'Nationwide',
    amount: 145,
    category_id: 'insurance',
    next_due_on: '2020-01-11',
    starts_on: '2020-01-11',
  }),
  bill('aep', {
    name: 'AEP',
    amount: 150,
    category_id: 'energy',
    next_due_on: '2020-01-22',
    starts_on: '2020-01-22',
    bank_account_id: KOMAL,
  }),
  bill('car', {
    name: 'Car loan',
    amount: 554,
    category_id: 'loans',
    icon_id: 'loan-car',
    next_due_on: '2024-01-28',
    starts_on: '2024-01-28',
    ends_on: '2031-12-28',
    card_id: DISCOVER,
    in_spending: true,
  }),
];
const SUBSCRIPTIONS = [
  subscription('netflix', {
    name: 'Netflix',
    amount: 15.99,
    next_renewal_on: '2020-01-09',
    started_on: '2020-01-09',
  }),
  subscription('spotify', {
    name: 'Spotify',
    amount: 10,
    next_renewal_on: '2020-01-09',
    started_on: '2020-01-09',
  }),
  subscription('icloud', {
    name: 'iCloud+',
    amount: 12.99,
    next_renewal_on: '2022-01-15',
    started_on: '2022-01-15',
    card_id: DISCOVER,
  }),
];

type Charged = { plan: 'bill' | 'subscription'; id: string; label: string; day: number };
const PLANS: Record<string, Charged & { source: { card?: string; account?: string } }> = {
  rent: {
    plan: 'bill',
    id: 'rent',
    label: 'Ashword Hill Apartments',
    day: 1,
    source: { account: KOMAL },
  },
  nationwide: { plan: 'bill', id: 'nationwide', label: 'Nationwide', day: 11, source: {} },
  aep: { plan: 'bill', id: 'aep', label: 'AEP', day: 22, source: { account: KOMAL } },
  car: { plan: 'bill', id: 'car', label: 'Car loan', day: 28, source: { card: DISCOVER } },
  netflix: { plan: 'subscription', id: 'netflix', label: 'Netflix', day: 9, source: {} },
  spotify: { plan: 'subscription', id: 'spotify', label: 'Spotify', day: 9, source: {} },
  icloud: {
    plan: 'subscription',
    id: 'icloud',
    label: 'iCloud+',
    day: 15,
    source: { card: DISCOVER },
  },
};

const cents = (amount: number) => Math.round(amount * 100);

/**
 * One plan's charges in a year: `months` of them, each at the given amount in cents. The ledger
 * lists a recorded charge as recorded, so a year is just its charge rows.
 */
function charged(key: string, year: number, amounts: readonly number[], from = 1): ChargeRow[] {
  const plan = PLANS[key];
  return amounts.map((amount, index) => {
    const on = `${year}-${String(from + index).padStart(2, '0')}-${String(plan.day).padStart(2, '0')}`;
    return {
      id: `${plan.id}-${on}`,
      bill_id: plan.plan === 'bill' ? plan.id : null,
      subscription_id: plan.plan === 'subscription' ? plan.id : null,
      label: plan.label,
      amount: amount / 100,
      charged_on: on,
      card_id: plan.source.card ?? null,
      bank_account_id: plan.source.account ?? null,
    };
  });
}

const flat = (amount: number, months: number) => Array.from({ length: months }, () => amount);

/**
 * The six years before this one, as All years (2.png) gives them: each year's payment count and
 * total exactly. The rent changes with the year; AEP, a utility, takes up the rest of the total.
 */
const EARLIER_YEARS = [
  { year: 2020, total: 15_118.3, rent: 950, others: ['nationwide', 'netflix', 'spotify'] },
  { year: 2021, total: 16_402.75, rent: 1000, others: ['nationwide', 'netflix', 'spotify'] },
  {
    year: 2022,
    total: 17_880.5,
    rent: 1100,
    others: ['nationwide', 'netflix', 'spotify', 'icloud'],
  },
  {
    year: 2023,
    total: 19_264.0,
    rent: 1200,
    others: ['nationwide', 'netflix', 'spotify', 'icloud'],
  },
  {
    year: 2024,
    total: 21_630.12,
    rent: 900,
    others: ['nationwide', 'netflix', 'spotify', 'icloud', 'car'],
  },
  {
    year: 2025,
    total: 22_407.36,
    rent: 950,
    others: ['nationwide', 'netflix', 'spotify', 'icloud', 'car'],
  },
];
const AMOUNT: Record<string, number> = {
  nationwide: 14_500,
  netflix: 1_599,
  spotify: 1_000,
  icloud: 1_299,
  car: 55_400,
};

function earlierYear({ year, total, rent, others }: (typeof EARLIER_YEARS)[number]): ChargeRow[] {
  const aep = cents(total) - 12 * (cents(rent) + others.reduce((sum, key) => sum + AMOUNT[key], 0));
  const base = Math.floor(aep / 12);
  const extra = aep - base * 12;
  return [
    ...charged('rent', year, flat(cents(rent), 12)),
    ...others.flatMap((key) => charged(key, year, flat(AMOUNT[key], 12))),
    // Whole cents: the first `extra` months carry the odd cent.
    ...charged(
      'aep',
      year,
      Array.from({ length: 12 }, (_, index) => base + (index < extra ? 1 : 0)),
    ),
  ];
}

/** 2026 to the 12th: the rent, Nationwide and the streaming on the 1st to 11th, the rest to Sep. */
const THIS_YEAR = [
  ...charged('rent', 2026, flat(103_500, 10)),
  ...charged('nationwide', 2026, flat(14_500, 10)),
  ...charged('netflix', 2026, flat(1_599, 10)),
  ...charged('spotify', 2026, flat(1_000, 10)),
  ...charged('icloud', 2026, flat(1_299, 9)),
  ...charged('car', 2026, flat(55_400, 9)),
  // A winter and a summer: $154.50 to August, the design's $150.00 in September.
  ...charged('aep', 2026, [...flat(15_450, 8), 15_000]),
];

const ACCOUNT: Data = {
  bills: BILLS,
  subscriptions: SUBSCRIPTIONS,
  charges: [...EARLIER_YEARS.flatMap(earlierYear), ...THIS_YEAR],
};

// ---------------------------------------------------------------------------------------------
// Opening the page.

let mounted: { unmount: () => void | Promise<void> } | null = null;

async function mount(ui: ReactElement) {
  // One page at a time, so a query never finds the one before it.
  await mounted?.unmount();
  const view = await render(<ThemeProvider>{ui}</ThemeProvider>);
  mounted = view;
  // The theme reads the stored mode a tick after the first frame.
  await act(async () => {});
  return view;
}

/** Whether the account is known to pay: Pro lists seven years, free the last 90 days. */
async function accountIs(plan: 'pro' | 'free' | 'unknown') {
  // Nothing is drawn while the answer changes: a store update is not the page's own event.
  await mounted?.unmount();
  mounted = null;
  const status = { pro: plan === 'pro', ready: plan !== 'unknown' };
  mockPro = status;
  publishProStatus(status);
}

async function open(
  params: Record<string, string> = {},
  o: { data?: Data; loading?: ReadName; failed?: ReadName } = {},
) {
  mockParams = params;
  mockWorld = {
    data: o.data ?? ACCOUNT,
    loading: o.loading ?? null,
    failed: o.failed ?? null,
    refetched: () => {},
  };
  await mount(<PaymentHistoryScreen />);
}

// ---------------------------------------------------------------------------------------------
// Reading the screen.

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;
type Host = { type: unknown; parent: Host | null; props: Record<string, any> };

const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');

/** Every line a node draws, top to bottom. */
const linesIn = (node: Parameters<typeof within>[0]) => within(node).getAllByText(/./).map(textOf);

const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');

const card = () => linesIn(screen.getByTestId('history-card-summary'));
const monthsShown = () =>
  screen
    .queryAllByTestId(/^history-\d{4}-\d{2}$/)
    .map((node) => String(node.props.testID).slice('history-'.length));
const paymentRows = (month: string) =>
  within(screen.getByTestId(`history-${month}-card`)).getAllByTestId(/^payment-(?!.*-words$)/);
const rowsIn = (month: string) => paymentRows(month).map(linesIn);
const heading = (month: string) =>
  within(screen.getByTestId(`history-${month}`)).getByRole('header').props.accessibilityLabel;
const pushed = () => jest.mocked(router.push).mock.calls.map(([href]) => href);
const NOTICE = /^Older history is saved\. Free shows the last 90 days\./;

/** Every Text with its class and props, and every word drawn or spoken. */
function everything(): {
  texts: { line: string; className: string; props: Json['props'] }[];
  said: string[];
} {
  const texts: { line: string; className: string; props: Json['props'] }[] = [];
  const said: string[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    for (const key of ['accessibilityLabel', 'accessibilityHint']) {
      if (typeof node.props[key] === 'string') said.push(node.props[key] as string);
    }
    if (node.type === 'Text') {
      const line = (node.children ?? []).filter((part) => typeof part === 'string').join('');
      texts.push({ line, className: String(node.props.className ?? ''), props: node.props });
      said.push(line);
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Tree;
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return { texts, said };
}

/** The scroll view a node is drawn in, or null when it is pinned outside it. */
function scrollOf(node: Host | null): Host | null {
  for (let at = node; at; at = at.parent) {
    if (String(at.type) === 'RCTScrollView') return at;
  }
  return null;
}

beforeEach(async () => {
  resetLocaleForTests();
  resetProStatusForTests();
  mounted = null;
  await accountIs('pro');
  mockToday = TODAY;
  mockMode = 'light';
  mockParams = {};
  mockWorld = { data: {}, loading: null, failed: null, refetched: () => {} };
  mockRefreshing = false;
  jest.clearAllMocks();
  const window = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window, screen: window });
});

// ---------------------------------------------------------------------------------------------
// 3.png.

describe('Payment history: 2026 on the 12th of October', () => {
  it('draws the header, the year chip, the export link, the tabs and the search', async () => {
    await open();
    expect(screen.getByRole('header', { name: 'Payment history' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export payments' })).toBeTruthy();
    const chip = screen.getByTestId('year-chip');
    expect(chip.props.accessibilityLabel).toBe('Showing 2026. Choose another year');
    expect(within(chip).getByText('This year')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export CSV or PDF' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Bills', selected: false })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Subscriptions', selected: false })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Search payments' })).toBeTruthy();
  });

  it('Paid in 2026: $18,548.81, 67 payments, $1,854.88 a month', async () => {
    await open();
    expect(card()).toEqual([
      'Paid in 2026',
      '$18,548.81',
      'Payments',
      '67',
      'Avg / month',
      '$1,854.88',
    ]);
  });

  it('reads the card to VoiceOver as one stop: the year, then each month up to this one', async () => {
    await open();
    expect(screen.getByTestId('history-card-summary').props.accessibilityLabel).toBe(
      'Paid in 2026: $18,548.81. 67 payments. Average $1,854.88 a month. By month: ' +
        'January $1,927.48, February $1,927.48, March $1,927.48, April $1,927.48, ' +
        'May $1,927.48, June $1,927.48, July $1,927.48, August $1,927.48, ' +
        'September $1,922.98, October $1,205.99',
    );
  });

  it('lists January to October, newest first, each with its whole month on the right', async () => {
    await open();
    expect(monthsShown()).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
      '2026-07',
      '2026-06',
      '2026-05',
      '2026-04',
      '2026-03',
      '2026-02',
      '2026-01',
    ]);
    expect(heading('2026-10')).toBe('October 2026, $1,205.99 paid');
    expect(heading('2026-09')).toBe('September 2026, $1,922.98 paid');
    expect(heading('2026-01')).toBe('January 2026, $1,927.48 paid');
  });

  it('October is the design’s four rows and September its seven, every one Paid', async () => {
    await open();
    expect(rowsIn('2026-10')).toEqual([
      ['Nationwide', '11 Oct · Card not set', '$145.00', 'Paid'],
      ['Netflix', '9 Oct · Card not set', '$15.99', 'Paid'],
      ['Spotify', '9 Oct · Card not set', '$10.00', 'Paid'],
      ['Ashword Hill Apartments', '1 Oct · Komal ••7010', '$1,035.00', 'Paid'],
    ]);
    expect(rowsIn('2026-09')).toEqual([
      ['Car loan', '28 Sep · Discover ••6334', '$554.00', 'Paid'],
      ['AEP', '22 Sep · Komal ••7010', '$150.00', 'Paid'],
      ['iCloud+', '15 Sep · Discover ••6334', '$12.99', 'Paid'],
      ['Nationwide', '11 Sep · Card not set', '$145.00', 'Paid'],
      ['Netflix', '9 Sep · Card not set', '$15.99', 'Paid'],
      ['Spotify', '9 Sep · Card not set', '$10.00', 'Paid'],
      ['Ashword Hill Apartments', '1 Sep · Komal ••7010', '$1,035.00', 'Paid'],
    ]);
  });

  it('never says "late", and only lists what has been paid by today', async () => {
    await open();
    expect(screen.queryByText(/late/i)).toBeNull();
    // 15 Oct (iCloud+), 22 Oct (AEP) and 28 Oct (the car loan) are still to come.
    expect(paymentRows('2026-10')).toHaveLength(4);
    expect(screen.queryByText('22 Oct · Komal ••7010')).toBeNull();
  });

  it('every month heading is its rows added up, and the year is the months added up', async () => {
    await open();
    const centsOf = (money: string) => Number(money.replace(/[^0-9]/g, ''));
    let year = 0;
    for (const month of monthsShown()) {
      const total = rowsIn(month).reduce((sum, lines) => sum + centsOf(lines[2]), 0);
      expect(centsOf(heading(month).split(', ')[1])).toBe(total);
      year += total;
    }
    expect(year).toBe(centsOf(card()[1]));
  });
});

// ---------------------------------------------------------------------------------------------
// Bills and Subscriptions.

describe('the tabs', () => {
  it('Bills: $18,172.00 over 38 payments, $1,817.20 a month, bills only', async () => {
    await open();
    await fireEvent.press(screen.getByRole('tab', { name: 'Bills' }));
    expect(screen.getByRole('tab', { name: 'Bills', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'All', selected: false })).toBeTruthy();
    expect(card()).toEqual([
      'Paid in 2026',
      '$18,172.00',
      'Payments',
      '38',
      'Avg / month',
      '$1,817.20',
    ]);
    expect(rowsIn('2026-10')).toEqual([
      ['Nationwide', '11 Oct · Card not set', '$145.00', 'Paid'],
      ['Ashword Hill Apartments', '1 Oct · Komal ••7010', '$1,035.00', 'Paid'],
    ]);
    // September's bills are what the Monthly bills page shows for September, $1,884.00.
    expect(heading('2026-09')).toBe('September 2026, $1,884.00 paid');
  });

  it('Subscriptions: $376.81 over 29 payments, $37.68 a month, subscriptions only', async () => {
    await open();
    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    expect(card()).toEqual(['Paid in 2026', '$376.81', 'Payments', '29', 'Avg / month', '$37.68']);
    expect(rowsIn('2026-10')).toEqual([
      ['Netflix', '9 Oct · Card not set', '$15.99', 'Paid'],
      ['Spotify', '9 Oct · Card not set', '$10.00', 'Paid'],
    ]);
    // September's three are what the Subscriptions page shows for September, $38.98.
    expect(heading('2026-09')).toBe('September 2026, $38.98 paid');
  });

  it('start on the kind the page was opened with, and on All for anything else', async () => {
    await open({ kind: 'subscription' });
    expect(screen.getByRole('tab', { name: 'Subscriptions', selected: true })).toBeTruthy();
    expect(card()[1]).toBe('$376.81');

    await open({ kind: 'bill' });
    expect(screen.getByRole('tab', { name: 'Bills', selected: true })).toBeTruthy();
    expect(card()[1]).toBe('$18,172.00');

    await open({ kind: 'everything' });
    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeTruthy();
    expect(card()[1]).toBe('$18,548.81');
  });

  it('go back to All with the whole figure', async () => {
    await open({ kind: 'bill' });
    await fireEvent.press(screen.getByRole('tab', { name: 'All' }));
    expect(card()[1]).toBe('$18,548.81');
    expect(card()[3]).toBe('67');
  });
});

// ---------------------------------------------------------------------------------------------
// Years.

describe('the year', () => {
  it('opens Choose year with this page’s id, the kind it shows and the year ticked', async () => {
    await open({ kind: 'bill' });
    await fireEvent.press(screen.getByTestId('year-chip'));
    expect(pushed()).toEqual([
      {
        pathname: '/payment-year',
        params: { kind: 'bill', owner: expect.any(String), selected: '2026' },
      },
    ]);
  });

  it('shows the year picked for this page, to the cent, and not one picked for another page', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('year-chip'));
    const { owner } = (pushed()[0] as unknown as { params: { owner: string } }).params;

    await act(() => pickPayment({ owner: 'someone-else', type: 'year', year: 2025 }));
    expect(card()[0]).toBe('Paid in 2026');

    await act(() => pickPayment({ owner, type: 'year', year: 2025 }));
    expect(card()).toEqual([
      'Paid in 2025',
      '$22,407.36',
      'Payments',
      '84',
      'Avg / month',
      '$1,867.28',
    ]);
    // A past year is 12 months of 7 payments, each month the same $1,867.28.
    expect(within(screen.getByTestId('year-chip')).getByText('2025')).toBeTruthy();
    expect(screen.getByTestId('year-chip').props.accessibilityLabel).toBe(
      'Showing 2025. Choose another year',
    );
    expect(monthsShown()).toHaveLength(12);
    expect(monthsShown()[0]).toBe('2025-12');
    expect(heading('2025-12')).toBe('December 2025, $1,867.28 paid');
    expect(heading('2025-01')).toBe('January 2025, $1,867.28 paid');
    expect(paymentRows('2025-06')).toHaveLength(7);
  });

  it('Choose year is then told the new year, and the kind chosen on the tabs', async () => {
    await open({ year: '2025' });
    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    await fireEvent.press(screen.getByTestId('year-chip'));
    expect(pushed()).toEqual([
      {
        pathname: '/payment-year',
        params: { kind: 'subscription', owner: expect.any(String), selected: '2025' },
      },
    ]);
  });

  it('opens on the year the link names, held to the seven years, and on this year for anything else', async () => {
    await open({ year: '2025' });
    expect(card().slice(0, 2)).toEqual(['Paid in 2025', '$22,407.36']);

    await open({ year: '2010' });
    expect(card().slice(0, 2)).toEqual(['Paid in 2020', '$15,118.30']);
    expect(card()[5]).toBe('$1,259.86');

    for (const year of ['2031', 'last', '']) {
      await open({ year });
      expect(card().slice(0, 2)).toEqual(['Paid in 2026', '$18,548.81']);
    }
  });

  it('a first year, 2020, divides its total by twelve months: $15,118.30 is $1,259.86 a month', async () => {
    await open({ year: '2020' });
    expect(card()).toEqual([
      'Paid in 2020',
      '$15,118.30',
      'Payments',
      '60',
      'Avg / month',
      '$1,259.86',
    ]);
    expect(paymentRows('2020-01')).toHaveLength(5);
  });

  it('on New Year’s Day it moves on by itself, and the oldest year drops out of the window', async () => {
    mockToday = '2027-01-01';
    await open();
    expect(card().slice(0, 2)).toEqual(['Paid in 2027', '$0.00']);
    expect(within(screen.getByTestId('year-chip')).getByText('This year')).toBeTruthy();

    await open({ year: '2020' });
    // 2020 is outside the seven years kept on 1 Jan 2027: the oldest is 2021.
    expect(card()[0]).toBe('Paid in 2021');
  });
});

// ---------------------------------------------------------------------------------------------
// Free and Pro.

describe('on Pro', () => {
  it('lists every month of the year, with every row and no notice', async () => {
    await open();
    expect(monthsShown()).toHaveLength(10);
    expect(paymentRows('2026-01')).toHaveLength(7);
    expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();
  });

  it('does not flash the free list while the plan is still being checked', async () => {
    await accountIs('unknown');
    await open();
    expect(monthsShown()).toHaveLength(10);
    expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();
  });
});

describe('on free', () => {
  beforeEach(() => accountIs('free'));

  it('keeps every figure whole and lists rows only from 15 Jul, July’s total still the whole month', async () => {
    await open();
    expect(card()).toEqual([
      'Paid in 2026',
      '$18,548.81',
      'Payments',
      '67',
      'Avg / month',
      '$1,854.88',
    ]);
    expect(monthsShown()).toEqual(['2026-10', '2026-09', '2026-08', '2026-07']);
    // July's heading is all of July, $1,927.48; its rows are the three from the 15th on.
    expect(heading('2026-07')).toBe('July 2026, $1,927.48 paid');
    expect(rowsIn('2026-07')).toEqual([
      ['Car loan', '28 Jul · Discover ••6334', '$554.00', 'Paid'],
      ['AEP', '22 Jul · Komal ••7010', '$154.50', 'Paid'],
      ['iCloud+', '15 Jul · Discover ••6334', '$12.99', 'Paid'],
    ]);
    expect(rowsIn('2026-10')).toHaveLength(4);
    expect(rowsIn('2026-09')).toHaveLength(7);
  });

  it('says older history is kept, once, after the last month, and Pro opens it', async () => {
    await open();
    const notice = screen.getByRole('button', { name: NOTICE });
    expect(screen.getAllByRole('button', { name: NOTICE })).toHaveLength(1);
    expect(screen.queryByTestId('history-2026-06')).toBeNull();
    await fireEvent.press(notice);
    expect(pushed()).toEqual([{ pathname: '/pro-feature', params: { id: 'history' } }]);
  });

  it('a year wholly older keeps its figures and shows the notice in place of the rows', async () => {
    await open({ year: '2025' });
    expect(card()).toEqual([
      'Paid in 2025',
      '$22,407.36',
      'Payments',
      '84',
      'Avg / month',
      '$1,867.28',
    ]);
    expect(monthsShown()).toEqual([]);
    expect(screen.getByRole('button', { name: NOTICE })).toBeTruthy();
    expect(screen.queryByText(/No payments in 2025/)).toBeNull();
  });

  it('Bills and Subscriptions follow the same floor with their own whole totals', async () => {
    await open({ kind: 'subscription' });
    expect(card().slice(0, 2)).toEqual(['Paid in 2026', '$376.81']);
    expect(heading('2026-07')).toBe('July 2026, $38.98 paid');
    expect(rowsIn('2026-07')).toEqual([['iCloud+', '15 Jul · Discover ••6334', '$12.99', 'Paid']]);

    await open({ kind: 'bill' });
    expect(card().slice(0, 2)).toEqual(['Paid in 2026', '$18,172.00']);
    expect(heading('2026-07')).toBe('July 2026, $1,888.50 paid');
    expect(rowsIn('2026-07').map((lines) => lines[0])).toEqual(['Car loan', 'AEP']);
  });

  it('moves the floor with the day: on 1 Oct free reaches back to 3 Jul', async () => {
    mockToday = '2026-10-01';
    await open();
    // 3 Jul is the 90th day ending 1 Oct; the 1st to 2nd of July are older.
    expect(monthsShown().slice(-1)).toEqual(['2026-07']);
    expect(rowsIn('2026-07')).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------------------------
// Export, search and the rows.

describe('export', () => {
  it('on Pro, the header button and the link both open the export of what is shown', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    expect(pushed()).toEqual(['/payment-export?kind=all&year=2026']);
  });

  it('is the view on screen: the kind on the tab and the year picked', async () => {
    await open({ kind: 'bill', year: '2025' });
    await fireEvent.press(screen.getByRole('button', { name: 'Export CSV or PDF' }));
    expect(pushed()).toEqual(['/payment-export?kind=bill&year=2025']);

    await open({ kind: 'subscription' });
    await fireEvent.press(screen.getByRole('button', { name: 'Export CSV or PDF' }));
    expect(pushed()).toEqual([
      '/payment-export?kind=bill&year=2025',
      '/payment-export?kind=subscription&year=2026',
    ]);
  });

  it('one page per visit: the header button and the link are the same action', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Export CSV or PDF' }));
    expect(pushed()).toHaveLength(1);
  });

  it('on free, both go to the export explainer and not to the export', async () => {
    await accountIs('free');
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    expect(pushed()).toEqual([{ pathname: '/pro-feature', params: { id: 'export' } }]);

    jest.clearAllMocks();
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Export CSV or PDF' }));
    expect(pushed()).toEqual([{ pathname: '/pro-feature', params: { id: 'export' } }]);
  });

  it('does nothing until the plan is known, so nobody who paid meets the explainer', async () => {
    await accountIs('unknown');
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Export CSV or PDF' }));
    expect(pushed()).toEqual([]);
  });

  it('the link is its own button, 44pt to the finger', async () => {
    await open();
    const link = screen.getByRole('button', { name: 'Export CSV or PDF' });
    expect(link.props.hitSlop.top).toBeGreaterThanOrEqual(14);
    expect(link.props.hitSlop.bottom).toBeGreaterThanOrEqual(14);
  });
});

describe('search and the rows', () => {
  it('Search opens payment search on the kind of the tab', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Search payments' }));
    expect(pushed()).toEqual([{ pathname: '/payment-search', params: { kind: 'all' } }]);

    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Search payments' }));
    expect(pushed()[1]).toEqual({ pathname: '/payment-search', params: { kind: 'subscription' } });
  });

  it('a row opens the page of its plan: a loan its loan page, never an add form', async () => {
    await open();
    const sep = paymentRows('2026-09');
    await fireEvent.press(sep[0]);
    await fireEvent.press(sep[1]);
    await fireEvent.press(sep[2]);
    await fireEvent.press(paymentRows('2026-10')[0]);
    expect(pushed()).toEqual([
      { pathname: '/loan/[id]', params: { id: 'car' } },
      { pathname: '/bill/[id]', params: { id: 'aep' } },
      { pathname: '/subscription/[id]', params: { id: 'icloud' } },
      { pathname: '/bill/[id]', params: { id: 'nationwide' } },
    ]);
    expect(JSON.stringify(pushed())).not.toContain('/add-');
  });

  it('reads each row to VoiceOver as one sentence', async () => {
    await open();
    expect(paymentRows('2026-10').map((node) => node.props.accessibilityLabel)).toEqual([
      'Nationwide, $145.00, 11 Oct, Card not set, Paid',
      'Netflix, $15.99, 9 Oct, Card not set, Paid',
      'Spotify, $10.00, 9 Oct, Card not set, Paid',
      'Ashword Hill Apartments, $1,035.00, 1 Oct, Komal ••7010, Paid',
    ]);
  });
});

// ---------------------------------------------------------------------------------------------
// Loading, failing and empty.

describe('while it is read', () => {
  it.each<ReadName>(['bills', 'subscriptions', 'charges', 'payoffs', 'labels'])(
    'a skeleton under the controls while the %s are coming, and no card of zeros',
    async (name) => {
      await open({}, { loading: name });
      expect(screen.getByTestId('history-loading')).toBeTruthy();
      expect(screen.queryByTestId('history-card')).toBeNull();
      expect(screen.queryByText(/No payments in/)).toBeNull();
      expect(screen.queryByText('Card not set')).toBeNull();
      // The year, the tabs and the search are there to use.
      expect(screen.getByTestId('year-chip')).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Bills' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Search payments' })).toBeTruthy();
    },
  );

  it('draws the history once it lands', async () => {
    await open({}, { loading: 'charges' });
    await act(async () => mockChange({ loading: null }));
    expect(screen.queryByTestId('history-loading')).toBeNull();
    expect(card()[1]).toBe('$18,548.81');
  });

  it('pulls to refresh with the app’s own refresh, which runs the sweep, and shows it working', async () => {
    await open();
    const scroller = scrollOf(screen.getByTestId('history-card'));
    expect(scroller?.props.refreshControl.props.refreshing).toBe(false);
    await act(async () => scroller?.props.refreshControl.props.onRefresh());
    expect(mockRefreshAll).toHaveBeenCalledTimes(1);

    mockRefreshing = true;
    await open();
    expect(
      scrollOf(screen.getByTestId('history-card'))?.props.refreshControl.props.refreshing,
    ).toBe(true);
  });
});

describe('when it cannot be read', () => {
  it.each<ReadName>(['bills', 'subscriptions', 'charges', 'payoffs', 'labels'])(
    'says the one failure line when the %s fail, never a year of nothing paid',
    async (name) => {
      await open({}, { failed: name });
      expect(screen.getByTestId('art-error')).toBeTruthy();
      expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryByTestId('history-card')).toBeNull();
      expect(screen.queryByText(/No payments in/)).toBeNull();
      expect(screen.queryByText('Card not set')).toBeNull();
    },
  );

  it('Try again reads every part again, and the history appears when it comes right', async () => {
    await open({}, { failed: 'charges' });
    const asked: ReadName[] = [];
    mockWorld = {
      ...mockWorld,
      refetched: (name) => {
        asked.push(name);
        if (name === 'charges') mockChange({ failed: null });
      },
    };
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect([...asked].sort()).toEqual(['bills', 'charges', 'labels', 'payoffs', 'subscriptions']);
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(card()[1]).toBe('$18,548.81');
  });

  it('says it in Spanish and French too', async () => {
    for (const [language, line, retry] of [
      ['es', 'Algo salió mal. Inténtalo de nuevo.', 'Intentar de nuevo'],
      ['fr', 'Une erreur est survenue. Réessaie.', 'Réessayer'],
    ] as const) {
      setLanguage(language);
      await open({}, { failed: 'bills' });
      expect(screen.getByText(line)).toBeTruthy();
      expect(screen.getByRole('button', { name: retry })).toBeTruthy();
    }
  });
});

describe('with nothing paid', () => {
  it('a new account: $0.00, no payments, $0.00 a month, flat bars and the line that says so', async () => {
    await open({}, { data: {} });
    expect(card()).toEqual(['Paid in 2026', '$0.00', 'Payments', '0', 'Avg / month', '$0.00']);
    expect(screen.getByText('No payments in 2026 yet')).toBeTruthy();
    expect(monthsShown()).toEqual([]);
    expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();
    // The tabs, the search and the export are still there.
    expect(screen.getByRole('tab', { name: 'Bills' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export CSV or PDF' })).toBeTruthy();
  });

  it('a year with nothing in it on an account that began later says so, on free too', async () => {
    await accountIs('free');
    await open(
      { year: '2021' },
      { data: { bills: BILLS, subscriptions: SUBSCRIPTIONS, charges: THIS_YEAR } },
    );
    expect(card().slice(0, 2)).toEqual(['Paid in 2021', '$0.00']);
    expect(screen.getByText('No payments in 2021.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();
  });

  it('the bills tab of an account with only subscriptions is empty, the other tab is not', async () => {
    const only = { subscriptions: SUBSCRIPTIONS, charges: THIS_YEAR };
    await open({ kind: 'bill' }, { data: only });
    expect(card().slice(0, 2)).toEqual(['Paid in 2026', '$0.00']);
    expect(screen.getByText('No payments in 2026 yet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    expect(card()[1]).toBe('$376.81');
  });
});

// ---------------------------------------------------------------------------------------------
// Light and dark.

/** What a line of text sits on, by the class it is drawn with. */
const SURFACES: Record<string, ('surface' | 'card' | 'tint' | 'accent')[]> = {
  'text-ink': ['surface', 'card'],
  'text-muted': ['surface', 'card'],
  'text-body': ['surface', 'card'],
  'text-money-in': ['card'],
  'text-tint-ink': ['tint', 'card'],
  'text-on-control': ['accent'],
  'text-on-control/90': ['accent'],
};

describe.each(['light', 'dark'] as const)('in %s', (scheme) => {
  const tokens = buildTokens(scheme);

  beforeEach(() => {
    mockMode = scheme;
    return open();
  });

  const colourClasses = () => {
    const used = new Set<string>();
    for (const { className } of everything().texts) {
      for (const name of className.match(/\btext-(?!\[|center|left|right)[a-z-]+(?:\/\d+)?/g) ??
        []) {
        used.add(name);
      }
    }
    return used;
  };

  const onPage = {
    surface: tokens.surface,
    card: tokens.card,
    tint: tokens.tint,
    accent: tokens.accent,
  };

  const ratio = (name: string, surface: keyof typeof onPage): number => {
    const token = name.replace(/^text-/, '').replace(/\/\d+$/, '');
    const camel = token.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    const colour = tokens[camel as keyof typeof tokens];
    // The soft lines on the plum card are 90% white over it.
    const drawn = name.endsWith('/90') ? mix(tokens.accent, colour, 0.9) : colour;
    return contrast(drawn, onPage[surface]);
  };

  it('draws the glyphs in this mode’s own colours', async () => {
    expect(
      within(screen.getByRole('button', { name: 'Export payments' })).getByTestId('icon-Share')
        .props.iconColor,
    ).toBe(tokens.tintInk);
    expect(
      within(screen.getByTestId('search-button')).getByTestId('icon-Search').props.iconColor,
    ).toBe(tokens.muted);
    expect(
      within(screen.getByTestId('year-chip')).getByTestId('icon-ChevronDown').props.iconColor,
    ).toBe(tokens.ink);
  });

  it('keeps the plum card’s shadow for light, where a dark page would swallow it', async () => {
    expect(screen.getByTestId('history-card').props.style).toEqual(
      scheme === 'light' ? shadows.card : undefined,
    );
  });

  it('draws every kind of text in a colour that reads on what it sits on, 4.5 to 1', async () => {
    const used = colourClasses();
    expect([...used]).toEqual(
      expect.arrayContaining(['text-ink', 'text-muted', 'text-on-control', 'text-on-control/90']),
    );
    // A colour no one has checked fails here, not on someone's phone.
    expect([...used].filter((name) => !(name in SURFACES))).toEqual([]);
    for (const name of used) {
      for (const surface of SURFACES[name]) {
        expect([name, surface, ratio(name, surface) >= 4.5]).toEqual([name, surface, true]);
      }
    }
  });

  it('underlines the chosen tab in a plum that stands out from the page, 4.5 to 1', async () => {
    const line = screen.getByTestId('kind-tabs-all-line');
    expect(classOf(line)).toContain('bg-accent-ink');
    expect(contrast(tokens.accentInk, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    expect(classOf(screen.getByTestId('kind-tabs-bill-line'))).toContain('bg-transparent');
  });
});

// ---------------------------------------------------------------------------------------------
// Languages.

describe('in every language', () => {
  const NBSP = ' ';
  const FR = (whole: string, cents: string) => `${whole},${cents}${NBSP}$`;

  it('writes the design’s history page whole in English, Spanish and French', async () => {
    const WORDS = {
      en: {
        title: 'Payment history',
        chip: 'This year',
        chipLabel: 'Showing 2026. Choose another year',
        link: 'Export CSV or PDF',
        export: 'Export payments',
        tabs: ['All', 'Bills', 'Subscriptions'],
        search: 'Search payments',
        card: ['Paid in 2026', '$18,548.81', 'Payments', '67', 'Avg / month', '$1,854.88'],
        spoken:
          'Paid in 2026: $18,548.81. 67 payments. Average $1,854.88 a month. By month: January $1,927.48, ',
        month: 'October 2026, $1,205.99 paid',
        row: ['Nationwide', '11 Oct · Card not set', '$145.00', 'Paid'],
        rowSpoken: 'Nationwide, $145.00, 11 Oct, Card not set, Paid',
      },
      es: {
        title: 'Historial de pagos',
        chip: 'Este año',
        chipLabel: 'Año: 2026. Elige otro año',
        link: 'Exportar CSV o PDF',
        export: 'Exportar pagos',
        tabs: ['Todos', 'Facturas', 'Suscripciones'],
        search: 'Buscar pagos',
        card: ['Pagado en 2026', '$18,548.81', 'Pagos', '67', 'Prom. / mes', '$1,854.88'],
        spoken:
          'Pagado en 2026: $18,548.81. 67 pagos. Promedio de $1,854.88 al mes. Por mes: enero: $1,927.48, ',
        month: 'octubre de 2026, pagado: $1,205.99',
        row: ['Nationwide', '11 oct · Sin tarjeta', '$145.00', 'Pagado'],
        rowSpoken: 'Nationwide, $145.00, 11 oct, Sin tarjeta, Pagado',
      },
      fr: {
        title: 'Historique des paiements',
        chip: 'Cette année',
        chipLabel: `Année${NBSP}: 2026. Choisis une autre année`,
        link: 'Exporter en CSV ou PDF',
        export: 'Exporter les paiements',
        tabs: ['Tous', 'Factures', 'Abonnements'],
        search: 'Rechercher des paiements',
        card: [
          'Payé en 2026',
          FR('18 548', '81'),
          'Paiements',
          '67',
          'Moy. / mois',
          FR('1 854', '88'),
        ],
        spoken: `Payé en 2026${NBSP}: ${FR('18 548', '81')}. 67 paiements. Moyenne de ${FR('1 854', '88')} par mois. Par mois${NBSP}: janvier${NBSP}: ${FR('1 927', '48')}, `,
        month: `octobre 2026, payé${NBSP}: ${FR('1 205', '99')}`,
        row: ['Nationwide', '11 oct. · Aucune carte', FR('145', '00'), 'Payé'],
        rowSpoken: `Nationwide, ${FR('145', '00')}, 11 oct., Aucune carte, Payé`,
      },
    } as const;

    for (const language of ['en', 'es', 'fr'] as const) {
      const words = WORDS[language];
      setLanguage(language);
      await open();
      const said = (what: unknown) => [language, what];
      expect(said(screen.getByRole('header', { name: words.title }) !== null)).toEqual(said(true));
      expect(said(card())).toEqual(said([...words.card]));
      expect(said(screen.getByTestId('history-card-summary').props.accessibilityLabel)).toEqual(
        said(expect.stringContaining(words.spoken)),
      );
      expect(said(within(screen.getByTestId('year-chip')).getByText(words.chip) !== null)).toEqual(
        said(true),
      );
      expect(said(screen.getByTestId('year-chip').props.accessibilityLabel)).toEqual(
        said(words.chipLabel),
      );
      expect(screen.getByRole('button', { name: words.link })).toBeTruthy();
      expect(screen.getByRole('button', { name: words.export })).toBeTruthy();
      expect(screen.getByRole('button', { name: words.search })).toBeTruthy();
      expect(said(screen.getAllByRole('tab').map((node) => node.props.accessibilityLabel))).toEqual(
        said([...words.tabs]),
      );
      expect(said(heading('2026-10'))).toEqual(said(words.month));
      expect(said(linesIn(paymentRows('2026-10')[0]))).toEqual(said([...words.row]));
      expect(said(paymentRows('2026-10')[0].props.accessibilityLabel)).toEqual(
        said(words.rowSpoken),
      );
    }
  });

  it('writes the free notice and the empty year in each language', async () => {
    await accountIs('free');
    for (const [language, notice, none] of [
      ['en', /^Older history is saved\./, 'No payments in 2021.'],
      ['es', /^Tu historial anterior está guardado\./, 'No hubo pagos en 2021.'],
      ['fr', /^Ton historique plus ancien est conservé\./, 'Aucun paiement en 2021.'],
    ] as const) {
      setLanguage(language);
      await open();
      expect(screen.getByRole('button', { name: notice })).toBeTruthy();
      await open(
        { year: '2021' },
        { data: { bills: BILLS, subscriptions: SUBSCRIPTIONS, charges: THIS_YEAR } },
      );
      expect(screen.getByText(none)).toBeTruthy();
    }
  });

  it.each<Language>(['en', 'es', 'fr'])(
    '%s: no raw key and no unfilled {token} anywhere, drawn or read aloud',
    async (language) => {
      setLanguage(language);
      await accountIs('free');
      await open();
      const { said } = everything();
      expect(said.length).toBeGreaterThan(60);
      for (const line of said) {
        expect(line).not.toMatch(/\b(payments|pro|common|dates|ui|bills|subscriptions)\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}/);
        expect(line).not.toMatch(/undefined|NaN|\[object/);
      }
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Large text.

describe('at large text', () => {
  const layout = async (node: Parameters<typeof fireEvent>[0], width: number) =>
    fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });

  /** A name whose widest word (`word`) is wider than the room (`room`) beside the amount. */
  async function cramp(row: Parameters<typeof within>[0], room: number, word: number) {
    // The layout bubbles from the row to the group's own box.
    await layout(row, 300);
    await layout(within(row).getByTestId('fit-slot-name', { includeHiddenElements: true }), room);
    await layout(within(row).getByTestId('fit-copy-name', { includeHiddenElements: true }), word);
  }

  beforeEach(() => {
    const window = { width: 390, height: 844, scale: 3, fontScale: 3 };
    Dimensions.set({ window, screen: window });
  });

  it('gives every line its role’s ceiling and never cuts or shrinks one', async () => {
    await accountIs('free');
    await open();
    const ceilings = new Set<number>(Object.values(TEXT_CAP));
    const { texts } = everything();
    expect(texts.length).toBeGreaterThan(60);
    for (const { line, props } of texts) {
      expect([line, ceilings.has(props.maxFontSizeMultiplier as number)]).toEqual([line, true]);
      expect([line, props.numberOfLines]).toEqual([line, undefined]);
      expect([line, props.adjustsFontSizeToFit]).toEqual([line, undefined]);
    }
  });

  it('keeps the whole figure, the count and the average on the card', async () => {
    await open();
    expect(card()).toEqual([
      'Paid in 2026',
      '$18,548.81',
      'Payments',
      '67',
      'Avg / month',
      '$1,854.88',
    ]);
  });

  it('puts a row’s amount and status under its name once a word of the name cannot sit beside them', async () => {
    await open();
    const row = paymentRows('2026-10')[3];
    expect(linesIn(row)).toEqual([
      'Ashword Hill Apartments',
      '1 Oct · Komal ••7010',
      '$1,035.00',
      'Paid',
    ]);
    await cramp(row, 90, 140);
    expect(linesIn(paymentRows('2026-10')[3])).toEqual([
      'Ashword Hill Apartments',
      '$1,035.00',
      '1 Oct · Komal ••7010',
      'Paid',
    ]);
    // Its neighbour with a short name is untouched.
    expect(linesIn(paymentRows('2026-10')[0])).toEqual([
      'Nationwide',
      '11 Oct · Card not set',
      '$145.00',
      'Paid',
    ]);
  });

  it('keeps the controls pinned and every row, the export link and the notice in the scroll', async () => {
    await accountIs('free');
    await open();
    const inside = (node: Host | null) => scrollOf(node) !== null;
    expect(inside(screen.getByRole('header', { name: 'Payment history' }) as unknown as Host)).toBe(
      false,
    );
    expect(inside(screen.getByRole('button', { name: 'Export payments' }) as unknown as Host)).toBe(
      false,
    );
    expect(inside(screen.getByTestId('year-chip') as unknown as Host)).toBe(true);
    expect(
      inside(screen.getByRole('button', { name: 'Export CSV or PDF' }) as unknown as Host),
    ).toBe(true);
    expect(inside(screen.getByTestId('kind-tabs') as unknown as Host)).toBe(true);
    expect(inside(screen.getByRole('button', { name: NOTICE }) as unknown as Host)).toBe(true);
  });
});
