import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';

import AddSubscriptionScreen from '@/app/add-subscription';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';

/**
 * The subscription form as a person walks it. A blank subscription opens on the amount page and
 * Continue lands on the one final page. Only the amount and the note open a page of their own and
 * come back; the service, the billing cycle, the next renewal, Charged to and the reminder are
 * answered on the page itself. Save is never greyed out for a gap: it names what is still
 * unanswered. Real pages throughout (keypad, calendar, service field, source pills, reminder
 * chips); only the network and the logo images are replaced.
 *
 * Also: the form only exists when the record does. `id` turns Save into an update, so a failed read
 * must not open a blank "edit" over a real service.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));

// The logo a mark drew, readable as text: "Spotify|spotify.com", or "Spotify|" for letters.
jest.mock('@/components/brands/brand-logo', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    BrandLogo: ({
      name,
      domain,
      size,
    }: {
      name: string;
      domain?: string | null;
      size?: number;
    }) => <Text testID={`logo-${size}`}>{`${name}|${domain ?? ''}`}</Text>,
  };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    card: '#FFFFFF',
    accent: '#905479',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
    body: '#333333',
    accentInk: '#905479',
    onControl: '#FFFFFF',
  }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => async () => undefined,
}));

jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    choose: async () => 'upcoming',
    apply: jest.fn(),
    lastChargedOn: null,
    ready: true,
    retry: jest.fn(),
    saving: false,
  }),
}));

let mockParams: Record<string, string | undefined> = {};
const mockScreenOptions = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => mockParams,
  // Run like a focused screen, so the hardware back listener is really subscribed.
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(effect, [effect]);
  },
  Stack: {
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions(options);
      return null;
    },
  },
}));

/* Spied on as hooks: a hook never called proves the form was never on screen. */
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
let mockCreating = false;
const mockUseUpdate = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
const mockUseCreate = jest.fn(() => ({ mutateAsync: mockCreate, isPending: mockCreating }));
const mockUseDelete = jest.fn(() => ({ mutateAsync: mockDelete, isPending: false }));

jest.mock('@/api/mutations', () => ({
  useUpdateSubscription: () => mockUseUpdate(),
  useCreateSubscription: () => mockUseCreate(),
  useDeleteSubscription: () => mockUseDelete(),
}));

// The real chips and wording; only the two hooks that read and write the reminder are replaced.
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
let mockSavedReminder = { choice: 'off', remindAt: '09:00' };
const mockApplyReminder = jest.fn();
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useReminderChoice: () => mockSavedReminder,
  useApplyReminder: () => mockApplyReminder,
}));

const BRANDS = [
  { id: 'b-nf', name: 'Netflix', domain: 'netflix.com', category_id: 'entertainment' },
  { id: 'b-sp', name: 'Spotify', domain: 'spotify.com', category_id: 'entertainment' },
  { id: 'b-gh', name: 'GitHub', domain: 'github.com', category_id: 'software' },
];

// The real keyword guess and brand matching; only the reads that go to the network are replaced.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandSearch: (query: string) => ({
    data:
      query.trim().length >= 2
        ? BRANDS.filter((brand) => brand.name.toLowerCase().includes(query.trim().toLowerCase()))
        : [],
    isFetching: false,
  }),
  useBrandDirectory: () => ({ data: BRANDS }),
  useSpendCategories: () => ({
    data: [
      { id: 'entertainment', label: 'Entertainment', hint: null },
      { id: 'software', label: 'Software', hint: null },
      { id: 'other', label: 'Other', hint: null },
    ],
  }),
}));

jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: null, isLoading: false, isFetching: false }),
}));

const SOURCES = [
  { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
  { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
];
let mockSources: typeof SOURCES = SOURCES;

let mockSubscription: { data: unknown; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useSubscription: () => ({ ...mockSubscription, refetch: mockRefetch }),
  usePaymentSources: () => ({ sources: mockSources }),
}));

// Only the clock is fixed: Wednesday, October 7 2026. Real timers keep every render independent.
jest.useFakeTimers({
  doNotFake: [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
  ],
});
jest.setSystemTime(new Date('2026-10-07T09:00:00'));

const SPOTIFY = {
  id: 'sub-1',
  started_on: '2026-08-10',
  created_at: '2026-08-12T10:00:00+00:00',
  brand_id: 'b-sp',
  name: 'Spotify',
  amount: 11.99,
  cycle: 'monthly',
  next_renewal_on: '2026-10-10',
  category_id: 'entertainment',
  card_id: null,
  bank_account_id: 'acct-1',
  note: 'Family plan',
  active: true,
  brands: { domain: 'spotify.com' },
};

const CYCLES = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];
const CHARGED_TO = ['VISA ••4421', 'Checking ••0099', 'Skip'];
const REMINDERS = ['No reminder', 'On the day', '1 day', '3 days', '1 week'];

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

/** The amount is a button on the page and a figure inside it, both worded alike: by role, the button. */
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

/** One keypad key at a time, the way it is typed. */
async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) {
    await press(screen, key === '.' ? 'Decimal point' : key);
  }
}

const SERVICE_PLACEHOLDER = 'Search for a service';

/** The button that lets go of the chosen service. Its words are the store field's, shared. */
const changeService = (name: string) => `Change service, currently ${name}`;

/** Types into the service box on the final page the way a finger does: a tap into it, then the letters. */
async function searchService(screen: Screen, text: string) {
  const input = screen.getByPlaceholderText(SERVICE_PLACEHOLDER);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Searches the service box and taps the catalogue result: the service is set at once, with no Done. */
async function chooseService(screen: Screen, search: string, result: string) {
  await searchService(screen, search);
  await fireEvent.press(await screen.findByLabelText(result));
}

/** The box that asks for the renewal day: the day it shows, or the invitation to pick one. */
const NO_DAY = 'Next renewal, Select a date';
const renewal = (day: string) => `Next renewal, ${day}`;

/** Opens a date box and picks a day from the calendar that unfolds under it. */
async function pickDay(screen: Screen, box: string, day: string) {
  await press(screen, box);
  await press(screen, day);
}

/** A typed subscription, as far as its final page. */
async function fillAmount(screen: Screen, amount = '15.99') {
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
}

/** What a new subscription is still asked once it has an amount: the day, the payer, the reminder. */
async function answerTheRest(screen: Screen, source = 'VISA ••4421') {
  await pickDay(screen, NO_DAY, 'Friday 9 October 2026');
  await press(screen, source);
  await press(screen, 'No reminder');
}

/** The line Save puts above its button when answers are missing. */
const gaps = (fields: string) => `To save this subscription, fill in: ${fields}.`;

const editing = (row: Record<string, unknown> = SPOTIFY) => {
  mockParams = { id: 'sub-1' };
  mockSubscription = { data: row, isError: false, isFetched: true };
};

/** Every string drawn on the page, top to bottom. */
function textsInOrder(screen: Screen): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') walk((node as { children?: unknown }).children);
  };
  walk(screen.toJSON());
  return out;
}

const onAmountPage = (screen: Screen) => {
  expect(screen.getByText('How much does it cost?')).toBeTruthy();
  expect(screen.getByLabelText('Continue')).toBeTruthy();
  expect(screen.queryByText('You can edit this later.')).toBeNull();
};
const onFinalPage = (screen: Screen) => {
  expect(screen.getByText('You can edit this later.')).toBeTruthy();
  expect(screen.queryByText('How much does it cost?')).toBeNull();
};

const isChecked = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.checked);

/** Which of a group's pills are lit. Throws on a pill that is not on the page. */
const lit = (screen: Screen, labels: string[]) =>
  labels.filter((label) => isChecked(screen, label));

/** Hardware back as the system plays it: newest listener first, until one takes it. */
type BackHandlerFn = Parameters<typeof BackHandler.addEventListener>[1];
const backHandlers = new Set<BackHandlerFn>();
async function hardwareBack(): Promise<boolean> {
  let handled = false;
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler({ type: 'hardwareBackPress', timeStamp: Date.now() })) {
        handled = true;
        break;
      }
    }
  });
  return handled;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSources = SOURCES;
  mockCreating = false;
  mockSavedReminder = { choice: 'off', remindAt: '09:00' };
  mockSubscription = { data: null, isError: false, isFetched: false };
  mockConfirm.mockResolvedValue(true);
  mockCreate.mockResolvedValue({ id: 'sub-new' });
  mockUpdate.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  mockUseDelete.mockImplementation(() => ({ mutateAsync: mockDelete, isPending: false }));
  backHandlers.clear();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.add(handler);
    return { remove: () => void backHandlers.delete(handler) };
  });
});

afterAll(() => jest.restoreAllMocks());

describe('Add subscription — an edit whose row could not be read', () => {
  beforeEach(() => {
    mockParams = { id: 'sub-1' };
  });

  it('says so instead of opening a blank form over the real subscription', async () => {
    mockSubscription = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddSubscriptionScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit subscription')).toBeNull();
    expect(queryByText('Add a subscription')).toBeNull();
    expect(queryByText('Continue')).toBeNull();
    expect(queryByText('Save changes')).toBeNull();
    expect(queryByText('Save subscription')).toBeNull();

    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('tries the read again from the failure page', async () => {
    mockSubscription = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Try again');
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Go back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('holds the skeleton while the read is still running', async () => {
    const { getByText, getByLabelText, queryByText, queryByRole } = await render(
      <AddSubscriptionScreen />,
    );

    expect(getByText('Edit subscription')).toBeTruthy();
    expect(getByLabelText('Continue')).toBeDisabled();
    expect(queryByRole('progressbar')).toBeNull();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(queryByText('Save changes')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
  });

  it('opens on the final page, filled in, once the row is in hand', async () => {
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Edit subscription')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Amount, $11.99' })).toBeTruthy();
    expect(screen.getByLabelText(changeService('Spotify'))).toBeTruthy();
    expect(screen.queryByPlaceholderText(SERVICE_PLACEHOLDER)).toBeNull();
    expect(screen.getByLabelText(renewal('Sat Oct 10'))).toBeTruthy();
    expect(lit(screen, CHARGED_TO)).toEqual(['Checking ••0099']);
    expect(lit(screen, REMINDERS)).toEqual(['No reminder']);
    expect(screen.getByLabelText('Note, Family plan')).toBeTruthy();
    expect(screen.getByLabelText('Save changes')).toBeEnabled();
    expect(screen.queryByText('How much does it cost?')).toBeNull();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockUseUpdate).toHaveBeenCalled();
  });

  it('says the subscription is gone when the read lands empty', async () => {
    mockSubscription = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddSubscriptionScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(queryByText('Edit subscription')).toBeNull();
    expect(queryByText('Add a subscription')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
  });
});

describe('Add subscription — the amount page', () => {
  it('opens a new subscription on the amount, with no step dots', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Add a subscription')).toBeTruthy();
    onAmountPage(screen);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByLabelText(/^Step \d/)).toBeNull();
    expect(screen.queryByLabelText('Save subscription')).toBeNull();
    expect(screen.queryByLabelText('Delete this subscription')).toBeNull();
  });

  it('holds Continue back until there is an amount above zero, to the cent', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Continue')).toBeDisabled();

    await typeAmount(screen, '0');
    expect(screen.getByLabelText('Continue')).toBeDisabled();
    await typeAmount(screen, '.');
    await typeAmount(screen, '0');
    expect(screen.getByLabelText('Continue')).toBeDisabled();

    await typeAmount(screen, '1');
    expect(screen.getByLabelText('Continue')).toBeEnabled();

    await press(screen, 'Delete last digit');
    expect(screen.getByLabelText('Continue')).toBeDisabled();
  });

  it('Continue lands on the final page with the amount and a service still to add, nothing written', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await fillAmount(screen, '1030.5');

    onFinalPage(screen);
    expect(screen.queryByLabelText('Continue')).toBeNull();
    expect(screen.getByRole('button', { name: 'Amount, $1,030.50' })).toBeTruthy();
    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByLabelText(/^Change store/)).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('Back leaves the form, and close asks before it throws the subscription away', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Back');
    expect(router.back).toHaveBeenCalledTimes(1);

    (router.back as jest.Mock).mockClear();
    mockConfirm.mockResolvedValueOnce(false);
    await press(screen, 'Close');
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cancel adding this subscription?' }),
    );
    expect(router.back).not.toHaveBeenCalled();

    await press(screen, 'Close');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  });

  it('asks about editing, not adding, when close is pressed on a saved subscription', async () => {
    editing();
    mockConfirm.mockResolvedValueOnce(false);
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Close');

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cancel editing this subscription?' }),
    );
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Add subscription — the final page', () => {
  it('says what each line holds, and that it can be edited later', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Amount, $15.99' }).props.accessibilityHint).toBe(
      'Tap to edit',
    );
    expect(screen.getByText('Tap to edit')).toBeTruthy();

    // The service is a search box on the page itself, not a red error.
    expect(screen.getByText('Service')).toBeTruthy();
    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByText(/^Filed under/)).toBeNull();

    // The cycle row has its pills as the whole control, and monthly until told otherwise.
    expect(screen.getByText('Billing cycle')).toBeTruthy();
    expect(lit(screen, CYCLES)).toEqual(['Monthly']);

    // The renewal day is asked for like the rest: it is no longer marked optional.
    expect(screen.getByText('Next renewal')).toBeTruthy();
    expect(screen.getByLabelText(NO_DAY)).toBeTruthy();
    expect(screen.getByText('Select a date')).toBeTruthy();
    expect(screen.queryByText(/Optional/)).toBeNull();

    // The payer and the reminder are answers to give, so nothing is lit for either.
    expect(screen.getByText('Charged to')).toBeTruthy();
    expect(lit(screen, CHARGED_TO)).toEqual([]);
    expect(screen.getByText('Reminder')).toBeTruthy();
    expect(screen.getByText('Before it renews')).toBeTruthy();
    expect(lit(screen, REMINDERS)).toEqual([]);

    expect(screen.getByLabelText('Note, not set, optional').props.accessibilityHint).toBe(
      'Opens note to change it.',
    );
    expect(screen.getByText('Add a note')).toBeTruthy();

    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByLabelText('Delete this subscription')).toBeNull();
    expect(screen.queryByText('Status')).toBeNull();
  });

  it('lays the lines out in order, and opens no page for the day, the payer or the reminder', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    const texts = textsInOrder(screen);
    const order = [
      'Service',
      'Billing cycle',
      'Next renewal',
      'Charged to',
      'Reminder',
      'Note',
    ].map((line) => texts.indexOf(line));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));

    const radios = screen.getAllByRole('radio').map((pill) => pill.props.accessibilityLabel);
    expect(radios).toEqual([...CYCLES, ...CHARGED_TO, ...REMINDERS]);

    expect(screen.queryByLabelText(/^Charged to,/)).toBeNull();
    expect(screen.queryByLabelText(/^Reminder,/)).toBeNull();
    expect(screen.queryByText('Not set')).toBeNull();
  });

  it('draws a missing amount as a gap to fill, never $0', async () => {
    mockParams = { from: 'voice', prefillName: 'Netflix' };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(screen.queryByText(/\$0/)).toBeNull();

    await press(screen, 'Amount, needed');
    await typeAmount(screen, '7');
    await press(screen, 'Done');
    expect(screen.getByRole('button', { name: 'Amount, $7.00' })).toBeTruthy();
  });
});

describe('Add subscription — the amount line', () => {
  it('opens the keypad page, and Done waits while the amount is zero', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await pressButton(screen, 'Amount, $15.99');
    expect(screen.getByText('How much does it cost?')).toBeTruthy();
    expect(screen.queryByLabelText('Continue')).toBeNull();
    expect(screen.queryByText('You can edit this later.')).toBeNull();
    expect(screen.getByLabelText('Done')).toBeEnabled();

    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    expect(screen.getByLabelText('Done')).toBeDisabled();
    await typeAmount(screen, '0');
    expect(screen.getByLabelText('Done')).toBeDisabled();
  });

  it('Done writes the new amount to the cent and returns to the final page', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await pressButton(screen, 'Amount, $15.99');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '0.10');
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $0.10' })).toBeTruthy();
  });

  it('Back leaves the amount as it was', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await pressButton(screen, 'Amount, $15.99');
    // A figure already at two decimals takes no more keys, so clear it to have something to discard.
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '9');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
  });
});

describe('Add subscription — the service box', () => {
  it('sits on the final page: a pick sets the service at once, files it and shows its logo', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByText(/^Filed under/)).toBeNull();
    expect(screen.queryByText('Which service is it?')).toBeNull();

    await chooseService(screen, 'Net', 'Netflix');

    onFinalPage(screen);
    expect(screen.queryByLabelText('Done')).toBeNull();
    expect(screen.queryByPlaceholderText(SERVICE_PLACEHOLDER)).toBeNull();
    expect(screen.getByLabelText(changeService('Netflix'))).toBeTruthy();
    expect(screen.getByText('Filed under Entertainment')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Netflix|netflix.com');
  });

  it('files a service the catalogue does not know by the words in its name', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await searchService(screen, 'Zed Zed');
    await fireEvent.press(screen.getByText('Add “Zed Zed”'));

    onFinalPage(screen);
    expect(screen.getByLabelText(changeService('Zed Zed'))).toBeTruthy();
    expect(screen.getByText('Filed under Other')).toBeTruthy();
  });

  it('files a catalogue service under the category the catalogue gives it', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await chooseService(screen, 'Git', 'GitHub');

    expect(screen.getByText('Filed under Apps & Software')).toBeTruthy();
  });

  it('files nothing for words typed but not picked, only for a service that was chosen', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await searchService(screen, 'Town Gym');

    expect(screen.getByDisplayValue('Town Gym')).toBeTruthy();
    expect(screen.getByText('Add “Town Gym”')).toBeTruthy();
    expect(screen.queryByText(/^Filed under/)).toBeNull();
    expect(screen.queryByLabelText(/^Change service/)).toBeNull();
  });

  it('lets go of the service with its X, and the empty box returns', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');

    await press(screen, changeService('Netflix'));

    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByDisplayValue('')).toBeTruthy();
    expect(screen.queryByText(/^Filed under/)).toBeNull();
  });

  it('shows a saved subscription’s service already chosen, with its category and logo', async () => {
    editing();
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText(changeService('Spotify'))).toBeTruthy();
    expect(screen.getByText('Filed under Entertainment')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Spotify|spotify.com');
    expect(screen.queryByLabelText('Done')).toBeNull();
  });

  it('keeps the service across a visit to another line’s page', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');

    await press(screen, 'Note, not set, optional');
    expect(screen.queryByLabelText(changeService('Netflix'))).toBeNull();
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByLabelText(changeService('Netflix'))).toBeTruthy();
    expect(screen.getByText('Filed under Entertainment')).toBeTruthy();
  });

  // The box is drawn afresh after another page, while the form keeps counting what was typed as the
  // service: an empty-looking box that still saves would be a service nobody can see.
  it('brings words typed but not picked back with the box after a visit to another page', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await searchService(screen, 'Town Gym');

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByDisplayValue('Town Gym')).toBeTruthy();
    expect(screen.queryByLabelText(/^Change service/)).toBeNull();
  });

  it('brings them back after a visit to the amount page too', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await searchService(screen, 'Town Gym');

    await pressButton(screen, 'Amount, $15.99');
    await press(screen, 'Back');

    expect(screen.getByDisplayValue('Town Gym')).toBeTruthy();
  });
});

describe('Add subscription — the billing cycle line', () => {
  it('is no button: the four pills under it are the whole control, monthly to begin with', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.queryByLabelText(/^Billing cycle/)).toBeNull();
    for (const pill of CYCLES) {
      expect(screen.getByLabelText(pill).props.accessibilityRole).toBe('radio');
    }
    expect(lit(screen, CYCLES)).toEqual(['Monthly']);
  });

  it('changes the cycle in one tap, without leaving the final page', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    for (const pill of ['Yearly', 'Weekly', 'Quarterly', 'Monthly']) {
      await press(screen, pill);
      onFinalPage(screen);
      expect(lit(screen, CYCLES)).toEqual([pill]);
    }
  });

  it('shows the cycle the saved subscription has', async () => {
    editing({ ...SPOTIFY, cycle: 'quarterly' });
    const screen = await render(<AddSubscriptionScreen />);

    expect(lit(screen, CYCLES)).toEqual(['Quarterly']);
  });
});

describe('Add subscription — the next-renewal box', () => {
  describe('on a saved subscription', () => {
    beforeEach(() => editing());

    it('shows the saved day in the box, with the calendar folded away and no way to clear it', async () => {
      const screen = await render(<AddSubscriptionScreen />);

      expect(screen.getByText('Next renewal')).toBeTruthy();
      expect(screen.getByLabelText(renewal('Sat Oct 10')).props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: false }),
      );
      expect(screen.queryByLabelText('Next month')).toBeNull();
      expect(screen.queryByText('No renewal date')).toBeNull();
      expect(screen.queryByLabelText(/^Payment on/)).toBeNull();
    });

    it('opens a calendar right under the box, on the saved day', async () => {
      const screen = await render(<AddSubscriptionScreen />);

      await press(screen, renewal('Sat Oct 10'));

      onFinalPage(screen);
      expect(screen.getByLabelText(renewal('Sat Oct 10')).props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: true }),
      );
      expect(screen.getByLabelText('Saturday 10 October 2026').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
      const texts = textsInOrder(screen);
      expect(texts.indexOf('Next renewal')).toBeLessThan(texts.indexOf('October 2026'));
      expect(texts.indexOf('October 2026')).toBeLessThan(texts.indexOf('Charged to'));
      expect(screen.queryByText('No renewal date')).toBeNull();
    });

    it('fills the box with the day picked and folds the calendar away', async () => {
      const screen = await render(<AddSubscriptionScreen />);

      await press(screen, renewal('Sat Oct 10'));
      await press(screen, 'Next month');
      await press(screen, 'Friday 6 November 2026');

      onFinalPage(screen);
      expect(screen.getByLabelText(renewal('Fri Nov 6'))).toBeTruthy();
      expect(screen.queryByLabelText('Next month')).toBeNull();
    });

    it('sets today with the Today pill', async () => {
      const screen = await render(<AddSubscriptionScreen />);

      await press(screen, renewal('Sat Oct 10'));
      await press(screen, 'Today');

      expect(screen.getByLabelText(renewal('Today, Wed Oct 7'))).toBeTruthy();
      expect(screen.queryByLabelText('Next month')).toBeNull();
    });

    it('folds the calendar away on a second tap and keeps the day', async () => {
      const screen = await render(<AddSubscriptionScreen />);

      await press(screen, renewal('Sat Oct 10'));
      await press(screen, renewal('Sat Oct 10'));

      expect(screen.queryByLabelText('Next month')).toBeNull();
      expect(screen.getByLabelText(renewal('Sat Oct 10'))).toBeTruthy();
    });

    it('says Today for a subscription renewing today', async () => {
      editing({ ...SPOTIFY, next_renewal_on: '2026-10-07' });
      const screen = await render(<AddSubscriptionScreen />);

      expect(screen.getByLabelText(renewal('Today, Wed Oct 7'))).toBeTruthy();
    });
  });

  describe('on a new subscription', () => {
    it('is asked for, not marked optional, and invites a day', async () => {
      const screen = await render(<AddSubscriptionScreen />);
      await fillAmount(screen);

      expect(screen.getByText('Next renewal')).toBeTruthy();
      expect(screen.getByText('Select a date')).toBeTruthy();
      expect(screen.getByLabelText(NO_DAY).props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: false }),
      );
      expect(screen.queryByText(/Optional/)).toBeNull();
      expect(screen.queryByText('No renewal date')).toBeNull();
    });

    it('opens the calendar on this month with no day picked', async () => {
      const screen = await render(<AddSubscriptionScreen />);
      await fillAmount(screen);

      await press(screen, NO_DAY);

      expect(screen.getByText('October 2026')).toBeTruthy();
      expect(screen.getByLabelText('Friday 9 October 2026').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });

    it('fills the box with the day picked, without leaving the page', async () => {
      const screen = await render(<AddSubscriptionScreen />);
      await fillAmount(screen);

      await pickDay(screen, NO_DAY, 'Friday 9 October 2026');

      onFinalPage(screen);
      expect(screen.getByLabelText(renewal('Fri Oct 9'))).toBeTruthy();
      expect(screen.queryByText('Select a date')).toBeNull();
      expect(screen.queryByLabelText('Next month')).toBeNull();
      // Once set there is still nothing to take it off with: the day is asked for.
      expect(screen.queryByText('No renewal date')).toBeNull();
    });

    it('names yesterday as such', async () => {
      const screen = await render(<AddSubscriptionScreen />);
      await fillAmount(screen);

      await pickDay(screen, NO_DAY, 'Tuesday 6 October 2026');

      expect(screen.getByLabelText(renewal('Yesterday, Tue Oct 6'))).toBeTruthy();
    });

    it('lights the day picked when the calendar is opened again', async () => {
      const screen = await render(<AddSubscriptionScreen />);
      await fillAmount(screen);
      await pickDay(screen, NO_DAY, 'Friday 9 October 2026');

      await press(screen, renewal('Fri Oct 9'));

      expect(screen.getByLabelText('Friday 9 October 2026').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });
  });
});

describe('Add subscription — charged to', () => {
  it('starts with nothing chosen on a new one, and offers every card and account, then Skip', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.getByText('Charged to')).toBeTruthy();
    expect(lit(screen, CHARGED_TO)).toEqual([]);
    const radios = screen.getAllByRole('radio').map((pill) => pill.props.accessibilityLabel);
    expect(radios.slice(CYCLES.length, CYCLES.length + CHARGED_TO.length)).toEqual(CHARGED_TO);
  });

  it('chooses a card where it stands and lets the other go', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'VISA ••4421');
    expect(lit(screen, CHARGED_TO)).toEqual(['VISA ••4421']);
    await press(screen, 'Checking ••0099');

    onFinalPage(screen);
    expect(lit(screen, CHARGED_TO)).toEqual(['Checking ••0099']);
  });

  it('takes Skip as an answer, which lets the cards go', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'VISA ••4421');
    await press(screen, 'Skip');
    expect(lit(screen, CHARGED_TO)).toEqual(['Skip']);

    await press(screen, 'Checking ••0099');
    expect(lit(screen, CHARGED_TO)).toEqual(['Checking ••0099']);
  });

  it('shows just Skip when there is no card or account to pick', async () => {
    mockSources = [];
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    onFinalPage(screen);
    expect(screen.getByText('Charged to')).toBeTruthy();
    expect(screen.queryByLabelText('VISA ••4421')).toBeNull();
    expect(screen.queryByLabelText('Checking ••0099')).toBeNull();
    const radios = screen.getAllByRole('radio').map((pill) => pill.props.accessibilityLabel);
    expect(radios).toEqual([...CYCLES, 'Skip', ...REMINDERS]);
    expect(lit(screen, ['Skip'])).toEqual([]);

    await press(screen, 'Skip');
    expect(lit(screen, ['Skip'])).toEqual(['Skip']);
  });

  it('opens a saved subscription on its card, its account, or Skip when it has neither', async () => {
    editing({ ...SPOTIFY, card_id: 'card-1', bank_account_id: null });
    const card = await render(<AddSubscriptionScreen />);
    expect(lit(card, CHARGED_TO)).toEqual(['VISA ••4421']);
    await card.unmount();

    editing();
    const account = await render(<AddSubscriptionScreen />);
    expect(lit(account, CHARGED_TO)).toEqual(['Checking ••0099']);
    await account.unmount();

    editing({ ...SPOTIFY, card_id: null, bank_account_id: null });
    const neither = await render(<AddSubscriptionScreen />);
    expect(lit(neither, CHARGED_TO)).toEqual(['Skip']);
  });

  it('opens on the card the voice review heard, and on nothing when none was heard', async () => {
    mockParams = {
      from: 'voice',
      prefillName: 'Netflix',
      prefillAmount: '15.99',
      prefillSource: 'acct-1',
    };
    const heard = await render(<AddSubscriptionScreen />);
    expect(lit(heard, CHARGED_TO)).toEqual(['Checking ••0099']);
    await heard.unmount();

    mockParams = { from: 'voice', prefillName: 'Netflix', prefillAmount: '15.99' };
    const unheard = await render(<AddSubscriptionScreen />);
    expect(lit(unheard, CHARGED_TO)).toEqual([]);
  });
});

describe('Add subscription — the reminder', () => {
  it('starts with nothing chosen on a new one, and no time to set', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.getByText('Reminder')).toBeTruthy();
    expect(screen.getByText('Before it renews')).toBeTruthy();
    for (const pill of REMINDERS) {
      expect(screen.getByLabelText(pill).props.accessibilityRole).toBe('radio');
    }
    expect(lit(screen, REMINDERS)).toEqual([]);
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
  });

  it('says No reminder, never Off, for the way to have none', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.queryByLabelText('Off')).toBeNull();
    expect(screen.queryByText('Off')).toBeNull();
    await press(screen, 'No reminder');

    expect(lit(screen, REMINDERS)).toEqual(['No reminder']);
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
  });

  it('shows the time once a reminder is on, and takes it away again with No reminder', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, '3 days');

    onFinalPage(screen);
    expect(lit(screen, REMINDERS)).toEqual(['3 days']);
    expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
    await press(screen, 'On the day');
    expect(lit(screen, REMINDERS)).toEqual(['On the day']);
    expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
    await press(screen, 'No reminder');
    expect(lit(screen, REMINDERS)).toEqual(['No reminder']);
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
  });

  it('keeps the time picked on the clock', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, '1 week');
    await press(screen, 'Sent at 9:00 AM. Change the time.');
    await press(screen, 'PM');
    await press(screen, 'Confirm time');

    expect(screen.getByLabelText('Sent at 9:00 PM. Change the time.')).toBeTruthy();
    expect(lit(screen, REMINDERS)).toEqual(['1 week']);
  });

  it('opens a saved subscription on its reminder and its time, or on No reminder when it has none', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    editing();
    const saved = await render(<AddSubscriptionScreen />);
    expect(lit(saved, REMINDERS)).toEqual(['3 days']);
    expect(saved.getByLabelText('Sent at 8:30 AM. Change the time.')).toBeTruthy();
    await saved.unmount();

    mockSavedReminder = { choice: 'off', remindAt: '09:00' };
    const none = await render(<AddSubscriptionScreen />);
    expect(lit(none, REMINDERS)).toEqual(['No reminder']);
    expect(none.queryByLabelText(/^Sent at/)).toBeNull();
  });
});

describe('Add subscription — answers kept while another page is open', () => {
  /** A new subscription with the day, the payer and a reminder answered. */
  async function answered(screen: Screen) {
    await fillAmount(screen);
    await pickDay(screen, NO_DAY, 'Friday 9 October 2026');
    await press(screen, 'VISA ••4421');
    await press(screen, '3 days');
  }

  const stillAnswered = (screen: Screen) => {
    onFinalPage(screen);
    expect(screen.getByLabelText(renewal('Fri Oct 9'))).toBeTruthy();
    expect(lit(screen, CHARGED_TO)).toEqual(['VISA ••4421']);
    expect(lit(screen, REMINDERS)).toEqual(['3 days']);
    expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
  };

  it('keeps the day, the payer and the reminder through a visit to the note', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await answered(screen);

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');

    stillAnswered(screen);
  });

  it('keeps them through a visit to the amount', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await answered(screen);

    await pressButton(screen, 'Amount, $15.99');
    await press(screen, 'Done');

    stillAnswered(screen);
  });

  it('keeps them on the way back to the amount page and forward again', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await answered(screen);

    await press(screen, 'Back');
    onAmountPage(screen);
    await press(screen, 'Continue');

    stillAnswered(screen);
  });
});

describe('Add subscription — the note line', () => {
  it('asks to "Add a note", then shows the note once Done writes it', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    expect(screen.getByText('Add a note')).toBeTruthy();

    await press(screen, 'Note, not set, optional');
    expect(screen.queryByText('You can edit this later.')).toBeNull();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Which plan, for example'),
      'Family plan',
    );
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByLabelText('Note, Family plan')).toBeTruthy();
    expect(screen.getByText('Family plan')).toBeTruthy();
    expect(screen.queryByText('Add a note')).toBeNull();
  });

  it('a note of spaces is no note', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(screen.getByPlaceholderText('Which plan, for example'), '   ');
    await press(screen, 'Done');

    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
    expect(screen.getByText('Add a note')).toBeTruthy();
  });

  it('Back leaves the note as it was', async () => {
    editing();
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Note, Family plan');
    await fireEvent.changeText(screen.getByPlaceholderText('Which plan, for example'), 'Oops');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByLabelText('Note, Family plan')).toBeTruthy();
  });
});

describe('Add subscription — the status line', () => {
  it('is for a saved subscription only', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.queryByText('Status')).toBeNull();
    expect(screen.queryByLabelText('Active')).toBeNull();
    expect(screen.queryByLabelText('Cancelled')).toBeNull();
  });

  it('shows Active and Cancelled chips on a saved one, and no page opens for them', async () => {
    editing();
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.queryByLabelText(/^Status/)).toBeNull();
    expect(screen.getByLabelText('Active').props.accessibilityRole).toBe('radio');
    expect(screen.getByLabelText('Cancelled').props.accessibilityRole).toBe('radio');
    expect(isChecked(screen, 'Active')).toBe(true);
    expect(isChecked(screen, 'Cancelled')).toBe(false);

    await press(screen, 'Cancelled');
    onFinalPage(screen);
    expect(isChecked(screen, 'Active')).toBe(false);
    expect(isChecked(screen, 'Cancelled')).toBe(true);

    await press(screen, 'Active');
    expect(isChecked(screen, 'Active')).toBe(true);
  });

  it('opens a cancelled subscription on Cancelled', async () => {
    editing({ ...SPOTIFY, active: false });
    const screen = await render(<AddSubscriptionScreen />);

    expect(isChecked(screen, 'Cancelled')).toBe(true);
    expect(isChecked(screen, 'Active')).toBe(false);
  });
});

describe('Add subscription — one-field pages', () => {
  it('have Back but nothing to close: one field has nothing to throw away', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.getByLabelText('Close')).toBeTruthy();
    await press(screen, 'Note, not set, optional');
    expect(screen.getByLabelText('Back')).toBeTruthy();
    expect(screen.queryByLabelText('Close')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('leave the swipe-back gesture off, so a swipe cannot throw the form away', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

    await fillAmount(screen);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });

    await press(screen, 'Note, not set, optional');
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
  });
});

describe('Add subscription — Back from the final page', () => {
  it('goes to the amount page for a subscription typed by hand, the amount kept', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen, '15.99');

    await press(screen, 'Back');

    onAmountPage(screen);
    expect(router.back).not.toHaveBeenCalled();
    await press(screen, 'Continue');
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
  });

  it('keeps the service and the cycle chosen on the way back to the amount', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');
    await press(screen, 'Yearly');

    await press(screen, 'Back');
    await press(screen, 'Continue');

    expect(screen.getByLabelText(changeService('Netflix'))).toBeTruthy();
    expect(isChecked(screen, 'Yearly')).toBe(true);
  });

  it('is the hardware back too: the form steps back, then the system takes over', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    // First page: left to the system, so the screen is popped.
    expect(await hardwareBack()).toBe(false);

    await fillAmount(screen);
    expect(await hardwareBack()).toBe(true);
    onAmountPage(screen);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('leaves the form for an edit, where the final page is the first', async () => {
    editing();
    const screen = await render(<AddSubscriptionScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
    expect(await hardwareBack()).toBe(false);

    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    onFinalPage(screen);
  });

  it('leaves the form for what the voice review page heard', async () => {
    mockParams = {
      from: 'voice',
      prefillName: 'Netflix',
      prefillBrandId: 'b-nf',
      prefillDomain: 'netflix.com',
      prefillCategory: 'entertainment',
      prefillAmount: '15.99',
      prefillCycle: 'yearly',
      prefillDate: '2026-10-12',
      prefillSource: 'card-1',
    };
    const screen = await render(<AddSubscriptionScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
    expect(await hardwareBack()).toBe(false);

    // Heard, so it opens on the final page, already filled in. A reminder is never heard.
    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
    expect(screen.getByLabelText(changeService('Netflix'))).toBeTruthy();
    expect(isChecked(screen, 'Yearly')).toBe(true);
    expect(screen.getByLabelText(renewal('Mon Oct 12'))).toBeTruthy();
    expect(lit(screen, CHARGED_TO)).toEqual(['VISA ••4421']);
    expect(lit(screen, REMINDERS)).toEqual([]);

    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    onFinalPage(screen);
  });

  it('from a one-field page returns to the final page, never out of the form', async () => {
    editing();
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Note, Family plan');
    expect(await hardwareBack()).toBe(true);

    onFinalPage(screen);
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Add subscription — Save with gaps', () => {
  it('is never greyed out for a missing answer', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await fillAmount(screen);

    expect(screen.getByLabelText('Save subscription')).toBeEnabled();
  });

  it('names every gap in the order of the page and writes nothing', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Save subscription');

    expect(screen.getByText(gaps('Service, Next renewal, Charged to, Reminder'))).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    onFinalPage(screen);
  });

  it('names all five when nothing at all was brought', async () => {
    mockParams = { from: 'voice', prefillNote: 'Family plan' };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save subscription');

    expect(
      screen.getByText(gaps('Amount, Service, Next renewal, Charged to, Reminder')),
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('asks for the renewal day like the rest, and saves it once given', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');
    await press(screen, 'VISA ••4421');
    await press(screen, 'No reminder');

    await press(screen, 'Save subscription');
    expect(screen.getByText(gaps('Next renewal'))).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();

    await pickDay(screen, NO_DAY, 'Friday 9 October 2026');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ next_renewal_on: '2026-10-09' });
  });

  const WHOLE = {
    from: 'voice',
    prefillName: 'Netflix',
    prefillBrandId: 'b-nf',
    prefillDomain: 'netflix.com',
    prefillCategory: 'entertainment',
    prefillAmount: '15.99',
    prefillDate: '2026-10-12',
    prefillSource: 'card-1',
  };
  const without = (key: keyof typeof WHOLE) =>
    Object.fromEntries(Object.entries(WHOLE).filter(([name]) => name !== key));

  it.each([
    [
      'Amount',
      'prefillAmount',
      async (screen: Screen) => {
        await pressButton(screen, 'Amount, needed');
        await typeAmount(screen, '15.99');
        await press(screen, 'Done');
      },
    ],
    [
      'Service',
      'prefillName',
      async (screen: Screen) => {
        await chooseService(screen, 'Net', 'Netflix');
      },
    ],
    [
      'Next renewal',
      'prefillDate',
      async (screen: Screen) => {
        await pickDay(screen, NO_DAY, 'Monday 12 October 2026');
      },
    ],
    [
      'Charged to',
      'prefillSource',
      async (screen: Screen) => {
        await press(screen, 'Skip');
      },
    ],
    [
      'Reminder',
      null,
      async (screen: Screen) => {
        await press(screen, 'No reminder');
      },
    ],
  ])(
    'names only %s when that is all that is left, and saves once it is given',
    async (field, omit, give) => {
      mockParams = omit ? without(omit as keyof typeof WHOLE) : WHOLE;
      const screen = await render(<AddSubscriptionScreen />);
      if (field !== 'Reminder') await press(screen, 'No reminder');

      await press(screen, 'Save subscription');
      expect(screen.getByText(gaps(field))).toBeTruthy();
      expect(mockCreate).not.toHaveBeenCalled();

      await give(screen);
      await press(screen, 'Save subscription');

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(screen.queryByText(/^To save this subscription/)).toBeNull();
    },
  );

  const inlineChanges: [string, (screen: Screen) => Promise<unknown>][] = [
    ['typing in the service box', (screen) => searchService(screen, 'Gym')],
    ['picking a service from the list', (screen) => chooseService(screen, 'Net', 'Netflix')],
    ['picking a renewal day', (screen) => pickDay(screen, NO_DAY, 'Friday 9 October 2026')],
    ['picking a card', (screen) => press(screen, 'VISA ••4421')],
    ['picking Skip', (screen) => press(screen, 'Skip')],
    ['picking a reminder', (screen) => press(screen, 'On the day')],
    ['changing the billing cycle', (screen) => press(screen, 'Yearly')],
  ];

  it.each(inlineChanges)(
    'goes away with %s, however much is still missing',
    async (_what, change) => {
      const screen = await render(<AddSubscriptionScreen />);
      await fillAmount(screen);
      await press(screen, 'Save subscription');
      expect(screen.getByText(/^To save this subscription/)).toBeTruthy();

      await change(screen);

      expect(screen.queryByText(/^To save this subscription/)).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    },
  );

  it('goes away with a change of status on a saved subscription too', async () => {
    editing();
    const screen = await render(<AddSubscriptionScreen />);
    await press(screen, changeService('Spotify'));
    await press(screen, 'Save changes');
    expect(screen.getByText(gaps('Service'))).toBeTruthy();

    await press(screen, 'Cancelled');

    expect(screen.queryByText(/^To save this subscription/)).toBeNull();
  });

  it('goes away when a page keeps something, and stays when the page is left with Back', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await press(screen, 'Save subscription');

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');
    expect(screen.getByText(/^To save this subscription/)).toBeTruthy();

    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Which plan, for example'),
      'Family plan',
    );
    await press(screen, 'Done');
    expect(screen.queryByText(/^To save this subscription/)).toBeNull();
  });

  it('is said again on the next press, naming only what is still missing', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await press(screen, 'Save subscription');
    await press(screen, 'Save subscription');
    expect(screen.getAllByText(/^To save this subscription/)).toHaveLength(1);

    await searchService(screen, 'Gym');
    await pickDay(screen, NO_DAY, 'Friday 9 October 2026');
    await press(screen, 'Save subscription');

    expect(screen.getByText(gaps('Charged to, Reminder'))).toBeTruthy();
  });

  it('counts a service that was typed but never picked from the list', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await searchService(screen, '  Town Gym  ');
    await answerTheRest(screen);
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      name: 'Town Gym',
      amount: 15.99,
      cycle: 'monthly',
      next_renewal_on: '2026-10-09',
      category_id: 'fitness',
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      active: true,
    });
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
    expect(success).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('still counts words typed before a visit to another page, and shows them', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await searchService(screen, 'Town Gym');

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');
    expect(screen.getByDisplayValue('Town Gym')).toBeTruthy();
    await answerTheRest(screen);
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ brand_id: null, name: 'Town Gym' });
  });

  it('does not count spaces as a service', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await searchService(screen, '   ');
    await answerTheRest(screen);

    await press(screen, 'Save subscription');

    expect(screen.getByText(gaps('Service'))).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('saves the service that was picked, with its brand, not the words typed to find it', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');
    await answerTheRest(screen);

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: 'b-nf',
      name: 'Netflix',
      category_id: 'entertainment',
    });
  });

  it('accepts Skip as the answer to Charged to, and saves no card or account', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');
    await answerTheRest(screen, 'Skip');

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });

  it('lets Skip alone answer Charged to when there is no card or account', async () => {
    mockSources = [];
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');
    await answerTheRest(screen, 'Skip');

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });

  it('saves the card or the account that was chosen', async () => {
    const first = await render(<AddSubscriptionScreen />);
    await fillAmount(first);
    await chooseService(first, 'Net', 'Netflix');
    await answerTheRest(first);
    await press(first, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: 'card-1', bank_account_id: null });
    await first.unmount();

    const second = await render(<AddSubscriptionScreen />);
    await fillAmount(second);
    await chooseService(second, 'Net', 'Netflix');
    await answerTheRest(second, 'Checking ••0099');
    await press(second, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    expect(mockCreate.mock.calls[1][0]).toMatchObject({ card_id: null, bank_account_id: 'acct-1' });
  });

  it('accepts No reminder as the answer, and sets no reminder for the new subscription', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');
    await answerTheRest(screen);

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', null, '09:00');
  });

  it('sets the reminder that was chosen, at the time that was picked', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');
    await answerTheRest(screen);
    await press(screen, '1 week');
    await press(screen, 'Sent at 9:00 AM. Change the time.');
    await press(screen, 'PM');
    await press(screen, 'Confirm time');

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', 7, '21:00');
  });

  it('is greyed out only while it is saving', async () => {
    mockCreating = true;
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.getByLabelText('Saving…')).toBeDisabled();
    expect(screen.queryByLabelText('Save subscription')).toBeNull();
  });

  it('lets a saved subscription be saved as it stands, with the answers it already has', async () => {
    editing();
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      id: 'sub-1',
      values: {
        brand_id: 'b-sp',
        name: 'Spotify',
        amount: 11.99,
        cycle: 'monthly',
        next_renewal_on: '2026-10-10',
        card_id: null,
        bank_account_id: 'acct-1',
        note: 'Family plan',
        active: true,
      },
    });
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', null, '09:00');
    expect(screen.queryByText(/^To save this subscription/)).toBeNull();
  });

  it('saves the reminder an edit already has back as it was', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    editing();
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', 3, '08:30');
  });

  it('counts Skip on a saved subscription with no card or account as an answer', async () => {
    editing({ ...SPOTIFY, card_id: null, bank_account_id: null });
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
  });

  it('asks again for what a saved subscription’s service box was emptied of', async () => {
    editing();
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, changeService('Spotify'));
    await press(screen, 'Save changes');

    expect(screen.getByText(gaps('Service'))).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('asks a saved subscription that has no renewal day for one before it saves', async () => {
    editing({ ...SPOTIFY, next_renewal_on: null });
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText(NO_DAY)).toBeTruthy();

    await press(screen, 'Save changes');

    expect(screen.getByText(gaps('Next renewal'))).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();

    await pickDay(screen, NO_DAY, 'Friday 9 October 2026');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ next_renewal_on: '2026-10-09' });
  });
});

describe('Add subscription — deleting a saved subscription', () => {
  beforeEach(() => editing());

  it('shows Delete subscription with Save changes, and asks first', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Delete subscription')).toBeTruthy();
    expect(screen.getByLabelText('Delete this subscription')).toBeTruthy();

    mockConfirm.mockResolvedValueOnce(false);
    await press(screen, 'Delete this subscription');

    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'Delete this subscription?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('deletes the subscription once confirmed, and leaves', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Delete this subscription');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockDelete).toHaveBeenCalledWith('sub-1');
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('says Deleting… while the delete is in flight', async () => {
    mockUseDelete.mockImplementation(() => ({ mutateAsync: mockDelete, isPending: true }));
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Deleting…')).toBeTruthy();
    expect(screen.queryByText('Delete subscription')).toBeNull();
  });

  it('says the one failure line, and stays, when the delete fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockDelete.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Delete this subscription');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    onFinalPage(screen);
    log.mockRestore();
  });
});

describe('Add subscription — the final page keeps its place', () => {
  // The page's scroll view, found by the memory it was handed rather than by layout.
  const scroller = (screen: Screen) =>
    screen.container.queryAll((node) => node.props.scrollEventThrottle === 32)[0];
  const scrollTo = (screen: Screen, y: number) =>
    fireEvent.scroll(scroller(screen), { nativeEvent: { contentOffset: { x: 0, y } } });

  it('comes back from a line’s page where it was left, not at the top', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    expect(scroller(screen).props.contentOffset).toEqual({ x: 0, y: 0 });

    await scrollTo(screen, 380);
    await press(screen, 'Note, not set, optional');
    expect(screen.queryByText('You can edit this later.')).toBeNull();
    await press(screen, 'Back');
    onFinalPage(screen);
    expect(scroller(screen).props.contentOffset).toEqual({ x: 0, y: 380 });

    await scrollTo(screen, 120);
    await pressButton(screen, 'Amount, $15.99');
    await press(screen, 'Back');
    expect(scroller(screen).props.contentOffset).toEqual({ x: 0, y: 120 });
  });
});
