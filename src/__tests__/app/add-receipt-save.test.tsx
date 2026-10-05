import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddReceiptScreen from '@/app/add-receipt';
import { warn } from '@/lib/haptics';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { toIsoDate } from '@/lib/date';

/**
 * Golden: exactly what the receipt form's Save writes. Pins the object handed to create/update, the
 * hint words, and the step each hint sends the person back to.
 *
 * Leaf inputs are stubs that record their props; everything that decides what gets written is the
 * real form. The primary button stub accepts a press even while disabled, the only way to reach the
 * checks inside Save (the step flow normally holds Continue back).
 */

const mockProps: Record<string, any> = {};

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({ success: jest.fn(), warn: jest.fn(), selection: jest.fn() }));

jest.mock('@/components/ui/button', () => {
  const { Pressable, Text } = require('react-native');
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
  const { Text } = require('react-native');
  return {
    BrandField: (props: any) => {
      mockProps[`brand:${props.label}`] = props;
      return <Text>{`${props.label} field`}</Text>;
    },
  };
});
jest.mock('@/components/ui/source-tiles', () => ({
  SourceTiles: (props: any) => {
    mockProps.sources = props;
    return null;
  },
}));
jest.mock('@/components/ui/text-field', () => ({
  TextField: (props: any) => {
    mockProps[`field:${props.label}`] = props;
    return null;
  },
}));
jest.mock('@/components/flow/inline-calendar', () => ({
  InlineCalendar: (props: any) => {
    mockProps.calendar = props;
    return null;
  },
}));

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
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
    accentInk: '#000000',
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

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateReceipt: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/api/brands', () => ({
  guessCategory: () => 'other',
  matchBrand: () => null,
  useBrandDirectory: () => ({ data: [] }),
  useSpendCategories: () => ({ data: [] }),
}));

let mockReceipt: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useReceipt: () => ({ ...mockReceipt, refetch: jest.fn() }),
  usePaymentSources: () => ({
    sources: [
      { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
      { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
    ],
  }),
}));

const WHOLE_FOODS = {
  brandId: 'b-wf',
  name: 'Whole Foods',
  domain: 'wholefoods.com',
  categoryId: 'groceries',
};

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

const press = (screen: Awaited<ReturnType<typeof render>>, label: string) =>
  fireEvent.press(screen.getByText(label));

const type = (key: string, value: unknown) =>
  act(() => {
    const props = mockProps[key];
    (props.onChange ?? props.onChangeText)(value);
  });

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockProps)) delete mockProps[key];
  mockParams = {};
  mockReceipt = { data: null, isError: false, isFetched: false };
  mockCreate.mockResolvedValue({ id: 'receipt-new' });
  mockUpdate.mockResolvedValue(undefined);
});

describe('Add receipt — what a new receipt saves', () => {
  it('writes every field the flow collects, the note trimmed', async () => {
    const screen = await render(<AddReceiptScreen />);

    await type('amount', '1030.5');
    await press(screen, 'Continue');
    await type('brand:Store', WHOLE_FOODS);
    await type('sources', 'acct-1');
    await type('field:Note', '  Weekly shop  ');
    await press(screen, 'Continue');
    await type('calendar', new Date(2026, 8, 28));
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
  });

  it('fills the gaps with today, Other, no source and no note', async () => {
    const screen = await render(<AddReceiptScreen />);

    await type('amount', '0.10');
    await press(screen, 'Continue');
    await type('brand:Store', { brandId: null, name: 'Corner Deli', domain: null, categoryId: '' });
    await type('field:Note', '   ');
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: null,
      merchant: 'Corner Deli',
      amount: 0.1,
      purchased_on: toIsoDate(new Date()),
      category_id: 'other',
      card_id: null,
      bank_account_id: null,
      note: null,
      source: 'manual',
      image_path: null,
    });
  });

  it('files a card under card_id and a source that is no longer there under neither', async () => {
    const screen = await render(<AddReceiptScreen />);

    await type('amount', '15.99');
    await press(screen, 'Continue');
    await type('brand:Store', WHOLE_FOODS);
    await type('sources', 'card-1');
    await press(screen, 'Continue');
    await type('calendar', new Date(2026, 9, 1));
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      amount: 15.99,
      purchased_on: '2026-10-01',
      card_id: 'card-1',
      bank_account_id: null,
    });

    mockCreate.mockClear();
    await type('sources', 'card-deleted');
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
    await type('amount', typed);
    await press(screen, 'Continue');
    await type('brand:Store', WHOLE_FOODS);
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(saved);
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

    await press(screen, 'Continue');
    await press(screen, 'Continue');
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
  });

  it('falls back to no brand, Other and today for what a scan did not carry', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedAmount: '1100' };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: null,
      merchant: 'Corner Deli',
      amount: 1100,
      purchased_on: toIsoDate(new Date()),
      category_id: 'other',
      card_id: null,
      bank_account_id: null,
      note: null,
      source: 'scan',
      image_path: null,
    });
  });
});

describe('Add receipt — what an edit saves', () => {
  it('writes the row back as it was, keeping how it was captured', async () => {
    mockParams = { id: 'receipt-1' };
    mockReceipt = { data: EXISTING, isError: false, isFetched: true };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
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

    await type('amount', '1030.5');
    await press(screen, 'Continue');
    await type('sources', 'card-1');
    await type('field:Note', '');
    await press(screen, 'Continue');
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
});

describe('Add receipt — the checks inside Save', () => {
  it('asks for the store before the amount, and sends you to the store step', async () => {
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    expect(screen.getByText('Pick a store first.')).toBeTruthy();
    expect(screen.getByText('Store field')).toBeTruthy();
    expect(screen.queryByText('How much did you spend?')).toBeNull();
    expect(screen.queryByText('When was it?')).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('asks for the amount on the amount step when the store is there', async () => {
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Continue');
    await type('brand:Store', WHOLE_FOODS);
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    expect(screen.getByText('Enter how much you spent.')).toBeTruthy();
    expect(screen.getByText('How much did you spend?')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();

    await type('amount', '0');
    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');
    expect(screen.getByText('Enter how much you spent.')).toBeTruthy();
    expect(screen.getByText('How much did you spend?')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('says the one failure line on the date step when the write fails, and stays', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('network down'));
    const screen = await render(<AddReceiptScreen />);

    await type('amount', '15.99');
    await press(screen, 'Continue');
    await type('brand:Store', WHOLE_FOODS);
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(screen.getByText('When was it?')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
