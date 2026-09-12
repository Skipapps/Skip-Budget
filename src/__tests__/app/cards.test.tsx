import { fireEvent, render } from '@testing-library/react-native';

import CardsScreen from '@/app/(tabs)/cards';

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
// money tiles are the only thing on this page that animates.
jest.mock('@/components/ui/amount-tile', () => ({ AmountTile: () => null }));
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/data/money-mock', () => ({ moneyBuckets: [] }));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true }) }));

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

jest.mock('@/api/queries', () => ({
  useCards: () => ({ data: mockCards, isPending: false, isError: false }),
  useBankAccounts: () => ({ data: mockAccounts, isPending: false, isError: false }),
  useSalarySources: () => ({ data: [], isPending: false, isError: false }),
  useMonthlySavings: () => ({ data: [], isPending: false, isError: false }),
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
  mockRefetchBalances.mockClear();
  mockRefresh.mockClear();
});

describe('Cards — balances that could not be worked out', () => {
  it('lists the wallet when every read lands', async () => {
    const { getByText, queryByText } = await render(<CardsScreen />);

    expect(getByText('Cards')).toBeTruthy();
    expect(getByText('Bank accounts')).toBeTruthy();
    expect(queryByText('Could not load your wallet')).toBeNull();
  });

  it('replaces the wallet with an error rather than showing the figure typed at setup', async () => {
    mockBalancesFailed = true;
    const { getByText, queryByText } = await render(<CardsScreen />);

    expect(getByText('Could not load your wallet')).toBeTruthy();
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
