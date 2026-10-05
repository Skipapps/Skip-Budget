import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import VoiceReviewScreen from '@/app/voice-review';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';
import type { VoiceDraft, VoiceMerchant } from '@/lib/voice';
import {
  clearVoiceDraft,
  entryToForm,
  putVoiceDraft,
  readVoiceDraft,
  readVoiceEntry,
  updateVoiceEntry,
} from '@/lib/voice-draft';

/**
 * The review page: nothing saves without a tap, one tap makes one row, and
 * what it writes is exactly what the add form would have written.
 *
 * The draft goes through the real store and the real builders; only the
 * network is replaced. Amounts are asserted as numbers, to the cent.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockParams: { draft?: string } = {};
const mockScreenOptions = jest.fn();
const mockRedirect = jest.fn();
/** The page's focus effects, so a test can play coming back to it. */
const mockFocusEffects = new Set<() => unknown>();
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => unknown) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      mockFocusEffects.add(effect);
      effect();
      return () => {
        mockFocusEffects.delete(effect);
      };
    }, [effect]);
  },
  Stack: {
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions(options);
      return null;
    },
  },
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    onControl: '#FFFFFF',
    accentInk: '#5B3A6B',
  }),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async () => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  warn: jest.fn(),
  success: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-01', todayDate: new Date('2026-10-01T00:00:00') }),
}));

jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

jest.mock('@/api/brands', () => ({ useBrandDirectory: () => ({ data: [] }) }));

const mockSources = [
  { id: 'card-1', label: 'VISA ••4821', color: '#123456', kind: 'card' as const },
  { id: 'acct-1', label: 'Checking', color: '#654321', kind: 'account' as const },
];
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: mockSources }) }));

const mockCreateReceipt = jest.fn();
const mockCreateBill = jest.fn();
const mockCreateSubscription = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateReceipt: () => ({ mutateAsync: mockCreateReceipt }),
  useCreateBill: () => ({ mutateAsync: mockCreateBill }),
  useCreateSubscription: () => ({ mutateAsync: mockCreateSubscription }),
}));

const mockLearn = jest.fn(async () => {});
jest.mock('@/api/voice-aliases', () => ({
  useVoiceAliases: () => ({ aliases: {}, ready: true }),
  useLearnVoiceAlias: () => mockLearn,
}));

const STARBUCKS = {
  brandId: 'b-sbux',
  name: 'Starbucks',
  domain: 'starbucks.com',
  categoryId: 'dining',
};

const RECEIPT: VoiceDraft = {
  kind: 'receipt',
  kindSure: true,
  amount: 12.5,
  amountChoices: [],
  merchant: STARBUCKS,
  merchantHeard: 'starbucks',
  merchantSource: 'catalog',
  multiple: false,
  date: '2026-10-01',
  cycle: null,
  billCategoryId: null,
  score: 9,
  confidence: 'high',
  missing: [],
  transcript: 'Spent $12.50 at Starbucks today',
};

/** Parks a draft the way /voice does and opens the page on it. */
function seed(patch: Partial<VoiceDraft> = {}): string {
  const draft = { ...RECEIPT, ...patch };
  const id = putVoiceDraft(draft, [draft.transcript]);
  mockParams = { draft: id };
  return id;
}

type Screen = Awaited<ReturnType<typeof render>>;

async function press(screen: Screen, label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

const isDisabled = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.disabled);

beforeEach(() => {
  jest.clearAllMocks();
  clearVoiceDraft();
  mockFocusEffects.clear();
  mockPro = { pro: true, ready: true };
  mockConfirm.mockImplementation(async () => true);
  mockCreateReceipt.mockResolvedValue({ id: 'r1' });
  mockCreateBill.mockResolvedValue({ id: 'b1' });
  mockCreateSubscription.mockResolvedValue({ id: 's1' });
});

describe('/voice-review — saving', () => {
  it('saves a receipt once, as the form would, then goes home', async () => {
    const id = seed();
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Is this right?')).toBeTruthy();
    expect(screen.getByLabelText('You said: Spent $12.50 at Starbucks today')).toBeTruthy();
    // The figure inside carries the same words; on iOS the button around it is
    // the one element VoiceOver reads.
    expect(screen.getByRole('button', { name: 'Amount, $12.50' })).toBeTruthy();
    expect(screen.getByLabelText('Store, Starbucks')).toBeTruthy();
    expect(screen.getByLabelText('Bought on, Today')).toBeTruthy();

    await press(screen, 'Save receipt');

    expect(mockCreateReceipt).toHaveBeenCalledTimes(1);
    expect(mockCreateReceipt).toHaveBeenCalledWith({
      brand_id: 'b-sbux',
      merchant: 'Starbucks',
      amount: 12.5,
      purchased_on: '2026-10-01',
      category_id: 'dining',
      card_id: null,
      bank_account_id: null,
      note: null,
      source: 'voice',
      image_path: null,
    });
    expect(success).toHaveBeenCalledTimes(1);
    expect(readVoiceDraft(id)).toBeNull();
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
    // Nothing was corrected, so nothing is learned.
    expect(mockLearn).not.toHaveBeenCalled();
  });

  it('files a receipt against the card picked, to the cent', async () => {
    seed({ amount: 1030.5 });
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'VISA ••4821');
    await press(screen, 'Save receipt');

    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1030.5, card_id: 'card-1', bank_account_id: null }),
    );
  });

  it('saves a bill named after its category, due on the day heard', async () => {
    seed({
      kind: 'bill',
      amount: 1800,
      merchant: null,
      merchantHeard: null,
      date: '2026-11-01',
      cycle: 'monthly',
      billCategoryId: 'housing',
      transcript: 'Rent is $1,800, due on the 1st',
    });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Add a bill')).toBeTruthy();
    expect(screen.getByLabelText('Name, Housing')).toBeTruthy();
    expect(screen.getByLabelText('Category, Housing')).toBeTruthy();
    expect(screen.getByLabelText('Due on, 1 Nov 2026')).toBeTruthy();

    await press(screen, 'Save bill');

    expect(mockCreateBill).toHaveBeenCalledTimes(1);
    expect(mockCreateBill).toHaveBeenCalledWith({
      name: 'Housing',
      amount: 1800,
      brand_id: null,
      category_id: 'housing',
      icon_id: null,
      recurrence: 'monthly',
      next_due_on: '2026-11-01',
      starts_on: '2026-11-01',
      ends_on: null,
      card_id: null,
      bank_account_id: null,
      note: null,
    });
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
  });

  it('saves a subscription with no renewal date, as the form allows', async () => {
    seed({
      kind: 'subscription',
      amount: 15.99,
      merchant: {
        brandId: 'b-nflx',
        name: 'Netflix',
        domain: 'netflix.com',
        categoryId: 'streaming',
      },
      merchantHeard: 'netflix',
      date: null,
      cycle: 'monthly',
      transcript: 'Netflix $15.99 every month',
    });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByLabelText('Renews on, not set, optional')).toBeTruthy();
    await press(screen, 'Save subscription');

    expect(mockCreateSubscription).toHaveBeenCalledWith({
      brand_id: 'b-nflx',
      name: 'Netflix',
      amount: 15.99,
      cycle: 'monthly',
      next_renewal_on: null,
      started_on: null,
      category_id: 'streaming',
      card_id: null,
      bank_account_id: null,
      note: null,
      active: true,
    });
  });

  it('makes one row from two quick taps', async () => {
    seed();
    let finish: (value: { id: string }) => void = () => {};
    mockCreateReceipt.mockImplementation(
      () => new Promise((resolve) => (finish = resolve as typeof finish)),
    );
    const screen = await render(<VoiceReviewScreen />);

    const save = screen.getByLabelText('Save receipt');
    await act(async () => {
      fireEvent.press(save);
      fireEvent.press(save);
    });
    expect(screen.getByLabelText('Saving…')).toBeTruthy();

    await act(async () => finish({ id: 'r1' }));
    expect(mockCreateReceipt).toHaveBeenCalledTimes(1);
  });

  it('stays put with the one failure line when the save fails', async () => {
    const id = seed();
    mockCreateReceipt.mockRejectedValueOnce(new Error('offline'));
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Save receipt');

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(readVoiceDraft(id)).not.toBeNull();

    // The button is the retry.
    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).toHaveBeenCalledTimes(2);
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
  });
});

describe('/voice-review — what a saved correction teaches', () => {
  const TARGET = { brandId: 'b-tgt', name: 'Target', domain: 'target.com', categoryId: 'shopping' };
  const WALMART = {
    brandId: 'b-wmt',
    name: 'Walmart',
    domain: 'walmart.com',
    categoryId: 'shopping',
  };

  /** Seeds, applies what /voice-edit's Done would write, saves. */
  async function saveAfter(patch: Partial<VoiceDraft>, merchant: VoiceMerchant | null) {
    const id = seed(patch);
    if (merchant) updateVoiceEntry(id, { merchant });
    const screen = await render(<VoiceReviewScreen />);
    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).toHaveBeenCalledTimes(1);
  }

  it('never learns from an exact catalogue match the person changed', async () => {
    // "Target" was Target. Changing it is a change of mind, not a mishearing.
    await saveAfter(
      { merchant: TARGET, merchantHeard: 'target', merchantSource: 'catalog' },
      WALMART,
    );
    expect(mockLearn).not.toHaveBeenCalled();
  });

  it('learns a corrected fuzzy match', async () => {
    await saveAfter(
      { merchant: STARBUCKS, merchantHeard: 'star bux', merchantSource: 'fuzzy' },
      { brandId: null, name: 'Star Bakery', domain: null, categoryId: 'groceries' },
    );
    expect(mockLearn).toHaveBeenCalledWith('star bux', 'Star Bakery');
  });

  it('learns a corrected store that was used as heard', async () => {
    await saveAfter(
      {
        merchant: { brandId: null, name: 'Star Bucks', domain: null, categoryId: 'other' },
        merchantHeard: 'star bucks',
        merchantSource: 'heard',
      },
      STARBUCKS,
    );
    expect(mockLearn).toHaveBeenCalledWith('star bucks', 'Starbucks');
  });

  it('teaches a learned name changed back, which is what removes the pair', async () => {
    // A past lesson read "target" as Walmart; the person puts Target back.
    await saveAfter(
      { merchant: WALMART, merchantHeard: 'target', merchantSource: 'learned' },
      TARGET,
    );
    expect(mockLearn).toHaveBeenCalledWith('target', 'Target');
  });

  it('teaches nothing when the name was not really changed', async () => {
    await saveAfter(
      { merchant: STARBUCKS, merchantHeard: 'star bux', merchantSource: 'fuzzy' },
      { ...STARBUCKS },
    );
    expect(mockLearn).not.toHaveBeenCalled();
  });

  it('teaches nothing when the merchant was never touched', async () => {
    await saveAfter(
      { merchant: STARBUCKS, merchantHeard: 'star bux', merchantSource: 'fuzzy' },
      null,
    );
    expect(mockLearn).not.toHaveBeenCalled();
  });
});

describe('/voice-review — what still blocks Save', () => {
  it('never shows $0 for an amount nobody said', async () => {
    seed({ amount: null });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    expect(screen.queryByText(/\$0/)).toBeNull();
    expect(screen.getByText('Enter how much you spent.')).toBeTruthy();
    expect(isDisabled(screen, 'Save receipt')).toBe(true);
  });

  it('asks for the store in the form’s own words', async () => {
    seed({ merchant: null, merchantHeard: null });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByLabelText('Store, not heard')).toBeTruthy();
    expect(screen.getByText('Pick a store first.')).toBeTruthy();
    expect(isDisabled(screen, 'Save receipt')).toBe(true);
    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).not.toHaveBeenCalled();
  });

  it('makes the person pick an ambiguous amount, guessing nothing', async () => {
    seed({ amount: 12.5, amountChoices: [12.5, 1250] });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Which amount did you mean?')).toBeTruthy();
    expect(screen.getByText('Pick the amount you meant.')).toBeTruthy();
    expect(isDisabled(screen, 'Save receipt')).toBe(true);
    expect(screen.getByLabelText('$12.50').props.accessibilityState.selected).toBe(false);
    expect(screen.getByLabelText('$1,250.00').props.accessibilityState.selected).toBe(false);

    await press(screen, '$1,250.00');
    expect(screen.getByRole('button', { name: 'Amount, $1,250.00' })).toBeTruthy();

    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).toHaveBeenCalledWith(expect.objectContaining({ amount: 1250 }));
  });

  it('asks what a bill is for before anything else', async () => {
    seed({
      kind: 'bill',
      merchant: null,
      merchantHeard: null,
      date: '2026-10-15',
      cycle: 'monthly',
      billCategoryId: null,
    });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Pick what the bill is for.')).toBeTruthy();
    expect(screen.getByLabelText('Category, not heard')).toBeTruthy();
    expect(isDisabled(screen, 'Save bill')).toBe(true);
  });
});

describe('/voice-review — around the page', () => {
  it('says so when there is nothing to check', async () => {
    mockParams = { draft: 'gone' };
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Nothing to check yet')).toBeTruthy();
    await press(screen, 'Start again');
    expect(router.dismissTo).toHaveBeenCalledWith('/voice');
  });

  it('sends a free account to the explainer', async () => {
    mockPro = { pro: false, ready: true };
    seed();
    await render(<VoiceReviewScreen />);
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'voice' },
    });
  });

  it('hands the edited entry to the full form, marked as from voice', async () => {
    const id = seed();
    updateVoiceEntry(id, { sourceId: 'acct-1' });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByLabelText('More options').props.accessibilityHint).toBe(
      'Opens the full form with what Skip heard filled in.',
    );
    await press(screen, 'More options');
    const entry = readVoiceEntry(id)!;
    expect(router.push).toHaveBeenCalledWith(entryToForm(entry));
    expect((router.push as jest.Mock).mock.calls[0][0]).toMatchObject({
      pathname: '/add-receipt',
      params: {
        from: 'voice',
        scannedVia: 'voice',
        scannedSource: 'acct-1',
        scannedAmount: '12.50',
      },
    });
  });

  it('asks the low-confidence question when Skip is unsure', async () => {
    seed({ confidence: 'low' });
    const screen = await render(<VoiceReviewScreen />);
    expect(screen.getByText('Did Skip hear you right?')).toBeTruthy();
  });

  it('re-reads the words for a new kind, and the page follows it', async () => {
    seed({ kindSure: false, transcript: 'Comcast $79.99 on the 20th', date: '2026-09-20' });
    const screen = await render(<VoiceReviewScreen />);
    expect(screen.getByText('Skip guessed this one. Pick another if it’s wrong.')).toBeTruthy();

    await press(screen, 'Bill');

    expect(screen.getByText('Add a bill')).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeTruthy();
    expect(screen.getByText('Recurring')).toBeTruthy();
    // A bill's "on the 20th" is the next 20th, not the last one.
    expect(screen.getByLabelText('Due on, 20 Oct 2026')).toBeTruthy();
    expect(screen.queryByText('Skip guessed this one. Pick another if it’s wrong.')).toBeNull();
  });

  it('lets an untouched page go back freely, and asks once it is edited', async () => {
    const id = seed();
    const screen = await render(<VoiceReviewScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

    await press(screen, 'Back');
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);

    await act(async () => {
      updateVoiceEntry(id, { sourceId: 'card-1' });
    });
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });

    mockConfirm.mockImplementationOnce(async () => false);
    await press(screen, 'Back');
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cancel adding this receipt?' }),
    );
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('opens one page for a double tap, and opens again after coming back', async () => {
    seed();
    const screen = await render(<VoiceReviewScreen />);

    const row = screen.getByLabelText('Store, Starbucks');
    await act(async () => {
      fireEvent.press(row);
      fireEvent.press(row);
    });
    const more = screen.getByLabelText('More options');
    await act(async () => {
      fireEvent.press(more);
    });
    expect(router.push).toHaveBeenCalledTimes(1);

    // Back from the edit page: the page is in focus again.
    await act(async () => {
      mockFocusEffects.forEach((effect) => effect());
    });
    await act(async () => {
      fireEvent.press(more);
      fireEvent.press(more);
    });
    expect(router.push).toHaveBeenCalledTimes(2);
    expect((router.push as jest.Mock).mock.calls[1][0].pathname).toBe('/add-receipt');
  });

  it('says it again by going back to the mic page, idle', async () => {
    const id = seed();
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Say it again');
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(router.dismissTo).toHaveBeenCalledWith('/voice');
    // Untouched, so nothing to throw away: the draft is simply left behind.
    expect(readVoiceDraft(id)).not.toBeNull();
  });

  it('asks before saying it again once something was changed', async () => {
    const id = seed();
    updateVoiceEntry(id, { sourceId: 'card-1' });
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Say it again');
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cancel adding this receipt?' }),
    );
    expect(router.dismissTo).toHaveBeenCalledWith('/voice');
    expect(readVoiceDraft(id)).toBeNull();
  });

  it('goes back once for a double tap on back', async () => {
    seed();
    const screen = await render(<VoiceReviewScreen />);

    const back = screen.getByLabelText('Back');
    await act(async () => {
      fireEvent.press(back);
      fireEvent.press(back);
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('closes to Home after asking, and forgets the draft', async () => {
    const id = seed();
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Close');
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cancel adding this receipt?',
        message: 'Nothing you have entered here will be saved.',
      }),
    );
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
    expect(readVoiceDraft(id)).toBeNull();
    // Still showing what it had while it slides away.
    expect(screen.queryByText('Nothing to check yet')).toBeNull();
  });
});
