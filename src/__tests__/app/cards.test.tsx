import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import CardsScreen from '@/app/(tabs)/cards';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * When the balances could not be worked out the wallet shows the failure and a retry, not the
 * fallback. Faces read `balances.get(id) ?? card.balance`, and that fallback is the figure typed
 * the day the card was added: months stale yet indistinguishable from a live number.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
// Reanimated 4 pulls react-native-worklets, which wants a native module; the stand-in just prints
// what the page handed it. An omitted amount is how the real tile knows to draw "Open".
jest.mock('@/components/ui/amount-tile', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    AmountTile: ({
      label,
      amount,
      onPress,
    }: {
      label: string;
      amount?: number;
      onPress?: () => void;
    }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
        <Text>{`${label}: ${amount === undefined ? 'no figure' : amount}`}</Text>
      </Pressable>
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

jest.mock('@/data/money-buckets', () => ({
  moneyBuckets: [
    { id: 'salary', label: 'Salary', artwork: 'tileSalary' },
    { id: 'savings', label: 'Savings', artwork: 'tileSavings' },
  ],
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true }) }));

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

// The real module cannot load under Jest (pulls in Supabase). It has no savings hook to offer: a
// page that still reached for one would throw here.
jest.mock('@/api/queries', () => ({
  useCards: () => ({ data: mockCards, isPending: false, isError: false }),
  useBankAccounts: () => ({ data: mockAccounts, isPending: false, isError: false }),
  useSalarySources: () => ({ data: mockSalary, isPending: false, isError: false }),
  useSourceBalances: () => ({
    balances: new Map<string, number>(),
    isError: mockBalancesFailed,
    refetch: mockRefetchBalances,
  }),
}));

let mockSalary: unknown[] = [];
jest.mock('@/lib/use-today', () => ({ useToday: () => ({ today: '2026-09-12' }) }));

beforeEach(() => {
  mockSalary = [];
  mockBalancesFailed = false;
  mockRefetchBalances.mockClear();
  mockRefresh.mockClear();
  jest.mocked(router.push).mockClear();
});

/** Savings has nothing to total yet: its tile is a door to the page, with no number of its own. */
describe('Cards — the Savings tile', () => {
  it('is handed no figure, so it draws Open instead of a total', async () => {
    const { getByText, queryByText } = await render(<CardsScreen />);

    expect(getByText('Savings: no figure')).toBeTruthy();
    expect(queryByText(/^Savings: \d/)).toBeNull();
  });

  it('stays without a figure whatever pay is on file', async () => {
    mockSalary = [
      { id: 's1', name: 'Acme', amount: 1880, frequency: 'monthly', last_payday: '2026-08-31' },
    ];
    const { getByText, queryByText } = await render(<CardsScreen />);

    // The Salary tile beside it still reports its figure; $0 would be a figure too.
    expect(getByText('Salary: 1880')).toBeTruthy();
    expect(getByText('Savings: no figure')).toBeTruthy();
    expect(queryByText('Savings: 0')).toBeNull();
  });

  it('still opens the Savings page, and Salary still opens Salary', async () => {
    const { getByLabelText } = await render(<CardsScreen />);

    await fireEvent.press(getByLabelText('Savings'));
    expect(router.push).toHaveBeenLastCalledWith('/savings');

    await fireEvent.press(getByLabelText('Salary'));
    expect(router.push).toHaveBeenLastCalledWith('/salary');
  });
});

/** This month's money in: the schedules, plus one-off pays dated this month and no other. */
describe('Cards — the Salary tile', () => {
  const schedule = {
    id: 's1',
    name: 'Acme',
    amount: 1880,
    frequency: 'semimonthly',
    last_payday: '2026-08-31',
  };
  const oneOff = (payday: string, amount: number) => ({
    id: `o-${payday}`,
    name: '',
    amount,
    frequency: 'once',
    last_payday: payday,
  });

  it('adds this month’s one-off pays to the schedules', async () => {
    mockSalary = [schedule, oneOff('2026-09-05', 400), oneOff('2026-08-20', 999)];
    const { getByText } = await render(<CardsScreen />);

    // 2 × $1,880 twice a month, plus September's $400.
    expect(getByText('Salary: 4160')).toBeTruthy();
  });

  it('shows only one-off pays when there is no schedule', async () => {
    mockSalary = [oneOff('2026-09-01', 250.5), oneOff('2026-09-10', 100)];
    const { getByText } = await render(<CardsScreen />);

    expect(getByText('Salary: 350.5')).toBeTruthy();
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
