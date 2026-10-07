import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';

import AddSubscriptionScreen from '@/app/add-subscription';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The subscription form as a person walks it. A blank subscription opens on the amount page and
 * Continue lands on the one final page; every line of that page opens a page for that one thing and
 * comes back. Real pages throughout (keypad, calendar, service field, source tiles, reminder
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
const mockUseUpdate = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
const mockUseCreate = jest.fn(() => ({ mutateAsync: mockCreate, isPending: false }));
const mockUseDelete = jest.fn(() => ({ mutateAsync: mockDelete, isPending: false }));

jest.mock('@/api/mutations', () => ({
  useUpdateSubscription: () => mockUseUpdate(),
  useCreateSubscription: () => mockUseCreate(),
  useDeleteSubscription: () => mockUseDelete(),
}));

// The real chips and wording; only the two hooks that read and write the reminder are replaced.
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
let mockSavedReminder = { choice: 'off', remindAt: '09:00' };
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useReminderChoice: () => mockSavedReminder,
  useApplyReminder: () => jest.fn(async () => {}),
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

/** A typed subscription, as far as its final page. */
async function fillAmount(screen: Screen, amount = '15.99') {
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
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
  mockSavedReminder = { choice: 'off', remindAt: '09:00' };
  mockSubscription = { data: null, isError: false, isFetched: false };
  mockConfirm.mockResolvedValue(true);
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
    expect(screen.getByLabelText('Next renewal, Sat Oct 10')).toBeTruthy();
    expect(screen.getByLabelText('Charged to, Checking ••0099')).toBeTruthy();
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

  it('Continue lands on the final page with the amount, a service still to add, and Save held back', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await fillAmount(screen, '1030.5');

    onFinalPage(screen);
    expect(screen.queryByLabelText('Continue')).toBeNull();
    expect(screen.getByRole('button', { name: 'Amount, $1,030.50' })).toBeTruthy();
    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByLabelText(/^Change store/)).toBeNull();
    expect(screen.getByLabelText('Save subscription')).toBeDisabled();
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
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
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

    // Only the service is required: a search box on the page itself, not a red error.
    expect(screen.getByText('Service')).toBeTruthy();
    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByText(/^Filed under/)).toBeNull();

    // The cycle row has its chips as the whole control, and monthly until told otherwise.
    expect(screen.getByText('Billing cycle')).toBeTruthy();
    expect(isChecked(screen, 'Monthly')).toBe(true);

    expect(screen.getByLabelText('Next renewal, not set, optional')).toBeTruthy();
    expect(screen.getByText('Next renewal · Optional')).toBeTruthy();
    // The renewal and the card both have nothing yet.
    expect(screen.getAllByText('Not set')).toHaveLength(2);
    expect(screen.getByLabelText('Charged to, not set, optional')).toBeTruthy();
    expect(screen.getByLabelText('Reminder, not set, optional')).toBeTruthy();
    expect(screen.getByText('Off')).toBeTruthy();
    expect(screen.getByLabelText('Note, not set, optional').props.accessibilityHint).toBe(
      'Opens note to change it.',
    );
    expect(screen.getByText('Add a note')).toBeTruthy();

    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByLabelText('Delete this subscription')).toBeNull();
    expect(screen.queryByText('Status')).toBeNull();
  });

  it('holds Save back until there is an amount and a service', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    expect(screen.getByLabelText('Save subscription')).toBeDisabled();

    await chooseService(screen, 'Net', 'Netflix');

    expect(screen.getByLabelText(changeService('Netflix'))).toBeTruthy();
    expect(screen.getByLabelText('Save subscription')).toBeEnabled();
  });

  it('draws a missing amount as a gap to fill, never $0, and holds Save back', async () => {
    mockParams = { from: 'voice', prefillName: 'Netflix' };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(screen.queryByText(/\$0/)).toBeNull();
    expect(screen.getByLabelText('Save subscription')).toBeDisabled();

    await press(screen, 'Amount, needed');
    await typeAmount(screen, '7');
    await press(screen, 'Done');
    expect(screen.getByRole('button', { name: 'Amount, $7.00' })).toBeTruthy();
    expect(screen.getByLabelText('Save subscription')).toBeEnabled();
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
    expect(screen.getByLabelText('Save subscription')).toBeDisabled();

    await chooseService(screen, 'Net', 'Netflix');

    onFinalPage(screen);
    expect(screen.queryByLabelText('Done')).toBeNull();
    expect(screen.queryByPlaceholderText(SERVICE_PLACEHOLDER)).toBeNull();
    expect(screen.getByLabelText(changeService('Netflix'))).toBeTruthy();
    expect(screen.getByText('Filed under Entertainment')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Netflix|netflix.com');
    expect(screen.getByLabelText('Save subscription')).toBeEnabled();
  });

  it('files a service the catalogue does not know by the words in its name', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await searchService(screen, 'Zed Zed');
    await fireEvent.press(screen.getByText('Add “Zed Zed”'));

    onFinalPage(screen);
    expect(screen.getByLabelText(changeService('Zed Zed'))).toBeTruthy();
    expect(screen.getByText('Filed under Other')).toBeTruthy();
    expect(screen.getByLabelText('Save subscription')).toBeEnabled();
  });

  it('files a catalogue service under the category the catalogue gives it', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await chooseService(screen, 'Git', 'GitHub');

    expect(screen.getByText('Filed under Apps & Software')).toBeTruthy();
  });

  it('lets go of the service with its X, and holds Save back again', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);
    await chooseService(screen, 'Net', 'Netflix');

    await press(screen, changeService('Netflix'));

    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByText(/^Filed under/)).toBeNull();
    expect(screen.getByLabelText('Save subscription')).toBeDisabled();
  });

  it('shows a saved subscription’s service already chosen, with its category and logo', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
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
});

describe('Add subscription — the billing cycle line', () => {
  it('is no button: the four chips under it are the whole control, monthly to begin with', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    expect(screen.queryByLabelText(/^Billing cycle/)).toBeNull();
    for (const chip of ['Weekly', 'Monthly', 'Quarterly', 'Yearly']) {
      expect(screen.getByLabelText(chip).props.accessibilityRole).toBe('radio');
    }
    expect(isChecked(screen, 'Weekly')).toBe(false);
    expect(isChecked(screen, 'Monthly')).toBe(true);
    expect(isChecked(screen, 'Quarterly')).toBe(false);
    expect(isChecked(screen, 'Yearly')).toBe(false);
  });

  it('changes the cycle in one tap, without leaving the final page', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    for (const chip of ['Yearly', 'Weekly', 'Quarterly', 'Monthly']) {
      await press(screen, chip);
      onFinalPage(screen);
      for (const other of ['Weekly', 'Monthly', 'Quarterly', 'Yearly']) {
        expect(isChecked(screen, other)).toBe(other === chip);
      }
    }
  });

  it('shows the cycle the saved subscription has', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = {
      data: { ...SPOTIFY, cycle: 'quarterly' },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddSubscriptionScreen />);

    expect(isChecked(screen, 'Quarterly')).toBe(true);
    expect(isChecked(screen, 'Monthly')).toBe(false);
  });
});

describe('Add subscription — the next-renewal line', () => {
  it('is optional: the page opens with nothing picked and Done is allowed', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Next renewal, not set, optional');
    expect(screen.getByText('When does it renew?')).toBeTruthy();
    expect(screen.queryByText('You can edit this later.')).toBeNull();
    expect(screen.getByLabelText('Done')).toBeEnabled();
    expect(screen.getByLabelText('No renewal date')).toBeTruthy();

    await press(screen, 'Done');
    onFinalPage(screen);
    expect(screen.getByLabelText('Next renewal, not set, optional')).toBeTruthy();
  });

  it('Done writes the day picked to the line, in the words of the page', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Next renewal, not set, optional');
    await press(screen, 'Next month');
    await press(screen, 'Friday 6 November 2026');
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByLabelText('Next renewal, Fri Nov 6')).toBeTruthy();
  });

  it('names today and yesterday as such', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Next renewal, not set, optional');
    await press(screen, 'Today, Wednesday 7 October 2026');
    await press(screen, 'Done');
    expect(screen.getByLabelText('Next renewal, Today, Wed Oct 7')).toBeTruthy();

    await press(screen, 'Next renewal, Today, Wed Oct 7');
    await press(screen, 'Tuesday 6 October 2026');
    await press(screen, 'Done');
    expect(screen.getByLabelText('Next renewal, Yesterday, Tue Oct 6')).toBeTruthy();
  });

  it('"No renewal date" clears a day that was set and returns at once', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Next renewal, Sat Oct 10')).toBeTruthy();

    await press(screen, 'Next renewal, Sat Oct 10');
    await press(screen, 'No renewal date');

    onFinalPage(screen);
    expect(screen.getByLabelText('Next renewal, not set, optional')).toBeTruthy();
    expect(screen.queryByLabelText('Next renewal, Sat Oct 10')).toBeNull();
  });

  it('Back leaves the day as it was', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Next renewal, Sat Oct 10');
    await press(screen, 'Next month');
    await press(screen, 'Friday 6 November 2026');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByLabelText('Next renewal, Sat Oct 10')).toBeTruthy();
  });
});

describe('Add subscription — the charged-to line', () => {
  it('is not shown when there is no card or account to pick', async () => {
    mockSources = [];
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    onFinalPage(screen);
    expect(screen.queryByLabelText(/^Charged to/)).toBeNull();
    expect(screen.queryByText(/^Charged to/)).toBeNull();
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
  });

  it('Done writes the card to the line; "No card or account" clears it again', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Charged to, not set, optional');
    expect(screen.getByText('What did you pay with?')).toBeTruthy();
    expect(screen.queryByLabelText('No card or account')).toBeNull();
    await press(screen, 'VISA ••4421');
    expect(isChecked(screen, 'VISA ••4421')).toBe(true);
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByLabelText('Charged to, VISA ••4421')).toBeTruthy();

    await press(screen, 'Charged to, VISA ••4421');
    expect(isChecked(screen, 'VISA ••4421')).toBe(true);
    await press(screen, 'No card or account');
    expect(isChecked(screen, 'VISA ••4421')).toBe(false);
    expect(screen.queryByLabelText('No card or account')).toBeNull();
    await press(screen, 'Done');

    expect(screen.getByLabelText('Charged to, not set, optional')).toBeTruthy();
  });

  it('Back leaves the card as it was', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Charged to, not set, optional');
    await press(screen, 'Checking ••0099');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByLabelText('Charged to, not set, optional')).toBeTruthy();
  });
});

describe('Add subscription — the reminder line', () => {
  it('starts off, and the page offers the five choices with the clock only once there is one', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Reminder, not set, optional');
    expect(screen.queryByText('You can edit this later.')).toBeNull();
    expect(screen.getByText('Before it renews')).toBeTruthy();
    for (const chip of ['Off', 'On the day', '1 day', '3 days', '1 week']) {
      expect(screen.getByLabelText(chip).props.accessibilityRole).toBe('radio');
    }
    expect(isChecked(screen, 'Off')).toBe(true);
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();

    await press(screen, '3 days');
    expect(isChecked(screen, '3 days')).toBe(true);
    expect(isChecked(screen, 'Off')).toBe(false);
    expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
  });

  it('Done writes the lead and the time to the line', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Reminder, not set, optional');
    await press(screen, '3 days');
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByLabelText('Reminder, 3 days before · 9:00 AM')).toBeTruthy();
    expect(screen.queryByText('Off')).toBeNull();
  });

  it('says "On the day" without a "before"', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Reminder, not set, optional');
    await press(screen, 'On the day');
    await press(screen, 'Done');

    expect(screen.getByLabelText('Reminder, On the day · 9:00 AM')).toBeTruthy();
  });

  it('keeps the time picked on the clock', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Reminder, not set, optional');
    await press(screen, '1 week');
    await press(screen, 'Sent at 9:00 AM. Change the time.');
    await press(screen, 'PM');
    await press(screen, 'Confirm time');
    expect(screen.getByLabelText('Sent at 9:00 PM. Change the time.')).toBeTruthy();
    await press(screen, 'Done');

    expect(screen.getByLabelText('Reminder, 1 week before · 9:00 PM')).toBeTruthy();
  });

  it('Off puts the line back to "Off"', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Reminder, 3 days before · 8:30 AM')).toBeTruthy();

    await press(screen, 'Reminder, 3 days before · 8:30 AM');
    expect(isChecked(screen, '3 days')).toBe(true);
    await press(screen, 'Off');
    await press(screen, 'Done');

    expect(screen.getByLabelText('Reminder, not set, optional')).toBeTruthy();
    expect(screen.getByText('Off')).toBeTruthy();
  });

  it('Back leaves the reminder as it was', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await fillAmount(screen);

    await press(screen, 'Reminder, not set, optional');
    await press(screen, '1 week');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByLabelText('Reminder, not set, optional')).toBeTruthy();
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
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
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
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
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
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: { ...SPOTIFY, active: false }, isError: false, isFetched: true };
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
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
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
    };
    const screen = await render(<AddSubscriptionScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
    expect(await hardwareBack()).toBe(false);

    // Heard, so it opens on the final page, already filled in.
    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
    expect(screen.getByLabelText(changeService('Netflix'))).toBeTruthy();
    expect(isChecked(screen, 'Yearly')).toBe(true);

    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    onFinalPage(screen);
  });

  it('from a one-field page returns to the final page, never out of the form', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Note, Family plan');
    expect(await hardwareBack()).toBe(true);

    onFinalPage(screen);
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Add subscription — deleting a saved subscription', () => {
  beforeEach(() => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
  });

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
