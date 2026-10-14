import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddReceiptScreen from '@/app/add-receipt';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Nothing dated more than seven years ago can be recorded: the database deletes it that night and
 * refuses to write it. The receipt calendar greys out every day before the first kept day (today
 * less seven years, a leap day going back to the 28th, as Postgres counts), and Save refuses such a
 * day however it arrived (a scan from the list, the camera, a voice hand-off, an old receipt left
 * where it is) with a hint, never the failure line.
 */

jest.mock('@/components/receipts/book-icon', () => ({ BookIcon: () => null }));
jest.mock('@/api/receipt-books', () => ({
  useReceiptBooks: () => ({
    data: [],
    isLoading: false,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useReceiptBookDefault: () => ({ data: null, isPending: false }),
  useSetReceiptBookDefault: () => ({ mutate: jest.fn() }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/habits/habit-icon', () => ({ HabitIcon: () => null }));

const mockCapture = jest.fn();
jest.mock('../../../modules/receipt-scanner', () => ({
  hasLayoutRecognition: () => true,
  captureReceipt: () => mockCapture(),
  isCaptureAvailable: () => true,
  isRecognitionAvailable: () => true,
  isScanningAvailable: () => true,
  recognizeReceipt: jest.fn(),
  recognizeText: jest.fn(),
}));
let mockParsed: Record<string, unknown> = {};
jest.mock('@/lib/receipt-parser', () => ({
  parseReceipt: () => mockParsed,
  parseReceiptFromLines: () => mockParsed,
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    card: '#FFFFFF',
    accent: '#905479',
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

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
// Card and account names for Paid with: none locked here.
jest.mock('@/api/payment-labels', () => ({
  usePaymentLabels: () => ({ sources: [], labelOf: () => null, isLoading: false }),
}));
// The free allowance's count: nothing read by camera or upload this month.
jest.mock('@/api/capture-usage', () => ({
  useCaptureUsage: () => ({ data: [], isSuccess: true, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/api/confirm-pro', () => {
  const actual = jest.requireActual('@/api/confirm-pro');
  return { ...actual, useProWrite: () => actual.useProWrite(async () => 'unknown') };
});

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateReceipt: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandSearch: () => ({ data: [], isFetching: false }),
  useBrandDirectory: () => ({ data: [] }),
  useSpendCategories: () => ({ data: [] }),
}));
jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: null, isLoading: false, isFetching: false }),
}));

let mockSavedFrom = '2026-10-05';
jest.mock('@/api/habits', () => ({
  useHabit: () => ({ data: { id: 'coffee', saved_from: mockSavedFrom } }),
}));

let mockReceipt: unknown = null;
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [], isFetched: true, isError: false, refetch: jest.fn() }),
  useReceipt: () => ({
    data: mockReceipt,
    isError: false,
    isFetched: mockReceipt !== null,
    refetch: jest.fn(),
  }),
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
}));

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

type Screen = Awaited<ReturnType<typeof render>>;

const HINT = 'Pick a day in the last seven years.';

/** What the receipts list hands over after a scan; only the day changes per case. */
const scanned = (day: string) => ({
  scannedStore: 'Corner Deli',
  scannedCategory: 'dining',
  scannedAmount: '8.40',
  scannedDate: day,
  scannedSource: 'card-1',
  scannedRead: 'store,amount,date,card',
});

const OLD_RECEIPT = {
  id: 'receipt-1',
  brand_id: null,
  merchant: 'Corner Deli',
  amount: 8.4,
  purchased_on: '2019-10-08',
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
  brands: null,
  habit_id: null,
  habit: null,
};

const press = (screen: Screen, label: string | RegExp) =>
  fireEvent.press(screen.getByLabelText(label));

/** Walks the calendar to a month the way a person would: the month title, years back, the month. */
async function showMonth(screen: Screen, month: string, yearsBack: number) {
  await press(screen, /Choose a different month\.$/);
  for (let i = 0; i < yearsBack; i += 1) await press(screen, 'Previous year');
  await press(screen, month);
}

const blocked = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.disabled);

beforeEach(() => {
  jest.clearAllMocks();
  // Friday 9 October 2026: the first kept day is Wednesday 9 October 2019.
  jest.setSystemTime(new Date('2026-10-09T09:00:00'));
  resetLocaleForTests();
  mockParams = {};
  mockParsed = {};
  mockReceipt = null;
  mockSavedFrom = '2026-10-05';
  mockCreate.mockResolvedValue({ id: 'receipt-new' });
  mockUpdate.mockResolvedValue({ id: 'receipt-1' });
});
afterAll(() => resetLocaleForTests());

describe('the receipt calendar', () => {
  it('greys out the day before the first kept day, and the first kept day saves', async () => {
    mockParams = scanned('2026-10-01');
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Pick date');
    await showMonth(screen, 'October', 7);

    expect(blocked(screen, 'Tuesday 8 October 2019')).toBe(true);
    expect(blocked(screen, 'Wednesday 9 October 2019')).toBe(false);

    await press(screen, 'Wednesday 9 October 2019');
    await press(screen, 'Done');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ purchased_on: '2019-10-09' });
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('takes a leap day back to the 28th, as the database does', async () => {
    // Tuesday 29 February 2028: the first kept day is Sunday 28 February 2021, not 1 March.
    jest.setSystemTime(new Date('2028-02-29T09:00:00'));
    mockParams = scanned('2028-02-20');
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Pick date');
    await showMonth(screen, 'February', 7);

    expect(blocked(screen, 'Saturday 27 February 2021')).toBe(true);
    expect(blocked(screen, 'Sunday 28 February 2021')).toBe(false);
  });

  it('keeps a habit’s first day when it is the later one', async () => {
    mockParams = { id: 'receipt-1' };
    mockSavedFrom = '2026-10-07';
    mockReceipt = {
      ...OLD_RECEIPT,
      purchased_on: '2026-10-08',
      source: 'habit',
      habit_id: 'coffee',
      habit: { name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' },
    };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Pick date');
    expect(blocked(screen, 'Tuesday 6 October 2026')).toBe(true);
    expect(blocked(screen, 'Wednesday 7 October 2026')).toBe(false);
  });

  it('keeps the first kept day when a habit’s first day is earlier', async () => {
    mockParams = { id: 'receipt-1' };
    mockSavedFrom = '2019-01-01';
    mockReceipt = {
      ...OLD_RECEIPT,
      purchased_on: '2026-10-08',
      source: 'habit',
      habit_id: 'coffee',
      habit: { name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' },
    };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Pick date');
    await showMonth(screen, 'October', 7);
    expect(blocked(screen, 'Tuesday 8 October 2019')).toBe(true);
    expect(blocked(screen, 'Wednesday 9 October 2019')).toBe(false);
  });
});

describe('Save, with a day that came without the calendar', () => {
  it('refuses a scanned day before the first kept day, with the hint', async () => {
    mockParams = scanned('2019-10-08');
    const screen = await render(<AddReceiptScreen />);
    await press(screen, 'Save receipt');

    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('saves a scanned first kept day', async () => {
    mockParams = scanned('2019-10-09');
    const screen = await render(<AddReceiptScreen />);
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      purchased_on: '2019-10-09',
      source: 'scan',
    });
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('refuses a day the camera read on the form', async () => {
    const screen = await render(<AddReceiptScreen />);
    mockParsed = { merchant: 'Corner Deli', total: 8.4, date: '2019-10-08', last4: '4421' };
    mockCapture.mockResolvedValueOnce({ text: 'receipt', lines: [] });
    await press(screen, 'Scan');
    await press(screen, 'Save receipt');

    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('refuses a day heard by voice, handed over with More options', async () => {
    mockParams = {
      scannedVia: 'voice',
      from: 'voice',
      scannedStore: 'Corner Deli',
      scannedCategory: 'dining',
      scannedAmount: '8.40',
      scannedDate: '2019-10-08',
      scannedSource: 'card-1',
    };
    const screen = await render(<AddReceiptScreen />);
    await press(screen, 'Save receipt');

    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('refuses an old receipt left on its day, as the database would', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = OLD_RECEIPT;
    const screen = await render(<AddReceiptScreen />);
    await press(screen, 'Save changes');

    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('refuses a scanned 27 February 2021 on 29 February 2028, and saves the 28th', async () => {
    jest.setSystemTime(new Date('2028-02-29T09:00:00'));
    mockParams = scanned('2021-02-27');
    const refused = await render(<AddReceiptScreen />);
    await press(refused, 'Save receipt');
    expect(await refused.findByText(HINT)).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();

    mockParams = scanned('2021-02-28');
    const saved = await render(<AddReceiptScreen />);
    await press(saved, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ purchased_on: '2021-02-28' });
  });

  it('says it in Spanish and French', async () => {
    mockParams = scanned('2019-10-08');
    setLanguage('es');
    const es = await render(<AddReceiptScreen />);
    await press(es, 'Guardar recibo');
    expect(await es.findByText('Elige un día de los últimos siete años.')).toBeTruthy();

    setLanguage('fr');
    const fr = await render(<AddReceiptScreen />);
    await press(fr, 'Enregistrer le reçu');
    expect(await fr.findByText('Choisis un jour des sept dernières années.')).toBeTruthy();
  });
});

describe('the database’s refusal', () => {
  it('shows the hint, not the failure line, when the server’s day is already later', async () => {
    mockCreate.mockRejectedValue({
      code: 'SK007',
      message: 'Pick a day in the last seven years.',
    });
    mockParams = scanned('2019-10-09');
    const screen = await render(<AddReceiptScreen />);
    await press(screen, 'Save receipt');

    expect(await screen.findByText(HINT)).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('keeps the failure line for a 22023, which the database raises for other reasons', async () => {
    mockCreate.mockRejectedValue({ code: '22023', message: 'Name the goal and the receipt.' });
    mockParams = scanned('2019-10-09');
    const screen = await render(<AddReceiptScreen />);
    await press(screen, 'Save receipt');

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('keeps the failure line for anything else', async () => {
    mockCreate.mockRejectedValue({ code: '08006', message: 'connection failure' });
    mockParams = scanned('2019-10-09');
    const screen = await render(<AddReceiptScreen />);
    await press(screen, 'Save receipt');

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(HINT)).toBeNull();
  });
});
