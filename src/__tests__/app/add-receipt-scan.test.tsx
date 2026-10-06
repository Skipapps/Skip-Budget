import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddReceiptScreen from '@/app/add-receipt';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { toIsoDate } from '@/lib/date';

/**
 * A scanned receipt opens on the last step, a review of what was read above the date and Save, on
 * both ways in: a scan from the receipts list (route params) and Scan / Upload on the form itself.
 * A reading missing the amount or the store opens on that step instead. Scanning is Pro: a free
 * account is shown the explainer before the camera opens, and a save the database refuses for Pro
 * goes to the explainer rather than the failure line.
 */

const mockProps: Record<string, any> = {};

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));

// Leaf inputs record their props; the primary button accepts a press even while disabled.
jest.mock('@/components/ui/button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/flow/amount-step', () => ({
  AmountStep: (props: any) => {
    mockProps.amount = props;
    return null;
  },
}));
jest.mock('@/components/brands/brand-field', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    BrandField: (props: any) => {
      mockProps.store = props;
      return <Text>Store field</Text>;
    },
  };
});
jest.mock('@/components/brands/brand-mark', () => ({
  BrandMark: (props: any) => {
    mockProps.mark = props;
    return null;
  },
}));
jest.mock('@/components/ui/source-tiles', () => ({ SourceTiles: () => null }));
jest.mock('@/components/ui/text-field', () => ({ TextField: () => null }));
jest.mock('@/components/flow/inline-calendar', () => ({
  InlineCalendar: (props: any) => {
    mockProps.calendar = props;
    return null;
  },
}));

const mockScanner = { available: true };
const mockCapture = jest.fn();
const mockRecognize = jest.fn();
const mockRecognizeText = jest.fn();
jest.mock('../../../modules/receipt-scanner', () => ({
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
    danger: '#CC0000',
    accentInk: '#905479',
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

jest.mock('@/api/brands', () => ({
  guessCategory: () => 'groceries',
  matchBrand: () => null,
  useBrandDirectory: () => ({ data: [] }),
  useSpendCategories: () => ({ data: [] }),
}));

jest.mock('@/api/queries', () => ({
  useReceipt: () => ({ data: null, isError: false, isFetched: false, refetch: jest.fn() }),
  usePaymentSources: () => ({
    sources: [{ id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' }],
  }),
}));

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

const onLastStep = (screen: Screen) => {
  expect(screen.getByText('When was it?')).toBeTruthy();
  expect(screen.getByText('Save receipt')).toBeTruthy();
};
const onAmountStep = (screen: Screen) => {
  expect(screen.getByText('How much did you spend?')).toBeTruthy();
  expect(screen.queryByText('Save receipt')).toBeNull();
};
const onStoreStep = (screen: Screen) => {
  expect(screen.getByText('Store field')).toBeTruthy();
  expect(screen.queryByText('Save receipt')).toBeNull();
};

const scanOnForm = async (screen: Screen, parsed: Record<string, unknown>) => {
  mockParsed = parsed;
  mockCapture.mockResolvedValueOnce({ text: 'receipt', lines: [] });
  await fireEvent.press(screen.getByLabelText('Scan'));
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
  jest.clearAllMocks();
  for (const key of Object.keys(mockProps)) delete mockProps[key];
  mockParams = {};
  mockParsed = {};
  mockScanner.available = true;
  mockPro = { pro: true, ready: true };
  mockCreate.mockResolvedValue({ id: 'receipt-new' });
});

describe('a scan from the receipts list', () => {
  it('opens on the last step with what was read, and saves it as a scan', async () => {
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    onLastStep(screen);
    expect(screen.getByLabelText('Amount, $15.99')).toBeTruthy();
    expect(screen.getByLabelText("Store, Trader Joe's")).toBeTruthy();
    expect(screen.getByLabelText('Paid with, VISA ••4421')).toBeTruthy();
    expect(mockProps.mark).toMatchObject({ name: "Trader Joe's", size: 40 });
    expect(toIsoDate(mockProps.calendar.value)).toBe('2026-09-28');

    await fireEvent.press(screen.getByText('Save receipt'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({ ...SAVED_SCAN, source: 'scan' });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('opens on the amount when no total was read', async () => {
    mockParams = { ...ROUTE, scannedAmount: '', scannedRead: 'store,date,card' };
    const screen = await render(<AddReceiptScreen />);

    onAmountStep(screen);
  });

  it('opens on the store when no store was read', async () => {
    mockParams = { ...ROUTE, scannedStore: '', scannedRead: 'amount,date,card' };
    const screen = await render(<AddReceiptScreen />);

    onStoreStep(screen);
  });

  it('leaves a voice hand-off where it always opened, on the amount', async () => {
    mockParams = { ...ROUTE, scannedVia: 'voice', from: 'voice' };
    const screen = await render(<AddReceiptScreen />);

    onAmountStep(screen);
  });
});

describe('the review on the last step', () => {
  it('opens the step behind each line to fix it, and Back still walks back one step', async () => {
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    await fireEvent.press(screen.getByLabelText('Amount, $15.99'));
    onAmountStep(screen);

    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByLabelText("Store, Trader Joe's"));
    onStoreStep(screen);

    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByLabelText('Paid with, VISA ••4421'));
    onStoreStep(screen);

    await fireEvent.press(screen.getByText('Continue'));
    onLastStep(screen);
    await fireEvent.press(screen.getByLabelText('Back'));
    onStoreStep(screen);
  });

  it('is not shown on a receipt typed by hand', async () => {
    const screen = await render(<AddReceiptScreen />);

    await act(() => mockProps.amount.onChange('12'));
    await fireEvent.press(screen.getByText('Continue'));
    await act(() =>
      mockProps.store.onChange({ brandId: null, name: 'Deli', domain: null, categoryId: '' }),
    );
    await fireEvent.press(screen.getByText('Continue'));

    onLastStep(screen);
    expect(screen.queryByLabelText(/^Amount, /)).toBeNull();
  });
});

describe('Scan and Upload on the form', () => {
  it('Scan opens on the last step with what was read, and saves it as a scan', async () => {
    const screen = await render(<AddReceiptScreen />);
    onAmountStep(screen);

    await scanOnForm(screen, READ);

    onLastStep(screen);
    expect(screen.getByLabelText('Amount, $15.99')).toBeTruthy();
    expect(screen.getByText('Read the store, amount, date and card.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Save receipt'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({ ...SAVED_SCAN, source: 'scan' });
  });

  it('Upload opens on the last step too, and saves it as an upload', async () => {
    mockAsk.mockResolvedValueOnce('photos');
    mockLibrary.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file://receipt.jpg' }] });
    mockRecognize.mockResolvedValueOnce([]);
    mockRecognizeText.mockResolvedValueOnce('receipt');
    mockParsed = READ;
    const screen = await render(<AddReceiptScreen />);

    await fireEvent.press(screen.getByLabelText('Upload'));

    await waitFor(() => onLastStep(screen));
    await fireEvent.press(screen.getByText('Save receipt'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({ ...SAVED_SCAN, source: 'upload' });
  });

  it('stays on the amount when no total was read', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, { ...READ, total: undefined });

    onAmountStep(screen);
  });

  it('opens on the store when no store was read', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, { ...READ, merchant: undefined });

    onStoreStep(screen);
  });

  it('drops a day that is not on the calendar rather than saving another one', async () => {
    const screen = await render(<AddReceiptScreen />);

    await scanOnForm(screen, { ...READ, date: '2026-02-30' });

    onLastStep(screen);
    expect(screen.getByText('Read the store, amount and card.')).toBeTruthy();
    expect(toIsoDate(mockProps.calendar.value)).toBe(toIsoDate(new Date()));
    await fireEvent.press(screen.getByText('Save receipt'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].purchased_on).toBe(toIsoDate(new Date()));
  });
});

describe('scanning is Pro', () => {
  it.each(['Scan', 'Upload'])(
    'a free account tapping %s is shown the explainer before anything opens',
    async (label) => {
      mockPro = { pro: false, ready: true };
      const screen = await render(<AddReceiptScreen />);

      await fireEvent.press(screen.getByLabelText(label));

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/pro-feature',
        params: { id: 'scan' },
      });
      expect(mockCapture).not.toHaveBeenCalled();
      expect(mockAsk).not.toHaveBeenCalled();
    },
  );

  it.each(['Scan', 'Upload'])(
    '%s is dimmed until Pro is known, so a payer never sees the explainer',
    async (label) => {
      mockPro = { pro: false, ready: false };
      const screen = await render(<AddReceiptScreen />);

      expect(screen.getByLabelText(label)).toBeDisabled();
      await fireEvent.press(screen.getByLabelText(label));

      expect(router.push).not.toHaveBeenCalled();
      expect(mockCapture).not.toHaveBeenCalled();
      expect(mockAsk).not.toHaveBeenCalled();
    },
  );

  it('typing a receipt stays free', async () => {
    mockPro = { pro: false, ready: true };
    const screen = await render(<AddReceiptScreen />);

    await act(() => mockProps.amount.onChange('12'));
    await fireEvent.press(screen.getByText('Continue'));
    await act(() =>
      mockProps.store.onChange({ brandId: null, name: 'Deli', domain: null, categoryId: '' }),
    );
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Save receipt'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].source).toBe('manual');
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([
    ['a scan', ROUTE, 'scan', 'Scanning receipts is part of Skip Pro.'],
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
      if (id === 'voice') {
        await fireEvent.press(screen.getByText('Continue'));
        await fireEvent.press(screen.getByText('Continue'));
      }

      await fireEvent.press(screen.getByText('Save receipt'));

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id } }),
      );
      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
      expect(router.back).not.toHaveBeenCalled();
      expect(router.dismissTo).not.toHaveBeenCalled();
    },
  );

  it('a refusal for someone the app thinks has Pro is a failure: the line is shown and reported', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const refusal = { code: 'P0001', message: 'Scanning receipts is part of Skip Pro.' };
    mockCreate.mockRejectedValueOnce(refusal);
    mockParams = ROUTE;
    const screen = await render(<AddReceiptScreen />);

    await fireEvent.press(screen.getByText('Save receipt'));

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

    await fireEvent.press(screen.getByText('Save receipt'));

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.push).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
