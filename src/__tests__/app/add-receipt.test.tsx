import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';

import AddReceiptScreen from '@/app/add-receipt';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The receipt form as a person walks it. A blank receipt opens on the amount page and Continue
 * lands on the one final page; every line of that page opens a page for that one thing and comes
 * back. Real pages throughout (keypad, calendar, store field, card tiles); only the network, the
 * native scanner and the logo images are replaced.
 *
 * Also: when the receipt to edit cannot be read the editor must not fall back to a create (that
 * would file a second copy of a receipt that is still there): failed, gone and still loading are
 * three different answers and none is "add one".
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));

// The logo a mark drew, readable as text: "Corner Deli|cornerdeli.com", or "Corner Deli|" for letters.
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

let mockRecognition = false;
jest.mock('../../../modules/receipt-scanner', () => ({
  hasLayoutRecognition: () => true,
  captureReceipt: jest.fn(),
  isCaptureAvailable: () => false,
  isRecognitionAvailable: () => mockRecognition,
  isScanningAvailable: () => false,
  recognizeReceipt: jest.fn(),
  recognizeText: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
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

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockUseUpdate = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
const mockUseCreate = jest.fn(() => ({ mutateAsync: mockCreate, isPending: false }));
const mockUseDelete = jest.fn(() => ({ mutateAsync: mockDelete, isPending: false }));

jest.mock('@/api/mutations', () => ({
  useUpdateReceipt: () => mockUseUpdate(),
  useCreateReceipt: () => mockUseCreate(),
  useDeleteReceipt: () => mockUseDelete(),
}));

const BRANDS = [
  { id: 'b-wf', name: 'Whole Foods', domain: 'wholefoods.com', category_id: 'groceries' },
  { id: 'b-ap', name: 'Apple Store', domain: 'apple.com', category_id: 'electronics' },
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
      { id: 'groceries', label: 'Groceries', hint: null },
      { id: 'other', label: 'Other', hint: null },
    ],
  }),
}));

jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: null, isLoading: false, isFetching: false }),
}));

const SOURCES = [
  { id: 'card-1', label: 'VISA ••4821', color: '#111111', kind: 'card' },
  { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
];
let mockSources: typeof SOURCES = SOURCES;

let mockReceipt: { data: unknown; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useReceipt: () => ({ ...mockReceipt, refetch: mockRefetch }),
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

const GREENGROCER = {
  id: 'receipt-1',
  merchant: 'Greengrocer',
  amount: 12.4,
  purchased_on: '2026-09-10',
  category_id: 'other',
  brand_id: null,
  card_id: null,
  bank_account_id: null,
  note: null,
  source: 'manual',
  brands: null,
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

/** Types into the store box the way a finger does: a tap into it, then the letters. */
async function searchStore(screen: Screen, text: string) {
  const input = screen.getByPlaceholderText('Search for a store');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Searches the store box on the final page and taps the catalogue result of that name. */
async function chooseStore(screen: Screen, search: string, result: string) {
  await searchStore(screen, search);
  await fireEvent.press(await screen.findByLabelText(result));
}

/** A typed receipt, as far as its final page. */
async function fillAmount(screen: Screen, amount = '49.11') {
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
}

const onAmountPage = (screen: Screen) => {
  expect(screen.getByText('How much did you spend?')).toBeTruthy();
  expect(screen.getByLabelText('Continue')).toBeTruthy();
  expect(screen.queryByText('You can edit this later.')).toBeNull();
};
const onFinalPage = (screen: Screen) => {
  expect(screen.getByText('You can edit this later.')).toBeTruthy();
  expect(screen.queryByText('How much did you spend?')).toBeNull();
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
  mockRecognition = false;
  mockSources = SOURCES;
  mockReceipt = { data: null, isError: false, isFetched: false };
  mockConfirm.mockResolvedValue(true);
  mockDelete.mockResolvedValue(undefined);
  backHandlers.clear();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.add(handler);
    return { remove: () => void backHandlers.delete(handler) };
  });
});

afterAll(() => jest.restoreAllMocks());

describe('Add receipt — an edit whose receipt could not be read', () => {
  beforeEach(() => {
    mockParams = { id: 'receipt-1' };
  });

  it('says so instead of quietly becoming a second copy of the receipt', async () => {
    mockReceipt = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddReceiptScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit receipt')).toBeNull();
    expect(queryByText('Add a receipt')).toBeNull();
    expect(queryByText('Continue')).toBeNull();
    expect(queryByText('Save changes')).toBeNull();
    expect(queryByText('Save receipt')).toBeNull();

    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('tries the read again from the failure page', async () => {
    mockReceipt = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Try again');
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Go back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('holds the skeleton while the read is still running', async () => {
    const { getByText, queryByText } = await render(<AddReceiptScreen />);

    expect(getByText('Edit receipt')).toBeTruthy();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(queryByText('Save changes')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
  });

  it('opens on the final page, filled in, once the receipt is in hand', async () => {
    mockReceipt = { data: GREENGROCER, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Edit receipt')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Amount, $12.40' })).toBeTruthy();
    expect(screen.getByLabelText('Change store, currently Greengrocer')).toBeTruthy();
    expect(screen.getByText('Filed under Other')).toBeTruthy();
    expect(screen.getByLabelText('Date, Thu Sep 10')).toBeTruthy();
    expect(screen.getByLabelText('Save changes')).toBeTruthy();
    expect(screen.queryByText('How much did you spend?')).toBeNull();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockUseUpdate).toHaveBeenCalled();
  });

  it('says the receipt is gone when the read lands empty', async () => {
    mockReceipt = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddReceiptScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(queryByText('Edit receipt')).toBeNull();
    expect(queryByText('Add a receipt')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
  });
});

describe('Add receipt — the amount page', () => {
  it('opens a new receipt on the amount, with no step dots', async () => {
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Add a receipt')).toBeTruthy();
    onAmountPage(screen);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByLabelText(/^Step \d/)).toBeNull();
    expect(screen.queryByLabelText('Save receipt')).toBeNull();
  });

  it('holds Continue back until there is an amount above zero, to the cent', async () => {
    const screen = await render(<AddReceiptScreen />);
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

  it('Continue lands on the final page with the amount, an empty store box, and Save held back', async () => {
    const screen = await render(<AddReceiptScreen />);

    await fillAmount(screen, '1030.5');

    onFinalPage(screen);
    expect(screen.queryByLabelText('Continue')).toBeNull();
    expect(screen.getByRole('button', { name: 'Amount, $1,030.50' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('shows Scan and Upload only where the phone can read a receipt', async () => {
    const without = await render(<AddReceiptScreen />);
    expect(without.queryByLabelText('Scan')).toBeNull();
    expect(without.queryByLabelText('Upload')).toBeNull();
    await without.unmount();

    mockRecognition = true;
    const withIt = await render(<AddReceiptScreen />);
    expect(withIt.getByLabelText('Scan')).toBeTruthy();
    expect(withIt.getByLabelText('Upload')).toBeTruthy();
  });

  it('Back leaves the form, and close asks before it throws the receipt away', async () => {
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Back');
    expect(router.back).toHaveBeenCalledTimes(1);

    (router.back as jest.Mock).mockClear();
    mockConfirm.mockResolvedValueOnce(false);
    await press(screen, 'Close');
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cancel adding this receipt?' }),
    );
    expect(router.back).not.toHaveBeenCalled();

    await press(screen, 'Close');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  });
});

describe('Add receipt — the final page', () => {
  it('says what each line holds, and that it can be edited later', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Amount, $49.11' }).props.accessibilityHint).toBe(
      'Tap to edit',
    );
    expect(screen.getByText('Tap to edit')).toBeTruthy();

    // Only the store is required, and it is a box to type in rather than a red error.
    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
    expect(screen.queryByText('Tap to add')).toBeNull();
    expect(screen.queryByLabelText(/^Store, /)).toBeNull();

    expect(screen.getByLabelText('Date, Today, Wed Oct 7')).toBeTruthy();
    expect(screen.getByLabelText('Paid with, not set, optional')).toBeTruthy();
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
    expect(screen.getByLabelText('Note, not set, optional').props.accessibilityHint).toBe(
      'Opens note to change it.',
    );
    expect(screen.getByText('Add a note')).toBeTruthy();

    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByLabelText('Delete this receipt')).toBeNull();
    // One page, however many lines: nothing to count.
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('holds Save back until there is an amount and a store', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();

    await chooseStore(screen, 'Whole', 'Whole Foods');

    expect(screen.getByLabelText('Change store, currently Whole Foods')).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();
  });

  it('draws a missing amount as a gap to fill, never $0, and holds Save back', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedRead: 'store' };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(screen.queryByText(/\$0/)).toBeNull();
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();

    await press(screen, 'Amount, needed');
    await typeAmount(screen, '7');
    await press(screen, 'Done');
    expect(screen.getByRole('button', { name: 'Amount, $7.00' })).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();
  });
});

describe('Add receipt — the amount line', () => {
  it('opens the keypad page, and Done waits while the amount is zero', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await pressButton(screen, 'Amount, $49.11');
    expect(screen.getByText('How much did you spend?')).toBeTruthy();
    expect(screen.queryByLabelText('Continue')).toBeNull();
    expect(screen.queryByText('You can edit this later.')).toBeNull();
    expect(screen.getByLabelText('Done')).toBeEnabled();

    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    expect(screen.getByLabelText('Done')).toBeDisabled();
    await typeAmount(screen, '0');
    expect(screen.getByLabelText('Done')).toBeDisabled();
  });

  it('Done writes the new amount to the cent and returns to the final page', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await pressButton(screen, 'Amount, $49.11');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '0.10');
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $0.10' })).toBeTruthy();
  });

  it('Back leaves the amount as it was', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await pressButton(screen, 'Amount, $49.11');
    // A figure already at two decimals takes no more keys, so clear it to have something to discard.
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '9');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $49.11' })).toBeTruthy();
  });
});

describe('Add receipt — the store box', () => {
  it('is a search box in the card, not a line that opens a page', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    onFinalPage(screen);
    expect(screen.getByText('Store')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
    expect(screen.queryByLabelText(/^Store, /)).toBeNull();
    expect(screen.queryByText('Where did you buy it?')).toBeNull();
    expect(screen.queryByText('Filed under', { exact: false })).toBeNull();
  });

  it('lists the results inline, and a pick sets the store at once, with no Done', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await searchStore(screen, 'Whole');
    expect(await screen.findByLabelText('Whole Foods')).toBeTruthy();
    // A name the catalogue does not list can always be added, as the last row.
    expect(screen.getByLabelText('Add Whole as a new store')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Whole Foods'));

    onFinalPage(screen);
    expect(screen.queryByLabelText('Done')).toBeNull();
    expect(screen.queryByPlaceholderText('Search for a store')).toBeNull();
    expect(screen.getByLabelText('Change store, currently Whole Foods')).toBeTruthy();
    expect(screen.getByText('Filed under Groceries')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Whole Foods|wholefoods.com');
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();
  });

  it('its X clears the store: the box comes back, the category line goes, Save is held', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);
    await chooseStore(screen, 'Whole', 'Whole Foods');

    await press(screen, 'Change store, currently Whole Foods');

    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
    expect(screen.queryByText('Filed under', { exact: false })).toBeNull();
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();
  });

  it('adds a store the catalogue does not know, filed by its name, with the logo question inline', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await searchStore(screen, 'Planet Fitness');
    await press(screen, 'Add Planet Fitness as a new store');

    onFinalPage(screen);
    expect(screen.getByLabelText('Change store, currently Planet Fitness')).toBeTruthy();
    expect(screen.getByText('Filed under Fitness & Wellness')).toBeTruthy();
    // The lookup is unsure, so there is no card, only the quiet way to add a website.
    expect(screen.getByLabelText('Add a website')).toBeTruthy();
    expect(screen.queryByLabelText('Change logo')).toBeNull();
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();
  });

  it('files a store the keywords cannot place under Other', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await searchStore(screen, 'Zed Zed');
    await press(screen, 'Add Zed Zed as a new store');

    expect(screen.getByText('Filed under Other')).toBeTruthy();
  });

  it('replaces the store when another is picked after the X, leaving nothing of the first', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Change store, currently Whole Foods');
    await chooseStore(screen, 'Apple', 'Apple Store');

    onFinalPage(screen);
    expect(screen.getByLabelText('Change store, currently Apple Store')).toBeTruthy();
    expect(screen.queryByText('Whole Foods')).toBeNull();
    expect(screen.getByText('Filed under Electronics')).toBeTruthy();
  });
});

describe('Add receipt — the date line', () => {
  it('Today and Yesterday set the day in one tap, and the right chip lights', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    expect(isChecked(screen, 'Today')).toBe(true);
    expect(isChecked(screen, 'Yesterday')).toBe(false);
    expect(isChecked(screen, 'Pick date')).toBe(false);

    await press(screen, 'Yesterday');
    onFinalPage(screen);
    expect(screen.getByLabelText('Date, Yesterday, Tue Oct 6')).toBeTruthy();
    expect(isChecked(screen, 'Today')).toBe(false);
    expect(isChecked(screen, 'Yesterday')).toBe(true);

    await press(screen, 'Today');
    expect(screen.getByLabelText('Date, Today, Wed Oct 7')).toBeTruthy();
    expect(isChecked(screen, 'Today')).toBe(true);
  });

  it('Pick date opens the calendar page, and Done keeps the day with "Pick date" lit', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await press(screen, 'Pick date');
    expect(screen.getByText('When was it?')).toBeTruthy();
    expect(screen.queryByText('You can edit this later.')).toBeNull();

    await press(screen, 'Previous month');
    await press(screen, 'Monday 28 September 2026');
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByLabelText('Date, Mon Sep 28')).toBeTruthy();
    expect(isChecked(screen, 'Pick date')).toBe(true);
    expect(isChecked(screen, 'Today')).toBe(false);
    expect(isChecked(screen, 'Yesterday')).toBe(false);
  });

  it('the date line opens the same page, and Back leaves the day as it was', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);
    await press(screen, 'Yesterday');

    await press(screen, 'Date, Yesterday, Tue Oct 6');
    expect(screen.getByText('When was it?')).toBeTruthy();
    await press(screen, 'Previous month');
    await press(screen, 'Monday 28 September 2026');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByLabelText('Date, Yesterday, Tue Oct 6')).toBeTruthy();
    expect(isChecked(screen, 'Yesterday')).toBe(true);
  });
});

describe('Add receipt — the paid-with line', () => {
  it('is not shown when there is no card or account to pick', async () => {
    mockSources = [];
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    onFinalPage(screen);
    expect(screen.queryByLabelText(/^Paid with/)).toBeNull();
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
  });

  it('Done writes the card to the line; "No card or account" clears it again', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await press(screen, 'Paid with, not set, optional');
    expect(screen.getByText('What did you pay with?')).toBeTruthy();
    expect(screen.queryByLabelText('No card or account')).toBeNull();
    await press(screen, 'VISA ••4821');
    expect(isChecked(screen, 'VISA ••4821')).toBe(true);
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByLabelText('Paid with, VISA ••4821')).toBeTruthy();

    await press(screen, 'Paid with, VISA ••4821');
    expect(isChecked(screen, 'VISA ••4821')).toBe(true);
    await press(screen, 'No card or account');
    expect(isChecked(screen, 'VISA ••4821')).toBe(false);
    expect(screen.queryByLabelText('No card or account')).toBeNull();
    await press(screen, 'Done');

    expect(screen.getByLabelText('Paid with, not set, optional')).toBeTruthy();
  });

  it('Back leaves the card as it was', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await press(screen, 'Paid with, not set, optional');
    await press(screen, 'Checking ••0099');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByLabelText('Paid with, not set, optional')).toBeTruthy();
  });
});

describe('Add receipt — the note line', () => {
  it('asks to "Add a note", then shows the note once Done writes it', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);
    expect(screen.getByText('Add a note')).toBeTruthy();

    await press(screen, 'Note, not set, optional');
    expect(screen.queryByText('You can edit this later.')).toBeNull();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Anything worth remembering'),
      'Weekly shop',
    );
    await press(screen, 'Done');

    onFinalPage(screen);
    expect(screen.getByLabelText('Note, Weekly shop')).toBeTruthy();
    expect(screen.getByText('Weekly shop')).toBeTruthy();
    expect(screen.queryByText('Add a note')).toBeNull();
  });

  it('a note of spaces is no note', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(screen.getByPlaceholderText('Anything worth remembering'), '   ');
    await press(screen, 'Done');

    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
    expect(screen.getByText('Add a note')).toBeTruthy();
  });

  it('Back leaves the note as it was', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(screen.getByPlaceholderText('Anything worth remembering'), 'Oops');
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
  });
});

describe('Add receipt — one-field pages', () => {
  it('have Back but nothing to close: one field has nothing to throw away', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen);

    expect(screen.getByLabelText('Close')).toBeTruthy();
    await press(screen, 'Note, not set, optional');
    expect(screen.getByLabelText('Back')).toBeTruthy();
    expect(screen.queryByLabelText('Close')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('leave the swipe-back gesture off, so a swipe cannot throw the form away', async () => {
    const screen = await render(<AddReceiptScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

    await fillAmount(screen);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });

    await press(screen, 'Note, not set, optional');
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
  });
});

describe('Add receipt — Back from the final page', () => {
  it('goes to the amount page for a receipt typed by hand, the amount kept', async () => {
    const screen = await render(<AddReceiptScreen />);
    await fillAmount(screen, '15.99');

    await press(screen, 'Back');

    onAmountPage(screen);
    expect(router.back).not.toHaveBeenCalled();
    await press(screen, 'Continue');
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
  });

  it('is the hardware back too: the form steps back, then the system takes over', async () => {
    const screen = await render(<AddReceiptScreen />);
    // First page: left to the system, so the screen is popped.
    expect(await hardwareBack()).toBe(false);

    await fillAmount(screen);
    expect(await hardwareBack()).toBe(true);
    onAmountPage(screen);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('leaves the form for an edit, where the final page is the first', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: GREENGROCER, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
    expect(await hardwareBack()).toBe(false);

    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    onFinalPage(screen);
  });

  it.each([
    ['a scan that arrived as params', { scannedStore: 'Corner Deli', scannedAmount: '12' }],
    [
      'a voice hand-off',
      { scannedStore: 'Corner Deli', scannedAmount: '12', scannedVia: 'voice', from: 'voice' },
    ],
  ])('leaves the form for %s', async (_, params) => {
    mockParams = params;
    const screen = await render(<AddReceiptScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
    expect(await hardwareBack()).toBe(false);

    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    onFinalPage(screen);
  });

  it('asks before close throws an edit away', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: GREENGROCER, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    mockConfirm.mockResolvedValueOnce(false);
    await press(screen, 'Close');

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cancel editing this receipt?' }),
    );
    expect(router.back).not.toHaveBeenCalled();
    onFinalPage(screen);
  });

  it('from a one-field page returns to the final page, never out of the form', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: GREENGROCER, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Note, not set, optional');
    expect(await hardwareBack()).toBe(true);

    onFinalPage(screen);
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Add receipt — deleting a saved receipt', () => {
  beforeEach(() => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: GREENGROCER, isError: false, isFetched: true };
  });

  it('shows Delete receipt with Save changes, and asks first', async () => {
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Delete receipt')).toBeTruthy();
    expect(screen.getByLabelText('Delete this receipt')).toBeTruthy();

    mockConfirm.mockResolvedValueOnce(false);
    await press(screen, 'Delete this receipt');

    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'Delete this receipt?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('deletes the receipt once confirmed, and leaves', async () => {
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Delete this receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockDelete).toHaveBeenCalledWith('receipt-1');
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('says the one failure line, and stays, when the delete fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockDelete.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Delete this receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    onFinalPage(screen);
    log.mockRestore();
  });
});
