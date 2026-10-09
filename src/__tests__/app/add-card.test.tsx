import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddCardScreen from '@/app/add-card';
import { t } from '@/i18n';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The card editor must not open a blank form when the read fails: with no record there is no due
 * day, so Save would write a blank holder and a $0 balance and call `applyReminder('card', id,
 * null, …)`, which deletes the card's reminder.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
// Reanimated 4 wants a native worklets module; the swatches are the only animated part of the form.
jest.mock('@/components/ui/color-picker', () => ({ ColorPicker: () => null }));
// Reads captions the reminders mock below leaves out; the reminder is not what these tests are about.
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Jest turns an .svg into a number, not a component; the icons have a suite of their own.
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
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

// Only creditLimitValue is real, and it never touches the client.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/mutations', () => ({
  creditLimitValue: jest.requireActual('@/api/mutations').creditLimitValue,
  useUpdateCard: () => mockUseUpdate(),
  useCreateCard: () => mockUseCreate(),
  useDeleteCard: () => mockUseDelete(),
}));

// Deletes the reminder when handed a null due day.
const mockApplyReminder = jest.fn();
const mockUseApplyReminder = jest.fn(() => mockApplyReminder);

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
  mockParams = { id: 'card-1' };
  mockCard = { data: null, isError: false, isFetched: false };
  mockCreate.mockResolvedValue({ id: 'card-new' });
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
  jest.mocked(router.back).mockClear();
});

describe('Add card — an edit whose card could not be read', () => {
  it('says so instead of opening a blank form over the real card', async () => {
    mockCard = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddCardScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit credit card')).toBeNull();
    expect(queryByText('Continue')).toBeNull();
    expect(queryByText('Save changes')).toBeNull();

    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
    expect(mockUseApplyReminder).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
  });

  it('holds the skeleton while the read is still running', async () => {
    const { getByText, queryByText } = await render(<AddCardScreen />);

    expect(getByText('Edit credit card')).toBeTruthy();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
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

    expect(getByText('Edit credit card')).toBeTruthy();
    expect(getByText('What is the credit card balance right now?')).toBeTruthy();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockUseUpdate).toHaveBeenCalled();
  });

  it('says the card is gone when the read lands empty', async () => {
    mockCard = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddCardScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(queryByText('Edit credit card')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
  });
});

/**
 * A stated balance is true from the day it was stated, and the card's charges are counted from that
 * day on. Saving an edit that leaves the balance alone must not move that day, or every charge
 * since would drop out of the card; a changed balance, or a new one, starts from today.
 */
describe('Add card — the day the balance is true from', () => {
  const KEYS: Record<string, string> = {
    '.': t('loan.keypad.decimal'),
    '<': t('loan.keypad.deleteLast'),
  };

  /** Keypad presses as a string: digits, "." for the decimal key, "<" for delete. */
  const press = async (view: Awaited<ReturnType<typeof render>>, keys: string) => {
    for (const key of keys) await fireEvent.press(view.getByLabelText(KEYS[key] ?? key));
  };

  const savedCard = (overrides: Record<string, unknown> = {}) => ({
    id: 'card-1',
    holder: 'A Person',
    network: 'visa',
    last4: '4242',
    color: '#000000',
    balance: 250,
    balance_as_of: '2026-09-01',
    bill_due_day: 14,
    ...overrides,
  });

  const editCard = async (card: object, keys = '') => {
    mockCard = { data: card, isError: false, isFetched: true };
    const view = await render(<AddCardScreen />);
    await press(view, keys);
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.press(view.getByText('Save changes'));
    return view;
  };

  /** A new card: the balance keys, a name on the second page, then Save. */
  const addCard = async (keys = '') => {
    mockParams = {};
    const view = await render(<AddCardScreen />);
    await press(view, keys);
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.changeText(view.getAllByDisplayValue('')[0], 'Everyday Visa');
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.press(view.getByText('Add card'));
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
    ['a balance and its day', 250, '2026-09-01'],
    ['a balance with cents', 1234.56, '2026-08-15'],
    ['a balance that was never dated', 250, null],
    ['a balance whose day was never read', 250, undefined],
    ['no balance and no day', 0, null],
    ['a stated zero and its day', 0, '2026-09-01'],
  ])('keeps %s when the edit leaves the balance alone', async (_name, balance, day) => {
    await editCard(savedCard({ balance, balance_as_of: day }));

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({ balance, balance_as_of: day ?? null }),
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('keeps the day when the card is edited somewhere other than the balance', async () => {
    mockCard = { data: savedCard(), isError: false, isFetched: true };
    const view = await render(<AddCardScreen />);
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.changeText(view.getByDisplayValue('A Person'), 'Renamed Visa');
    await fireEvent.press(view.getByText('Continue'));
    await fireEvent.press(view.getByText('Save changes'));

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({
        holder: 'Renamed Visa',
        balance: 250,
        balance_as_of: '2026-09-01',
      }),
    );
  });

  it('keeps the day when the balance is typed away and back to what it was', async () => {
    await editCard(savedCard(), '<<<250');

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({ balance: 250, balance_as_of: '2026-09-01' }),
    );
  });

  it.each([
    ['a digit more', '1', 2501],
    ['the cents', '.5', 250.5],
    ['the last digit gone', '<', 25],
    ['a different figure', '<<<1.99', 1.99],
  ])('stamps today when %s changes the balance', async (_name, keys, balance) => {
    await editCard(savedCard(), keys);

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({ balance, balance_as_of: '2026-10-08' }),
    );
  });

  it('stamps today on a balance that had no day', async () => {
    await editCard(savedCard({ balance: 0, balance_as_of: null }), '<75');

    expect(writtenOnEdit()).toEqual(
      expect.objectContaining({ balance: 75, balance_as_of: '2026-10-08' }),
    );
  });

  it('writes no day when the edit clears the balance', async () => {
    await editCard(savedCard(), '<<<');

    expect(writtenOnEdit()).toEqual(expect.objectContaining({ balance: 0, balance_as_of: null }));
  });

  it('stamps today on a new card with a balance', async () => {
    await addCard('1234.56');

    expect(writtenOnCreate()).toEqual(
      expect.objectContaining({
        holder: 'Everyday Visa',
        balance: 1234.56,
        balance_as_of: '2026-10-08',
      }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('stamps today on a new card whose balance is a stated zero', async () => {
    await addCard('0');

    expect(writtenOnCreate()).toEqual(
      expect.objectContaining({ balance: 0, balance_as_of: '2026-10-08' }),
    );
  });

  it('writes no day for a new card with the balance left blank', async () => {
    await addCard();

    expect(writtenOnCreate()).toEqual(expect.objectContaining({ balance: 0, balance_as_of: null }));
  });
});
