import { fireEvent, render } from '@testing-library/react-native';

import VoiceEditScreen from '@/app/voice-edit';
import type { VoiceDraft } from '@/lib/voice';
import { clearVoiceDraft, putVoiceDraft, readVoiceEntry } from '@/lib/voice-draft';

/**
 * The voice date page greys out every day before the first kept day (today less seven years, a leap
 * day going back to the 28th, as the database counts), for receipts, bills and subscriptions alike,
 * and still takes the first kept day.
 */

jest.mock('@/theme/bill-icons', () => ({
  useBillIcons: () => new Proxy({}, { get: () => () => null }),
}));
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
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  warn: jest.fn(),
  success: jest.fn(),
  selection: jest.fn(),
}));

let mockToday = '2026-10-09';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: [] }) }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/api/known-stores', () => ({
  matchKnownStores: () => [],
  storeKey: (name: string) => name.trim().toLowerCase(),
  useKnownStores: () => [],
  useRememberStore: () => async () => {},
}));
jest.mock('@/api/brands', () => ({
  useBrandSearch: () => ({ data: [], isFetching: false }),
  guessCategory: () => 'other',
}));
jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: null, isLoading: false, isFetching: false }),
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

function open(patch: Partial<VoiceDraft> = {}): string {
  const id = putVoiceDraft({ ...RECEIPT, ...patch });
  mockParams = { draft: id, field: 'date' };
  return id;
}

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string | RegExp) =>
  fireEvent.press(screen.getByLabelText(label));

async function showMonth(screen: Screen, month: string, yearsBack: number) {
  await press(screen, /Choose a different month\.$/);
  for (let i = 0; i < yearsBack; i += 1) await press(screen, 'Previous year');
  await press(screen, month);
}

const blocked = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.disabled);

beforeEach(() => {
  jest.clearAllMocks();
  clearVoiceDraft();
  // Friday 9 October 2026: the first kept day is Wednesday 9 October 2019.
  mockToday = '2026-10-09';
});

describe('/voice-edit, the date, seven years back', () => {
  it('greys out the day before the first kept day, and Done takes the first kept day', async () => {
    const id = open();
    const screen = await render(<VoiceEditScreen />);
    await showMonth(screen, 'October', 7);

    expect(blocked(screen, 'Tuesday 8 October 2019')).toBe(true);
    expect(blocked(screen, 'Wednesday 9 October 2019')).toBe(false);

    await press(screen, 'Wednesday 9 October 2019');
    await press(screen, 'Done');
    expect(readVoiceEntry(id)?.date).toBe('2019-10-09');
  });

  it('opens a heard day before it already greyed out', async () => {
    open({ date: '2019-10-08' });
    const screen = await render(<VoiceEditScreen />);

    expect(blocked(screen, 'Tuesday 8 October 2019')).toBe(true);
    expect(blocked(screen, 'Wednesday 9 October 2019')).toBe(false);
  });

  it('takes a leap day back to the 28th, as the database does', async () => {
    // Tuesday 29 February 2028: the first kept day is Sunday 28 February 2021, not 1 March.
    mockToday = '2028-02-29';
    open();
    const screen = await render(<VoiceEditScreen />);
    await showMonth(screen, 'February', 7);

    expect(blocked(screen, 'Saturday 27 February 2021')).toBe(true);
    expect(blocked(screen, 'Sunday 28 February 2021')).toBe(false);
  });

  it.each([
    {
      kind: 'bill' as const,
      patch: { merchant: null, merchantHeard: null, billCategoryId: 'energy', cycle: 'monthly' },
    },
    { kind: 'subscription' as const, patch: { cycle: 'monthly' } },
  ])('holds a $kind to the same first day', async ({ kind, patch }) => {
    open({ kind, date: '2026-10-20', ...(patch as Partial<VoiceDraft>) });
    const screen = await render(<VoiceEditScreen />);
    await showMonth(screen, 'October', 7);

    expect(blocked(screen, 'Tuesday 8 October 2019')).toBe(true);
    expect(blocked(screen, 'Wednesday 9 October 2019')).toBe(false);
  });
});
