import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddReceiptScreen from '@/app/add-receipt';
import type { KnownStore } from '@/api/known-stores';
import { LOGO_COPY } from '@/components/brands/logo-choices';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { clearVoiceDraft } from '@/lib/voice-draft';

/**
 * Golden: exactly what the receipt form's Save writes. Pins the object handed to create/update, the
 * words of the checks inside Save, and where each kind of save goes afterwards.
 *
 * The pages are the real ones, walked the way a person walks them (keypad, store search, calendar,
 * card tiles, note); only the network and the logo images are replaced. The one exception is the
 * primary button, a stub that accepts a press even while disabled: the only way to reach the checks
 * inside Save, which the final page normally holds back. It still reports its disabled state.
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
jest.mock('@/lib/voice-draft', () => ({
  ...jest.requireActual('@/lib/voice-draft'),
  clearVoiceDraft: jest.fn(),
}));

jest.mock('@/components/ui/button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({
      label,
      onPress,
      disabled,
    }: {
      label: string;
      onPress: () => void;
      disabled?: boolean;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled) }}
        onPress={onPress}
      >
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

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

jest.mock('../../../modules/receipt-scanner', () => ({
  hasLayoutRecognition: () => true,
  captureReceipt: jest.fn(),
  isCaptureAvailable: () => false,
  isRecognitionAvailable: () => false,
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
    accentInk: '#000000',
    onControl: '#FFFFFF',
  }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => async () => undefined,
}));

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
let mockPending = false;
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: mockCreate, isPending: mockPending }),
  useUpdateReceipt: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
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
  useSpendCategories: () => ({ data: [] }),
}));

// What the logo service answers for a store the catalogue does not know.
const PLANET_FITNESS_LOGO = {
  matched: true,
  name: 'Planet Fitness',
  domain: 'planetfitness.com',
  confidence: 0.97,
  margin: 0.9,
  candidates: [],
};
// A store in our own logo list: found by its exact name, with nothing else close.
const BLUE_BOTTLE_LOGO = {
  matched: true,
  name: 'Blue Bottle Coffee',
  domain: 'bluebottlecoffee.com',
  confidence: 0.99,
  margin: 0.9,
  kind: 'alias',
  candidates: [{ domain: 'bluebottlecoffee.com', name: 'Blue Bottle Coffee', confidence: 0.99 }],
};
const mockLogoAnswer = jest.fn();

// The stores this person added before, and the answers written down for the next time.
let mockKnown: KnownStore[] = [];
const mockRemember = jest.fn(async (_store: KnownStore) => {});
jest.mock('@/api/known-stores', () => ({
  ...jest.requireActual('@/api/known-stores'),
  useKnownStores: () => mockKnown,
  useRememberStore: () => mockRemember,
}));

jest.mock('@/api/logos', () => ({
  useLogoMatch: (name: string) => ({
    data: mockLogoAnswer(name),
    isLoading: false,
    isFetching: false,
  }),
}));

let mockSources = [
  { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
  { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
];

let mockReceipt: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  // This month's receipts, which the free scan and upload allowances count.
  useReceipts: () => ({ data: [], isFetched: true, isError: false }),
  useReceipt: () => ({ ...mockReceipt, refetch: jest.fn() }),
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

const EXISTING = {
  id: 'receipt-1',
  brand_id: 'b-ap',
  merchant: 'Apple Store',
  amount: 1100,
  purchased_on: '2026-09-02',
  category_id: 'electronics',
  card_id: null,
  bank_account_id: 'acct-1',
  note: 'AppleCare',
  source: 'upload',
  image_path: null,
  brands: { domain: 'apple.com' },
};

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

/** The amount is a button on the page and a figure inside it, both worded alike: by role, the button. */
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
}

/** Types into the store box on the final page the way a finger does: a tap into it, then the letters. */
async function searchStore(screen: Screen, text: string) {
  const input = screen.getByPlaceholderText('Search for a store');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Searches the store box and taps the catalogue result: the pick is the store, there is no Done. */
async function chooseStore(screen: Screen, search: string, result: string) {
  await searchStore(screen, search);
  await fireEvent.press(await screen.findByLabelText(result));
}

/** Adds a store the catalogue does not know from the box, leaving its logo question open. */
async function addStore(screen: Screen, name: string) {
  await searchStore(screen, name);
  await press(screen, `Add ${name} as a new store`);
}

/** Opens the calendar from the final page and picks a day of last month or this one. */
async function pickDay(screen: Screen, label: string, lastMonth = false) {
  await press(screen, 'Pick date');
  if (lastMonth) await press(screen, 'Previous month');
  await press(screen, label);
  await press(screen, 'Done');
}

/** A receipt typed by hand: the amount, then the final page. */
async function typedReceipt(screen: Screen, amount: string) {
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
}

const NOTE_PLACEHOLDER = 'Anything worth remembering';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockPending = false;
  mockPro = { pro: true, ready: true };
  mockReceipt = { data: null, isError: false, isFetched: false };
  mockSources = [
    { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
    { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
  ];
  mockKnown = [];
  mockLogoAnswer.mockImplementation((name: string) =>
    name === 'Planet Fitness'
      ? PLANET_FITNESS_LOGO
      : name === 'Blue Bottle Coffee'
        ? BLUE_BOTTLE_LOGO
        : null,
  );
  mockCreate.mockResolvedValue({ id: 'receipt-new' });
  mockUpdate.mockResolvedValue(undefined);
});

describe('Add receipt — what a new receipt saves', () => {
  it('writes every field the flow collects, the note trimmed', async () => {
    const screen = await render(<AddReceiptScreen />);

    await typedReceipt(screen, '1030.5');
    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Paid with, not set, optional');
    await press(screen, 'Checking ••0099');
    await press(screen, 'Done');
    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), '  Weekly shop  ');
    await press(screen, 'Done');
    await pickDay(screen, 'Monday 28 September 2026', true);
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'b-wf',
      merchant: 'Whole Foods',
      amount: 1030.5,
      purchased_on: '2026-09-28',
      category_id: 'groceries',
      card_id: null,
      bank_account_id: 'acct-1',
      note: 'Weekly shop',
      source: 'manual',
      image_path: null,
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(clearVoiceDraft).not.toHaveBeenCalled();
  });

  it('fills the gaps with today, no source and no note', async () => {
    const screen = await render(<AddReceiptScreen />);

    await typedReceipt(screen, '0.10');
    await addStore(screen, 'Corner Deli');
    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), '   ');
    await press(screen, 'Done');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: null,
      merchant: 'Corner Deli',
      amount: 0.1,
      purchased_on: '2026-10-07',
      // A deli the catalogue does not know is filed by its name, not left blank.
      category_id: 'dining',
      card_id: null,
      bank_account_id: null,
      note: null,
      source: 'manual',
      image_path: null,
    });
  });

  it('files a store the keywords cannot place under Other', async () => {
    const screen = await render(<AddReceiptScreen />);

    await typedReceipt(screen, '8');
    await addStore(screen, 'Zed Zed');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Zed Zed',
      category_id: 'other',
    });
  });

  it('files a card under card_id and a source that is no longer there under neither', async () => {
    const screen = await render(<AddReceiptScreen />);

    await typedReceipt(screen, '15.99');
    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Paid with, not set, optional');
    await press(screen, 'VISA ••4421');
    await press(screen, 'Done');
    await pickDay(screen, 'Thursday 1 October 2026');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      amount: 15.99,
      purchased_on: '2026-10-01',
      card_id: 'card-1',
      bank_account_id: null,
    });

    // The card is deleted while the form is open: the choice no longer names anything.
    mockCreate.mockClear();
    mockSources = mockSources.filter((source) => source.id !== 'card-1');
    await screen.rerender(<AddReceiptScreen />);
    expect(screen.getByLabelText('Paid with, not set, optional')).toBeTruthy();
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });

  it.each([
    ['1100', 1100],
    ['15.99', 15.99],
    ['0.10', 0.1],
    ['1030.5', 1030.5],
  ])('saves a typed %s as exactly %p dollars', async (typed, saved) => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, typed);
    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(saved);
  });

  it('saves the amount as corrected on the amount line, not as first typed', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '49.11');
    await chooseStore(screen, 'Whole', 'Whole Foods');

    await pressButton(screen, 'Amount, $49.11');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '1100');
    await press(screen, 'Done');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(1100);
  });

  it('saves the day a chip set, in one tap', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12');
    await chooseStore(screen, 'Whole', 'Whole Foods');

    await press(screen, 'Yesterday');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].purchased_on).toBe('2026-10-06');
  });
});

describe('Add receipt — a scan that arrives as route params', () => {
  it('saves what was read, as a scan', async () => {
    mockParams = {
      scannedStore: "Trader Joe's",
      scannedBrandId: 'b-tj',
      scannedDomain: 'traderjoes.com',
      scannedCategory: 'groceries',
      scannedAmount: '15.99',
      scannedDate: '2026-09-28',
      scannedSource: 'card-1',
      scannedRead: 'store,amount,date,card',
    };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Read the store, amount, date and card.')).toBeTruthy();

    // Opens on the final page: only review and save.
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'b-tj',
      merchant: "Trader Joe's",
      amount: 15.99,
      purchased_on: '2026-09-28',
      category_id: 'groceries',
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      source: 'scan',
      image_path: null,
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('falls back to no brand, Other and today for what a scan did not carry', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedAmount: '1100' };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: null,
      merchant: 'Corner Deli',
      amount: 1100,
      purchased_on: '2026-10-07',
      category_id: 'other',
      card_id: null,
      bank_account_id: null,
      note: null,
      source: 'scan',
      image_path: null,
    });
  });

  it('saves the correction made on the final page, still as a scan', async () => {
    mockParams = {
      scannedStore: 'Corner Deli',
      scannedAmount: '12.5',
      scannedDate: '2026-09-28',
      scannedRead: 'store,amount,date',
    };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Yesterday');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      amount: 12.5,
      purchased_on: '2026-10-06',
      source: 'scan',
    });
  });
});

describe('Add receipt — a voice hand-off', () => {
  const HEARD = {
    scannedStore: 'Starbucks',
    scannedBrandId: 'b-sbux',
    scannedDomain: 'starbucks.com',
    scannedCategory: 'dining',
    scannedAmount: '12.5',
    scannedDate: '2026-10-05',
    scannedVia: 'voice',
    from: 'voice',
  };

  it('saves as a voice entry, then goes home and forgets what was said', async () => {
    mockParams = HEARD;
    const screen = await render(<AddReceiptScreen />);

    // The camera's "Read the…" report is not for something that was spoken.
    expect(screen.queryByText(/^Read the/)).toBeNull();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'b-sbux',
      merchant: 'Starbucks',
      amount: 12.5,
      purchased_on: '2026-10-05',
      category_id: 'dining',
      card_id: null,
      bank_account_id: null,
      note: null,
      source: 'voice',
      image_path: null,
    });
    expect(clearVoiceDraft).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('carries the note typed on the review page into the form and the saved row', async () => {
    mockParams = { ...HEARD, scannedNote: 'Lunch with Sam' };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Note, Lunch with Sam')).toBeTruthy();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ note: 'Lunch with Sam', source: 'voice' });
  });

  it('does not ask for the logo again when the review page already chose it', async () => {
    mockParams = {
      ...HEARD,
      scannedStore: 'Planet Fitness',
      scannedBrandId: undefined,
      scannedDomain: undefined,
      scannedCategory: 'fitness',
      scannedLogoDomain: 'planetfitness.com',
    };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Change store, currently Planet Fitness')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Planet Fitness|planetfitness.com');
    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.queryByLabelText(LOGO_COPY.changeLogo)).toBeNull();
  });

  it('carries the logo chosen on the review page into the saved row', async () => {
    mockParams = {
      ...HEARD,
      scannedStore: 'Planet Fitness',
      scannedBrandId: undefined,
      scannedDomain: undefined,
      scannedCategory: 'fitness',
      scannedLogoDomain: 'planetfitness.com',
    };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Planet Fitness',
      logo_domain: 'planetfitness.com',
      logo_hidden: false,
    });
  });

  it('keeps a voice entry on the form when the save fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    mockParams = HEARD;
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(clearVoiceDraft).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('Add receipt — what an edit saves', () => {
  it('writes the row back as it was, keeping how it was captured', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: EXISTING, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    // Opens on the final page, already filled in: Save is the first thing to press.
    expect(screen.getByLabelText('Save changes')).toBeEnabled();
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'receipt-1',
      values: {
        brand_id: 'b-ap',
        merchant: 'Apple Store',
        amount: 1100,
        purchased_on: '2026-09-02',
        category_id: 'electronics',
        card_id: null,
        bank_account_id: 'acct-1',
        note: 'AppleCare',
        source: 'upload',
        image_path: null,
      },
    });
  });

  it('moves the receipt from an account to a card without touching its source', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: { ...EXISTING, source: 'scan' }, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await pressButton(screen, 'Amount, $1,100.00');
    for (let i = 0; i < 4; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '1030.5');
    await press(screen, 'Done');

    await press(screen, 'Paid with, Checking ••0099');
    await press(screen, 'VISA ••4421');
    await press(screen, 'Done');

    await press(screen, 'Note, AppleCare');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), '');
    await press(screen, 'Done');

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      amount: 1030.5,
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      source: 'scan',
    });
  });

  it('clears the card with "No card or account"', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: EXISTING, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Paid with, Checking ••0099');
    await press(screen, 'No card or account');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
  });

  it('saves nothing from a page that was left with Back', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: EXISTING, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await pressButton(screen, 'Amount, $1,100.00');
    for (let i = 0; i < 4; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '5');
    await press(screen, 'Back');
    await press(screen, 'Note, AppleCare');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), 'Something else');
    await press(screen, 'Back');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ amount: 1100, note: 'AppleCare' });
  });
});

describe('Add receipt — the checks inside Save', () => {
  it('asks for the store before the amount, and says so on the final page', async () => {
    mockParams = { scannedRead: 'date', scannedDate: '2026-09-28' };
    const screen = await render(<AddReceiptScreen />);
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();

    await press(screen, 'Save receipt');

    expect(screen.getByText('Pick a store first.')).toBeTruthy();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('asks for the amount when the store is there', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedRead: 'store' };
    const screen = await render(<AddReceiptScreen />);
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();

    await press(screen, 'Save receipt');

    expect(screen.getByText('Enter how much you spent.')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not take a zero for an amount', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedRead: 'store' };
    const screen = await render(<AddReceiptScreen />);

    // The keypad page holds Done back at zero; the stub button lets the press through to prove
    // that Save would still refuse it.
    await press(screen, 'Amount, needed');
    expect(screen.getByLabelText('Done')).toHaveProp('accessibilityState', { disabled: true });
    await typeAmount(screen, '0');
    await press(screen, 'Done');
    await press(screen, 'Save receipt');

    expect(screen.getByText('Enter how much you spent.')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('says the one failure line above Save when the write fails, and stays', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);

    await typedReceipt(screen, '15.99');
    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(screen.getAllByText(FAILURE_MESSAGE)).toHaveLength(1);
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    log.mockRestore();
  });

  it('takes the failure line away again on the next try', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);

    await typedReceipt(screen, '15.99');
    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Save receipt');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });

  it('takes a failed save’s line away when the person steps back to the keypad', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');
    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Save receipt');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Back');
    expect(screen.getByText('How much did you spend?')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();

    await press(screen, 'Continue');
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    log.mockRestore();
  });

  it('takes a failed save’s line away once a page keeps a change', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');
    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Save receipt');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), 'Weekly shop');
    await press(screen, 'Done');

    expect(screen.getByLabelText('Note, Weekly shop')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    log.mockRestore();
  });

  it('says Saving… and holds Save while the write is in flight', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedAmount: '12' };
    mockPending = true;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Saving…')).toBeDisabled();
    expect(screen.queryByLabelText('Save receipt')).toBeNull();
  });
});

describe('Add receipt — the logo', () => {
  const PLANET = {
    brandId: null,
    name: 'Planet Fitness',
    domain: null,
    categoryId: 'fitness',
  };
  // A store the catalog does not know, given its logo on Change logo.
  const DELI = {
    ...EXISTING,
    brand_id: null,
    merchant: 'Corner Deli',
    brands: null,
    logo_domain: 'cornerdeli.com',
    logo_hidden: false,
  };

  /** Opens the saved receipt `row` for editing. */
  const editing = async (row: unknown = DELI) => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: row, isError: false, isFetched: true };
    return render(<AddReceiptScreen />);
  };

  /** A new receipt for a store the catalogue does not know; `answer` is what the logo card gets. */
  const saveNew = async (answer?: (screen: Screen) => Promise<unknown>) => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12');
    await addStore(screen, PLANET.name);
    await answer?.(screen);
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    return mockCreate.mock.calls[0][0];
  };

  it('saves the logo confirmed for a new store', async () => {
    const values = await saveNew(async (screen) => {
      expect(screen.getByText(/^Looks like/)).toBeTruthy();
      expect(screen.getByText('planetfitness.com')).toBeTruthy();
      await press(screen, LOGO_COPY.yes);
    });

    expect(values).toMatchObject({
      brand_id: null,
      merchant: 'Planet Fitness',
      category_id: 'fitness',
      logo_domain: 'planetfitness.com',
      logo_hidden: false,
    });
  });

  it('saves letters chosen for a new store', async () => {
    const values = await saveNew((screen) => press(screen, LOGO_COPY.letters));

    expect(values).toMatchObject({ logo_domain: null, logo_hidden: true });
  });

  it('writes no logo columns when nothing was chosen', async () => {
    const values = await saveNew();

    expect(values).toMatchObject({ brand_id: null, merchant: 'Planet Fitness' });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('asks the logo question under the box, and once answered offers Change logo, not the question', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12');
    await addStore(screen, PLANET.name);
    expect(screen.getByLabelText(LOGO_COPY.yes)).toBeTruthy();

    await press(screen, LOGO_COPY.yes);

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Planet Fitness|planetfitness.com');
    // A store not yet saved has no page of its own to change the logo on: this asks again, here.
    await press(screen, LOGO_COPY.changeLogo);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText(LOGO_COPY.yes)).toBeTruthy();
  });

  it('gives a store in our own logo list its logo with no question, and saves it', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12');
    await addStore(screen, 'Blue Bottle Coffee');

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.queryByText(/^Looks like/)).toBeNull();
    expect(screen.getByLabelText('Change store, currently Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent(
      'Blue Bottle Coffee|bluebottlecoffee.com',
    );
    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Blue Bottle Coffee',
      category_id: 'dining',
      logo_domain: 'bluebottlecoffee.com',
      logo_hidden: false,
    });
    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith(
      {
        name: 'Blue Bottle Coffee',
        categoryId: 'dining',
        logoDomain: 'bluebottlecoffee.com',
        logoHidden: false,
      },
      { teach: false },
    );
  });

  it('still asks when the service only half knows the name', async () => {
    mockLogoAnswer.mockImplementation(() => ({ ...BLUE_BOTTLE_LOGO, kind: 'fuzzy' }));
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12');
    await addStore(screen, 'Blue Botle Coffee');

    expect(screen.getByLabelText(LOGO_COPY.yes)).toBeTruthy();
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
  });

  it('offers a store added before first, with its logo, and asks nothing about it', async () => {
    mockKnown = [
      {
        name: 'Blue Bottle Coffee',
        categoryId: 'dining',
        logoDomain: 'old.example',
        logoHidden: false,
      },
    ];
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12');

    await searchStore(screen, 'Blue');
    await fireEvent.press(screen.getByLabelText('Blue Bottle Coffee'));

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Blue Bottle Coffee|old.example');
    expect(screen.getByText('Filed under Dining & Takeout')).toBeTruthy();
    expect(mockLogoAnswer).not.toHaveBeenCalledWith('Blue Bottle Coffee');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Blue Bottle Coffee',
      category_id: 'dining',
      logo_domain: 'old.example',
      logo_hidden: false,
    });
  });

  it('offers letters again when letters were the answer', async () => {
    mockKnown = [{ name: 'Corner Deli', categoryId: 'dining', logoDomain: null, logoHidden: true }];
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12');

    await searchStore(screen, 'corner');
    await fireEvent.press(screen.getByLabelText('Corner Deli'));
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      merchant: 'Corner Deli',
      logo_domain: null,
      logo_hidden: true,
    });
  });

  it('is not asked a second time: what was confirmed once is offered the next', async () => {
    const first = await render(<AddReceiptScreen />);
    await typedReceipt(first, '12');
    await addStore(first, 'Planet Fitness');
    await press(first, LOGO_COPY.yes);
    await press(first, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockRemember).toHaveBeenCalledTimes(1);
    const remembered = mockRemember.mock.calls[0][0];
    await first.unmount();

    // The phone has it now; the same name typed again is listed first and answered already.
    mockKnown = [remembered];
    mockCreate.mockClear();
    const second = await render(<AddReceiptScreen />);
    await typedReceipt(second, '14');
    await searchStore(second, 'planet');
    await fireEvent.press(second.getByLabelText('Planet Fitness'));

    expect(second.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(second.queryByText(/^Looks like/)).toBeNull();
    await press(second, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      merchant: 'Planet Fitness',
      amount: 14,
      logo_domain: 'planetfitness.com',
      logo_hidden: false,
    });
  });

  it('an edit that keeps its store shows the row’s logo and leaves it alone', async () => {
    const screen = await editing();

    expect(screen.getByTestId('logo-32')).toHaveTextContent('Corner Deli|cornerdeli.com');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ merchant: 'Corner Deli' });
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_domain');
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_hidden');
  });

  it('an edit whose owner chose letters shows letters on the final page', async () => {
    const screen = await editing({ ...DELI, logo_domain: 'cornerdeli.com', logo_hidden: true });

    expect(screen.getByTestId('logo-32')).toHaveTextContent('Corner Deli|');
  });

  it('an edit that picks another store drops the old store’s logo', async () => {
    const screen = await editing();

    await press(screen, 'Change store, currently Corner Deli');
    // As the field sends a catalog pick.
    await chooseStore(screen, 'Whole', 'Whole Foods');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      brand_id: 'b-wf',
      merchant: 'Whole Foods',
      logo_domain: null,
      logo_hidden: false,
    });
  });

  it('an edit that replaces its store with a new one is asked for that one’s logo', async () => {
    const screen = await editing();

    await press(screen, 'Change store, currently Corner Deli');
    await addStore(screen, PLANET.name);
    await press(screen, LOGO_COPY.yes);
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      brand_id: null,
      merchant: 'Planet Fitness',
      logo_domain: 'planetfitness.com',
      logo_hidden: false,
    });
  });

  it('opens Change logo for this receipt from under the box of a saved store', async () => {
    const screen = await editing();

    await press(screen, LOGO_COPY.changeLogo);

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/change-logo',
      params: { kind: 'receipt', id: 'receipt-1', name: 'Corner Deli' },
    });
  });

  it('stops offering Change logo as soon as the store is cleared', async () => {
    const screen = await editing();
    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();

    await press(screen, 'Change store, currently Corner Deli');

    expect(screen.queryByLabelText(LOGO_COPY.changeLogo)).toBeNull();
    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
  });

  // The link opens Change logo for the saved receipt, so beside a different store it would change
  // the wrong logo.
  it('stops offering Change logo as soon as another store is picked', async () => {
    const screen = await editing();

    await press(screen, 'Change store, currently Corner Deli');
    await chooseStore(screen, 'Whole', 'Whole Foods');

    expect(screen.getByLabelText('Change store, currently Whole Foods')).toBeTruthy();
    expect(screen.queryByLabelText(LOGO_COPY.changeLogo)).toBeNull();
  });

  it('keeps offering Change logo while the store is untouched, whatever else is changed', async () => {
    const screen = await editing();

    await pressButton(screen, 'Amount, $1,100.00');
    for (let i = 0; i < 4; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '5');
    await press(screen, 'Done');
    await press(screen, 'Yesterday');
    await press(screen, 'Note, AppleCare');
    await press(screen, 'Done');

    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();
    expect(screen.getByLabelText('Change store, currently Corner Deli')).toBeTruthy();
  });

  it('shows a logo chosen on Change logo when it comes back, and still leaves it alone', async () => {
    const screen = await editing();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Corner Deli|cornerdeli.com');

    // The row as re-read after Change logo saved letters on it.
    mockReceipt = {
      data: { ...DELI, logo_domain: null, logo_hidden: true },
      isError: false,
      isFetched: true,
    };
    await screen.rerender(<AddReceiptScreen />);

    expect(screen.getByTestId('logo-32')).toHaveTextContent('Corner Deli|');
    await press(screen, 'Save changes');
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_hidden');
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_domain');
  });

  it('never offers Change logo on a receipt not yet saved', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12');
    await chooseStore(screen, 'Whole', 'Whole Foods');

    expect(screen.queryByLabelText(LOGO_COPY.changeLogo)).toBeNull();
  });
});
