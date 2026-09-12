import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import TransactionsScreen from '@/app/(tabs)/transactions';

/**
 * Which day the Transactions list opens with, and what order its rows run in.
 *
 * This screen is the one the Founder's "today at the bottom" rule was written
 * about. Its day headings come from `periodBuckets`, which the screen used to
 * `.reverse()`; the rows inside each heading come from a sort in the screen
 * itself. Both changed, so both are asserted here — and the same-day case is
 * the one that must *not* have moved.
 *
 * The second half is where a row goes when it is pressed. Every row used to go
 * nowhere: the list rendered `LedgerRow` with no handler at all, so the whole
 * tab was inert.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/transactions/flow-chart', () => ({ FlowChart: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({ useArtwork: () => ({}) }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

// One charge on the record, so the recorded half of the ledger — the rows
// whose ids name the charge and not the plan — has something to resolve to.
jest.mock('@/api/charges', () => ({
  useCharges: () => ({
    data: [
      { id: 'c1', bill_id: 'b9', subscription_id: null },
      { id: 'c2', bill_id: null, subscription_id: 's9' },
    ],
  }),
}));

/**
 * A Thursday, so the default "week" period covers Sunday 6th to Saturday 12th
 * and the range is cut off at today. Three rows land on the 10th, in the order
 * the ledger hands them over — the tiebreak inside a day is by id and must be
 * exactly what it was before the day order flipped.
 */
const TODAY = '2026-09-10';
const mockEntries = [
  { id: 'receipt-e4', label: 'Bakery', amount: -6, date: TODAY },
  { id: 'receipt-e1', label: 'Chemist', amount: -5, date: '2026-09-08' },
  { id: 'receipt-e3', label: 'Bookshop', amount: -4, date: '2026-09-08' },
  { id: 'receipt-e2', label: 'Hardware', amount: -3, date: '2026-09-08' },
  { id: 'receipt-e0', label: 'Greengrocer', amount: -2, date: '2026-09-07' },
].map((row) => ({ ...row, kind: 'receipt' as const, sourceId: 's1' }));

/** One row of every kind the ledger can produce, all on the same day. */
const routingEntries = [
  { id: 'receipt-r1', label: 'Bakery', amount: -6, date: TODAY, kind: 'receipt' as const },
  { id: 'bill-b1@2026-09-10', label: 'Rent', amount: -1030, date: TODAY, kind: 'bill' as const },
  {
    id: 'subscription-s1@2026-09-10',
    label: 'Netflix',
    amount: -15,
    date: TODAY,
    kind: 'subscription' as const,
  },
  {
    id: 'income-p1@2026-09-10',
    label: 'Payday',
    amount: 2000,
    date: TODAY,
    kind: 'income' as const,
  },
  // The two written down at the time: their ids name the charge, so they can
  // only be resolved through the charges query.
  { id: 'charge-c1', label: 'Rent in August', amount: -1030, date: TODAY, kind: 'bill' as const },
  {
    id: 'charge-c2',
    label: 'Netflix in August',
    amount: -15,
    date: TODAY,
    kind: 'subscription' as const,
  },
  // A shape nothing produces today. It must open nothing rather than guess.
  { id: 'mystery-1', label: 'Unknown', amount: -1, date: TODAY, kind: 'bill' as const },
].map((row) => ({ ...row, sourceId: 's1' }));

let mockLedgerEntries: typeof mockEntries | typeof routingEntries = mockEntries;

jest.mock('@/api/queries', () => ({
  useLedger: () => ({
    entries: mockLedgerEntries,
    totals: { in: 0, out: 20, net: -20 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({ sources: [{ id: 's1', label: 'Everyday' }] }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

beforeEach(() => {
  mockLedgerEntries = mockEntries;
  jest.clearAllMocks();
});

describe('Transactions — day order', () => {
  it('runs the day headings forwards, ending on today', async () => {
    const { getAllByText } = await render(<TransactionsScreen />);

    // Day buckets on the "week" period: one heading per day that has rows.
    const headings = getAllByText(/^(7 Sep 2026|8 Sep 2026|Today|Yesterday)$/).map(
      (node) => node.props.children,
    );

    expect(headings).toEqual(['7 Sep 2026', '8 Sep 2026', 'Today']);
  });

  it('leaves the order inside a single day exactly as it was', async () => {
    const { getAllByRole } = await render(<TransactionsScreen />);

    const rows = getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel ?? ''))
      .filter((label) => label.includes('$'));

    // Three rows share 8 September and keep their id tiebreak — e1, e2, e3 —
    // which is the order they had when the days ran the other way.
    expect(rows).toEqual([
      expect.stringContaining('Greengrocer'),
      expect.stringContaining('Chemist'),
      expect.stringContaining('Hardware'),
      expect.stringContaining('Bookshop'),
      expect.stringContaining('Bakery'),
    ]);
  });
});

describe('Transactions — where a row opens', () => {
  /**
   * One render, every kind pressed in turn.
   *
   * Kept as a single mount on purpose: each of these used to be its own test
   * and the suite went order-dependent — six mounts of a screen this size
   * under fake timers left the last one with nothing queryable. What is being
   * asserted is a mapping, and a mapping is one fact.
   */
  it('opens each kind of row on the screen that edits it', async () => {
    mockLedgerEntries = routingEntries;
    const { getAllByRole, getByText } = await render(<TransactionsScreen />);

    const pressable = getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel ?? ''))
      .filter((label) => label.includes('$'));

    // Six of the seven rows are buttons. The seventh — an id of a shape
    // nothing produces today — opens nothing rather than guessing at a
    // record, and is not offered as a button at all. It is still on screen
    // and still readable.
    expect(pressable).toHaveLength(6);
    expect(pressable.some((label) => label.startsWith('Unknown'))).toBe(false);
    expect(getByText('Unknown')).toBeTruthy();

    /** The row whose accessibility label starts with `label`. */
    const row = (label: string) => {
      const found = getAllByRole('button').find((node) =>
        String(node.props.accessibilityLabel ?? '').startsWith(`${label},`),
      );
      expect(found).toBeTruthy();
      return found!;
    };

    fireEvent.press(row('Bakery'));
    fireEvent.press(row('Rent'));
    fireEvent.press(row('Netflix'));
    fireEvent.press(row('Payday'));
    // The two that were written down at the time. Their ids name the charge
    // and not the plan, so these are the rows that can only be placed by
    // going through the charges query.
    fireEvent.press(row('Rent in August'));
    fireEvent.press(row('Netflix in August'));

    expect(router.push).toHaveBeenNthCalledWith(1, {
      pathname: '/add-receipt',
      params: { id: 'r1' },
    });
    expect(router.push).toHaveBeenNthCalledWith(2, { pathname: '/add-bill', params: { id: 'b1' } });
    expect(router.push).toHaveBeenNthCalledWith(3, {
      pathname: '/add-subscription',
      params: { id: 's1' },
    });
    // Salary edits every source on one screen and takes no id.
    expect(router.push).toHaveBeenNthCalledWith(4, '/salary');
    expect(router.push).toHaveBeenNthCalledWith(5, { pathname: '/add-bill', params: { id: 'b9' } });
    expect(router.push).toHaveBeenNthCalledWith(6, {
      pathname: '/add-subscription',
      params: { id: 's9' },
    });
    expect(router.push).toHaveBeenCalledTimes(6);
  });
});
