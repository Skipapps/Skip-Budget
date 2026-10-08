import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/(tabs)/home';

/**
 * Where a row in Recent or Coming up goes when pressed. Rows are ledger *occurrences*, so each must
 * resolve back to the record behind it: the receipt, the bill or subscription that charged, the
 * salary screen for a payday.
 *
 * One mount, every row pressed in turn: the screen is expensive to mount and a test per row made
 * the file order-dependent.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('@/components/dashboard/balance-summary', () => ({ BalanceSummary: () => null }));
jest.mock('@/components/dashboard/destination-list', () => ({ DestinationList: () => null }));
jest.mock('@/components/dashboard/dashboard-header', () => ({ DashboardHeader: () => null }));
jest.mock('@/components/dashboard/getting-started-card', () => ({
  GettingStartedCard: () => null,
}));
jest.mock('@/components/dashboard/insight-banner', () => ({ InsightBanner: () => null }));
jest.mock('@/components/dashboard/quick-actions', () => ({ QuickActions: () => null }));
// A single button that steps back a day, to move the selection.
jest.mock('@/components/dashboard/date-selector', () => {
  const { createElement } = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  return {
    DateSelector: ({ onPrevious }: { onPrevious: () => void }) =>
      createElement(Pressable, { testID: 'previous-day', onPress: onPrevious }),
  };
});
jest.mock('@/components/ui/date-picker', () => ({ DatePicker: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
// Artwork imports SVGs, which Jest has no transformer for.
jest.mock('@/data/spending-categories', () => ({ spendingCategories: [] }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false }) }));
jest.mock('@/api/news', () => ({ useHasUnreadNews: () => false }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
  useKeepSchedulesCurrent: () => {},
}));

// Rows whose ids name a charge rather than a plan resolve through these.
jest.mock('@/api/charges', () => ({
  useCharges: () => ({
    data: [
      { id: 'c1', bill_id: 'b9', subscription_id: null },
      { id: 'c2', bill_id: null, subscription_id: 's9' },
    ],
  }),
}));

/** A Thursday. Recent is this day alone; Coming up is the rest of September. */
const TODAY = '2026-09-10';

const mockRecent = [
  { id: 'receipt-r1', label: 'Bakery', amount: -6, date: TODAY, kind: 'receipt' as const },
  {
    id: 'bill-b1@2026-09-09',
    label: 'Rent',
    amount: -1030,
    date: '2026-09-09',
    kind: 'bill' as const,
  },
  {
    id: 'subscription-s1@2026-09-08',
    label: 'Netflix',
    amount: -15,
    date: '2026-09-08',
    kind: 'subscription' as const,
  },
  {
    id: 'income-p1@2026-09-07',
    label: 'Payday',
    amount: 2000,
    date: '2026-09-07',
    kind: 'income' as const,
  },
  {
    id: 'charge-c1',
    label: 'Rent in August',
    amount: -1030,
    date: '2026-09-06',
    kind: 'bill' as const,
  },
  {
    id: 'charge-c2',
    label: 'Netflix in August',
    amount: -15,
    date: '2026-09-06',
    kind: 'subscription' as const,
  },
  // An id shape nothing produces; it must open nothing.
  { id: 'mystery-1', label: 'Unknown', amount: -1, date: '2026-09-06', kind: 'bill' as const },
].map((row) => ({ ...row, sourceId: 's1' }));

/** One row later in the month, to prove Coming up is wired the same way. */
const mockUpcoming = [
  {
    id: 'bill-b2@2026-09-14',
    label: 'Power',
    amount: -80,
    date: '2026-09-14',
    kind: 'bill' as const,
    sourceId: 's1',
  },
];

const mockLedger = jest.fn((range: { from: string; to: string } | undefined) => ({
  entries: range && range.from > '2026-09-10' ? mockUpcoming : mockRecent,
  totals: { in: 2000, out: 2147, net: -147, count: 7 },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
}));

jest.mock('@/api/queries', () => ({
  useProfile: () => ({ data: { display_name: 'Sam' } }),
  // Called for the month behind the card, then the chosen day, then the rest of the month; the
  // month gets the same rows.
  useLedger: (range: { from: string; to: string } | undefined) => mockLedger(range),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

beforeEach(() => {
  jest.mocked(router.push).mockClear();
});

describe('Home — where a transaction row opens', () => {
  it('opens each kind of row on its own page, never on a form', async () => {
    const { getAllByRole, getByText } = await render(<HomeScreen />);

    const labels = getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel ?? ''))
      .filter((label) => label.includes('$'));

    // The unplaceable row is not a button, though still on screen and readable.
    expect(labels).toHaveLength(7);
    expect(labels.some((label) => label.startsWith('Unknown'))).toBe(false);
    expect(getByText('Unknown')).toBeTruthy();

    const row = (label: string) => {
      const found = getAllByRole('button').find((node) =>
        String(node.props.accessibilityLabel ?? '').startsWith(`${label},`),
      );
      expect(found).toBeTruthy();
      return found!;
    };

    await fireEvent.press(row('Bakery'));
    await fireEvent.press(row('Rent'));
    await fireEvent.press(row('Netflix'));
    await fireEvent.press(row('Payday'));
    await fireEvent.press(row('Rent in August'));
    await fireEvent.press(row('Netflix in August'));
    // Coming up, after the chosen day.
    await fireEvent.press(row('Power'));

    expect(router.push).toHaveBeenNthCalledWith(1, {
      pathname: '/receipt/[id]',
      params: { id: 'r1' },
    });
    expect(router.push).toHaveBeenNthCalledWith(2, {
      pathname: '/bill/[id]',
      params: { id: 'b1' },
    });
    expect(router.push).toHaveBeenNthCalledWith(3, {
      pathname: '/subscription/[id]',
      params: { id: 's1' },
    });
    expect(router.push).toHaveBeenNthCalledWith(4, '/salary');
    // Charge rows, placed through the charges query.
    expect(router.push).toHaveBeenNthCalledWith(5, {
      pathname: '/bill/[id]',
      params: { id: 'b9' },
    });
    expect(router.push).toHaveBeenNthCalledWith(6, {
      pathname: '/subscription/[id]',
      params: { id: 's9' },
    });
    expect(router.push).toHaveBeenNthCalledWith(7, {
      pathname: '/bill/[id]',
      params: { id: 'b2' },
    });
    expect(router.push).toHaveBeenCalledTimes(7);
  });
});

describe('Home — what sits under the day selector', () => {
  it('reads the chosen day alone for Recent and the rest of its month for Coming up', async () => {
    mockLedger.mockClear();
    await render(<HomeScreen />);

    const ranges = mockLedger.mock.calls.map(([range]) => range);
    // The month behind the balance card.
    expect(ranges).toContainEqual({ from: '2026-09-01', to: '2026-09-30' });
    // Recent: today, and nothing before it.
    expect(ranges).toContainEqual({ from: TODAY, to: TODAY });
    // Coming up: tomorrow through the 30th, not a week.
    expect(ranges).toContainEqual({ from: '2026-09-11', to: '2026-09-30' });
  });

  it('moves Recent to the day stepped back to, and leaves Coming up where it was', async () => {
    const { getByTestId } = await render(<HomeScreen />);
    mockLedger.mockClear();

    await fireEvent.press(getByTestId('previous-day'));

    const ranges = mockLedger.mock.calls.map(([range]) => range);
    expect(ranges).toContainEqual({ from: '2026-09-09', to: '2026-09-09' });
    // Still the future: browsing the past does not drag the 9th through the 30th into "coming up".
    expect(ranges).toContainEqual({ from: '2026-09-11', to: '2026-09-30' });
    expect(ranges.some((range) => range?.from === '2026-09-10' && range.to === '2026-09-30')).toBe(
      false,
    );
  });

  it('shows no date range beside either heading', async () => {
    const { getByText, queryByText } = await render(<HomeScreen />);

    expect(getByText('Recent')).toBeTruthy();
    expect(getByText('Coming up')).toBeTruthy();
    // The captions used to read "4 – 10 Sep 2026" and "11 – 17 Sep 2026"; a day's own header, like
    // "9 Sep 2026", is not a range.
    expect(queryByText(/\d – \d/)).toBeNull();
  });
});

describe('Home — Go further', () => {
  it('offers one tool, the Loan Calculator, alone across its row', async () => {
    const { getAllByRole } = await render(<HomeScreen />);

    const tools = getAllByRole('button').filter((node) =>
      String(node.props.accessibilityLabel ?? '').endsWith('Opens the tool.'),
    );
    expect(tools).toHaveLength(1);

    const [loan] = tools;
    expect(loan.props.accessibilityLabel).toBe('Loan Calculator. Opens the tool.');
    // The only child of its row and flex-1, so it fills the width instead of half of it.
    expect(loan.props.className).toContain('flex-1');
    expect(loan.parent?.props.className).toContain('flex-row');
    expect(loan.parent?.children).toHaveLength(1);

    await fireEvent.press(loan);
    expect(router.push).toHaveBeenCalledWith('/loan-calculator');
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
