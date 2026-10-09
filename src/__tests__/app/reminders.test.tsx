import { fireEvent, render } from '@testing-library/react-native';

import RemindersScreen from '@/app/reminders';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The daily receipts reminder (off until asked for, default 8:00 pm, so the "Nothing to remind you
 * about" empty state is gone), and what the page does when a read fails: a switch drawn off over a
 * read that never landed is a false statement, so every read failure shows an error with a retry
 * instead of switches that all look off.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// `Screen` imports the keyboard controller, which wants its native module even on a page that does
// not avoid the keyboard. The package ships its own mock.
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    control: '#0000FF',
    onControl: '#FFFFFF',
    surface: '#FFFFFF',
  }),
}));

jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), toggle: jest.fn() }));

// The error state draws an SVG illustration per theme.
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

// Reanimated 4 pulls react-native-worklets (a native module); only the loading skeleton uses it.
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

// Nothing on this page is remindable, so the receipts section has to stand on its own.
//
// `mockFailed` is a query name rather than a flag: any one of the page's seven reads failing makes
// every switch on it a guess.
let mockFailed: string | null = null;
const mockRefetched: string[] = [];

const mockQuery = (name: string, data: unknown[]) => ({
  data: mockFailed === name ? undefined : data,
  isLoading: false,
  isPending: false,
  isError: mockFailed === name,
  refetch: () => mockRefetched.push(name),
});

jest.mock('@/api/queries', () => ({
  useBills: () => mockQuery('bills', []),
  useSubscriptions: () => mockQuery('subscriptions', []),
  useCards: () => mockQuery('cards', []),
  useBankAccounts: () => mockQuery('accounts', []),
  useSalaryAccountIds: () => ({
    ids: new Set<string>(),
    isLoading: false,
    isError: mockFailed === 'salary',
    refetch: () => mockRefetched.push('salary'),
  }),
}));

const mockSetReceiptReminder = jest.fn();
let mockReceiptReminder = { enabled: false, remindAt: '20:00' };

// Mocked whole: the real module pulls in supabase, AsyncStorage's native module and
// expo-notifications. The constants are copied from it.
jest.mock('@/api/reminders', () => ({
  DEFAULT_LEAD_DAYS: 1,
  DEFAULT_REMIND_AT: '09:00',
  DEFAULT_RECEIPT_REMIND_AT: '20:00',
  LEAD_OPTIONS: [
    { value: 0, label: 'On the day' },
    { value: 1, label: '1 day' },
    { value: 3, label: '3 days' },
  ],
  REMINDER_CAPTION: {
    bill: '',
    subscription: '',
    card: '',
    account: '',
  },
  reminderKey: () => '',
  targetKey: (kind: string, id: string) => `${kind}:${id}`,
  useReminders: () => ({
    data: mockFailed === 'reminders' ? undefined : [],
    isPending: false,
    isError: mockFailed === 'reminders',
    refetch: () => mockRefetched.push('reminders'),
  }),
  useSetReminder: () => ({ mutate: jest.fn() }),
  useRemoveReminder: () => ({ mutate: jest.fn() }),
  useReceiptReminder: () => ({
    ...mockReceiptReminder,
    isLoading: false,
    isError: mockFailed === 'receipts',
    refetch: () => mockRefetched.push('receipts'),
  }),
  useSetReceiptReminder: () => ({ mutate: mockSetReceiptReminder }),
}));

beforeEach(() => {
  mockSetReceiptReminder.mockClear();
  mockReceiptReminder = { enabled: false, remindAt: '20:00' };
  mockFailed = null;
  mockRefetched.length = 0;
});

describe('Reminders — daily receipts reminder', () => {
  it('is off on a fresh account, and says so in the count', async () => {
    const { getByText, getByRole } = await render(<RemindersScreen />);

    expect(getByText('Daily receipts reminder')).toBeTruthy();
    expect(getByText('A nudge to log what you bought today.')).toBeTruthy();

    // The switch is a press target wrapping the platform switch: state is on accessibilityState.
    expect(getByRole('switch').props.accessibilityState).toMatchObject({ checked: false });

    // The receipts reminder counts even when nothing else is remindable: "0 of 1", not "0 of 0".
    expect(getByText(/0 of 1 will let you know\./)).toBeTruthy();
  });

  it('drops the "nothing to remind you about" empty state', async () => {
    const { queryByText } = await render(<RemindersScreen />);
    expect(queryByText('Nothing to remind you about')).toBeNull();
  });

  it('asks for the reminder when the switch goes on', async () => {
    const { getByRole } = await render(<RemindersScreen />);

    await fireEvent.press(getByRole('switch'));

    expect(mockSetReceiptReminder).toHaveBeenCalledTimes(1);
    // No time sent: turning it on must not overwrite an hour already chosen.
    // The second argument carries the toast that says it worked.
    expect(mockSetReceiptReminder).toHaveBeenCalledWith(
      { enabled: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows the default 8:00 pm before a time has ever been stored', async () => {
    mockReceiptReminder = { enabled: true, remindAt: '20:00' };
    const { getByText, getByLabelText } = await render(<RemindersScreen />);

    // `formatClock` prints an uppercase meridiem, so every reminder reads "8:00 PM".
    expect(getByText('8:00 PM')).toBeTruthy();
    expect(
      getByLabelText('Sent at 8:00 PM. Change the time for the daily receipts reminder.'),
    ).toBeTruthy();
  });

  it('counts the receipts reminder in the "on" figure once it is on', async () => {
    mockReceiptReminder = { enabled: true, remindAt: '20:00' };
    const { getByText } = await render(<RemindersScreen />);
    expect(getByText(/1 of 1 will let you know\./)).toBeTruthy();
  });
});

describe('Reminders — a read that did not land', () => {
  // One case per read: the settings read decides what a switch says, the list reads decide whether
  // a row exists at all. The receipts read is the exception and has its own describe below.
  it.each([
    ['reminders', 'the saved reminders'],
    ['bills', 'the bills'],
    ['subscriptions', 'the subscriptions'],
    ['cards', 'the cards'],
    ['accounts', 'the accounts'],
    ['salary', 'what pay lands where'],
  ])('says so instead of drawing switches when %s fails', async (failed) => {
    mockFailed = failed;
    const { getByText, queryByRole, queryByText } = await render(<RemindersScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    // Neither a switch sitting off nor a count of the settings behind it.
    expect(queryByRole('switch')).toBeNull();
    expect(queryByText(/will let you know\./)).toBeNull();
  });

  it('re-reads every source from the retry, not just the one that failed', async () => {
    mockFailed = 'reminders';
    const { getByText } = await render(<RemindersScreen />);

    await fireEvent.press(getByText('Try again'));

    expect(mockRefetched.sort()).toEqual([
      'accounts',
      'bills',
      'cards',
      'receipts',
      'reminders',
      'salary',
      'subscriptions',
    ]);
  });
});

/**
 * The receipts reminder is read from one profile column, which fails alone on a database where its
 * migration has not run. It is the only read that must not take the page with it: the other
 * reminders come from other tables.
 */
describe('Reminders — the receipts read alone', () => {
  beforeEach(() => {
    mockFailed = 'receipts';
  });

  it('keeps the page, and puts the failure in its own section', async () => {
    const { getAllByText, getByText, queryByRole } = await render(<RemindersScreen />);

    expect(getByText('Daily receipts reminder')).toBeTruthy();
    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    // Not the page-level error, and not a switch drawn off over a read that never landed.
    expect(getAllByText(FAILURE_MESSAGE)).toHaveLength(1);
    expect(queryByRole('switch')).toBeNull();
  });

  it('retries the receipts read by itself', async () => {
    const { getByText } = await render(<RemindersScreen />);

    await fireEvent.press(getByText('Try again'));

    expect(mockRefetched).toEqual(['receipts']);
  });

  it('leaves itself out of the count rather than guessing at it', async () => {
    const { getByText } = await render(<RemindersScreen />);

    // Nothing else is remindable, so with the receipts reminder withheld there is only the prompt.
    expect(
      getByText(
        'Add a bill, a subscription, a card or an account and Skip can remind you about those.',
      ),
    ).toBeTruthy();
    expect(getByText('Reminders')).toBeTruthy();
  });
});
