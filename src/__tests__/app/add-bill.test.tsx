import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';

import AddBillScreen from '@/app/add-bill';
import { LOGO_COPY } from '@/components/brands/logo-choices';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { success, warn } from '@/lib/haptics';

/**
 * The bill form as a person walks it. A blank bill opens on the category chooser, then the keypad,
 * then the one final page. The name, payment day, card and reminder are answered on that page
 * itself; the amount, category and note open a page for that one thing and come back, Done to keep
 * what was set and Back to leave it as it was. A saved bill, or what the voice review heard, opens
 * straight on the final page. Real pages throughout (grid, keypad, calendar, name search, card
 * pills, reminder chips) and the real Save button; only the network, the calculator pad and the
 * logo images are replaced.
 *
 * Also: the bill's form only exists when the record does: `id` turns Save into an update, so a
 * failed read must not open a blank "edit" over a real bill.
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

// The pad's own sums are tested with the pad; here it only has to hand its result back.
jest.mock('@/components/ui/calculator-pad', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    CalculatorPad: ({
      value,
      onCancel,
      onConfirm,
    }: {
      value: string;
      onCancel: () => void;
      onConfirm: (next: string) => void;
    }) => (
      <View>
        <Text>{`Pad opened on ${value || 'nothing'}`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Pad cancel" onPress={onCancel} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pad result"
          onPress={() => onConfirm('1234.56')}
        />
      </View>
    ),
  };
});

// The logo a mark drew, readable as text: "Power|x.com", or "Power|" for the category's icon.
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

const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
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

jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    choose: async () => 'upcoming',
    apply: jest.fn(),
    lastChargedOn: null,
    ready: true,
    retry: jest.fn(),
    saving: false,
  }),
}));

// The real choices and lead conversion; only the table reads and writes are replaced.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
const mockApplyReminder = jest.fn();
let mockSavedReminder: { choice: string; remindAt: string };
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
  useReminderChoice: () => mockSavedReminder,
}));

/*
 * Mutations are spied on as hooks: the form runs `useUpdateBill()` at mount, so a hook never called
 * proves the form was never on screen, which is stronger than "nobody pressed Save".
 */
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockUseUpdateBill = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
let mockCreating = false;
const mockUseCreateBill = jest.fn(() => ({ mutateAsync: mockCreate, isPending: mockCreating }));
let mockDeleting = false;
const mockUseDeleteBill = jest.fn(() => ({ mutateAsync: mockDelete, isPending: mockDeleting }));

jest.mock('@/api/mutations', () => ({
  useUpdateBill: () => mockUseUpdateBill(),
  useCreateBill: () => mockUseCreateBill(),
  useDeleteBill: () => mockUseDeleteBill(),
}));

const BRANDS = [
  { id: 'b-cc', name: 'Comcast', domain: 'comcast.com', category_id: 'utilities' },
  { id: 'b-gs', name: 'Greystar', domain: 'greystar.com', category_id: 'housing' },
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
}));
jest.mock('@/api/logos', () => ({
  useLogoMatch: () => ({ data: null, isLoading: false, isFetching: false }),
}));

const SOURCES = [
  { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
  { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
];
let mockSources: typeof SOURCES = SOURCES;
let mockBill: { data: unknown; isError: boolean; isFetched: boolean };
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useBill: () => ({ ...mockBill, refetch: mockRefetch }),
  useLoanForBill: () => ({ data: null }),
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

const POWER = {
  id: 'bill-1',
  name: 'Power',
  amount: 84.2,
  category_id: 'energy',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-09-20',
  starts_on: null,
  ends_on: null,
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  brand_id: null,
  brands: null,
};

const PERIOD = {
  ...POWER,
  recurrence: 'period',
  starts_on: '2026-06-01',
  next_due_on: '2026-10-01',
  ends_on: '2026-12-31',
};

const TILE = {
  housing: 'Housing. Rent, mortgage, HOA fees',
  energy: 'Electricity & Gas. Power, heating, cooking gas',
  water: 'Water & Waste. Water, sewer, garbage',
  internet: 'Internet. Home broadband and Wi-Fi',
  mobile: 'Mobile Phone. Phone plans, device payments',
  insurance: 'Insurance. Car, health, home, life',
  loans: 'Loans & Credit. Cards, student, auto, personal',
  transport: 'Transportation. Car, transit, parking, tolls',
  family: 'Family & Healthcare. Childcare, tuition, medical',
  other: 'Other bill. Anything else you pay',
};

/** What the Name box suggests for each category. */
const HINT: Record<keyof typeof TILE, string> = {
  housing: 'Rent, mortgage or your landlord',
  energy: 'AEP, Duke Energy, National Grid',
  water: 'Your water company',
  internet: 'Xfinity, Spectrum, Verizon',
  mobile: 'T-Mobile, AT&T, Verizon',
  insurance: 'Geico, State Farm, Progressive',
  loans: 'Chase, Discover, SoFi',
  transport: 'Transit, tolls or parking',
  family: 'Nursery, school or clinic',
  other: 'Search or type a name',
};

const RECURRING = ['Weekly', 'Monthly', 'Every 3 months', 'Yearly', 'Specific period'];
const PAID_WITH = ['VISA ••4421', 'Checking ••0099', 'Skip'];
const REMINDERS = ['No reminder', 'On the day', '1 day', '3 days', '1 week'];

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

/** The amount is a button on the page and a figure inside it, both worded alike: by role, the button. */
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
}

const isChecked = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.checked);

/** Which of a group's chips are lit. Throws on a chip that is not on the page. */
const lit = (screen: Screen, labels: string[]) =>
  labels.filter((label) => isChecked(screen, label));

/** Types into the Name box the way a finger does: a tap into it, then the letters. */
async function typeName(screen: Screen, placeholder: string, text: string) {
  const input = screen.getByPlaceholderText(placeholder);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Picks a name the catalogue knows from the matches listed under the box. */
async function pickName(screen: Screen, placeholder: string, text: string) {
  await typeName(screen, placeholder, text);
  await fireEvent.press(await screen.findByLabelText(text));
}

/** Opens a date box and picks a day from the calendar that unfolds under it. */
async function pickDay(screen: Screen, box: string, day: string) {
  await press(screen, box);
  await press(screen, day);
}

/** Every string drawn on the page, top to bottom. */
function textsInOrder(screen: Screen): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') walk((node as { children?: unknown }).children);
  };
  walk(screen.toJSON());
  return out;
}

const onCategoryPage = (screen: Screen) => {
  expect(screen.getByText('What is this bill for?')).toBeTruthy();
  expect(screen.queryByText('How much is the bill?')).toBeNull();
  expect(screen.queryByText('You can edit this later.')).toBeNull();
};
const onAmountPage = (screen: Screen) => {
  expect(screen.getByText('How much is the bill?')).toBeTruthy();
  expect(screen.queryByText('What is this bill for?')).toBeNull();
  expect(screen.queryByText('You can edit this later.')).toBeNull();
};
const onFinalPage = (screen: Screen) => {
  expect(screen.getByText('You can edit this later.')).toBeTruthy();
  expect(screen.queryByText('How much is the bill?')).toBeNull();
  expect(screen.queryByText('What is this bill for?')).toBeNull();
};

/** A blank bill as far as its final page: pick the category, type the amount, Continue. */
async function newBill(screen: Screen, tile: string, amount: string) {
  await press(screen, tile);
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
}

/** What is still asked of a new bill on its final page: a name, a day, a payer and a reminder. */
async function answerTheRest(screen: Screen, placeholder: string, name = 'Gym') {
  await typeName(screen, placeholder, name);
  await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');
  await press(screen, 'VISA ••4421');
  await press(screen, 'No reminder');
}

/** The line Save puts above its button when answers are missing. */
const gaps = (fields: string) => `To save this bill, fill in: ${fields}.`;

/** Hardware back as the system plays it: newest listener first, until one takes it. */
type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
const backHandlers = new Set<BackListener>();
async function hardwareBack(): Promise<boolean> {
  let handled = false;
  await act(async () => {
    for (const handler of [...backHandlers].reverse()) {
      if (handler({ type: 'hardwareBackPress', timeStamp: 0 })) {
        handled = true;
        break;
      }
    }
  });
  return handled;
}

const lastScreenOptions = () => mockScreenOptions.mock.calls.at(-1)?.[0];

const editing = (bill: Record<string, unknown>) => {
  mockParams = { id: String(bill.id) };
  mockBill = { data: bill, isError: false, isFetched: true };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSources = SOURCES;
  mockCreating = false;
  mockDeleting = false;
  mockSavedReminder = { choice: 'off', remindAt: '09:00' };
  mockBill = { data: null, isError: false, isFetched: false };
  mockConfirm.mockResolvedValue(true);
  mockCreate.mockResolvedValue({ id: 'bill-new' });
  mockDelete.mockResolvedValue(undefined);
  backHandlers.clear();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.add(handler);
    return { remove: () => void backHandlers.delete(handler) };
  });
});

afterAll(() => jest.restoreAllMocks());

describe('Add bill — an edit whose bill could not be read', () => {
  beforeEach(() => {
    mockParams = { id: 'bill-1' };
  });

  it('says so instead of opening a blank form over the real bill', async () => {
    mockBill = { data: null, isError: true, isFetched: true };
    const { getByText, queryByText } = await render(<AddBillScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();

    expect(queryByText('Edit bill')).toBeNull();
    expect(queryByText('Add a bill')).toBeNull();
    expect(queryByText('Continue')).toBeNull();
    expect(queryByText('Save changes')).toBeNull();
    expect(queryByText('Save bill')).toBeNull();

    expect(mockUseUpdateBill).not.toHaveBeenCalled();
    expect(mockUseCreateBill).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('tries the read again from the failure page', async () => {
    mockBill = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Try again');
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Go back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('holds the skeleton while the read is still running', async () => {
    const { getByText, queryByText } = await render(<AddBillScreen />);

    expect(getByText('Edit bill')).toBeTruthy();
    expect(queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(queryByText('Save changes')).toBeNull();
    expect(mockUseUpdateBill).not.toHaveBeenCalled();
  });

  it('opens on the final page, filled in, once the bill is in hand', async () => {
    mockBill = { data: POWER, isError: false, isFetched: true };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Edit bill')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Amount, $84.20' })).toBeTruthy();
    expect(screen.getByLabelText('Change name, currently Power')).toBeTruthy();
    expect(screen.getByLabelText('Category, Electricity & Gas')).toBeTruthy();
    expect(screen.getByLabelText('Payment on, Sun Sep 20')).toBeTruthy();
    expect(lit(screen, PAID_WITH)).toEqual(['VISA ••4421']);
    expect(lit(screen, REMINDERS)).toEqual(['No reminder']);
    expect(screen.getByLabelText('Save changes')).toBeEnabled();
    onFinalPage(screen);
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(mockUseUpdateBill).toHaveBeenCalled();
  });

  it('says the bill is gone when the read lands empty, rather than starting a new one', async () => {
    mockBill = { data: null, isError: false, isFetched: true };
    const { getByText, queryByText } = await render(<AddBillScreen />);

    expect(getByText(FAILURE_MESSAGE)).toBeTruthy();
    // An update on a missing id writes nothing yet reports success, and a create would file a
    // second bill, so neither is offered.
    expect(queryByText('Edit bill')).toBeNull();
    expect(mockUseUpdateBill).not.toHaveBeenCalled();
    expect(mockUseCreateBill).not.toHaveBeenCalled();
  });
});

describe('Add bill — a new bill, page by page', () => {
  it('opens on the category chooser, with nothing to save yet', async () => {
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Add a bill')).toBeTruthy();
    onCategoryPage(screen);
    for (const tile of Object.values(TILE)) expect(screen.getByLabelText(tile)).toBeTruthy();
    expect(screen.queryByLabelText('Save bill')).toBeNull();
    expect(screen.queryByLabelText('Continue')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('goes on to the amount page when a category is picked, which draws no step dots', async () => {
    const screen = await render(<AddBillScreen />);

    await press(screen, TILE.internet);

    onAmountPage(screen);
    expect(screen.getByText('Add a bill')).toBeTruthy();
    expect(screen.getByLabelText('Calculator')).toBeTruthy();
    expect(screen.getByLabelText('Continue')).toBeDisabled();
    // One page, not "step 2 of 2".
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByLabelText(/^Step \d/)).toBeNull();
  });

  it('keeps Continue off until the amount is above zero', async () => {
    const screen = await render(<AddBillScreen />);
    await press(screen, TILE.internet);

    await typeAmount(screen, '0');
    expect(screen.getByLabelText('Continue')).toBeDisabled();
    await typeAmount(screen, '.0');
    expect(screen.getByLabelText('Continue')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Continue'));
    onAmountPage(screen);

    await typeAmount(screen, '1');
    expect(screen.getByLabelText('Continue')).toBeEnabled();
    await press(screen, 'Continue');
    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $0.01' })).toBeTruthy();
  });

  it('takes the amount from the calculator, and leaves it alone when the calculator is dismissed', async () => {
    const screen = await render(<AddBillScreen />);
    await press(screen, TILE.internet);
    await typeAmount(screen, '5');

    await press(screen, 'Calculator');
    expect(screen.getByText('Pad opened on 5')).toBeTruthy();
    await press(screen, 'Pad cancel');
    expect(screen.queryByText(/^Pad opened/)).toBeNull();
    expect(screen.getByLabelText('Amount, $5.00')).toBeTruthy();

    await press(screen, 'Calculator');
    await press(screen, 'Pad result');
    expect(screen.queryByText(/^Pad opened/)).toBeNull();
    expect(screen.getByLabelText('Amount, $1,234.56')).toBeTruthy();
    await press(screen, 'Continue');
    expect(screen.getByRole('button', { name: 'Amount, $1,234.56' })).toBeTruthy();
  });

  it('lands on one final page with every answer still to give', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.internet, '80');

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $80.00' })).toBeTruthy();
    expect(screen.getByText('Tap to edit')).toBeTruthy();
    // The name starts empty, whatever the category.
    expect(screen.getByPlaceholderText(HINT.internet)).toBeTruthy();
    expect(screen.getByDisplayValue('')).toBeTruthy();
    expect(screen.getByLabelText('Category, Internet')).toBeTruthy();
    expect(screen.getByLabelText('Payment on, Select a date')).toBeTruthy();
    expect(lit(screen, RECURRING)).toEqual(['Monthly']);
    expect(lit(screen, PAID_WITH)).toEqual([]);
    expect(lit(screen, REMINDERS)).toEqual([]);
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
    expect(screen.getByText('Add a note')).toBeTruthy();
    expect(screen.queryByText('Tap to add')).toBeNull();
    expect(screen.getByLabelText('Save bill')).toBeEnabled();
    expect(screen.queryByText(/^To save this bill/)).toBeNull();
    expect(screen.queryByLabelText('Delete this bill')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('lays the lines out in order, and the choices after the repeat pills', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.internet, '80');

    const texts = textsInOrder(screen);
    const places = [
      'Name',
      'Category',
      'Payment on',
      'Recurring',
      'Paid with',
      'Reminder',
      'Note',
    ].map((label) => texts.indexOf(label));
    expect(places).not.toContain(-1);
    expect(places).toEqual([...places].sort((a, b) => a - b));
    expect(screen.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel)).toEqual([
      ...RECURRING,
      ...PAID_WITH,
      ...REMINDERS,
    ]);
  });

  it('shows the amount to the cent, never padded to a figure nobody typed', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '1030.5');

    expect(screen.getByRole('button', { name: 'Amount, $1,030.50' })).toBeTruthy();
  });

  it('offers only Skip in Paid with when there is no card or account to choose', async () => {
    mockSources = [];
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '80');

    expect(screen.getByText('Paid with')).toBeTruthy();
    expect(screen.queryByLabelText('VISA ••4421')).toBeNull();
    expect(screen.queryByLabelText('Checking ••0099')).toBeNull();
    expect(isChecked(screen, 'Skip')).toBe(false);
    await press(screen, 'Skip');
    expect(isChecked(screen, 'Skip')).toBe(true);
  });
});

describe('Add bill — back and close', () => {
  it('leaves the form from the chooser, the first page of a new bill', async () => {
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
    // No page behind it to step back to: nothing listens for the hardware button.
    expect(await hardwareBack()).toBe(false);
  });

  it('steps back from the amount page to the chooser, remembering the pick and the amount', async () => {
    const screen = await render(<AddBillScreen />);
    await press(screen, TILE.internet);
    await typeAmount(screen, '80');

    await press(screen, 'Back');

    onCategoryPage(screen);
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByLabelText(TILE.internet).props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText(TILE.housing).props.accessibilityState.selected).toBe(false);

    await press(screen, TILE.internet);
    expect(screen.getByLabelText('Amount, $80.00')).toBeTruthy();
  });

  it('steps back from the amount page with the hardware button, and the edge swipe is off', async () => {
    const screen = await render(<AddBillScreen />);
    await press(screen, TILE.internet);

    expect(lastScreenOptions()).toEqual({ gestureEnabled: false });
    expect(await hardwareBack()).toBe(true);

    onCategoryPage(screen);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('steps back from the final page of a new bill to the amount page, not out of the form', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    // Leaving the route would throw away what was filled in.
    expect(lastScreenOptions()).toEqual({ gestureEnabled: false });
    await press(screen, 'Back');

    onAmountPage(screen);
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Amount, $80.00')).toBeTruthy();
  });

  it('steps back from the final page of a new bill with the hardware button too', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(await hardwareBack()).toBe(true);

    onAmountPage(screen);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('leaves the form from the final page of a saved bill, which is where it opened', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    // Nothing behind it inside the form, so the edge swipe and the system's own back stay on.
    expect(lastScreenOptions()).toEqual({ gestureEnabled: true });
    expect(await hardwareBack()).toBe(false);
    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('leaves the form from the final page of a bill the voice review heard', async () => {
    mockParams = {
      from: 'voice',
      prefillCategory: 'internet',
      prefillAmount: '80',
      prefillDate: '2026-10-09',
    };
    const screen = await render(<AddBillScreen />);

    onFinalPage(screen);
    expect(lastScreenOptions()).toEqual({ gestureEnabled: true });
    expect(await hardwareBack()).toBe(false);
    await press(screen, 'Back');

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('asks before closing a new bill, from any page, and leaves when confirmed', async () => {
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Close');
    expect(mockConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Cancel adding this bill?', destructive: true }),
    );
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));

    await press(screen, TILE.internet);
    await press(screen, 'Close');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(2));

    await typeAmount(screen, '80');
    await press(screen, 'Continue');
    await press(screen, 'Close');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(3));
    expect(mockConfirm).toHaveBeenCalledTimes(3);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('stays on the form when closing is declined', async () => {
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'Close');

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(router.back).not.toHaveBeenCalled();
    onFinalPage(screen);
  });

  it('asks about editing, not adding, when closing a saved bill', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Close');

    expect(mockConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Cancel editing this bill?', destructive: true }),
    );
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  });

  it('has no close button on the page of a single field, where Back already undoes it', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Note, not set, optional');

    expect(screen.queryByLabelText('Close')).toBeNull();
    expect(screen.getByLabelText('Back')).toBeTruthy();
  });
});

describe('Add bill — the lines that open a page of their own', () => {
  beforeEach(() => editing(POWER));

  describe('the amount', () => {
    it('opens the keypad on the amount, with the calculator, and keeps what is typed on Done', async () => {
      const screen = await render(<AddBillScreen />);

      await pressButton(screen, 'Amount, $84.20');

      expect(screen.getByText('How much is the bill?')).toBeTruthy();
      expect(screen.getByLabelText('Calculator')).toBeTruthy();
      expect(screen.queryByText('You can edit this later.')).toBeNull();
      await press(screen, 'Delete last digit');
      await typeAmount(screen, '5');
      await press(screen, 'Done');

      onFinalPage(screen);
      expect(screen.getByRole('button', { name: 'Amount, $84.50' })).toBeTruthy();
    });

    it('leaves the amount as it was on Back', async () => {
      const screen = await render(<AddBillScreen />);

      await pressButton(screen, 'Amount, $84.20');
      await typeAmount(screen, '5');
      await press(screen, 'Back');

      onFinalPage(screen);
      expect(screen.getByRole('button', { name: 'Amount, $84.20' })).toBeTruthy();
    });

    it('will not keep zero as the amount', async () => {
      const screen = await render(<AddBillScreen />);

      await pressButton(screen, 'Amount, $84.20');
      for (let key = 0; key < 4; key += 1) await press(screen, 'Delete last digit');
      expect(screen.getByLabelText('Done')).toBeDisabled();
      await typeAmount(screen, '0');
      expect(screen.getByLabelText('Done')).toBeDisabled();
      await typeAmount(screen, '.01');
      expect(screen.getByLabelText('Done')).toBeEnabled();
    });

    it('takes a calculator result and keeps it on Done', async () => {
      const screen = await render(<AddBillScreen />);

      await pressButton(screen, 'Amount, $84.20');
      await press(screen, 'Calculator');
      expect(screen.getByText('Pad opened on 84.2')).toBeTruthy();
      await press(screen, 'Pad result');
      await press(screen, 'Done');

      expect(screen.getByRole('button', { name: 'Amount, $1,234.56' })).toBeTruthy();
    });
  });

  describe('the category', () => {
    it('opens the grid, and a tap picks and returns at once, with no Done', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Category, Electricity & Gas');

      expect(screen.getByText('What is this bill for?')).toBeTruthy();
      expect(screen.queryByLabelText('Done')).toBeNull();
      expect(screen.queryByLabelText('Continue')).toBeNull();
      expect(screen.getByLabelText(TILE.energy).props.accessibilityState.selected).toBe(true);
      await press(screen, TILE.mobile);

      onFinalPage(screen);
      expect(screen.getByLabelText('Category, Mobile Phone')).toBeTruthy();
    });

    it('leaves the category as it was on Back', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Category, Electricity & Gas');
      await press(screen, 'Back');

      onFinalPage(screen);
      expect(screen.getByLabelText('Category, Electricity & Gas')).toBeTruthy();
    });
  });

  describe('the note', () => {
    it('opens the note, and keeps a new one on Done', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Note, not set, optional');
      await fireEvent.changeText(
        screen.getByPlaceholderText('Anything worth remembering'),
        'Off-peak plan',
      );
      await press(screen, 'Done');

      onFinalPage(screen);
      expect(screen.getByLabelText('Note, Off-peak plan')).toBeTruthy();
      expect(screen.queryByText('Add a note')).toBeNull();
    });

    it('leaves the note as it was on Back', async () => {
      editing({ ...POWER, note: 'Autopay' });
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Note, Autopay');
      await fireEvent.changeText(screen.getByDisplayValue('Autopay'), 'Something else');
      await press(screen, 'Back');

      expect(screen.getByLabelText('Note, Autopay')).toBeTruthy();
    });

    it('counts a note of spaces as no note', async () => {
      editing({ ...POWER, note: 'Autopay' });
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Note, Autopay');
      await fireEvent.changeText(screen.getByDisplayValue('Autopay'), '   ');
      await press(screen, 'Done');

      expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
      expect(screen.getByText('Add a note')).toBeTruthy();
    });
  });

  describe('a page of one field', () => {
    it('steps back to the final page with the hardware button, discarding like Back', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Note, not set, optional');
      await fireEvent.changeText(
        screen.getByPlaceholderText('Anything worth remembering'),
        'Autopay',
      );
      // Past the first page, so the edge swipe is off too.
      expect(lastScreenOptions()).toEqual({ gestureEnabled: false });
      expect(await hardwareBack()).toBe(true);

      onFinalPage(screen);
      expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
      expect(router.back).not.toHaveBeenCalled();
    });

    it('draws no step dots', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Note, not set, optional');

      expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('has no page for the name, payment day, card or reminder: they are answered where they stand', async () => {
      const screen = await render(<AddBillScreen />);

      expect(
        screen.queryByLabelText(/^(Name|Payment on|Paid with|Reminder), (needed|not set)/),
      ).toBeNull();
      await press(screen, 'Payment on, Sun Sep 20');
      await press(screen, 'Skip');
      await press(screen, '1 day');

      onFinalPage(screen);
    });
  });
});

describe('Add bill — the name box on the final page', () => {
  it('is the first line, required, with examples for the bill’s category', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByPlaceholderText(HINT.internet)).toBeTruthy();
    expect(screen.getByDisplayValue('')).toBeTruthy();
    expect(screen.queryByText(/Optional/)).toBeNull();
    expect(screen.queryByText(/^Company/)).toBeNull();
    const texts = textsInOrder(screen);
    expect(texts.indexOf('Name')).toBeGreaterThan(-1);
    expect(texts.indexOf('Name')).toBeLessThan(texts.indexOf('Category'));
  });

  it.each(Object.keys(HINT) as (keyof typeof TILE)[])(
    'gives examples to match %s',
    async (category) => {
      const screen = await render(<AddBillScreen />);

      await newBill(screen, TILE[category], '80');

      expect(screen.getByPlaceholderText(HINT[category])).toBeTruthy();
    },
  );

  it('follows the category when it changes', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'Category, Internet');
    await press(screen, TILE.insurance);

    expect(screen.queryByPlaceholderText(HINT.internet)).toBeNull();
    expect(screen.getByPlaceholderText(HINT.insurance)).toBeTruthy();
  });

  it('shows the name of a saved bill in the box, with a way to take it off', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByLabelText('Change name, currently Power')).toBeTruthy();
    expect(screen.queryByPlaceholderText(HINT.energy)).toBeNull();
    expect(screen.queryByDisplayValue('')).toBeNull();
  });

  it('draws the logo of a saved bill’s company in the box, else the category’s icon', async () => {
    editing({ ...POWER, brand_id: 'b-cc', brands: { domain: 'comcast.com' } });
    const first = await render(<AddBillScreen />);
    expect(first.getByTestId('logo-32')).toHaveTextContent('Power|comcast.com');
    await first.unmount();

    editing(POWER);
    const second = await render(<AddBillScreen />);
    expect(second.getByTestId('logo-32')).toHaveTextContent(/^Power\|$/);
  });

  it('opens with the name a voice hand-off heard', async () => {
    mockParams = {
      from: 'voice',
      prefillName: 'Rent',
      prefillCategory: 'housing',
      prefillAmount: '1100',
      prefillDate: '2026-10-09',
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Change name, currently Rent')).toBeTruthy();
    expect(screen.queryByPlaceholderText(HINT.housing)).toBeNull();
  });

  it('opens with the company a voice hand-off heard, logo and all', async () => {
    mockParams = {
      from: 'voice',
      prefillIssuer: 'Comcast',
      prefillBrandId: 'b-cc',
      prefillDomain: 'comcast.com',
      prefillCategory: 'internet',
      prefillAmount: '80',
      prefillDate: '2026-10-09',
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Change name, currently Comcast')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Comcast|comcast.com');
  });

  it('leaves the name to the person when a voice hand-off heard only a category', async () => {
    mockParams = {
      from: 'voice',
      prefillCategory: 'internet',
      prefillAmount: '80',
      prefillDate: '2026-10-09',
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByPlaceholderText(HINT.internet)).toBeTruthy();
    expect(screen.queryByLabelText(/^Change name/)).toBeNull();
  });

  it('opens empty for a saved bill that somehow has no name, and Save asks for one', async () => {
    editing({ ...POWER, name: '' });
    const screen = await render(<AddBillScreen />);

    expect(screen.getByPlaceholderText(HINT.energy)).toBeTruthy();
    await press(screen, 'Save changes');
    expect(screen.getByText(gaps('Name'))).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('lists matches inline and picks one without leaving the page', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await typeName(screen, HINT.internet, 'Greys');
    expect(await screen.findByLabelText('Greystar')).toBeTruthy();
    expect(screen.getByLabelText('Use Greys as the name')).toBeTruthy();
    expect(screen.getByText('Add “Greys”')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Greystar'));

    onFinalPage(screen);
    expect(screen.getByLabelText('Change name, currently Greystar')).toBeTruthy();
    expect(screen.queryByPlaceholderText(HINT.internet)).toBeNull();
    // The company's own category does not move the bill's.
    expect(screen.getByLabelText('Category, Internet')).toBeTruthy();
  });

  it('uses a name the catalogue does not know, and asks about its logo in place', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await typeName(screen, HINT.internet, 'Town Cable');
    await fireEvent.press(await screen.findByLabelText('Use Town Cable as the name'));

    onFinalPage(screen);
    expect(screen.getByLabelText('Change name, currently Town Cable')).toBeTruthy();
    expect(screen.getByLabelText(LOGO_COPY.addWebsite)).toBeTruthy();
  });

  it('stays when the person visits another page and comes back', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await pickName(screen, HINT.internet, 'Comcast');

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');

    expect(screen.getByLabelText('Change name, currently Comcast')).toBeTruthy();
  });

  // The box is rebuilt on the way back from another page, so what was typed has to be handed to it
  // again, or Save would go through on a name nobody can see.
  it('still shows a typed name after a visit to another page, and saves that name', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await typeName(screen, HINT.internet, 'Gym');

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');

    expect(screen.getByDisplayValue('Gym')).toBeTruthy();
    await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');
    await press(screen, 'VISA ••4421');
    await press(screen, 'No reminder');
    await press(screen, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ name: 'Gym' });
  });

  it('keeps a typed name through a change of category and a visit to the amount', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await typeName(screen, HINT.internet, 'Gym');

    await press(screen, 'Category, Internet');
    await press(screen, TILE.insurance);
    expect(screen.getByLabelText('Category, Insurance')).toBeTruthy();
    expect(screen.getByDisplayValue('Gym')).toBeTruthy();

    await pressButton(screen, 'Amount, $80.00');
    await press(screen, 'Back');
    expect(screen.getByDisplayValue('Gym')).toBeTruthy();
    expect(screen.getByPlaceholderText(HINT.insurance)).toBeTruthy();
  });

  it('takes the name off with its X, which brings the empty box back', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await pickName(screen, HINT.internet, 'Comcast');

    await press(screen, 'Change name, currently Comcast');

    expect(screen.getByPlaceholderText(HINT.internet)).toBeTruthy();
    expect(screen.getByDisplayValue('')).toBeTruthy();
    expect(screen.queryByLabelText(/^Change name/)).toBeNull();
    await press(screen, 'Save bill');
    expect(screen.getByText(/^To save this bill, fill in: Name,/)).toBeTruthy();
  });

  it('lets a saved bill’s company go, and the bill is saved without it', async () => {
    editing({ ...POWER, brand_id: 'b-cc', brands: { domain: 'comcast.com' } });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Change name, currently Power');
    await typeName(screen, HINT.energy, 'Electric');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ name: 'Electric', brand_id: null });
  });
});

describe('Add bill — the name stays what the person gave it', () => {
  it('leaves the box empty when the category changes, and Save still asks for a name', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'Category, Internet');
    await press(screen, TILE.insurance);

    expect(screen.getByLabelText('Category, Insurance')).toBeTruthy();
    expect(screen.getByDisplayValue('')).toBeTruthy();
    expect(screen.queryByLabelText(/^Change name/)).toBeNull();
    await press(screen, 'Save bill');
    expect(screen.getByText(/^To save this bill, fill in: Name,/)).toBeTruthy();
  });

  it('does not name an Other bill after the category it becomes either', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.other, '80');

    await press(screen, 'Category, Other bill');
    await press(screen, TILE.housing);

    expect(screen.getByLabelText('Category, Housing')).toBeTruthy();
    expect(screen.getByDisplayValue('')).toBeTruthy();
    expect(screen.getByPlaceholderText(HINT.housing)).toBeTruthy();
  });

  it('keeps the name that was picked when the category changes', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await pickName(screen, HINT.internet, 'Comcast');

    await press(screen, 'Category, Internet');
    await press(screen, TILE.mobile);

    expect(screen.getByLabelText('Category, Mobile Phone')).toBeTruthy();
    expect(screen.getByLabelText('Change name, currently Comcast')).toBeTruthy();
  });

  it('keeps the name a voice hand-off heard', async () => {
    mockParams = {
      from: 'voice',
      prefillName: 'Rent',
      prefillCategory: 'housing',
      prefillAmount: '1100',
      prefillDate: '2026-10-09',
    };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Category, Housing');
    await press(screen, TILE.insurance);

    expect(screen.getByLabelText('Change name, currently Rent')).toBeTruthy();
  });

  it('keeps the name of a saved bill when its category changes', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Category, Electricity & Gas');
    await press(screen, TILE.housing);

    expect(screen.getByLabelText('Change name, currently Power')).toBeTruthy();
    expect(screen.getByLabelText('Category, Housing')).toBeTruthy();
  });

  it('saves a name typed after the category changed', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Category, Internet');
    await press(screen, TILE.insurance);

    await answerTheRest(screen, HINT.insurance, 'Car cover');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Car cover',
      category_id: 'insurance',
    });
  });
});

describe('Add bill — the payment day box', () => {
  describe('on a saved bill', () => {
    beforeEach(() => editing(POWER));

    it('shows the saved day in the box, with the calendar folded away', async () => {
      const screen = await render(<AddBillScreen />);

      expect(screen.getByText('Payment on')).toBeTruthy();
      expect(screen.getByLabelText('Payment on, Sun Sep 20').props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: false }),
      );
      expect(screen.queryByLabelText('Next month')).toBeNull();
      expect(screen.queryByLabelText(/^Due on/)).toBeNull();
    });

    it('opens a calendar right under the box, on the saved day', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Payment on, Sun Sep 20');

      onFinalPage(screen);
      expect(screen.getByLabelText('Payment on, Sun Sep 20').props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: true }),
      );
      expect(screen.getByLabelText('Sunday 20 September 2026').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
      const texts = textsInOrder(screen);
      expect(texts.indexOf('Payment on')).toBeLessThan(texts.indexOf('September 2026'));
      expect(texts.indexOf('September 2026')).toBeLessThan(texts.indexOf('Recurring'));
    });

    it('fills the box with the day picked and folds the calendar away', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Payment on, Sun Sep 20');
      await press(screen, 'Next month');
      await press(screen, 'Friday 9 October 2026');

      onFinalPage(screen);
      expect(screen.getByLabelText('Payment on, Fri Oct 9')).toBeTruthy();
      expect(screen.queryByLabelText('Next month')).toBeNull();
    });

    it('sets today with the Today pill', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Payment on, Sun Sep 20');
      await press(screen, 'Today');

      expect(screen.getByLabelText('Payment on, Today, Wed Oct 7')).toBeTruthy();
      expect(screen.queryByLabelText('Next month')).toBeNull();
    });

    it('folds the calendar away on a second tap and keeps the day', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Payment on, Sun Sep 20');
      await press(screen, 'Payment on, Sun Sep 20');

      expect(screen.queryByLabelText('Next month')).toBeNull();
      expect(screen.getByLabelText('Payment on, Sun Sep 20')).toBeTruthy();
    });

    it('says Today for a bill due today', async () => {
      editing({ ...POWER, next_due_on: '2026-10-07' });
      const screen = await render(<AddBillScreen />);

      expect(screen.getByLabelText('Payment on, Today, Wed Oct 7')).toBeTruthy();
    });
  });

  describe('on a new bill', () => {
    it('invites a day, and opens the calendar on this month with none picked', async () => {
      const screen = await render(<AddBillScreen />);
      await newBill(screen, TILE.internet, '80');

      expect(screen.getByText('Select a date')).toBeTruthy();
      await press(screen, 'Payment on, Select a date');

      expect(screen.getByText('October 2026')).toBeTruthy();
      expect(screen.getByLabelText('Friday 9 October 2026').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });

    it('fills the box with the day picked, without leaving the page', async () => {
      const screen = await render(<AddBillScreen />);
      await newBill(screen, TILE.internet, '80');

      await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');

      onFinalPage(screen);
      expect(screen.getByLabelText('Payment on, Fri Oct 9')).toBeTruthy();
      expect(screen.queryByText('Select a date')).toBeNull();
      expect(screen.queryByLabelText('Next month')).toBeNull();
    });
  });
});

describe('Add bill — paid with', () => {
  it('starts with nothing chosen on a new bill, and offers every card and account, then Skip', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(screen.getByText('Paid with')).toBeTruthy();
    expect(lit(screen, PAID_WITH)).toEqual([]);
    const radios = screen.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel);
    expect(radios.slice(RECURRING.length, RECURRING.length + PAID_WITH.length)).toEqual(PAID_WITH);
  });

  it('chooses a card where it stands and lets the other go', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'VISA ••4421');
    expect(lit(screen, PAID_WITH)).toEqual(['VISA ••4421']);
    await press(screen, 'Checking ••0099');

    onFinalPage(screen);
    expect(lit(screen, PAID_WITH)).toEqual(['Checking ••0099']);
  });

  it('takes Skip as an answer, which lets the cards go', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'VISA ••4421');
    await press(screen, 'Skip');
    expect(lit(screen, PAID_WITH)).toEqual(['Skip']);

    await press(screen, 'Checking ••0099');
    expect(lit(screen, PAID_WITH)).toEqual(['Checking ••0099']);
  });

  it('opens a saved bill on its card, its account, or Skip when it has neither', async () => {
    editing(POWER);
    const card = await render(<AddBillScreen />);
    expect(lit(card, PAID_WITH)).toEqual(['VISA ••4421']);
    await card.unmount();

    editing({ ...POWER, card_id: null, bank_account_id: 'acct-1' });
    const account = await render(<AddBillScreen />);
    expect(lit(account, PAID_WITH)).toEqual(['Checking ••0099']);
    await account.unmount();

    editing({ ...POWER, card_id: null, bank_account_id: null });
    const neither = await render(<AddBillScreen />);
    expect(lit(neither, PAID_WITH)).toEqual(['Skip']);
  });

  it('opens a bill on the card the voice review heard', async () => {
    mockParams = {
      from: 'voice',
      prefillCategory: 'internet',
      prefillAmount: '80',
      prefillDate: '2026-10-09',
      prefillSource: 'acct-1',
    };
    const screen = await render(<AddBillScreen />);

    expect(lit(screen, PAID_WITH)).toEqual(['Checking ••0099']);
  });
});

describe('Add bill — the reminder', () => {
  it('starts with nothing chosen on a new bill, and no time to set', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(screen.getByText('Reminder')).toBeTruthy();
    expect(screen.getByText('Before the bill is due')).toBeTruthy();
    expect(lit(screen, REMINDERS)).toEqual([]);
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
  });

  it('says No reminder, never Off, for the way to have none', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(screen.queryByLabelText('Off')).toBeNull();
    await press(screen, 'No reminder');

    expect(lit(screen, REMINDERS)).toEqual(['No reminder']);
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
  });

  it('shows the time once a reminder is on, and takes it away again with No reminder', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, '1 day');

    onFinalPage(screen);
    expect(lit(screen, REMINDERS)).toEqual(['1 day']);
    expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
    await press(screen, 'On the day');
    expect(lit(screen, REMINDERS)).toEqual(['On the day']);
    expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
    await press(screen, 'No reminder');
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
  });

  it('opens a saved bill on its reminder and its time, or on No reminder when it has none', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    editing(POWER);
    const saved = await render(<AddBillScreen />);
    expect(lit(saved, REMINDERS)).toEqual(['3 days']);
    expect(saved.getByLabelText('Sent at 8:30 AM. Change the time.')).toBeTruthy();
    await saved.unmount();

    mockSavedReminder = { choice: 'off', remindAt: '09:00' };
    const none = await render(<AddBillScreen />);
    expect(lit(none, REMINDERS)).toEqual(['No reminder']);
    expect(none.queryByLabelText(/^Sent at/)).toBeNull();
  });
});

describe('Add bill — how often it repeats', () => {
  it('offers five choices, Monthly chosen, and is not itself a button', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(
      screen
        .getAllByRole('radio')
        .slice(0, RECURRING.length)
        .map((chip) => chip.props.accessibilityLabel),
    ).toEqual(RECURRING);
    expect(lit(screen, RECURRING)).toEqual(['Monthly']);
    expect(screen.getByText('Recurring')).toBeTruthy();
    expect(screen.queryByLabelText(/^Recurring/)).toBeNull();
  });

  it('moves the choice between the chips and the line above them', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'Every 3 months');

    expect(lit(screen, RECURRING)).toEqual(['Every 3 months']);
    // The label of the chip, and the value on the Recurring line.
    expect(screen.getAllByText('Every 3 months')).toHaveLength(2);
  });

  it('reads Starts on, and offers an end date, once it is a specific period', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    expect(screen.queryByText('Starts on')).toBeNull();
    expect(screen.queryByLabelText(/^To,/)).toBeNull();

    await press(screen, 'Specific period');

    expect(screen.getByText('Starts on')).toBeTruthy();
    expect(screen.getByLabelText('Starts on, Select a date')).toBeTruthy();
    expect(screen.queryByText('Payment on')).toBeNull();
    expect(screen.queryByLabelText(/^Payment on/)).toBeNull();
    expect(screen.getByText('To')).toBeTruthy();
    expect(screen.getByLabelText('To, Ongoing — no end date')).toBeTruthy();
    expect(screen.getByText('Ongoing — no end date')).toBeTruthy();
    // Nothing to clear until there is an end.
    expect(screen.queryByLabelText('Clear — make it ongoing')).toBeNull();
  });

  it('asks when it starts in the same box, and fills it in place', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Specific period');

    await pickDay(screen, 'Starts on, Select a date', 'Friday 9 October 2026');

    onFinalPage(screen);
    expect(screen.getByLabelText('Starts on, Fri Oct 9')).toBeTruthy();
    expect(screen.queryByLabelText('Next month')).toBeNull();
  });

  it('keeps the first due date when the bill becomes a period and back', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');

    await press(screen, 'Specific period');
    expect(screen.getByLabelText('Starts on, Fri Oct 9')).toBeTruthy();
    await press(screen, 'Yearly');
    expect(screen.getByLabelText('Payment on, Fri Oct 9')).toBeTruthy();
  });

  it('forgets the end date on the way back to an open-ended schedule', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);
    expect(screen.getByLabelText('Starts on, Mon Jun 1')).toBeTruthy();
    expect(screen.getByLabelText('To, Thu Dec 31')).toBeTruthy();

    await press(screen, 'Weekly');
    expect(screen.queryByLabelText(/^To,/)).toBeNull();
    expect(screen.getByLabelText('Payment on, Mon Jun 1')).toBeTruthy();

    await press(screen, 'Specific period');
    expect(screen.getByLabelText('Starts on, Mon Jun 1')).toBeTruthy();
    expect(screen.getByLabelText('To, Ongoing — no end date')).toBeTruthy();
  });

  it('drops an end date the new start has passed', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Starts on, Mon Jun 1');
    for (let month = 0; month < 7; month += 1) await press(screen, 'Next month');
    await press(screen, 'Friday 1 January 2027');

    expect(screen.getByLabelText('Starts on, Fri Jan 1')).toBeTruthy();
    expect(screen.getByLabelText('To, Ongoing — no end date')).toBeTruthy();
  });

  it('keeps an end date the new start has not passed', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Starts on, Mon Jun 1');
    await press(screen, 'Next month');
    await press(screen, 'Wednesday 1 July 2026');

    expect(screen.getByLabelText('Starts on, Wed Jul 1')).toBeTruthy();
    expect(screen.getByLabelText('To, Thu Dec 31')).toBeTruthy();
  });

  describe('the end date', () => {
    const STARTS_OCT_10 = {
      ...PERIOD,
      starts_on: '2026-10-10',
      next_due_on: '2026-10-10',
      ends_on: null,
    };

    it('offers no day before the start, and the start itself', async () => {
      editing(STARTS_OCT_10);
      const screen = await render(<AddBillScreen />);

      await press(screen, 'To, Ongoing — no end date');

      expect(screen.getByLabelText('Friday 9 October 2026')).toBeDisabled();
      expect(screen.getByLabelText('Saturday 10 October 2026')).toBeEnabled();
      expect(screen.getByLabelText('Sunday 11 October 2026')).toBeEnabled();
    });

    it('opens on the saved end, selected', async () => {
      editing(PERIOD);
      const screen = await render(<AddBillScreen />);

      await press(screen, 'To, Thu Dec 31');

      expect(screen.getByLabelText('Thursday 31 December 2026').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });

    it('fills the box with the day picked and folds the calendar away', async () => {
      editing(STARTS_OCT_10);
      const screen = await render(<AddBillScreen />);

      await pickDay(screen, 'To, Ongoing — no end date', 'Sunday 11 October 2026');

      onFinalPage(screen);
      expect(screen.getByLabelText('To, Sun Oct 11')).toBeTruthy();
      expect(screen.queryByLabelText('Saturday 10 October 2026')).toBeNull();
    });

    it('may be left empty: Save does not ask for it', async () => {
      editing(STARTS_OCT_10);
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Save changes');

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
        recurrence: 'period',
        starts_on: '2026-10-10',
        ends_on: null,
      });
    });

    it('clears with the link, which goes once there is no end', async () => {
      editing(PERIOD);
      const screen = await render(<AddBillScreen />);

      await press(screen, 'To, Thu Dec 31');
      await press(screen, 'Clear — make it ongoing');

      onFinalPage(screen);
      expect(screen.getByLabelText('To, Ongoing — no end date')).toBeTruthy();
      expect(screen.queryByLabelText('Clear — make it ongoing')).toBeNull();
      expect(screen.queryByLabelText('Thursday 31 December 2026')).toBeNull();
    });

    it('saves the end that was picked, and none after it was cleared', async () => {
      editing(PERIOD);
      const first = await render(<AddBillScreen />);
      await press(first, 'Save changes');
      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ ends_on: '2026-12-31' });
      await first.unmount();

      const second = await render(<AddBillScreen />);
      await press(second, 'Clear — make it ongoing');
      await press(second, 'Save changes');
      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
      expect(mockUpdate.mock.calls[1][0].values).toMatchObject({ ends_on: null });
    });
  });
});

describe('Add bill — a bill that arrives with lines missing', () => {
  it('invites the amount a voice hand-off did not hear, never drawing $0', async () => {
    mockParams = {
      prefillName: 'Home fibre',
      prefillCategory: 'internet',
      prefillDate: '2026-10-09',
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    expect(screen.queryByText('Tap to edit')).toBeNull();
    expect(screen.queryByText(/\$0/)).toBeNull();
    expect(screen.getByLabelText('Save bill')).toBeEnabled();
    await press(screen, 'Save bill');
    expect(screen.getByText(gaps('Amount, Paid with, Reminder'))).toBeTruthy();
    await pressButton(screen, 'Amount, needed');
    await typeAmount(screen, '80');
    await press(screen, 'Done');

    expect(screen.getByRole('button', { name: 'Amount, $80.00' })).toBeTruthy();
    expect(screen.queryByText(/^To save this bill/)).toBeNull();
  });

  it('invites the day a voice hand-off did not hear, and fills it in the box', async () => {
    mockParams = { prefillCategory: 'internet', prefillAmount: '80' };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Payment on, Select a date')).toBeTruthy();
    await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');

    expect(screen.getByLabelText('Payment on, Fri Oct 9')).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeEnabled();
  });

  it('opens on the day it names, and its cycle', async () => {
    mockParams = {
      prefillCategory: 'internet',
      prefillAmount: '80',
      prefillDate: '2026-10-09',
      prefillCycle: 'quarterly',
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Payment on, Fri Oct 9')).toBeTruthy();
    expect(lit(screen, RECURRING)).toEqual(['Every 3 months']);
  });
});

describe('Add bill — Save with gaps', () => {
  it('is never greyed out for a missing answer', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.internet, '80');

    expect(screen.getByLabelText('Save bill')).toBeEnabled();
  });

  it('names every gap in the order of the page and writes nothing', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'Save bill');

    expect(screen.getByText(gaps('Name, Payment on, Paid with, Reminder'))).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    onFinalPage(screen);
  });

  it('names all six when nothing at all was brought', async () => {
    mockParams = { prefillNote: 'Autopay' };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save bill');

    expect(
      screen.getByText(gaps('Amount, Name, Category, Payment on, Paid with, Reminder')),
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('says Starts on in place of Payment on for a specific period', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Specific period');

    await press(screen, 'Save bill');

    expect(screen.getByText(gaps('Name, Starts on, Paid with, Reminder'))).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  const WHOLE = {
    prefillName: 'Gym',
    prefillCategory: 'other',
    prefillAmount: '80',
    prefillDate: '2026-10-09',
    prefillSource: 'card-1',
  };
  const without = (key: keyof typeof WHOLE) =>
    Object.fromEntries(Object.entries(WHOLE).filter(([name]) => name !== key));

  it.each([
    [
      'Amount',
      'prefillAmount',
      async (screen: Screen) => {
        await pressButton(screen, 'Amount, needed');
        await typeAmount(screen, '80');
        await press(screen, 'Done');
      },
    ],
    [
      'Name',
      'prefillName',
      async (screen: Screen) => {
        await typeName(screen, HINT.other, 'Gym');
      },
    ],
    [
      'Category',
      'prefillCategory',
      async (screen: Screen) => {
        await press(screen, 'Category, needed');
        await press(screen, TILE.housing);
      },
    ],
    [
      'Payment on',
      'prefillDate',
      async (screen: Screen) => {
        await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');
      },
    ],
    [
      'Paid with',
      'prefillSource',
      async (screen: Screen) => {
        await press(screen, 'Skip');
      },
    ],
    [
      'Reminder',
      null,
      async (screen: Screen) => {
        await press(screen, 'No reminder');
      },
    ],
  ])(
    'names only %s when that is all that is left, and saves once it is given',
    async (field, omit, give) => {
      mockParams = omit ? without(omit as keyof typeof WHOLE) : WHOLE;
      const screen = await render(<AddBillScreen />);
      if (field !== 'Reminder') await press(screen, 'No reminder');

      await press(screen, 'Save bill');
      expect(screen.getByText(gaps(field))).toBeTruthy();
      expect(mockCreate).not.toHaveBeenCalled();

      await give(screen);
      await press(screen, 'Save bill');

      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      expect(screen.queryByText(/^To save this bill/)).toBeNull();
    },
  );

  const inlineChanges: [string, (screen: Screen) => Promise<unknown>][] = [
    ['typing the name', (screen) => typeName(screen, HINT.internet, 'Gym')],
    ['picking a name from the list', (screen) => pickName(screen, HINT.internet, 'Comcast')],
    [
      'picking a payment day',
      (screen) => pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026'),
    ],
    ['picking a card', (screen) => press(screen, 'VISA ••4421')],
    ['picking Skip', (screen) => press(screen, 'Skip')],
    ['picking a reminder', (screen) => press(screen, 'On the day')],
    ['changing how often it repeats', (screen) => press(screen, 'Yearly')],
  ];

  it.each(inlineChanges)(
    'goes away with %s, however much is still missing',
    async (_what, change) => {
      const screen = await render(<AddBillScreen />);
      await newBill(screen, TILE.internet, '80');
      await press(screen, 'Save bill');
      expect(screen.getByText(/^To save this bill/)).toBeTruthy();

      await change(screen);

      expect(screen.queryByText(/^To save this bill/)).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    },
  );

  it('goes away when a page keeps something, and stays when the page is left with Back', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Save bill');

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');
    expect(screen.getByText(/^To save this bill/)).toBeTruthy();

    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Anything worth remembering'),
      'Autopay',
    );
    await press(screen, 'Done');
    expect(screen.queryByText(/^To save this bill/)).toBeNull();
  });

  it('is said again on the next press, naming only what is still missing', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Save bill');
    await press(screen, 'Save bill');
    expect(screen.getAllByText(/^To save this bill/)).toHaveLength(1);

    await typeName(screen, HINT.internet, 'Gym');
    await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');
    await press(screen, 'Save bill');

    expect(screen.getByText(gaps('Paid with, Reminder'))).toBeTruthy();
  });

  it('counts a name that was typed but never picked from the list', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await answerTheRest(screen, HINT.internet, '  Gym  ');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Gym',
      brand_id: null,
      category_id: 'internet',
      amount: 80,
      next_due_on: '2026-10-09',
    });
    expect(success).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('does not count spaces as a name', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await typeName(screen, HINT.internet, '   ');
    await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');
    await press(screen, 'VISA ••4421');
    await press(screen, 'No reminder');

    await press(screen, 'Save bill');

    expect(screen.getByText(gaps('Name'))).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('saves the name that was picked, with its company', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await pickName(screen, HINT.internet, 'Comcast');
    await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');
    await press(screen, 'VISA ••4421');
    await press(screen, 'No reminder');

    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ name: 'Comcast', brand_id: 'b-cc' });
  });

  it('accepts Skip as the answer to Paid with, and saves no card or account', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await typeName(screen, HINT.internet, 'Gym');
    await pickDay(screen, 'Payment on, Select a date', 'Friday 9 October 2026');
    await press(screen, 'Skip');
    await press(screen, 'No reminder');

    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: null, bank_account_id: null });
  });

  it('saves the card or the account that was chosen', async () => {
    const first = await render(<AddBillScreen />);
    await newBill(first, TILE.internet, '80');
    await answerTheRest(first, HINT.internet);
    await press(first, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: 'card-1', bank_account_id: null });
    await first.unmount();

    const second = await render(<AddBillScreen />);
    await newBill(second, TILE.internet, '80');
    await answerTheRest(second, HINT.internet);
    await press(second, 'Checking ••0099');
    await press(second, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    expect(mockCreate.mock.calls[1][0]).toMatchObject({ card_id: null, bank_account_id: 'acct-1' });
  });

  it('accepts No reminder as the answer, and sets no reminder for the new bill', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await answerTheRest(screen, HINT.internet);

    await press(screen, 'Save bill');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', null, '09:00');
  });

  it('sets the reminder that was chosen on the bill it saved', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await answerTheRest(screen, HINT.internet);
    await press(screen, '3 days');

    await press(screen, 'Save bill');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', 3, '09:00');
  });

  it('is greyed out only while it is saving', async () => {
    mockCreating = true;
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(screen.getByLabelText('Saving…')).toBeDisabled();
    expect(screen.queryByLabelText('Save bill')).toBeNull();
  });

  it('lets a saved bill be saved as it stands, with the answers it already has', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      id: 'bill-1',
      values: {
        name: 'Power',
        amount: 84.2,
        card_id: 'card-1',
        bank_account_id: null,
        next_due_on: '2026-09-20',
      },
    });
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', null, '09:00');
    expect(screen.queryByText(/^To save this bill/)).toBeNull();
  });

  it('counts Skip on a saved bill with no card or account as an answer', async () => {
    editing({ ...POWER, card_id: null, bank_account_id: null });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
  });

  it('asks for the name again when a saved bill’s name is taken off', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Change name, currently Power');
    await press(screen, 'Save changes');

    expect(screen.getByText(gaps('Name'))).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('Add bill — deleting a saved bill', () => {
  it('offers Delete bill under Save changes, and only when editing', async () => {
    editing(POWER);
    const first = await render(<AddBillScreen />);
    expect(first.getByText('Delete bill')).toBeTruthy();
    expect(first.getByLabelText('Delete this bill')).toBeTruthy();
    await first.unmount();

    mockParams = {};
    mockBill = { data: null, isError: false, isFetched: false };
    const second = await render(<AddBillScreen />);
    await newBill(second, TILE.internet, '80');
    expect(second.queryByText('Delete bill')).toBeNull();
  });

  it('asks first, then deletes the bill and leaves', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Delete this bill');

    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'Delete this bill?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockDelete).toHaveBeenCalledWith('bill-1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps the bill when the question is declined', async () => {
    mockConfirm.mockResolvedValue(false);
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Delete this bill');

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says it is deleting while the delete is in flight', async () => {
    mockDeleting = true;
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Deleting…')).toBeTruthy();
    expect(screen.queryByText('Delete bill')).toBeNull();
  });

  it('says the one failure line, and stays, when the delete fails', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockDelete.mockRejectedValue(new Error('network down'));
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Delete this bill');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    onFinalPage(screen);
    log.mockRestore();
  });
});

describe('Add bill — the final page keeps its place', () => {
  beforeEach(() => editing(POWER));

  // The page's scroll view, found by the memory it was handed rather than by layout.
  const scroller = (screen: Screen) =>
    screen.container.queryAll((node) => node.props.scrollEventThrottle === 32)[0];
  const scrollTo = (screen: Screen, y: number) =>
    fireEvent.scroll(scroller(screen), { nativeEvent: { contentOffset: { x: 0, y } } });

  it('comes back from a line’s page where it was left, not at the top', async () => {
    const screen = await render(<AddBillScreen />);
    expect(scroller(screen).props.contentOffset).toEqual({ x: 0, y: 0 });

    await scrollTo(screen, 420);
    await press(screen, 'Note, not set, optional');
    expect(screen.queryByText('You can edit this later.')).toBeNull();
    await press(screen, 'Back');

    onFinalPage(screen);
    expect(scroller(screen).props.contentOffset).toEqual({ x: 0, y: 420 });
  });

  it('keeps its place after a Done too, and through more than one line', async () => {
    const screen = await render(<AddBillScreen />);

    await scrollTo(screen, 260);
    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Anything worth remembering'),
      'Autopay',
    );
    await press(screen, 'Done');
    expect(scroller(screen).props.contentOffset).toEqual({ x: 0, y: 260 });

    await scrollTo(screen, 510);
    await pressButton(screen, 'Amount, $84.20');
    await press(screen, 'Back');
    expect(scroller(screen).props.contentOffset).toEqual({ x: 0, y: 510 });
  });
});
