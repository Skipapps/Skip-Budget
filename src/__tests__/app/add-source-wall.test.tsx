import { render } from '@testing-library/react-native';

import AddAccountScreen from '@/app/add-account';
import AddCardScreen from '@/app/add-card';

/**
 * Free keeps one card and one bank account, so a deep link to create a second opens Pro instead of
 * a form the database would refuse. The answer is fixed on arrival: saving the first card raises
 * the count to one, and a live check would then push that person onto the Pro page.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));
jest.mock('@/components/cards/network-picker', () => ({ NetworkPicker: () => null }));
// Reanimated 4 wants a native worklets module; the swatches are the only animated part of the form.
jest.mock('@/components/ui/color-picker', () => ({ ColorPicker: () => null }));
jest.mock('@/components/flow/amount-step', () => ({ AmountStep: () => null }));
jest.mock('@/components/flow/inline-calendar', () => ({ InlineCalendar: () => null }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: () => {},
    Stack: { Screen: () => null },
    Redirect: ({ href }: { href: { pathname: string; params: { id: string } } }) => (
      <Text>{`redirect ${href.pathname} ${href.params.id}`}</Text>
    ),
  };
});

let mockPro = { pro: false, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

const mockUseCreateCard = jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false }));
const mockUseCreateAccount = jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false }));
const idle = () => ({ mutateAsync: jest.fn(), isPending: false });

jest.mock('@/api/mutations', () => ({
  useCreateCard: () => mockUseCreateCard(),
  useUpdateCard: idle,
  useDeleteCard: idle,
  useCreateBankAccount: () => mockUseCreateAccount(),
  useUpdateBankAccount: idle,
  useDeleteBankAccount: idle,
  useCreateSalarySource: idle,
  useSetSalaryAccounts: idle,
  useLinkAccountToSalaries: idle,
}));

jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => ({ mutateAsync: jest.fn() }),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

let mockOwned: { data: unknown[] | undefined; isPending: boolean };

jest.mock('@/api/queries', () => ({
  useCard: () => ({ data: null, isError: false, isFetched: false, refetch: jest.fn() }),
  useCards: () => mockOwned,
  useSourceLedger: () => ({ ledger: null }),
  useBankAccount: () => ({ data: null, isError: false, isFetched: false, refetch: jest.fn() }),
  useBankAccounts: () => mockOwned,
  useSalaryAccountIds: () => ({ ids: new Set<string>(), isLoading: false, isError: false }),
  useSalarySources: () => ({ data: [] }),
}));

const WALL = 'redirect /pro-feature unlimited';

beforeEach(() => {
  mockParams = {};
  mockPro = { pro: false, ready: true };
  mockOwned = { data: [], isPending: false };
  mockUseCreateCard.mockClear();
  mockUseCreateAccount.mockClear();
});

describe.each([
  ['card', AddCardScreen, mockUseCreateCard],
  ['bank account', AddAccountScreen, mockUseCreateAccount],
] as const)('Add %s — the free allowance', (_, Screen, useCreate) => {
  it('opens Pro when a free account already has one', async () => {
    mockOwned = { data: [{ id: 'one' }], isPending: false };
    const { getByText } = await render(<Screen />);

    expect(getByText(WALL)).toBeTruthy();
    expect(useCreate).not.toHaveBeenCalled();
  });

  it('opens the form for the first one', async () => {
    const { queryByText } = await render(<Screen />);

    expect(queryByText(WALL)).toBeNull();
    expect(useCreate).toHaveBeenCalled();
  });

  it('keeps the form once open, even after the first one is saved', async () => {
    const { queryByText, rerender } = await render(<Screen />);
    mockOwned = { data: [{ id: 'one' }], isPending: false };
    await rerender(<Screen />);

    expect(queryByText(WALL)).toBeNull();
  });

  it('waits for the count instead of guessing', async () => {
    mockOwned = { data: undefined, isPending: true };
    const { queryByText, rerender } = await render(<Screen />);
    expect(queryByText(WALL)).toBeNull();

    mockOwned = { data: [{ id: 'one' }], isPending: false };
    await rerender(<Screen />);
    expect(queryByText(WALL)).toBeTruthy();
  });

  it('lets Pro add as many as it likes', async () => {
    mockPro = { pro: true, ready: true };
    mockOwned = { data: [{ id: 'one' }, { id: 'two' }], isPending: false };
    const { queryByText } = await render(<Screen />);

    expect(queryByText(WALL)).toBeNull();
  });

  it('never walls an edit', async () => {
    mockParams = { id: 'one' };
    mockOwned = { data: [{ id: 'one' }], isPending: false };
    const { queryByText } = await render(<Screen />);

    expect(queryByText(WALL)).toBeNull();
  });
});
