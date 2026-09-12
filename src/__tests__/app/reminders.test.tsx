import { fireEvent, render } from '@testing-library/react-native';

import RemindersScreen from '@/app/reminders';

/**
 * The daily receipts reminder, rendered — and what the page does when a read
 * fails.
 *
 * The first five are about the thing somebody would notice: it is off until
 * they ask for it, the switch saves that, the pill shows the Founder's 8:00 pm
 * before anything is stored, and the "Nothing to remind you about" empty state
 * is gone — because with this section there is now always something to remind
 * you about.
 *
 * The rest are about the opposite: a switch drawn off is a statement, and on a
 * read that never landed it is the most misleading statement a notification
 * setting can make. So every read the page has is proved to take the page to
 * an error with a retry rather than to a wall of switches that all look off.
 */

// Hoisted above the imports by babel-plugin-jest-hoist; the order here is for
// reading, not for execution.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// `Screen` imports the keyboard controller, which wants its native module even
// on a page that does not avoid the keyboard. The package ships its own mock.
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

// The error state draws an illustration, which is an SVG component per theme.
// The page state is about the words and the retry, not the drawing.
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

// Reanimated 4 pulls react-native-worklets, which wants a native module. Only
// the loading skeleton uses it, and these cases all render past loading.
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

// Nothing on this page is remindable, which is the case that used to render the
// empty state. The receipts section has to stand on its own.
//
// Each read is failed one at a time from the tests below, so `mockFailed` is a
// query name rather than a flag: the page has seven reads and any one of them
// is enough to make every switch on it a guess.
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

// Mocked whole rather than spread over the real module: importing it for real
// pulls in supabase, AsyncStorage's native module and expo-notifications, none
// of which this screen touches. The four constants are copied from it, and the
// two key helpers are one line each.
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

    // The switch is a press target with the platform switch drawn inside it,
    // so what it says it is showing is on the accessibility state.
    expect(getByRole('switch').props.accessibilityState).toMatchObject({ checked: false });

    // The receipts reminder counts even when nothing else exists to remind
    // about, so the sentence is "0 of 1" rather than "0 of 0".
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
    expect(mockSetReceiptReminder).toHaveBeenCalledWith({ enabled: true });
  });

  it('shows the default 8:00 pm before a time has ever been stored', async () => {
    mockReceiptReminder = { enabled: true, remindAt: '20:00' };
    const { getByText, getByLabelText } = await render(<RemindersScreen />);

    // `formatClock` is the app's own renderer and prints an uppercase meridiem,
    // so every reminder in this screen reads "8:00 PM". The plan's "8:00 pm" is
    // prose; hardcoding a lowercase copy here would make this row the only one
    // that disagrees with the other four.
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
  // One case per read, because each one decides something different: the
  // settings read decides what a switch says, and the four list reads decide
  // whether a row exists to be switched at all. The receipts read is the one
  // exception and has its own describe below.
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

    expect(getByText('Could not load your reminders')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    // The two lies this replaces: a switch sitting off, and a count of the
    // settings behind it.
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
 * The receipts reminder is read from one column on the profile, and on a
 * database where its migration has not run that read fails on its own. It is
 * the only read on this page that must not take the page with it: the bill,
 * subscription, card and account reminders come from other tables, they are
 * why most people opened this screen, and they are fine.
 */
describe('Reminders — the receipts read alone', () => {
  beforeEach(() => {
    mockFailed = 'receipts';
  });

  it('keeps the page, and puts the failure in its own section', async () => {
    const { getByText, queryByText, queryByRole } = await render(<RemindersScreen />);

    // The section is still there, and says what it could not do.
    expect(getByText('Daily receipts reminder')).toBeTruthy();
    expect(getByText('Skip could not check whether this one is on.')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    // But not the page-level error, and not a switch drawn off over a read
    // that never landed.
    expect(queryByText('Could not load your reminders')).toBeNull();
    expect(queryByRole('switch')).toBeNull();
  });

  it('retries the receipts read by itself', async () => {
    const { getByText } = await render(<RemindersScreen />);

    await fireEvent.press(getByText('Try again'));

    expect(mockRefetched).toEqual(['receipts']);
  });

  it('leaves itself out of the count rather than guessing at it', async () => {
    const { getByText } = await render(<RemindersScreen />);

    // Nothing else on this account is remindable, so with the receipts
    // reminder withheld there is no figure to give — only the invitation.
    expect(
      getByText(
        'Add a bill, a subscription, a card or an account and Skip can remind you about those.',
      ),
    ).toBeTruthy();
    expect(getByText('Reminders')).toBeTruthy();
  });
});
