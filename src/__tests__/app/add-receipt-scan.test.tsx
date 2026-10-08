import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddReceiptScreen from '@/app/add-receipt';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * A scanned receipt opens on the final page, a report of what was read above the amount and Save,
 * on both ways in: a scan from the receipts list (route params) and Scan / Upload on the form
 * itself. Whatever the reading missed is a gap on that page (the amount, the store) rather than a
 * different page; a reading of nothing leaves the person on the amount page. Free reads 15 receipts a
 * month by camera and 15 by upload: past either, the explainer opens before the camera or picker
 * does, and a save the database refuses for Pro goes to the explainer rather than the failure line.
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

const mockScanner = { available: true };
const mockCapture = jest.fn();
const mockRecognize = jest.fn();
const mockRecognizeText = jest.fn();
let mockHasLayout = true;
jest.mock('../../../modules/receipt-scanner', () => ({
  hasLayoutRecognition: () => mockHasLayout,
  captureReceipt: () => mockCapture(),
  isCaptureAvailable: () => mockScanner.available,
  isRecognitionAvailable: () => mockScanner.available,
  isScanningAvailable: () => mockScanner.available,
  recognizeReceipt: (uri: string) => mockRecognize(uri),
  recognizeText: (uri: string) => mockRecognizeText(uri),
}));

// What the camera "read", per case.
let mockParsed: Record<string, unknown> = {};
jest.mock('@/lib/receipt-parser', () => ({
  parseReceipt: () => mockParsed,
  parseReceiptFromLines: () => mockParsed,
}));

const mockLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
  launchImageLibraryAsync: () => mockLibrary(),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    body: '#333333',
    line: '#DDDDDD',
    danger: '#CC0000',
    accentInk: '#905479',
    onControl: '#FFFFFF',
  }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockAsk = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
  useDialog: () => mockAsk,
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
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const BRANDS = [
  { id: 'b-wf', name: 'Whole Foods', domain: 'wholefoods.com', category_id: 'groceries' },
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
jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: null, isLoading: false, isFetching: false }),
}));

// This month's receipts, which the free allowance counts.
let mockReceipts: {
  data: { source: string; created_at: string | null }[];
  isFetched: boolean;
  isError: boolean;
} = { data: [], isFetched: true, isError: false };
const savedThisMonth = (source: string, count: number) =>
  Array.from({ length: count }, () => ({ source, created_at: '2026-10-02T15:00:00.000Z' }));

const mockRecount = jest.fn();
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ ...mockReceipts, refetch: mockRecount }),
  useReceipt: () => ({ data: null, isError: false, isFetched: false, refetch: jest.fn() }),
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
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

type Screen = Awaited<ReturnType<typeof render>>;

/** A full reading: the store, the total, the day and the card. */
const READ = { merchant: "Trader Joe's", total: 15.99, date: '2026-09-28', last4: '4421' };

/** The same reading as the receipts list hands it over. */
const ROUTE = {
  scannedStore: "Trader Joe's",
  scannedCategory: 'groceries',
  scannedAmount: '15.99',
  scannedDate: '2026-09-28',
  scannedSource: 'card-1',
  scannedRead: 'store,amount,date,card',
};

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

/** The amount is a button on the page and a figure inside it, both worded alike: by role, the button. */
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
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

const onFinalPage = (screen: Screen) => {
  expect(screen.getByText('You can edit this later.')).toBeTruthy();
  expect(screen.queryByText('How much did you spend?')).toBeNull();
};
const onAmountPage = (screen: Screen) => {
  expect(screen.getByText('How much did you spend?')).toBeTruthy();
  expect(screen.getByLabelText('Continue')).toBeTruthy();
  expect(screen.queryByLabelText('Save receipt')).toBeNull();
};

const scanOnForm = async (screen: Screen, parsed: Record<string, unknown>) => {
  mockParsed = parsed;
  mockCapture.mockResolvedValueOnce({ text: 'receipt', lines: [] });
  await press(screen, 'Scan');
};

const SAVED_SCAN = {
  brand_id: null,
  merchant: "Trader Joe's",
  amount: 15.99,
  purchased_on: '2026-09-28',
  category_id: 'groceries',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  image_path: null,
};

beforeEach(() => {
  mockHasLayout = true;
  jest.clearAllMocks();
  mockParams = {};
  mockParsed = {};
  mockScanner.available = true;
  mockPro = { pro: true, ready: true };
  mockReceipts = { data: [], isFetched: true, isError: false };
  mockCreate.mockResolvedValue({ id: 'receipt-new' });
});

describe('a scan from the receipts list', () => {
  it('opens on the final page with what was read, and saves it as a scan', async () => {
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    onFinalPage(screen);
    expect(screen.getByText('Read the store, amount, date and card.')).toBeTruthy();
    expect(screen.queryByText(/^Check the/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
    expect(screen.getByLabelText("Change store, currently Trader Joe's")).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent("Trader Joe's|");
    expect(screen.getByText('Filed under Groceries')).toBeTruthy();
    expect(screen.getByLabelText('Date, Mon Sep 28')).toBeTruthy();
    expect(screen.getByLabelText('Paid with, VISA ••4421')).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();

    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({ ...SAVED_SCAN, source: 'scan' });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('draws the amount as a gap when no total was read, and holds Save until it is filled', async () => {
    mockParams = { ...ROUTE, scannedAmount: '', scannedRead: 'store,date,card' };
    const screen = await render(<AddReceiptScreen />);

    onFinalPage(screen);
    expect(screen.getByText('Read the store, date and card.')).toBeTruthy();
    expect(screen.getByText('Check the amount below — it will save either way.')).toBeTruthy();
    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(screen.queryByText(/\$0/)).toBeNull();
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();

    await press(screen, 'Amount, needed');
    await typeAmount(screen, '15.99');
    await press(screen, 'Done');

    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({ ...SAVED_SCAN, source: 'scan' });
  });

  it('draws the store as a gap when no store was read, and holds Save until it is chosen', async () => {
    mockParams = { ...ROUTE, scannedStore: '', scannedRead: 'amount,date,card' };
    const screen = await render(<AddReceiptScreen />);

    onFinalPage(screen);
    expect(screen.getByText('Read the amount, date and card.')).toBeTruthy();
    expect(screen.getByText('Check the store below — it will save either way.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
    expect(screen.queryByText('Filed under', { exact: false })).toBeNull();
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();

    await chooseStore(screen, 'Whole', 'Whole Foods');

    expect(screen.getByLabelText('Change store, currently Whole Foods')).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();
  });

  it('opens a voice hand-off on the final page too, without the camera’s report', async () => {
    mockParams = { ...ROUTE, scannedVia: 'voice', from: 'voice' };
    const screen = await render(<AddReceiptScreen />);

    onFinalPage(screen);
    expect(screen.queryByText(/^Read the/)).toBeNull();
    expect(screen.queryByText(/^Check the/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
    expect(screen.getByLabelText("Change store, currently Trader Joe's")).toBeTruthy();
  });

  it('opens blank, on the amount page, when the params carry nothing', async () => {
    mockParams = { scannedRead: '', scannedAmount: '', scannedStore: '' };
    const screen = await render(<AddReceiptScreen />);

    onAmountPage(screen);
    expect(screen.queryByText(/^Read the/)).toBeNull();
  });
});

describe('the report on the final page', () => {
  it('goes once the person corrects anything it read', async () => {
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);
    expect(screen.getByText('Read the store, amount, date and card.')).toBeTruthy();

    await press(screen, 'Yesterday');

    expect(screen.queryByText(/^Read the/)).toBeNull();
    expect(screen.getByLabelText('Date, Yesterday, Tue Oct 6')).toBeTruthy();
  });

  it('goes once the store is cleared, or another one is picked', async () => {
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);
    expect(screen.getByText('Read the store, amount, date and card.')).toBeTruthy();

    await press(screen, "Change store, currently Trader Joe's");
    expect(screen.queryByText(/^Read the/)).toBeNull();
    expect(screen.queryByText(/^Check the/)).toBeNull();

    await chooseStore(screen, 'Whole', 'Whole Foods');
    expect(screen.queryByText(/^Read the/)).toBeNull();
    expect(screen.getByLabelText('Change store, currently Whole Foods')).toBeTruthy();
  });

  it('goes with a corrected amount as well', async () => {
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    await pressButton(screen, 'Amount, $15.99');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '16');
    await press(screen, 'Done');

    expect(screen.queryByText(/^Read the/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Amount, $16.00' })).toBeTruthy();
  });

  it('still saves as a scan however much is corrected by hand: a scan counts once it is saved', async () => {
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    await pressButton(screen, 'Amount, $15.99');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '42');
    await press(screen, 'Done');
    await press(screen, "Change store, currently Trader Joe's");
    await searchStore(screen, 'Deli');
    await press(screen, 'Add Deli as a new store');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ source: 'scan', amount: 42 });
  });

  it('stays when a page is left with Back', async () => {
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Paid with, VISA ••4421');
    await press(screen, 'Back');

    expect(screen.getByText('Read the store, amount, date and card.')).toBeTruthy();
  });

  it('is not shown on a receipt typed by hand', async () => {
    const screen = await render(<AddReceiptScreen />);

    await typeAmount(screen, '12');
    await press(screen, 'Continue');

    onFinalPage(screen);
    expect(screen.queryByText(/^Read the/)).toBeNull();
    expect(screen.queryByText(/^Check the/)).toBeNull();
  });
});

describe('Scan and Upload on the form', () => {
  it('Scan lands on the final page with what was read, and saves it as a scan', async () => {
    const screen = await render(<AddReceiptScreen />);
    onAmountPage(screen);

    await scanOnForm(screen, READ);

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
    expect(screen.getByLabelText("Change store, currently Trader Joe's")).toBeTruthy();
    expect(screen.getByLabelText('Date, Mon Sep 28')).toBeTruthy();
    expect(screen.getByLabelText('Paid with, VISA ••4421')).toBeTruthy();
    expect(screen.getByText('Read the store, amount, date and card.')).toBeTruthy();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    // The shop printed no category: a name with no keyword in it is filed under Other.
    expect(mockCreate).toHaveBeenCalledWith({
      ...SAVED_SCAN,
      category_id: 'other',
      source: 'scan',
    });
  });

  it('Scan files a store the catalogue does not know by the keywords in its name', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, { ...READ, merchant: 'Sunrise Bakery' });

    onFinalPage(screen);
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      merchant: 'Sunrise Bakery',
      category_id: 'groceries',
      source: 'scan',
    });
  });

  it('Scan files a store the catalogue knows under its brand', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, { ...READ, merchant: 'WHOLE FOODS' });

    onFinalPage(screen);
    expect(screen.getByLabelText('Change store, currently Whole Foods')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Whole Foods|wholefoods.com');
    expect(screen.getByText('Filed under Groceries')).toBeTruthy();
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: 'b-wf',
      merchant: 'Whole Foods',
      category_id: 'groceries',
      source: 'scan',
    });
  });

  it('Back from a scanned receipt returns to the amount page, with the scan kept', async () => {
    const screen = await render(<AddReceiptScreen />);
    await scanOnForm(screen, READ);

    await press(screen, 'Back');

    onAmountPage(screen);
    expect(router.back).not.toHaveBeenCalled();
    await press(screen, 'Continue');
    expect(screen.getByLabelText("Change store, currently Trader Joe's")).toBeTruthy();
  });

  it('Upload reads flat text only on a native build without layout recognition', async () => {
    mockHasLayout = false;
    mockAsk.mockResolvedValueOnce('photos');
    mockLibrary.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://receipt.jpg' }] });
    mockRecognize.mockResolvedValueOnce([]);
    mockRecognizeText.mockResolvedValueOnce('receipt');
    mockParsed = READ;
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Upload');

    await waitFor(() => onFinalPage(screen));
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      ...SAVED_SCAN,
      category_id: 'other',
      source: 'upload',
    });
    expect(mockRecognizeText).toHaveBeenCalledTimes(1);
  });

  it('Upload does not read a file twice when a current build finds no text', async () => {
    mockAsk.mockResolvedValueOnce('photos');
    mockLibrary.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://blank.jpg' }] });
    mockRecognize.mockResolvedValueOnce([]);
    mockParsed = {};
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Upload');

    await waitFor(() => expect(mockRecognize).toHaveBeenCalledTimes(1));
    expect(mockRecognizeText).not.toHaveBeenCalled();
  });

  it('draws the amount as a gap when no total was read', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, { ...READ, total: undefined });

    onFinalPage(screen);
    expect(screen.getByText('Read the store, date and card.')).toBeTruthy();
    expect(screen.getByText('Check the amount below — it will save either way.')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();
    expect(screen.queryByText(/\$0/)).toBeNull();
  });

  it('keeps an amount already typed when the reading has no total', async () => {
    const screen = await render(<AddReceiptScreen />);
    await typeAmount(screen, '5');

    await scanOnForm(screen, { ...READ, total: undefined });

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $5.00' })).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeEnabled();
  });

  it('draws the store as a gap when no store was read', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, { ...READ, merchant: undefined });

    onFinalPage(screen);
    expect(screen.getByText('Read the amount, date and card.')).toBeTruthy();
    expect(screen.getByText('Check the store below — it will save either way.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
    expect(screen.getByLabelText('Save receipt')).toBeDisabled();
  });

  it('stays on the amount page, and says so, when nothing at all was read', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, {});

    onAmountPage(screen);
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(
      screen.getByText('Check the store, date and amount below — it will save either way.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Continue')).toBeDisabled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('drops a day that is not on the calendar rather than saving another one', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, { ...READ, date: '2026-02-30' });

    onFinalPage(screen);
    expect(screen.getByText('Read the store, amount and card.')).toBeTruthy();
    expect(screen.getByLabelText('Date, Today, Wed Oct 7')).toBeTruthy();
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].purchased_on).toBe('2026-10-07');
  });

  it('says it is reading while the camera works, and holds both buttons', async () => {
    let finish: (value: unknown) => void = () => {};
    mockCapture.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    mockParsed = READ;
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Scan');
    expect(screen.getByText('Reading the receipt…')).toBeTruthy();
    expect(screen.getByLabelText('Scan')).toBeDisabled();
    expect(screen.getByLabelText('Upload')).toBeDisabled();

    await act(async () => finish({ text: 'receipt', lines: [] }));

    await waitFor(() => onFinalPage(screen));
    expect(screen.queryByText('Reading the receipt…')).toBeNull();
  });

  it('says the one failure line, and stays on the amount page, when the camera fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCapture.mockRejectedValueOnce(new Error('camera gone'));
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Scan');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    onAmountPage(screen);
    expect(screen.queryByText('Reading the receipt…')).toBeNull();
    log.mockRestore();
  });
});

describe('the free allowance', () => {
  it('lets a free account with scans left open the camera, and says what is left', async () => {
    mockPro = { pro: false, ready: true };
    mockReceipts = {
      data: [...savedThisMonth('scan', 12), ...savedThisMonth('manual', 30)],
      isFetched: true,
      isError: false,
    };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Free this month: 3 scans and 15 uploads left')).toBeTruthy();
    await scanOnForm(screen, READ);

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    onFinalPage(screen);
  });

  it('lets a free account with uploads left open the picker', async () => {
    mockPro = { pro: false, ready: true };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Upload');

    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('words a single scan left in the singular', async () => {
    mockPro = { pro: false, ready: true };
    mockReceipts = {
      data: [...savedThisMonth('scan', 14), ...savedThisMonth('upload', 14)],
      isFetched: true,
      isError: false,
    };
    const screen = await render(<AddReceiptScreen />);
    expect(screen.getByText('Free this month: 1 scan and 1 upload left')).toBeTruthy();
  });

  it('shows the explainer at the 16th scan, before the camera opens, and keeps uploads open', async () => {
    mockPro = { pro: false, ready: true };
    mockReceipts = { data: savedThisMonth('scan', 15), isFetched: true, isError: false };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Free this month: 0 scans and 15 uploads left')).toBeTruthy();
    expect(screen.getByLabelText('Scan')).toHaveProp(
      'accessibilityHint',
      'Point the camera at a paper receipt. Part of Skip Pro.',
    );
    await press(screen, 'Scan');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id: 'scan' } });
    expect(mockCapture).not.toHaveBeenCalled();

    jest.mocked(router.push).mockClear();
    await press(screen, 'Upload');
    expect(router.push).not.toHaveBeenCalled();
    expect(mockAsk).toHaveBeenCalledTimes(1);
  });

  it('shows the explainer at the 16th upload, before the picker opens', async () => {
    mockPro = { pro: false, ready: true };
    mockReceipts = { data: savedThisMonth('upload', 15), isFetched: true, isError: false };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Upload');

    expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id: 'scan' } });
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('counts only this month: last month’s 15 scans leave this month’s open', async () => {
    mockPro = { pro: false, ready: true };
    mockReceipts = {
      data: Array.from({ length: 15 }, () => ({
        source: 'scan',
        created_at: '2026-09-20T15:00:00.000Z',
      })),
      isFetched: true,
      isError: false,
    };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Free this month: 15 scans and 15 uploads left')).toBeTruthy();
    await scanOnForm(screen, READ);
    expect(mockCapture).toHaveBeenCalledTimes(1);
  });

  it('has no count and no limit on Pro', async () => {
    mockReceipts = { data: savedThisMonth('scan', 200), isFetched: true, isError: false };
    const screen = await render(<AddReceiptScreen />);

    expect(screen.queryByText(/Free this month/)).toBeNull();
    expect(screen.getByLabelText('Scan')).toHaveProp(
      'accessibilityHint',
      'Point the camera at a paper receipt',
    );
    await scanOnForm(screen, READ);
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each(['Scan', 'Upload'])(
    '%s is dimmed until Pro is known, so a payer never sees the explainer',
    async (label) => {
      mockPro = { pro: false, ready: false };
      const screen = await render(<AddReceiptScreen />);

      expect(screen.getByLabelText(label)).toBeDisabled();
      await press(screen, label);

      expect(router.push).not.toHaveBeenCalled();
      expect(mockCapture).not.toHaveBeenCalled();
      expect(mockAsk).not.toHaveBeenCalled();
    },
  );

  it.each(['Scan', 'Upload'])(
    '%s is dimmed on free until the month’s receipts are counted',
    async (label) => {
      mockPro = { pro: false, ready: true };
      mockReceipts = { data: [], isFetched: false, isError: false };
      const screen = await render(<AddReceiptScreen />);

      expect(screen.getByLabelText(label)).toBeDisabled();
      expect(screen.queryByText(/Free this month/)).toBeNull();
    },
  );

  it('does not block when the receipts could not be read: the database still holds the line', async () => {
    mockPro = { pro: false, ready: true };
    mockReceipts = { data: [], isFetched: true, isError: true };
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, READ);
    expect(mockCapture).toHaveBeenCalledTimes(1);
  });

  it('typing a receipt stays free', async () => {
    mockPro = { pro: false, ready: true };
    const screen = await render(<AddReceiptScreen />);

    await typeAmount(screen, '12');
    await press(screen, 'Continue');
    await searchStore(screen, 'Deli');
    await press(screen, 'Add Deli as a new store');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].source).toBe('manual');
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([
    ['a scan', ROUTE, 'scan', 'Scanning more than 15 receipts a month is part of Skip Pro.'],
    [
      'a voice hand-off',
      { ...ROUTE, scannedVia: 'voice', from: 'voice' },
      'voice',
      'Adding receipts by voice is part of Skip Pro.',
    ],
  ])(
    'a free account’s save of %s that the database refuses goes to the explainer, not the failure line',
    async (_, params, id, message) => {
      mockPro = { pro: false, ready: true };
      mockCreate.mockRejectedValueOnce({ code: 'P0001', message });
      mockParams = params;
      const screen = await render(<AddReceiptScreen />);

      await press(screen, 'Save receipt');

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id } }),
      );
      // A refused scan recounts the month; a voice refusal has nothing to recount.
      expect(mockRecount).toHaveBeenCalledTimes(id === 'scan' ? 1 : 0);
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
      expect(router.back).not.toHaveBeenCalled();
      expect(router.dismissTo).not.toHaveBeenCalled();
      // Pushed, so Back returns to the filled-in form.
      onFinalPage(screen);
      expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
    },
  );

  it('a refusal for someone the app thinks has Pro is a failure: the line is shown and reported', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const refusal = { code: 'P0001', message: 'Scanning receipts is part of Skip Pro.' };
    mockCreate.mockRejectedValueOnce(refusal);
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.push).not.toHaveBeenCalled();
    // failureMessage's report: the Metro log in development, Sentry in a release build.
    expect(log).toHaveBeenCalledWith('[failure]', refusal);
    log.mockRestore();
  });

  it('any other failure still says the one failure line', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(screen.getAllByText(FAILURE_MESSAGE)).toHaveLength(1);
    expect(router.push).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
