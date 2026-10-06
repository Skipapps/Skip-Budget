import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddBillScreen from '@/app/add-bill';
import AddReceiptScreen from '@/app/add-receipt';
import AddSubscriptionScreen from '@/app/add-subscription';
import { toIsoDate } from '@/lib/date';
import type { VoiceDraft } from '@/lib/voice';
import {
  clearVoiceDraft,
  entryFromDraft,
  entryToForm,
  putVoiceDraft,
  readVoiceDraft,
  type VoiceEntry,
} from '@/lib/voice-draft';

/**
 * The add forms opened by "More options" on the voice review page. What arrives is the review
 * page's edited copy as route params (`entryToForm`): a bill with a known category skips its
 * chooser, and a receipt is filed as a voice capture with no scan report. Saving goes back to Home
 * with `dismissTo`, so nothing can land on the review page again and file the same thing twice; a
 * form opened any other way still goes back.
 */

const mockProps: Record<string, any> = {};

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
  tap: jest.fn(),
}));

jest.mock('@/data/bills-mock', () => ({
  BILL_CATEGORIES: [
    { id: 'housing', label: 'Housing' },
    { id: 'internet', label: 'Internet' },
    { id: 'other', label: 'Other bill' },
  ],
  BILL_ICON_CHOICES: [],
  RECURRENCES: [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Every 3 months' },
    { value: 'yearly', label: 'Yearly' },
  ],
  getBillIcon: () => () => null,
}));

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
jest.mock('@/components/brands/brand-field', () => ({
  BrandField: (props: any) => {
    mockProps[`brand:${props.label}`] = props;
    return null;
  },
}));
jest.mock('@/components/bills/category-picker', () => {
  const { Text } = require('react-native');
  return {
    CategoryPicker: (props: any) => {
      mockProps.category = props;
      return <Text>Category picker</Text>;
    },
  };
});
jest.mock('@/components/bills/icon-picker', () => ({ IconPicker: () => null }));
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
jest.mock('@/components/ui/select-field', () => ({ SelectField: () => null }));
jest.mock('@/components/ui/date-picker', () => ({ DatePicker: () => null }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/components/ui/calculator-pad', () => ({ CalculatorPad: () => null }));
jest.mock('@/components/calculators/schedule-card', () => ({ ScheduleCard: () => null }));

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
jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    lastChargedOn: null,
    ready: true,
    saving: false,
    choose: async () => 'upcoming',
    apply: jest.fn(),
    retry: jest.fn(),
  }),
}));
jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => async () => {},
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00' }),
}));
jest.mock('@/api/brands', () => ({
  guessCategory: () => 'other',
  matchBrand: () => null,
  useBrandDirectory: () => ({ data: [] }),
  useSpendCategories: () => ({ data: [] }),
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mutation = () => ({ mutateAsync: mockCreate, isPending: false });
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => mutation(),
  useUpdateReceipt: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteReceipt: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateBill: () => mutation(),
  useUpdateBill: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteBill: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateSubscription: () => mutation(),
  useUpdateSubscription: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

let mockRow: unknown = null;
jest.mock('@/api/queries', () => {
  const read = () => ({ data: mockRow, isError: false, isFetched: true, refetch: jest.fn() });
  return {
    useReceipt: read,
    useBill: read,
    useSubscription: read,
    useLoanForBill: () => ({ data: null }),
    usePaymentSources: () => ({
      sources: [
        { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
        { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
      ],
    }),
  };
});

const XFINITY = {
  brandId: 'xfinity',
  name: 'Xfinity',
  domain: 'xfinity.com',
  categoryId: 'telecom',
};
const STARBUCKS = {
  brandId: 'starbucks',
  name: 'Starbucks',
  domain: 'starbucks.com',
  categoryId: 'dining',
};

const HEARD: VoiceDraft = {
  kind: 'receipt',
  kindSure: true,
  amount: null,
  amountChoices: [],
  merchant: null,
  merchantHeard: null,
  merchantSource: null,
  date: null,
  cycle: null,
  billCategoryId: null,
  multiple: false,
  score: 0,
  confidence: 'low',
  missing: [],
  transcript: 'what the person said',
};

/**
 * The review page's working copy, as "More options" would send it, with the
 * draft it came from still in the slot. Returns the draft's id.
 */
const handOff = (patch: Partial<VoiceEntry>) => {
  const id = putVoiceDraft(HEARD);
  const entry: VoiceEntry = { ...entryFromDraft(HEARD), ...patch };
  mockParams = entryToForm(entry).params;
  return id;
};

type Screen = Awaited<ReturnType<typeof render>>;
const press = (screen: Screen, label: string) => fireEvent.press(screen.getByText(label));
const set = (key: string, value: unknown) =>
  act(() => {
    const props = mockProps[key];
    (props.onChange ?? props.onChangeText ?? props.onSelect)(value);
  });

afterEach(() => clearVoiceDraft());

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockProps)) delete mockProps[key];
  mockParams = {};
  mockRow = null;
  mockCreate.mockResolvedValue({ id: 'new-1' });
  mockUpdate.mockResolvedValue(undefined);
});

describe('Add receipt from voice', () => {
  it('opens filled in, files it as voice with no scan report, and leaves for Home', async () => {
    handOff({
      kind: 'receipt',
      amount: 12.5,
      merchant: STARBUCKS,
      date: '2026-09-30',
      sourceId: 'card-1',
    });
    const screen = await render(<AddReceiptScreen />);

    expect(mockProps.amount.value).toBe('12.50');
    expect(screen.queryByText(/^Read the/)).toBeNull();
    expect(screen.queryByText(/below — it will save either way/)).toBeNull();

    await press(screen, 'Continue');
    expect(mockProps['brand:Store'].value).toEqual(STARBUCKS);
    expect(mockProps.sources.value).toBe('card-1');
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(router.back).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'starbucks',
      merchant: 'Starbucks',
      amount: 12.5,
      purchased_on: '2026-09-30',
      category_id: 'dining',
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      source: 'voice',
      image_path: null,
    });
  });

  it('stays a voice receipt when only a little was heard', async () => {
    handOff({ kind: 'receipt', date: '2026-09-29' });
    const screen = await render(<AddReceiptScreen />);

    expect(mockProps.amount.value).toBe('');
    await set('amount', '4.75');
    await press(screen, 'Continue');
    await set('brand:Store', STARBUCKS);
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      amount: 4.75,
      purchased_on: '2026-09-29',
      source: 'voice',
    });
  });

  it('opens a link with a bad amount, date or source blank rather than wrong', async () => {
    mockParams = {
      from: 'voice',
      scannedVia: 'voice',
      scannedStore: 'Starbucks',
      scannedAmount: '12.345',
      scannedDate: '2026-02-30',
      scannedSource: '../card',
    };
    const screen = await render(<AddReceiptScreen />);

    expect(mockProps.amount.value).toBe('');
    await press(screen, 'Continue');
    expect(mockProps.sources.value).toBe('');
    await press(screen, 'Continue');
    expect(toIsoDate(mockProps.calendar.value)).toBe(toIsoDate(new Date()));
  });

  it('gives a scan with a day that is not on the calendar today, not an invalid date', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedAmount: '9.50', scannedDate: '2026-13-01' };
    await render(<AddReceiptScreen />);

    // A scan with a store and an amount opens on the last step.
    expect(toIsoDate(mockProps.calendar.value)).toBe(toIsoDate(new Date()));
  });

  it('goes back as before when the form was not opened from voice', async () => {
    mockParams = { from: 'elsewhere' };
    const screen = await render(<AddReceiptScreen />);

    await set('amount', '4.75');
    await press(screen, 'Continue');
    await set('brand:Store', STARBUCKS);
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(mockCreate.mock.calls[0][0].source).toBe('manual');
  });

  it('ignores from=voice on an edit', async () => {
    mockParams = { id: 'receipt-1', from: 'voice' };
    mockRow = {
      id: 'receipt-1',
      brand_id: null,
      merchant: 'Deli',
      amount: 9.5,
      purchased_on: '2026-09-02',
      category_id: 'dining',
      card_id: null,
      bank_account_id: null,
      note: null,
      source: 'manual',
      image_path: null,
      brands: null,
    };
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});

describe('Add bill from voice', () => {
  it('skips the category chooser when the category is known, and saves what was heard', async () => {
    handOff({
      kind: 'bill',
      amount: 1030.5,
      merchant: XFINITY,
      billCategoryId: 'internet',
      date: '2026-10-15',
      cycle: 'yearly',
      sourceId: 'acct-1',
    });
    const screen = await render(<AddBillScreen />);

    expect(screen.queryByText('Category picker')).toBeNull();
    expect(screen.getByText('How much is the bill?')).toBeTruthy();
    expect(mockProps.amount.value).toBe('1030.50');

    await press(screen, 'Continue');
    expect(mockProps['field:Name'].value).toBe('Xfinity');
    expect(mockProps['brand:Company'].value).toEqual({ ...XFINITY, categoryId: 'internet' });
    await press(screen, 'Continue');
    expect(toIsoDate(mockProps.calendar.value)).toBe('2026-10-15');
    await press(screen, 'Save bill');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(router.back).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Xfinity',
      amount: 1030.5,
      brand_id: 'xfinity',
      category_id: 'internet',
      icon_id: null,
      recurrence: 'yearly',
      next_due_on: '2026-10-15',
      starts_on: '2026-10-15',
      ends_on: null,
      card_id: null,
      bank_account_id: 'acct-1',
      note: null,
    });
  });

  it('keeps a name typed on the review page', async () => {
    handOff({ kind: 'bill', billCategoryId: 'housing', billName: 'Flat rent', amount: 1100 });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    expect(mockProps['field:Name'].value).toBe('Flat rent');
  });

  it('names a bill with no company after its category', async () => {
    handOff({ kind: 'bill', billCategoryId: 'housing', amount: 1100 });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    expect(mockProps['field:Name'].value).toBe('Housing');
  });

  it('asks for the category when none was heard, and keeps the company as the name', async () => {
    handOff({ kind: 'bill', merchant: XFINITY, amount: 80 });
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Category picker')).toBeTruthy();
    await set('category', { id: 'internet', label: 'Internet' });
    expect(mockProps.amount.value).toBe('80.00');
    await press(screen, 'Continue');
    expect(mockProps['field:Name'].value).toBe('Xfinity');
  });
});

describe('Add subscription from voice', () => {
  it('opens filled in and saves what was heard, then leaves for Home', async () => {
    handOff({
      kind: 'subscription',
      amount: 15.99,
      merchant: {
        brandId: 'netflix',
        name: 'Netflix',
        domain: 'netflix.com',
        categoryId: 'entertainment',
      },
      date: '2026-10-12',
      cycle: 'yearly',
      sourceId: 'card-1',
    });
    const screen = await render(<AddSubscriptionScreen />);

    expect(mockProps.amount.value).toBe('15.99');
    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(router.back).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'netflix',
      name: 'Netflix',
      amount: 15.99,
      cycle: 'yearly',
      next_renewal_on: '2026-10-12',
      started_on: '2026-10-12',
      category_id: 'entertainment',
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      active: true,
    });
  });

  it('opens blank and monthly for prefill it cannot trust', async () => {
    mockParams = {
      from: 'voice',
      prefillAmount: '1e3',
      prefillCycle: 'daily',
      prefillDate: '1/10/2026',
    };
    const screen = await render(<AddSubscriptionScreen />);

    expect(mockProps.amount.value).toBe('');
    await press(screen, 'Continue');
    expect(mockProps['brand:Service'].value).toBeNull();
    await press(screen, 'Continue');
    expect(mockProps.calendar.value).toBeNull();
    expect(screen.getByLabelText('Monthly').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
});

describe('After a voice hand-off', () => {
  it('forgets what was heard once a receipt is saved', async () => {
    const id = handOff({ kind: 'receipt', amount: 4.75, merchant: STARBUCKS });
    const screen = await render(<AddReceiptScreen />);
    expect(readVoiceDraft(id)).not.toBeNull();

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(readVoiceDraft(id)).toBeNull();
  });

  it('forgets what was heard once a bill is saved', async () => {
    const id = handOff({
      kind: 'bill',
      amount: 80,
      merchant: XFINITY,
      billCategoryId: 'internet',
      date: '2026-10-15',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save bill');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(readVoiceDraft(id)).toBeNull();
  });

  it('forgets what was heard once a subscription is saved', async () => {
    const id = handOff({
      kind: 'subscription',
      amount: 15.99,
      merchant: { brandId: 'netflix', name: 'Netflix', domain: 'netflix.com', categoryId: 'x' },
    });
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(readVoiceDraft(id)).toBeNull();
  });

  it('keeps a voice draft when a form not opened from voice saves', async () => {
    const id = putVoiceDraft(HEARD);
    mockParams = {};
    const screen = await render(<AddReceiptScreen />);

    await set('amount', '4.75');
    await press(screen, 'Continue');
    await set('brand:Store', STARBUCKS);
    await press(screen, 'Continue');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(readVoiceDraft(id)).not.toBeNull();
  });

  it('goes back to the review page from a bill whose category was already known', async () => {
    handOff({ kind: 'bill', amount: 80, billCategoryId: 'internet' });
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('How much is the bill?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Back'));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Category picker')).toBeNull();
  });

  it('still steps back to the chooser when the same prefill did not come from voice', async () => {
    handOff({ kind: 'bill', amount: 80, billCategoryId: 'internet' });
    delete mockParams.from;
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('How much is the bill?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Back'));

    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByText('Category picker')).toBeTruthy();
  });

  it('steps back to the chooser from a voice bill once the chooser was used', async () => {
    handOff({ kind: 'bill', amount: 80, merchant: XFINITY });
    const screen = await render(<AddBillScreen />);

    await set('category', { id: 'internet', label: 'Internet' });
    await fireEvent.press(screen.getByLabelText('Back'));

    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByText('Category picker')).toBeTruthy();
  });
});
