import { act, fireEvent, render, within } from '@testing-library/react-native';

import SourceDetailScreen from '@/app/source/[id]';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { historyFloor } from '@/lib/allowance';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * A card's or account's Transactions in months, newest first, as Payment history lists its months:
 * each month's heading carries the month's net, to the cent, in the rows' money colours. The search
 * and the filters run first and the months are built from what is left, so a month with nothing to
 * show has no heading. On free only the rows stop at the floor: a month it cuts through keeps its
 * whole figure.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
// The filter page reads insets outside any provider.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));
// Each sign gets its own colour, so a figure's colour says which rule it took.
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => (amount: number) => (amount > 0 ? 'IN' : amount < 0 ? 'OUT' : 'INK'),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => false) }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'src-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));
jest.mock('@/api/mutations', () => ({
  useDeletePayment: () => ({ mutate: jest.fn(), isPending: false }),
}));

const account = {
  id: 'src-1',
  bank_name: 'Chase',
  nickname: 'Hh',
  account_type: 'checking',
  last4: '7730',
  color: '#123456',
  balance: 55,
  balance_as_of: '2026-09-28',
};
const card = {
  id: 'src-1',
  holder: 'Everyday Visa',
  network: 'VISA',
  last4: '4242',
  color: '#000000',
  balance: 0,
  balance_as_of: null,
};

/** The Founder's screenshot: October and September ran together. */
const OCT_SEP = [
  {
    id: 'payment-p1:out',
    label: 'Payment',
    amount: -600,
    date: '2026-10-13',
    kind: 'payment',
    counterpart: 'Amex',
  },
  { id: 'bill-h1@2026-10-01', label: 'Housing', amount: -1500, date: '2026-10-01', kind: 'bill' },
  { id: 'income-k1@2026-09-30', label: 'Kk', amount: 5000, date: '2026-09-30', kind: 'income' },
  { id: 'bill-h1@2026-09-28', label: 'Housing', amount: -1500, date: '2026-09-28', kind: 'bill' },
];

let mockKind: 'card' | 'account' = 'account';
let mockEntries: object[] = OCT_SEP;

jest.mock('@/api/charges', () => ({ useCharges: () => ({ data: [] }) }));
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [] }),
  useSourceLedger: () => ({
    source: mockKind === 'card' ? card : account,
    kind: mockKind,
    card: mockKind === 'card' ? card : null,
    account: mockKind === 'account' ? account : null,
    // The summary is the ledger's own; these figures are not the months'.
    ledger: { entries: mockEntries, balance: 1455, charged: 3600, paid: 5000 },
    isLoading: false,
    isError: false,
  }),
}));

// Only the clock is fixed, so the free floor falls on a known day; real timers keep the renders
// independent of one another.
jest.useFakeTimers({
  now: new Date('2026-10-13T12:00:00'),
  doNotFake: [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
  ],
});

type Screen = Awaited<ReturnType<typeof render>>;

const NBSP = ' ';
const RAW = { normalizer: (text: string) => text };
const HEADER = /^source-month-\d{4}-\d{2}-header$/;
const NOTICE = 'Older history is saved. Free shows the last 90 days. Skip Pro shows up to 7 years.';

/** Every month heading, top to bottom, as VoiceOver reads it. */
const headings = (screen: Screen) =>
  screen.getAllByTestId(HEADER).map((node) => String(node.props.accessibilityLabel));

/** The row names under one month, top to bottom. */
const rowsIn = (screen: Screen, month: string) =>
  within(screen.getByTestId(`source-month-${month}`))
    .getAllByLabelText(/ · \d{1,2} \S+ \d{4}$/)
    .map((node) => String(node.props.accessibilityLabel).split(',')[0]);

/** The figure drawn on a month's heading. */
const figureOf = (screen: Screen, month: string) =>
  within(screen.getByTestId(`source-month-${month}-header`))
    .getAllByText(/\d/)
    .at(-1)!;

beforeEach(async () => {
  jest.clearAllMocks();
  resetLocaleForTests();
  resetProStatusForTests();
  mockKind = 'account';
  mockEntries = OCT_SEP;
  await act(async () => publishProStatus({ pro: true, ready: true }));
});
afterAll(() => {
  resetLocaleForTests();
  jest.useRealTimers();
});

describe('Transactions by month', () => {
  it('puts each month under its own heading, newest month first, with that month’s net', async () => {
    const screen = await render(<SourceDetailScreen />);

    expect(headings(screen)).toEqual([
      'October 2026, -$2,100.00 net',
      'September 2026, $3,500.00 net',
    ]);
    expect(rowsIn(screen, '2026-10')).toEqual(['To Amex', 'Housing']);
    expect(rowsIn(screen, '2026-09')).toEqual(['Kk', 'Housing']);

    expect(screen.getByText('October 2026')).toBeTruthy();
    expect(figureOf(screen, '2026-10').props.children).toBe('-$2,100.00');
    expect(figureOf(screen, '2026-09').props.children).toBe('$3,500.00');
    expect(screen.getByTestId('source-month-2026-10-header').props.accessibilityRole).toBe(
      'header',
    );
  });

  it('colours each figure as a row’s amount is coloured: in, out, and plain at zero', async () => {
    mockEntries = [
      ...OCT_SEP,
      { id: 'payment-a1', label: 'Gift', amount: 50, date: '2026-08-20', kind: 'payment' },
      { id: 'receipt-a2', label: 'Shoes', amount: -50, date: '2026-08-02', kind: 'receipt' },
    ];
    const screen = await render(<SourceDetailScreen />);

    expect(figureOf(screen, '2026-10').props.style).toEqual({ color: 'OUT' });
    expect(figureOf(screen, '2026-09').props.style).toEqual({ color: 'IN' });
    expect(figureOf(screen, '2026-08').props.children).toBe('$0.00');
    expect(figureOf(screen, '2026-08').props.style).toEqual({ color: 'INK' });
  });

  it('sums a month to the cent', async () => {
    mockEntries = [
      { id: 'receipt-c1', label: 'Gum', amount: -0.1, date: '2026-10-09', kind: 'receipt' },
      { id: 'receipt-c2', label: 'Mints', amount: -0.2, date: '2026-10-08', kind: 'receipt' },
      {
        id: 'income-c3@2026-09-30',
        label: 'Acme',
        amount: 1234.56,
        date: '2026-09-30',
        kind: 'income',
      },
      { id: 'receipt-c4', label: 'Lunch', amount: -19.99, date: '2026-09-12', kind: 'receipt' },
      { id: 'receipt-c5', label: 'Stamp', amount: -0.07, date: '2026-09-03', kind: 'receipt' },
      { id: 'receipt-c6', label: 'Coffee', amount: -3.33, date: '2026-09-02', kind: 'receipt' },
    ];
    const screen = await render(<SourceDetailScreen />);

    // 0.1 + 0.2 in floating point is 0.30000000000000004; in cents it is 30.
    // 123456 - 1999 - 7 - 333 = 121117 cents.
    expect(headings(screen)).toEqual(['October 2026, -$0.30 net', 'September 2026, $1,211.17 net']);
  });

  it('works the same on a card: charges out, payments in', async () => {
    mockKind = 'card';
    mockEntries = [
      { id: 'receipt-v1', label: 'Bakery', amount: -6.5, date: '2026-10-03', kind: 'receipt' },
      { id: 'payment-v2', label: 'Payment', amount: 500, date: '2026-09-05', kind: 'payment' },
      { id: 'bill-v3@2026-09-04', label: 'Rent', amount: -1030, date: '2026-09-04', kind: 'bill' },
    ];
    const screen = await render(<SourceDetailScreen />);

    expect(headings(screen)).toEqual(['October 2026, -$6.50 net', 'September 2026, -$530.00 net']);
    expect(rowsIn(screen, '2026-09')).toEqual(['Payment', 'Rent']);
  });

  it('shows no heading for a month with no rows', async () => {
    mockEntries = [
      OCT_SEP[1],
      { id: 'receipt-j1', label: 'Shoes', amount: -80, date: '2026-07-14', kind: 'receipt' },
    ];
    const screen = await render(<SourceDetailScreen />);

    expect(headings(screen)).toEqual(['October 2026, -$1,500.00 net', 'July 2026, -$80.00 net']);
    expect(screen.queryByTestId('source-month-2026-09')).toBeNull();
    expect(screen.queryByTestId('source-month-2026-08')).toBeNull();
  });
});

describe('search and filters, then months', () => {
  it('keeps both months when a search finds rows in both, each summed over what it shows', async () => {
    const screen = await render(<SourceDetailScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Search transactions'), 'housing');

    expect(headings(screen)).toEqual([
      'October 2026, -$1,500.00 net',
      'September 2026, -$1,500.00 net',
    ]);
    expect(rowsIn(screen, '2026-10')).toEqual(['Housing']);
    expect(rowsIn(screen, '2026-09')).toEqual(['Housing']);
  });

  it('drops a month the search leaves empty', async () => {
    const screen = await render(<SourceDetailScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Search transactions'), 'amex');

    expect(headings(screen)).toEqual(['October 2026, -$600.00 net']);
    expect(screen.queryByTestId('source-month-2026-09')).toBeNull();
  });

  it('groups what a filter leaves, and comes back whole when the filter is taken off', async () => {
    const screen = await render(<SourceDetailScreen />);

    await fireEvent.press(screen.getByLabelText('Filter transactions'));
    await fireEvent.press(screen.getByText('Pay'));
    await fireEvent.press(screen.getByText('Apply'));
    expect(headings(screen)).toEqual(['September 2026, $5,000.00 net']);
    expect(rowsIn(screen, '2026-09')).toEqual(['Kk']);

    await fireEvent.press(screen.getByLabelText('Filters, 1 active'));
    await fireEvent.press(screen.getByText('Pay'));
    await fireEvent.press(screen.getByText('Apply'));
    expect(headings(screen)).toHaveLength(2);
  });

  it('says nothing matches, with no month heading, when nothing is left', async () => {
    const screen = await render(<SourceDetailScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Search transactions'), 'zzz');

    expect(screen.queryAllByTestId(HEADER)).toEqual([]);
    expect(screen.getByText('Clear search')).toBeTruthy();
  });
});

describe('the free window', () => {
  it('heads only months with listed rows, figures the whole month, and keeps the notice', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    // The pinned day puts the free floor in the middle of July.
    expect(historyFloor(false, new Date())).toBe('2026-07-16');
    mockEntries = [
      { id: 'receipt-f1', label: 'Bakery', amount: -6.5, date: '2026-07-16', kind: 'receipt' },
      // The day before the floor, in the same month: not drawn, but part of July's figure.
      { id: 'receipt-f0', label: 'Hardware', amount: -300, date: '2026-07-15', kind: 'receipt' },
      // A month wholly before the floor: no rows to draw, so no heading.
      { id: 'receipt-f9', label: 'Garden', amount: -40, date: '2026-05-17', kind: 'receipt' },
    ];
    const screen = await render(<SourceDetailScreen />);

    expect(headings(screen)).toEqual(['July 2026, -$306.50 net']);
    expect(figureOf(screen, '2026-07').props.children).toBe('-$306.50');
    expect(rowsIn(screen, '2026-07')).toEqual(['Bakery']);
    expect(screen.queryByText('Hardware')).toBeNull();
    expect(screen.queryByTestId('source-month-2026-05')).toBeNull();
    expect(screen.getByLabelText(NOTICE)).toBeTruthy();
  });

  it('runs the search over the hidden rows too before it figures a month', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    mockEntries = [
      { id: 'receipt-f1', label: 'Bakery', amount: -6.5, date: '2026-07-16', kind: 'receipt' },
      { id: 'receipt-f2', label: 'Bakery', amount: -2.25, date: '2026-07-02', kind: 'receipt' },
      { id: 'receipt-f0', label: 'Hardware', amount: -300, date: '2026-07-15', kind: 'receipt' },
    ];
    const screen = await render(<SourceDetailScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText('Search transactions'), 'bakery');
    expect(headings(screen)).toEqual(['July 2026, -$8.75 net']);
    expect(rowsIn(screen, '2026-07')).toEqual(['Bakery']);

    // A hidden row alone has nothing to draw: no heading, and the search says nothing matched.
    await fireEvent.changeText(screen.getByPlaceholderText('Search transactions'), 'hardware');
    expect(screen.queryAllByTestId(HEADER)).toEqual([]);
    expect(screen.getByText('Clear search')).toBeTruthy();
  });

  it('shows the notice alone, with no heading, when every row is older', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    mockEntries = [
      { id: 'receipt-o1', label: 'Garden', amount: -40, date: '2020-03-01', kind: 'receipt' },
    ];
    const screen = await render(<SourceDetailScreen />);

    expect(screen.queryAllByTestId(HEADER)).toEqual([]);
    expect(screen.getByLabelText(NOTICE)).toBeTruthy();
  });
});

describe('the headings at large text and in other languages', () => {
  it('wraps the figure under the month rather than cut either', async () => {
    const screen = await render(<SourceDetailScreen />);
    const header = screen.getByTestId('source-month-2026-10-header');
    expect(String(header.props.className)).toContain('flex-wrap');
    // Muted, under the page's Transactions heading.
    expect(String(screen.getByText('October 2026').props.className)).toContain(
      'font-app-medium text-[13px] text-muted',
    );

    for (const text of [screen.getByText('October 2026'), figureOf(screen, '2026-10')]) {
      expect(text.props.maxFontSizeMultiplier).toBe(TEXT_CAP.heading);
      expect(String(text.props.className)).toContain('shrink');
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.adjustsFontSizeToFit).toBeUndefined();
    }
  });

  it('names the months and reads the headings in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<SourceDetailScreen />);

    expect(screen.getByText('octubre de 2026')).toBeTruthy();
    expect(headings(screen)).toEqual([
      'octubre de 2026, neto: -$2,100.00',
      'septiembre de 2026, neto: $3,500.00',
    ]);
  });

  it('names the months and writes the figures the French way', async () => {
    setLanguage('fr');
    setCurrency('CAD');
    const screen = await render(<SourceDetailScreen />);

    expect(screen.getByText('octobre 2026')).toBeTruthy();
    expect(figureOf(screen, '2026-10').props.children).toBe(`-2${NBSP}100,00${NBSP}$`);
    expect(
      screen.getByLabelText(`octobre 2026, net${NBSP}: -2${NBSP}100,00${NBSP}$`, RAW),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(`septembre 2026, net${NBSP}: 3${NBSP}500,00${NBSP}$`, RAW),
    ).toBeTruthy();
  });
});
