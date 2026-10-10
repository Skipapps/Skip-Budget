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
 * what Save refuses and says while the page has gaps, `started_on` through countFromAfterPick and
 * floorAfterCharges, the order of the past-charges question, the write and the reminder, and where
 * each kind of save goes afterwards.
 *
 * The pages are the real ones, walked the way a person walks them (keypad, service box, day box,
 * source pills, reminder chips, note); only the network and the logo images are replaced.
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
    card: '#FFFFFF',
    accent: '#905479',
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

// The day box, as a screen reader reads it: empty, or showing the day picked.
const NEXT_RENEWAL = 'Next renewal, Select a date';
const renewalOn = (shown: string) => `Next renewal, ${shown}`;

/**
 * Opens a day box, pages `months` on from where its calendar opens (negative is back) and picks the
 * day. The calendar folds away on its own: there is no Done.
 */
async function pickDay(screen: Screen, box: string, months: number, day: string) {
  await press(screen, box);
  for (let i = 0; i < Math.abs(months); i += 1) {
    await press(screen, months < 0 ? 'Previous month' : 'Next month');
  }
  await press(screen, day);
}

/** A subscription typed by hand: the amount, then the final page. */
async function typedSubscription(screen: Screen, amount: string) {
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
}

type Answers = {
  day?: string | null;
  source?: string | null;
  reminder?: string | null;
};

/**
 * Answers what a new subscription still asks once it has an amount and a service: the renewal day,
 * how it is charged and whether to remind. A test passes only what it is about; null leaves a
 * question open on purpose.
 */
async function fillIn(screen: Screen, answers: Answers = {}) {
  const { day, source, reminder } = {
    day: 'Thursday 15 October 2026',
    source: 'Skip',
    reminder: 'No reminder',
    ...answers,
  };
  if (day !== null) await pickDay(screen, NEXT_RENEWAL, 0, day);
  if (source !== null) await press(screen, source);
  if (reminder !== null) await press(screen, reminder);
}

/** A new Netflix at the amount typed, with the service picked and every other question open. */
async function netflixAt(screen: Screen, amount: string) {
  await typedSubscription(screen, amount);
  await chooseService(screen, 'Net', 'Netflix');
}

/** A new Netflix at the amount typed, answered all the way through, ready to Save. */
async function readyNetflix(screen: Screen, amount: string, answers: Answers = {}) {
  await netflixAt(screen, amount);
  await fillIn(screen, answers);
}

const MISSING = (fields: string) => `To save this subscription, fill in: ${fields}.`;
const ANY_MISSING = /^To save this subscription, fill in:/;

/** Save was refused: the question, the write, the rewrite and the reminder were all left alone. */
function expectNothingWritten() {
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(mockPast.choose).not.toHaveBeenCalled();
  expect(mockPast.apply).not.toHaveBeenCalled();
  expect(mockApplyReminder).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();
  expect(router.dismissTo).not.toHaveBeenCalled();
}

const NOTE_PLACEHOLDER = 'Which plan, for example';

/** Opens the note page on a row with no note, types one and keeps it. */
async function keepNote(screen: Screen, label: string, text: string) {
  await press(screen, label);
  await fireEvent.changeText(screen.getByPlaceholderText(NOTE_PLACEHOLDER), text);
  await press(screen, 'Done');
}

const REMINDER_CHIPS = ['No reminder', 'On the day', '1 day', '3 days', '1 week'];

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
  it('saves what was filled in, counting from the renewal day picked', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await typedSubscription(screen, '15.99');
    await chooseService(screen, 'Net', 'Netflix');
    await pickDay(screen, NEXT_RENEWAL, 0, 'Thursday 15 October 2026');
    expect(screen.getByLabelText(renewalOn('Thu Oct 15'))).toBeTruthy();
    await press(screen, 'VISA ••4421');
    await press(screen, 'No reminder');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'b-nf',
      name: 'Netflix',
      amount: 15.99,
      cycle: 'monthly',
      next_renewal_on: '2026-10-15',
      started_on: '2026-10-15',
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
    await fillIn(screen, { day: 'Monday 12 October 2026', source: 'Checking ••0099' });
    await keepNote(screen, 'Note, not set, optional', '  Annual plan ');
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

  it('counts from a renewal day already past, which the past-charges question is for', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');

    await fillIn(screen, { day: null });
    await pickDay(screen, NEXT_RENEWAL, -1, 'Tuesday 15 September 2026');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      next_renewal_on: '2026-09-15',
      started_on: '2026-09-15',
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Netflix', false);
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
    await readyNetflix(screen, typed);
    await press(screen, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(saved);
  });

  it('saves the amount as corrected on the amount line, not as first typed', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '49.11');

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
    await readyNetflix(screen, '9.99');

    await press(screen, 'Quarterly');
    await press(screen, chip);
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].cycle).toBe(cycle);
  });

  it('files a service whose category was not heard under Other, from the voice review', async () => {
    mockParams = { from: 'voice', prefillName: 'Gym membership', prefillAmount: '24.99' };
    const screen = await render(<AddSubscriptionScreen />);

    await fillIn(screen);
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

describe('Add subscription — what Charged to saves', () => {
  it.each([
    ['a card', 'VISA ••4421', { card_id: 'card-1', bank_account_id: null }],
    ['an account', 'Checking ••0099', { card_id: null, bank_account_id: 'acct-1' }],
    ['Skip', 'Skip', { card_id: null, bank_account_id: null }],
  ])('files %s under its own column and the other under none', async (_name, pill, columns) => {
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '15.99', { source: pill });

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ amount: 15.99, ...columns });
  });

  it('keeps only the last pill pressed, never a card and an account together', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '15.99', { source: 'VISA ••4421' });

    await press(screen, 'Checking ••0099');
    expect(screen.getByLabelText('Checking ••0099')).toBeSelected();
    expect(screen.getByLabelText('VISA ••4421')).not.toBeSelected();
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      card_id: null,
      bank_account_id: 'acct-1',
    });
  });

  it('files a card deleted while the form is open under neither, and does not hold Save back', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '15.99', { source: 'VISA ••4421' });

    mockSources = mockSources.filter((source) => source.id !== 'card-1');
    await screen.rerender(<AddSubscriptionScreen />);
    expect(screen.queryByLabelText('VISA ••4421')).toBeNull();
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });

  it('offers Skip alone when there is no card or account, and it answers the question', async () => {
    mockSources = [];
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');

    expect(screen.queryByLabelText('VISA ••4421')).toBeNull();
    await fillIn(screen);
    expect(screen.getByLabelText('Skip')).toBeSelected();
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });
});

describe('Add subscription — the service box', () => {
  it('saves a catalogue service with its brand, its category and the name picked, not the letters typed', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '15.99');

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const values = mockCreate.mock.calls[0][0];
    expect(values).toMatchObject({
      brand_id: 'b-nf',
      name: 'Netflix',
      category_id: 'entertainment',
    });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('saves a service typed but not picked under its own name, with no brand and a guessed category', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '12.5');

    await searchService(screen, 'Gym Pass');
    await fillIn(screen);
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const values = mockCreate.mock.calls[0][0];
    expect(values).toMatchObject({
      brand_id: null,
      name: 'Gym Pass',
      amount: 12.5,
      category_id: 'fitness',
    });
    expect(values).not.toHaveProperty('logo_domain');
    expect(values).not.toHaveProperty('logo_hidden');
  });

  it('trims what was typed, and files it under Other when no keyword fits', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '8');

    await searchService(screen, '  Zed Zed ');
    await fillIn(screen);
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      brand_id: null,
      name: 'Zed Zed',
      category_id: 'other',
    });
  });
});

describe('Add subscription — what an edit saves', () => {
  beforeEach(() => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
  });

  it('writes the row back as it was: its account, its reminder and no logo columns', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    // Opens on the final page, already answered: Save is the first thing to press.
    expect(screen.getByLabelText('Save changes')).toBeEnabled();
    expect(screen.getByLabelText(renewalOn('Sat Oct 10'))).toBeTruthy();
    expect(screen.getByLabelText('Checking ••0099')).toBeSelected();
    expect(screen.getByLabelText('No reminder')).toBeSelected();
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
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_domain');
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_hidden');
    expect(mockPast.choose).toHaveBeenCalledWith('Spotify', false);
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', null, '09:00');
  });

  it('keeps a card as its card', async () => {
    mockSubscription = {
      data: { ...SPOTIFY, card_id: 'card-1', bank_account_id: null },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText('VISA ••4421')).toBeSelected();
    expect(screen.getByLabelText('Skip')).not.toBeSelected();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: 'card-1',
      bank_account_id: null,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Spotify', false);
  });

  it('shows a row with no card or account on Skip and saves it that way', async () => {
    mockSubscription = {
      data: { ...SPOTIFY, bank_account_id: null },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText('Skip')).toBeSelected();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Spotify', false);
  });

  it('moves the start earlier when an earlier renewal is picked', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await pickDay(screen, renewalOn('Sat Oct 10'), -3, 'Friday 10 July 2026');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: '2026-07-10',
      started_on: '2026-07-10',
    });
  });

  it('never moves the start later when a later renewal is picked', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await pickDay(screen, renewalOn('Sat Oct 10'), 1, 'Tuesday 10 November 2026');
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

  it('asks a row with no renewal date for one, then keeps the start it counts from', async () => {
    mockSubscription = {
      data: { ...SPOTIFY, next_renewal_on: null },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText(NEXT_RENEWAL)).toBeTruthy();

    await press(screen, 'Save changes');
    expect(screen.getByText(MISSING('Next renewal'))).toBeTruthy();
    expectNothingWritten();

    await pickDay(screen, NEXT_RENEWAL, 0, 'Saturday 10 October 2026');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: '2026-10-10',
      started_on: '2026-08-10',
    });
  });

  it('cancels, moves the card and drops the note', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Cancelled');
    await press(screen, 'VISA ••4421');
    await keepNote(screen, 'Note, Family plan', ' ');
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

  it('takes the account off with Skip', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Skip');
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
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'Spotify',
      amount: 11.99,
      note: 'Family plan',
      next_renewal_on: '2026-10-10',
    });
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
  // about; moving the date, the cycle, the reminder, the note or the status changes nothing
  // already recorded.
  it.each([
    ['the amount', true],
    ['the service', true],
    ['the card', true],
    ['Skip instead of the account', true],
    ['the cycle', false],
    ['the renewal date', false],
    ['the reminder', false],
    ['the note', false],
    ['the status', false],
  ])('editing %s asks about past renewals as changed=%s', async (field, changed) => {
    const screen = await render(<AddSubscriptionScreen />);

    if (field === 'the amount') {
      await pressButton(screen, 'Amount, $11.99');
      for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
      await typeAmount(screen, '12.99');
      await press(screen, 'Done');
    } else if (field === 'the service') {
      await swapService(screen, 'Spotify', 'Net', 'Netflix');
    } else if (field === 'the card') {
      await press(screen, 'VISA ••4421');
    } else if (field === 'Skip instead of the account') {
      await press(screen, 'Skip');
    } else if (field === 'the cycle') {
      await press(screen, 'Yearly');
    } else if (field === 'the renewal date') {
      await pickDay(screen, renewalOn('Sat Oct 10'), 1, 'Tuesday 10 November 2026');
    } else if (field === 'the reminder') {
      await press(screen, '3 days');
    } else if (field === 'the note') {
      await keepNote(screen, 'Note, Family plan', 'Duo plan');
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
    await readyNetflix(screen, '15.99');

    await press(screen, 'Save subscription');
    await waitFor(() => expect(mockPast.choose).toHaveBeenCalledTimes(1));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPast.apply).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.queryByText(ANY_MISSING)).toBeNull();

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

    await press(screen, '3 days');
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

    await fillIn(screen, { reminder: '1 week' });
    await press(screen, 'Sent at 9:00 AM. Change the time.');
    await press(screen, 'PM');
    await press(screen, 'Confirm time');
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
    await readyNetflix(screen, '15.99', { reminder: chip });

    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', lead, '09:00');
  });

  it('turns No reminder into no lead at all, with no time to send it at', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');

    await fillIn(screen, { reminder: '3 days' });
    expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
    await press(screen, 'No reminder');
    expect(screen.getByLabelText('No reminder')).toBeSelected();
    expect(screen.queryByLabelText('Sent at 9:00 AM. Change the time.')).toBeNull();
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', null, '09:00');
  });

  it('writes the reminder an edit already has back as it was', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText('3 days')).toBeSelected();
    expect(screen.getByLabelText('Sent at 8:30 AM. Change the time.')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', 3, '08:30');
  });

  it('changes the lead of an edit’s reminder and keeps the time it had', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, '1 week');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', 7, '08:30');
  });

  it('switches an edit’s reminder off when No reminder is chosen', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'No reminder');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', null, '08:30');
  });

  it('does not write while the past charges have not been read, and says so', async () => {
    mockPast.ready = false;
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '15.99');

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

    // Nobody says whether to remind; it is the one answer a hand-off leaves to the person.
    await press(screen, 'No reminder');
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

  it('opens with the card and the day it heard lit, and the reminder left to answer', async () => {
    mockParams = HEARD;
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText('VISA ••4421')).toBeSelected();
    expect(screen.getByLabelText(renewalOn('Mon Oct 12'))).toBeTruthy();
    for (const chip of REMINDER_CHIPS) expect(screen.getByLabelText(chip)).not.toBeSelected();

    await press(screen, 'Save subscription');

    expect(screen.getByText(MISSING('Reminder'))).toBeTruthy();
    expectNothingWritten();
    expect(clearVoiceDraft).not.toHaveBeenCalled();
  });

  it('asks for the day and the payment too when neither was heard', async () => {
    mockParams = { from: 'voice', prefillName: 'Netflix', prefillAmount: '15.99' };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByLabelText(NEXT_RENEWAL)).toBeTruthy();
    expect(screen.getByLabelText('Skip')).not.toBeSelected();
    await press(screen, 'Save subscription');

    expect(screen.getByText(MISSING('Next renewal, Charged to, Reminder'))).toBeTruthy();
    expectNothingWritten();
    expect(clearVoiceDraft).not.toHaveBeenCalled();
  });

  it('saves the correction made on the final page along with what was heard', async () => {
    mockParams = HEARD;
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Monthly');
    await press(screen, 'Checking ••0099');
    await press(screen, 'No reminder');
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
    await press(screen, 'No reminder');
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

    await press(screen, 'No reminder');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(clearVoiceDraft).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('Add subscription — Save with gaps', () => {
  it('says what is still open, writes nothing, and stays on the page with Save ready', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '15.99');

    await press(screen, 'Save subscription');

    expect(screen.getByText(MISSING('Service, Next renewal, Charged to, Reminder'))).toBeTruthy();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.getByPlaceholderText(SERVICE_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByLabelText('Save subscription')).toBeEnabled();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expectNothingWritten();
  });

  it('lists every field, in the order of the page, when nothing is filled in', async () => {
    mockParams = { from: 'voice' };
    const screen = await render(<AddSubscriptionScreen />);
    expect(screen.getByLabelText('Save subscription')).toBeEnabled();

    await press(screen, 'Save subscription');

    expect(
      screen.getByText(MISSING('Amount, Service, Next renewal, Charged to, Reminder')),
    ).toBeTruthy();
    expectNothingWritten();
  });

  it('lists the amount alone when it is all that is left', async () => {
    mockParams = {
      from: 'voice',
      prefillName: 'Netflix',
      prefillDate: '2026-10-12',
      prefillSource: 'card-1',
    };
    const screen = await render(<AddSubscriptionScreen />);
    await press(screen, 'No reminder');

    await press(screen, 'Save subscription');

    expect(screen.getByText(MISSING('Amount'))).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expectNothingWritten();
  });

  it('does not take the zero a row was stored with for an amount', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: { ...SPOTIFY, amount: 0 }, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Save changes');

    expect(screen.getByText(MISSING('Amount'))).toBeTruthy();
    expect(screen.getByLabelText('Amount, needed')).toBeTruthy();
    expectNothingWritten();
  });

  it('does not let a typed zero be kept on the amount page', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await pressButton(screen, 'Amount, $11.99');
    for (let i = 0; i < 5; i += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '0');

    expect(screen.getByLabelText('Done')).toBeDisabled();
  });

  it('lists the renewal day alone when it is all that is left: a day is needed to save', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await netflixAt(screen, '15.99');
    await fillIn(screen, { day: null });

    await press(screen, 'Save subscription');

    expect(screen.getByText(MISSING('Next renewal'))).toBeTruthy();
    expectNothingWritten();
  });

  it('counts a service typed but not picked as given', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '15.99');
    await searchService(screen, 'Gym Pass');
    await fillIn(screen, { day: null });

    await press(screen, 'Save subscription');

    expect(screen.getByText(MISSING('Next renewal'))).toBeTruthy();
    expectNothingWritten();
  });

  it.each([
    ['typed and then emptied again', ''],
    ['only spaces', '   '],
  ])('does not count a service %s', async (_name, text) => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '15.99');
    await fillIn(screen);
    await searchService(screen, 'Gym');
    await fireEvent.changeText(screen.getByPlaceholderText(SERVICE_PLACEHOLDER), text);

    await press(screen, 'Save subscription');

    expect(screen.getByText(MISSING('Service'))).toBeTruthy();
    expectNothingWritten();
  });

  it('lists the service again once the one picked is let go of', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '15.99');

    await press(screen, changeService('Netflix'));
    await press(screen, 'Save subscription');

    expect(screen.getByText(MISSING('Service'))).toBeTruthy();
    expectNothingWritten();
  });

  it('holds back an edit whose service was let go of, and never lists what it has answered', async () => {
    mockParams = { id: 'sub-1' };
    mockSubscription = { data: SPOTIFY, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, changeService('Spotify'));
    await press(screen, 'Save changes');

    expect(screen.getByText(MISSING('Service'))).toBeTruthy();
    expectNothingWritten();
  });

  it('drops each field from the line as it is answered, and writes once none is left', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '15.99');

    await press(screen, 'Save subscription');
    expect(screen.getByText(MISSING('Service, Next renewal, Charged to, Reminder'))).toBeTruthy();

    await chooseService(screen, 'Net', 'Netflix');
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
    await press(screen, 'Save subscription');
    expect(screen.getByText(MISSING('Next renewal, Charged to, Reminder'))).toBeTruthy();

    await pickDay(screen, NEXT_RENEWAL, 0, 'Thursday 15 October 2026');
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
    await press(screen, 'Save subscription');
    expect(screen.getByText(MISSING('Charged to, Reminder'))).toBeTruthy();

    await press(screen, 'Skip');
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
    await press(screen, 'Save subscription');
    expect(screen.getByText(MISSING('Reminder'))).toBeTruthy();
    expectNothingWritten();

    await press(screen, 'No reminder');
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Netflix',
      amount: 15.99,
      next_renewal_on: '2026-10-15',
      card_id: null,
      bank_account_id: null,
    });
  });
});

describe('Add subscription — a failed or held save', () => {
  it('says the one failure line above Save when the write fails, and stays', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error('network down'));
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '15.99');

    await press(screen, 'Save subscription');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(screen.getAllByText(FAILURE_MESSAGE)).toHaveLength(1);
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
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
    await readyNetflix(screen, '15.99');
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
    await readyNetflix(screen, '15.99');
    await press(screen, 'Save subscription');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'Back');

    expect(screen.getByText('How much does it cost?')).toBeTruthy();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    log.mockRestore();
  });

  it('does not carry the line about gaps back onto the amount page either', async () => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '15.99');
    await press(screen, 'Save subscription');
    expect(screen.getByText(ANY_MISSING)).toBeTruthy();

    await press(screen, 'Back');

    expect(screen.getByText('How much does it cost?')).toBeTruthy();
    expect(screen.queryByText(ANY_MISSING)).toBeNull();
  });
});

describe('Add subscription — a line that came from Save', () => {
  // The line names what was wrong with the page as it was, so a change made on the page itself is
  // what takes it away. A pick in a box has no Done to do it, so each control clears it itself.
  it.each<[string, (screen: Screen) => Promise<unknown>]>([
    ['a service is picked', (screen) => chooseService(screen, 'Net', 'Netflix')],
    ['something is typed in the service box', (screen) => searchService(screen, 'Gym')],
    [
      'a renewal day is picked',
      (screen) => pickDay(screen, NEXT_RENEWAL, 0, 'Thursday 15 October 2026'),
    ],
    ['a card is picked', (screen) => press(screen, 'VISA ••4421')],
    ['Skip is picked', (screen) => press(screen, 'Skip')],
    ['a reminder is picked', (screen) => press(screen, '3 days')],
    ['the cycle is changed', (screen) => press(screen, 'Yearly')],
    [
      'the amount is kept on its page',
      async (screen) => {
        await pressButton(screen, 'Amount, $15.99');
        await press(screen, 'Done');
      },
    ],
    ['a note is kept on its page', (screen) => keepNote(screen, 'Note, not set, optional', 'Duo')],
  ])('the line about gaps goes when %s', async (_name, change) => {
    const screen = await render(<AddSubscriptionScreen />);
    await typedSubscription(screen, '15.99');
    await press(screen, 'Save subscription');
    expect(screen.getByText(ANY_MISSING)).toBeTruthy();

    await change(screen);

    expect(screen.queryByText(ANY_MISSING)).toBeNull();
  });

  const failedSave = async () => {
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddSubscriptionScreen />);
    await readyNetflix(screen, '15.99', { reminder: '1 week' });
    await press(screen, 'Save subscription');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    return screen;
  };

  it.each<[string, (screen: Screen) => Promise<unknown>]>([
    ['the service is let go of', (screen) => press(screen, changeService('Netflix'))],
    [
      'the renewal day is changed',
      (screen) => pickDay(screen, renewalOn('Thu Oct 15'), 0, 'Friday 16 October 2026'),
    ],
    ['a card is picked', (screen) => press(screen, 'VISA ••4421')],
    ['Skip is picked', (screen) => press(screen, 'Skip')],
    ['a reminder is picked', (screen) => press(screen, '3 days')],
    ['the cycle is changed', (screen) => press(screen, 'Yearly')],
    [
      'the amount is kept on its page',
      async (screen) => {
        await pressButton(screen, 'Amount, $15.99');
        await press(screen, 'Done');
      },
    ],
    ['a note is kept on its page', (screen) => keepNote(screen, 'Note, not set, optional', 'Duo')],
  ])('the failure line goes when %s', async (_name, change) => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const screen = await failedSave();

    await change(screen);

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    log.mockRestore();
  });

  // The time sits in the reminder's own field beside the chips, so by the same rule it clears the
  // line; today it leaves it standing.
  it('the failure line goes when the reminder time is changed', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const screen = await failedSave();

    await press(screen, 'Sent at 9:00 AM. Change the time.');
    await press(screen, 'PM');
    await press(screen, 'Confirm time');

    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    log.mockRestore();
  });

  it('stays when a page is left with Back, because nothing was kept', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const screen = await failedSave();

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    log.mockRestore();
  });

  it('goes when Continue is pressed again on the amount page it was sent back to', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const screen = await failedSave();

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
    await fillIn(screen);
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
    await fillIn(screen);
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
    await fillIn(screen);
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
    await fillIn(screen);
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
    await fillIn(first);
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
    await fillIn(second);
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
