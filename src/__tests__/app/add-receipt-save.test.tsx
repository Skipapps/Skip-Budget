import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddReceiptScreen from '@/app/add-receipt';
import type { KnownStore } from '@/api/known-stores';
import { LOGO_COPY } from '@/components/brands/logo-choices';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { clearVoiceDraft } from '@/lib/voice-draft';

/**
 * Golden: exactly what the receipt form's Save writes. Pins the object handed to create/update, what
 * Save refuses and says while the page has gaps, and where each kind of save goes afterwards.
 *
 * The pages are the real ones, walked the way a person walks them (keypad, store box, day chips and
 * calendar, Paid with pills, note); only the network and the logo images are replaced.
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
// A refused scan counts the month again; this is that read starting over.
const mockRecount = jest.fn();
jest.mock('@/api/queries', () => ({
  // This month's receipts, which the free scan and upload allowances count.
  useReceipts: () => ({ data: [], isFetched: true, isError: false, refetch: mockRecount }),
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

const STORE_PLACEHOLDER = 'Enter the store name';

/** The button that lets go of the chosen store. */
const changeStore = (name: string) => `Change store, currently ${name}`;

/** Types into the store box on the final page the way a finger does: a tap into it, then the letters. */
async function searchStore(screen: Screen, text: string) {
  const input = screen.getByPlaceholderText(STORE_PLACEHOLDER);
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

/**
 * A new Whole Foods receipt at the amount typed, answered all the way through and ready to Save.
 * `paidWith` is the pill pressed; null leaves the question open on purpose.
 */
async function readyReceipt(screen: Screen, amount: string, paidWith: string | null = 'Skip') {
  await typedReceipt(screen, amount);
  await chooseStore(screen, 'Whole', 'Whole Foods');
  if (paidWith !== null) await press(screen, paidWith);
}

const MISSING = (fields: string) => `To save this receipt, fill in: ${fields}.`;
const ANY_MISSING = /^To save this receipt, fill in:/;

/** Save was refused: nothing was written, and the form did not close. */
function expectNothingWritten() {
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();
  expect(router.dismissTo).not.toHaveBeenCalled();
  expect(clearVoiceDraft).not.toHaveBeenCalled();
}

const NOTE_PLACEHOLDER = 'Anything worth remembering';

/** Opens the note page on a row with no note, types one and keeps it. */
async function keepNote(screen: Screen, text: string) {
  await press(screen, 'Note, not set, optional');
  await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), text);
  await press(screen, 'Done');
}

const PILLS = ['VISA ••4421', 'Checking ••0099', 'Skip'];

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
    await press(screen, 'Checking ••0099');
    await keepNote(screen, '  Weekly shop  ');
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

  it('files today and no note when neither was given, and Skip as the source', async () => {
    const screen = await render(<AddReceiptScreen />);

    await typedReceipt(screen, '0.10');
    await addStore(screen, 'Corner Deli');
    await press(screen, 'Skip');
    await keepNote(screen, '   ');
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

  it.each([
    ['1100', 1100],
    ['15.99', 15.99],
    ['0.10', 0.1],
    ['0.01', 0.01],
    ['999.99', 999.99],
    ['1030.5', 1030.5],
  ])('saves a typed %s as exactly %p dollars', async (typed, saved) => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, typed);
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(saved);
  });

  it('saves the amount as corrected on the amount line, not as first typed', async () => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '49.11');

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
    await readyReceipt(screen, '12');

    await press(screen, 'Yesterday');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].purchased_on).toBe('2026-10-06');
  });

  it('comes back to today with the Today chip', async () => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '12');

    await press(screen, 'Yesterday');
    await press(screen, 'Today');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].purchased_on).toBe('2026-10-07');
  });
});

describe('Add receipt — what Paid with saves', () => {
  it.each([
    ['a card', 'VISA ••4421', { card_id: 'card-1', bank_account_id: null }],
    ['an account', 'Checking ••0099', { card_id: null, bank_account_id: 'acct-1' }],
    ['Skip', 'Skip', { card_id: null, bank_account_id: null }],
  ])('files %s under its own column and the other under none', async (_name, pill, columns) => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99', pill);

    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ amount: 15.99, ...columns });
  });

  it('keeps only the last pill pressed, never a card and an account together', async () => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99', 'VISA ••4421');

    await press(screen, 'Checking ••0099');
    expect(screen.getByLabelText('Checking ••0099')).toBeSelected();
    expect(screen.getByLabelText('VISA ••4421')).not.toBeSelected();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      card_id: null,
      bank_account_id: 'acct-1',
    });
  });

  it('lets Skip take back a card, and a card take back Skip', async () => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99', 'VISA ••4421');

    await press(screen, 'Skip');
    expect(screen.getByLabelText('Skip')).toBeSelected();
    expect(screen.getByLabelText('VISA ••4421')).not.toBeSelected();
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });

    mockCreate.mockClear();
    await press(screen, 'VISA ••4421');
    expect(screen.getByLabelText('Skip')).not.toBeSelected();
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: 'card-1', bank_account_id: null });
  });

  it('files a card deleted while the form is open under neither, and does not hold Save back', async () => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99', 'VISA ••4421');

    mockSources = mockSources.filter((source) => source.id !== 'card-1');
    await screen.rerender(<AddReceiptScreen />);
    expect(screen.queryByLabelText('VISA ••4421')).toBeNull();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });

  it('offers Skip alone when there is no card or account, and it answers the question', async () => {
    mockSources = [];
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99', null);

    expect(screen.queryByLabelText('VISA ••4421')).toBeNull();
    expect(screen.queryByLabelText('Checking ••0099')).toBeNull();
    expect(screen.getByLabelText('Skip')).not.toBeSelected();
    await press(screen, 'Skip');
    expect(screen.getByLabelText('Skip')).toBeSelected();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });
});

describe('Add receipt — the store box', () => {
  it('saves a catalogue store with its brand, its category and the name picked, not the letters typed', async () => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99');

    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const values = mockCreate.mock.calls[0][0];
    expect(values).toMatchObject({
      brand_id: 'b-wf',
      merchant: 'Whole Foods',
      category_id: 'groceries',
    });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('saves a store typed but not picked under its own name, with no brand and a guessed category', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12.5');

    await searchStore(screen, 'Corner Deli');
    await press(screen, 'Skip');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const values = mockCreate.mock.calls[0][0];
    expect(values).toMatchObject({
      brand_id: null,
      merchant: 'Corner Deli',
      amount: 12.5,
      category_id: 'dining',
    });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('trims what was typed, and files it under Other when no keyword fits', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '8');

    await searchStore(screen, '  Zed Zed ');
    await press(screen, 'Skip');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Zed Zed',
      category_id: 'other',
    });
  });

  // Only a tap on the result ties a store to the catalogue; the letters alone are a custom store.
  it('does not turn a name typed in full into the catalogue brand unless it is picked', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '8');

    await searchStore(screen, 'Whole Foods');
    await press(screen, 'Skip');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Whole Foods',
      category_id: 'groceries',
    });
  });

  it('files a store added from the box’s own row, with a name no keyword fits, under Other', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '8');
    await addStore(screen, 'Zed Zed');
    await press(screen, 'Skip');

    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Zed Zed',
      category_id: 'other',
    });
  });

  it('still names the store after a visit to the note page, and saves it', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '12.5');
    await searchStore(screen, 'Corner Deli');
    await press(screen, 'Skip');

    await keepNote(screen, 'Lunch');
    expect(screen.getByDisplayValue('Corner Deli')).toBeTruthy();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Corner Deli',
      note: 'Lunch',
    });
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
    // The card the scan matched is already lit.
    expect(screen.getByLabelText('VISA ••4421')).toBeSelected();

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

  it('falls back to no brand, Other and today for what a scan did not carry, once Paid with is answered', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedAmount: '1100' };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Skip');
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

  it('leaves Paid with open when the scan found no card, and saves as a scan once it is answered', async () => {
    mockParams = {
      scannedStore: 'Corner Deli',
      scannedAmount: '12.5',
      scannedRead: 'store,amount',
    };
    const screen = await render(<AddReceiptScreen />);
    for (const pill of PILLS) expect(screen.getByLabelText(pill)).not.toBeSelected();

    await press(screen, 'Save receipt');
    expect(screen.getByText(MISSING('Paid with'))).toBeTruthy();
    expectNothingWritten();

    await press(screen, 'Checking ••0099');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      amount: 12.5,
      card_id: null,
      bank_account_id: 'acct-1',
      source: 'scan',
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
    await press(screen, 'Skip');
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
    await press(screen, 'Skip');
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

  it.each([
    ['a card', 'card-1', 'VISA ••4421', { card_id: 'card-1', bank_account_id: null }],
    ['an account', 'acct-1', 'Checking ••0099', { card_id: null, bank_account_id: 'acct-1' }],
  ])('opens with %s it heard lit, and saves it', async (_name, heard, pill, columns) => {
    mockParams = { ...HEARD, scannedSource: heard };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText(pill)).toBeSelected();
    expect(screen.getByLabelText('Skip')).not.toBeSelected();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ source: 'voice', ...columns });
  });

  it('leaves Paid with to answer when no card was heard, and keeps what was said until it is saved', async () => {
    mockParams = HEARD;
    const screen = await render(<AddReceiptScreen />);
    for (const pill of PILLS) expect(screen.getByLabelText(pill)).not.toBeSelected();

    await press(screen, 'Save receipt');

    expect(screen.getByText(MISSING('Paid with'))).toBeTruthy();
    expectNothingWritten();
  });

  it('carries the note typed on the review page into the form and the saved row', async () => {
    mockParams = { ...HEARD, scannedNote: 'Lunch with Sam' };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Note, Lunch with Sam')).toBeTruthy();
    await press(screen, 'Skip');
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

    expect(screen.getByLabelText(changeStore('Planet Fitness'))).toBeTruthy();
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

    await press(screen, 'Skip');
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

    await press(screen, 'Skip');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(clearVoiceDraft).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('Add receipt — what an edit saves', () => {
  beforeEach(() => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: EXISTING, isError: false, isFetched: true };
  });

  it('writes the row back as it was: its account, how it was captured, and no logo columns', async () => {
    const screen = await render(<AddReceiptScreen />);

    // Opens on the final page, already answered: Save is the first thing to press.
    expect(screen.getByLabelText('Save changes')).toBeEnabled();
    expect(screen.getByLabelText('Checking ••0099')).toBeSelected();
    expect(screen.getByLabelText('VISA ••4421')).not.toBeSelected();
    expect(screen.getByLabelText('Skip')).not.toBeSelected();
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
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_domain');
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_hidden');
  });

  it('keeps a card as its card', async () => {
    mockReceipt = {
      data: { ...EXISTING, card_id: 'card-1', bank_account_id: null },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('VISA ••4421')).toBeSelected();
    expect(screen.getByLabelText('Skip')).not.toBeSelected();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const { values } = mockUpdate.mock.calls[0][0];
    expect(values).toMatchObject({ card_id: 'card-1', bank_account_id: null, source: 'upload' });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('shows a row with no card or account on Skip and saves it that way', async () => {
    mockReceipt = {
      data: { ...EXISTING, bank_account_id: null },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Skip')).toBeSelected();
    expect(screen.getByLabelText('Checking ••0099')).not.toBeSelected();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const { values } = mockUpdate.mock.calls[0][0];
    expect(values).toMatchObject({ card_id: null, bank_account_id: null });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('moves the receipt from an account to a card without touching its source or its logo', async () => {
    mockReceipt = { data: { ...EXISTING, source: 'scan' }, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await pressButton(screen, 'Amount, $1,100.00');
    for (let i = 0; i < 4; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '1030.5');
    await press(screen, 'Done');

    await press(screen, 'VISA ••4421');

    await press(screen, 'Note, AppleCare');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), '');
    await press(screen, 'Done');

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const { values } = mockUpdate.mock.calls[0][0];
    expect(values).toMatchObject({
      amount: 1030.5,
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      source: 'scan',
    });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('takes the account off with Skip', async () => {
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Skip');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
  });

  it('saves nothing from a page that was left with Back', async () => {
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

describe('Add receipt — Save with gaps', () => {
  // What a hand-off can give the final page, one answer at a time.
  const GIVEN = {
    amount: { scannedAmount: '12.5' },
    store: { scannedStore: 'Corner Deli' },
    paidWith: { scannedSource: 'card-1' },
  };

  it('says what is still open, writes nothing, and stays on the page with Save ready', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');
    for (const pill of PILLS) expect(screen.getByLabelText(pill)).not.toBeSelected();

    await press(screen, 'Save receipt');

    expect(screen.getByText(MISSING('Store, Paid with'))).toBeTruthy();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.getByPlaceholderText(STORE_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expectNothingWritten();
  });

  it.each([
    ['nothing', 'Amount, Store, Paid with', []],
    ['only the amount', 'Store, Paid with', ['amount']],
    ['only the store', 'Amount, Paid with', ['store']],
    ['only the card', 'Amount, Store', ['paidWith']],
    ['the amount and the store', 'Paid with', ['amount', 'store']],
    ['the amount and the card', 'Store', ['amount', 'paidWith']],
    ['the store and the card', 'Amount', ['store', 'paidWith']],
  ] as [string, string, (keyof typeof GIVEN)[]][])(
    'with %s given, the line lists exactly: %s',
    async (_name, line, given) => {
      mockParams = {
        scannedVia: 'voice',
        from: 'voice',
        ...Object.assign({}, ...given.map((key) => GIVEN[key])),
      };
      const screen = await render(<AddReceiptScreen />);
      expect(screen.getByLabelText('Save receipt')).toBeEnabled();

      await press(screen, 'Save receipt');

      expect(screen.getByText(MISSING(line))).toBeTruthy();
      expectNothingWritten();
    },
  );

  it('lists the amount alone when it is all that is left, and points at it', async () => {
    mockParams = { ...GIVEN.store, ...GIVEN.paidWith, scannedRead: 'store,card' };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    expect(screen.getByText(MISSING('Amount'))).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expectNothingWritten();
  });

  it('lists the store alone when it is all that is left, and shows the box', async () => {
    mockParams = { ...GIVEN.amount, ...GIVEN.paidWith, scannedRead: 'amount,card' };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    expect(screen.getByText(MISSING('Store'))).toBeTruthy();
    expect(screen.getByPlaceholderText(STORE_PLACEHOLDER)).toBeTruthy();
    expectNothingWritten();
  });

  it('lists Paid with alone when it is all that is left, and Skip is still one of the answers', async () => {
    mockParams = { ...GIVEN.amount, ...GIVEN.store, scannedRead: 'store,amount' };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    expect(screen.getByText(MISSING('Paid with'))).toBeTruthy();
    for (const pill of PILLS) expect(screen.getByLabelText(pill)).not.toBeSelected();
    expectNothingWritten();

    await press(screen, 'Skip');
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });

  it('does not take a zero typed on the amount page, because Done is held back there', async () => {
    mockParams = { ...GIVEN.store, ...GIVEN.paidWith, scannedRead: 'store,card' };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Amount, needed');
    await typeAmount(screen, '0');

    expect(screen.getByLabelText('Done')).toBeDisabled();
  });

  it('does not take the zero a row was stored with for an amount', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: { ...EXISTING, amount: 0 }, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save changes');

    expect(screen.getByText(MISSING('Amount'))).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expectNothingWritten();
  });

  it('counts a store typed but not picked as given', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');
    await searchStore(screen, 'Corner Deli');

    await press(screen, 'Save receipt');

    expect(screen.getByText(MISSING('Paid with'))).toBeTruthy();
    expectNothingWritten();
  });

  it.each([
    ['typed and then emptied again', ''],
    ['only spaces', '   '],
  ])('does not count a store %s', async (_name, text) => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');
    await press(screen, 'Skip');
    await searchStore(screen, 'Corner');
    await fireEvent.changeText(screen.getByPlaceholderText(STORE_PLACEHOLDER), text);

    await press(screen, 'Save receipt');

    expect(screen.getByText(MISSING('Store'))).toBeTruthy();
    expectNothingWritten();
  });

  it('lists the store again once the one picked is let go of', async () => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99');

    await press(screen, changeStore('Whole Foods'));
    await press(screen, 'Save receipt');

    expect(screen.getByText(MISSING('Store'))).toBeTruthy();
    expectNothingWritten();
  });

  it('holds back an edit whose store was let go of, and never lists what it has answered', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: EXISTING, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, changeStore('Apple Store'));
    await press(screen, 'Save changes');

    expect(screen.getByText(MISSING('Store'))).toBeTruthy();
    expectNothingWritten();
  });

  it('drops each field from the line as it is answered, and writes once none is left', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');

    await press(screen, 'Save receipt');
    expect(screen.getByText(MISSING('Store, Paid with'))).toBeTruthy();

    await chooseStore(screen, 'Whole', 'Whole Foods');
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
    await press(screen, 'Save receipt');
    expect(screen.getByText(MISSING('Paid with'))).toBeTruthy();
    expectNothingWritten();

    await press(screen, 'Skip');
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: 'b-wf',
      merchant: 'Whole Foods',
      amount: 15.99,
      card_id: null,
      bank_account_id: null,
    });
  });

  it('saves a store typed after the line came up, once Paid with is answered', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');
    await press(screen, 'Save receipt');
    expect(screen.getByText(MISSING('Store, Paid with'))).toBeTruthy();

    await searchStore(screen, 'Corner Deli');
    await press(screen, 'VISA ••4421');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Corner Deli',
      card_id: 'card-1',
    });
  });
});

describe('Add receipt — a failed or held save', () => {
  it('says the one failure line above Save when the write fails, and stays', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99');

    await press(screen, 'Save receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(screen.getAllByText(FAILURE_MESSAGE)).toHaveLength(1);
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    log.mockRestore();
  });

  it('takes the failure line away again on the next try', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99');
    await press(screen, 'Save receipt');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });

  it('says Saving… and holds Save while the write is in flight', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedAmount: '12' };
    mockPending = true;
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Saving…')).toBeDisabled();
    expect(screen.queryByLabelText('Save receipt')).toBeNull();
  });

  // The line belongs under Save. Back on the keypad, it would sit under a question it has nothing
  // to do with until the next Continue.
  it('does not carry a failed save’s line back onto the amount page', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99');
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

  it('does not carry the line about gaps back onto the amount page either', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');
    await press(screen, 'Save receipt');
    expect(screen.getByText(ANY_MISSING)).toBeTruthy();

    await press(screen, 'Back');

    expect(screen.getByText('How much did you spend?')).toBeTruthy();
    expect(screen.queryByText(ANY_MISSING)).toBeNull();

    await press(screen, 'Continue');
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
  });
});

describe('Add receipt — a line that came from Save', () => {
  // The line names what was wrong with the page as it was, so a change made on the page itself is
  // what takes it away. A pick in a box has no Done to do it, so each control clears it itself.
  it.each<[string, (screen: Screen) => Promise<unknown>]>([
    ['a store is picked', (screen) => chooseStore(screen, 'Whole', 'Whole Foods')],
    ['something is typed in the store box', (screen) => searchStore(screen, 'Gym')],
    ['a day chip is pressed', (screen) => press(screen, 'Yesterday')],
    ['a day is picked on the calendar', (screen) => pickDay(screen, 'Thursday 1 October 2026')],
    ['a card is picked', (screen) => press(screen, 'VISA ••4421')],
    ['Skip is picked', (screen) => press(screen, 'Skip')],
    [
      'the amount is kept on its page',
      async (screen) => {
        await pressButton(screen, 'Amount, $15.99');
        await press(screen, 'Done');
      },
    ],
    ['a note is kept on its page', (screen) => keepNote(screen, 'Weekly shop')],
  ])('the line about gaps goes when %s', async (_name, change) => {
    const screen = await render(<AddReceiptScreen />);
    await typedReceipt(screen, '15.99');
    await press(screen, 'Save receipt');
    expect(screen.getByText(ANY_MISSING)).toBeTruthy();

    await change(screen);

    expect(screen.queryByText(ANY_MISSING)).toBeNull();
  });

  it('the line about gaps goes when the store picked is let go of', async () => {
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99', null);
    await press(screen, 'Save receipt');
    expect(screen.getByText(MISSING('Paid with'))).toBeTruthy();

    await press(screen, changeStore('Whole Foods'));

    expect(screen.queryByText(ANY_MISSING)).toBeNull();
  });

  const failedSave = async () => {
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99', 'VISA ••4421');
    await press(screen, 'Save receipt');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    return screen;
  };

  it.each<[string, (screen: Screen) => Promise<unknown>]>([
    ['the store is let go of', (screen) => press(screen, changeStore('Whole Foods'))],
    ['a day chip is pressed', (screen) => press(screen, 'Yesterday')],
    ['a day is picked on the calendar', (screen) => pickDay(screen, 'Thursday 1 October 2026')],
    ['another card is picked', (screen) => press(screen, 'Checking ••0099')],
    ['Skip is picked', (screen) => press(screen, 'Skip')],
    [
      'the amount is kept on its page',
      async (screen) => {
        await pressButton(screen, 'Amount, $15.99');
        await press(screen, 'Done');
      },
    ],
    ['a note is kept on its page', (screen) => keepNote(screen, 'Weekly shop')],
  ])('the failure line goes when %s', async (_name, change) => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const screen = await failedSave();

    await change(screen);

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    log.mockRestore();
  });

  it.each(['the line about gaps', 'the failure line'])(
    '%s stays when a page is left with Back, because nothing was kept',
    async (which) => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      let screen: Screen;
      if (which === 'the failure line') {
        screen = await failedSave();
      } else {
        screen = await render(<AddReceiptScreen />);
        await typedReceipt(screen, '15.99');
        await press(screen, 'Save receipt');
      }

      await press(screen, 'Note, not set, optional');
      await press(screen, 'Back');

      if (which === 'the failure line') expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
      else expect(screen.getByText(ANY_MISSING)).toBeTruthy();
      log.mockRestore();
    },
  );
});

describe('Add receipt — a save the database refuses for Pro', () => {
  const SCANNED = {
    scannedStore: 'Corner Deli',
    scannedAmount: '15.99',
    scannedSource: 'card-1',
    scannedRead: 'store,amount,card',
  };

  it.each([
    ['a scan', SCANNED, 'scan', 'Scanning more than 15 receipts a month is part of Skip Pro.'],
    [
      'a voice hand-off',
      { ...SCANNED, scannedVia: 'voice', from: 'voice' },
      'voice',
      'Adding receipts by voice is part of Skip Pro.',
    ],
  ])(
    'a free account’s save of %s goes to the explainer, not the failure line',
    async (_name, params, id, message) => {
      mockPro = { pro: false, ready: true };
      mockCreate.mockRejectedValueOnce({ code: 'P0001', message });
      mockParams = params;
      const screen = await render(<AddReceiptScreen />);

      await press(screen, 'Save receipt');

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id } }),
      );
      // A refused scan counts the month again; a voice refusal has nothing to count.
      expect(mockRecount).toHaveBeenCalledTimes(id === 'scan' ? 1 : 0);
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
      expect(router.back).not.toHaveBeenCalled();
      expect(router.dismissTo).not.toHaveBeenCalled();
      expect(clearVoiceDraft).not.toHaveBeenCalled();
      // Pushed, so Back returns to the filled-in form.
      expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
      expect(screen.getByLabelText('VISA ••4421')).toBeSelected();
      expect(screen.getByLabelText('Save receipt')).toBeEnabled();
    },
  );

  it('a refusal for someone the app thinks has Pro is a failure: the line is shown and reported', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const refusal = { code: 'P0001', message: 'Scanning receipts is part of Skip Pro.' };
    mockCreate.mockRejectedValueOnce(refusal);
    mockParams = SCANNED;
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.push).not.toHaveBeenCalled();
    expect(mockRecount).not.toHaveBeenCalled();
    // failureMessage's report: the Metro log in development, Sentry in a release build.
    expect(log).toHaveBeenCalledWith('[failure]', refusal);
    log.mockRestore();
  });

  it('does not ask a free account about Pro for a receipt typed by hand that saves', async () => {
    mockPro = { pro: false, ready: true };
    const screen = await render(<AddReceiptScreen />);
    await readyReceipt(screen, '15.99');

    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].source).toBe('manual');
    expect(router.push).not.toHaveBeenCalled();
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
    await press(screen, 'Skip');
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
    expect(screen.getByLabelText(changeStore('Blue Bottle Coffee'))).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent(
      'Blue Bottle Coffee|bluebottlecoffee.com',
    );
    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();
    await press(screen, 'Skip');
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
    await press(screen, 'Skip');
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
    await press(screen, 'Skip');
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
    await press(screen, 'Skip');
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
    await press(first, 'Skip');
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
    await press(second, 'Skip');
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

    await press(screen, changeStore('Corner Deli'));
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

    await press(screen, changeStore('Corner Deli'));
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

  it('an edit that replaces its store with typed words saves them as a custom store', async () => {
    const screen = await editing();

    await press(screen, changeStore('Corner Deli'));
    await searchStore(screen, 'Blue Cafe');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      brand_id: null,
      merchant: 'Blue Cafe',
      category_id: 'dining',
    });
  });

  // Typing a new store without picking it leaves the logo columns out, and an update writes only the
  // columns it is given, so the old store's logo stays on the row; a catalogue pick sends
  // logo_domain null and logo_hidden false for exactly this.
  it('an edit that replaces its store with typed words drops the old store’s logo', async () => {
    const screen = await editing();

    await press(screen, changeStore('Corner Deli'));
    await searchStore(screen, 'Blue Cafe');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      merchant: 'Blue Cafe',
      logo_domain: null,
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

    await press(screen, changeStore('Corner Deli'));

    expect(screen.queryByLabelText(LOGO_COPY.changeLogo)).toBeNull();
    expect(screen.getByPlaceholderText(STORE_PLACEHOLDER)).toBeTruthy();
  });

  // The link opens Change logo for the saved receipt, so beside a different store it would change
  // the wrong logo.
  it('stops offering Change logo as soon as another store is picked', async () => {
    const screen = await editing();

    await press(screen, changeStore('Corner Deli'));
    await chooseStore(screen, 'Whole', 'Whole Foods');

    expect(screen.getByLabelText(changeStore('Whole Foods'))).toBeTruthy();
    expect(screen.queryByLabelText(LOGO_COPY.changeLogo)).toBeNull();
  });

  it('keeps offering Change logo while the store is untouched, whatever else is changed', async () => {
    const screen = await editing();

    await pressButton(screen, 'Amount, $1,100.00');
    for (let i = 0; i < 4; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '5');
    await press(screen, 'Done');
    await press(screen, 'Yesterday');
    await press(screen, 'VISA ••4421');
    await press(screen, 'Note, AppleCare');
    await press(screen, 'Done');

    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();
    expect(screen.getByLabelText(changeStore('Corner Deli'))).toBeTruthy();
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
    await readyReceipt(screen, '12');

    expect(screen.queryByLabelText(LOGO_COPY.changeLogo)).toBeNull();
  });
});
