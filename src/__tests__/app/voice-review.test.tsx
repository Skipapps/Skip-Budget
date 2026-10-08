import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import VoiceReviewScreen from '@/app/voice-review';
import { LOGO_COPY } from '@/components/brands/logo-choices';
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
 * The review page: the same final page the add forms end on, filled with what Skip heard. Nothing
 * saves without a tap, one tap makes one row, and what it writes is exactly what the add form would
 * have written. The draft goes through the real store and the real builders; only the network is
 * replaced. Amounts are asserted as numbers, to the cent.
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

jest.mock('@/api/brands', () => ({
  useBrandDirectory: () => ({ data: [] }),
  matchBrand: () => null,
}));

// The logo service's answer for a store the catalogue does not know, and what it was asked about.
// The default is an unsure lookup: no card, only the quiet way to add a website.
const NO_LOGO_ANSWER = { data: null, isLoading: false, isFetching: false };
let mockLogoLookup: { data: unknown; isLoading: boolean; isFetching: boolean } = NO_LOGO_ANSWER;
const mockLogoAsked: string[] = [];
jest.mock('@/api/logos', () => ({
  useLogoMatch: (name: string) => {
    mockLogoAsked.push(name);
    return mockLogoLookup;
  },
}));

const SOURCES = [
  { id: 'card-1', label: 'VISA ••4821', color: '#123456', kind: 'card' as const },
  { id: 'acct-1', label: 'Checking', color: '#654321', kind: 'account' as const },
];
let mockSources: typeof SOURCES = SOURCES;
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
// The stores this person added before: none here. The answers written down for next time are kept
// so a test can read them.
const mockRemember = jest.fn(async (_store: object) => {});
jest.mock('@/api/known-stores', () => ({
  matchKnownStores: () => [],
  storeKey: (name: string) => name.trim().toLowerCase(),
  useKnownStores: () => [],
  useRememberStore: () => mockRemember,
}));

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
const NETFLIX = {
  brandId: 'b-nflx',
  name: 'Netflix',
  domain: 'netflix.com',
  categoryId: 'streaming',
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

/** Rent, due on the 1st of next month. */
const RENT: Partial<VoiceDraft> = {
  kind: 'bill',
  amount: 1800,
  merchant: null,
  merchantHeard: null,
  merchantSource: null,
  date: '2026-11-01',
  cycle: 'monthly',
  billCategoryId: 'housing',
  transcript: 'Rent is $1,800, due on the 1st',
};

/** Netflix every month, no renewal day heard. */
const STREAMING: Partial<VoiceDraft> = {
  kind: 'subscription',
  amount: 15.99,
  merchant: NETFLIX,
  merchantHeard: 'netflix',
  date: null,
  cycle: 'monthly',
  transcript: 'Netflix $15.99 every month',
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

const isLit = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.selected);

/** Every line of text on the page, top to bottom. */
function lines(screen: Screen): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (node == null) return;
    if (typeof node === 'string') {
      found.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    ((node as { children?: unknown[] }).children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

/** The card's line names, in order, as the page draws them. */
function expectRowsInOrder(screen: Screen, labels: string[]) {
  const all = lines(screen);
  let from = 0;
  for (const label of labels) {
    const at = all.indexOf(label, from);
    expect([label, at >= 0]).toEqual([label, true]);
    from = at + 1;
  }
}

/** What the edit page was opened for. */
const openedField = () =>
  ((router.push as jest.Mock).mock.calls.at(-1)?.[0] as { params?: { field?: string } })?.params
    ?.field;

/** Back from an edit page: this page is in focus again. */
async function refocus() {
  await act(async () => {
    mockFocusEffects.forEach((effect) => effect());
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  clearVoiceDraft();
  mockFocusEffects.clear();
  mockLogoLookup = NO_LOGO_ANSWER;
  mockLogoAsked.length = 0;
  mockSources = SOURCES;
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
    expect(screen.getByLabelText('Date, Today, Thu Oct 1')).toBeTruthy();

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
    expect(mockLearn).not.toHaveBeenCalled();
  });

  it('files a receipt against the card picked on its page, to the cent', async () => {
    const id = seed({ amount: 1030.5 });
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Paid with, not set, optional');
    expect(openedField()).toBe('source');

    // What the card page's Done writes.
    await act(async () => {
      updateVoiceEntry(id, { sourceId: 'card-1' });
    });
    expect(screen.getByLabelText('Paid with, VISA ••4821')).toBeTruthy();
    await press(screen, 'Save receipt');

    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1030.5, card_id: 'card-1', bank_account_id: null }),
    );
  });

  it('saves a bill named after its category, due on the day heard', async () => {
    seed(RENT);
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Add a bill')).toBeTruthy();
    expect(screen.getByLabelText('Name, Housing')).toBeTruthy();
    expect(screen.getByLabelText('Category, Housing')).toBeTruthy();
    expect(screen.getByLabelText('Due on, Sun Nov 1')).toBeTruthy();

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
    seed(STREAMING);
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByLabelText('Next renewal, not set, optional')).toBeTruthy();
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

  it.each([
    ['receipt', {}, 'Save receipt', mockCreateReceipt],
    ['bill', RENT, 'Save bill', mockCreateBill],
    ['subscription', STREAMING, 'Save subscription', mockCreateSubscription],
  ] as const)('saves the note typed for a %s', async (_kind, patch, save, create) => {
    const id = seed(patch);
    const screen = await render(<VoiceReviewScreen />);
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
    expect(screen.getByText('Add a note')).toBeTruthy();

    // What the note page's Done writes.
    await act(async () => {
      updateVoiceEntry(id, { note: 'Split with Sam' });
    });
    expect(screen.getByLabelText('Note, Split with Sam')).toBeTruthy();
    await press(screen, save);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ note: 'Split with Sam' }));
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
    // Nothing blocks Save, so there is no hint beside the failure.
    expect(screen.getByLabelText('Save receipt').props.accessibilityHint).toBeUndefined();

    // The button is the retry.
    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).toHaveBeenCalledTimes(2);
    expect(router.dismissTo).toHaveBeenCalledWith('/home');
  });

  it('shows and reports the failure line when the database refuses for Pro someone the app thinks has it', async () => {
    // A free account never reaches this page (the gate sends it to the explainer), so a Pro-wall
    // refusal here is the app and the server disagreeing, which is a failure to report.
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const id = seed();
    const refusal = { code: 'P0001', message: 'Adding receipts by voice is part of Skip Pro.' };
    mockCreateReceipt.mockRejectedValueOnce(refusal);
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Save receipt');

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(log).toHaveBeenCalledWith('[failure]', refusal);
    expect(router.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/pro-feature' }),
    );
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(readVoiceDraft(id)).not.toBeNull();
    log.mockRestore();
  });
});

describe('/voice-review — the final page, as each form draws it', () => {
  it('draws a receipt: amount, then store, date with its chips, paid with and note', async () => {
    seed();
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByRole('button', { name: 'Amount, $12.50' }).props.accessibilityHint).toBe(
      'Tap to edit',
    );
    expectRowsInOrder(screen, [
      'Is this right?',
      'Amount',
      'Store',
      'Date',
      'Today',
      'Yesterday',
      'Pick date',
      'Paid with · Optional',
      'Note',
      'You can edit this later.',
      'Save receipt',
      'Say it again',
      'More options',
    ]);
    // No reminder: a voice entry saves with none, as the review always has.
    expect(screen.queryByText('Reminder')).toBeNull();
  });

  it('draws a bill: name, category, due on, recurring with its chips, paid with and note', async () => {
    seed(RENT);
    const screen = await render(<VoiceReviewScreen />);

    expectRowsInOrder(screen, [
      'Amount',
      'Name',
      'Category',
      'Due on',
      'Recurring',
      'Weekly',
      'Monthly',
      'Every 3 months',
      'Yearly',
      'Paid with · Optional',
      'Note',
      'Save bill',
    ]);
    expect(isLit(screen, 'Monthly')).toBe(true);
    // The chips are the control; the line above them opens nothing.
    expect(screen.queryByRole('button', { name: /^Recurring, / })).toBeNull();
  });

  it('draws a subscription: service, billing cycle with its chips, next renewal, charged to and note', async () => {
    seed(STREAMING);
    const screen = await render(<VoiceReviewScreen />);

    expectRowsInOrder(screen, [
      'Amount',
      'Service',
      'Billing cycle',
      'Weekly',
      'Monthly',
      'Quarterly',
      'Yearly',
      'Next renewal · Optional',
      'Charged to · Optional',
      'Note',
      'Save subscription',
    ]);
    expect(isLit(screen, 'Monthly')).toBe(true);
    expect(screen.getByLabelText('Service, Netflix')).toBeTruthy();
  });

  it('leaves out Paid with when there is no card or account to choose', async () => {
    mockSources = [];
    seed();
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.queryByText(/^Paid with/)).toBeNull();
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
  });

  it('opens one page per line, each for its own field', async () => {
    seed();
    const screen = await render(<VoiceReviewScreen />);

    // The figure inside carries the same words as the button around it.
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Amount, $12.50' }));
    });
    expect(openedField()).toBe('amount');
    await refocus();

    for (const [label, field] of [
      ['Store, Starbucks', 'merchant'],
      ['Date, Today, Thu Oct 1', 'date'],
      ['Pick date', 'date'],
      ['Paid with, not set, optional', 'source'],
      ['Note, not set, optional', 'note'],
    ] as const) {
      await press(screen, label);
      expect([label, openedField()]).toEqual([label, field]);
      await refocus();
    }
    expect(router.push).toHaveBeenCalledTimes(6);
  });

  it('opens a bill’s category and due date on their own pages', async () => {
    seed(RENT);
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Category, Housing');
    expect(openedField()).toBe('category');
    await refocus();
    await press(screen, 'Due on, Sun Nov 1');
    expect(openedField()).toBe('date');
    await refocus();
    await press(screen, 'Name, Housing');
    expect(openedField()).toBe('merchant');
  });
});

describe('/voice-review — the date chips', () => {
  it('sets the day in one tap and lights its chip, opening nothing', async () => {
    const id = seed();
    const screen = await render(<VoiceReviewScreen />);
    expect(isLit(screen, 'Today')).toBe(true);
    expect(isLit(screen, 'Yesterday')).toBe(false);

    await press(screen, 'Yesterday');

    expect(readVoiceEntry(id)?.date).toBe('2026-09-30');
    expect(isLit(screen, 'Yesterday')).toBe(true);
    expect(isLit(screen, 'Today')).toBe(false);
    expect(screen.getByLabelText('Date, Yesterday, Wed Sep 30')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();

    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ purchased_on: '2026-09-30' }),
    );
  });

  it('lights Pick date for any other day, and opens the calendar from it', async () => {
    seed({ date: '2026-09-20' });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByLabelText('Date, Sun Sep 20')).toBeTruthy();
    expect(isLit(screen, 'Pick date')).toBe(true);
    expect(isLit(screen, 'Today')).toBe(false);

    await press(screen, 'Today');
    expect(isLit(screen, 'Today')).toBe(true);
    await press(screen, 'Pick date');
    expect(openedField()).toBe('date');
  });

  it('draws a receipt with no day heard as today, and a tap on the lit chip changes nothing', async () => {
    const id = seed({ date: null });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByLabelText('Date, Today, Thu Oct 1')).toBeTruthy();
    expect(isLit(screen, 'Today')).toBe(true);

    await press(screen, 'Today');
    expect(readVoiceEntry(id)?.date).toBeNull();
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ purchased_on: '2026-10-01' }),
    );
  });

  it('gives the bill and subscription dates no chips, as their forms do', async () => {
    seed(RENT);
    const screen = await render(<VoiceReviewScreen />);
    expect(screen.queryByLabelText('Pick date')).toBeNull();
    expect(screen.queryByLabelText('Yesterday')).toBeNull();
  });
});

describe('/voice-review — how often', () => {
  it('repeats a bill as picked on its chips, in one tap', async () => {
    const id = seed(RENT);
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Weekly');
    expect(readVoiceEntry(id)?.cycle).toBe('weekly');
    expect(isLit(screen, 'Weekly')).toBe(true);
    expect(isLit(screen, 'Monthly')).toBe(false);
    expect(router.push).not.toHaveBeenCalled();

    await press(screen, 'Save bill');
    expect(mockCreateBill).toHaveBeenCalledWith(expect.objectContaining({ recurrence: 'weekly' }));
  });

  it('bills a subscription as picked on its chips', async () => {
    seed(STREAMING);
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Yearly');
    expect(isLit(screen, 'Yearly')).toBe(true);
    await press(screen, 'Save subscription');
    expect(mockCreateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ cycle: 'yearly' }),
    );
  });

  it('counts a tap on the cycle already lit as no change', async () => {
    const id = seed(STREAMING);
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Monthly');
    expect(readVoiceEntry(id)?.cycle).toBe('monthly');
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
  });
});

describe('/voice-review — logos for a store the catalogue does not know', () => {
  const RAINBOW = { brandId: null, name: 'Rainbow Shops', domain: null, categoryId: 'shopping' };
  const RAINBOW_MATCH = {
    matched: true,
    name: 'Rainbow Shops',
    domain: 'rainbowshops.com',
    confidence: 1,
    margin: 1,
    candidates: [],
  };
  const seedRainbow = (patch: Partial<VoiceDraft> = {}) =>
    seed({
      merchant: RAINBOW,
      merchantHeard: 'rainbow shops',
      merchantSource: 'heard',
      transcript: 'Spent $12.50 at Rainbow Shops today',
      ...patch,
    });

  it('shows the add forms’ logo question and saves the logo that was confirmed', async () => {
    mockLogoLookup = { data: RAINBOW_MATCH, isLoading: false, isFetching: false };
    seedRainbow();
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('rainbowshops.com')).toBeTruthy();
    await press(screen, LOGO_COPY.yes);
    // Answered once: the question gives way to the way back.
    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.getByText(LOGO_COPY.changeLogo)).toBeTruthy();

    await press(screen, 'Save receipt');

    expect(mockCreateReceipt).toHaveBeenCalledTimes(1);
    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        brand_id: null,
        merchant: 'Rainbow Shops',
        logo_domain: 'rainbowshops.com',
        logo_hidden: false,
      }),
    );
  });

  it('asks under the card, after the last line', async () => {
    mockLogoLookup = { data: RAINBOW_MATCH, isLoading: false, isFetching: false };
    seedRainbow();
    const screen = await render(<VoiceReviewScreen />);

    expectRowsInOrder(screen, ['Store', 'Note', 'rainbowshops.com', 'Save receipt']);
  });

  it('saves letters when the person asks for none', async () => {
    mockLogoLookup = { data: RAINBOW_MATCH, isLoading: false, isFetching: false };
    seedRainbow();
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, LOGO_COPY.letters);
    await press(screen, 'Save receipt');

    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ logo_domain: null, logo_hidden: true }),
    );
  });

  it('chooses nothing until asked: unanswered, the row is saved without logo columns', async () => {
    mockLogoLookup = { data: RAINBOW_MATCH, isLoading: false, isFetching: false };
    seedRainbow();
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Save receipt');

    const saved = mockCreateReceipt.mock.calls[0][0];
    expect(saved).not.toHaveProperty('logo_domain');
    expect(saved).not.toHaveProperty('logo_hidden');
  });

  it('offers no card when the service is unsure, only a way to add the website', async () => {
    seedRainbow();
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.getByText(LOGO_COPY.addWebsite)).toBeTruthy();

    await press(screen, 'Save receipt');
    expect(mockCreateReceipt.mock.calls[0][0]).not.toHaveProperty('logo_domain');
  });

  it('asks nothing about a store the catalogue knows, and looks nothing up', async () => {
    seed();
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.queryByText(LOGO_COPY.addWebsite)).toBeNull();
    expect(mockLogoAsked).toEqual([]);
  });

  it('does not ask again, or look anything up, for a logo already chosen on the edit page', async () => {
    const id = seedRainbow();
    updateVoiceEntry(id, {
      merchant: { ...RAINBOW, logoDomain: 'rainbowshops.com', logoHidden: false },
    });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.getByText(LOGO_COPY.changeLogo)).toBeTruthy();
    expect(mockLogoAsked.filter(Boolean)).toEqual([]);

    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ logo_domain: 'rainbowshops.com', logo_hidden: false }),
    );
  });

  it('saves a bill’s company logo with the bill, and words "no logo" as the icon', async () => {
    mockLogoLookup = {
      data: { ...RAINBOW_MATCH, name: 'Local Power', domain: 'localpower.com' },
      isLoading: false,
      isFetching: false,
    };
    seed({
      kind: 'bill',
      amount: 90,
      merchant: { brandId: null, name: 'Local Power', domain: null, categoryId: 'utilities' },
      merchantHeard: 'local power',
      merchantSource: 'heard',
      date: '2026-11-01',
      cycle: 'monthly',
      billCategoryId: 'housing',
      transcript: 'Local Power bill is $90, due on the 1st',
    });
    const screen = await render(<VoiceReviewScreen />);

    // A bill with no logo wears its category's icon, so that is what the choice says.
    expect(screen.getByLabelText(LOGO_COPY.icon)).toBeTruthy();
    expect(screen.queryByLabelText(LOGO_COPY.letters)).toBeNull();

    await press(screen, LOGO_COPY.yes);
    await press(screen, 'Save bill');

    expect(mockCreateBill).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Local Power',
        logo_domain: 'localpower.com',
        logo_hidden: false,
      }),
    );
  });

  describe('what is remembered for the add forms', () => {
    it('remembers the logo the person confirmed, with the store’s category', async () => {
      mockLogoLookup = { data: RAINBOW_MATCH, isLoading: false, isFetching: false };
      seedRainbow();
      const screen = await render(<VoiceReviewScreen />);
      expect(mockRemember).not.toHaveBeenCalled();

      await press(screen, LOGO_COPY.yes);

      expect(mockRemember).toHaveBeenCalledTimes(1);
      expect(mockRemember).toHaveBeenCalledWith(
        {
          name: 'Rainbow Shops',
          categoryId: 'shopping',
          logoDomain: 'rainbowshops.com',
          logoHidden: false,
        },
        { teach: true },
      );
    });

    it('remembers letters when the person asks for none', async () => {
      mockLogoLookup = { data: RAINBOW_MATCH, isLoading: false, isFetching: false };
      seedRainbow();
      const screen = await render(<VoiceReviewScreen />);

      await press(screen, LOGO_COPY.letters);

      expect(mockRemember).toHaveBeenCalledTimes(1);
      expect(mockRemember).toHaveBeenCalledWith(
        {
          name: 'Rainbow Shops',
          categoryId: 'shopping',
          logoDomain: null,
          logoHidden: true,
        },
        { teach: true },
      );
    });

    it('remembers a bill’s company the same way', async () => {
      mockLogoLookup = {
        data: { ...RAINBOW_MATCH, name: 'Local Power', domain: 'localpower.com' },
        isLoading: false,
        isFetching: false,
      };
      seed({
        kind: 'bill',
        amount: 90,
        merchant: { brandId: null, name: 'Local Power', domain: null, categoryId: 'utilities' },
        merchantHeard: 'local power',
        merchantSource: 'heard',
        date: '2026-11-01',
        cycle: 'monthly',
        billCategoryId: 'housing',
        transcript: 'Local Power bill is $90, due on the 1st',
      });
      const screen = await render(<VoiceReviewScreen />);

      await press(screen, LOGO_COPY.yes);

      expect(mockRemember).toHaveBeenCalledWith(
        {
          name: 'Local Power',
          categoryId: 'utilities',
          logoDomain: 'localpower.com',
          logoHidden: false,
        },
        { teach: true },
      );
    });

    it('remembers nothing until the person answers, and saving is not an answer', async () => {
      mockLogoLookup = { data: RAINBOW_MATCH, isLoading: false, isFetching: false };
      seedRainbow();
      const screen = await render(<VoiceReviewScreen />);

      await press(screen, 'Save receipt');

      expect(mockCreateReceipt).toHaveBeenCalledTimes(1);
      expect(mockRemember).not.toHaveBeenCalled();
    });

    it('remembers nothing for a store the catalogue knows', async () => {
      seed();
      await render(<VoiceReviewScreen />);

      expect(mockRemember).not.toHaveBeenCalled();
    });

    it('remembers nothing for a logo that was already chosen on the edit page', async () => {
      const id = seedRainbow();
      updateVoiceEntry(id, {
        merchant: { ...RAINBOW, logoDomain: 'rainbowshops.com', logoHidden: false },
      });
      await render(<VoiceReviewScreen />);

      expect(mockRemember).not.toHaveBeenCalled();
    });
  });

  describe('a store in our own logo list', () => {
    const SURE_RAINBOW = { ...RAINBOW_MATCH, kind: 'alias', confidence: 0.99 };

    it('is given its logo with no question, and saved with it', async () => {
      mockLogoLookup = { data: SURE_RAINBOW, isLoading: false, isFetching: false };
      seedRainbow();
      const screen = await render(<VoiceReviewScreen />);

      expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
      expect(screen.queryByText('rainbowshops.com')).toBeNull();
      expect(screen.getByText(LOGO_COPY.changeLogo)).toBeTruthy();

      await press(screen, 'Save receipt');

      expect(mockCreateReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          brand_id: null,
          merchant: 'Rainbow Shops',
          logo_domain: 'rainbowshops.com',
          logo_hidden: false,
        }),
      );
      expect(mockRemember).toHaveBeenCalledTimes(1);
      expect(mockRemember).toHaveBeenCalledWith(
        {
          name: 'Rainbow Shops',
          categoryId: 'shopping',
          logoDomain: 'rainbowshops.com',
          logoHidden: false,
        },
        { teach: false },
      );
    });

    it('still asks for a close spelling', async () => {
      mockLogoLookup = {
        data: { ...SURE_RAINBOW, kind: 'fuzzy' },
        isLoading: false,
        isFetching: false,
      };
      seedRainbow();
      const screen = await render(<VoiceReviewScreen />);

      expect(screen.getByLabelText(LOGO_COPY.yes)).toBeTruthy();
      await press(screen, 'Save receipt');
      expect(mockCreateReceipt.mock.calls[0][0]).not.toHaveProperty('logo_domain');
      expect(mockRemember).not.toHaveBeenCalled();
    });
  });

  it('hands the chosen logo to the full form with the rest', async () => {
    mockLogoLookup = { data: RAINBOW_MATCH, isLoading: false, isFetching: false };
    seedRainbow();
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, LOGO_COPY.yes);
    await press(screen, 'More options');

    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/add-receipt',
        params: expect.objectContaining({
          scannedStore: 'Rainbow Shops',
          scannedLogoDomain: 'rainbowshops.com',
        }),
      }),
    );
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
    expect(screen.getByRole('button', { name: 'Amount, needed' })).toBeTruthy();
    expect(screen.queryByText(/\$0/)).toBeNull();
    expect(screen.getByText('Enter how much you spent.')).toBeTruthy();
    expect(isDisabled(screen, 'Save receipt')).toBe(true);

    await press(screen, 'Amount, needed');
    expect(openedField()).toBe('amount');
  });

  it('asks for the store in the form’s own words', async () => {
    seed({ merchant: null, merchantHeard: null });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByLabelText('Store, needed')).toBeTruthy();
    // A hint, not a failure: nothing has gone wrong yet. Save says it too.
    expect(screen.getByText('Pick a store first.')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByLabelText('Save receipt').props.accessibilityHint).toBe(
      'Pick a store first.',
    );
    expect(isDisabled(screen, 'Save receipt')).toBe(true);
    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).not.toHaveBeenCalled();
  });

  it('makes the person pick an ambiguous amount, guessing nothing', async () => {
    seed({ amount: 12.5, amountChoices: [12.5, 1250] });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.getByText('Which amount did you mean?')).toBeTruthy();
    expect(screen.getByText('Pick the amount you meant.')).toBeTruthy();
    expect(screen.getByLabelText('Save receipt').props.accessibilityHint).toBe(
      'Pick the amount you meant.',
    );
    // The chooser stands in for the figure: no amount is drawn, not even as a gap.
    expect(screen.queryByRole('button', { name: /^Amount, / })).toBeNull();
    expect(screen.queryByText('Tap to add the amount')).toBeNull();
    expect(isDisabled(screen, 'Save receipt')).toBe(true);
    expect(screen.getByLabelText('$12.50').props.accessibilityState.selected).toBe(false);
    expect(screen.getByLabelText('$1,250.00').props.accessibilityState.selected).toBe(false);

    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).not.toHaveBeenCalled();

    await press(screen, '$1,250.00');
    expect(screen.getByRole('button', { name: 'Amount, $1,250.00' })).toBeTruthy();
    expect(screen.queryByText('Which amount did you mean?')).toBeNull();

    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).toHaveBeenCalledWith(expect.objectContaining({ amount: 1250 }));
  });

  it('types an amount neither choice was, on the keypad page', async () => {
    seed({ amount: 12.5, amountChoices: [12.5, 1250] });
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Neither, I’ll type it');
    expect(openedField()).toBe('amount');
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
    expect(screen.getByLabelText('Category, needed')).toBeTruthy();
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
    updateVoiceEntry(id, { sourceId: 'acct-1', note: 'Team lunch' });
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
        scannedNote: 'Team lunch',
      },
    });
  });

  it.each([
    ['bill', RENT, '/add-bill'],
    ['subscription', STREAMING, '/add-subscription'],
  ] as const)('hands a %s’s typed note to its form', async (_kind, patch, pathname) => {
    const id = seed(patch);
    updateVoiceEntry(id, { note: 'Shared with Sam' });
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'More options');
    expect((router.push as jest.Mock).mock.calls[0][0]).toMatchObject({
      pathname,
      params: { from: 'voice', prefillNote: 'Shared with Sam' },
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
    expect(screen.getByLabelText('Due on, Tue Oct 20')).toBeTruthy();
    expect(screen.queryByLabelText('Pick date')).toBeNull();
    expect(screen.queryByText('Skip guessed this one. Pick another if it’s wrong.')).toBeNull();
  });

  it('keeps what was changed by hand through a kind change', async () => {
    const id = seed({ kindSure: false, transcript: 'Comcast $79.99 on the 20th' });
    updateVoiceEntry(id, { amount: 20, sourceId: 'card-1', note: 'Team lunch' });
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Subscription');

    expect(readVoiceEntry(id)).toMatchObject({
      kind: 'subscription',
      amount: 20,
      sourceId: 'card-1',
      note: 'Team lunch',
    });
    expect(screen.getByRole('button', { name: 'Amount, $20.00' })).toBeTruthy();
    expect(screen.getByLabelText('Charged to, VISA ••4821')).toBeTruthy();
    expect(screen.getByLabelText('Note, Team lunch')).toBeTruthy();
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
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
    expect(readVoiceDraft(id)).not.toBeNull();
  });

  it('counts a date chip as an edit: the swipe goes off and back asks before throwing it away', async () => {
    const id = seed();
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Yesterday');
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });

    await press(screen, 'Back');
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cancel adding this receipt?',
        message: 'Nothing you have entered here will be saved.',
      }),
    );
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(readVoiceDraft(id)).toBeNull();
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

    await refocus();
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
