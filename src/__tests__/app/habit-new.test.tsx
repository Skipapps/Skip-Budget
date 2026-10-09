import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';

import HabitNewScreen from '@/app/habit-new';
import type { HabitRow } from '@/api/habits';
import { habitIcon } from '@/data/habit-icons';
import { setCurrency } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';

/**
 * Starting a spending habit as a person walks it, and editing one. Pick → Price → Confirm, or Add
 * my own → name → icon → Price → Confirm; the final page is also the edit page. Real pages
 * throughout (tiles, keypad, chips, icon picker, swatches, Paid with pills, the preview card); only
 * the network, the drawings and the toast are replaced.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: { View }, FadeIn: { duration: () => ({}) } };
});
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/data/habit-icon-art', () => ({
  HABIT_ICON_ART: new Proxy({}, { get: () => () => null }),
}));

const mockColors = {
  ink: '#000000',
  body: '#222222',
  muted: '#777777',
  line: '#DDDDDD',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  danger: '#CC0000',
  accentInk: '#905479',
  onControl: '#FFFFFF',
  moneyIn: '#2F7A55',
};
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => mockColors,
  useTheme: () => ({ scheme: 'light', colors: mockColors }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => async () => undefined,
}));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

let mockParams: Record<string, string | undefined> = {};
const mockScreenOptions = jest.fn();
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => mockParams,
  // Run like a focused screen, so the hardware back listener is really subscribed.
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(effect, [effect]);
  },
  Stack: {
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions(options);
      return null;
    },
  },
}));

let mockPro = { pro: true, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

// The real gate, unless a test opens it to reach the Save-time backstop behind it.
let mockGateOpen = false;
jest.mock('@/components/pro/pro-gate', () => {
  const actual = jest.requireActual('@/components/pro/pro-gate');
  return {
    useProGate: (featureId: string) => (mockGateOpen ? null : actual.useProGate(featureId)),
  };
});

let mockSources = [
  { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
  { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
];
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: mockSources }) }));

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockArchive = jest.fn();
let mockHabits: HabitRow[] = [];
let mockHabit: { data: HabitRow | null | undefined; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();
jest.mock('@/api/habits', () => ({
  ...jest.requireActual('@/api/habits'),
  useHabits: () => ({ data: mockHabits }),
  useHabit: () => ({ ...mockHabit, refetch: mockRefetch }),
  useHabitTaps: () => ({ data: [] }),
  useCreateHabit: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateHabit: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useArchiveHabit: () => ({ mutateAsync: mockArchive, isPending: false }),
}));

// Only the clock is fixed: Thursday, October 8 2026, so this week began on Monday the 5th.
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
jest.setSystemTime(new Date('2026-10-08T09:00:00'));

const habitRow = (overrides: Partial<HabitRow> = {}): HabitRow => ({
  id: 'habit-1',
  name: 'Coffee',
  icon_id: 'food-dining/coffee',
  color: 'caramel',
  price: 5,
  category_id: 'dining',
  card_id: 'card-1',
  bank_account_id: null,
  preset_id: 'coffee',
  started_on: '2026-09-28',
  saved_from: '2026-09-30',
  sort_order: 0,
  archived_at: null,
  created_at: '2026-09-30T10:00:00Z',
  ...overrides,
});

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

const TILE = {
  coffee: 'Coffee, Café runs, $5.00 each time',
  breakfast: 'Breakfast out, Morning treats, $10.00 each time',
  lunch: 'Lunch out, Workday lunches, $15.00 each time',
  delivery: 'Food delivery, Takeout apps, $25.00 each time',
  snacks: 'Snacks & sweets, Treats on the go, $4.00 each time',
  rides: 'Taxi & rides, Cabs & ride apps, $15.00 each time',
  dinner: 'Dinner out, Restaurants, $40.00 each time',
  drinks: 'Drinks out, Bars & nights out, $20.00 each time',
  shopping: 'Online shopping, Impulse buys, $30.00 each time',
  soda: 'Soft drinks, Sodas & energy drinks, $3.00 each time',
};
const FIRST_SIX = [TILE.coffee, TILE.breakfast, TILE.lunch, TILE.delivery, TILE.snacks, TILE.rides];
const MORE_FOUR = [TILE.dinner, TILE.drinks, TILE.shopping, TILE.soda];

const PICK_QUESTION = 'What do you want to track?';
const PRICE_QUESTION = 'How much does it cost each time?';
const NAME_QUESTION = 'What do you want to call it?';
const ICON_QUESTION = 'Pick an icon';

const onPricePage = async (screen: Screen) =>
  expect(await screen.findByText(PRICE_QUESTION)).toBeTruthy();
const onFinalPage = (screen: Screen) => {
  expect(screen.getByRole('button', { name: /^(Start tracking|Save changes)$/ })).toBeTruthy();
};

/** Taps a tile and waits for Step 2, which opens on its own. */
async function pickTile(screen: Screen, label: string) {
  await press(screen, label);
  await onPricePage(screen);
}

/** A preset to the final page, at its own price. */
async function presetToFinal(screen: Screen, label = TILE.coffee) {
  await pickTile(screen, label);
  await pressButton(screen, 'Continue');
  onFinalPage(screen);
}

async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
}

async function clearAmount(screen: Screen, keys = 6) {
  for (let i = 0; i < keys; i += 1) await press(screen, 'Delete last digit');
}

/** The page's hardware back listener: the latest one subscribed is the page on screen. */
const hardwareBack = () => {
  const calls = (BackHandler.addEventListener as jest.Mock).mock.calls;
  const handler = calls[calls.length - 1][1] as () => boolean;
  return act(async () => handler());
};

beforeEach(() => {
  jest.clearAllMocks();
  setCurrency(null);
  mockParams = {};
  mockPro = { pro: true, ready: true };
  mockGateOpen = false;
  mockHabits = [];
  mockHabit = { data: undefined, isError: false, isFetched: false };
  mockSources = [
    { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
    { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
  ];
  mockCreate.mockResolvedValue(habitRow({ id: 'habit-new' }));
  mockUpdate.mockResolvedValue({ id: 'habit-1' });
  mockArchive.mockResolvedValue({ id: 'habit-1' });
  mockConfirm.mockResolvedValue(true);
});

afterAll(() => setCurrency(null));

describe('Who may start a habit', () => {
  const EXPLAINER = { pathname: '/pro-feature', params: { id: 'habits' } };

  it('sends a free account to the habits explainer before Pick', async () => {
    mockPro = { pro: false, ready: true };
    const screen = await render(<HabitNewScreen />);

    expect(mockRedirect).toHaveBeenCalledWith(EXPLAINER);
    expect(screen.queryByText(PICK_QUESTION)).toBeNull();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('draws nothing while Pro is unknown, rather than flash Pick or the explainer', async () => {
    mockPro = { pro: false, ready: false };
    const screen = await render(<HabitNewScreen />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.queryByText(PICK_QUESTION)).toBeNull();

    mockPro = { pro: true, ready: true };
    await screen.rerender(<HabitNewScreen />);
    expect(screen.getByText(PICK_QUESTION)).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('opens Pick for Pro', async () => {
    const screen = await render(<HabitNewScreen />);
    expect(screen.getByText(PICK_QUESTION)).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('opens the edit page for a free account: editing a habit it has is not gated', async () => {
    mockPro = { pro: false, ready: true };
    mockParams = { id: 'habit-1' };
    mockHabit = { data: habitRow(), isError: false, isFetched: true };
    const screen = await render(<HabitNewScreen />);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText('Edit habit')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete habit' })).toBeTruthy();
  });

  it('sends a plan that lapses partway through to the explainer', async () => {
    const screen = await render(<HabitNewScreen />);
    await pickTile(screen, TILE.coffee);

    mockPro = { pro: false, ready: true };
    await screen.rerender(<HabitNewScreen />);
    expect(mockRedirect).toHaveBeenCalledWith(EXPLAINER);
    expect(screen.queryByText(PRICE_QUESTION)).toBeNull();
  });
});

describe('New habit — Pick (step 1 of 3)', () => {
  it('opens on six ready-made habits as radios, More and Add my own under them, and nothing else', async () => {
    const screen = await render(<HabitNewScreen />);

    expect(screen.getByText('New habit')).toBeTruthy();
    expect(screen.getByText(PICK_QUESTION)).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    expect(screen.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel)).toEqual(
      FIRST_SIX,
    );
    for (const label of MORE_FOUR) expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add my own' })).toBeTruthy();
    // No text box to type a habit, and no line under the two buttons.
    expect(screen.queryByPlaceholderText('e.g. Bubble tea')).toBeNull();
    expect(screen.queryByText('Pick one, or add your own.')).toBeNull();
    // The tap is the answer: there is no Continue.
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('answers with one tap: the radio fills and Step 2 opens on its own, priced from the preset', async () => {
    const screen = await render(<HabitNewScreen />);

    await press(screen, TILE.coffee);
    expect(screen.getByLabelText(TILE.coffee).props.accessibilityState).toMatchObject({
      checked: true,
    });

    await onPricePage(screen);
    expect(screen.getByLabelText('Step 2 of 3')).toBeTruthy();
    expect(screen.getByText('Coffee')).toBeTruthy();
    expect(screen.getByLabelText('Amount, $5.00')).toBeTruthy();
    expect(screen.getByText('Each day you tap records this amount.')).toBeTruthy();
    const chips = screen.getAllByRole('radio');
    expect(chips.map((chip) => chip.props.accessibilityLabel)).toEqual(['$3', '$5', '$7']);
    expect(screen.getByLabelText('$5').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('reveals the other four in place with More, which then goes, and stays gone after Back', async () => {
    const screen = await render(<HabitNewScreen />);

    await pressButton(screen, 'More');

    expect(screen.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel)).toEqual([
      ...FIRST_SIX,
      ...MORE_FOUR,
    ]);
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add my own' })).toBeTruthy();

    await pickTile(screen, TILE.soda);
    expect(screen.getByLabelText('Amount, $3.00')).toBeTruthy();
    await pressButton(screen, 'Back');

    expect(screen.getByText(PICK_QUESTION)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
    expect(screen.getByLabelText(TILE.soda).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('says Already tracking on a preset an active habit has, and the tile still opens', async () => {
    mockHabits = [habitRow({ preset_id: 'coffee' })];
    const screen = await render(<HabitNewScreen />);

    const tracked = 'Coffee, Already tracking, $5.00 each time';
    expect(screen.getByLabelText(tracked)).toBeTruthy();
    expect(screen.getByText('Already tracking')).toBeTruthy();
    expect(screen.getByLabelText(TILE.breakfast)).toBeTruthy();

    await pickTile(screen, tracked);
  });

  it('gives a colour already worn way to the first free one', async () => {
    mockHabits = [
      habitRow({ id: 'a', color: 'caramel', preset_id: null }),
      habitRow({ id: 'b', color: 'coral', preset_id: null }),
    ];
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen, TILE.coffee);

    expect(screen.getByLabelText('Green').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByLabelText('Caramel').props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('starts another preset over at its own price, and keeps a changed price for the same one', async () => {
    const screen = await render(<HabitNewScreen />);
    await pickTile(screen, TILE.coffee);
    await press(screen, '$7');
    await pressButton(screen, 'Back');

    await pickTile(screen, TILE.coffee);
    expect(screen.getByLabelText('Amount, $7.00')).toBeTruthy();
    await pressButton(screen, 'Back');

    await pickTile(screen, TILE.lunch);
    expect(screen.getByLabelText('Amount, $15.00')).toBeTruthy();
  });
});

describe('New habit — Add my own', () => {
  it('goes name, then icon, then Step 2 with no price and its own chips', async () => {
    const screen = await render(<HabitNewScreen />);

    await pressButton(screen, 'Add my own');
    expect(screen.getByText(NAME_QUESTION)).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' }).props.accessibilityState).toMatchObject(
      { disabled: true },
    );

    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Bubble tea'), 'Bubble tea');
    await pressButton(screen, 'Continue');

    expect(screen.getByText(ICON_QUESTION)).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    // A tap is the answer here too.
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();

    await press(screen, 'Groceries');

    expect(screen.getByText(PRICE_QUESTION)).toBeTruthy();
    expect(screen.getByText('Bubble tea')).toBeTruthy();
    expect(screen.getByLabelText('Amount, $0.00')).toBeTruthy();
    expect(screen.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel)).toEqual([
      '$5',
      '$10',
      '$20',
    ]);
  });

  it('steps back icon → name → Pick, keeping what was typed', async () => {
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Add my own');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Bubble tea'), 'Bubble tea');
    await pressButton(screen, 'Continue');
    await press(screen, 'Groceries');

    await pressButton(screen, 'Back');
    expect(screen.getByText(ICON_QUESTION)).toBeTruthy();
    expect(screen.getByLabelText('Groceries').props.accessibilityState).toMatchObject({
      selected: true,
    });
    await pressButton(screen, 'Back');
    expect(screen.getByDisplayValue('Bubble tea')).toBeTruthy();
    await pressButton(screen, 'Back');
    expect(screen.getByText(PICK_QUESTION)).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();

    // Coming back to Add my own finds it as it was left.
    await pressButton(screen, 'Add my own');
    expect(screen.getByDisplayValue('Bubble tea')).toBeTruthy();
  });

  it('saves its own name and icon, no preset, filed under the icon’s spend category', async () => {
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Add my own');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Bubble tea'), '  Bubble tea ');
    await pressButton(screen, 'Continue');
    await press(screen, 'Groceries');
    await typeAmount(screen, '6.5');
    await pressButton(screen, 'Continue');
    await press(screen, 'Checking ••0099');
    await pressButton(screen, 'Start tracking');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Bubble tea',
      icon_id: 'food-dining/groceries',
      color: 'caramel',
      price: 6.5,
      category_id: 'groceries',
      card_id: null,
      bank_account_id: 'acct-1',
      preset_id: null,
      started_on: '2026-10-05',
      saved_from: '2026-10-08',
    });
    expect(habitIcon('food-dining/groceries')?.spendCategory).toBe('groceries');
  });
});

describe('New habit — the final page (step 3 of 3)', () => {
  it('wears the standard dots, the question, a preview card, the rows and the house line', async () => {
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);

    expect(screen.getByLabelText('Step 3 of 3')).toBeTruthy();
    expect(screen.getByText('Ready to track')).toBeTruthy();
    expect(screen.getByText('Preview')).toBeTruthy();
    // The card as the dashboard will draw it, for this habit at this price, with nothing to press.
    // Its sentence is the card's own; only what this page hands it is checked here.
    const preview = screen.getByLabelText(/^Coffee, .*\$5\.00/);
    expect(preview.props.accessibilityRole).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Habit, Coffee' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Price, $5.00 each time' })).toBeTruthy();
    expect(screen.getByText('Colour')).toBeTruthy();
    expect(
      ['Caramel', 'Coral', 'Green', 'Blue', 'Violet', 'Pink'].map(
        (name) => screen.getByRole('radio', { name }).props.accessibilityState.checked,
      ),
    ).toEqual([true, false, false, false, false, false]);
    expect(screen.getByText('Paid with')).toBeTruthy();
    for (const pill of ['VISA ••4421', 'Checking ••0099', 'Skip']) {
      expect(screen.getByRole('radio', { name: pill })).toBeTruthy();
    }
    expect(screen.getByText('Starts')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.queryByText('This week')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Starts/ })).toBeNull();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.queryByText('You can change this anytime.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete habit' })).toBeNull();
  });

  it('never greys Start tracking out: it names what is missing, and writes nothing', async () => {
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);

    const start = screen.getByRole('button', { name: 'Start tracking' });
    expect(start.props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(start);

    expect(screen.getByText('To start tracking, fill in: Paid with.')).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('counts an empty price as a gap, after a Continue that let it through', async () => {
    const screen = await render(<HabitNewScreen />);
    await pickTile(screen, TILE.coffee);
    await clearAmount(screen);
    expect(screen.getByRole('button', { name: 'Continue' }).props.accessibilityState).toMatchObject(
      { disabled: false },
    );
    await pressButton(screen, 'Continue');

    expect(screen.getByRole('button', { name: 'Price, needed' })).toBeTruthy();
    await pressButton(screen, 'Start tracking');
    expect(screen.getByText('To start tracking, fill in: Price, Paid with.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('saves exactly what the page shows, started this Monday, saved from today, and on top', async () => {
    mockHabits = [
      habitRow({ id: 'a', sort_order: 0, preset_id: null, color: 'blue' }),
      habitRow({ id: 'b', sort_order: 3, preset_id: null, color: 'pink' }),
    ];
    const screen = await render(<HabitNewScreen />);
    await pickTile(screen, TILE.rides);
    await press(screen, '$25');
    await pressButton(screen, 'Continue');
    await press(screen, 'Coral');
    await press(screen, 'VISA ••4421');
    await pressButton(screen, 'Start tracking');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Taxi & rides',
      icon_id: 'transport/taxi-rides',
      color: 'coral',
      price: 25,
      category_id: habitIcon('transport/taxi-rides')!.spendCategory,
      card_id: 'card-1',
      bank_account_id: null,
      preset_id: 'rides',
      started_on: '2026-10-05',
      saved_from: '2026-10-08',
      sort_order: -1,
    });
    expect(success).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('toast.habit.added');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('files Skip under neither card nor account', async () => {
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);
    await press(screen, 'Skip');
    await pressButton(screen, 'Start tracking');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });

  it('still opens the habits explainer, pushed, if the database refuses a free account the gate let by', async () => {
    mockGateOpen = true;
    mockPro = { pro: false, ready: true };
    mockCreate.mockRejectedValue({ message: 'Tracking spending habits is part of Skip Pro.' });
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);
    await press(screen, 'Skip');
    await pressButton(screen, 'Start tracking');

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/pro-feature',
        params: { id: 'habits' },
      }),
    );
    expect(router.back).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    onFinalPage(screen);
  });

  it('reports the same refusal as a failure when the app thinks the account has Pro', async () => {
    mockCreate.mockRejectedValue({ message: 'Tracking spending habits is part of Skip Pro.' });
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);
    await press(screen, 'Skip');
    await pressButton(screen, 'Start tracking');

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says the one failure line when the save fails, and stays', async () => {
    mockCreate.mockRejectedValue(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);
    await press(screen, 'Skip');
    await pressButton(screen, 'Start tracking');

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/network down/)).toBeNull();
    expect(mockToast).not.toHaveBeenCalled();
    onFinalPage(screen);
  });

  it('opens the Habit line on its own page: rename, change the icon, Done keeps both', async () => {
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);

    await pressButton(screen, 'Habit, Coffee');
    expect(screen.getByText(NAME_QUESTION)).toBeTruthy();
    expect(screen.queryByLabelText(/^Step \d of \d$/)).toBeNull();
    await fireEvent.changeText(screen.getByDisplayValue('Coffee'), 'Latte');
    await pressButton(screen, 'Icon, Coffee');

    expect(screen.queryByText(ICON_QUESTION)).toBeNull();
    await press(screen, 'Breakfast');
    // Back on the Habit page, with the name as it was typed.
    expect(screen.getByDisplayValue('Latte')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Icon, Breakfast' })).toBeTruthy();
    await pressButton(screen, 'Done');

    expect(screen.getByRole('button', { name: 'Habit, Latte' })).toBeTruthy();
    await press(screen, 'Skip');
    await pressButton(screen, 'Start tracking');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Latte',
      icon_id: 'food-dining/breakfast',
      category_id: habitIcon('food-dining/breakfast')!.spendCategory,
      preset_id: 'coffee',
    });
  });

  it('throws the Habit page away on Back, and waits for a name before Done', async () => {
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);
    await pressButton(screen, 'Habit, Coffee');

    await fireEvent.changeText(screen.getByDisplayValue('Coffee'), '   ');
    expect(screen.getByRole('button', { name: 'Done' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await pressButton(screen, 'Back');

    expect(screen.getByRole('button', { name: 'Habit, Coffee' })).toBeTruthy();
  });

  it('opens the Price line on Step 2’s body with Done, which waits for a price', async () => {
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);

    await pressButton(screen, 'Price, $5.00 each time');
    expect(screen.getByText(PRICE_QUESTION)).toBeTruthy();
    expect(screen.queryByLabelText(/^Step \d of \d$/)).toBeNull();
    expect(screen.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel)).toEqual([
      '$3',
      '$5',
      '$7',
    ]);
    await clearAmount(screen);
    expect(screen.getByRole('button', { name: 'Done' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await typeAmount(screen, '4.25');
    await pressButton(screen, 'Done');

    expect(screen.getByRole('button', { name: 'Price, $4.25 each time' })).toBeTruthy();
  });

  it('prices pesos ten times over: tiles, chips and the saved price', async () => {
    setCurrency('MXN');
    const screen = await render(<HabitNewScreen />);

    expect(screen.getByLabelText('Coffee, Café runs, $50.00 each time')).toBeTruthy();
    await pickTile(screen, 'Coffee, Café runs, $50.00 each time');
    expect(screen.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel)).toEqual([
      '$30',
      '$50',
      '$70',
    ]);
    await pressButton(screen, 'Continue');
    await press(screen, 'Skip');
    await pressButton(screen, 'Start tracking');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ price: 50 });
  });
});

describe('New habit — Back and the edge swipe', () => {
  it('lets the swipe leave only from Pick; every later page steps back instead', async () => {
    const screen = await render(<HabitNewScreen />);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

    await pickTile(screen, TILE.coffee);
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
    await pressButton(screen, 'Continue');
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });

    await pressButton(screen, 'Back');
    await pressButton(screen, 'Back');
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });

    // Add my own's two pages sit in step 1 too, but are not the first page.
    await pressButton(screen, 'Add my own');
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Bubble tea'), 'Tea');
    await pressButton(screen, 'Continue');
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
  });

  it('steps back final → price → Pick, then leaves; hardware back does the same', async () => {
    jest.spyOn(BackHandler, 'addEventListener');
    const screen = await render(<HabitNewScreen />);
    expect(await hardwareBack()).toBe(false);

    await presetToFinal(screen);
    expect(await hardwareBack()).toBe(true);
    expect(screen.getByText(PRICE_QUESTION)).toBeTruthy();

    await pressButton(screen, 'Back');
    expect(screen.getByText(PICK_QUESTION)).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();

    await pressButton(screen, 'Back');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('asks before Close throws the flow away', async () => {
    const screen = await render(<HabitNewScreen />);
    await presetToFinal(screen);
    mockConfirm.mockResolvedValue(false);

    await pressButton(screen, 'Close');

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cancel adding this habit?' }),
    );
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Edit habit (/habit-new?id=)', () => {
  const editing = (overrides: Partial<HabitRow> = {}) => {
    mockParams = { id: 'habit-1' };
    mockHabit = { data: habitRow(overrides), isError: false, isFetched: true };
  };

  it('opens on the final page, filled in: no dots, no question, the day it began, Save changes and Delete', async () => {
    editing();
    const screen = await render(<HabitNewScreen />);

    expect(screen.getByText('Edit habit')).toBeTruthy();
    expect(screen.queryByLabelText(/^Step \d of \d$/)).toBeNull();
    expect(screen.queryByText('Ready to track')).toBeNull();
    expect(screen.getByRole('button', { name: 'Habit, Coffee' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Price, $5.00 each time' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Caramel' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(
      screen.getByRole('radio', { name: 'VISA ••4421' }).props.accessibilityState,
    ).toMatchObject({ checked: true });
    // The day it was made (saved_from), not the Monday it is filed under (started_on).
    expect(screen.getByText('Started')).toBeTruthy();
    expect(screen.getByText('30 Sep 2026')).toBeTruthy();
    expect(screen.queryByText('28 Sep 2026')).toBeNull();
    expect(screen.queryByText(/^Week of/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete habit' })).toBeTruthy();
    expect(screen.queryByText(/^New taps use the new price/)).toBeNull();
    // The first page of this route: the swipe and Back leave.
    expect(mockScreenOptions).toHaveBeenLastCalledWith({ gestureEnabled: true });
    await pressButton(screen, 'Back');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('saves the changes, says future taps only once the price or card moves, then Habit updated', async () => {
    editing();
    const screen = await render(<HabitNewScreen />);

    await press(screen, 'Blue');
    expect(screen.queryByText(/^New taps use the new price/)).toBeNull();
    await pressButton(screen, 'Price, $5.00 each time');
    await press(screen, '$7');
    await pressButton(screen, 'Done');
    expect(
      screen.getByText('New taps use the new price and card. Past receipts keep theirs.'),
    ).toBeTruthy();
    await press(screen, 'Checking ••0099');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'habit-1',
      values: {
        name: 'Coffee',
        icon_id: 'food-dining/coffee',
        color: 'blue',
        price: 7,
        card_id: null,
        bank_account_id: 'acct-1',
      },
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith('toast.habit.updated');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('refiles under the new icon’s category only when the icon changes', async () => {
    editing();
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Habit, Coffee');
    await pressButton(screen, 'Icon, Coffee');
    await press(screen, 'Groceries');
    await pressButton(screen, 'Done');
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      icon_id: 'food-dining/groceries',
      category_id: 'groceries',
    });
  });

  it('keeps a card the plan no longer lists when Paid with is left alone', async () => {
    editing({ card_id: 'card-locked' });
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: 'card-locked',
      bank_account_id: null,
    });
  });

  it('lets a lapsed account edit: no Pro check on saving changes', async () => {
    editing();
    mockPro = { pro: false, ready: true };
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('deletes after asking: archives, says Habit deleted in red, and goes back', async () => {
    editing();
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Delete habit');

    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'Delete Coffee?',
      message: 'Its receipts stay in your spending.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    await waitFor(() => expect(mockArchive).toHaveBeenCalledWith('habit-1'));
    expect(mockToast).toHaveBeenCalledWith('toast.habit.deleted', 'deleted');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('says the one failure line, with the warning haptic, when the delete fails, and stays', async () => {
    editing();
    mockArchive.mockRejectedValue(new Error('network down'));
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Delete habit');

    expect(await screen.findByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('keeps the habit when the dialog is cancelled', async () => {
    editing();
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Delete habit');

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockArchive).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('stays on the page, not "gone", while the archived habit is on its way out', async () => {
    editing();
    const screen = await render(<HabitNewScreen />);
    await pressButton(screen, 'Delete habit');
    await waitFor(() => expect(mockArchive).toHaveBeenCalled());

    mockHabit = {
      data: habitRow({ archived_at: '2026-10-08T09:00:00Z' }),
      isError: false,
      isFetched: true,
    };
    await screen.rerender(<HabitNewScreen />);
    onFinalPage(screen);
  });

  it('never falls back to a new habit when the one to edit cannot be read', async () => {
    mockParams = { id: 'habit-1' };
    mockHabit = { data: undefined, isError: true, isFetched: true };
    const screen = await render(<HabitNewScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    await pressButton(screen, 'Try again');
    expect(mockRefetch).toHaveBeenCalled();
    expect(screen.queryByText(PICK_QUESTION)).toBeNull();
  });

  it('shows no figures while it loads, and the failure for one that is gone or archived', async () => {
    mockParams = { id: 'habit-1' };
    mockHabit = { data: undefined, isError: false, isFetched: false };
    const screen = await render(<HabitNewScreen />);
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByText(PICK_QUESTION)).toBeNull();

    mockHabit = { data: null, isError: false, isFetched: true };
    await screen.rerender(<HabitNewScreen />);
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();

    mockHabit = {
      data: habitRow({ archived_at: '2026-10-07T09:00:00Z' }),
      isError: false,
      isFetched: true,
    };
    await screen.rerender(<HabitNewScreen />);
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });
});
