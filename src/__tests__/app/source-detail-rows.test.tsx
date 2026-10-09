import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SourceDetailScreen from '@/app/source/[id]';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * A card's or account's Transactions: newest first (latest day on top, latest-created first within
 * a day), and each row opens the page of what is behind it, as Home and Activity do. Payments have
 * no page: pressing one still offers to remove it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => false);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'src-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));
jest.mock('@/api/mutations', () => ({
  useCreatePayment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeletePayment: () => ({ mutate: jest.fn(), isPending: false }),
}));

const mockCard = {
  id: 'src-1',
  holder: 'Everyday Visa',
  network: 'VISA',
  last4: '4242',
  color: '#000000',
  balance: 100,
  balance_as_of: null,
};
const mockAccount = {
  id: 'src-1',
  bank_name: 'Chase',
  nickname: 'Checking',
  account_type: 'checking',
  last4: '7730',
  color: '#123456',
  balance: 1000,
  balance_as_of: null,
};

/** As the money book hands them over: newest day first, ties by id. */
const CARD_ROWS = [
  { id: 'payment-p1', label: 'Payment', amount: 200, date: '2026-10-08', kind: 'payment' },
  // Same day: Early was filed in the morning, Late in the evening.
  { id: 'receipt-early', label: 'Early', amount: -4, date: '2026-10-07', kind: 'receipt' },
  { id: 'receipt-late', label: 'Late', amount: -6, date: '2026-10-07', kind: 'receipt' },
  {
    id: 'subscription-s1@2026-10-06',
    label: 'Netflix',
    amount: -15,
    date: '2026-10-06',
    kind: 'subscription',
  },
  { id: 'bill-b1@2026-10-05', label: 'Power', amount: -80, date: '2026-10-05', kind: 'bill' },
  // Recorded charges: their plan is found through the charges read.
  { id: 'charge-c1', label: 'Rent', amount: -1000, date: '2026-10-03', kind: 'bill' },
  { id: 'charge-c2', label: 'Gym', amount: -30, date: '2026-10-02', kind: 'subscription' },
  // A charge whose plan the read does not know: there is nowhere to send it.
  { id: 'charge-lost', label: 'Old plan', amount: -9, date: '2026-10-01', kind: 'bill' },
];

const ACCOUNT_ROWS = [
  { id: 'income-pay1@2026-10-04', label: 'Acme', amount: 1880, date: '2026-10-04', kind: 'income' },
  { id: 'receipt-early', label: 'Early', amount: -4, date: '2026-10-07', kind: 'receipt' },
  { id: 'payment-d1', label: 'Payment', amount: 50, date: '2026-10-06', kind: 'payment' },
];

let mockKind: 'card' | 'account' = 'card';
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({
    data: [
      { id: 'early', created_at: '2026-10-07T08:00:00+00:00' },
      { id: 'late', created_at: '2026-10-07T19:30:00+00:00' },
    ],
  }),
  useSourceLedger: () => ({
    source: mockKind === 'card' ? mockCard : mockAccount,
    kind: mockKind,
    card: mockKind === 'card' ? mockCard : null,
    account: mockKind === 'account' ? mockAccount : null,
    ledger: {
      entries: mockKind === 'card' ? CARD_ROWS : ACCOUNT_ROWS,
      balance: 0,
      charged: 0,
      paid: 0,
    },
    isLoading: false,
    isError: false,
  }),
}));
jest.mock('@/api/charges', () => ({
  useCharges: () => ({
    data: [
      { id: 'c1', bill_id: 'b9', subscription_id: null },
      { id: 'c2', bill_id: null, subscription_id: 's9' },
    ],
  }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

/** The rows' names, top to bottom. */
const order = (screen: Screen) =>
  screen
    .getAllByLabelText(/ · \d{1,2} Oct 2026$/)
    .map((node) => String(node.props.accessibilityLabel).split(',')[0]);

const row = (screen: Screen, name: string) =>
  screen.getByLabelText(new RegExp(`^${name}, .* · \\d{1,2} Oct 2026$`));

beforeEach(async () => {
  jest.clearAllMocks();
  resetProStatusForTests();
  mockKind = 'card';
  await act(async () => publishProStatus({ pro: true, ready: true }));
});

describe('a card’s Transactions', () => {
  it('runs newest first, and the latest-created first within a day', async () => {
    const screen = await render(<SourceDetailScreen />);
    expect(order(screen)).toEqual([
      'Payment',
      'Late',
      'Early',
      'Netflix',
      'Power',
      'Rent',
      'Gym',
      'Old plan',
    ]);
  });

  it('opens each row’s own page, as Home and Activity do', async () => {
    const screen = await render(<SourceDetailScreen />);
    for (const name of ['Late', 'Netflix', 'Power', 'Rent', 'Gym']) {
      await fireEvent.press(row(screen, name));
    }
    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual([
      { pathname: '/receipt/[id]', params: { id: 'late' } },
      { pathname: '/subscription/[id]', params: { id: 's1' } },
      { pathname: '/bill/[id]', params: { id: 'b1' } },
      { pathname: '/bill/[id]', params: { id: 'b9' } },
      { pathname: '/subscription/[id]', params: { id: 's9' } },
    ]);
  });

  it('presses and reads like the receipts rows', async () => {
    const screen = await render(<SourceDetailScreen />);
    const late = row(screen, 'Late');
    expect(late.props.accessibilityRole).toBe('button');
    expect(late.props.accessibilityHint).toBe('Opens this receipt');
    expect(late.props.className).toContain('active:opacity-60');
    expect(row(screen, 'Power').props.accessibilityHint).toBe('Opens this bill');
    expect(row(screen, 'Netflix').props.accessibilityHint).toBe('Opens this subscription');
  });

  it('leaves a row with no page inert: no role, no feedback, no press', async () => {
    const screen = await render(<SourceDetailScreen />);
    const lost = row(screen, 'Old plan');
    expect(lost.props.accessibilityRole).toBe('text');
    expect(lost.props.accessibilityHint).toBeUndefined();
    expect(lost.props.className).not.toContain('active:');
    await fireEvent.press(lost);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('keeps a payment’s press for removing it, and opens nothing', async () => {
    const screen = await render(<SourceDetailScreen />);
    const payment = row(screen, 'Payment');
    expect(payment.props.accessibilityHint).toBeUndefined();
    await fireEvent.press(payment);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('searches within the new order', async () => {
    const screen = await render(<SourceDetailScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Search transactions'), 'a');
    // "Late", "Early", "Payment", "Old plan" contain an a; newest first still.
    expect(order(screen)).toEqual(['Payment', 'Late', 'Early', 'Old plan']);
  });
});

describe('an account’s Transactions', () => {
  it('runs newest first and opens pay where Home does', async () => {
    mockKind = 'account';
    const screen = await render(<SourceDetailScreen />);
    expect(order(screen)).toEqual(['Early', 'Payment', 'Acme']);

    const pay = row(screen, 'Acme');
    expect(pay.props.accessibilityHint).toBe('Opens your pay');
    await fireEvent.press(pay);
    await fireEvent.press(row(screen, 'Early'));
    expect(jest.mocked(router.push).mock.calls.map(([href]) => href)).toEqual([
      '/salary',
      { pathname: '/receipt/[id]', params: { id: 'early' } },
    ]);

    // Money added is a payment: still offered for removal, never opened.
    await fireEvent.press(row(screen, 'Payment'));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });
});
