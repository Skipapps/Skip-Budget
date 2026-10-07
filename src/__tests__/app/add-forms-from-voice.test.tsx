import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddBillScreen from '@/app/add-bill';
import AddReceiptScreen from '@/app/add-receipt';
import AddSubscriptionScreen from '@/app/add-subscription';
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
 * page's edited copy as route params (`entryToForm`), and it lands on the form's own final page:
 * nothing walks through the steps again. The store, service or company sits on that page in its
 * own search box, already chosen. A receipt is filed as a voice capture with no scan report, a
 * logo chosen on the review page is drawn and saved, and so is a typed note. Saving goes back to
 * Home with `dismissTo`, so nothing can land on the review page again and file the same thing
 * twice; a form opened any other way still goes back.
 *
 * Real pages throughout; only the network, the native scanner and the logo images are replaced.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/components/ui/calculator-pad', () => ({ CalculatorPad: () => null }));
jest.mock('@/components/calculators/schedule-card', () => ({ ScheduleCard: () => null }));
jest.mock('@/lib/haptics', () => ({
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
  toggle: jest.fn(),
  tap: jest.fn(),
}));

// The logo a mark drew, readable as text: "Rainbow Shops|rainbowshops.com", or "Rainbow Shops|"
// for letters.
jest.mock('@/components/brands/brand-logo', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    BrandLogo: ({ name, domain }: { name: string; domain?: string | null }) => (
      <Text>{`${name}|${domain ?? ''}`}</Text>
    ),
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
    body: '#222222',
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
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => async () => true,
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
  useFocusEffect: () => {},
  Stack: {
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions(options);
      return null;
    },
  },
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
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => async () => {},
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00' }),
}));

const BRANDS = [
  { id: 'starbucks', name: 'Starbucks', domain: 'starbucks.com', category_id: 'dining' },
  { id: 'xfinity', name: 'Xfinity', domain: 'xfinity.com', category_id: 'telecom' },
];
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
    // This month's receipts, which the free scan and upload allowances count.
    useReceipts: () => ({ data: [], isFetched: true, isError: false }),
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
const NETFLIX = {
  brandId: 'netflix',
  name: 'Netflix',
  domain: 'netflix.com',
  categoryId: 'entertainment',
};

/** A store the catalogue does not know. */
const RAINBOW = { brandId: null, name: 'Rainbow Shops', domain: null, categoryId: 'shopping' };

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

const press = (screen: Screen, label: string) =>
  act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });

/** The amount is a button on the page and a figure inside it, both worded alike: by role, the button. */
const pressButton = (screen: Screen, name: string) =>
  act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });

const onFinalPage = (screen: Screen) => {
  expect(screen.getByText('You can edit this later.')).toBeTruthy();
  // No step of the form is showing: no keypad question, no Continue.
  expect(screen.queryByLabelText('Continue')).toBeNull();
};

const isLit = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.selected);

/** Searches the store field on the final page and taps the catalogue result of that name. */
async function chooseStore(screen: Screen, name: string) {
  // On the final page the box is not focused until it is tapped, and only then does it search.
  const input = screen.getByPlaceholderText('Search for a store');
  await act(async () => {
    fireEvent(input, 'focus');
    fireEvent.changeText(input, name);
  });
  const result = await screen.findByLabelText(name);
  await act(async () => {
    fireEvent.press(result);
  });
}

/** One keypad key at a time, the way it is typed. */
async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
}

afterEach(() => clearVoiceDraft());

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockRow = null;
  mockCreate.mockResolvedValue({ id: 'new-1' });
  mockUpdate.mockResolvedValue(undefined);
});

describe('Add receipt from voice', () => {
  it('opens on its final page filled in, files it as voice with no scan report, and leaves for Home', async () => {
    handOff({
      kind: 'receipt',
      amount: 12.5,
      merchant: STARBUCKS,
      date: '2026-09-30',
      sourceId: 'card-1',
    });
    const screen = await render(<AddReceiptScreen />);

    onFinalPage(screen);
    expect(screen.queryByText('How much did you spend?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Amount, $12.50' })).toBeTruthy();
    // The store arrives already chosen in its box, logo and all.
    expect(screen.getByLabelText('Change store, currently Starbucks')).toBeTruthy();
    expect(screen.getByText('Starbucks|starbucks.com')).toBeTruthy();
    expect(screen.getByText(/^Filed under /)).toBeTruthy();
    expect(screen.queryByPlaceholderText('Search for a store')).toBeNull();
    expect(screen.getByLabelText('Date, Wed Sep 30')).toBeTruthy();
    expect(screen.getByLabelText('Paid with, VISA ••4421')).toBeTruthy();
    expect(screen.queryByText(/^Read the/)).toBeNull();
    expect(screen.queryByText(/below — it will save either way/)).toBeNull();

    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(router.back).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(1);
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

  it('arrives with the note typed on the review page, and saves it', async () => {
    handOff({ kind: 'receipt', amount: 12.5, merchant: STARBUCKS, note: 'Team lunch' });
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Note, Team lunch')).toBeTruthy();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ note: 'Team lunch' }));
  });

  it('arrives with the logo chosen on the review page, and saves it', async () => {
    const chosen = { ...RAINBOW, logoDomain: 'rainbowshops.com', logoHidden: false };
    handOff({ kind: 'receipt', amount: 12.5, merchant: chosen, date: '2026-09-30' });
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Change store, currently Rainbow Shops')).toBeTruthy();
    expect(screen.getByText('Rainbow Shops|rainbowshops.com')).toBeTruthy();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        brand_id: null,
        merchant: 'Rainbow Shops',
        logo_domain: 'rainbowshops.com',
        logo_hidden: false,
      }),
    );
  });

  it('saves letters for a store whose logo was declined on the review page', async () => {
    const letters = { ...RAINBOW, logoDomain: null, logoHidden: true };
    handOff({ kind: 'receipt', amount: 12.5, merchant: letters, date: '2026-09-30' });
    const screen = await render(<AddReceiptScreen />);

    expect(screen.getByLabelText('Change store, currently Rainbow Shops')).toBeTruthy();
    expect(screen.getByText('Rainbow Shops|')).toBeTruthy();
    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ logo_domain: null, logo_hidden: true }),
    );
  });

  it('saves no logo columns for a store nobody answered about', async () => {
    handOff({ kind: 'receipt', amount: 12.5, merchant: RAINBOW, date: '2026-09-30' });
    const screen = await render(<AddReceiptScreen />);

    await press(screen, 'Save receipt');

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_hidden');
  });

  it('stays a voice receipt when only a little was heard, filled in from the final page', async () => {
    handOff({ kind: 'receipt', date: '2026-09-29' });
    const screen = await render(<AddReceiptScreen />);

    onFinalPage(screen);
    expect(screen.getByLabelText('Date, Tue Sep 29')).toBeTruthy();

    // The amount's gap opens its own page and comes back here.
    await pressButton(screen, 'Amount, needed');
    await typeAmount(screen, '4.75');
    await press(screen, 'Done');
    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $4.75' })).toBeTruthy();

    // The store is searched for right here: no page opens.
    await chooseStore(screen, 'Starbucks');
    onFinalPage(screen);
    expect(screen.getByLabelText('Change store, currently Starbucks')).toBeTruthy();

    await press(screen, 'Save receipt');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      merchant: 'Starbucks',
      amount: 4.75,
      purchased_on: '2026-09-29',
      source: 'voice',
    });
  });

  it('opens a link with a bad amount, date, source or note blank rather than wrong', async () => {
    mockParams = {
      from: 'voice',
      scannedVia: 'voice',
      scannedStore: 'Starbucks',
      scannedAmount: '12.345',
      scannedDate: '2026-02-30',
      scannedSource: '../card',
      scannedNote: 'x'.repeat(201),
    };
    const screen = await render(<AddReceiptScreen />);

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, needed' })).toBeTruthy();
    expect(screen.getByLabelText('Date, Today, Wed Oct 7')).toBeTruthy();
    expect(screen.getByLabelText('Paid with, not set, optional')).toBeTruthy();
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
  });

  it('gives a scan with a day that is not on the calendar today, not an invalid date', async () => {
    mockParams = { scannedStore: 'Corner Deli', scannedAmount: '9.50', scannedDate: '2026-13-01' };
    const screen = await render(<AddReceiptScreen />);

    // A scan with a store and an amount opens on the final page.
    onFinalPage(screen);
    expect(screen.getByLabelText('Date, Today, Wed Oct 7')).toBeTruthy();
  });

  it('goes back as before when the form was not opened from voice', async () => {
    mockParams = { from: 'elsewhere' };
    const screen = await render(<AddReceiptScreen />);

    // A blank receipt starts at the amount.
    expect(screen.getByText('How much did you spend?')).toBeTruthy();
    await typeAmount(screen, '4.75');
    await press(screen, 'Continue');
    await chooseStore(screen, 'Starbucks');
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

    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('Add bill from voice', () => {
  it('opens on the final page when the category is known, and saves what was heard', async () => {
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

    onFinalPage(screen);
    expect(screen.queryByText('What is this bill for?')).toBeNull();
    expect(screen.queryByText('How much is the bill?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Amount, $1,030.50' })).toBeTruthy();
    // The company in its own box, and its logo on the name's mark too.
    expect(screen.getByText('Company · Optional')).toBeTruthy();
    expect(screen.getByLabelText('Change company, currently Xfinity')).toBeTruthy();
    expect(screen.getByLabelText('Name, Xfinity')).toBeTruthy();
    expect(screen.getAllByText('Xfinity|xfinity.com')).toHaveLength(2);
    expect(screen.getByLabelText('Category, Internet')).toBeTruthy();
    expect(screen.getByLabelText('Due on, Thu Oct 15')).toBeTruthy();
    expect(isLit(screen, 'Yearly')).toBe(true);
    expect(screen.getByLabelText('Paid with, Checking ••0099')).toBeTruthy();

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

  it('arrives with the company logo chosen on the review page, and saves it', async () => {
    const chosen = {
      brandId: null,
      name: 'Local Power',
      domain: null,
      categoryId: 'utilities',
      logoDomain: 'localpower.com',
      logoHidden: false,
    };
    handOff({
      kind: 'bill',
      amount: 90,
      merchant: chosen,
      billCategoryId: 'housing',
      date: '2026-10-15',
      cycle: 'monthly',
    });
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Change company, currently Local Power')).toBeTruthy();
    expect(screen.getByLabelText('Name, Local Power')).toBeTruthy();
    expect(screen.getAllByText('Local Power|localpower.com')).toHaveLength(2);
    await press(screen, 'Save bill');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Local Power',
        brand_id: null,
        logo_domain: 'localpower.com',
        logo_hidden: false,
      }),
    );
  });

  it('arrives with the note typed on the review page, and saves it', async () => {
    handOff({
      kind: 'bill',
      amount: 1100,
      billCategoryId: 'housing',
      date: '2026-11-01',
      note: 'Shared with Sam',
    });
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Note, Shared with Sam')).toBeTruthy();
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ note: 'Shared with Sam' }));
  });

  it('keeps a name typed on the review page', async () => {
    handOff({ kind: 'bill', billCategoryId: 'housing', billName: 'Flat rent', amount: 1100 });
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Name, Flat rent')).toBeTruthy();
  });

  it('names a bill with no company after its category', async () => {
    handOff({ kind: 'bill', billCategoryId: 'housing', amount: 1100 });
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Name, Housing')).toBeTruthy();
    // No company was heard: its box is empty, ready to search.
    expect(screen.queryByLabelText(/^Change company, currently/)).toBeNull();
    // No day was heard: a gap to fill, not a guess.
    expect(screen.getByLabelText('Due on, needed')).toBeTruthy();
  });

  it('asks for the category on its own page when none was heard, and keeps the company as the name', async () => {
    handOff({ kind: 'bill', merchant: XFINITY, amount: 80 });
    const screen = await render(<AddBillScreen />);

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $80.00' })).toBeTruthy();
    expect(screen.getByLabelText('Name, Xfinity')).toBeTruthy();

    await press(screen, 'Category, needed');
    await press(screen, 'Internet. Home broadband and Wi-Fi');

    onFinalPage(screen);
    expect(screen.getByLabelText('Category, Internet')).toBeTruthy();
    expect(screen.getByLabelText('Name, Xfinity')).toBeTruthy();
  });
});

describe('Add subscription from voice', () => {
  it('opens on its final page and saves what was heard, then leaves for Home', async () => {
    handOff({
      kind: 'subscription',
      amount: 15.99,
      merchant: NETFLIX,
      date: '2026-10-12',
      cycle: 'yearly',
      sourceId: 'card-1',
    });
    const screen = await render(<AddSubscriptionScreen />);

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $15.99' })).toBeTruthy();
    expect(screen.getByLabelText('Change service, currently Netflix')).toBeTruthy();
    expect(screen.getByText('Netflix|netflix.com')).toBeTruthy();
    expect(screen.getByText(/^Filed under /)).toBeTruthy();
    expect(screen.getByLabelText('Next renewal, Mon Oct 12')).toBeTruthy();
    expect(isLit(screen, 'Yearly')).toBe(true);
    expect(screen.getByLabelText('Charged to, VISA ••4421')).toBeTruthy();

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

  it('arrives with the logo chosen on the review page, and saves it', async () => {
    const chosen = {
      brandId: null,
      name: 'Local Gym',
      domain: null,
      categoryId: 'fitness',
      logoDomain: 'localgym.com',
      logoHidden: false,
    };
    handOff({ kind: 'subscription', amount: 30, merchant: chosen, date: '2026-10-12' });
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText('Change service, currently Local Gym')).toBeTruthy();
    expect(screen.getByText('Local Gym|localgym.com')).toBeTruthy();
    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        brand_id: null,
        name: 'Local Gym',
        logo_domain: 'localgym.com',
        logo_hidden: false,
      }),
    );
  });

  it('arrives with the note typed on the review page, and saves it', async () => {
    handOff({ kind: 'subscription', amount: 15.99, merchant: NETFLIX, note: 'Family plan' });
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText('Note, Family plan')).toBeTruthy();
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ note: 'Family plan' }));
  });

  it('opens blank and monthly for prefill it cannot trust', async () => {
    mockParams = {
      from: 'voice',
      prefillAmount: '1e3',
      prefillCycle: 'daily',
      prefillDate: '1/10/2026',
    };
    const screen = await render(<AddSubscriptionScreen />);

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, needed' })).toBeTruthy();
    // No service came through: its box is empty, ready to search.
    expect(screen.getByPlaceholderText('Search for a service').props.value).toBe('');
    expect(screen.queryByLabelText(/^Change service, currently/)).toBeNull();
    expect(screen.getByLabelText('Next renewal, not set, optional')).toBeTruthy();
    expect(isLit(screen, 'Monthly')).toBe(true);
  });
});

describe('After a voice hand-off', () => {
  it('forgets what was heard once a receipt is saved', async () => {
    const id = handOff({ kind: 'receipt', amount: 4.75, merchant: STARBUCKS });
    const screen = await render(<AddReceiptScreen />);
    expect(readVoiceDraft(id)).not.toBeNull();

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

    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(readVoiceDraft(id)).toBeNull();
  });

  it('keeps a voice draft when a form not opened from voice saves', async () => {
    const id = putVoiceDraft(HEARD);
    mockParams = {};
    const screen = await render(<AddReceiptScreen />);

    await typeAmount(screen, '4.75');
    await press(screen, 'Continue');
    await chooseStore(screen, 'Starbucks');
    await press(screen, 'Save receipt');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(readVoiceDraft(id)).not.toBeNull();
  });

  it.each([
    ['receipt', AddReceiptScreen, { kind: 'receipt', amount: 4.75, merchant: STARBUCKS }],
    ['bill', AddBillScreen, { kind: 'bill', amount: 80, billCategoryId: 'internet' }],
    ['subscription', AddSubscriptionScreen, { kind: 'subscription', amount: 9.99 }],
  ] as const)(
    'goes straight back to the review page from a %s’s final page, walking through no steps',
    async (_kind, Form, patch) => {
      handOff(patch);
      const screen = await render(<Form />);

      onFinalPage(screen);
      // The page it opened on: the edge swipe goes back too.
      expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
      await press(screen, 'Back');

      expect(router.back).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('What is this bill for?')).toBeNull();
      expect(screen.queryByLabelText('Continue')).toBeNull();
    },
  );

  it('opens on the final page for the same prefill when it did not come from voice', async () => {
    handOff({ kind: 'bill', amount: 80, billCategoryId: 'internet' });
    delete mockParams.from;
    const screen = await render(<AddBillScreen />);

    onFinalPage(screen);
    await press(screen, 'Back');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('comes back to the final page from a page it opened, and only then leaves', async () => {
    handOff({ kind: 'bill', amount: 80, merchant: XFINITY });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Category, needed');
    expect(screen.getByText('What is this bill for?')).toBeTruthy();
    await press(screen, 'Back');

    expect(router.back).not.toHaveBeenCalled();
    onFinalPage(screen);
    expect(screen.getByLabelText('Category, needed')).toBeTruthy();

    await press(screen, 'Back');
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
