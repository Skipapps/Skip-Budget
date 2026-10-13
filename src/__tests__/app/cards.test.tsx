import { fireEvent, render, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import CardsScreen from '@/app/(tabs)/cards';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The Cards tab as designed: a title, the two lists of faces with their "+ Add" pills, and the four
 * Money tiles. When anything behind a figure or a tile could not be read, the page says so instead
 * of showing a stale balance or offering to add what is already there.
 */

// Each icon is a drawn view named after itself, so a test can count the chevrons.
jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    { get: (_target, name) => () => createElement(View, { testID: `icon-${String(name)}` }) },
  );
});

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { Skeleton: () => createElement(View, { testID: 'skeleton' }) };
});

// The faces have tests of their own; here only what the page hands them matters.
const mockCardFaces: Record<string, unknown>[] = [];
const mockAccountFaces: Record<string, unknown>[] = [];
jest.mock('@/components/cards/payment-card', () => ({
  PaymentCard: (props: Record<string, unknown>) => {
    mockCardFaces.push(props);
    return null;
  },
}));
jest.mock('@/components/cards/account-card', () => ({
  AccountCard: (props: Record<string, unknown>) => {
    mockAccountFaces.push(props);
    return null;
  },
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Jest turns an .svg into a number, not a component; the icons have a suite of their own.
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

let mockPro = true;
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: mockPro }) }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => async () => undefined,
}));

jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

let mockCards: Record<string, unknown>[] = [];
let mockAccounts: Record<string, unknown>[] = [];
let mockSalary: { data: unknown[] | undefined; isPending: boolean; isError: boolean };
let mockBalancesFailed = false;
const mockRefetchBalances = jest.fn();
const mockRefetchSalary = jest.fn();

// The real module cannot load under Jest (pulls in Supabase).
jest.mock('@/api/queries', () => ({
  useCards: () => ({ data: mockCards, isPending: false, isError: false }),
  useBankAccounts: () => ({ data: mockAccounts, isPending: false, isError: false }),
  useSalarySources: () => ({ ...mockSalary, refetch: mockRefetchSalary }),
  useSourceBalances: () => ({
    balances: new Map([['card-1', 4050]]),
    updated: new Map([['acct-1', '2026-09-11']]),
    isError: mockBalancesFailed,
    refetch: mockRefetchBalances,
  }),
}));

let mockLoans: {
  loans: { billId: string; name: string }[];
  isPending: boolean;
  isError: boolean;
};
const mockRefetchLoans = jest.fn();
jest.mock('@/api/loans', () => ({
  useActiveLoans: () => ({ ...mockLoans, refetch: mockRefetchLoans }),
}));

jest.mock('@/lib/use-today', () => ({ useToday: () => ({ today: '2026-09-12' }) }));

let mockSavings: { readyToUse: number; isPending: boolean; isError: boolean };
jest.mock('@/api/savings', () => ({
  useSavingsCore: () => ({
    pots: mockSavings.isError ? [] : [{ id: 'sep' }],
    summary: { readyToUse: mockSavings.readyToUse },
    isPending: mockSavings.isPending,
    isError: mockSavings.isError,
  }),
}));
let mockGoals: {
  active: { id: string; name: string }[];
  done: { id: string; name: string }[];
  isPending: boolean;
  isError: boolean;
};
jest.mock('@/api/goals', () => ({
  useGoals: () => ({
    goals: [...mockGoals.active, ...mockGoals.done],
    summary: { active: mockGoals.active, done: mockGoals.done },
    isPending: mockGoals.isPending,
    isError: mockGoals.isError,
  }),
}));

const monthly = {
  id: 's1',
  name: 'Acme',
  amount: 1880,
  frequency: 'monthly',
  last_payday: '2026-08-31',
};

beforeEach(() => {
  mockPro = true;
  mockCards = [
    {
      id: 'card-1',
      holder: 'Amex Komal',
      balance: 1200,
      last4: '6334',
      network: 'Amex',
      color: '#000000',
      credit_limit: 10000,
    },
  ];
  mockAccounts = [
    {
      id: 'acct-1',
      bank_name: 'Chase',
      nickname: '',
      account_type: 'checking',
      balance: 900,
      last4: '7010',
      color: '#000000',
    },
  ];
  mockSalary = { data: [monthly], isPending: false, isError: false };
  mockLoans = { loans: [], isPending: false, isError: false };
  mockSavings = { readyToUse: 850, isPending: false, isError: false };
  mockGoals = { active: [], done: [], isPending: false, isError: false };
  mockBalancesFailed = false;
  mockCardFaces.length = 0;
  mockAccountFaces.length = 0;
  mockRefetchBalances.mockClear();
  mockRefetchSalary.mockClear();
  mockRefetchLoans.mockClear();
  jest.mocked(router.push).mockClear();
});

describe('Cards — the top of the page', () => {
  it('opens on a centred title and its line, with no net balance card', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByRole('header', { name: 'Cards' })).toBeTruthy();
    expect(screen.getByText('All your money in one place.')).toBeTruthy();
    expect(screen.queryByText(/Net balance/i)).toBeNull();
  });
});

describe('Cards — the two lists', () => {
  it('shows "Add" on each pill and says what it adds', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getAllByText('Add')).toHaveLength(2);
    await fireEvent.press(screen.getByLabelText('New credit card'));
    expect(router.push).toHaveBeenLastCalledWith('/add-card');
    await fireEvent.press(screen.getByLabelText('Add account'));
    expect(router.push).toHaveBeenLastCalledWith('/add-account');
  });

  it('keeps the free allowance: a second card opens Skip Pro', async () => {
    mockPro = false;
    const screen = await render(<CardsScreen />);

    await fireEvent.press(screen.getByLabelText('New credit card'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'unlimited' },
    });
  });

  it('hands each face its live balance, the card its limit and the account its last update', async () => {
    mockCards.push({ ...mockCards[0], id: 'card-2', credit_limit: null });
    await render(<CardsScreen />);

    const [first, second] = mockCardFaces.slice(-2) as { card: Record<string, unknown> }[];
    expect(first.card).toMatchObject({ id: 'card-1', balance: 4050, creditLimit: 10000 });
    expect(second.card).toMatchObject({ id: 'card-2', balance: 1200, creditLimit: null });

    expect(mockAccountFaces.at(-1)).toMatchObject({
      account: { id: 'acct-1', bankName: 'Chase', accountType: 'Checking' },
      updatedOn: '2026-09-11',
      today: '2026-09-12',
    });
  });

  it('opens a face’s page', async () => {
    const screen = await render(<CardsScreen />);

    await fireEvent.press(screen.getByLabelText('Amex Komal, view transactions'));
    expect(router.push).toHaveBeenLastCalledWith('/source/card-1');
    await fireEvent.press(screen.getByLabelText('Chase, view transactions'));
    expect(router.push).toHaveBeenLastCalledWith('/source/acct-1');
  });
});

type Screen = Awaited<ReturnType<typeof render>>;

/** What a tile draws, top to bottom; its hidden measuring copies are not on screen. */
const linesIn = (screen: Screen, id: string) =>
  within(screen.getByTestId(`money-tile-${id}`))
    .getAllByText(/./)
    .map((line) => line.props.children);

describe('Cards — the Money tiles', () => {
  it('draws Salary, Savings, Loans and Goals in that order, each with a chevron', async () => {
    const screen = await render(<CardsScreen />);

    // In the order drawn, which is the order they stack in when they must.
    expect(
      screen
        .getAllByTestId(/^money-tile-(salary|savings|loans|goals)$/)
        .map((tile) => tile.props.testID),
    ).toEqual(['money-tile-salary', 'money-tile-savings', 'money-tile-loans', 'money-tile-goals']);
    for (const id of ['salary', 'savings', 'loans', 'goals']) {
      expect(
        within(screen.getByTestId(`money-tile-${id}`)).getByTestId('icon-ChevronRight'),
      ).toBeTruthy();
    }
  });

  it('draws no note under any tile, only the name and one figure', async () => {
    mockLoans.loans = [
      { billId: 'bill-9', name: 'Car loan' },
      { billId: 'bill-3', name: 'Mortgage' },
    ];
    mockGoals.active = [{ id: 'g1', name: 'Trip' }];
    const screen = await render(<CardsScreen />);

    expect(linesIn(screen, 'salary')).toEqual(['Salary', '$1,880.00']);
    expect(linesIn(screen, 'savings')).toEqual(['Savings', '$850.00']);
    expect(linesIn(screen, 'loans')).toEqual(['Loans', '2 active']);
    expect(linesIn(screen, 'goals')).toEqual(['Goals', '1 active']);
  });

  it('draws no note under the tiles that offer something either, only the name and the pill', async () => {
    mockSalary.data = [];
    const screen = await render(<CardsScreen />);

    expect(linesIn(screen, 'salary')).toEqual(['Salary', 'Add salary']);
    expect(linesIn(screen, 'loans')).toEqual(['Loans', 'Add a loan']);
    expect(linesIn(screen, 'goals')).toEqual(['Goals', 'Add a goal']);
  });

  it('Salary shows this month’s pay with cents and no note, and opens Salary', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('$1,880.00')).toBeTruthy();
    expect(screen.queryByText('Monthly')).toBeNull();
    const tile = screen.getByLabelText('Salary, $1,880.00');
    await fireEvent.press(tile);
    expect(router.push).toHaveBeenLastCalledWith('/salary');
  });

  it('Salary adds this month’s one-off pays to the schedules', async () => {
    const schedule = { ...monthly, amount: 1880, frequency: 'semimonthly' };
    const oneOff = (payday: string, amount: number) => ({
      id: `o-${payday}`,
      name: '',
      amount,
      frequency: 'once',
      last_payday: payday,
    });
    mockSalary.data = [schedule, oneOff('2026-09-05', 400), oneOff('2026-08-20', 999)];
    const screen = await render(<CardsScreen />);

    // 2 × $1,880 twice a month, plus September's $400.
    expect(screen.getByText('$4,160.00')).toBeTruthy();
  });

  it('Salary with no pay offers to add it, and still opens Salary', async () => {
    mockSalary.data = [];
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('Add salary')).toBeTruthy();
    expect(screen.queryByText('Add your pay')).toBeNull();
    expect(within(screen.getByTestId('money-tile-salary')).queryByText(/^\$/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('Salary, Add salary'));
    expect(router.push).toHaveBeenLastCalledWith('/salary');
  });

  it('Salary draws neither a figure nor the offer while the pay is still being read', async () => {
    mockSalary = { data: undefined, isPending: true, isError: false };
    const screen = await render(<CardsScreen />);

    expect(screen.queryByText('Add salary')).toBeNull();
    expect(screen.queryByText('$0.00')).toBeNull();
    expect(screen.getByLabelText('Salary')).toBeTruthy();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('Savings shows what is ready to use, and opens Savings', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('$850.00')).toBeTruthy();
    expect(screen.queryByText('Ready to use')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Savings, $850.00'));
    expect(router.push).toHaveBeenLastCalledWith('/savings');
  });

  it('Savings shows $0.00 when nothing is ready, never an offer', async () => {
    mockSavings.readyToUse = 0;
    const screen = await render(<CardsScreen />);

    expect(screen.getByLabelText('Savings, $0.00')).toBeTruthy();
    expect(screen.queryByText('Ready to use')).toBeNull();
  });

  it('Savings draws no figure while savings are read', async () => {
    mockSavings = { readyToUse: 0, isPending: true, isError: false };
    const screen = await render(<CardsScreen />);

    expect(screen.getByLabelText('Savings')).toBeTruthy();
    expect(screen.queryByText('$0.00')).toBeNull();
  });

  it('Savings shows no $0 when savings cannot be read, and still opens the page', async () => {
    mockSavings = { readyToUse: 0, isPending: false, isError: true };
    const screen = await render(<CardsScreen />);

    expect(screen.queryByText('$0.00')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Savings, Open'));
    expect(router.push).toHaveBeenLastCalledWith('/savings');
  });

  it('Loans with none opens the Loans page, which invites a first one', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('Add a loan')).toBeTruthy();
    expect(screen.queryByText('Track what you owe')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Loans, Add a loan'));
    expect(router.push).toHaveBeenLastCalledWith('/loans');
  });

  it('Loans with one opens the Loans page', async () => {
    mockLoans.loans = [{ billId: 'bill-9', name: 'Car loan' }];
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('1 active')).toBeTruthy();
    expect(screen.queryByText('Car loan')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Loans, 1 active'));
    expect(router.push).toHaveBeenLastCalledWith('/loans');
  });

  it('Loans with several counts them without naming them, and opens the Loans page', async () => {
    mockLoans.loans = [
      { billId: 'bill-9', name: 'Car loan' },
      { billId: 'bill-3', name: 'Mortgage' },
    ];
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('2 active')).toBeTruthy();
    expect(screen.queryByText(/Car loan|Mortgage/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('Loans, 2 active'));
    expect(router.push).toHaveBeenLastCalledWith('/loans');
  });

  it('Loans shows no figure while the loans are being read, and opens the page all the same', async () => {
    mockLoans = { loans: [], isPending: true, isError: false };
    const screen = await render(<CardsScreen />);

    expect(screen.queryByText('Add a loan')).toBeNull();
    // The page reads them itself, so pressing before the answer opens nothing wrong.
    await fireEvent.press(screen.getByLabelText('Loans'));
    expect(router.push).toHaveBeenLastCalledWith('/loans');
  });

  it('Goals with none invites a first one, and opens Goals', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('Add a goal')).toBeTruthy();
    expect(screen.queryByText('Save for something')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Goals, Add a goal'));
    expect(router.push).toHaveBeenLastCalledWith('/goals');
  });

  it('Goals counts the active ones without naming them, and opens Goals', async () => {
    mockGoals.active = [
      { id: 'g1', name: 'Trip' },
      { id: 'g2', name: 'Emergency fund' },
    ];
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('2 active')).toBeTruthy();
    expect(screen.queryByText(/Trip|Emergency fund/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('Goals, 2 active'));
    expect(router.push).toHaveBeenLastCalledWith('/goals');
  });

  it('Goals with only reached ones still invites a new one, and says nothing of them', async () => {
    mockGoals.done = [
      { id: 'g1', name: 'New phone' },
      { id: 'g2', name: 'Bike' },
    ];
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('Add a goal')).toBeTruthy();
    expect(screen.queryByText(/reached|New phone|Bike/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('Goals, Add a goal'));
    expect(router.push).toHaveBeenLastCalledWith('/goals');
  });

  it('Goals offers no first goal while the goals are read', async () => {
    mockGoals = { active: [], done: [], isPending: true, isError: false };
    const screen = await render(<CardsScreen />);

    expect(screen.queryByText('Add a goal')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Goals'));
    expect(router.push).toHaveBeenLastCalledWith('/goals');
  });
});

describe('Cards — what could not be read', () => {
  it('lists the wallet when every read lands', async () => {
    const screen = await render(<CardsScreen />);

    expect(screen.getByText('Credit cards')).toBeTruthy();
    expect(screen.getByText('Bank accounts')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
  });

  it.each([
    ['the balances', () => (mockBalancesFailed = true), mockRefetchBalances],
    [
      'the pay',
      () => (mockSalary = { data: undefined, isPending: false, isError: true }),
      mockRefetchSalary,
    ],
    [
      'the loans',
      () => (mockLoans = { loans: [], isPending: false, isError: true }),
      mockRefetchLoans,
    ],
  ])(
    'replaces the page with the failure when %s could not be read',
    async (_what, fail, refetch) => {
      fail();
      const screen = await render(<CardsScreen />);

      expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
      // Not a stale list or an offer to add what is there: the rows and tiles are gone.
      expect(screen.queryByText('Credit cards')).toBeNull();
      expect(screen.queryByText('Money')).toBeNull();
      expect(screen.queryByText('Add a loan')).toBeNull();

      await fireEvent.press(screen.getByText('Try again'));
      expect(refetch).toHaveBeenCalledTimes(1);
      for (const other of [mockRefetchBalances, mockRefetchSalary, mockRefetchLoans]) {
        if (other !== refetch) expect(other).not.toHaveBeenCalled();
      }
    },
  );
});
