import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import CardsScreen from '@/app/(tabs)/cards';

/**
 * The Cards tab's two doors to Pro, a new card and a new account, say where the person was going,
 * so buying Pro from the explainer lands there. A card or account beyond the free allowance is no
 * door: it opens its own page on any plan, where it can be edited or deleted.
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

const explainer = (next: string) => ({
  pathname: '/pro-feature',
  params: { id: 'unlimited', next },
});

const VISA_FREE =
  'Visa Sam. On the free plan you can open, edit or delete it, but not use it for new spending.';
const ALLY_FREE =
  'Ally. On the free plan you can open, edit or delete it, but not use it for new spending.';
const opacityOf = (row: { props: { style?: StyleProp<ViewStyle> } }) =>
  StyleSheet.flatten(row.props.style)?.opacity;

describe('a free account at its allowance', () => {
  beforeEach(() => {
    mockPro = false;
    mockCards.push({ ...mockCards[0], id: 'card-2', holder: 'Visa Sam' });
    mockAccounts.push({ ...mockAccounts[0], id: 'acct-2', bank_name: 'Ally' });
  });

  it('a new card opens the explainer, then the card form', async () => {
    const screen = await render(<CardsScreen />);
    await fireEvent.press(screen.getByLabelText('New credit card'));
    expect(router.push).toHaveBeenLastCalledWith(explainer('/add-card'));
  });

  it('a new account opens the explainer, then the account form', async () => {
    const screen = await render(<CardsScreen />);
    await fireEvent.press(screen.getByLabelText('Add account'));
    expect(router.push).toHaveBeenLastCalledWith(explainer('/add-account'));
  });

  it('a second card opens its own page, not the explainer', async () => {
    const screen = await render(<CardsScreen />);
    await fireEvent.press(screen.getByLabelText(VISA_FREE));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenLastCalledWith('/source/card-2');
  });

  it('a second account opens its own page, not the explainer', async () => {
    const screen = await render(<CardsScreen />);
    await fireEvent.press(screen.getByLabelText(ALLY_FREE));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenLastCalledWith('/source/acct-2');
  });

  it('fades only the card and account beyond the allowance', async () => {
    const screen = await render(<CardsScreen />);

    expect(opacityOf(screen.getByLabelText('Amex Komal, view transactions'))).toBeUndefined();
    expect(opacityOf(screen.getByLabelText('Chase, view transactions'))).toBeUndefined();
    expect(opacityOf(screen.getByLabelText(VISA_FREE))).toBe(0.45);
    expect(opacityOf(screen.getByLabelText(ALLY_FREE))).toBe(0.45);
  });

  it('the first card and account stay open, straight to their pages', async () => {
    const screen = await render(<CardsScreen />);
    await fireEvent.press(screen.getByLabelText('Amex Komal, view transactions'));
    expect(router.push).toHaveBeenLastCalledWith('/source/card-1');
    await fireEvent.press(screen.getByLabelText('Chase, view transactions'));
    expect(router.push).toHaveBeenLastCalledWith('/source/acct-1');
  });
});

describe('a Pro account with more than one of each', () => {
  beforeEach(() => {
    mockCards.push({ ...mockCards[0], id: 'card-2', holder: 'Visa Sam' });
    mockAccounts.push({ ...mockAccounts[0], id: 'acct-2', bank_name: 'Ally' });
  });

  it('reads, draws and opens every card and account alike', async () => {
    const screen = await render(<CardsScreen />);

    for (const [label, page] of [
      ['Amex Komal, view transactions', '/source/card-1'],
      ['Visa Sam, view transactions', '/source/card-2'],
      ['Chase, view transactions', '/source/acct-1'],
      ['Ally, view transactions', '/source/acct-2'],
    ]) {
      const row = screen.getByLabelText(label);
      expect(opacityOf(row)).toBeUndefined();
      await fireEvent.press(row);
      expect(router.push).toHaveBeenLastCalledWith(page);
    }
    expect(screen.queryByLabelText(/On the free plan/)).toBeNull();
  });

  it('adds a card or account straight away', async () => {
    const screen = await render(<CardsScreen />);
    await fireEvent.press(screen.getByLabelText('New credit card'));
    expect(router.push).toHaveBeenLastCalledWith('/add-card');
    await fireEvent.press(screen.getByLabelText('Add account'));
    expect(router.push).toHaveBeenLastCalledWith('/add-account');
  });
});
