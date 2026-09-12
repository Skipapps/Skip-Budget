import { render } from '@testing-library/react-native';

import TransactionsScreen from '@/app/(tabs)/transactions';

/**
 * Which day the Transactions list opens with, and what order its rows run in.
 *
 * This screen is the one the Founder's "today at the bottom" rule was written
 * about. Its day headings come from `periodBuckets`, which the screen used to
 * `.reverse()`; the rows inside each heading come from a sort in the screen
 * itself. Both changed, so both are asserted here — and the same-day case is
 * the one that must *not* have moved.
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

/**
 * A Thursday, so the default "week" period covers Sunday 6th to Saturday 12th
 * and the range is cut off at today. Three rows land on the 10th, in the order
 * the ledger hands them over — the tiebreak inside a day is by id and must be
 * exactly what it was before the day order flipped.
 */
const TODAY = '2026-09-10';
const mockEntries = [
  { id: 'e4', label: 'Bakery', amount: -6, date: TODAY },
  { id: 'e1', label: 'Chemist', amount: -5, date: '2026-09-08' },
  { id: 'e3', label: 'Bookshop', amount: -4, date: '2026-09-08' },
  { id: 'e2', label: 'Hardware', amount: -3, date: '2026-09-08' },
  { id: 'e0', label: 'Greengrocer', amount: -2, date: '2026-09-07' },
].map((row) => ({ ...row, kind: 'receipt' as const, sourceId: 's1' }));

jest.mock('@/api/queries', () => ({
  useLedger: () => ({
    entries: mockEntries,
    totals: { in: 0, out: 20, net: -20 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({ sources: [{ id: 's1', label: 'Everyday' }] }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

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
