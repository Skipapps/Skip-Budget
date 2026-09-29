import { fireEvent, render } from '@testing-library/react-native';

import AddAccountScreen from '@/app/add-account';
import { FAILURE_MESSAGE } from '@/lib/failure';

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

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
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
  useLinkAccountToSalaries: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => ({ mutateAsync: jest.fn() }),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

let mockAccount: { data: unknown; isError: boolean; isFetched: boolean };
let mockSalaries: unknown[] = [];
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useBankAccount: () => ({ ...mockAccount, refetch: mockRefetch }),
  useBankAccounts: () => ({ data: [] }),
  useSalaryAccountIds: () => ({ ids: new Set<string>(), isLoading: false, isError: false }),
  useSalarySources: () => ({ data: mockSalaries }),
}));

beforeEach(() => {
  mockParams = { id: 'acct-1' };
  mockSalaries = [];
  mockAccount = { data: null, isError: false, isFetched: false };
  [mockUpdate, mockCreate, mockRefetch, mockUseUpdate, mockUseCreate, mockUseDelete].forEach((fn) =>
    fn.mockClear(),
  );
});

describe('Add account — an edit whose account could not be read', () => {
  it('says so instead of opening a blank form over the real account', async () => {
    mockAccount = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddAccountScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
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
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
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
    // An edit walks the flow from the amount, exactly as adding does.
    expect(getByText('What is in the account today?')).toBeTruthy();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockUseUpdate).toHaveBeenCalled();
  });

  it('says the account is gone when the read lands empty', async () => {
    mockAccount = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddAccountScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(queryByText('Edit account')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
  });
});

/**
 * The walk-in sets pay first, so by the time the bank account is added its
 * payday and cycle are already known. Asking for them again was a second
 * answer nobody could see being used; switching the pay off is the one case
 * where this account needs pay — and a payday — of its own.
 */
describe('Add account — pay set up before the account', () => {
  const toDetails = async () => {
    mockParams = { from: 'setup' };
    mockSalaries = [
      { id: 's-1', name: 'Acme', amount: 4200, frequency: 'monthly', last_payday: '2026-09-01' },
    ];
    const view = await render(<AddAccountScreen />);
    await fireEvent.press(view.getByText('Continue'));
    return view;
  };

  const toLastStep = async (view: Awaited<ReturnType<typeof toDetails>>) => {
    await fireEvent.changeText(view.getAllByDisplayValue('')[0], 'A Bank');
    await fireEvent.press(view.getByText('Continue'));
  };

  it('names the pay on the switch and does not ask for its payday again', async () => {
    const view = await toDetails();

    expect(view.getByText('Acme lands here')).toBeTruthy();
    expect(view.getByText('$4,200.00 monthly · payday already set')).toBeTruthy();
    expect(view.getByRole('switch').props.accessibilityState).toMatchObject({ checked: true });
    expect(view.queryByText('Expected income')).toBeNull();

    await toLastStep(view);

    expect(view.getByText('Want a nudge when pay lands?')).toBeTruthy();
    expect(view.queryByText('When was the last pay day?')).toBeNull();
    expect(view.queryByText('How often are you paid?')).toBeNull();
  });

  it('asks for the income, the payday and how often once the switch is off', async () => {
    const view = await toDetails();

    await fireEvent.press(view.getByRole('switch'));
    expect(view.getByText('Expected income')).toBeTruthy();

    await toLastStep(view);

    expect(view.getByText('When was the last pay day?')).toBeTruthy();
    expect(view.getByText('How often are you paid?')).toBeTruthy();
  });

  it('joins more than one source by name', async () => {
    mockParams = { from: 'setup' };
    mockSalaries = [
      { id: 's-1', name: 'Acme', amount: 4200, frequency: 'monthly', last_payday: null },
      { id: 's-2', name: 'Side gig', amount: 300, frequency: 'weekly', last_payday: null },
    ];
    const view = await render(<AddAccountScreen />);
    await fireEvent.press(view.getByText('Continue'));

    expect(view.getByText('Acme and Side gig land here')).toBeTruthy();
  });
});

/**
 * Income and payday are only asked for while adding an account, where they
 * make a salary source. An edit never saved them, so it does not ask.
 */
it('does not ask for income or a payday when editing an account', async () => {
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
  const view = await render(<AddAccountScreen />);

  await fireEvent.press(view.getByText('Continue'));
  expect(view.queryByText('Expected income')).toBeNull();

  await fireEvent.press(view.getByText('Continue'));
  expect(view.getByText('Want a nudge when pay lands?')).toBeTruthy();
  expect(view.queryByText('How often are you paid?')).toBeNull();
});
