import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddSubscriptionScreen from '@/app/add-subscription';
import type { KnownStore } from '@/api/known-stores';
import { LOGO_COPY } from '@/components/brands/logo-choices';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { clearVoiceDraft } from '@/lib/voice-draft';

/**
 * Golden: exactly what the subscription form's Save writes. Pins the object handed to create/update,
 * the words of the checks inside Save, `started_on` through countFromAfterPick and floorAfterCharges,
 * the order of the past-charges question, the write and the reminder, and where each kind of save
 * goes afterwards.
 *
 * The pages are the real ones, walked the way a person walks them (keypad, service search,
 * calendar, source tiles, reminder chips, note); only the network and the logo images are replaced.
 * The one exception is the primary button, a stub that accepts a press even while disabled: the only
 * way to reach the checks inside Save, which the final page normally holds back. It still reports
 * its disabled state.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/lib/voice-draft', () => ({
  ...jest.requireActual('@/lib/voice-draft'),
  clearVoiceDraft: jest.fn(),
}));

jest.mock('@/components/ui/button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({
      label,
      onPress,
      disabled,
    }: {
      label: string;
      onPress: () => void;
      disabled?: boolean;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled) }}
        onPress={onPress}
      >
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

// The logo a mark drew, readable as text: "Spotify|spotify.com", or "Spotify|" for letters.
jest.mock('@/components/brands/brand-logo', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    BrandLogo: ({
      name,
      domain,
      size,
    }: {
      name: string;
      domain?: string | null;
      size?: number;
    }) => <Text testID={`logo-${size}`}>{`${name}|${domain ?? ''}`}</Text>,
  };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
    body: '#333333',
    accentInk: '#000000',
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

/** What happened, in order: the question, the write, the rewrite of past renewals, the reminder. */
const mockOrder: string[] = [];

const mockPast = {
  lastChargedOn: null as string | null,
  ready: true,
  saving: false,
  choose: jest.fn(
    async (_label: string, _changed: boolean) => 'upcoming' as 'upcoming' | 'all' | null,
  ),
  apply: jest.fn(async () => {}),
  retry: jest.fn(),
};
jest.mock('@/api/past-charges', () => ({ usePastCharges: () => mockPast }));

// The real chips, leads and wording; only the two hooks that read and write the reminder are replaced.
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
const mockApplyReminder = jest.fn(async (..._args: unknown[]) => {});
let mockSavedReminder = { choice: 'off', remindAt: '09:00' };
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useReminderChoice: () => mockSavedReminder,
  useApplyReminder: () => mockApplyReminder,
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
let mockPending = false;
jest.mock('@/api/mutations', () => ({
  useCreateSubscription: () => ({ mutateAsync: mockCreate, isPending: mockPending }),
  useUpdateSubscription: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const BRANDS = [
  { id: 'b-nf', name: 'Netflix', domain: 'netflix.com', category_id: 'entertainment' },
  { id: 'b-sp', name: 'Spotify', domain: 'spotify.com', category_id: 'entertainment' },
];

// The real keyword guess and brand matching; only the reads that go to the network are replaced.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
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

// What the logo service answers for a service the catalogue does not know.
const PLANET_FITNESS_LOGO = {
  matched: true,
  name: 'Planet Fitness',
  domain: 'planetfitness.com',
  confidence: 0.97,
  margin: 0.9,
  candidates: [],
};
// A service in our own logo list: found by its exact name, with nothing else close.
const LINEAR_LOGO = {
  matched: true,
  name: 'Linear',
  domain: 'linear.app',
  confidence: 0.99,
  margin: 0.9,
  kind: 'alias',
  candidates: [{ domain: 'linear.app', name: 'Linear', confidence: 0.99 }],
};
const mockLogoAnswer = jest.fn();

// The services this person added before, and the answers written down for the next time.
let mockKnown: KnownStore[] = [];
const mockRemember = jest.fn(async (_store: KnownStore) => {});
jest.mock('@/api/known-stores', () => ({
  ...jest.requireActual('@/api/known-stores'),
  useKnownStores: () => mockKnown,
  useRememberStore: () => mockRemember,
}));

jest.mock('@/api/logos', () => ({
  useLogoMatch: (name: string) => ({
    data: mockLogoAnswer(name),
    isLoading: false,
    isFetching: false,
  }),
}));

let mockSources = [
  { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
  { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
];

let mockSubscription: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useSubscription: () => ({ ...mockSubscription, refetch: jest.fn() }),
  usePaymentSources: () => ({ sources: mockSources }),
}));

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

const SPOTIFY = {
  id: 'sub-1',
  started_on: '2026-08-10',
  created_at: '2026-08-12T10:00:00+00:00',
  brand_id: 'b-sp',
  name: 'Spotify',
  amount: 11.99,
  cycle: 'monthly',
  next_renewal_on: '2026-10-10',
  category_id: 'entertainment',
  card_id: null,
  bank_account_id: 'acct-1',
  note: 'Family plan',
  active: true,
  brands: { domain: 'spotify.com' },
};

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

/** The amount is a button on the page and a figure inside it, both worded alike: by role, the button. */
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
}

const SERVICE_PLACEHOLDER = 'Search for a service';

/** The button that lets go of the chosen service. Its words are the store field's, shared. */
const changeService = (name: string) => `Change service, currently ${name}`;

/** Types into the service box on the final page the way a finger does: a tap into it, then the letters. */
async function searchService(screen: Screen, text: string) {
  const input = screen.getByPlaceholderText(SERVICE_PLACEHOLDER);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Searches the service box and taps the catalogue result: the service is set at once, with no Done. */
async function chooseService(screen: Screen, search: string, result: string) {
  await searchService(screen, search);
  await fireEvent.press(await screen.findByLabelText(result));
}

/** On a saved subscription: lets go of its service and picks another from the catalogue. */
async function swapService(screen: Screen, current: string, search: string, result: string) {
  await press(screen, changeService(current));
  await chooseService(screen, search, result);
}

/** Adds a service the catalogue does not know, leaving its logo question open under the box. */
async function addService(screen: Screen, name: string) {
  await searchService(screen, name);
  await fireEvent.press(screen.getByText(`Add “${name}”`));
}

/** Opens the calendar from `row`, pages `months` (negative is back), picks the day and keeps it. */
async function pickRenewal(screen: Screen, row: string, months: number, day: string) {
  await press(screen, row);
  for (let i = 0; i < Math.abs(months); i += 1) {
    await press(screen, months < 0 ? 'Previous month' : 'Next month');
  }
  await press(screen, day);
  await press(screen, 'Done');
}

/** A subscription typed by hand: the amount, then the final page. */
async function typedSubscription(screen: Screen, amount: string) {
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
}

/** A new Netflix at the amount typed, ready to Save. */
async function netflixAt(screen: Screen, amount: string) {
  await typedSubscription(screen, amount);
  await chooseService(screen, 'Net', 'Netflix');
}

const NOTE_PLACEHOLDER = 'Which plan, for example';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockPending = false;
  mockOrder.length = 0;
  mockSavedReminder = { choice: 'off', remindAt: '09:00' };
  mockSubscription = { data: null, isError: false, isFetched: false };
  mockSources = [
    { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
    { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
  ];
  mockPast.lastChargedOn = null;
  mockPast.ready = true;
  mockPast.saving = false;
  mockPast.choose.mockResolvedValue('upcoming');
  mockPast.apply.mockImplementation(async () => void mockOrder.push('apply'));
  mockApplyReminder.mockImplementation(async () => void mockOrder.push('reminder'));
  mockKnown = [];
  mockLogoAnswer.mockImplementation((name: string) =>
    name === 'Planet Fitness' ? PLANET_FITNESS_LOGO : name === 'Linear' ? LINEAR_LOGO : null,
  );
  mockCreate.mockImplementation(async () => {
    mockOrder.push('create');
    return { id: 'sub-new' };
  });
  mockUpdate.mockImplementation(async () => void mockOrder.push('update'));
});

describe('Add subscription — what a new subscription saves', () => {
  it('saves without a renewal date, counting from nothing', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await typedSubscription(screen, '15.99');
    await chooseService(screen, 'Net', 'Netflix');
    await press(screen, 'Charged to, not set, optional');
    await press(screen, 'VISA ••4421');
    await press(screen, 'Done');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'b-nf',
      name: 'Netflix',
      amount: 15.99,
      cycle: 'monthly',
      next_renewal_on: null,
      started_on: null,
      category_id: 'entertainment',
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      active: true,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Netflix', false);
    expect(mockPast.apply).not.toHaveBeenCalled();
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', null, '09:00');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(clearVoiceDraft).not.toHaveBeenCalled();
  });

  it('counts from the renewal picked, on the cycle picked, the note trimmed, Other for no category', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await typedSubscription(screen, '1100');
    // A service the keywords cannot place files under Other rather than nowhere.
    await addService(screen, 'Zed Zed');
    await press(screen, 'Charged to, not set, optional');
    await press(screen, 'Checking ••0099');
    await press(screen, 'Done');
    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), '  Annual plan ');
    await press(screen, 'Done');
    await pickRenewal(screen, 'Next renewal, not set, optional', 0, 'Monday 12 October 2026');
    await press(screen, 'Yearly');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: null,
      name: 'Zed Zed',
      amount: 1100,
      cycle: 'yearly',
      next_renewal_on: '2026-10-12',
      started_on: '2026-10-12',
      category_id: 'other',
      card_id: null,
      bank_account_id: 'acct-1',
      note: 'Annual plan',
      active: true,
    });
  });

  it.each([
    ['1100', 1100],
    ['15.99', 15.99],
    ['0.10', 0.1],
    ['1030.5', 1030.5],
    ['2349.07', 2349.07],
    ['999999999.99', 999999999.99],
  ])('saves a typed %s as exactly %p dollars', async (typed, saved) => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, typed);
    await press(screen, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(saved);
  });

  it('saves the amount as corrected on the amount line, not as first typed', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '49.11');

    await pressButton(screen, 'Amount, $49.11');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '1100');
    await press(screen, 'Done');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(1100);
  });

  it.each([
    ['Weekly', 'weekly'],
    ['Monthly', 'monthly'],
    ['Quarterly', 'quarterly'],
    ['Yearly', 'yearly'],
  ])('saves the %s chip as the %s cycle, in one tap', async (chip, cycle) => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '9.99');

    await press(screen, 'Quarterly');
    await press(screen, chip);
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].cycle).toBe(cycle);
  });

  it('files a card under card_id and a source that is no longer there under neither', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');
    await press(screen, 'Charged to, not set, optional');
    await press(screen, 'VISA ••4421');
    await press(screen, 'Done');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      amount: 15.99,
      card_id: 'card-1',
      bank_account_id: null,
    });

    // The card is deleted while the form is open: the choice no longer names anything.
    mockCreate.mockClear();
    mockSources = mockSources.filter((source) => source.id !== 'card-1');
    await screen.rerender(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Charged to, not set, optional')).toBeTruthy();
    await press(screen, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });

  it('files a service whose category was not heard under Other, from the voice review', async () => {
    mockParams = { from: 'voice', prefillName: 'Gym membership', prefillAmount: '24.99' };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      name: 'Gym membership',
      amount: 24.99,
      category_id: 'other',
    });
  });
});

describe('Add subscription — what an edit saves', () => {
  beforeEach(() => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
  });

  it('writes the row back as it was', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    // Opens on the final page, already filled in: Save is the first thing to press.
    expect(screen.getByLabelText('Save changes')).toBeEnabled();
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'sub-1',
      values: {
        brand_id: 'b-sp',
        name: 'Spotify',
        amount: 11.99,
        cycle: 'monthly',
        next_renewal_on: '2026-10-10',
        started_on: '2026-08-10',
        category_id: 'entertainment',
        card_id: null,
        bank_account_id: 'acct-1',
        note: 'Family plan',
        active: true,
      },
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Spotify', false);
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', null, '09:00');
  });

  it('moves the start earlier when an earlier renewal is picked', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await pickRenewal(screen, 'Next renewal, Sat Oct 10', -3, 'Friday 10 July 2026');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: '2026-07-10',
      started_on: '2026-07-10',
    });
  });

  it('never moves the start later when a later renewal is picked', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await pickRenewal(screen, 'Next renewal, Sat Oct 10', 1, 'Tuesday 10 November 2026');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: '2026-11-10',
      started_on: '2026-08-10',
    });
  });

  it('counts from the day the row was made when it has no start of its own', async () => {
    mockSubscription = { data: { ...SPOTIFY, started_on: null }, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: '2026-10-10',
      started_on: '2026-08-12',
    });
  });

  it('floors the start after the last renewal already recorded', async () => {
    mockPast.lastChargedOn = '2026-09-10';
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      cycle: 'monthly',
      next_renewal_on: '2026-10-10',
      started_on: '2026-10-01',
    });
  });

  it('keeps the start it counts from when a row without a renewal date is saved', async () => {
    mockSubscription = {
      data: { ...SPOTIFY, next_renewal_on: null },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Next renewal, not set, optional')).toBeTruthy();

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: null,
      started_on: '2026-08-10',
    });
  });

  it('keeps the start it counts from when the renewal date is cleared on the page', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Next renewal, Sat Oct 10');
    await press(screen, 'No renewal date');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: null,
      started_on: '2026-08-10',
    });
  });

  it('cancels, moves the card and drops the note', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Cancelled');
    await press(screen, 'Charged to, Checking ••0099');
    await press(screen, 'VISA ••4421');
    await press(screen, 'Done');
    await press(screen, 'Note, Family plan');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), ' ');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      active: false,
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
    });
  });

  it('puts a cancelled subscription back to Active', async () => {
    mockSubscription = { data: { ...SPOTIFY, active: false }, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Active');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ active: true });
  });

  it('clears the account with "No card or account"', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Charged to, Checking ••0099');
    await press(screen, 'No card or account');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
  });

  it('saves nothing from a page that was left with Back', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await pressButton(screen, 'Amount, $11.99');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '5');
    await press(screen, 'Back');
    await press(screen, 'Note, Family plan');
    await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), 'Something else');
    await press(screen, 'Back');
    await pickRenewal(screen, 'Next renewal, Sat Oct 10', 1, 'Tuesday 10 November 2026');
    await press(screen, 'Reminder, not set, optional');
    await press(screen, '1 week');
    await press(screen, 'Back');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'Spotify',
      amount: 11.99,
      note: 'Family plan',
      next_renewal_on: '2026-11-10',
    });
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', null, '09:00');
  });

  it('rewrites past renewals with the new figures when asked to', async () => {
    mockPast.choose.mockResolvedValue('all');
    const screen = await render(<AddSubscriptionScreen />);

    await pressButton(screen, 'Amount, $11.99');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '15.99');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledWith('Spotify', true);
    expect(mockPast.apply).toHaveBeenCalledTimes(1);
    expect(mockPast.apply).toHaveBeenCalledWith({
      label: 'Spotify',
      amount: 15.99,
      card_id: null,
      bank_account_id: 'acct-1',
    });
    expect(mockUpdate.mock.calls[0][0].values.amount).toBe(15.99);
  });

  it('leaves past renewals alone when told only the upcoming ones change', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await pressButton(screen, 'Amount, $11.99');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '15.99');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledWith('Spotify', true);
    expect(mockPast.apply).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].values.amount).toBe(15.99);
  });

  // Only what a recorded renewal copies (name, amount, card or account) is a change worth asking
  // about; moving the date, the cycle, the note or the status changes nothing already recorded.
  it.each([
    ['the amount', true],
    ['the service', true],
    ['the card', true],
    ['the cycle', false],
    ['the renewal date', false],
    ['the note', false],
    ['the status', false],
  ])('asks about past renewals as changed=%s when you edit %s', async (field, changed) => {
    const screen = await render(<AddSubscriptionScreen />);

    if (field === 'the amount') {
      await pressButton(screen, 'Amount, $11.99');
      for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
      await typeAmount(screen, '12.99');
      await press(screen, 'Done');
    } else if (field === 'the service') {
      await swapService(screen, 'Spotify', 'Net', 'Netflix');
    } else if (field === 'the card') {
      await press(screen, 'Charged to, Checking ••0099');
      await press(screen, 'VISA ••4421');
      await press(screen, 'Done');
    } else if (field === 'the cycle') {
      await press(screen, 'Yearly');
    } else if (field === 'the renewal date') {
      await pickRenewal(screen, 'Next renewal, Sat Oct 10', 1, 'Tuesday 10 November 2026');
    } else if (field === 'the note') {
      await press(screen, 'Note, Family plan');
      await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), 'Duo plan');
      await press(screen, 'Done');
    } else {
      await press(screen, 'Cancelled');
    }
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledTimes(1);
    expect(mockPast.choose.mock.calls[0][1]).toBe(changed);
  });
});

describe('Add subscription — the question, the write and the reminder', () => {
  it('asks about past renewals before anything is written, and backing out writes nothing', async () => {
    mockPast.choose.mockResolvedValueOnce(null);
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');

    await press(screen, 'Save subscription');
    await waitFor(() => expect(mockPast.choose).toHaveBeenCalledTimes(1));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPast.apply).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();

    // Still there to save once the answer is given.
    await press(screen, 'Save subscription');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('writes the row first, then rewrites past renewals, then sets the reminder', async () => {
    mockPast.choose.mockResolvedValue('all');
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Reminder, not set, optional');
    await press(screen, '3 days');
    await press(screen, 'Done');
    await pressButton(screen, 'Amount, $11.99');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '12.99');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockOrder).toEqual(['update', 'apply', 'reminder']);
  });

  it('sets the reminder against the row just made, with the lead and time chosen', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');

    await press(screen, 'Reminder, not set, optional');
    await press(screen, '1 week');
    await press(screen, 'Sent at 9:00 AM. Change the time.');
    await press(screen, 'PM');
    await press(screen, 'Confirm time');
    await press(screen, 'Done');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockOrder).toEqual(['create', 'reminder']);
    expect(mockApplyReminder).toHaveBeenCalledTimes(1);
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', 7, '21:00');
  });

  it.each([
    ['On the day', 0],
    ['1 day', 1],
    ['3 days', 3],
    ['1 week', 7],
  ])('turns the %s chip into %p days ahead', async (chip, lead) => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');

    await press(screen, 'Reminder, not set, optional');
    await press(screen, chip);
    await press(screen, 'Done');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', lead, '09:00');
  });

  it('writes the reminder an edit already has back as it was', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', 3, '08:30');
  });

  it('switches an edit’s reminder off when Off is chosen', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Reminder, 3 days before · 8:30 AM');
    await press(screen, 'Off');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', null, '08:30');
  });

  it('does not write while the past charges have not been read, and says so', async () => {
    mockPast.ready = false;
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');

    await press(screen, 'Save subscription');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(mockPast.retry).toHaveBeenCalledTimes(1);
    expect(mockPast.choose).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});

describe('Add subscription — a voice hand-off', () => {
  const HEARD = {
    from: 'voice',
    prefillName: 'Netflix',
    prefillBrandId: 'b-nf',
    prefillDomain: 'netflix.com',
    prefillCategory: 'entertainment',
    prefillAmount: '15.99',
    prefillDate: '2026-10-12',
    prefillCycle: 'yearly',
    prefillSource: 'card-1',
  };

  it('saves what was heard, then goes home and forgets what was said', async () => {
    mockParams = HEARD;
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'b-nf',
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
    expect(clearVoiceDraft).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('saves the correction made on the final page along with what was heard', async () => {
    mockParams = HEARD;
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Monthly');
    await press(screen, 'Charged to, VISA ••4421');
    await press(screen, 'Checking ••0099');
    await press(screen, 'Done');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Netflix',
      amount: 15.99,
      cycle: 'monthly',
      next_renewal_on: '2026-10-12',
      card_id: null,
      bank_account_id: 'acct-1',
    });
  });

  it('carries the logo chosen on the review page into the saved row', async () => {
    mockParams = {
      ...HEARD,
      prefillName: 'Planet Fitness',
      prefillBrandId: undefined,
      prefillDomain: undefined,
      prefillCategory: 'fitness',
      prefillLogoDomain: 'planetfitness.com',
    };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByTestId('logo-32')).toHaveTextContent('Planet Fitness|planetfitness.com');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      name: 'Planet Fitness',
      logo_domain: 'planetfitness.com',
      logo_hidden: false,
    });
  });

  it('keeps a voice entry on the form when the save fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    mockParams = HEARD;
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save subscription');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(clearVoiceDraft).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('Add subscription — the checks inside Save', () => {
  it('asks for the service first, and says so on the final page', async () => {
    mockParams = { from: 'voice', prefillAmount: '15.99' };
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Save subscription')).toBeDisabled();

    await press(screen, 'Save subscription');

    expect(screen.getByText('Pick a service first.')).toBeTruthy();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPast.choose).not.toHaveBeenCalled();
  });

  it('asks for the service before the amount when both are missing', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    // The stub lets Continue through with no amount, to reach a final page with neither.
    await press(screen, 'Continue');

    await press(screen, 'Save subscription');

    expect(screen.getByText('Pick a service first.')).toBeTruthy();
    expect(screen.queryByText('Enter what it costs.')).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('asks for the amount when the service is there', async () => {
    mockParams = { from: 'voice', prefillName: 'Netflix' };
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Save subscription')).toBeDisabled();

    await press(screen, 'Save subscription');

    expect(screen.getByText('Enter what it costs.')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPast.choose).not.toHaveBeenCalled();
  });

  it('does not take a zero for an amount', async () => {
    mockParams = { from: 'voice', prefillName: 'Netflix' };
    const screen = await render(<AddSubscriptionScreen />);

    // The keypad page holds Done back at zero; the stub button lets the press through to prove
    // that Save would still refuse it.
    await press(screen, 'Amount, needed');
    expect(screen.getByLabelText('Done')).toHaveProp('accessibilityState', { disabled: true });
    await typeAmount(screen, '0');
    await press(screen, 'Done');
    await press(screen, 'Save subscription');

    expect(screen.getByText('Enter what it costs.')).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPast.choose).not.toHaveBeenCalled();
  });

  it('says the one failure line above Save when the write fails, and stays', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('network down'));
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');

    await press(screen, 'Save subscription');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(screen.getAllByText(FAILURE_MESSAGE)).toHaveLength(1);
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
    // The row never existed, so there is nothing for a reminder to point at.
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    log.mockRestore();
  });

  it('takes the failure line away again on the next try', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');
    await press(screen, 'Save subscription');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });

  it('says Saving… and holds Save while the write is in flight', async () => {
    mockParams = { from: 'voice', prefillName: 'Netflix', prefillAmount: '12' };
    mockPending = true;
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText('Saving…')).toBeDisabled();
    expect(screen.queryByLabelText('Save subscription')).toBeNull();
  });

  it('says Saving… and holds Save while past renewals are being rewritten', async () => {
    mockParams = { from: 'voice', prefillName: 'Netflix', prefillAmount: '12' };
    mockPast.saving = true;
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText('Saving…')).toBeDisabled();
    expect(screen.queryByLabelText('Save subscription')).toBeNull();
  });

  // The failure line belongs under Save. Back to the keypad, it would sit under a question it has
  // nothing to do with until the next Continue.
  it('does not carry a failed save’s line back onto the amount page', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('network down'));
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');
    await press(screen, 'Save subscription');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Back');

    expect(screen.getByText('How much does it cost?')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    log.mockRestore();
  });
});

describe('Add subscription — a line that came from Save', () => {
  // The line names what was wrong with the page as it was, so keeping something on a page that
  // Save sent a person to is what takes it away.
  it('goes once the amount is given', async () => {
    mockParams = { from: 'voice', prefillName: 'Netflix' };
    const screen = await render(<AddSubscriptionScreen />);
    await press(screen, 'Save subscription');
    expect(screen.getByText('Enter what it costs.')).toBeTruthy();

    await press(screen, 'Amount, needed');
    await typeAmount(screen, '7');
    await press(screen, 'Done');

    expect(screen.queryByText('Enter what it costs.')).toBeNull();
    expect(screen.getByLabelText('Save subscription')).toBeEnabled();
  });

  // A pick in the service box sets the service without going through a page's Done, so it has to
  // take the line away itself.
  it('goes once the service is given', async () => {
    mockParams = { from: 'voice', prefillAmount: '15.99' };
    const screen = await render(<AddSubscriptionScreen />);
    await press(screen, 'Save subscription');
    expect(screen.getByText('Pick a service first.')).toBeTruthy();

    await chooseService(screen, 'Net', 'Netflix');

    expect(screen.getByLabelText('Save subscription')).toBeEnabled();
    expect(screen.queryByText('Pick a service first.')).toBeNull();
  });

  it.each([['the amount'], ['the card'], ['the renewal'], ['the reminder'], ['the note']])(
    'goes when Done keeps something on %s',
    async (page) => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockCreate.mockRejectedValueOnce(new Error('network down'));
      const screen = await render(<AddSubscriptionScreen />);
      await netflixAt(screen, '15.99');
      await press(screen, 'Save subscription');
      await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

      const open = {
        'the amount': 'Amount, $15.99',
        'the card': 'Charged to, not set, optional',
        'the renewal': 'Next renewal, not set, optional',
        'the reminder': 'Reminder, not set, optional',
        'the note': 'Note, not set, optional',
      }[page] as string;
      if (page === 'the amount') await pressButton(screen, open);
      else await press(screen, open);
      await press(screen, 'Done');

      expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
      expect(screen.getByText('You can edit this later.')).toBeTruthy();
      log.mockRestore();
    },
  );

  it('stays when a page is left with Back, because nothing was kept', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');
    await press(screen, 'Save subscription');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    log.mockRestore();
  });

  it('goes when Continue is pressed again on the amount page it was sent back to', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');
    await press(screen, 'Save subscription');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Back');
    await press(screen, 'Continue');

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    log.mockRestore();
  });
});

describe('Add subscription — the logo', () => {
  const PLANET = {
    brandId: null,
    name: 'Planet Fitness',
    domain: null,
    categoryId: 'fitness',
  };

  /** A new subscription for a service the catalogue does not know; `answer` is what the logo card gets. */
  const saveNew = async (answer?: (screen: Screen) => Promise<unknown>) => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '24.99');
    await addService(screen, PLANET.name);
    await answer?.(screen);
    await press(screen, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    return mockCreate.mock.calls[0][0];
  };

  it('saves the logo confirmed for a service the catalogue does not know', async () => {
    const values = await saveNew(async (screen) => {
      expect(screen.getByText(/^Looks like/)).toBeTruthy();
      expect(screen.getByText('planetfitness.com')).toBeTruthy();
      await press(screen, LOGO_COPY.yes);
    });

    expect(values).toMatchObject({
      brand_id: null,
      name: 'Planet Fitness',
      amount: 24.99,
      category_id: 'fitness',
      logo_domain: 'planetfitness.com',
      logo_hidden: false,
    });
  });

  it('saves letters chosen for a new service', async () => {
    const values = await saveNew((screen) => press(screen, LOGO_COPY.letters));

    expect(values).toMatchObject({ logo_domain: null, logo_hidden: true });
  });

  it('writes no logo columns when nothing was chosen', async () => {
    const values = await saveNew();

    expect(values).toMatchObject({ brand_id: null, name: 'Planet Fitness' });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('gives a service in our own logo list its logo with no question, and saves it', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '10');
    await addService(screen, 'Linear');

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.queryByText(/^Looks like/)).toBeNull();
    expect(screen.getByLabelText(changeService('Linear'))).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Linear|linear.app');
    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      name: 'Linear',
      amount: 10,
      logo_domain: 'linear.app',
      logo_hidden: false,
    });
    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Linear', logoDomain: 'linear.app', logoHidden: false }),
      { teach: false },
    );
  });

  it('still asks when the service only half knows the name', async () => {
    mockLogoAnswer.mockImplementation(() => ({ ...LINEAR_LOGO, kind: 'fuzzy' }));
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '10');
    await addService(screen, 'Lineer');

    expect(screen.getByLabelText(LOGO_COPY.yes)).toBeTruthy();
    await press(screen, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
  });

  it('offers a service added before first, with its logo, and asks nothing about it', async () => {
    mockKnown = [
      { name: 'Linear', categoryId: 'software', logoDomain: 'old.example', logoHidden: false },
    ];
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '10');

    await searchService(screen, 'Lin');
    await fireEvent.press(screen.getByLabelText('Linear'));

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.getByLabelText(changeService('Linear'))).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Linear|old.example');
    expect(mockLogoAnswer).not.toHaveBeenCalledWith('Linear');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      name: 'Linear',
      category_id: 'software',
      logo_domain: 'old.example',
      logo_hidden: false,
    });
  });

  it('is not asked a second time: what was confirmed once is offered the next', async () => {
    const first = await render(<AddSubscriptionScreen />);
    await typedSubscription(first, '24.99');
    await addService(first, 'Planet Fitness');
    await press(first, LOGO_COPY.yes);
    await press(first, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockRemember).toHaveBeenCalledTimes(1);
    const remembered = mockRemember.mock.calls[0][0];
    await first.unmount();

    mockKnown = [remembered];
    mockCreate.mockClear();
    const second = await render(<AddSubscriptionScreen />);
    await typedSubscription(second, '19.99');
    await searchService(second, 'planet');
    await fireEvent.press(second.getByLabelText('Planet Fitness'));

    expect(second.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    await press(second, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Planet Fitness',
      amount: 19.99,
      logo_domain: 'planetfitness.com',
      logo_hidden: false,
    });
  });

  // The mark is the service box's own, so what it draws is what a person chose for this row: letters
  // here, even though the catalogue has a Spotify.
  it('an edit whose owner chose letters shows letters, and Save leaves the logo alone', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = {
      data: { ...SPOTIFY, logo_domain: null, logo_hidden: true },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByTestId('logo-32')).toHaveTextContent('Spotify|');
    expect(screen.getByTestId('logo-32')).not.toHaveTextContent('spotify.com');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_domain');
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_hidden');
  });

  it('an edit shows the logo the owner chose for its service', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = {
      data: {
        ...SPOTIFY,
        brand_id: null,
        name: 'Local Gym',
        logo_domain: 'localgym.com',
        brands: null,
      },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByTestId('logo-32')).toHaveTextContent('Local Gym|localgym.com');
  });

  it('an edit that picks another service drops the letters chosen for the old one', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = {
      data: { ...SPOTIFY, logo_domain: null, logo_hidden: true },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddSubscriptionScreen />);

    await swapService(screen, 'Spotify', 'Net', 'Netflix');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      brand_id: 'b-nf',
      name: 'Netflix',
      logo_domain: null,
      logo_hidden: false,
    });
  });
});
