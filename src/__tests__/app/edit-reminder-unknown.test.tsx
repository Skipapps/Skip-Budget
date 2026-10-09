import { fireEvent, render } from '@testing-library/react-native';

import AddCardScreen from '@/app/add-card';
import { resetLocaleForTests } from '@/i18n/store';

/**
 * Editing a card while its saved reminder is not known (the reminders read is loading or failed):
 * the form shows 'off' as a guess, and Save must leave the reminder alone rather than write that
 * guess, which would delete it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
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
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'card-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: () => null,
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  creditLimitValue: jest.requireActual('@/api/mutations').creditLimitValue,
  useCreateCard: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateCard: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteCard: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockApplyReminder = jest.fn();
let mockSaved: { choice: string; remindAt: string; unknown: boolean };
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
  useReminderChoice: () => mockSaved,
}));

jest.mock('@/api/queries', () => ({
  useCard: () => ({
    data: {
      id: 'card-1',
      holder: 'Amex Komal',
      network: 'Amex',
      last4: '6334',
      color: '#426EA8',
      balance: 4000,
      balance_as_of: '2026-10-01',
      bill_due_day: 22,
      credit_limit: 10000,
    },
    isError: false,
    isFetched: true,
    refetch: jest.fn(),
  }),
  useCards: () => ({ data: [], isPending: false }),
  useSourceLedger: () => ({ ledger: null }),
}));

async function saveEdit() {
  const screen = await render(<AddCardScreen />);
  await fireEvent.press(screen.getByText('Continue'));
  await fireEvent.press(screen.getByText('Continue'));
  await fireEvent.press(screen.getByText('Save changes'));
  return screen;
}

beforeEach(() => {
  resetLocaleForTests();
  jest.useFakeTimers({ now: new Date(2026, 9, 9, 9, 0, 0) });
  mockUpdate.mockReset().mockResolvedValue({ id: 'card-1' });
  mockApplyReminder.mockReset();
  mockToast.mockReset();
});
afterEach(() => jest.useRealTimers());
afterAll(() => resetLocaleForTests());

describe('Edit card while the saved reminder is unknown', () => {
  it('saves the card and leaves the reminder alone', async () => {
    mockSaved = { choice: 'off', remindAt: '09:00', unknown: true };
    await saveEdit();

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('toast.card.updated');
  });

  it('writes the reminder as before once it is known', async () => {
    mockSaved = { choice: 'off', remindAt: '09:00', unknown: false };
    await saveEdit();

    expect(mockApplyReminder).toHaveBeenCalledWith('card', 'card-1', null, '09:00');
  });
});
