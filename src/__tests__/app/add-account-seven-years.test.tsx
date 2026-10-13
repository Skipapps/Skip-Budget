import { fireEvent, render, waitFor } from '@testing-library/react-native';

import AddAccountScreen from '@/app/add-account';

/**
 * A new account's last payday calendar greys out every day before the first kept day (today less
 * seven years, a leap day going back to the 28th, as the database counts) and still takes the first
 * kept day.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
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

const mockCreateSalary = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateBankAccount: () => ({
    mutateAsync: jest.fn(async () => ({ id: 'acct-new' })),
    isPending: false,
  }),
  useUpdateBankAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteBankAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteUnseenPay: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateSalarySource: () => ({ mutateAsync: mockCreateSalary, isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useLinkAccountToSalaries: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => jest.fn(),
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00' }),
}));
jest.mock('@/api/queries', () => ({
  useBankAccount: () => ({ data: null, isError: false, isFetched: true, refetch: jest.fn() }),
  useBankAccounts: () => ({ data: [], isPending: false }),
  useSalaryAccountIds: () => ({
    ids: new Set<string>(),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useSalarySources: () => ({ data: [] }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

/** A balance, a bank and the pay typed in: the page that asks for the last payday. */
async function toPayday(): Promise<Screen> {
  const screen = await render(<AddAccountScreen />);
  await fireEvent.press(screen.getByLabelText('9'));
  await fireEvent.press(screen.getByText('Continue'));
  await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Chase');
  await fireEvent.changeText(screen.getByPlaceholderText('Enter an amount'), '4200');
  await fireEvent.press(screen.getByText('Continue'));
  return screen;
}

async function showMonth(screen: Screen, month: string, yearsBack: number) {
  await fireEvent.press(screen.getByLabelText(/Choose a different month\.$/));
  for (let i = 0; i < yearsBack; i += 1) {
    await fireEvent.press(screen.getByLabelText('Previous year'));
  }
  await fireEvent.press(screen.getByLabelText(month));
}

const blocked = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.disabled);

beforeEach(() => {
  mockCreateSalary.mockReset().mockResolvedValue({ id: 'pay-new' });
});
afterEach(() => jest.useRealTimers());

describe('Add account — the last payday, seven years back', () => {
  it('greys out the day before the first kept day, and saves the first', async () => {
    // Friday 9 October 2026: the first kept day is Wednesday 9 October 2019.
    jest.useFakeTimers({ now: new Date(2026, 9, 9, 9, 0, 0) });
    const screen = await toPayday();
    await showMonth(screen, 'October', 7);

    expect(blocked(screen, 'Tuesday 8 October 2019')).toBe(true);
    expect(blocked(screen, 'Wednesday 9 October 2019')).toBe(false);

    await fireEvent.press(screen.getByLabelText('Wednesday 9 October 2019'));
    await fireEvent.press(screen.getByText('Add account'));

    await waitFor(() => expect(mockCreateSalary).toHaveBeenCalledTimes(1));
    expect(mockCreateSalary).toHaveBeenCalledWith(
      expect.objectContaining({ last_payday: '2019-10-09' }),
    );
  });

  it('takes a leap day back to the 28th, as the database does', async () => {
    // Tuesday 29 February 2028: the first kept day is Sunday 28 February 2021, not 1 March.
    jest.useFakeTimers({ now: new Date(2028, 1, 29, 9, 0, 0) });
    const screen = await toPayday();
    await showMonth(screen, 'February', 7);

    expect(blocked(screen, 'Saturday 27 February 2021')).toBe(true);
    expect(blocked(screen, 'Sunday 28 February 2021')).toBe(false);
  });
});
