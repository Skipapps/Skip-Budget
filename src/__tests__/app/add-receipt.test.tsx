import { render } from '@testing-library/react-native';

import AddReceiptScreen from '@/app/add-receipt';

/**
 * What the receipt editor does when it cannot read the receipt.
 *
 * This one already refused to open a blank edit — but it did so by dropping the
 * `id`, which turned the screen into a create. On a read that merely failed
 * that files a second copy of a receipt that is still there. Failed, gone and
 * still loading are three different answers and none of them is "add one".
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/brands/brand-field', () => ({ BrandField: () => null }));

// The scanner is a native module, and nothing here scans.
jest.mock('../../../modules/receipt-scanner', () => ({
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
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
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
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'receipt-1' }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockUseUpdate = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
const mockUseCreate = jest.fn(() => ({ mutateAsync: mockCreate, isPending: false }));
const mockUseDelete = jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false }));

jest.mock('@/api/mutations', () => ({
  useUpdateReceipt: () => mockUseUpdate(),
  useCreateReceipt: () => mockUseCreate(),
  useDeleteReceipt: () => mockUseDelete(),
}));

jest.mock('@/api/brands', () => ({
  guessCategory: () => 'other',
  matchBrand: () => null,
  useBrandDirectory: () => ({ data: [] }),
  useSpendCategories: () => ({ data: [] }),
}));

let mockReceipt: { data: unknown; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useReceipt: () => ({ ...mockReceipt, refetch: mockRefetch }),
  usePaymentSources: () => ({ sources: [] }),
}));

beforeEach(() => {
  mockReceipt = { data: null, isError: false, isFetched: false };
  [mockUpdate, mockCreate, mockRefetch, mockUseUpdate, mockUseCreate, mockUseDelete].forEach((fn) =>
    fn.mockClear(),
  );
});

describe('Add receipt — an edit whose receipt could not be read', () => {
  it('says so instead of quietly becoming a second copy of the receipt', async () => {
    mockReceipt = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddReceiptScreen />);

    expect(getByText('Could not open this receipt')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit receipt')).toBeNull();
    expect(queryByText('Add a receipt')).toBeNull();
    expect(queryByText('Continue')).toBeNull();

    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('holds the skeleton while the read is still running', async () => {
    const { getByText, queryByText } = await render(<AddReceiptScreen />);

    expect(getByText('Edit receipt')).toBeTruthy();
    expect(queryByText('Could not open this receipt')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
  });

  it('opens the form as usual once the receipt is in hand', async () => {
    mockReceipt = {
      data: {
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
      },
      isError: false,
      isFetched: true,
    };
    const { getByText, queryByText } = await render(<AddReceiptScreen />);

    expect(getByText('Edit receipt')).toBeTruthy();
    expect(queryByText('Could not open this receipt')).toBeNull();
    expect(mockUseUpdate).toHaveBeenCalled();
  });

  it('says the receipt is gone when the read lands empty', async () => {
    mockReceipt = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddReceiptScreen />);

    expect(getByText('That receipt is not here')).toBeTruthy();
    expect(queryByText('Edit receipt')).toBeNull();
    expect(queryByText('Add a receipt')).toBeNull();
    expect(mockUseUpdate).not.toHaveBeenCalled();
    expect(mockUseCreate).not.toHaveBeenCalled();
  });
});
