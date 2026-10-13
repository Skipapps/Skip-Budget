import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import type { PaymentsData } from '@/api/payment-ledger';
import PaymentHistoryScreen from '@/app/payment-history';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { historyFloor } from '@/lib/allowance';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { toCents } from '@/lib/money';
import type { PaymentEntry } from '@/lib/payment-entries';
import { pickPayment } from '@/lib/payment-pick';
import { paymentFloor } from '@/lib/payment-years';
import { contrast } from '@/lib/tone';
import { ThemeProvider } from '@/providers/theme-provider';
import { buildTokens, mix, type Scheme } from '@/theme/palette';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Payment history (3.png) on 12 Oct 2026, over the design's account: four bills and three
 * subscriptions charged on their days, plus the six years before as the All years design gives them.
 *
 *   2026, All            $18,548.81 · 67 payments · Avg / month $1,854.88 (÷ 10)
 *   2026, Bills          $18,172.00 · 38 · $1,817.20
 *   2026, Subscriptions  $376.81 · 29 · $37.68
 *   October $1,205.99 (4 rows) · September $1,922.98 (7 rows)
 *
 * Free lists rows from 15 Jul 2026 and keeps every figure whole; a year wholly older shows its
 * figures over the history notice.
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
let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));
let mockData: PaymentsData;
jest.mock('@/api/payment-ledger', () => ({ usePayments: () => mockData }));
// The app's own refresh, which runs the sweep: a pull must reach it.
const mockRefreshAll = jest.fn(() => Promise.resolve());
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: mockRefreshAll, refreshing: false }),
}));

// ---------------------------------------------------------------------------------------------
// The design account.

const TODAY = '2026-10-12';
const PRO_FLOOR = paymentFloor(TODAY);
const FREE_FLOOR = historyFloor(false, new Date(`${TODAY}T00:00:00`));
const LABELS: Record<string, string> = {
  komal: 'Komal ••7010',
  discover: 'Discover ••6334',
};

type Plan = {
  id: string;
  name: string;
  kind: PaymentEntry['kind'];
  categoryId: string;
  sourceId: string;
};

const PLANS: Record<string, Plan> = {
  rent: {
    id: 'rent',
    name: 'Ashword Hill Apartments',
    kind: 'bill',
    categoryId: 'housing',
    sourceId: 'komal',
  },
  nationwide: {
    id: 'nationwide',
    name: 'Nationwide',
    kind: 'bill',
    categoryId: 'insurance',
    sourceId: '',
  },
  aep: { id: 'aep', name: 'AEP', kind: 'bill', categoryId: 'energy', sourceId: 'komal' },
  car: { id: 'car', name: 'Car loan', kind: 'bill', categoryId: 'loans', sourceId: 'discover' },
  netflix: {
    id: 'netflix',
    name: 'Netflix',
    kind: 'subscription',
    categoryId: 'entertainment',
    sourceId: '',
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    kind: 'subscription',
    categoryId: 'entertainment',
    sourceId: '',
  },
  icloud: {
    id: 'icloud',
    name: 'iCloud+',
    kind: 'subscription',
    categoryId: 'entertainment',
    sourceId: 'discover',
  },
  old: { id: 'old', name: 'Old rent', kind: 'bill', categoryId: 'housing', sourceId: 'komal' },
};

function paid(plan: Plan, date: string, amount: number): PaymentEntry {
  return {
    id: `${plan.id}@${date}`,
    date,
    name: plan.name,
    planName: plan.name,
    amount,
    kind: plan.kind,
    status: 'paid',
    sourceId: plan.sourceId,
    planId: plan.id,
    categoryId: plan.categoryId,
    iconId: null,
    domain: null,
    logoHidden: false,
  };
}

/** Months from yyyy-mm to yyyy-mm, both included. */
function months(from: string, to: string): string[] {
  const out: string[] = [];
  let [year, month] = from.split('-').map(Number);
  for (;;) {
    const at = `${year}-${String(month).padStart(2, '0')}`;
    if (at > to) return out;
    out.push(at);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

function monthly(plan: Plan, day: string, from: string, to: string, amount: (m: string) => number) {
  return months(from, to).map((month) => paid(plan, `${month}-${day}`, amount(month)));
}

/** `count` payments in `year` summing exactly `total`, spread over its months, as one plan. */
function yearOf(year: number, count: number, total: number): PaymentEntry[] {
  const cents = toCents(total);
  const base = Math.floor(cents / count);
  const over = cents - base * count;
  return Array.from({ length: count }, (_, i) =>
    paid(
      { ...PLANS.old, id: `old-${year}-${i}` },
      `${year}-${String((i % 12) + 1).padStart(2, '0')}-${String(1 + Math.floor(i / 12)).padStart(2, '0')}`,
      (base + (i < over ? 1 : 0)) / 100,
    ),
  );
}

const newestFirst = (rows: PaymentEntry[]) =>
  [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? -1 : 1));

const flat = (amount: number) => () => amount;

const DESIGN_2026 = [
  ...monthly(PLANS.rent, '01', '2026-01', '2026-10', flat(1035)),
  ...monthly(PLANS.nationwide, '11', '2026-01', '2026-10', flat(145)),
  // A cold January: AEP was $186.00.
  ...monthly(PLANS.aep, '22', '2026-01', '2026-09', (m) => (m === '2026-01' ? 186 : 150)),
  ...monthly(PLANS.car, '28', '2026-01', '2026-09', flat(554)),
  ...monthly(PLANS.netflix, '09', '2026-01', '2026-10', flat(15.99)),
  ...monthly(PLANS.spotify, '09', '2026-01', '2026-10', flat(10)),
  ...monthly(PLANS.icloud, '15', '2026-01', '2026-09', flat(12.99)),
];

/** 2025 is Netflix's twelve ($191.88) and the rest of the design's $22,407.36 over 84. */
const EARLIER = [
  ...monthly(PLANS.netflix, '09', '2025-01', '2025-12', flat(15.99)),
  ...yearOf(2025, 72, 22407.36 - 191.88),
  ...yearOf(2024, 84, 21630.12),
  ...yearOf(2023, 72, 19264.0),
  ...yearOf(2022, 72, 17880.5),
  ...yearOf(2021, 60, 16402.75),
  ...yearOf(2020, 60, 15118.3),
];

const DESIGN = Object.freeze(newestFirst([...DESIGN_2026, ...EARLIER]));

function dataOf(over: Partial<PaymentsData> = {}): PaymentsData {
  return {
    payments: DESIGN,
    listFloor: PRO_FLOOR,
    free: false,
    labelOf: (id: string) => LABELS[id] ?? null,
    sources: [],
    isLoading: false,
    isError: false,
    refreshFailed: false,
    refetch: jest.fn(),
    ...over,
  };
}

const FREE = { listFloor: FREE_FLOOR, free: true };

// ---------------------------------------------------------------------------------------------
// Reading the screen.

/** The history notice, as VoiceOver reads it. */
const NOTICE = /^Older history is saved\. Free shows the last 90 days\./;

/** The first "$1,234.56" in a line, in whole cents. */
const centsIn = (line: string) => Number(/\$([\d,]+\.\d\d)/.exec(line)![1].replace(/[,.]/g, ''));

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

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
const rowsIn = (month: string) =>
  within(screen.getByTestId(`history-${month}-card`))
    .getAllByTestId(/^payment-.+@\d{4}-\d{2}-\d{2}$/)
    .map(linesIn);

/** Every Text with its class, and every word spoken. */
function everything(): { texts: { line: string; className: string; props: Json['props'] }[] } {
  const texts: { line: string; className: string; props: Json['props'] }[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    if (node.type === 'Text') {
      const line = (node.children ?? []).filter((part) => typeof part === 'string').join('');
      texts.push({ line, className: String(node.props.className ?? ''), props: node.props });
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Tree;
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return { texts };
}

let mounted: { unmount: () => void | Promise<void> } | null = null;

async function mount(ui: ReactElement) {
  await mounted?.unmount();
  const view = await render(<ThemeProvider>{ui}</ThemeProvider>);
  mounted = view;
  // The theme reads the stored mode a tick after the first frame.
  await act(async () => {});
  return view;
}

async function open(params: Record<string, string> = {}, data: PaymentsData = dataOf()) {
  mockParams = params;
  mockData = data;
  return mount(<PaymentHistoryScreen />);
}

const pushed = () => jest.mocked(router.push).mock.calls.map(([href]) => href);

beforeEach(() => {
  resetLocaleForTests();
  mockToday = TODAY;
  mockMode = 'light';
  mockPro = { pro: true, ready: true };
  mockParams = {};
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------------------------
// 3.png.

describe('Payment history: 2026 on the 12th of October', () => {
  it('the fixture is the design: 67 payments this year, 499 over seven', () => {
    expect(FREE_FLOOR).toBe('2026-07-15');
    expect(PRO_FLOOR).toBe('2020-01-01');
    expect(DESIGN_2026).toHaveLength(67);
    expect(DESIGN).toHaveLength(499);
    expect(DESIGN.filter((row) => row.date > TODAY || row.date < PRO_FLOOR)).toEqual([]);
    expect(DESIGN.reduce((sum, row) => sum + toCents(row.amount), 0)).toBe(13125184);
  });

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
    expect(screen.getByTestId('history-card-summary').props.accessibilityLabel).toMatch(
      /^Paid in 2026: \$18,548\.81\. 67 payments\. Average \$1,854\.88 a month\. By month: January \$1,958\.98, /,
    );
  });

  it('October $1,205.99 over 4 rows and September $1,922.98 over 7, each row as paid', async () => {
    await open();
    expect(monthsShown()).toEqual(months('2026-01', '2026-10').reverse());
    expect(
      within(screen.getByTestId('history-2026-10')).getByRole('header', {
        name: 'October 2026, $1,205.99 paid',
      }),
    ).toBeTruthy();
    expect(rowsIn('2026-10')).toEqual([
      ['Nationwide', '11 Oct · Card not set', '$145.00', 'Paid'],
      ['Netflix', '9 Oct · Card not set', '$15.99', 'Paid'],
      ['Spotify', '9 Oct · Card not set', '$10.00', 'Paid'],
      ['Ashword Hill Apartments', '1 Oct · Komal ••7010', '$1,035.00', 'Paid'],
    ]);
    expect(
      within(screen.getByTestId('history-2026-09')).getByRole('header', {
        name: 'September 2026, $1,922.98 paid',
      }),
    ).toBeTruthy();
    expect(rowsIn('2026-09').map((row) => row[0])).toEqual([
      'Car loan',
      'AEP',
      'iCloud+',
      'Nationwide',
      'Netflix',
      'Spotify',
      'Ashword Hill Apartments',
    ]);
    expect(rowsIn('2026-09')[0]).toEqual([
      'Car loan',
      '28 Sep · Discover ••6334',
      '$554.00',
      'Paid',
    ]);
    // Every month's total, added up, is the card's figure to the cent.
    const totals = monthsShown().map((month) => {
      const name = String(
        within(screen.getByTestId(`history-${month}`)).getByRole('header').props.accessibilityLabel,
      );
      return centsIn(name);
    });
    expect(totals.reduce((sum, cents) => sum + cents, 0)).toBe(1854881);
  });

  it('lists every row of the year on Pro, with no history notice', async () => {
    await open();
    expect(screen.getAllByTestId(/^payment-.+@2026-\d{2}-\d{2}$/)).toHaveLength(67);
    expect(screen.queryByRole('button', { name: NOTICE })).toBeNull();
  });

  it('opens a row’s own page, never a form', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('payment-netflix@2026-10-09'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/subscription/[id]',
      params: { id: 'netflix' },
    });
    for (const href of pushed()) expect(JSON.stringify(href)).not.toContain('/add-');
  });
});

describe('the tabs', () => {
  it('Bills: $18,172.00 · 38 · $1,817.20, bills only', async () => {
    await open();
    await fireEvent.press(screen.getByRole('tab', { name: 'Bills' }));
    expect(screen.getByRole('tab', { name: 'Bills', selected: true })).toBeTruthy();
    expect(card()).toEqual([
      'Paid in 2026',
      '$18,172.00',
      'Payments',
      '38',
      'Avg / month',
      '$1,817.20',
    ]);
    expect(rowsIn('2026-10').map((row) => row[0])).toEqual([
      'Nationwide',
      'Ashword Hill Apartments',
    ]);
  });

  it('Subscriptions: $376.81 · 29 · $37.68, subscriptions only', async () => {
    await open();
    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    expect(card()).toEqual(['Paid in 2026', '$376.81', 'Payments', '29', 'Avg / month', '$37.68']);
    expect(rowsIn('2026-09').map((row) => row[0])).toEqual(['iCloud+', 'Netflix', 'Spotify']);
  });

  it('starts on the kind it was opened with, and on All for anything else', async () => {
    await open({ kind: 'bill' });
    expect(screen.getByRole('tab', { name: 'Bills', selected: true })).toBeTruthy();
    expect(card()[1]).toBe('$18,172.00');

    await open({ kind: 'subscription' });
    expect(screen.getByRole('tab', { name: 'Subscriptions', selected: true })).toBeTruthy();

    await open({ kind: 'loans' });
    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeTruthy();
    expect(card()[1]).toBe('$18,548.81');
  });
});

describe('on free', () => {
  it('keeps every figure whole and lists rows from 15 July, then the history notice', async () => {
    await open({}, dataOf(FREE));
    expect(card()).toEqual([
      'Paid in 2026',
      '$18,548.81',
      'Payments',
      '67',
      'Avg / month',
      '$1,854.88',
    ]);
    expect(monthsShown()).toEqual(['2026-10', '2026-09', '2026-08', '2026-07']);
    // July's total is all of July; its rows start on the 15th.
    expect(
      within(screen.getByTestId('history-2026-07')).getByRole('header', {
        name: 'July 2026, $1,922.98 paid',
      }),
    ).toBeTruthy();
    expect(rowsIn('2026-07').map((row) => row.slice(0, 2))).toEqual([
      ['Car loan', '28 Jul · Discover ••6334'],
      ['AEP', '22 Jul · Komal ••7010'],
      ['iCloud+', '15 Jul · Discover ••6334'],
    ]);
    // One notice, at the bottom, under July's last row.
    const list = screen.getByTestId('history-list');
    const notices = within(list).getAllByRole('button', { name: NOTICE });
    expect(notices).toHaveLength(1);
    const buttons = within(list).getAllByRole('button');
    expect(buttons[buttons.length - 1]).toBe(notices[0]);
    expect(buttons[buttons.length - 2]).toBe(screen.getByTestId('payment-icloud@2026-07-15'));
    await fireEvent.press(notices[0]);
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'history' },
    });
  });

  it('opens a year only Pro lists with its figures, and the notice in place of its rows', async () => {
    await open({ year: '2025' }, dataOf(FREE));
    expect(within(screen.getByTestId('year-chip')).getByText('2025')).toBeTruthy();
    // 2,240,736 cents over twelve months.
    expect(card()).toEqual([
      'Paid in 2025',
      '$22,407.36',
      'Payments',
      '84',
      'Avg / month',
      '$1,867.28',
    ]);
    expect(monthsShown()).toEqual([]);
    expect(screen.queryAllByTestId(/^payment-/)).toHaveLength(0);
    expect(
      within(screen.getByTestId('history-list')).getAllByRole('button', { name: NOTICE }),
    ).toHaveLength(1);
    expect(screen.queryByText('No payments in 2025 yet')).toBeNull();
  });
});

describe('the year shown', () => {
  it('is the one in the link, with its months on Pro and no bar picked out', async () => {
    await open({ year: '2025' });
    expect(card()[0]).toBe('Paid in 2025');
    expect(card()[1]).toBe('$22,407.36');
    expect(monthsShown()).toEqual(months('2025-01', '2025-12').reverse());
    expect(screen.getByTestId('year-chip').props.accessibilityLabel).toBe(
      'Showing 2025. Choose another year',
    );
  });

  it('is this year for a link that is not a year, and held inside the seven years', async () => {
    await open({ year: 'last' });
    expect(card()[0]).toBe('Paid in 2026');
    await open({ year: '2015' });
    expect(card()[0]).toBe('Paid in 2020');
    expect(card()[1]).toBe('$15,118.30');
    await open({ year: '2031' });
    expect(card()[0]).toBe('Paid in 2026');
  });

  it('opens Choose year for the tab shown, and takes the year handed back to it', async () => {
    await open();
    await fireEvent.press(screen.getByRole('tab', { name: 'Bills' }));
    await fireEvent.press(screen.getByTestId('year-chip'));
    const href = jest.mocked(router.push).mock.calls[0][0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(href.pathname).toBe('/payment-year');
    expect(href.params).toEqual({ kind: 'bill', owner: expect.any(String), selected: '2026' });
    const owner = href.params.owner;
    expect(owner).not.toBe('');

    // A year picked for another page is not this one's.
    await act(() => pickPayment({ owner: `${owner}-other`, type: 'year', year: 2022 }));
    expect(card()[0]).toBe('Paid in 2026');

    await act(() => pickPayment({ owner, type: 'year', year: 2024 }));
    expect(card()).toEqual([
      'Paid in 2024',
      '$21,630.12',
      'Payments',
      '84',
      'Avg / month',
      '$1,802.51',
    ]);
    expect(within(screen.getByTestId('year-chip')).getByText('2024')).toBeTruthy();
    // The tab stays where it was.
    expect(screen.getByRole('tab', { name: 'Bills', selected: true })).toBeTruthy();

    await act(() => pickPayment({ owner, type: 'year', year: 2026 }));
    expect(within(screen.getByTestId('year-chip')).getByText('This year')).toBeTruthy();
  });

  it('moves on to the new year on New Year’s Day when none was asked for', async () => {
    await open();
    expect(card()[0]).toBe('Paid in 2026');
    mockToday = '2027-01-01';
    mockData = dataOf();
    await mount(<PaymentHistoryScreen />);
    expect(card()[0]).toBe('Paid in 2027');
    expect(within(screen.getByTestId('year-chip')).getByText('This year')).toBeTruthy();
    expect(screen.getByText('No payments in 2027 yet')).toBeTruthy();
  });
});

describe('search and export', () => {
  it('opens search on the tab shown', async () => {
    await open();
    await fireEvent.press(screen.getByRole('tab', { name: 'Subscriptions' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Search payments' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/payment-search',
      params: { kind: 'subscription' },
    });
  });

  it.each([
    ['the header button', 'Export payments'],
    ['the link', 'Export CSV or PDF'],
  ])('on Pro, %s exports the tab and year shown', async (_where, name) => {
    await open({ kind: 'bill', year: '2024' });
    await fireEvent.press(screen.getByRole('button', { name }));
    expect(pushed()).toEqual(['/payment-export?kind=bill&year=2024']);
  });

  it.each([
    ['the header button', 'Export payments'],
    ['the link', 'Export CSV or PDF'],
  ])('on free, %s opens the export explainer', async (_where, name) => {
    mockPro = { pro: false, ready: true };
    await open({}, dataOf(FREE));
    await fireEvent.press(screen.getByRole('button', { name }));
    expect(pushed()).toEqual([
      {
        pathname: '/pro-feature',
        params: { id: 'export', next: '/payment-export?kind=all&year=2026' },
      },
    ]);
  });

  it('does nothing until Pro is known', async () => {
    mockPro = { pro: false, ready: false };
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Export CSV or PDF' }));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('loading, failure and an empty year', () => {
  it('holds the card and the rows while the payments are read, never "no payments"', async () => {
    await open({}, dataOf({ isLoading: true, payments: [] }));
    expect(screen.getByTestId('history-loading')).toBeTruthy();
    expect(screen.queryByTestId('history-card')).toBeNull();
    expect(screen.queryByText(/No payments/)).toBeNull();
    // The page's own controls are there already.
    expect(screen.getByTestId('year-chip')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeTruthy();
  });

  it('says the one failure line with Try again, and never a year of nothing', async () => {
    const refetch = jest.fn();
    await open({}, dataOf({ isError: true, payments: [], refetch }));
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByTestId('history-card')).toBeNull();
    expect(screen.queryByText(/No payments/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('runs the app’s refresh, sweep and all, on a pull: not a bare re-read', async () => {
    const refetch = jest.fn();
    await open({}, dataOf({ refetch }));
    let pull: (() => void) | undefined;
    const walk = (node: Json | string) => {
      if (typeof node === 'string') return;
      const control = node.props.refreshControl as { props: { onRefresh: () => void } } | undefined;
      if (node.type === 'RCTScrollView' && control) pull = control.props.onRefresh;
      node.children?.forEach(walk);
    };
    const tree = screen.toJSON() as Tree;
    (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
    expect(pull).toBeDefined();
    await act(async () => pull?.());
    expect(mockRefreshAll).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('an account with nothing paid: $0.00, 0, $0.00, flat bars and the line', async () => {
    await open({}, dataOf({ payments: [] }));
    expect(card()).toEqual(['Paid in 2026', '$0.00', 'Payments', '0', 'Avg / month', '$0.00']);
    expect(screen.getByText('No payments in 2026 yet')).toBeTruthy();
    expect(monthsShown()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
const NOTE: Record<Language, string> = {
  en: 'Couldn’t refresh · showing your last figures',
  es: 'No se pudo actualizar · mostrando tus últimas cifras',
  fr: 'Impossible d’actualiser · voici tes derniers chiffres',
};

type Host = ReturnType<typeof screen.getByText>;

/**
 * The refresh note as drawn: muted and centred, wrapping at the reading ceiling, read by VoiceOver,
 * and straight under the card whose testID is given.
 */
function noteUnder(cardTestID: string, language: Language = 'en'): Host {
  const note = screen.getByText(NOTE[language]);
  expect(note.props.accessibilityRole).toBe('text');
  expect(note.props.maxFontSizeMultiplier).toBe(TEXT_CAP.reading);
  expect(note.props.numberOfLines).toBeUndefined();
  expect(classOf(note)).toContain('text-center');
  const kids = (note.parent?.children ?? []) as (Host | string)[];
  const card = kids[kids.indexOf(note) - 1] as Host;
  expect(typeof card).toBe('object');
  expect(
    card.props.testID === cardTestID ||
      within(card).queryByTestId(cardTestID, { includeHiddenElements: true }) !== null,
  ).toBe(true);
  return note;
}

describe('a refresh that failed', () => {
  it('keeps the year on screen with the note straight under the year card', async () => {
    await open({}, dataOf({ refreshFailed: true }));
    expect(card()[1]).toBe('$18,548.81');
    noteUnder('history-card');
    expect(monthsShown().length).toBeGreaterThan(0);
  });

  it('has no note after a good refresh, and never one beside the error page', async () => {
    await open({}, dataOf());
    expect(screen.queryByText(NOTE.en)).toBeNull();
    await open({}, dataOf({ isError: true, refreshFailed: true, payments: [] }));
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(NOTE.en)).toBeNull();
  });

  it.each<Language>(['es', 'fr'])('says it in %s', async (language) => {
    setLanguage(language);
    await open({}, dataOf({ refreshFailed: true }));
    noteUnder('history-card', language);
  });
});

// Languages and large text.

describe('in every language, at large text', () => {
  it.each<Language>(['en', 'es', 'fr'])(
    '%s: each line at its role’s ceiling, never cut, never a raw key',
    async (language) => {
      setLanguage(language);
      await open({}, dataOf(FREE));
      const ceilings = new Set<number>(Object.values(TEXT_CAP));
      const { texts } = everything();
      expect(texts.length).toBeGreaterThan(20);
      for (const { line, props } of texts) {
        expect(ceilings.has(props.maxFontSizeMultiplier as number)).toBe(true);
        expect(props.numberOfLines).toBeUndefined();
        expect(props.adjustsFontSizeToFit).toBeUndefined();
        expect(line).not.toMatch(/(payments|pro|ui|common)\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}/);
      }
    },
  );

  it('lets the chip row and the tabs wrap rather than cut a word', async () => {
    setLanguage('fr');
    await open();
    expect(classOf(screen.getByTestId('year-chip').parent)).toContain('flex-wrap');
    expect(classOf(screen.getByTestId('kind-tabs'))).toContain('flex-wrap');
  });

  it('writes the page in Spanish', async () => {
    setLanguage('es');
    await open();
    expect(screen.getByRole('header', { name: 'Historial de pagos' })).toBeTruthy();
    for (const line of [
      'Este año',
      'Exportar CSV o PDF',
      'Todos',
      'Facturas',
      'Suscripciones',
      'Buscar pagos',
      'Pagado en 2026',
      'Pagos',
      'Prom. / mes',
    ]) {
      expect(screen.getAllByText(line).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('button', { name: 'Exportar pagos' })).toBeTruthy();
    expect(screen.getByTestId('year-chip').props.accessibilityLabel).toBe(
      'Año: 2026. Elige otro año',
    );
    expect(card()[1]).toBe(formatCurrency(18548.81));
  });

  it('writes the page in French, money the French way', async () => {
    setLanguage('fr');
    await open();
    expect(screen.getByRole('header', { name: 'Historique des paiements' })).toBeTruthy();
    for (const line of [
      'Cette année',
      'Exporter en CSV ou PDF',
      'Tous',
      'Factures',
      'Abonnements',
      'Rechercher des paiements',
      'Payé en 2026',
      'Paiements',
      'Moy. / mois',
    ]) {
      expect(screen.getAllByText(line).length).toBeGreaterThan(0);
    }
    expect(card()[1]).toMatch(/^18\s548,81\s\$$/u);
    expect(card()[5]).toMatch(/^1\s854,88\s\$$/u);
    expect(screen.getByTestId('year-chip').props.accessibilityLabel).toMatch(
      /^Année\s:\s2026\. Choisis une autre année$/u,
    );
  });
});

// ---------------------------------------------------------------------------------------------
// Light and dark.

/** What a line of text sits on, by the class it is drawn with. */
const SURFACES: Record<string, ('surface' | 'card' | 'tint' | 'accent')[]> = {
  'text-ink': ['surface', 'card'],
  'text-muted': ['surface', 'card'],
  'text-on-control': ['accent'],
  'text-on-control/90': ['accent'],
};

describe.each(['light', 'dark'] as const)('in %s', (scheme) => {
  const tokens = buildTokens(scheme);

  beforeEach(() => {
    mockMode = scheme;
  });

  const ratio = (name: string, surface: 'surface' | 'card' | 'tint' | 'accent'): number => {
    const token = name.replace(/^text-/, '').replace(/\/\d+$/, '');
    const camel = token.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    const colour = tokens[camel as keyof typeof tokens];
    // The soft lines on the plum card are 90% white over it.
    const drawn = name.endsWith('/90') ? mix(tokens.accent, colour, 0.9) : colour;
    return contrast(drawn, tokens[surface]);
  };

  it('draws every kind of text in a colour that reads on what it sits on, 4.5 to 1', async () => {
    await open({}, dataOf(FREE));
    const used = new Set<string>();
    for (const { className } of everything().texts) {
      for (const name of className.match(/\btext-(?!\[|center|left|right)[a-z-]+(?:\/\d+)?/g) ??
        []) {
        used.add(name);
      }
    }
    // The page does use each of them, so this cannot pass on an empty set.
    expect([...used]).toEqual(expect.arrayContaining(Object.keys(SURFACES)));
    // A colour no one has checked fails here, not on someone's phone.
    expect([...used].filter((name) => !(name in SURFACES))).toEqual([]);
    for (const name of used) {
      for (const surface of SURFACES[name]) {
        expect([name, surface, ratio(name, surface) >= 4.5]).toEqual([name, surface, true]);
      }
    }
  });

  it('draws the export glyph in this mode’s own tint ink', async () => {
    await open();
    expect(
      within(screen.getByRole('button', { name: 'Export payments' })).getByTestId('icon-Share')
        .props.iconColor,
    ).toBe(tokens.tintInk);
    expect(
      within(screen.getByRole('button', { name: 'Search payments' })).getByTestId('icon-Search')
        .props.iconColor,
    ).toBe(tokens.muted);
  });
});
