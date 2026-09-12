import { render } from '@testing-library/react-native';

import AddCardScreen from '@/app/add-card';

/**
 * What the card editor does when it cannot read the card.
 *
 * Worse here than anywhere else in the family. `id` makes Save an update, and a
 * form with no record also has no due day — so Save wrote a blank holder, a $0
 * balance *and* called `applyReminder('card', id, null, …)`, which deletes the
 * reminder on a card whose only crime was being opened on a bad connection.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
jest.mock('@/components/cards/network-picker', () => ({ NetworkPicker: () => null }));
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
  useLocalSearchParams: () => ({ id: 'card-1' }),
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
  useUpdateCard: () => mockUseUpdate(),
  useCreateCard: () => mockUseCreate(),
  useDeleteCard: () => mockUseDelete(),
}));

// The one that deletes a reminder when it is handed a null due day.
const mockApplyReminder = jest.fn();
const mockUseApplyReminder = jest.fn(() => ({ mutateAsync: mockApplyReminder }));

jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => mockUseApplyReminder(),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

let mockCard: { data: unknown; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useCard: () => ({ ...mockCard, refetch: mockRefetch }),
  useCards: () => ({ data: [] }),
  useSourceLedger: () => ({ ledger: null }),
}));

beforeEach(() => {
  mockCard = { data: null, isError: false, isFetched: false };
  [
    mockUpdate,
    mockCreate,
    mockApplyReminder,
    mockRefetch,
    mockUseUpdate,
    mockUseCreate,
    mockUseDelete,
    mockUseApplyReminder,
  ].forEach((fn) => fn.mockClear());
});

describe('Add card — an edit whose card could not be read', () => {
  it('says so instead of opening a blank form over the real card', async () => {
    mockCard = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddCardScreen />);

    expect(getByText('Could not open this card')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit card')).toBeNull();
    expect(queryByText('Continue')).toBeNull();
    expect(queryByText('Save changes')).toBeNull();

    // Nothing that writes was wired up — including the reminder call that used
    // to arrive with a null due day and wipe the card's reminder.
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
    expect(mockUseApplyReminder).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
  });

  it('holds the skeleton while the read is still running', async () => {
    const { getByText, queryByText } = await render(<AddCardScreen />);

    expect(getByText('Edit card')).toBeTruthy();
    expect(queryByText('Could not open this card')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
  });

  it('opens the form as usual once the card is in hand', async () => {
    mockCard = {
      data: {
        id: 'card-1',
        holder: 'A Person',
        network: 'visa',
        last4: '4242',
        color: '#000000',
        balance: 250,
        balance_as_of: '2026-09-01',
        bill_due_day: 14,
      },
      isError: false,
      isFetched: true,
    };
    const { getByText, queryByText } = await render(<AddCardScreen />);

    expect(getByText('Edit card')).toBeTruthy();
    expect(queryByText('Could not open this card')).toBeNull();
    expect(mockUseUpdate).toHaveBeenCalled();
  });

  it('says the card is gone when the read lands empty', async () => {
    mockCard = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddCardScreen />);

    expect(getByText('That card is not here')).toBeTruthy();
    expect(queryByText('Edit card')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
  });
});
