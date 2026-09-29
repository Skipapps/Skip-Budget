import { fireEvent, render } from '@testing-library/react-native';

import CardsScreen from '@/app/(tabs)/cards';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * What the wallet does when the balances could not be worked out.
 *
 * Every face on this screen reads `balances.get(id) ?? card.balance`, and the
 * fallback is the figure typed the day the card was added. That makes a failed
 * read the one case where showing something is worse than showing nothing: the
 * number somebody checks against their bank would be months out of date and
 * look exactly like a live one. So the page says so and offers the retry,
 * which is what every other list in the app does.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
// Reanimated 4 pulls react-native-worklets, which wants a native module. The
// money tiles are the only thing on this page that animates, so the stand-in
// just prints what the page handed it.
jest.mock('@/components/ui/amount-tile', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    AmountTile: ({ label, amount }: { label: string; amount?: number }) => (
      <Text>{`${label}: ${amount}`}</Text>
    ),
  };
});
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/data/money-mock', () => ({
  moneyBuckets: [
    { id: 'salary', label: 'Salary', artwork: 'tileSalary' },
    { id: 'savings', label: 'Savings', artwork: 'tileSavings' },
  ],
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true }) }));

// The tab reads its params and can raise the account-offer dialog; neither
// is what these tests are about.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => async () => undefined,
}));

const mockRefresh = jest.fn();
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => mockRefresh(), refreshing: false }),
}));

/** One card and one account, both with a stale figure on the row itself. */
const mockCards = [
  {
    id: 'card-1',
    holder: 'A Person',
    balance: 1200,
    last4: '4242',
    network: 'visa',
    color: '#000000',
  },
];
const mockAccounts = [
  {
    id: 'acct-1',
    bank_name: 'A Bank',
    nickname: 'Everyday',
    account_type: 'checking',
    balance: 900,
    last4: '1111',
    color: '#000000',
  },
];

let mockBalancesFailed = false;
const mockRefetchBalances = jest.fn();
let mockSavings: object[] = [];

jest.mock('@/api/queries', () => ({
  // The same rule the Savings page applies (the real module cannot load under
  // Jest: it pulls in the Supabase client and its native storage).
  savedFor: (month: {
    excluded_at: string | null;
    adjusted_saved: number | null;
    saved: number;
  }) => (month.excluded_at ? 0 : Number(month.adjusted_saved ?? month.saved)),
  useCards: () => ({ data: mockCards, isPending: false, isError: false }),
  useBankAccounts: () => ({ data: mockAccounts, isPending: false, isError: false }),
  useSalarySources: () => ({ data: [], isPending: false, isError: false }),
  useMonthlySavings: () => ({ data: mockSavings, isPending: false, isError: false }),
  useSourceBalances: () => ({
    // A walk that failed hands back no balances at all, which is exactly how
    // the screen used to end up drawing `card.balance` as if it were live.
    balances: new Map<string, number>(),
    isError: mockBalancesFailed,
    refetch: mockRefetchBalances,
  }),
}));

jest.mock('@/lib/use-today', () => ({ useToday: () => ({ today: '2026-09-12' }) }));

beforeEach(() => {
  mockBalancesFailed = false;
  mockSavings = [];
  mockRefetchBalances.mockClear();
  mockRefresh.mockClear();
});

/**
 * The Savings tile is the Savings page's total, seen from one screen back.
 *
 * It used to sum the raw `saved` column, so a month corrected to $500 or left
 * out altogether still counted at what the app had worked out — the tile said
 * $1,783.46 above a page that said $0.00.
 */
describe('Cards — the Savings tile', () => {
  const august = { month: '2026-08-01', income: 3760, spent: 1976.54, saved: 1783.46 };

  it('counts a corrected month at its correction', async () => {
    mockSavings = [
      { ...august, adjusted_saved: 500, note: 'Paid the plumber in cash', excluded_at: null },
    ];
    const { getByText, queryByText } = await render(<CardsScreen />);

    expect(getByText('Savings: 500')).toBeTruthy();
    expect(queryByText('Savings: 1783.46')).toBeNull();
  });

  it('counts a month that was left out as nothing', async () => {
    mockSavings = [
      { ...august, adjusted_saved: 500, note: null, excluded_at: '2026-09-21T15:37:00Z' },
      {
        month: '2026-07-01',
        income: 3760,
        spent: 3500,
        saved: 260,
        adjusted_saved: null,
        note: null,
        excluded_at: null,
      },
    ];
    const { getByText, queryByText } = await render(<CardsScreen />);

    expect(getByText('Savings: 260')).toBeTruthy();
    expect(queryByText('Savings: 1783.46')).toBeNull();
    expect(queryByText('Savings: 500')).toBeNull();
  });
});

describe('Cards — balances that could not be worked out', () => {
  it('lists the wallet when every read lands', async () => {
    const { getByText, queryByText } = await render(<CardsScreen />);

    expect(getByText('Credit cards')).toBeTruthy();
    expect(getByText('Bank accounts')).toBeTruthy();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it('replaces the wallet with an error rather than showing the figure typed at setup', async () => {
    mockBalancesFailed = true;
    const { getByText, queryByText } = await render(<CardsScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    // Not a stale list under a warning: the rows and their actions are gone.
    expect(queryByText('Cards')).toBeNull();
    expect(queryByText('Bank accounts')).toBeNull();
  });

  it('re-reads every list behind the balances from the retry', async () => {
    mockBalancesFailed = true;
    const { getByText } = await render(<CardsScreen />);

    await fireEvent.press(getByText('Try again'));

    expect(mockRefetchBalances).toHaveBeenCalledTimes(1);
  });
});
