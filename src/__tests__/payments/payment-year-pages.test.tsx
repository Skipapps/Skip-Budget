import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import type { PaymentsData } from '@/api/payment-ledger';
import PaymentYearScreen from '@/app/payment-year';
import PaymentYearsScreen from '@/app/payment-years';
import { ChoiceList } from '@/components/payments/choice-list';
import { YearCard, paymentsCountText } from '@/components/payments/year-card';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { historyFloor } from '@/lib/allowance';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { toCents } from '@/lib/money';
import type { PaymentEntry } from '@/lib/payment-entries';
import { onPaymentPicked } from '@/lib/payment-pick';
import { paymentFloor } from '@/lib/payment-years';
import { contrast } from '@/lib/tone';
import { ThemeProvider } from '@/providers/theme-provider';
import { buildTokens, mix, type Scheme } from '@/theme/palette';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Choose year (7.png) and All years (2.png) on 12 Oct 2026, over the design's seven years:
 *
 *   2026 $18,548.81 · 67    2025 $22,407.36 · 84    2024 $21,630.12 · 84    2023 $19,264.00 · 72
 *   2022 $17,880.50 · 72    2021 $16,402.75 · 60    2020 $15,118.30 · 60
 *   All years: Paid since 2020 · $131,251.84 · 499 payments · 7 years
 *
 * On free the list floor is 15 Jul 2026, so 2020 to 2025 carry the Pro badge (their rows are Pro's,
 * their figures everyone's); on Pro none do.
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

// ---------------------------------------------------------------------------------------------
// The design's seven years.

const TODAY = '2026-10-12';
const PRO_FLOOR = paymentFloor(TODAY);
const FREE_FLOOR = historyFloor(false, new Date(`${TODAY}T00:00:00`));

function paid(
  id: string,
  kind: PaymentEntry['kind'],
  name: string,
  date: string,
  amount: number,
): PaymentEntry {
  return {
    id: `${id}@${date}`,
    date,
    name,
    planName: name,
    amount,
    kind,
    status: 'paid',
    sourceId: '',
    planId: id,
    categoryId: kind === 'bill' ? 'housing' : 'entertainment',
    iconId: null,
    domain: null,
    logoHidden: false,
  };
}

/**
 * `count` bill payments in `year` summing exactly `total` (in cents), spread over its months: this
 * year's only over the months gone by, early in each, so none is after today.
 */
function billsIn(year: number, count: number, totalCents: number): PaymentEntry[] {
  const base = Math.floor(totalCents / count);
  const over = totalCents - base * count;
  const spread = year === Number(TODAY.slice(0, 4)) ? Number(TODAY.slice(5, 7)) : 12;
  return Array.from({ length: count }, (_, i) =>
    paid(
      `bill-${year}-${i}`,
      'bill',
      'Rent',
      `${year}-${String((i % spread) + 1).padStart(2, '0')}-${String(1 + Math.floor(i / spread)).padStart(2, '0')}`,
      (base + (i < over ? 1 : 0)) / 100,
    ),
  );
}

/** Netflix, $15.99 on the 9th, from January 2025 to this October: the only subscription. */
const NETFLIX = Array.from({ length: 22 }, (_, i) => {
  const month = i % 12;
  const year = 2025 + Math.floor(i / 12);
  return paid(
    'netflix',
    'subscription',
    'Netflix',
    `${year}-${String(month + 1).padStart(2, '0')}-09`,
    15.99,
  );
});

const DESIGN_YEARS: [number, number, number][] = [
  [2026, 67, 1854881],
  [2025, 84, 2240736],
  [2024, 84, 2163012],
  [2023, 72, 1926400],
  [2022, 72, 1788050],
  [2021, 60, 1640275],
  [2020, 60, 1511830],
];

/** Each year's bills make up what Netflix leaves of the design's figure. */
const DESIGN: readonly PaymentEntry[] = Object.freeze(
  [
    ...NETFLIX,
    ...DESIGN_YEARS.flatMap(([year, count, cents]) => {
      const netflix = NETFLIX.filter((row) => row.date.startsWith(`${year}-`));
      return billsIn(year, count - netflix.length, cents - netflix.length * 1599);
    }),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? -1 : 1)),
);

function dataOf(over: Partial<PaymentsData> = {}): PaymentsData {
  return {
    payments: DESIGN,
    listFloor: PRO_FLOOR,
    free: false,
    labelOf: () => null,
    sources: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...over,
  };
}

const FREE = { listFloor: FREE_FLOOR, free: true };

// ---------------------------------------------------------------------------------------------
// Reading the screen.

const hidden = { includeHiddenElements: true };

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

const textOf = (node: { props: Record<string, unknown> }) =>
  [node.props.children as unknown]
    .flat(Infinity)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');

const linesIn = (node: Parameters<typeof within>[0]) => within(node).getAllByText(/./).map(textOf);

const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');

/** Choose year's rows in order, as VoiceOver meets each: its role, then its words. */
const choiceRows = () =>
  within(screen.getByTestId('years-card'))
    .getAllByTestId(/^years-(\d{4}|all)$/)
    .map(
      (node) => `${String(node.props.accessibilityRole)}: ${String(node.props.accessibilityLabel)}`,
    );

const yearCards = () =>
  screen
    .getAllByTestId(/^year-card-\d{4}$/)
    .map((node) => [Number(String(node.props.testID).slice(-4)), linesIn(node)] as const);

function texts(): { line: string; className: string; props: Json['props'] }[] {
  const found: { line: string; className: string; props: Json['props'] }[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') return;
    if (node.type === 'Text') {
      const line = (node.children ?? []).filter((part) => typeof part === 'string').join('');
      found.push({ line, className: String(node.props.className ?? ''), props: node.props });
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Tree;
  (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
  return found;
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

async function openYear(params: Record<string, string> = {}, data: PaymentsData = dataOf()) {
  mockParams = params;
  mockData = data;
  return mount(<PaymentYearScreen />);
}

async function openYears(params: Record<string, string> = {}, data: PaymentsData = dataOf()) {
  mockParams = params;
  mockData = data;
  return mount(<PaymentYearsScreen />);
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

describe('the fixture', () => {
  it('is the design: 499 payments, $131,251.84, each year to the cent', () => {
    expect(FREE_FLOOR).toBe('2026-07-15');
    expect(DESIGN).toHaveLength(499);
    expect(DESIGN.filter((row) => row.date > TODAY || row.date < PRO_FLOOR)).toEqual([]);
    expect(DESIGN.reduce((sum, row) => sum + toCents(row.amount), 0)).toBe(13125184);
    for (const [year, count, cents] of DESIGN_YEARS) {
      const rows = DESIGN.filter((row) => row.date.startsWith(`${year}-`));
      expect([year, rows.length, rows.reduce((sum, row) => sum + toCents(row.amount), 0)]).toEqual([
        year,
        count,
        cents,
      ]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// 7.png.

describe('Choose year', () => {
  it('on free: this year ticked, 2025 back to 2020 with the Pro badge, All years, the footer', async () => {
    await openYear({ kind: 'all', owner: 'history-1', selected: '2026' }, dataOf(FREE));
    expect(screen.getByRole('header', { name: 'Choose year' })).toBeTruthy();
    expect(choiceRows()).toEqual([
      'radio: This year, 2026',
      ...[2025, 2024, 2023, 2022, 2021, 2020].map(
        (year) => `radio: ${year}, older history with Pro`,
      ),
      'link: All years, 2020 – 2026',
    ]);
    expect(
      screen.getAllByRole('radio', { checked: true }).map((n) => n.props.accessibilityLabel),
    ).toEqual(['This year, 2026']);
    const badged = screen
      .getAllByRole('radio')
      .filter((row) => within(row).queryByTestId('pro-badge', hidden))
      .map((row) => linesIn(row)[0]);
    expect(badged).toEqual(['2025', '2024', '2023', '2022', '2021', '2020']);

    await fireEvent.press(screen.getByRole('button', { name: 'See up to 7 years with Pro' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'history' },
    });
  });

  it('on Pro: the same years, no badge and no footer', async () => {
    await openYear({ owner: 'history-1' });
    expect(choiceRows()).toEqual([
      'radio: This year, 2026',
      ...['2025', '2024', '2023', '2022', '2021', '2020'].map((year) => `radio: ${year}`),
      'link: All years, 2020 – 2026',
    ]);
    expect(screen.queryAllByTestId('pro-badge', hidden)).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'See up to 7 years with Pro' })).toBeNull();
  });

  it('ticks the year the history shows', async () => {
    await openYear({ owner: 'history-1', selected: '2023' });
    expect(screen.getByRole('radio', { name: '2023', checked: true })).toBeTruthy();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('hands the year to the history that opened it and goes back, once', async () => {
    const heard = jest.fn();
    const other = jest.fn();
    const stop = onPaymentPicked('history-1', 'year', (pick) => heard(pick.year));
    const stopOther = onPaymentPicked('history-2', 'year', other);
    await openYear({ owner: 'history-1', selected: '2026' }, dataOf(FREE));

    await fireEvent.press(screen.getByRole('radio', { name: '2024, older history with Pro' }));
    await fireEvent.press(screen.getByRole('radio', { name: '2022, older history with Pro' }));

    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith(2024);
    expect(other).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
    stopOther();
  });

  it('hands nothing to anyone when opened by a link, and still goes back', async () => {
    const heard = jest.fn();
    const stop = onPaymentPicked('', 'year', heard);
    await openYear();
    await fireEvent.press(screen.getByRole('radio', { name: '2025' }));
    expect(heard).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
  });

  it('All years takes this page’s place, for the same kind and the same history', async () => {
    await openYear({ kind: 'bill', owner: 'history-1', selected: '2026' });
    await fireEvent.press(screen.getByRole('link', { name: 'All years, 2020 – 2026' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/payment-years',
      params: { kind: 'bill', owner: 'history-1' },
    });
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('All years from a link carries no owner', async () => {
    await openYear();
    await fireEvent.press(screen.getByRole('link', { name: 'All years, 2020 – 2026' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/payment-years',
      params: { kind: 'all' },
    });
  });

  it('lists only the years with a payment of the kind shown', async () => {
    await openYear({ kind: 'subscription', owner: 'history-1' }, dataOf(FREE));
    expect(choiceRows()).toEqual([
      'radio: This year, 2026',
      'radio: 2025, older history with Pro',
      'link: All years, 2025 – 2026',
    ]);
  });

  it('an account with nothing paid: this year, and All years as this year alone', async () => {
    await openYear({}, dataOf({ payments: [] }));
    expect(choiceRows()).toEqual(['radio: This year, 2026', 'link: All years, 2026']);
  });

  it('holds while the payments are read, and fails with Try again', async () => {
    await openYear({}, dataOf({ isLoading: true, payments: [] }));
    expect(screen.getByTestId('year-loading')).toBeTruthy();
    expect(screen.queryByTestId('years-card')).toBeNull();

    const refetch = jest.fn();
    await openYear({}, dataOf({ isError: true, payments: [], refetch }));
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByTestId('years-card')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------------------------
// 2.png.

const DESIGN_CARDS: [number, string, string][] = [
  [2026, '67 payments', '$18,548.81'],
  [2025, '84 payments', '$22,407.36'],
  [2024, '84 payments', '$21,630.12'],
  [2023, '72 payments', '$19,264.00'],
  [2022, '72 payments', '$17,880.50'],
  [2021, '60 payments', '$16,402.75'],
  [2020, '60 payments', '$15,118.30'],
];

describe('All years', () => {
  it('on Pro: Paid since 2020, $131,251.84, 499 payments · 7 years, a card a year, no badge', async () => {
    await openYears();
    expect(screen.getByRole('header', { name: 'All years' })).toBeTruthy();
    expect(linesIn(screen.getByTestId('years-card-summary'))).toEqual([
      'Paid since 2020',
      '$131,251.84',
      '499 payments · 7 years',
    ]);
    expect(screen.getByTestId('years-card-summary').props.accessibilityLabel).toBe(
      'Paid since 2020, $131,251.84. 499 payments, 7 years.',
    );
    expect(yearCards()).toEqual(
      DESIGN_CARDS.map(([year, count, amount]) => [year, [String(year), count, amount]]),
    );
    expect(screen.getByTestId('year-card-2025').props.accessibilityLabel).toBe(
      '2025, 84 payments, $22,407.36',
    );
    expect(screen.queryAllByTestId('pro-badge', hidden)).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'See up to 7 years with Pro' })).toBeNull();
    // The cards add up to the card on top, to the cent.
    expect(
      DESIGN_CARDS.reduce((sum, [, , amount]) => sum + Number(amount.replace(/[$,.]/g, '')), 0),
    ).toBe(13125184);
  });

  it('on free: the same figures, the Pro badge on 2020 to 2025, and the footer', async () => {
    await openYears({}, dataOf(FREE));
    expect(linesIn(screen.getByTestId('years-card-summary'))).toEqual([
      'Paid since 2020',
      '$131,251.84',
      '499 payments · 7 years',
    ]);
    expect(yearCards().map(([year, lines]) => [year, lines.filter((l) => l !== 'Pro')])).toEqual(
      DESIGN_CARDS.map(([year, count, amount]) => [year, [String(year), count, amount]]),
    );
    const badged = DESIGN_CARDS.map(([year]) => year).filter((year) =>
      within(screen.getByTestId(`year-card-${year}`)).queryByTestId('pro-badge', hidden),
    );
    expect(badged).toEqual([2025, 2024, 2023, 2022, 2021, 2020]);
    expect(screen.getByTestId('year-card-2025').props.accessibilityLabel).toBe(
      '2025, older history with Pro, 84 payments, $22,407.36',
    );
    expect(screen.getByTestId('year-card-2026').props.accessibilityLabel).toBe(
      '2026, 67 payments, $18,548.81',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'See up to 7 years with Pro' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'history' },
    });
  });

  it('opens a year’s history for the kind shown, when reached by a link', async () => {
    await openYears({ kind: 'bill' });
    await fireEvent.press(screen.getByTestId('year-card-2024'));
    expect(pushed()).toEqual([
      { pathname: '/payment-history', params: { kind: 'bill', year: '2024' } },
    ]);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('hands a year back to the history it came from, and goes back to it once', async () => {
    const heard = jest.fn();
    const stop = onPaymentPicked('history-1', 'year', (pick) => heard(pick.year));
    await openYears({ kind: 'all', owner: 'history-1' }, dataOf(FREE));
    await fireEvent.press(screen.getByTestId('year-card-2021'));
    await fireEvent.press(screen.getByTestId('year-card-2020'));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith(2021);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    stop();
  });

  it('keeps to the kind it came from', async () => {
    await openYears({ kind: 'subscription' });
    // Netflix: 12 × $15.99 in 2025 and 10 so far in 2026.
    expect(linesIn(screen.getByTestId('years-card-summary'))).toEqual([
      'Paid since 2025',
      '$351.78',
      '22 payments · 2 years',
    ]);
    expect(yearCards()).toEqual([
      [2026, ['2026', '10 payments', '$159.90']],
      [2025, ['2025', '12 payments', '$191.88']],
    ]);
  });

  it.each([
    [true, '/payment-export?kind=all&year=all'],
    [
      false,
      {
        pathname: '/pro-feature',
        params: { id: 'export', next: '/payment-export?kind=all&year=all' },
      },
    ],
  ])('exports every year from the header (Pro %s)', async (pro, href) => {
    mockPro = { pro, ready: true };
    await openYears({ kind: 'all' });
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    expect(pushed()).toEqual([href]);
  });

  it('exports the kind it came from', async () => {
    await openYears({ kind: 'subscription' });
    await fireEvent.press(screen.getByRole('button', { name: 'Export payments' }));
    expect(pushed()).toEqual(['/payment-export?kind=subscription&year=all']);
  });

  it('an account with nothing paid: Paid since 2026, 0 payments · 1 year, one card', async () => {
    await openYears({}, dataOf({ payments: [] }));
    expect(linesIn(screen.getByTestId('years-card-summary'))).toEqual([
      'Paid since 2026',
      '$0.00',
      '0 payments · 1 year',
    ]);
    expect(yearCards()).toEqual([[2026, ['2026', '0 payments', '$0.00']]]);
  });

  it('holds while the payments are read, and fails with Try again', async () => {
    await openYears({}, dataOf({ isLoading: true, payments: [] }));
    expect(screen.getByTestId('years-loading')).toBeTruthy();
    expect(screen.queryByTestId('years-card')).toBeNull();

    const refetch = jest.fn();
    await openYears({}, dataOf({ isError: true, payments: [], refetch }));
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByTestId('years-card')).toBeNull();
    expect(screen.queryAllByTestId(/^year-card-/)).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('moves on with New Year’s Day: 2020 drops off and 2027 is listed', async () => {
    mockToday = '2027-01-01';
    await openYears({}, dataOf({ listFloor: paymentFloor('2027-01-01') }));
    expect(yearCards().map(([year]) => year)).toEqual([2027, 2026, 2025, 2024, 2023, 2022, 2021]);
    expect(linesIn(screen.getByTestId('years-card-summary'))[0]).toBe('Paid since 2021');
  });
});

describe('the year card', () => {
  it('groups a large count as the language does, and says one payment', async () => {
    expect(paymentsCountText(1)).toBe('1 payment');
    expect(paymentsCountText(1234)).toBe('1,234 payments');
    setLanguage('fr');
    expect(paymentsCountText(1234)).toMatch(/^1\s234 paiements$/u);
    expect(paymentsCountText(1)).toBe('1 paiement');
  });

  it('puts the total under the year once a word cannot sit beside it', async () => {
    await mount(
      <YearCard
        summary={{ year: 2025, total: 22407.36, count: 84, proOnly: true }}
        onOpen={() => {}}
      />,
    );
    const inYearColumn = (text: string) => {
      for (let at = screen.getByText(text).parent; at; at = at.parent) {
        if (classOf(at).includes('min-w-0 flex-1 items-start')) return true;
      }
      return false;
    };
    expect(inYearColumn('$22,407.36')).toBe(false);

    const group = screen.getByTestId('year-card-2025-words');
    const layout = async (node: ReturnType<typeof screen.getByTestId>, width: number) =>
      fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });
    await layout(group, 300);
    await layout(within(group).getByTestId('fit-slot-year', hidden), 120);
    await layout(within(group).getByTestId('fit-copy-year', hidden), 60);
    await layout(within(group).getByTestId('fit-slot-count', hidden), 70);
    await layout(within(group).getByTestId('fit-copy-count', hidden), 90);

    expect(inYearColumn('$22,407.36')).toBe(true);
  });
});

describe('a link row in a choice list', () => {
  it('is read as a link and never ticked, even as the value chosen; the rest stay radios', async () => {
    const onChoose = jest.fn();
    await mount(
      <ChoiceList
        testID="list"
        items={[
          { value: 'one', label: 'One' },
          { value: 'more', label: 'More', caption: 'Opens a page', link: true },
        ]}
        value="more"
        onChoose={onChoose}
      />,
    );
    const link = screen.getByRole('link', { name: 'More, Opens a page' });
    expect(link.props.accessibilityState?.selected).toBeUndefined();
    expect(link.props.accessibilityState?.checked).toBeUndefined();
    expect(within(link).queryByTestId('icon-Check')).toBeNull();
    expect(classOf(within(link).getByText('More'))).toContain('text-body');
    expect(screen.getByRole('radio', { name: 'One', checked: false })).toBeTruthy();
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    expect(screen.getByTestId('list-card').props.accessibilityRole).toBe('radiogroup');

    await fireEvent.press(link);
    expect(onChoose).toHaveBeenCalledWith('more');
  });

  it('leaves a list without links as it was: radios, the chosen one ticked', async () => {
    await mount(
      <ChoiceList
        items={[
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ]}
        value={2}
        onChoose={() => {}}
      />,
    );
    expect(
      screen
        .getAllByRole('radio')
        .map((node) => [node.props.accessibilityLabel, node.props.accessibilityState]),
    ).toEqual([
      ['One', { selected: false, checked: false }],
      ['Two', { selected: true, checked: true }],
    ]);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(
      within(screen.getByRole('radio', { name: 'Two' })).getByTestId('icon-Check'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------------------------
// Languages, large text, light and dark.

describe.each([
  ['Choose year', () => openYear({ owner: 'history-1' }, dataOf(FREE))],
  ['All years', () => openYears({}, dataOf(FREE))],
])('%s in every language, at large text', (_page, openPage) => {
  it.each<Language>(['en', 'es', 'fr'])(
    '%s: each line at its role’s ceiling, never cut, never a raw key',
    async (language) => {
      setLanguage(language);
      await openPage();
      const ceilings = new Set<number>(Object.values(TEXT_CAP));
      const lines = texts();
      expect(lines.length).toBeGreaterThan(8);
      for (const { line, props } of lines) {
        expect(ceilings.has(props.maxFontSizeMultiplier as number)).toBe(true);
        expect(props.numberOfLines).toBeUndefined();
        expect(props.adjustsFontSizeToFit).toBeUndefined();
        expect(line).not.toMatch(/(payments|pro|ui|common)\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}/);
      }
    },
  );
});

describe('in Spanish and French', () => {
  it('Choose year', async () => {
    setLanguage('es');
    await openYear({ owner: 'history-1' }, dataOf(FREE));
    expect(screen.getByRole('header', { name: 'Elige el año' })).toBeTruthy();
    expect(choiceRows()[0]).toBe('radio: Este año, 2026');
    expect(choiceRows()[1]).toBe('radio: 2025, historial anterior con Pro');
    expect(choiceRows()[7]).toBe('link: Todos los años, 2020 – 2026');
    expect(screen.getByRole('button', { name: 'Consulta hasta 7 años con Pro' })).toBeTruthy();

    setLanguage('fr');
    await openYear({ owner: 'history-1' }, dataOf(FREE));
    expect(screen.getByRole('header', { name: 'Choisis l’année' })).toBeTruthy();
    expect(choiceRows()[0]).toBe('radio: Cette année, 2026');
    expect(choiceRows()[7]).toBe('link: Toutes les années, 2020 – 2026');
    expect(screen.getByRole('button', { name: 'Consulte jusqu’à 7 ans avec Pro' })).toBeTruthy();
  });

  it('All years', async () => {
    setLanguage('es');
    await openYears({}, dataOf(FREE));
    expect(screen.getByRole('header', { name: 'Todos los años' })).toBeTruthy();
    const es = linesIn(screen.getByTestId('years-card-summary'));
    expect(es[0]).toBe('Pagado desde 2020');
    expect(es[2]).toBe('499 pagos · 7 años');
    expect(linesIn(screen.getByTestId('year-card-2026'))[1]).toBe('67 pagos');
    expect(screen.getByRole('button', { name: 'Exportar pagos' })).toBeTruthy();

    setLanguage('fr');
    await openYears({}, dataOf(FREE));
    const fr = linesIn(screen.getByTestId('years-card-summary'));
    expect(fr[0]).toBe('Payé depuis 2020');
    expect(fr[1]).toMatch(/^131\s251,84\s\$$/u);
    expect(fr[2]).toBe('499 paiements · 7 ans');
    expect(screen.getByTestId('year-card-2025').props.accessibilityLabel).toMatch(
      /^2025, historique plus ancien avec Pro, 84 paiements, 22\s407,36\s\$$/u,
    );
  });
});

/** What a line of text sits on, by the class it is drawn with. */
const SURFACES: Record<string, ('surface' | 'card' | 'tint' | 'accent')[]> = {
  'text-ink': ['surface', 'card'],
  'text-body': ['card'],
  'text-muted': ['surface', 'card'],
  // The badge sits on the tint; Learn more sits on the card.
  'text-tint-ink': ['tint', 'card'],
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

  const used = () => {
    const found = new Set<string>();
    for (const { className } of texts()) {
      for (const name of className.match(/\btext-(?!\[|center|left|right)[a-z-]+(?:\/\d+)?/g) ??
        []) {
        found.add(name);
      }
    }
    return found;
  };

  it('draws every kind of text on both pages in a colour that reads, 4.5 to 1', async () => {
    const all = new Set<string>();
    await openYear({ owner: 'history-1' }, dataOf(FREE));
    used().forEach((name) => all.add(name));
    await openYears({}, dataOf(FREE));
    used().forEach((name) => all.add(name));

    expect([...all]).toEqual(expect.arrayContaining(Object.keys(SURFACES)));
    expect([...all].filter((name) => !(name in SURFACES))).toEqual([]);
    for (const name of all) {
      for (const surface of SURFACES[name]) {
        expect([name, surface, ratio(name, surface) >= 4.5]).toEqual([name, surface, true]);
      }
    }
  });

  it('draws the tick, the arrows and the export glyph in this mode’s own colours', async () => {
    await openYear({ owner: 'history-1' });
    expect(
      within(screen.getByRole('radio', { name: 'This year, 2026' })).getByTestId('icon-Check').props
        .iconColor,
    ).toBe(tokens.accentInk);

    await openYears();
    expect(
      within(screen.getByTestId('year-card-2026')).getByTestId('icon-ChevronRight').props.iconColor,
    ).toBe(tokens.muted);
    expect(
      within(screen.getByRole('button', { name: 'Export payments' })).getByTestId('icon-Share')
        .props.iconColor,
    ).toBe(tokens.tintInk);
  });
});
