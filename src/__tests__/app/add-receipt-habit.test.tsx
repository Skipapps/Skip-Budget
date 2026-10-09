import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddReceiptScreen from '@/app/add-receipt';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Editing a receipt filed from a habit: the store is the habit and cannot be retyped, and moving it
 * onto a day the habit already has says so in words, not as a failure.
 */

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
const mockHabitIcon = jest.fn();
jest.mock('@/components/habits/habit-icon', () => ({
  HabitIcon: (props: object) => {
    mockHabitIcon(props);
    return null;
  },
}));
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

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => ({ id: 'receipt-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false, ready: true }) }));

const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
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
jest.mock('@/api/known-stores', () => ({
  ...jest.requireActual('@/api/known-stores'),
  useKnownStores: () => [],
  useRememberStore: () => async () => {},
}));
jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: undefined, isLoading: false, isFetching: false }),
}));

const COFFEE_RECEIPT = {
  id: 'receipt-1',
  brand_id: null,
  merchant: 'Coffee',
  amount: 5,
  purchased_on: '2026-10-06',
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  source: 'habit',
  image_path: null,
  brands: null,
  habit_id: 'coffee',
  habit: { name: 'Coffee', icon_id: 'food-dining/coffee', color: 'caramel' },
};

// The habit's creation day, read for the date: Monday the 5th unless a test says otherwise.
let mockSavedFrom = '2026-10-05';
jest.mock('@/api/habits', () => ({
  useHabit: () => ({ data: { id: 'coffee', saved_from: mockSavedFrom } }),
}));

let mockReceipt: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useReceipts: () => ({ data: [], isFetched: true, isError: false, refetch: jest.fn() }),
  useReceipt: () => ({ ...mockReceipt, refetch: jest.fn() }),
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
jest.setSystemTime(new Date('2026-10-09T09:00:00'));

const STORE_PLACEHOLDER = 'Enter the store name';
const DAY_TAKEN = 'Coffee already has a receipt on that day.';

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockReset();
  mockSavedFrom = '2026-10-05';
  resetLocaleForTests();
  mockReceipt = { data: COFFEE_RECEIPT, isError: false, isFetched: true };
});
afterAll(() => resetLocaleForTests());

describe('editing a habit’s receipt', () => {
  it('shows the store as the habit, read-only: its icon and name, nothing to type', async () => {
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByText('Store')).toBeTruthy();
    expect(screen.getByText('Coffee')).toBeTruthy();
    expect(mockHabitIcon).toHaveBeenCalledWith({
      iconId: 'food-dining/coffee',
      color: 'caramel',
      size: 40,
    });
    expect(screen.queryByPlaceholderText(STORE_PLACEHOLDER)).toBeNull();
    expect(screen.queryByLabelText(/^Store, /)).toBeNull();
    expect(screen.queryByLabelText(/^Change store/)).toBeNull();
  });

  it('saves with the habit’s name, category and origin unchanged', async () => {
    mockUpdate.mockResolvedValue({ id: 'receipt-1' });
    const screen = await render(<AddReceiptScreen />);
    await fireEvent.press(screen.getByLabelText('Save changes'));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'receipt-1',
      values: expect.objectContaining({
        merchant: 'Coffee',
        category_id: 'dining',
        source: 'habit',
        card_id: 'card-1',
        purchased_on: '2026-10-06',
      }),
    });
    // The habit link is the database's to keep; the form never writes it.
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('habit_id');
  });

  it('says the habit already has that day, in place of the failure line', async () => {
    mockUpdate.mockRejectedValue({ code: '23505', message: 'duplicate key value' });
    const screen = await render(<AddReceiptScreen />);
    await fireEvent.press(screen.getByLabelText('Save changes'));

    expect(await screen.findByText(DAY_TAKEN)).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('says it in Spanish and French too', async () => {
    mockUpdate.mockRejectedValue({ code: '23505' });
    setLanguage('es');
    const es = await render(<AddReceiptScreen />);
    await fireEvent.press(es.getByLabelText('Guardar cambios'));
    expect(await es.findByText('Coffee ya tiene un recibo ese día.')).toBeTruthy();

    setLanguage('fr');
    const fr = await render(<AddReceiptScreen />);
    await fireEvent.press(fr.getByLabelText('Enregistrer les modifications'));
    expect(await fr.findByText('Coffee a déjà un reçu ce jour-là.')).toBeTruthy();
  });

  it('will not move it before the day the habit was made, and says why', async () => {
    // Made today: yesterday was never one of its days.
    mockSavedFrom = '2026-10-09';
    mockReceipt = {
      data: { ...COFFEE_RECEIPT, purchased_on: '2026-10-09' },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddReceiptScreen />);
    await fireEvent.press(screen.getByLabelText('Yesterday'));
    await fireEvent.press(screen.getByLabelText('Save changes'));

    expect(await screen.findByText('Coffee started on 9 Oct 2026.')).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('blocks the calendar’s days before the habit was made', async () => {
    mockSavedFrom = '2026-10-07';
    mockReceipt = {
      data: { ...COFFEE_RECEIPT, purchased_on: '2026-10-08' },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddReceiptScreen />);
    await fireEvent.press(screen.getByLabelText('Pick date'));
    expect(screen.getByLabelText('Tuesday 6 October 2026')).toBeDisabled();
    expect(screen.getByLabelText('Wednesday 7 October 2026')).toBeEnabled();
  });

  it('still saves a receipt already dated before the habit, where it is', async () => {
    mockSavedFrom = '2026-10-07';
    mockUpdate.mockResolvedValue({ id: 'receipt-1' });
    // Dated Tuesday the 6th, from before this rule.
    const screen = await render(<AddReceiptScreen />);
    await fireEvent.press(screen.getByLabelText('Save changes'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ purchased_on: '2026-10-06' });
  });

  it('says it in Spanish and French', async () => {
    mockSavedFrom = '2026-10-09';
    mockReceipt = {
      data: { ...COFFEE_RECEIPT, purchased_on: '2026-10-09' },
      isError: false,
      isFetched: true,
    };
    setLanguage('es');
    const es = await render(<AddReceiptScreen />);
    await fireEvent.press(es.getByLabelText('Ayer'));
    await fireEvent.press(es.getByLabelText('Guardar cambios'));
    expect(await es.findByText('Coffee empezó el 9 oct 2026.')).toBeTruthy();

    setLanguage('fr');
    const fr = await render(<AddReceiptScreen />);
    await fireEvent.press(fr.getByLabelText('Hier'));
    await fireEvent.press(fr.getByLabelText('Enregistrer les modifications'));
    expect(await fr.findByText('Coffee a commencé le 9 oct. 2026.')).toBeTruthy();
  });

  it('keeps the plain failure line for a receipt that is not a habit’s', async () => {
    mockReceipt = {
      data: { ...COFFEE_RECEIPT, source: 'manual', habit_id: null, habit: null },
      isError: false,
      isFetched: true,
    };
    mockUpdate.mockRejectedValue({ code: '23505' });
    const screen = await render(<AddReceiptScreen />);
    // An ordinary receipt's store is the typing box again.
    expect(mockHabitIcon).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Save changes'));

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(DAY_TAKEN)).toBeNull();
  });
});
