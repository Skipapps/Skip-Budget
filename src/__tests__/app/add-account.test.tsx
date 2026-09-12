import { render } from '@testing-library/react-native';

import AddAccountScreen from '@/app/add-account';

/**
 * What the account editor does when it cannot read the account.
 *
 * `id` is what turns Save into an update, so the form used to open blank over a
 * real account the moment a read failed — and the field it would have blanked
 * is a balance. Every figure on the home page is walked forward from that one.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));
// Reanimated 4 wants a native worklets module; the swatches are the only thing
// on the form that animates.
jest.mock('@/components/ui/color-picker', () => ({ ColorPicker: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'acct-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: () => null,
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockUseUpdate = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
const mockUseCreate = jest.fn(() => ({ mutateAsync: mockCreate, isPending: false }));
const mockUseDelete = jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false }));

jest.mock('@/api/mutations', () => ({
  useUpdateBankAccount: () => mockUseUpdate(),
  useCreateBankAccount: () => mockUseCreate(),
  useDeleteBankAccount: () => mockUseDelete(),
  useCreateSalarySource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => ({ mutateAsync: jest.fn() }),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

let mockAccount: { data: unknown; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useBankAccount: () => ({ ...mockAccount, refetch: mockRefetch }),
  useBankAccounts: () => ({ data: [] }),
  useSalaryAccountIds: () => ({ ids: new Set<string>(), isLoading: false, isError: false }),
}));

beforeEach(() => {
  mockAccount = { data: null, isError: false, isFetched: false };
  [mockUpdate, mockCreate, mockRefetch, mockUseUpdate, mockUseCreate, mockUseDelete].forEach((fn) =>
    fn.mockClear(),
  );
});

describe('Add account — an edit whose account could not be read', () => {
  it('says so instead of opening a blank form over the real account', async () => {
    mockAccount = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddAccountScreen />);

    expect(getByText('Could not open this account')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit account')).toBeNull();
    expect(queryByText('Continue')).toBeNull();
    expect(queryByText('Save changes')).toBeNull();

    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('holds the skeleton while the read is still running', async () => {
    const { getByText, queryByText } = await render(<AddAccountScreen />);

    expect(getByText('Edit account')).toBeTruthy();
    expect(queryByText('Could not open this account')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
  });

  it('opens the form as usual once the account is in hand', async () => {
    mockAccount = {
      data: {
        id: 'acct-1',
        bank_name: 'A Bank',
        nickname: 'Everyday',
        account_type: 'checking',
        last4: '1111',
        color: '#000000',
        balance: 900,
        balance_as_of: '2026-09-01',
      },
      isError: false,
      isFetched: true,
    };
    const { getByText, queryByText } = await render(<AddAccountScreen />);

    expect(getByText('Edit account')).toBeTruthy();
    expect(queryByText('Could not open this account')).toBeNull();
    expect(mockUseUpdate).toHaveBeenCalled();
  });

  it('says the account is gone when the read lands empty', async () => {
    mockAccount = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddAccountScreen />);

    expect(getByText('That account is not here')).toBeTruthy();
    expect(queryByText('Edit account')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
  });
});
