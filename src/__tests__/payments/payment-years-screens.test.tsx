import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Dimensions } from 'react-native';

import type { ChargeRow } from '@/api/charges';
import type { BillRow, SubscriptionRow } from '@/api/queries';
import PaymentYearScreen from '@/app/payment-year';
import PaymentYearsScreen from '@/app/payment-years';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { onPaymentPicked } from '@/lib/payment-pick';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';
import { contrast } from '@/lib/tone';
import { ThemeProvider } from '@/providers/theme-provider';
import { buildTokens, mix, type Scheme } from '@/theme/palette';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

// A machine under load needs more than Jest's five seconds for these heavy pages; a test that
// is really stuck still fails.
jest.setTimeout(20000);

/**
 * Choose year (7.png) and All years (2.png) as a person meets them, on 12 Oct 2026. The pages' own
 * hook, `usePayments`, runs for real over the real ledger; only the five reads under it (bills,
 * subscriptions, charges, loan payoffs, the names of cards and accounts) are fakes, held in
 * `mockWorld`. Whether the account is free or Pro is the app's own store, so which years carry the
 * Pro badge comes from the real 90-day floor (15 Jul 2026).
 *
 * The account is the design's seven years, charged as the recorders write them, so every figure is
 * the design's, to the cent:
 *
 *   All years    $131,251.84 · 499 payments · 7 years (since 2020)
 *   2026 $18,548.81 · 67    2025 $22,407.36 · 84    2024 $21,630.12 · 84    2023 $19,264.00 · 72
 *   2022 $17,880.50 · 72    2021 $16,402.75 · 60    2020 $15,118.30 · 60
 *   Bills        $128,380.23 · 278      Subscriptions  $2,871.61 · 221
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
// Opening the pages.

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

type Opened = { data?: Data; loading?: ReadName; failed?: ReadName };

function world(o: Opened) {
  mockWorld = {
    data: o.data ?? ACCOUNT,
    loading: o.loading ?? null,
    failed: o.failed ?? null,
    refetched: () => {},
  };
}

/** All years. */
async function openYears(params: Record<string, string> = {}, o: Opened = {}) {
  mockParams = params;
  world(o);
  await mount(<PaymentYearsScreen />);
}

/** Choose year. */
async function openChoose(params: Record<string, string> = {}, o: Opened = {}) {
  mockParams = params;
  world(o);
  await mount(<PaymentYearScreen />);
}

// ---------------------------------------------------------------------------------------------
// Reading the screen.

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;
type Host = { type: unknown; parent: Host | null; props: Record<string, any> };

const hidden = { includeHiddenElements: true };

const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');

/** Every line a node draws, top to bottom. */
const linesIn = (node: Parameters<typeof within>[0]) => within(node).getAllByText(/./).map(textOf);

const pushed = () => jest.mocked(router.push).mock.calls.map(([href]) => href);
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

/** All years: the plum card, and each year's card in order. */
const sinceCard = () => linesIn(screen.getByTestId('years-card-summary'));
const yearCard = (year: number) => screen.getByTestId(`year-card-${year}`);
const yearCards = () =>
  screen
    .getAllByTestId(/^year-card-\d{4}$/)
    .map((node) => Number(String(node.props.testID).slice(-4)));
const badged = (year: number) => within(yearCard(year)).queryByTestId('pro-badge', hidden) !== null;

/** Choose year: every row and whether it is ticked. */
const choices = () =>
  screen.getAllByRole('radio').map((node) => ({
    name: String(node.props.accessibilityLabel),
    ticked: node.props.accessibilityState.checked === true,
  }));
const choice = (name: string) => screen.getByRole('radio', { name });
/** All years, which opens another page rather than being a year to choose. */
const allYears = (name: string) => screen.getByRole('link', { name });
const linkNames = () =>
  screen.getAllByRole('link').map((node) => String(node.props.accessibilityLabel));

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
const inside = (node: unknown) => scrollOf(node as Host) !== null;

beforeEach(async () => {
  resetLocaleForTests();
  resetProStatusForTests();
  mounted = null;
  await accountIs('pro');
  mockToday = TODAY;
  mockMode = 'light';
  mockParams = {};
  mockWorld = { data: {}, loading: null, failed: null, refetched: () => {} };
  jest.clearAllMocks();
  const window = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window, screen: window });
});

// ---------------------------------------------------------------------------------------------
// All years (2.png).

describe('All years, on Pro', () => {
  it('is the design: Paid since 2020, $131,251.84, 499 payments over 7 years', async () => {
    await openYears();
    expect(screen.getByRole('header', { name: 'All years' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export payments' })).toBeTruthy();
    expect(sinceCard()).toEqual(['Paid since 2020', '$131,251.84', '499 payments · 7 years']);
    expect(screen.getByTestId('years-card-summary').props.accessibilityLabel).toBe(
      'Paid since 2020, $131,251.84. 499 payments, 7 years.',
    );
  });

  it('lists the seven years newest first, each with its count and its whole total', async () => {
    await openYears();
    expect(yearCards()).toEqual(YEARS);
    expect(YEARS.map((year) => linesIn(yearCard(year)))).toEqual([
      ['2026', '67 payments', '$18,548.81'],
      ['2025', '84 payments', '$22,407.36'],
      ['2024', '84 payments', '$21,630.12'],
      ['2023', '72 payments', '$19,264.00'],
      ['2022', '72 payments', '$17,880.50'],
      ['2021', '60 payments', '$16,402.75'],
      ['2020', '60 payments', '$15,118.30'],
    ]);
  });

  it('the years add up to the card, to the cent, and the counts to its 499', async () => {
    await openYears();
    const cents = (money: string) => Number(money.replace(/[^0-9]/g, ''));
    const rows = YEARS.map((year) => linesIn(yearCard(year)));
    expect(rows.reduce((sum, lines) => sum + cents(lines[2]), 0)).toBe(cents(sinceCard()[1]));
    expect(rows.reduce((sum, lines) => sum + Number(lines[1].split(' ')[0]), 0)).toBe(499);
  });

  it('has no Pro badge on any year and no footer', async () => {
    await openYears();
    for (const year of YEARS) expect(badged(year)).toBe(false);
    expect(screen.queryByTestId('pro-footer')).toBeNull();
  });

  it('reads each year to VoiceOver as one sentence', async () => {
    await openYears();
    expect(YEARS.map((year) => yearCard(year).props.accessibilityLabel)).toEqual([
      '2026, 67 payments, $18,548.81',
      '2025, 84 payments, $22,407.36',
      '2024, 84 payments, $21,630.12',
      '2023, 72 payments, $19,264.00',
      '2022, 72 payments, $17,880.50',
      '2021, 60 payments, $16,402.75',
      '2020, 60 payments, $15,118.30',
    ]);
  });
});

describe('All years, on free', () => {
  beforeEach(() => accountIs('free'));

  it('keeps every figure whole and puts the Pro badge on 2020 to 2025, never on this year', async () => {
    await openYears();
    expect(sinceCard()).toEqual(['Paid since 2020', '$131,251.84', '499 payments · 7 years']);
    expect(yearCards()).toEqual(YEARS);
    expect(badged(2026)).toBe(false);
    for (const year of [2025, 2024, 2023, 2022, 2021, 2020]) expect(badged(year)).toBe(true);
    expect(linesIn(yearCard(2025))).toEqual(['2025', '84 payments', '$22,407.36']);
  });

  it('says older history with Pro to VoiceOver once, in the row, not in the badge', async () => {
    await openYears();
    expect(yearCard(2026).props.accessibilityLabel).toBe('2026, 67 payments, $18,548.81');
    expect(yearCard(2025).props.accessibilityLabel).toBe(
      '2025, older history with Pro, 84 payments, $22,407.36',
    );
    expect(
      within(yearCard(2025)).getByTestId('pro-badge', hidden).props.accessibilityElementsHidden,
    ).toBe(true);
  });

  it('ends with "See up to 7 years with Pro", and Learn more opens the history explainer', async () => {
    await openYears();
    const footer = screen.getByTestId('pro-footer');
    expect(linesIn(footer)).toEqual(['See up to 7 years with Pro', 'Learn more']);
    expect(footer.props.accessibilityLabel).toBe('See up to 7 years with Pro');
    await fireEvent.press(footer);
    expect(pushed()).toEqual([{ pathname: '/pro-feature', params: { id: 'history' } }]);
  });

  it('does not flash the badges while the plan is still being checked', async () => {
    await accountIs('unknown');
    await openYears();
    for (const year of YEARS) expect(badged(year)).toBe(false);
    expect(screen.queryByTestId('pro-footer')).toBeNull();
  });
});

describe('All years, by kind', () => {
  it('Bills: $128,380.23 over 278 payments, bills only', async () => {
    await openYears({ kind: 'bill' });
    expect(sinceCard()).toEqual(['Paid since 2020', '$128,380.23', '278 payments · 7 years']);
    expect(YEARS.map((year) => linesIn(yearCard(year)))).toEqual([
      ['2026', '38 payments', '$18,172.00'],
      ['2025', '48 payments', '$21,939.60'],
      ['2024', '48 payments', '$21,162.36'],
      ['2023', '36 payments', '$18,796.24'],
      ['2022', '36 payments', '$17,412.74'],
      ['2021', '36 payments', '$16,090.87'],
      ['2020', '36 payments', '$14,806.42'],
    ]);
  });

  it('Subscriptions: $2,871.61 over 221 payments, subscriptions only', async () => {
    await openYears({ kind: 'subscription' });
    expect(sinceCard()).toEqual(['Paid since 2020', '$2,871.61', '221 payments · 7 years']);
    expect(YEARS.map((year) => linesIn(yearCard(year)))).toEqual([
      ['2026', '29 payments', '$376.81'],
      ['2025', '36 payments', '$467.76'],
      ['2024', '36 payments', '$467.76'],
      ['2023', '36 payments', '$467.76'],
      ['2022', '36 payments', '$467.76'],
      ['2021', '24 payments', '$311.88'],
      ['2020', '24 payments', '$311.88'],
    ]);
  });

  it('the two kinds add up to All years, to the cent', async () => {
    const cents = (money: string) => Number(money.replace(/[^0-9]/g, ''));
    await openYears({ kind: 'bill' });
    const bills = cents(sinceCard()[1]);
    await openYears({ kind: 'subscription' });
    const subscriptions = cents(sinceCard()[1]);
    await openYears();
    expect(bills + subscriptions).toBe(cents(sinceCard()[1]));
  });

  it('a kind that is not one is All', async () => {
    await openYears({ kind: 'loans' });
    expect(sinceCard()[1]).toBe('$131,251.84');
  });
});

describe('All years, opening a year', () => {
  it('opens that year’s history on the kind shown, when it was not opened from a history', async () => {
    await openYears({ kind: 'bill' });
    await fireEvent.press(yearCard(2025));
    expect(pushed()).toEqual([
      { pathname: '/payment-history', params: { kind: 'bill', year: '2025' } },
    ]);
  });

  it('opened from a history, hands the year back to it and goes back, and opens nothing new', async () => {
    const picks: unknown[] = [];
    const stop = onPaymentPicked('history-1', 'year', (pick) => picks.push(pick));
    await openYears({ kind: 'all', owner: 'history-1' });
    await fireEvent.press(yearCard(2023));
    stop();
    expect(picks).toEqual([{ owner: 'history-1', type: 'year', year: 2023 }]);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(pushed()).toEqual([]);
  });

  it('is one page per visit: a second tap before it lands does nothing', async () => {
    await openYears();
    await fireEvent.press(yearCard(2025));
    await fireEvent.press(yearCard(2024));
    expect(pushed()).toHaveLength(1);
  });
});

describe('All years, export', () => {
  it('on Pro opens the export of every year, on the kind shown', async () => {
    await openYears();
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    expect(pushed()).toEqual(['/payment-export?kind=all&year=all']);

    await openYears({ kind: 'subscription' });
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    expect(pushed()[1]).toBe('/payment-export?kind=subscription&year=all');
  });

  it('on free opens the export explainer, and until the plan is known does nothing', async () => {
    await accountIs('free');
    await openYears();
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    expect(pushed()).toEqual([{ pathname: '/pro-feature', params: { id: 'export' } }]);

    jest.clearAllMocks();
    await accountIs('unknown');
    await openYears();
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    expect(pushed()).toEqual([]);
  });
});

describe('All years, with fewer years', () => {
  it('one year: "1 year" and the singular, with that year’s card', async () => {
    await openYears(
      {},
      { data: { bills: BILLS, subscriptions: SUBSCRIPTIONS, charges: THIS_YEAR } },
    );
    expect(sinceCard()).toEqual(['Paid since 2026', '$18,548.81', '67 payments · 1 year']);
    expect(yearCards()).toEqual([2026]);
  });

  it('a new account: $0.00, 0 payments, 1 year, and this year’s card with nothing in it', async () => {
    await openYears({}, { data: {} });
    expect(sinceCard()).toEqual(['Paid since 2026', '$0.00', '0 payments · 1 year']);
    expect(linesIn(yearCard(2026))).toEqual(['2026', '0 payments', '$0.00']);
  });

  it('a gap year is not listed, and the card says since the first', async () => {
    await openYears(
      {},
      {
        data: {
          bills: BILLS,
          subscriptions: SUBSCRIPTIONS,
          charges: [...earlierYear(EARLIER_YEARS[0]), ...THIS_YEAR],
        },
      },
    );
    expect(yearCards()).toEqual([2026, 2020]);
    expect(sinceCard()).toEqual(['Paid since 2020', '$33,667.11', '127 payments · 2 years']);
  });
});

describe('All years, while it is read', () => {
  it.each<ReadName>(['bills', 'subscriptions', 'charges', 'payoffs', 'labels'])(
    'a skeleton while the %s are coming, and no card of zeros',
    async (name) => {
      await openYears({}, { loading: name });
      expect(screen.getByTestId('years-loading')).toBeTruthy();
      expect(screen.queryByTestId('years-card')).toBeNull();
      expect(screen.queryByText(/Paid since/)).toBeNull();
      expect(screen.getByRole('header', { name: 'All years' })).toBeTruthy();
    },
  );

  it('draws the years once they land', async () => {
    await openYears({}, { loading: 'charges' });
    await act(async () => mockChange({ loading: null }));
    expect(screen.queryByTestId('years-loading')).toBeNull();
    expect(sinceCard()[1]).toBe('$131,251.84');
  });

  it('re-reads every part on a pull to refresh', async () => {
    const asked: ReadName[] = [];
    await openYears();
    mockWorld = { ...mockWorld, refetched: (name) => asked.push(name) };
    const scroller = scrollOf(screen.getByTestId('years-card') as unknown as Host);
    await act(async () => scroller?.props.refreshControl.props.onRefresh());
    expect([...asked].sort()).toEqual(['bills', 'charges', 'labels', 'payoffs', 'subscriptions']);
  });

  it.each<ReadName>(['bills', 'subscriptions', 'charges', 'payoffs', 'labels'])(
    'says the one failure line when the %s fail, never years of nothing paid',
    async (name) => {
      await openYears({}, { failed: name });
      expect(screen.getByTestId('art-error')).toBeTruthy();
      expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryByTestId('years-card')).toBeNull();
      expect(screen.queryByText(/Paid since/)).toBeNull();
    },
  );

  it('Try again reads every part again, and the years appear when it comes right', async () => {
    await openYears({}, { failed: 'charges' });
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
    expect(sinceCard()[1]).toBe('$131,251.84');
  });
});

// ---------------------------------------------------------------------------------------------
// Choose year (7.png).

describe('Choose year, on Pro', () => {
  it('lists this year ticked and each earlier year, then All years with its span', async () => {
    await openChoose({ kind: 'all', owner: 'history-1', selected: '2026' });
    expect(screen.getByRole('header', { name: 'Choose year' })).toBeTruthy();
    expect(choices()).toEqual([
      { name: 'This year, 2026', ticked: true },
      { name: '2025', ticked: false },
      { name: '2024', ticked: false },
      { name: '2023', ticked: false },
      { name: '2022', ticked: false },
      { name: '2021', ticked: false },
      { name: '2020', ticked: false },
    ]);
    expect(linkNames()).toEqual(['All years, 2020 – 2026']);
  });

  it('All years is a link, not a choice: no state, never ticked, and not one of the radios', async () => {
    await openChoose({ owner: 'h', selected: '2026' });
    const link = allYears('All years, 2020 – 2026');
    expect(link.props.accessibilityRole).toBe('link');
    // No selected or checked state to read out: it is not a choice.
    expect(link.props.accessibilityState?.selected).toBeUndefined();
    expect(link.props.accessibilityState?.checked).toBeUndefined();
    expect(screen.queryByRole('radio', { name: /^All years/ })).toBeNull();
    expect(within(link).queryByTestId('icon-Check')).toBeNull();
    // Exactly one year is ticked, and it is not All years.
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
    expect(linesIn(link)).toEqual(['All years', '2020 – 2026']);
  });

  it('has no Pro badge and no footer', async () => {
    await openChoose({ owner: 'history-1' });
    expect(screen.queryByTestId('pro-badge', hidden)).toBeNull();
    expect(screen.queryByTestId('pro-footer')).toBeNull();
  });

  it('ticks the year the history shows, and this year for anything else', async () => {
    await openChoose({ owner: 'h', selected: '2024' });
    expect(choices().filter((row) => row.ticked)).toEqual([{ name: '2024', ticked: true }]);

    await openChoose({ owner: 'h', selected: '2010' });
    expect(choices().filter((row) => row.ticked)).toEqual([{ name: '2020', ticked: true }]);

    for (const selected of ['2031', 'soon', '']) {
      await openChoose({ owner: 'h', selected });
      expect(choices().filter((row) => row.ticked)).toEqual([
        { name: 'This year, 2026', ticked: true },
      ]);
    }
  });

  it('ticks the chosen row for VoiceOver as selected and checked', async () => {
    await openChoose({ owner: 'h', selected: '2025' });
    expect(choice('2025').props.accessibilityState).toEqual({ selected: true, checked: true });
    expect(choice('2024').props.accessibilityState).toEqual({ selected: false, checked: false });
    expect(screen.getByTestId('years-card').props.accessibilityRole).toBe('radiogroup');
  });
});

describe('Choose year, on free', () => {
  beforeEach(() => accountIs('free'));

  it('puts the Pro badge on 2020 to 2025, never on this year or All years', async () => {
    await openChoose({ owner: 'h', selected: '2026' });
    expect(choices().map((row) => row.name)).toEqual([
      'This year, 2026',
      '2025, older history with Pro',
      '2024, older history with Pro',
      '2023, older history with Pro',
      '2022, older history with Pro',
      '2021, older history with Pro',
      '2020, older history with Pro',
    ]);
    expect(linkNames()).toEqual(['All years, 2020 – 2026']);
    expect(
      within(allYears('All years, 2020 – 2026')).queryByTestId('pro-badge', hidden),
    ).toBeNull();
    expect(screen.getAllByTestId('pro-badge', hidden)).toHaveLength(6);
  });

  it('a Pro-badged year still opens: it is chosen and handed back like any other', async () => {
    const picks: unknown[] = [];
    const stop = onPaymentPicked('h', 'year', (pick) => picks.push(pick));
    await openChoose({ kind: 'all', owner: 'h', selected: '2026' });
    await fireEvent.press(choice('2025, older history with Pro'));
    stop();
    expect(picks).toEqual([{ owner: 'h', type: 'year', year: 2025 }]);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('ends with "See up to 7 years with Pro", and Learn more opens the history explainer', async () => {
    await openChoose({ owner: 'h' });
    const footer = screen.getByTestId('pro-footer');
    expect(linesIn(footer)).toEqual(['See up to 7 years with Pro', 'Learn more']);
    await fireEvent.press(footer);
    expect(pushed()).toEqual([{ pathname: '/pro-feature', params: { id: 'history' } }]);
  });

  it('does not flash the badges or the footer while the plan is still being checked', async () => {
    await accountIs('unknown');
    await openChoose({ owner: 'h' });
    expect(screen.queryByTestId('pro-badge', hidden)).toBeNull();
    expect(screen.queryByTestId('pro-footer')).toBeNull();
  });
});

describe('Choose year, choosing', () => {
  it('hands the year back to the history that asked, by its id, and goes back', async () => {
    const picks: unknown[] = [];
    const stop = onPaymentPicked('history-7', 'year', (pick) => picks.push(pick));
    await openChoose({ kind: 'bill', owner: 'history-7', selected: '2026' });
    await fireEvent.press(choice('2022'));
    stop();
    expect(picks).toEqual([{ owner: 'history-7', type: 'year', year: 2022 }]);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(pushed()).toEqual([]);
  });

  it('This year hands back this year', async () => {
    const picks: unknown[] = [];
    const stop = onPaymentPicked('h', 'year', (pick) => picks.push(pick));
    await openChoose({ owner: 'h', selected: '2022' });
    await fireEvent.press(choice('This year, 2026'));
    stop();
    expect(picks).toEqual([{ owner: 'h', type: 'year', year: 2026 }]);
  });

  it('a pick for another history is not heard by this one', async () => {
    const picks: unknown[] = [];
    const stop = onPaymentPicked('someone-else', 'year', (pick) => picks.push(pick));
    await openChoose({ owner: 'h' });
    await fireEvent.press(choice('2024'));
    stop();
    expect(picks).toEqual([]);
  });

  it('with no history to tell, a year just goes back', async () => {
    await openChoose({});
    await fireEvent.press(choice('2024'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('is one page per visit: a second tap before it lands does nothing', async () => {
    await openChoose({ owner: 'h' });
    await fireEvent.press(choice('2024'));
    await fireEvent.press(choice('2023'));
    expect(jest.mocked(router.back)).toHaveBeenCalledTimes(1);
  });

  it('All years takes this page’s place, with the kind and the history to tell', async () => {
    await openChoose({ kind: 'subscription', owner: 'history-7', selected: '2026' });
    await fireEvent.press(allYears('All years, 2020 – 2026'));
    expect(jest.mocked(router.replace).mock.calls).toEqual([
      [{ pathname: '/payment-years', params: { kind: 'subscription', owner: 'history-7' } }],
    ]);
    expect(router.back).not.toHaveBeenCalled();
    expect(pushed()).toEqual([]);

    jest.clearAllMocks();
    await openChoose({ kind: 'bill' });
    await fireEvent.press(allYears('All years, 2020 – 2026'));
    expect(jest.mocked(router.replace).mock.calls).toEqual([
      [{ pathname: '/payment-years', params: { kind: 'bill' } }],
    ]);
  });
});

describe('Choose year, by kind', () => {
  it('lists only the years with a payment of the kind, and All years spans them', async () => {
    const data = {
      bills: BILLS,
      subscriptions: SUBSCRIPTIONS,
      charges: [...earlierYear(EARLIER_YEARS[0]), ...earlierYear(EARLIER_YEARS[5]), ...THIS_YEAR],
    };
    await openChoose({ owner: 'h' }, { data });
    expect(choices().map((row) => row.name)).toEqual(['This year, 2026', '2025', '2020']);
    expect(linkNames()).toEqual(['All years, 2020 – 2026']);
  });

  it('a kind with nothing before this year is This year and All years, and All years is 2026', async () => {
    await openChoose({ owner: 'h' }, { data: {} });
    expect(choices().map((row) => row.name)).toEqual(['This year, 2026']);
    expect(linkNames()).toEqual(['All years, 2026']);
  });

  it('the kind on the link narrows the years: subscriptions that began in 2025', async () => {
    const data = {
      bills: BILLS,
      subscriptions: SUBSCRIPTIONS,
      charges: [
        ...charged('rent', 2023, flat(100_000, 12)),
        ...charged('netflix', 2025, flat(1_599, 12)),
        ...THIS_YEAR,
      ],
    };
    await openChoose({ kind: 'subscription', owner: 'h' }, { data });
    expect(choices().map((row) => row.name)).toEqual(['This year, 2026', '2025']);
    expect(linkNames()).toEqual(['All years, 2025 – 2026']);
    await openChoose({ kind: 'bill', owner: 'h' }, { data });
    expect(choices().map((row) => row.name)).toEqual(['This year, 2026', '2023']);
    expect(linkNames()).toEqual(['All years, 2023 – 2026']);
  });
});

describe('Choose year, while it is read', () => {
  it.each<ReadName>(['bills', 'subscriptions', 'charges', 'payoffs', 'labels'])(
    'a skeleton while the %s are coming, and no list of one year',
    async (name) => {
      await openChoose({ owner: 'h' }, { loading: name });
      expect(screen.getByTestId('year-loading')).toBeTruthy();
      expect(screen.queryByTestId('years')).toBeNull();
      expect(screen.getByRole('header', { name: 'Choose year' })).toBeTruthy();
    },
  );

  it('draws the years once they land', async () => {
    await openChoose({ owner: 'h' }, { loading: 'charges' });
    await act(async () => mockChange({ loading: null }));
    expect(choices()).toHaveLength(7);
  });

  it.each<ReadName>(['bills', 'subscriptions', 'charges', 'payoffs', 'labels'])(
    'says the one failure line when the %s fail, never a list with only this year',
    async (name) => {
      await openChoose({ owner: 'h' }, { failed: name });
      expect(screen.getByTestId('art-error')).toBeTruthy();
      expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
      expect(screen.queryByTestId('years')).toBeNull();
    },
  );

  it('Try again reads every part again, and the years appear when it comes right', async () => {
    await openChoose({ owner: 'h' }, { failed: 'bills' });
    const asked: ReadName[] = [];
    mockWorld = {
      ...mockWorld,
      refetched: (name) => {
        asked.push(name);
        if (name === 'bills') mockChange({ failed: null });
      },
    };
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect([...asked].sort()).toEqual(['bills', 'charges', 'labels', 'payoffs', 'subscriptions']);
    expect(choices()).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------------------------
// Light and dark.

/** What a line of text sits on, by the class it is drawn with. */
const SURFACES: Record<string, ('surface' | 'card' | 'tint' | 'accent')[]> = {
  'text-ink': ['surface', 'card'],
  'text-muted': ['surface', 'card'],
  'text-body': ['surface', 'card'],
  'text-tint-ink': ['tint', 'card'],
  'text-on-control': ['accent'],
  'text-on-control/90': ['accent'],
};

describe.each(['light', 'dark'] as const)('in %s', (scheme) => {
  const tokens = buildTokens(scheme);

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

  /** Every colour class on the page is one checked here, and every pair clears 4.5:1. */
  function expectReadable(expected: string[]) {
    const used = colourClasses();
    expect([...used]).toEqual(expect.arrayContaining(expected));
    // A colour no one has checked fails here, not on someone's phone.
    expect([...used].filter((name) => !(name in SURFACES))).toEqual([]);
    for (const name of used) {
      for (const surface of SURFACES[name]) {
        expect([name, surface, ratio(name, surface) >= 4.5]).toEqual([name, surface, true]);
      }
    }
  }

  beforeEach(async () => {
    mockMode = scheme;
    await accountIs('free');
  });

  it('All years: draws every kind of text in a colour that reads on what it sits on, 4.5 to 1', async () => {
    await openYears();
    expectReadable([
      'text-ink',
      'text-muted',
      'text-tint-ink',
      'text-on-control',
      'text-on-control/90',
    ]);
  });

  it('All years: the glyphs and the plum card are this mode’s own', async () => {
    await openYears();
    expect(
      within(screen.getByRole('button', { name: 'Export payments' })).getByTestId('icon-Share')
        .props.iconColor,
    ).toBe(tokens.tintInk);
    expect(within(yearCard(2025)).getByTestId('icon-ChevronRight').props.iconColor).toBe(
      tokens.muted,
    );
    expect(screen.getByTestId('years-card').props.style).toEqual(
      scheme === 'light' ? shadows.card : undefined,
    );
  });

  it('Choose year: draws every kind of text in a colour that reads on what it sits on, 4.5 to 1', async () => {
    await openChoose({ owner: 'h', selected: '2025' });
    expectReadable(['text-ink', 'text-muted', 'text-body', 'text-tint-ink']);
  });

  it('Choose year: the tick is the accent on the card, at least 3 to 1 as a graphic', async () => {
    await openChoose({ owner: 'h', selected: '2025' });
    const tick = within(choice('2025, older history with Pro')).getByTestId('icon-Check');
    expect(tick.props.iconColor).toBe(tokens.accentInk);
    expect(contrast(tokens.accentInk, tokens.card)).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------------------------
// Languages.

describe('in every language', () => {
  const NBSP = ' ';
  const FR = (whole: string, cents: string) => `${whole},${cents}${NBSP}$`;

  it('writes All years whole in English, Spanish and French', async () => {
    await accountIs('free');
    const WORDS = {
      en: {
        title: 'All years',
        export: 'Export payments',
        card: ['Paid since 2020', '$131,251.84', '499 payments · 7 years'],
        spoken: 'Paid since 2020, $131,251.84. 499 payments, 7 years.',
        year: ['2026', '67 payments', '$18,548.81'],
        yearSpoken: '2026, 67 payments, $18,548.81',
        proSpoken: '2025, older history with Pro, 84 payments, $22,407.36',
        footer: ['See up to 7 years with Pro', 'Learn more'],
      },
      es: {
        title: 'Todos los años',
        export: 'Exportar pagos',
        card: ['Pagado desde 2020', '$131,251.84', '499 pagos · 7 años'],
        spoken: 'Pagado desde 2020, $131,251.84. 499 pagos, 7 años.',
        year: ['2026', '67 pagos', '$18,548.81'],
        yearSpoken: '2026, 67 pagos, $18,548.81',
        proSpoken: '2025, historial anterior con Pro, 84 pagos, $22,407.36',
        footer: ['Consulta hasta 7 años con Pro', 'Más información'],
      },
      fr: {
        title: 'Toutes les années',
        export: 'Exporter les paiements',
        card: ['Payé depuis 2020', FR('131 251', '84'), '499 paiements · 7 ans'],
        spoken: `Payé depuis 2020, ${FR('131 251', '84')}. 499 paiements, 7 ans.`,
        year: ['2026', '67 paiements', FR('18 548', '81')],
        yearSpoken: `2026, 67 paiements, ${FR('18 548', '81')}`,
        proSpoken: `2025, historique plus ancien avec Pro, 84 paiements, ${FR('22 407', '36')}`,
        footer: ['Consulte jusqu’à 7 ans avec Pro', 'En savoir plus'],
      },
    } as const;

    for (const language of ['en', 'es', 'fr'] as const) {
      const words = WORDS[language];
      setLanguage(language);
      await openYears();
      const said = (what: unknown) => [language, what];
      expect(said(screen.getByRole('header', { name: words.title }) !== null)).toEqual(said(true));
      expect(screen.getByRole('button', { name: words.export })).toBeTruthy();
      expect(said(sinceCard())).toEqual(said([...words.card]));
      expect(said(screen.getByTestId('years-card-summary').props.accessibilityLabel)).toEqual(
        said(words.spoken),
      );
      expect(said(linesIn(yearCard(2026)))).toEqual(said([...words.year]));
      expect(said(yearCard(2026).props.accessibilityLabel)).toEqual(said(words.yearSpoken));
      expect(said(yearCard(2025).props.accessibilityLabel)).toEqual(said(words.proSpoken));
      expect(said(linesIn(screen.getByTestId('pro-footer')))).toEqual(said([...words.footer]));
    }
  });

  it('writes Choose year whole in English, Spanish and French', async () => {
    await accountIs('free');
    const WORDS = {
      en: {
        title: 'Choose year',
        rows: ['This year, 2026', '2025, older history with Pro', 'All years, 2020 – 2026'],
      },
      es: {
        title: 'Elige el año',
        rows: ['Este año, 2026', '2025, historial anterior con Pro', 'Todos los años, 2020 – 2026'],
      },
      fr: {
        title: 'Choisis l’année',
        rows: [
          'Cette année, 2026',
          '2025, historique plus ancien avec Pro',
          'Toutes les années, 2020 – 2026',
        ],
      },
    } as const;
    for (const language of ['en', 'es', 'fr'] as const) {
      const words = WORDS[language];
      setLanguage(language);
      await openChoose({ owner: 'h' });
      const names = choices().map((row) => row.name);
      const said = (what: unknown) => [language, what];
      expect(said(screen.getByRole('header', { name: words.title }) !== null)).toEqual(said(true));
      expect(said([names[0], names[1], ...linkNames()])).toEqual(said([...words.rows]));
    }
  });

  it('a count of one is singular: "1 payment", "1 year"', async () => {
    const one = {
      bills: [{ ...BILLS[0], starts_on: '2026-01-01', next_due_on: '2026-01-01' }],
      charges: charged('rent', 2026, [103_500]),
    };
    await openYears({}, { data: one });
    expect(sinceCard()).toEqual(['Paid since 2026', '$1,035.00', '1 payment · 1 year']);

    setLanguage('fr');
    await openYears({}, { data: one });
    expect(sinceCard()).toEqual(['Payé depuis 2026', FR('1 035', '00'), '1 paiement · 1 an']);
    setLanguage('es');
    await openYears({}, { data: one });
    expect(sinceCard()).toEqual(['Pagado desde 2026', '$1,035.00', '1 pago · 1 año']);
  });

  it.each<Language>(['en', 'es', 'fr'])(
    '%s: no raw key and no unfilled {token} on either page, drawn or read aloud',
    async (language) => {
      setLanguage(language);
      await accountIs('free');
      for (const open of [() => openYears(), () => openChoose({ owner: 'h' })]) {
        await open();
        const { said } = everything();
        expect(said.length).toBeGreaterThan(20);
        for (const line of said) {
          expect(line).not.toMatch(/\b(payments|pro|common|dates|ui)\.[a-z]/);
          expect(line).not.toMatch(/\{\w+\}/);
          expect(line).not.toMatch(/undefined|NaN|\[object/);
        }
      }
    },
  );
});

// ---------------------------------------------------------------------------------------------
// Large text.

describe('at large text', () => {
  const layout = async (node: Parameters<typeof fireEvent>[0], width: number) =>
    fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });

  beforeEach(() => {
    const window = { width: 390, height: 844, scale: 3, fontScale: 3 };
    Dimensions.set({ window, screen: window });
  });

  it('All years: every line has its role’s ceiling and is never cut or shrunk', async () => {
    await accountIs('free');
    await openYears();
    const ceilings = new Set<number>(Object.values(TEXT_CAP));
    const { texts } = everything();
    expect(texts.length).toBeGreaterThan(30);
    for (const { line, props } of texts) {
      expect([line, ceilings.has(props.maxFontSizeMultiplier as number)]).toEqual([line, true]);
      expect([line, props.numberOfLines]).toEqual([line, undefined]);
      expect([line, props.adjustsFontSizeToFit]).toEqual([line, undefined]);
    }
  });

  it('All years: keeps the card whole and puts a year’s total under it once its words are cramped', async () => {
    await accountIs('free');
    await openYears();
    expect(sinceCard()).toEqual(['Paid since 2020', '$131,251.84', '499 payments · 7 years']);
    expect(linesIn(yearCard(2025))).toEqual(['2025', '84 payments', '$22,407.36']);

    const card = yearCard(2025);
    await layout(card, 300);
    await layout(within(card).getByTestId('fit-slot-year', hidden), 200);
    await layout(within(card).getByTestId('fit-copy-year', hidden), 40);
    await layout(within(card).getByTestId('fit-slot-count', hidden), 60);
    await layout(within(card).getByTestId('fit-copy-count', hidden), 90);
    // The year, then its total, then the count: nothing lost, the amount whole.
    expect(linesIn(yearCard(2025))).toEqual(['2025', '$22,407.36', '84 payments']);
    expect(linesIn(yearCard(2026))).toEqual(['2026', '67 payments', '$18,548.81']);
  });

  it('All years: the card, the years and the footer are in the scroll; the title and export are not', async () => {
    await accountIs('free');
    await openYears();
    expect(inside(screen.getByTestId('years-card'))).toBe(true);
    expect(inside(yearCard(2020))).toBe(true);
    expect(inside(screen.getByTestId('pro-footer'))).toBe(true);
    expect(inside(screen.getByRole('header', { name: 'All years' }))).toBe(false);
    expect(inside(screen.getByRole('button', { name: 'Export payments' }))).toBe(false);
  });

  it('Choose year: every line has its ceiling, and the list and the footer are in the scroll', async () => {
    await accountIs('free');
    await openChoose({ owner: 'h', selected: '2025' });
    const ceilings = new Set<number>(Object.values(TEXT_CAP));
    const { texts } = everything();
    expect(texts.length).toBeGreaterThan(15);
    for (const { line, props } of texts) {
      expect([line, ceilings.has(props.maxFontSizeMultiplier as number)]).toEqual([line, true]);
      expect([line, props.numberOfLines]).toEqual([line, undefined]);
      expect([line, props.adjustsFontSizeToFit]).toEqual([line, undefined]);
    }
    expect(inside(choice('2025, older history with Pro'))).toBe(true);
    expect(inside(screen.getByTestId('pro-footer'))).toBe(true);
    expect(inside(screen.getByRole('header', { name: 'Choose year' }))).toBe(false);
  });
});
