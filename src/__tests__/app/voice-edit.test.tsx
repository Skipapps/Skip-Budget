import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import VoiceEditScreen from '@/app/voice-edit';
import type { VoiceDraft } from '@/lib/voice';
import { clearVoiceDraft, putVoiceDraft, readVoiceEntry, useVoiceSession } from '@/lib/voice-draft';

/**
 * The one-field correction pages. Done writes to the review's working copy
 * and pops; back pops and writes nothing. Built from the add flows' own parts,
 * so these drive the real keypad, store search, calendar and category grid.
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
  Redirect: () => null,
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
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
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
    stale.unmount();

    open('category');
    const receipt = await render(<VoiceEditScreen />);
    expect(receipt.getByText('Nothing to check yet')).toBeTruthy();
  });
});
