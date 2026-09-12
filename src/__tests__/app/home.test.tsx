import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/(tabs)/home';

/**
 * Where a row in Recent or Coming up goes when it is pressed.
 *
 * Both weeks render the same `TransactionRow`, and both used to render it with
 * no handler at all — the dashboard's two busiest lists were inert. The rows
 * are ledger *occurrences*, so what is asserted here is that each one resolves
 * back to the record behind it: the receipt, the bill or subscription that
 * charged, the salary screen for a payday.
 *
 * One mount, every row pressed in turn: this screen is expensive to mount and
 * a test per row made the file order-dependent.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

// Everything on the dashboard that is not the transaction lists. Each is
// covered where it lives; here they are only in the way.
jest.mock('@/components/dashboard/balance-summary', () => ({ BalanceSummary: () => null }));
jest.mock('@/components/dashboard/destination-list', () => ({ DestinationList: () => null }));
jest.mock('@/components/dashboard/dashboard-header', () => ({ DashboardHeader: () => null }));
jest.mock('@/components/dashboard/getting-started-card', () => ({
  GettingStartedCard: () => null,
}));
jest.mock('@/components/dashboard/insight-banner', () => ({ InsightBanner: () => null }));
jest.mock('@/components/dashboard/quick-actions', () => ({ QuickActions: () => null }));
jest.mock('@/components/dashboard/date-selector', () => ({ DateSelector: () => null }));
jest.mock('@/components/ui/date-picker', () => ({ DatePicker: () => null }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
// Artwork imports SVGs, which Jest has no transformer for.
jest.mock('@/data/dashboard-mock', () => ({ spendingCategories: [] }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false }) }));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
  useKeepSchedulesCurrent: () => {},
}));

// One charge on the record, so the rows whose ids name a charge rather than a
// plan have something to resolve through.
jest.mock('@/api/charges', () => ({
  useCharges: () => ({
    data: [
      { id: 'c1', bill_id: 'b9', subscription_id: null },
      { id: 'c2', bill_id: null, subscription_id: 's9' },
    ],
  }),
}));

/** A Thursday. Recent covers the six days behind it; Coming up the week ahead. */
const TODAY = '2026-09-10';

/** One row of every kind, all inside the Recent week. */
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
  // A shape nothing produces today, which must open nothing at all.
  { id: 'mystery-1', label: 'Unknown', amount: -1, date: '2026-09-06', kind: 'bill' as const },
].map((row) => ({ ...row, sourceId: 's1' }));

/** One row in the week ahead, to prove Coming up is wired the same way. */
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

jest.mock('@/api/queries', () => ({
  useProfile: () => ({ data: { display_name: 'Sam', tile_order: null } }),
  // Called three times: the month behind the card, then the two weeks. The
  // month's figures are not what this file is about, so it gets the same rows.
  useLedger: (range: { from: string; to: string } | undefined) => ({
    entries: range && range.from > '2026-09-10' ? mockUpcoming : mockRecent,
    totals: { in: 2000, out: 2147, net: -147, count: 7 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T09:00:00`));

describe('Home — where a transaction row opens', () => {
  it('opens each kind of row on the screen that edits it', async () => {
    const { getAllByRole, getByText } = await render(<HomeScreen />);

    const labels = getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel ?? ''))
      .filter((label) => label.includes('$'));

    // Seven rows in Recent, one in Coming up; the unplaceable one is not a
    // button. It is still on screen, and still readable.
    expect(labels).toHaveLength(7);
    expect(labels.some((label) => label.startsWith('Unknown'))).toBe(false);
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
    fireEvent.press(row('Rent in August'));
    fireEvent.press(row('Netflix in August'));
    // Coming up, a week the other side of the chosen day.
    fireEvent.press(row('Power'));

    expect(router.push).toHaveBeenNthCalledWith(1, {
      pathname: '/add-receipt',
      params: { id: 'r1' },
    });
    expect(router.push).toHaveBeenNthCalledWith(2, { pathname: '/add-bill', params: { id: 'b1' } });
    expect(router.push).toHaveBeenNthCalledWith(3, {
      pathname: '/add-subscription',
      params: { id: 's1' },
    });
    expect(router.push).toHaveBeenNthCalledWith(4, '/salary');
    // The two written down at the time, placed through the charges query.
    expect(router.push).toHaveBeenNthCalledWith(5, { pathname: '/add-bill', params: { id: 'b9' } });
    expect(router.push).toHaveBeenNthCalledWith(6, {
      pathname: '/add-subscription',
      params: { id: 's9' },
    });
    expect(router.push).toHaveBeenNthCalledWith(7, { pathname: '/add-bill', params: { id: 'b2' } });
    expect(router.push).toHaveBeenCalledTimes(7);
  });
});
