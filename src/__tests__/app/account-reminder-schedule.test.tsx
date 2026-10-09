import { fireEvent, render } from '@testing-library/react-native';

import AddAccountScreen from '@/app/add-account';
import { resetLocaleForTests } from '@/i18n/store';

/**
 * The account form promises the dates the reminder scheduler keeps (src/lib/payday.ts): today's
 * payday is today's, and a week's lead on weekly pay, which the scheduler never sends because that
 * day is itself a payday, is not offered. The last payday picked is Thursday 1 October 2026.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/flow/inline-calendar', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    InlineCalendar: ({ onChange }: { onChange: (date: Date) => void }) => (
      <Pressable testID="calendar" onPress={() => onChange(new Date(2026, 9, 1))} />
    ),
  };
});
jest.mock('@/components/ui/calculator-pad', () => ({ CalculatorPad: () => null }));
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
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));
jest.mock('@/providers/toast-context', () => ({ useToast: () => jest.fn() }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: () => null,
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockApplyReminder = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateBankAccount: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'acct-new' }),
    isPending: false,
  }),
  useUpdateBankAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteBankAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateSalarySource: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: 'pay-new' }),
    isPending: false,
  }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useLinkAccountToSalaries: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00', unknown: false }),
}));

let mockSalaries: unknown[] = [];
jest.mock('@/api/queries', () => ({
  useBankAccount: () => ({ data: null, isError: false, isFetched: true, refetch: jest.fn() }),
  useBankAccounts: () => ({ data: [], isPending: false }),
  useSalaryAccountIds: () => ({
    ids: new Set<string>(),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useSalarySources: () => ({ data: mockSalaries }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

/** A new account with pay typed here, paid on the 1st, then the pay step. */
async function toPay(): Promise<Screen> {
  const screen = await render(<AddAccountScreen />);
  for (const key of ['9', '0', '0']) await fireEvent.press(screen.getByLabelText(key));
  await fireEvent.press(screen.getByText('Continue'));
  await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
  await fireEvent.changeText(screen.getByPlaceholderText('Enter an amount'), '900');
  await fireEvent.press(screen.getByText('Continue'));
  await fireEvent.press(screen.getByTestId('calendar'));
  return screen;
}

beforeEach(() => {
  resetLocaleForTests();
  jest.useFakeTimers({ now: new Date(2026, 9, 9, 9, 0, 0) });
  mockSalaries = [];
  mockApplyReminder.mockClear();
});
afterEach(() => jest.useRealTimers());
afterAll(() => resetLocaleForTests());

describe('Add account — the pay reminder follows the scheduler', () => {
  it('does not offer a week ahead of weekly pay, and dates the rest as the scheduler sends them', async () => {
    const screen = await toPay();
    await fireEvent.press(screen.getByLabelText('Weekly'));

    expect(screen.queryByLabelText('1 week')).toBeNull();
    // Paid Thursdays: the next is the 15th, so three days before is the 12th.
    expect(screen.getByText('Next payday: 15 Oct 2026')).toBeTruthy();
    expect(screen.getByText('12 Oct, 3 days before your pay lands')).toBeTruthy();

    await fireEvent.press(screen.getByText('Add account'));
    expect(mockApplyReminder).toHaveBeenCalledWith('account', 'acct-new', 3, '09:00');
  });

  it('moves a week chosen for monthly pay to three days when the pay turns weekly', async () => {
    const screen = await toPay();
    await fireEvent.press(screen.getByLabelText('1 week'));
    expect(screen.getByText('25 Oct, 1 week before your pay lands')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Weekly'));
    expect(screen.queryByLabelText('1 week')).toBeNull();
    await fireEvent.press(screen.getByText('Add account'));
    expect(mockApplyReminder).toHaveBeenCalledWith('account', 'acct-new', 3, '09:00');
  });

  it('counts a payday that is today, as the scheduler does', async () => {
    jest.setSystemTime(new Date(2026, 9, 8, 9, 0, 0));
    const screen = await toPay();
    await fireEvent.press(screen.getByLabelText('Weekly'));
    await fireEvent.press(screen.getByLabelText('On the day'));

    expect(screen.getByText('Next payday: 8 Oct 2026')).toBeTruthy();
  });

  it('does not offer a week ahead of weekly pay already set up', async () => {
    mockSalaries = [
      { id: 'pay-1', name: 'Acme', amount: 900, frequency: 'weekly', last_payday: '2026-10-01' },
    ];
    const screen = await render(<AddAccountScreen />);
    for (const key of ['9', '0', '0']) await fireEvent.press(screen.getByLabelText(key));
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
    await fireEvent.press(screen.getByRole('switch', { name: 'Acme lands here' }));
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByLabelText('3 days')).toBeTruthy();
    expect(screen.queryByLabelText('1 week')).toBeNull();
  });
});
