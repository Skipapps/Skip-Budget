import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import TransactionsScreen from '@/app/(tabs)/transactions';

/**
 * The Transactions list opens on today and runs time backwards. Day headings come from
 * `periodBuckets` reversed; rows inside a day come from a sort in the screen, and the same-day id
 * tiebreak must stay as it was. The second half asserts where a pressed row goes.
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

// Rows whose ids name the charge rather than the plan resolve through these.
jest.mock('@/api/charges', () => ({
  useCharges: () => ({
    data: [
      { id: 'c1', bill_id: 'b9', subscription_id: null },
      { id: 'c2', bill_id: null, subscription_id: 's9' },
    ],
  }),
}));

/**
 * A Thursday, so the default "week" period covers Sunday 6th to Saturday 12th, cut off at today.
 * Three rows share the 8th in the order the ledger hands them over; the in-day tiebreak is id.
 */
const TODAY = '2026-09-10';
const mockEntries = [
  { id: 'receipt-e4', label: 'Bakery', amount: -6, date: TODAY },
  { id: 'receipt-e1', label: 'Chemist', amount: -5, date: '2026-09-08' },
  { id: 'receipt-e3', label: 'Bookshop', amount: -4, date: '2026-09-08' },
  { id: 'receipt-e2', label: 'Hardware', amount: -3, date: '2026-09-08' },
  { id: 'receipt-e0', label: 'Greengrocer', amount: -2, date: '2026-09-07' },
].map((row) => ({ ...row, kind: 'receipt' as const, sourceId: 's1' }));

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
  // Their ids name the charge, so they resolve only through the charges query.
  { id: 'charge-c1', label: 'Rent in August', amount: -1030, date: TODAY, kind: 'bill' as const },
  {
    id: 'charge-c2',
    label: 'Netflix in August',
    amount: -15,
    date: TODAY,
    kind: 'subscription' as const,
  },
  // An id shape nothing produces; it must open nothing rather than guess.
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
  it('runs the day headings backwards, starting on today', async () => {
    const { getAllByText } = await render(<TransactionsScreen />);

    const headings = getAllByText(/^(7 Sep 2026|8 Sep 2026|Today|Yesterday)$/).map(
      (node) => node.props.children,
    );

    expect(headings).toEqual(['Today', '8 Sep 2026', '7 Sep 2026']);
  });

  it('leaves the order inside a single day exactly as it was', async () => {
    const { getAllByRole } = await render(<TransactionsScreen />);

    const rows = getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel ?? ''))
      .filter((label) => label.includes('$'));

    // Three rows share 8 September and keep their id tiebreak: e1, e2, e3.
    expect(rows).toEqual([
      expect.stringContaining('Bakery'),
      expect.stringContaining('Chemist'),
      expect.stringContaining('Hardware'),
      expect.stringContaining('Bookshop'),
      expect.stringContaining('Greengrocer'),
    ]);
  });
});

describe('Transactions — at large text sizes', () => {
  // One mount for every check, as below: separate mounts under fake timers are order-dependent.
  it('wraps the period name and the week headings rather than cutting them', async () => {
    const { getByText } = await render(<TransactionsScreen />);

    const period = getByText('6 – 12 Sep');
    expect(period.props.numberOfLines).toBeUndefined();
    expect(period.props.maxFontSizeMultiplier).toBe(1.3);

    // A month is read in weeks; each week's heading keeps its total, under it when both do not fit.
    await fireEvent.press(getByText('Month'));
    const week = getByText('6–12');
    expect(week.props.numberOfLines).toBeUndefined();
    expect(week.props.maxFontSizeMultiplier).toBe(1.3);
    expect(String(week.parent?.props.className)).toContain('flex-wrap');
    const total = week.parent?.children.find(
      (node) => typeof node !== 'string' && node.props.children === '-$20.00',
    );
    expect(total).toBeTruthy();
  });
});

describe('Transactions — where a row opens', () => {
  // One mount, every kind pressed in turn: separate mounts of this screen under fake timers made
  // the suite order-dependent.
  it('opens each kind of row on the screen that edits it', async () => {
    mockLedgerEntries = routingEntries;
    const { getAllByRole, getByText } = await render(<TransactionsScreen />);

    const pressable = getAllByRole('button')
      .map((node) => String(node.props.accessibilityLabel ?? ''))
      .filter((label) => label.includes('$'));

    // The seventh row opens nothing, so it is not a button, though still on screen and readable.
    expect(pressable).toHaveLength(6);
    expect(pressable.some((label) => label.startsWith('Unknown'))).toBe(false);
    expect(getByText('Unknown')).toBeTruthy();

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
