import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import VoiceReviewScreen from '@/app/voice-review';
import { fromCents, toCents } from '@/lib/money';
import type { VoiceDraft } from '@/lib/voice';
import { clearVoiceDraft, putVoiceDraft } from '@/lib/voice-draft';

/**
 * Three money checks for the voice review page, on top of `voice-review.test.tsx`: no path shows or
 * saves $0 or NaN, every amount saved equals `fromCents(toCents(x))`, and an ambiguous amount can
 * never reach a create call, pressed or not: the Save handler itself must refuse, not just the
 * button's disabled look.
 *
 * Same mocks as `voice-review.test.tsx`; the draft goes through the real store and the real
 * builders, only the network is replaced.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockParams: { draft?: string } = {};
const mockScreenOptions = jest.fn();
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  // The page re-opens its navigation guard on focus; in a test it is always focused.
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
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

jest.mock('@/api/voice-aliases', () => ({
  useVoiceAliases: () => ({ aliases: {}, ready: true }),
  useLearnVoiceAlias: () => jest.fn(async () => {}),
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

beforeEach(() => {
  jest.clearAllMocks();
  clearVoiceDraft();
  mockPro = { pro: true, ready: true };
  mockConfirm.mockImplementation(async () => true);
  mockCreateReceipt.mockResolvedValue({ id: 'r1' });
  mockCreateBill.mockResolvedValue({ id: 'b1' });
  mockCreateSubscription.mockResolvedValue({ id: 's1' });
});

describe('money check — an ambiguous amount can never be saved without a pick', () => {
  it('refuses the save on a direct press, not only by looking disabled', async () => {
    seed({ amount: 12.5, amountChoices: [12.5, 1250] });
    const screen = await render(<VoiceReviewScreen />);

    // A press on the button as rendered — proves the handler itself (not
    // merely the pill's dimmed look) refuses to file anything.
    await press(screen, 'Save receipt');

    expect(mockCreateReceipt).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(screen.getByText('Which amount did you mean?')).toBeTruthy();
  });

  it('refuses a subscription save the same way, until the amount is picked', async () => {
    seed({
      kind: 'subscription',
      amount: 12.5,
      amountChoices: [12.5, 1250],
      merchant: {
        brandId: 'b-nflx',
        name: 'Netflix',
        domain: 'netflix.com',
        categoryId: 'streaming',
      },
      merchantHeard: 'netflix',
      cycle: 'monthly',
      transcript: 'Netflix twelve fifty a month',
    });
    const screen = await render(<VoiceReviewScreen />);

    await press(screen, 'Save subscription');
    expect(mockCreateSubscription).not.toHaveBeenCalled();

    await press(screen, '$1,250.00');
    await press(screen, 'Save subscription');
    expect(mockCreateSubscription).toHaveBeenCalledWith(expect.objectContaining({ amount: 1250 }));
  });
});

describe('money check — no path shows or saves $0 or NaN', () => {
  it('never renders NaN when the slot somehow holds one, and blocks Save', async () => {
    // A malformed value as it might arrive from a corrupted module boundary, not from the parser
    // (which never emits one). The store re-validates on arrival wherever a draft came from.
    const id = seed({ amount: NaN });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.queryByText(/\$0\b/)).toBeNull();
    expect(screen.getByText('Tap to add the amount')).toBeTruthy();

    await press(screen, 'Save receipt');
    expect(mockCreateReceipt).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(id).toBeTruthy();
  });

  it('never shows or saves $0 for a bill nobody put a figure to', async () => {
    seed({
      kind: 'bill',
      amount: null,
      merchant: null,
      merchantHeard: null,
      date: '2026-11-01',
      cycle: 'monthly',
      billCategoryId: 'housing',
    });
    const screen = await render(<VoiceReviewScreen />);

    expect(screen.queryByText(/\$0\b/)).toBeNull();
    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    await press(screen, 'Save bill');
    expect(mockCreateBill).not.toHaveBeenCalled();
  });
});

describe('money check — every amount saved equals fromCents(toCents(x))', () => {
  it.each([0.01, 0.1, 12.5, 15.99, 1030.5, 999999999.99])(
    'carries %p through to the create call exactly, with no drift',
    async (amount) => {
      seed({ amount });
      const screen = await render(<VoiceReviewScreen />);
      await press(screen, 'Save receipt');

      expect(mockCreateReceipt).toHaveBeenCalledTimes(1);
      const saved = mockCreateReceipt.mock.calls[0][0].amount;
      expect(saved).toBe(amount);
      expect(fromCents(toCents(saved))).toBe(saved);
    },
  );
});
