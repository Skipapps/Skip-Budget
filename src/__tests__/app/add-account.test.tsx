import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddAccountScreen from '@/app/add-account';
import { t } from '@/i18n';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The account editor must not open a blank form over a real account when the read fails: `id`
 * turns Save into an update, and the field it would blank is the balance every home figure is
 * walked forward from.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));
// Reanimated 4 wants a native worklets module; the swatches are the only animated part of the form.
jest.mock('@/components/ui/color-picker', () => ({ ColorPicker: () => null }));
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

const mockApplyReminder = jest.fn();
jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => mockApplyReminder,
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
  mockCreate.mockResolvedValue({ id: 'acct-new' });
  [
    mockUpdate,
    mockCreate,
    mockRefetch,
    mockApplyReminder,
    mockUseUpdate,
    mockUseCreate,
    mockUseDelete,
  ].forEach((fn) => fn.mockClear());
  jest.mocked(router.back).mockClear();
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
 * The walk-in sets pay first, so the bank account does not ask for payday and cycle again;
 * switching the pay off is the one case where it needs its own.
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

/** Income and payday are asked only while adding (they make a salary source), not on edit. */
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

/**
 * A stated balance is true from the day it was stated, and the account's money moves are counted
 * from that day on. Saving an edit that leaves the balance alone must not move that day, or every
 * charge and pay since would drop out of the account; a changed balance, or a new one, starts from
 * today.
 */
describe('Add account — the day the balance is true from', () => {
  const KEYS: Record<string, string> = {
    '.': t('loan.keypad.decimal'),
    '<': t('loan.keypad.deleteLast'),
  };

  /** Keypad presses as a string: digits, "." for the decimal key, "<" for delete. */
  const press = async (view: Awaited<ReturnType<typeof render>>, keys: string) => {
    for (const key of keys) await fireEvent.press(view.getByLabelText(KEYS[key] ?? key));
  };

  const savedAccount = (overrides: Record<string, unknown> = {}) => ({
    id: 'acct-1',
    bank_name: 'A Bank',
    nickname: 'Everyday',
    account_type: 'checking',
    last4: '1111',
    color: '#000000',
    balance: 900,
    balance_as_of: '2026-09-01',
    ...overrides,
  });

  const editAccount = async (account: object, keys = '') => {
    mockAccount = { data: account, isError: false, isFetched: true };
    const view = await render(<AddAccountScreen />);
    await press(view, keys);
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.press(view.getByText('Save changes'));
    return view;
  };

  /** A new account: the balance keys, a bank name on the second page, then Save. */
  const addAccount = async (keys = '') => {
    mockParams = {};
    const view = await render(<AddAccountScreen />);
    await press(view, keys);
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.changeText(view.getAllByDisplayValue('')[0], 'A Bank');
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.press(view.getByText('Save account'));
    return view;
  };

  const writtenOnEdit = () => {
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    return mockUpdate.mock.calls[0][0].values;
  };

  const writtenOnCreate = () => {
    expect(mockCreate).toHaveBeenCalledTimes(1);
    return mockCreate.mock.calls[0][0];
  };

  // 8 October 2026, local time; the form stamps the day it is saved on.
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 9, 8, 9, 0, 0) }));
  afterEach(() => jest.useRealTimers());

  it.each([
    ['a balance and its day', 900, '2026-09-01'],
    ['a balance with cents', 1234.56, '2026-08-15'],
    ['a balance that was never dated', 900, null],
    ['a balance whose day was never read', 900, undefined],
    ['no balance and no day', 0, null],
    ['a stated zero and its day', 0, '2026-09-01'],
  ])('keeps %s when the edit leaves the balance alone', async (_name, balance, day) => {
    await editAccount(savedAccount({ balance, balance_as_of: day }));

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({ balance, balance_as_of: day ?? null }),
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('keeps the day when the account is edited somewhere other than the balance', async () => {
    mockAccount = { data: savedAccount(), isError: false, isFetched: true };
    const view = await render(<AddAccountScreen />);
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.changeText(view.getByDisplayValue('A Bank'), 'Another Bank');
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.press(view.getByText('Save changes'));

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({
        bank_name: 'Another Bank',
        balance: 900,
        balance_as_of: '2026-09-01',
      }),
    );
  });

  it('keeps the day when the balance is typed away and back to what it was', async () => {
    await editAccount(savedAccount(), '<<<900');

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({ balance: 900, balance_as_of: '2026-09-01' }),
    );
  });

  it.each([
    ['a digit more', '1', 9001],
    ['the cents', '.5', 900.5],
    ['the last digit gone', '<', 90],
    ['a different figure', '<<<1.99', 1.99],
  ])('stamps today when %s changes the balance', async (_name, keys, balance) => {
    await editAccount(savedAccount(), keys);

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({ balance, balance_as_of: '2026-10-08' }),
    );
  });

  it('stamps today on a balance that had no day', async () => {
    await editAccount(savedAccount({ balance: 0, balance_as_of: null }), '<75');

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({ balance: 75, balance_as_of: '2026-10-08' }),
    );
  });

  it('writes no day when the edit clears the balance', async () => {
    await editAccount(savedAccount(), '<<<');

    expect(writtenOnEdit()).toEqual(expect.objectContaining({ balance: 0, balance_as_of: null }));
  });

  it('stamps today on a new account with a balance', async () => {
    await addAccount('1234.56');

    expect(writtenOnCreate()).toEqual(
      expect.objectContaining({
        bank_name: 'A Bank',
        balance: 1234.56,
        balance_as_of: '2026-10-08',
      }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('stamps today on a new account whose balance is a stated zero', async () => {
    await addAccount('0');

    expect(writtenOnCreate()).toEqual(
      expect.objectContaining({ balance: 0, balance_as_of: '2026-10-08' }),
    );
  });

  it('writes no day for a new account with the balance left blank', async () => {
    await addAccount();

    expect(writtenOnCreate()).toEqual(expect.objectContaining({ balance: 0, balance_as_of: null }));
  });
});
