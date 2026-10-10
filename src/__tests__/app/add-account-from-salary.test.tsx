import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddAccountScreen from '@/app/add-account';
import { resetLocaleForTests } from '@/i18n/store';

/**
 * The account form opened from the Salary page's Paid into (`from=salary`). That page is setting
 * the pay itself, unsaved, so the form asks nothing about pay and writes no salary and no link: a
 * write here would reload the Salary page under its own edits. Adding another keeps the same mode.
 * Opened from anywhere else, it asks as before.
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

const ACME = { id: 'pay-1', name: 'Acme', amount: 4200, frequency: 'monthly', last_payday: null };

describe('Add account from the Salary page', () => {
  it('asks nothing about pay, and saves the account with no salary and no link', async () => {
    mockParams = { from: 'salary' };
    mockSalaries = [ACME];
    const screen = await toDetails();

    expect(screen.queryByRole('switch', { name: 'Acme lands here' })).toBeNull();
    expect(screen.queryByPlaceholderText('Enter an amount')).toBeNull();
    expect(screen.queryByLabelText('Open calculator')).toBeNull();

    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
    await fireEvent.press(screen.getByText('Continue'));
    expect(screen.queryByText('When was the last pay day?')).toBeNull();
    expect(screen.getByText('Want a nudge when pay lands?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add account'));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreateSalary).not.toHaveBeenCalled();
    expect(mockLink).not.toHaveBeenCalled();
    expect(screen.getByRole('header', { name: 'Account added' })).toBeTruthy();
  });

  it('keeps asking nothing about pay for another account, and goes back to Paid into on Done', async () => {
    mockParams = { from: 'salary' };
    const screen = await toDetails();
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Add account'));

    await fireEvent.press(screen.getByText('Add another account'));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/add-account',
      params: { from: 'salary' },
    });
    await fireEvent.press(screen.getByText('Done'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('still asks about pay when opened from anywhere else', async () => {
    mockSalaries = [ACME];
    const screen = await toDetails();

    expect(screen.getByRole('switch', { name: 'Acme lands here' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter an amount')).toBeTruthy();
  });
});
