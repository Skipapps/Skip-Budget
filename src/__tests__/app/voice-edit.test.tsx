import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import VoiceEditScreen from '@/app/voice-edit';
import { LOGO_COPY } from '@/components/brands/logo-choices';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import type { VoiceDraft } from '@/lib/voice';
import {
  clearVoiceDraft,
  putVoiceDraft,
  readVoiceEntry,
  updateVoiceEntry,
  useVoiceSession,
} from '@/lib/voice-draft';

/**
 * The one-field correction pages. Done writes to the review's working copy and pops; back pops and
 * writes nothing. Built from the add flows' own parts, so these drive the real keypad, store
 * search, calendar, category grid, card tiles and note field (the last two are the forms' own
 * pages).
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockParams: { draft?: string; field?: string } = {};
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: () => null,
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    card: '#FFFFFF',
    accent: '#905479',
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
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/known-stores', () => ({
  matchKnownStores: () => [],
  storeKey: (name: string) => name.trim().toLowerCase(),
  useKnownStores: () => [],
  useRememberStore: () => async () => {},
}));
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

const mockBrands = [
  {
    id: 'b-sbux',
    name: 'Starbucks',
    domain: 'starbucks.com',
    category_id: 'dining',
    logo_path: null,
  },
];
jest.mock('@/api/brands', () => ({
  useBrandSearch: (query: string) => ({
    data: query.trim().length >= 2 ? mockBrands : [],
    isFetching: false,
  }),
  guessCategory: () => 'other',
}));

const mockSources = [
  { id: 'card-1', label: 'VISA ••4821', color: '#123456', kind: 'card' as const },
  { id: 'acct-1', label: 'Checking', color: '#654321', kind: 'account' as const },
];
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: mockSources }) }));
// The forms' reminder page shares a module with the note page; nothing here opens it.
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));

// The logo service's answer for a store added by hand.
let mockLogoLookup: { data: unknown; isLoading: boolean; isFetching: boolean } = {
  data: null,
  isLoading: false,
  isFetching: false,
};
jest.mock('@/api/logos', () => ({ useLogoMatch: () => mockLogoLookup }));

const RECEIPT: VoiceDraft = {
  kind: 'receipt',
  kindSure: true,
  amount: 12.5,
  amountChoices: [],
  merchant: { brandId: 'b-sbux', name: 'Starbucks', domain: 'starbucks.com', categoryId: 'dining' },
  merchantHeard: 'starbucks',
  merchantSource: 'catalog',
  multiple: false,
  date: null,
  cycle: null,
  billCategoryId: null,
  score: 9,
  confidence: 'high',
  missing: [],
  transcript: 'Spent $12.50 at Starbucks',
};

function open(field: string, patch: Partial<VoiceDraft> = {}): string {
  const id = putVoiceDraft({ ...RECEIPT, ...patch });
  mockParams = { draft: id, field };
  return id;
}

type Screen = Awaited<ReturnType<typeof render>>;

async function press(screen: Screen, label: string | RegExp) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

const isDisabled = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.disabled);

/** What the review page would read: the working copy, and what was touched. */
function snapshot(id: string) {
  let touched: readonly string[] = [];
  function Probe() {
    touched = useVoiceSession(id)?.touched ?? [];
    return null;
  }
  return { entry: readVoiceEntry(id), Probe, touched: () => touched };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearVoiceDraft();
  mockLogoLookup = { data: null, isLoading: false, isFetching: false };
});

describe('/voice-edit', () => {
  it('types a new amount on the keypad, and Done writes it', async () => {
    const id = open('amount');
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('How much did you spend?')).toBeTruthy();
    expect(screen.queryByLabelText('Close')).toBeNull();

    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    expect(isDisabled(screen, 'Done')).toBe(true);

    await press(screen, '4');
    await press(screen, '5');
    await press(screen, 'Decimal point');
    await press(screen, '9');
    await press(screen, 'Done');

    expect(readVoiceEntry(id)?.amount).toBe(45.9);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when it is left by back', async () => {
    const id = open('amount');
    const screen = await render(<VoiceEditScreen />);

    await press(screen, '7');
    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    const { entry, Probe, touched } = snapshot(id);
    await render(<Probe />);
    expect(entry?.amount).toBe(12.5);
    expect(touched()).toEqual([]);
  });

  it('opens the store search on what was heard when nothing matched', async () => {
    const id = open('merchant', {
      merchant: { brandId: null, name: 'Star Bucks', domain: null, categoryId: 'other' },
      merchantHeard: 'star bucks',
    });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Where did you buy it?')).toBeTruthy();
    expect(screen.getByDisplayValue('star bucks')).toBeTruthy();
    expect(isDisabled(screen, 'Done')).toBe(true);

    await press(screen, 'Starbucks');
    await press(screen, 'Done');

    expect(readVoiceEntry(id)?.merchant).toEqual({
      brandId: 'b-sbux',
      name: 'Starbucks',
      domain: 'starbucks.com',
      categoryId: 'dining',
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('asks the logo question for a store added by hand, and Done keeps the answer', async () => {
    mockLogoLookup = {
      data: {
        matched: true,
        name: 'Rainbow Shops',
        domain: 'rainbowshops.com',
        confidence: 1,
        margin: 1,
        candidates: [],
      },
      isLoading: false,
      isFetching: false,
    };
    const id = open('merchant', {
      merchant: { brandId: null, name: 'Rainbow Shops', domain: null, categoryId: 'other' },
      merchantHeard: 'Rainbow Shops',
      merchantSource: 'heard',
    });
    const screen = await render(<VoiceEditScreen />);

    await press(screen, 'Add Rainbow Shops as a new store');
    expect(screen.getByText('rainbowshops.com')).toBeTruthy();
    await press(screen, LOGO_COPY.yes);
    await press(screen, 'Done');

    // The draft keeps the choice now, so the review page and the save see it.
    expect(readVoiceEntry(id)?.merchant).toEqual({
      brandId: null,
      name: 'Rainbow Shops',
      domain: null,
      categoryId: 'other',
      logoDomain: 'rainbowshops.com',
      logoHidden: false,
    });
  });

  it('shows a matched store as chosen, ready to keep', async () => {
    open('merchant');
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByLabelText('Change store, currently Starbucks')).toBeTruthy();
    expect(isDisabled(screen, 'Done')).toBe(false);
  });

  it('names a bill by hand, and keeps the automatic name unnamed', async () => {
    const id = open('merchant', {
      kind: 'bill',
      merchant: null,
      merchantHeard: null,
      billCategoryId: 'housing',
      date: '2026-11-01',
      cycle: 'monthly',
    });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Who is the bill from?')).toBeTruthy();
    expect(screen.getByDisplayValue('Housing')).toBeTruthy();

    // Unchanged: still the category's own name, so it stays unnamed.
    await press(screen, 'Done');
    expect(readVoiceEntry(id)?.billName).toBeNull();
  });

  it('keeps a bill name the person typed', async () => {
    const id = open('merchant', {
      kind: 'bill',
      merchant: null,
      merchantHeard: null,
      billCategoryId: 'housing',
      date: '2026-11-01',
      cycle: 'monthly',
    });
    const screen = await render(<VoiceEditScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByDisplayValue('Housing'), 'Flat rent');
    });
    await press(screen, 'Done');
    expect(readVoiceEntry(id)?.billName).toBe('Flat rent');
  });

  it('picks a due date on the calendar', async () => {
    const id = open('date', {
      kind: 'bill',
      merchant: null,
      merchantHeard: null,
      billCategoryId: 'energy',
      date: '2026-10-20',
      cycle: 'monthly',
    });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('When is it due?')).toBeTruthy();
    // "Today, …" in front on the day it is run, if that is the 15th.
    await press(screen, /^(Today, )?Thursday 15 October 2026$/);
    await press(screen, 'Done');

    expect(readVoiceEntry(id)?.date).toBe('2026-10-15');
  });

  it('starts a receipt on today, the form’s own default', async () => {
    const id = open('date');
    const screen = await render(<VoiceEditScreen />);

    await press(screen, 'Done');
    expect(readVoiceEntry(id)?.date).toBe('2026-10-01');
  });

  it('lets a subscription drop its renewal date', async () => {
    const id = open('date', {
      kind: 'subscription',
      date: '2026-10-03',
      cycle: 'monthly',
      merchant: { brandId: null, name: 'Spotify', domain: null, categoryId: 'streaming' },
    });
    const screen = await render(<VoiceEditScreen />);

    await press(screen, 'No renewal date');
    expect(readVoiceEntry(id)?.date).toBeNull();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('picks a bill category with one tap, and pops', async () => {
    const id = open('category', {
      kind: 'bill',
      merchant: null,
      merchantHeard: null,
      billCategoryId: 'housing',
      date: '2026-11-01',
      cycle: 'monthly',
    });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.queryByLabelText('Done')).toBeNull();
    await press(screen, 'Internet. Home broadband and Wi-Fi');

    expect(readVoiceEntry(id)?.billCategoryId).toBe('internet');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('leaves once for a double tap on Done, or it would pop the review too', async () => {
    const id = open('amount');
    const screen = await render(<VoiceEditScreen />);

    // "12.50" → "12.5" → "12.57"
    await press(screen, 'Delete last digit');
    await press(screen, '7');
    const done = screen.getByLabelText('Done');
    await act(async () => {
      fireEvent.press(done);
      fireEvent.press(done);
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(readVoiceEntry(id)?.amount).toBe(12.57);
  });

  it('takes the first of two quick category taps, and leaves once', async () => {
    const id = open('category', {
      kind: 'bill',
      merchant: null,
      merchantHeard: null,
      merchantSource: null,
      billCategoryId: 'housing',
      date: '2026-11-01',
      cycle: 'monthly',
    });
    const screen = await render(<VoiceEditScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Internet. Home broadband and Wi-Fi'));
      fireEvent.press(screen.getByLabelText('Mobile Phone. Phone plans, device payments'));
    });

    expect(readVoiceEntry(id)?.billCategoryId).toBe('internet');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('goes back once for a double tap on back, writing nothing', async () => {
    const id = open('date');
    const screen = await render(<VoiceEditScreen />);

    const back = screen.getByLabelText('Back');
    await act(async () => {
      fireEvent.press(back);
      fireEvent.press(back);
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(readVoiceEntry(id)?.date).toBeNull();
  });

  it('has nothing to correct on a stale draft, or a field the kind lacks', async () => {
    mockParams = { draft: 'gone', field: 'amount' };
    const stale = await render(<VoiceEditScreen />);
    expect(stale.getByText('Nothing to check yet')).toBeTruthy();
    await stale.unmount();

    open('category');
    const receipt = await render(<VoiceEditScreen />);
    expect(receipt.getByText('Nothing to check yet')).toBeTruthy();
  });

  it('has nothing to correct on the card or note page of a stale draft', async () => {
    for (const field of ['source', 'note']) {
      mockParams = { draft: 'gone', field };
      const stale = await render(<VoiceEditScreen />);
      expect(stale.getByText('Nothing to check yet')).toBeTruthy();
      await stale.unmount();
    }
  });
});

describe('/voice-edit — the card', () => {
  it('asks the forms’ question, and Done writes the card picked', async () => {
    const id = open('source');
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Paid with')).toBeTruthy();
    expect(screen.getByText('What did you pay with?')).toBeTruthy();
    expect(screen.queryByLabelText('Close')).toBeNull();

    await press(screen, 'VISA ••4821');
    expect(screen.getByLabelText('VISA ••4821').props.accessibilityState.selected).toBe(true);
    await press(screen, 'Done');

    expect(readVoiceEntry(id)?.sourceId).toBe('card-1');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('opens on the card already chosen, and "No card or account" clears it', async () => {
    const id = open('source');
    updateVoiceEntry(id, { sourceId: 'acct-1' });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByLabelText('Checking').props.accessibilityState.selected).toBe(true);
    await press(screen, 'No card or account');
    await press(screen, 'Done');

    expect(readVoiceEntry(id)?.sourceId).toBeNull();
  });

  it('writes nothing when it is left by back', async () => {
    const id = open('source');
    const screen = await render(<VoiceEditScreen />);

    await press(screen, 'Checking');
    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    const { entry, Probe, touched } = snapshot(id);
    await render(<Probe />);
    expect(entry?.sourceId).toBeNull();
    expect(touched()).toEqual([]);
  });

  it('is titled by the row that opened it: Charged to, for a subscription', async () => {
    open('source', {
      kind: 'subscription',
      cycle: 'monthly',
      merchant: { brandId: null, name: 'Spotify', domain: null, categoryId: 'streaming' },
    });
    const screen = await render(<VoiceEditScreen />);
    expect(screen.getByText('Charged to')).toBeTruthy();
  });

  it('leaves once for a double tap on Done', async () => {
    const id = open('source');
    const screen = await render(<VoiceEditScreen />);

    await press(screen, 'VISA ••4821');
    const done = screen.getByLabelText('Done');
    await act(async () => {
      fireEvent.press(done);
      fireEvent.press(done);
    });

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(readVoiceEntry(id)?.sourceId).toBe('card-1');
  });
});

describe('/voice-edit — the note', () => {
  it('types a note, and Done writes it trimmed', async () => {
    const id = open('note');
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getAllByText('Note').length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.changeText(
        screen.getByPlaceholderText('Anything worth remembering'),
        '  Team lunch ',
      );
    });
    await press(screen, 'Done');

    expect(readVoiceEntry(id)?.note).toBe('Team lunch');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('opens on the note already typed, and emptied it is no note', async () => {
    const id = open('note');
    updateVoiceEntry(id, { note: 'Team lunch' });
    const screen = await render(<VoiceEditScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByDisplayValue('Team lunch'), '   ');
    });
    await press(screen, 'Done');

    expect(readVoiceEntry(id)?.note).toBeNull();
  });

  it('writes nothing when it is left by back', async () => {
    const id = open('note');
    const screen = await render(<VoiceEditScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('Anything worth remembering'), 'Lunch');
    });
    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    const { entry, Probe, touched } = snapshot(id);
    await render(<Probe />);
    expect(entry?.note).toBeNull();
    expect(touched()).toEqual([]);
  });

  it('uses each form’s own hint for the note', async () => {
    open('note', {
      kind: 'subscription',
      cycle: 'monthly',
      merchant: { brandId: null, name: 'Spotify', domain: null, categoryId: 'streaming' },
    });
    const screen = await render(<VoiceEditScreen />);
    expect(screen.getByPlaceholderText('Which plan, for example')).toBeTruthy();
  });

  it('stays with the one failure line when Done cannot keep the note', async () => {
    const id = open('note');
    const screen = await render(<VoiceEditScreen />);

    // Past the field's own limit, which a paste can get round.
    await act(async () => {
      fireEvent.changeText(
        screen.getByPlaceholderText('Anything worth remembering'),
        'x'.repeat(201),
      );
    });
    await press(screen, 'Done');

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
    expect(readVoiceEntry(id)?.note).toBeNull();
  });
});
