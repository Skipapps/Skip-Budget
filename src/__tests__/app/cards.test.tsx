import { fireEvent, render } from '@testing-library/react-native';

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
// what the page handed it.
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
  // The Savings page's rule; the real module cannot load under Jest (pulls in Supabase).
  savedFor: (month: {
    excluded_at: string | null;
    adjusted_saved: number | null;
    saved: number;
  }) => (month.excluded_at ? 0 : Number(month.adjusted_saved ?? month.saved)),
  useCards: () => ({ data: mockCards, isPending: false, isError: false }),
  useBankAccounts: () => ({ data: mockAccounts, isPending: false, isError: false }),
  useSalarySources: () => ({ data: mockSalary, isPending: false, isError: false }),
  useMonthlySavings: () => ({ data: mockSavings, isPending: false, isError: false }),
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
  mockSavings = [];
  mockRefetchBalances.mockClear();
  mockRefresh.mockClear();
});

/**
 * The Savings tile is the Savings page's total (via savedFor), not a sum of the raw `saved` column:
 * a month corrected to $500 or left out must not count at the worked-out figure.
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
