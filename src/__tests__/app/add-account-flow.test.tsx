import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddAccountScreen from '@/app/add-account';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The add-account flow in the card flow's language: the live face and fields, the payday and the
 * same reminder card, and on a new account the page that says it was added. Dates are worked from
 * 9 October 2026.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
// The last payday picked is the 1st of October, a Thursday.
jest.mock('@/components/flow/inline-calendar', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    InlineCalendar: ({ onChange }: { onChange: (date: Date) => void }) => (
      <Pressable testID="calendar" onPress={() => onChange(new Date(2026, 9, 1))} />
    ),
  };
});

// Hands back what the calculator works out, unrounded, as the real one does.
let mockWorkedOut = '';
jest.mock('@/components/ui/calculator-pad', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    CalculatorPad: ({ onConfirm }: { onConfirm: (value: string) => void }) => (
      <Pressable testID="calculator-done" onPress={() => onConfirm(mockWorkedOut)} />
    ),
  };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#111111',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FBF9F7',
    control: '#905479',
    accentInk: '#905479',
    danger: '#B0453A',
  }),
  useTheme: () => ({ scheme: 'light' }),
  useMoneyColor: () => () => '#111111',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Jest turns an .svg into a number, not a component; the icons have a suite of their own.
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: () => null,
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockCreateSalary = jest.fn();
const mockLink = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateBankAccount: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateBankAccount: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteBankAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateSalarySource: () => ({ mutateAsync: mockCreateSalary, isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useLinkAccountToSalaries: () => ({ mutateAsync: mockLink, isPending: false }),
}));

// The reminder choices are real; the client behind them is never called.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockApplyReminder = jest.fn();
let mockSaved = { choice: 'off', remindAt: '09:00' };
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
  useReminderChoice: () => mockSaved,
}));

let mockAccount: { data: unknown; isError: boolean; isFetched: boolean };
let mockSalaries: unknown[] = [];
let mockPaidInto = new Set<string>();
jest.mock('@/api/queries', () => ({
  useBankAccount: () => ({ ...mockAccount, refetch: jest.fn() }),
  useBankAccounts: () => ({ data: [], isPending: false }),
  useSalaryAccountIds: () => ({
    ids: mockPaidInto,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useSalarySources: () => ({ data: mockSalaries }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

async function toDetails(): Promise<Screen> {
  const screen = await render(<AddAccountScreen />);
  await fireEvent.press(screen.getByLabelText('9'));
  await fireEvent.press(screen.getByLabelText('0'));
  await fireEvent.press(screen.getByLabelText('0'));
  await fireEvent.press(screen.getByText('Continue'));
  return screen;
}

beforeEach(() => {
  resetLocaleForTests();
  jest.useFakeTimers({ now: new Date(2026, 9, 9, 9, 0, 0) });
  mockParams = {};
  mockAccount = { data: null, isError: false, isFetched: true };
  mockSaved = { choice: 'off', remindAt: '09:00' };
  mockSalaries = [];
  mockPaidInto = new Set();
  mockCreate.mockReset().mockResolvedValue({ id: 'acct-new' });
  mockCreateSalary.mockReset().mockResolvedValue({ id: 'pay-new' });
  [mockUpdate, mockLink, mockApplyReminder, mockToast].forEach((fn) => fn.mockClear());
  [router.back, router.replace].forEach((fn) => jest.mocked(fn).mockClear());
});
afterEach(() => jest.useRealTimers());
afterAll(() => resetLocaleForTests());

describe('Add account — the details', () => {
  it('draws the live face and the fields, the income typed in place', async () => {
    const screen = await toDetails();

    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('$900')).toBeTruthy();
    for (const label of ['Bank name', 'Account type', 'Last 4 digits', 'Card colour']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('radio', { name: 'Checking' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Savings' })).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('Enter an amount'), '4200');
    expect(screen.getByDisplayValue('4,200')).toBeTruthy();
    expect(screen.getByLabelText('Open calculator')).toBeTruthy();
  });
});

describe('Add account — the income from the calculator', () => {
  it.each([
    [String(3700 / 3), '1,233.33', 1233.33],
    [String(0.1 + 0.2), '0.3', 0.3],
  ])('rounds %s to the cent in the field and in what is saved', async (worked, shown, saved) => {
    mockWorkedOut = worked;
    const screen = await toDetails();
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
    await fireEvent.press(screen.getByLabelText('Open calculator'));
    await fireEvent.press(screen.getByTestId('calculator-done'));

    expect(screen.getByDisplayValue(shown)).toBeTruthy();
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Add account'));
    expect(mockCreateSalary).toHaveBeenCalledWith(expect.objectContaining({ amount: saved }));
  });

  it('leaves the field empty when the calculator comes to nothing or less', async () => {
    mockWorkedOut = String(20 - 60);
    const screen = await toDetails();
    await fireEvent.press(screen.getByLabelText('Open calculator'));
    await fireEvent.press(screen.getByTestId('calculator-done'));

    expect(screen.getByPlaceholderText('Enter an amount').props.value).toBe('');
  });
});

describe('Add account — pay and the reminder', () => {
  async function toPay(income = '4200'): Promise<Screen> {
    const screen = await toDetails();
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
    if (income) {
      await fireEvent.changeText(screen.getByPlaceholderText('Enter an amount'), income);
    }
    await fireEvent.press(screen.getByText('Continue'));
    return screen;
  }

  it('asks for the last payday, and dates the reminder from the next one', async () => {
    const screen = await toPay();
    expect(screen.getByText('When was the last pay day?')).toBeTruthy();
    expect(screen.getByText('Pick the last payday and how often you’re paid.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('calendar'));
    expect(screen.getByText('Next payday: 1 Nov 2026')).toBeTruthy();
    expect(screen.getByText('29 Oct, 3 days before your pay lands')).toBeTruthy();

    await fireEvent.press(screen.getByText('Add account'));
    expect(mockApplyReminder).toHaveBeenCalledWith('account', 'acct-new', 3, '09:00');
    expect(mockCreateSalary).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4200, frequency: 'monthly', last_payday: '2026-10-01' }),
    );
  });

  it('says it was added, with the type, the next payday and the reminder', async () => {
    const screen = await toPay();
    await fireEvent.press(screen.getByTestId('calendar'));
    await fireEvent.press(screen.getByText('Add account'));

    expect(screen.getByRole('header', { name: 'Account added' })).toBeTruthy();
    expect(screen.getByText('We’ll remind you 3 days before your pay lands.')).toBeTruthy();
    // The face's badge and the Type row.
    expect(screen.getAllByText('Checking')).toHaveLength(2);
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('1 Nov 2026')).toBeTruthy();
    expect(screen.getByText('29 Oct · 3 days before')).toBeTruthy();
    expect(screen.getByText('Updated today')).toBeTruthy();
    expect(mockToast).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Add another account'));
    expect(router.replace).toHaveBeenCalledWith('/add-account');
    await fireEvent.press(screen.getByText('Done'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('starts a new account’s reminder on, and saves none once it is switched off', async () => {
    const screen = await toPay();
    await fireEvent.press(screen.getByTestId('calendar'));
    expect(screen.getByText('29 Oct, 3 days before your pay lands')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Remind me'));
    expect(screen.getByText('Get a nudge before your pay lands')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add account'));

    expect(mockApplyReminder).toHaveBeenCalledWith('account', 'acct-new', null, '09:00');
    expect(screen.getByText('No reminder set. You can add one anytime.')).toBeTruthy();
  });

  it('cannot remind without pay coming in, and says no reminder was set', async () => {
    const screen = await toPay('');
    expect(
      screen.getByText(
        'Add the income paid into this account and Skip can tell you when it lands.',
      ),
    ).toBeTruthy();
    // Nothing paid in, so it stays off and cannot be turned on.
    expect(screen.getByLabelText('Remind me').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true, checked: false }),
    );
    await fireEvent.press(screen.getByText('Add account'));

    expect(mockApplyReminder).toHaveBeenCalledWith('account', 'acct-new', null, '09:00');
    expect(screen.getByText('No reminder set. You can add one anytime.')).toBeTruthy();
    expect(screen.queryByText('Next payday')).toBeNull();
    expect(screen.queryByText('Reminder')).toBeNull();
  });

  it('describes the reminder by its lead alone for pay already set up', async () => {
    mockSalaries = [
      { id: 'pay-1', name: 'Acme', amount: 4200, frequency: 'monthly', last_payday: null },
    ];
    const screen = await toDetails();
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
    await fireEvent.press(screen.getByRole('switch', { name: 'Acme lands here' }));
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Want a nudge when pay lands?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('1 week'));
    expect(screen.getByText('1 week before your pay lands')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add account'));

    expect(mockLink).toHaveBeenCalledWith('acct-new');
    expect(screen.getByText('We’ll remind you 1 week before your pay lands.')).toBeTruthy();
    expect(screen.getByText('1 week')).toBeTruthy();
  });

  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<AddAccountScreen />);
    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Banco Azul');
    await fireEvent.changeText(screen.getByPlaceholderText('Ingresa un importe'), '1000');
    await fireEvent.press(screen.getByText('Continuar'));
    await fireEvent.press(screen.getByTestId('calendar'));
    expect(screen.getByText('29 oct, 3 días antes de que llegue tu salario')).toBeTruthy();
    await fireEvent.press(screen.getByText('Agregar cuenta'));

    expect(screen.getByText('Cuenta agregada')).toBeTruthy();
    expect(
      screen.getByText('Te lo recordaremos 3 días antes de que llegue tu salario.'),
    ).toBeTruthy();
    expect(screen.getByText('Agregar otra cuenta')).toBeTruthy();
  });
});

describe('Add account — editing and the walk-in', () => {
  it('saves an edit in place with a toast, keeping the reminder’s time', async () => {
    mockParams = { id: 'acct-1' };
    mockPaidInto = new Set(['acct-1']);
    mockSaved = { choice: '0', remindAt: '07:15' };
    mockAccount = {
      data: {
        id: 'acct-1',
        bank_name: 'Chase',
        nickname: null,
        account_type: 'savings',
        last4: '7010',
        color: '#6A5FC9',
        balance: 900,
        balance_as_of: '2026-10-01',
      },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddAccountScreen />);
    await fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByRole('radio', { name: 'Savings' }).props.accessibilityState.selected).toBe(
      true,
    );
    await fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('On the day your pay lands')).toBeTruthy();
    await fireEvent.press(screen.getByText('Save changes'));

    expect(mockApplyReminder).toHaveBeenCalledWith('account', 'acct-1', 0, '07:15');
    expect(mockToast).toHaveBeenCalledWith('toast.account.updated');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Account added')).toBeNull();
  });

  it('goes back to the walk-in with a toast, as before', async () => {
    mockParams = { from: 'setup' };
    const screen = await toDetails();
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Add account'));

    expect(mockToast).toHaveBeenCalledWith('toast.account.added');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Account added')).toBeNull();
  });
});
