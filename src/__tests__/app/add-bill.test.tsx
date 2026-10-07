import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';

import AddBillScreen from '@/app/add-bill';
import { LOGO_COPY } from '@/components/brands/logo-choices';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The bill form as a person walks it. A blank bill opens on the category chooser, then the keypad,
 * then the one final page; every line of that page opens a page for that one thing and comes back,
 * Done to keep what was set and Back to leave it as it was. A saved bill, or what the voice review
 * heard, opens straight on the final page. Real pages throughout (grid, keypad, calendar, company
 * search, card tiles, reminder chips) and the real Save button, so a disabled Save really refuses a
 * press; only the network, the calculator pad and the logo images are replaced.
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
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00' }),
}));

/*
 * Mutations are spied on as hooks: the form runs `useUpdateBill()` at mount, so a hook never called
 * proves the form was never on screen, which is stronger than "nobody pressed Save".
 */
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockUseUpdateBill = jest.fn(() => ({ mutateAsync: mockUpdate, isPending: false }));
const mockUseCreateBill = jest.fn(() => ({ mutateAsync: mockCreate, isPending: false }));
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
  internet: 'Internet. Home broadband and Wi-Fi',
  mobile: 'Mobile Phone. Phone plans, device payments',
  insurance: 'Insurance. Car, health, home, life',
  other: 'Other bill. Name it and pick an icon',
};

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
const isSelected = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.selected);

/** The Name page holds one text box, and an Other bill's is empty until someone names it. */
const nameInput = (screen: Screen) => screen.getByDisplayValue('');

/** Types into the company box on the final page the way a finger does: a tap into it, then the letters. */
async function searchCompany(screen: Screen, placeholder: string, text: string) {
  const input = screen.getByPlaceholderText(placeholder);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Picks a company the catalogue knows from the box on the final page. */
async function chooseCompany(screen: Screen, placeholder: string, text: string) {
  await searchCompany(screen, placeholder, text);
  await fireEvent.press(await screen.findByLabelText(text));
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
  mockDeleting = false;
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
    expect(screen.getByLabelText('Name, Power')).toBeTruthy();
    expect(screen.getByLabelText('Category, Electricity & Gas')).toBeTruthy();
    expect(screen.getByLabelText('Due on, Sun Sep 20')).toBeTruthy();
    expect(screen.getByLabelText('Paid with, VISA ••4421')).toBeTruthy();
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

  it('lands on one final page with the category as the name and the date still to give', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.internet, '80');

    onFinalPage(screen);
    expect(screen.getByRole('button', { name: 'Amount, $80.00' })).toBeTruthy();
    expect(screen.getByText('Tap to edit')).toBeTruthy();
    expect(screen.getByLabelText('Name, Internet')).toBeTruthy();
    expect(screen.getByLabelText('Category, Internet')).toBeTruthy();
    expect(screen.getByLabelText('Due on, needed')).toBeTruthy();
    expect(screen.getByText('Tap to add')).toBeTruthy();
    expect(screen.getByLabelText('Paid with, not set, optional')).toBeTruthy();
    expect(screen.getByLabelText('Reminder, not set, optional')).toBeTruthy();
    expect(screen.getByText('Off')).toBeTruthy();
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
    expect(screen.getByText('Add a note')).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeDisabled();
    expect(screen.queryByLabelText('Delete this bill')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('shows the amount to the cent, never padded to a figure nobody typed', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '1030.5');

    expect(screen.getByRole('button', { name: 'Amount, $1,030.50' })).toBeTruthy();
  });

  it('offers no Paid with line when there is no card or account to choose', async () => {
    mockSources = [];
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '80');

    expect(screen.queryByText('Paid with')).toBeNull();
    expect(screen.queryByLabelText(/^Paid with/)).toBeNull();
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

describe('Add bill — each line of the final page opens its page', () => {
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

  describe('the name', () => {
    it('opens the name on a page of its own, without the company, and keeps a new name on Done', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Name, Power');

      expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
      expect(screen.queryByText(/^Company/)).toBeNull();
      expect(screen.queryByPlaceholderText('AEP, Duke Energy, National Grid')).toBeNull();
      expect(screen.queryByText('You can edit this later.')).toBeNull();
      await fireEvent.changeText(screen.getByDisplayValue('Power'), 'Electric');
      await press(screen, 'Done');

      onFinalPage(screen);
      expect(screen.getByLabelText('Name, Electric')).toBeTruthy();
    });

    it('leaves the name as it was on Back', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Name, Power');
      await fireEvent.changeText(screen.getByDisplayValue('Power'), 'Electric');
      await press(screen, 'Back');

      expect(screen.getByLabelText('Name, Power')).toBeTruthy();
    });

    it('will not keep an empty name', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Name, Power');
      await fireEvent.changeText(screen.getByDisplayValue('Power'), '');
      expect(screen.getByLabelText('Done')).toBeDisabled();
      await fireEvent.changeText(nameInput(screen), '   ');
      expect(screen.getByLabelText('Done')).toBeDisabled();
      await fireEvent.changeText(nameInput(screen), 'Gas');
      expect(screen.getByLabelText('Done')).toBeEnabled();
    });

    it('offers the icons only to an Other bill with no company', async () => {
      editing({ ...POWER, category_id: 'other', name: 'Gym', icon_id: 'pets' });
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Name, Gym');
      expect(screen.getByText('Icon')).toBeTruthy();
      expect(isSelected(screen, 'Pets')).toBe(true);
      await press(screen, 'Music');
      expect(isSelected(screen, 'Music')).toBe(true);
      await press(screen, 'Done');
      await press(screen, 'Save changes');

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
      expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
        category_id: 'other',
        icon_id: 'music',
      });
    });

    it('does not offer the icons to a bill of any other category', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Name, Power');

      expect(screen.queryByText('Icon')).toBeNull();
      expect(screen.queryByLabelText('Pets')).toBeNull();
    });

    it('does not offer the icons beside a company, whose logo would hide them', async () => {
      editing({
        ...POWER,
        category_id: 'other',
        name: 'Gym',
        brand_id: 'b-gs',
        brands: { domain: 'greystar.com' },
      });
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Name, Gym');

      expect(screen.queryByText('Icon')).toBeNull();
      expect(screen.queryByLabelText('Pets')).toBeNull();
    });

    it('draws the company’s logo beside the name, else the category’s icon', async () => {
      editing({ ...POWER, brand_id: 'b-cc', brands: { domain: 'comcast.com' } });
      const first = await render(<AddBillScreen />);
      expect(first.getByTestId('logo-40')).toHaveTextContent('Power|comcast.com');
      await first.unmount();

      editing(POWER);
      const second = await render(<AddBillScreen />);
      expect(second.queryByTestId('logo-40')).toBeNull();
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

  describe('the due date', () => {
    it('opens the calendar on the date, and keeps a new day on Done', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Due on, Sun Sep 20');

      expect(screen.getByText('When is it due?')).toBeTruthy();
      expect(screen.getByLabelText('Sunday 20 September 2026').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
      await press(screen, 'Next month');
      await press(screen, 'Friday 9 October 2026');
      await press(screen, 'Done');

      onFinalPage(screen);
      expect(screen.getByLabelText('Due on, Fri Oct 9')).toBeTruthy();
    });

    it('names the page Due on, and sets today with the Today pill', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Due on, Sun Sep 20');
      expect(screen.getByText('Due on')).toBeTruthy();
      await press(screen, 'Today');
      await press(screen, 'Done');

      expect(screen.getByLabelText('Due on, Today, Wed Oct 7')).toBeTruthy();
    });

    it('leaves the date as it was on Back', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Due on, Sun Sep 20');
      await press(screen, 'Previous month');
      await press(screen, 'Saturday 15 August 2026');
      await press(screen, 'Back');

      expect(screen.getByLabelText('Due on, Sun Sep 20')).toBeTruthy();
    });

    it('says Today for a bill due today', async () => {
      editing({ ...POWER, next_due_on: '2026-10-07' });
      const screen = await render(<AddBillScreen />);

      expect(screen.getByLabelText('Due on, Today, Wed Oct 7')).toBeTruthy();
    });
  });

  describe('paid with', () => {
    it('opens the cards and accounts, and keeps the pick on Done', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Paid with, VISA ••4421');

      expect(isChecked(screen, 'VISA ••4421')).toBe(true);
      expect(isChecked(screen, 'Checking ••0099')).toBe(false);
      await press(screen, 'Checking ••0099');
      await press(screen, 'Done');

      onFinalPage(screen);
      expect(screen.getByLabelText('Paid with, Checking ••0099')).toBeTruthy();
    });

    it('leaves the choice as it was on Back', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Paid with, VISA ••4421');
      await press(screen, 'Checking ••0099');
      await press(screen, 'Back');

      expect(screen.getByLabelText('Paid with, VISA ••4421')).toBeTruthy();
    });

    it('lets the choice go with No card or account, offered only while one is chosen', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Paid with, VISA ••4421');
      await press(screen, 'No card or account');
      expect(screen.queryByLabelText('No card or account')).toBeNull();
      expect(isChecked(screen, 'VISA ••4421')).toBe(false);
      await press(screen, 'Done');

      expect(screen.getByLabelText('Paid with, not set, optional')).toBeTruthy();
    });
  });

  describe('the reminder', () => {
    it('opens the chips and keeps the choice, with its time, on Done', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Reminder, not set, optional');
      expect(isChecked(screen, 'Off')).toBe(true);
      expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
      await press(screen, '1 day');
      expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
      await press(screen, 'Done');

      onFinalPage(screen);
      expect(screen.getByLabelText('Reminder, 1 day before · 9:00 AM')).toBeTruthy();
    });

    it('says On the day without a "before"', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Reminder, not set, optional');
      await press(screen, 'On the day');
      await press(screen, 'Done');

      expect(screen.getByLabelText('Reminder, On the day · 9:00 AM')).toBeTruthy();
    });

    it('leaves the reminder as it was on Back, and turns it off again with Off', async () => {
      const screen = await render(<AddBillScreen />);

      await press(screen, 'Reminder, not set, optional');
      await press(screen, '3 days');
      await press(screen, 'Back');
      expect(screen.getByLabelText('Reminder, not set, optional')).toBeTruthy();

      await press(screen, 'Reminder, not set, optional');
      await press(screen, '3 days');
      await press(screen, 'Done');
      await press(screen, 'Reminder, 3 days before · 9:00 AM');
      await press(screen, 'Off');
      await press(screen, 'Done');
      expect(screen.getByLabelText('Reminder, not set, optional')).toBeTruthy();
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

      await press(screen, 'Due on, Sun Sep 20');

      expect(screen.queryByRole('progressbar')).toBeNull();
    });
  });
});

describe('Add bill — the company box on the final page', () => {
  it('is the first line, optional, with examples for the bill’s category', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(screen.getByText('Company · Optional')).toBeTruthy();
    expect(screen.getByPlaceholderText('Xfinity, Spectrum, Verizon')).toBeTruthy();
    expect(screen.getByDisplayValue('')).toBeTruthy();
    const texts = textsInOrder(screen);
    expect(texts.indexOf('Company · Optional')).toBeGreaterThan(-1);
    expect(texts.indexOf('Company · Optional')).toBeLessThan(texts.indexOf('Name'));
  });

  it.each([
    [TILE.housing, 'Letting agent or management company'],
    [TILE.energy, 'AEP, Duke Energy, National Grid'],
    [TILE.mobile, 'T-Mobile, AT&T, Verizon'],
    [TILE.insurance, 'Geico, State Farm, Progressive'],
    [TILE.other, 'Search for a company'],
  ])('gives examples to match %s', async (tile, placeholder) => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, tile, '80');

    expect(screen.getByPlaceholderText(placeholder)).toBeTruthy();
  });

  it('follows the category when it changes', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'Category, Internet');
    await press(screen, TILE.insurance);

    expect(screen.queryByPlaceholderText('Xfinity, Spectrum, Verizon')).toBeNull();
    expect(screen.getByPlaceholderText('Geico, State Farm, Progressive')).toBeTruthy();
  });

  it('shows the company of a saved bill in the box, with a way to take it off', async () => {
    editing({ ...POWER, brand_id: 'b-cc', brands: { domain: 'comcast.com' } });
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Company · Optional')).toBeTruthy();
    expect(screen.getByLabelText('Change company, currently Power')).toBeTruthy();
    expect(screen.queryByPlaceholderText('AEP, Duke Energy, National Grid')).toBeNull();
  });

  it('shows an empty box for a saved bill with no company', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    expect(screen.getByPlaceholderText('AEP, Duke Energy, National Grid')).toBeTruthy();
    expect(screen.queryByLabelText(/^Change store/)).toBeNull();
  });

  it('lists matches inline and picks one without leaving the page', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await searchCompany(screen, 'Xfinity, Spectrum, Verizon', 'Greys');
    expect(await screen.findByLabelText('Greystar')).toBeTruthy();
    expect(screen.getByLabelText('Add Greys as a new company')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Greystar'));

    onFinalPage(screen);
    expect(screen.getByLabelText('Change company, currently Greystar')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Xfinity, Spectrum, Verizon')).toBeNull();
  });

  it('adds a company the catalogue does not know, and asks about its logo in place', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await searchCompany(screen, 'Xfinity, Spectrum, Verizon', 'Town Cable');
    await fireEvent.press(await screen.findByLabelText('Add Town Cable as a new company'));

    onFinalPage(screen);
    expect(screen.getByLabelText('Name, Town Cable')).toBeTruthy();
    expect(screen.getByLabelText('Change company, currently Town Cable')).toBeTruthy();
    expect(screen.getByLabelText(LOGO_COPY.addWebsite)).toBeTruthy();
  });

  it('stays when the person visits another page and comes back', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');

    await press(screen, 'Note, not set, optional');
    await press(screen, 'Back');

    expect(screen.getByLabelText('Change company, currently Comcast')).toBeTruthy();
    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();
  });

  it('is optional: a bill without one can be saved', async () => {
    mockParams = {
      prefillCategory: 'housing',
      prefillAmount: '1100',
      prefillDate: '2026-10-09',
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Save bill')).toBeEnabled();
    expect(screen.queryByText(/^Tap to add/)).toBeNull();
  });
});

describe('Add bill — how often it repeats', () => {
  it('offers five choices in a group, Monthly chosen, and is not itself a button', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    expect(screen.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel)).toEqual([
      'Weekly',
      'Monthly',
      'Every 3 months',
      'Yearly',
      'Specific period',
    ]);
    expect(isChecked(screen, 'Monthly')).toBe(true);
    for (const other of ['Weekly', 'Every 3 months', 'Yearly', 'Specific period']) {
      expect(isChecked(screen, other)).toBe(false);
    }
    expect(screen.getByText('Recurring')).toBeTruthy();
    expect(screen.queryByLabelText(/^Recurring/)).toBeNull();
  });

  it('moves the choice between the chips and the line above them', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'Every 3 months');

    expect(isChecked(screen, 'Every 3 months')).toBe(true);
    expect(isChecked(screen, 'Monthly')).toBe(false);
    // The label of the chip, and the value on the Recurring line.
    expect(screen.getAllByText('Every 3 months')).toHaveLength(2);
  });

  it('reads Starts on, and offers an end date, once it is a specific period', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    expect(screen.queryByText('Starts on')).toBeNull();
    expect(screen.queryByLabelText(/^To,/)).toBeNull();

    await press(screen, 'Specific period');

    expect(screen.getByLabelText('Starts on, needed')).toBeTruthy();
    expect(screen.queryByLabelText(/^Due on/)).toBeNull();
    expect(screen.getByLabelText('To, not set, optional')).toBeTruthy();
    expect(screen.getByText('Ongoing — no end date')).toBeTruthy();
  });

  it('asks when it starts, not when it is due, for a specific period', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Specific period');

    await press(screen, 'Starts on, needed');

    // The page is named for what it asks, too.
    expect(screen.getByText('Starts on')).toBeTruthy();
    expect(screen.getByText('When does it start?')).toBeTruthy();
    expect(screen.queryByText('When is it due?')).toBeNull();
    expect(screen.queryByText('Due on')).toBeNull();
  });

  it('keeps the first due date when the bill becomes a period and back', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Due on, needed');
    await press(screen, 'Friday 9 October 2026');
    await press(screen, 'Done');

    await press(screen, 'Specific period');
    expect(screen.getByLabelText('Starts on, Fri Oct 9')).toBeTruthy();
    await press(screen, 'Yearly');
    expect(screen.getByLabelText('Due on, Fri Oct 9')).toBeTruthy();
  });

  it('forgets the end date on the way back to an open-ended schedule', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);
    expect(screen.getByLabelText('Starts on, Mon Jun 1')).toBeTruthy();
    expect(screen.getByLabelText('To, Thu Dec 31')).toBeTruthy();

    await press(screen, 'Weekly');
    expect(screen.queryByLabelText(/^To,/)).toBeNull();
    expect(screen.getByLabelText('Due on, Mon Jun 1')).toBeTruthy();

    await press(screen, 'Specific period');
    expect(screen.getByLabelText('Starts on, Mon Jun 1')).toBeTruthy();
    expect(screen.getByLabelText('To, not set, optional')).toBeTruthy();
  });

  it('drops an end date the new start has passed', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Starts on, Mon Jun 1');
    expect(screen.getByText('When does it start?')).toBeTruthy();
    for (let month = 0; month < 7; month += 1) await press(screen, 'Next month');
    await press(screen, 'Friday 1 January 2027');
    await press(screen, 'Done');

    expect(screen.getByLabelText('Starts on, Fri Jan 1')).toBeTruthy();
    expect(screen.getByLabelText('To, not set, optional')).toBeTruthy();
  });

  it('keeps an end date the new start has not passed', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Starts on, Mon Jun 1');
    await press(screen, 'Next month');
    await press(screen, 'Wednesday 1 July 2026');
    await press(screen, 'Done');

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

      await press(screen, 'To, not set, optional');

      expect(screen.getByLabelText('Friday 9 October 2026')).toBeDisabled();
      expect(screen.getByLabelText('Saturday 10 October 2026')).toBeEnabled();
      expect(screen.getByLabelText('Sunday 11 October 2026')).toBeEnabled();
    });

    it('may be left empty: Done is allowed with no day', async () => {
      editing(STARTS_OCT_10);
      const screen = await render(<AddBillScreen />);

      await press(screen, 'To, not set, optional');
      expect(screen.getByLabelText('Done')).toBeEnabled();
      await press(screen, 'Done');

      expect(screen.getByLabelText('To, not set, optional')).toBeTruthy();
    });

    it('keeps a day on Done and leaves the end as it was on Back', async () => {
      editing(STARTS_OCT_10);
      const screen = await render(<AddBillScreen />);

      await press(screen, 'To, not set, optional');
      await press(screen, 'Sunday 11 October 2026');
      await press(screen, 'Back');
      expect(screen.getByLabelText('To, not set, optional')).toBeTruthy();

      await press(screen, 'To, not set, optional');
      await press(screen, 'Sunday 11 October 2026');
      await press(screen, 'Done');
      expect(screen.getByLabelText('To, Sun Oct 11')).toBeTruthy();
    });

    it('clears with the link and returns at once', async () => {
      editing(PERIOD);
      const screen = await render(<AddBillScreen />);

      await press(screen, 'To, Thu Dec 31');
      expect(screen.getByLabelText('Thursday 31 December 2026').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
      await press(screen, 'Clear — make it ongoing');

      onFinalPage(screen);
      expect(screen.getByLabelText('To, not set, optional')).toBeTruthy();
    });
  });
});

describe('Add bill — a bill that arrives with lines missing', () => {
  it('invites the amount a voice hand-off did not hear, never drawing $0', async () => {
    mockParams = { prefillCategory: 'internet', prefillDate: '2026-10-09' };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    expect(screen.queryByText('Tap to edit')).toBeNull();
    expect(screen.queryByText(/\$0/)).toBeNull();
    expect(screen.getByLabelText('Save bill')).toBeDisabled();
    await pressButton(screen, 'Amount, needed');
    await typeAmount(screen, '80');
    await press(screen, 'Done');

    expect(screen.getByRole('button', { name: 'Amount, $80.00' })).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeEnabled();
  });

  it('waits for a day on the due date page of a bill that has none', async () => {
    mockParams = { prefillCategory: 'internet', prefillAmount: '80' };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Due on, needed');
    expect(screen.getByLabelText('Done')).toBeDisabled();
    await press(screen, 'Friday 9 October 2026');
    expect(screen.getByLabelText('Done')).toBeEnabled();
    await press(screen, 'Done');

    expect(screen.getByLabelText('Due on, Fri Oct 9')).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeEnabled();
  });

  it('opens a bill with a past due day on the day it names', async () => {
    mockParams = {
      prefillCategory: 'internet',
      prefillAmount: '80',
      prefillDate: '2026-10-09',
      prefillCycle: 'quarterly',
    };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Due on, Fri Oct 9')).toBeTruthy();
    expect(isChecked(screen, 'Every 3 months')).toBe(true);
  });
});

describe('Add bill — what Save waits for', () => {
  it.each([
    [
      'an amount',
      { prefillCategory: 'internet', prefillDate: '2026-10-09' },
      async (screen: Screen) => {
        await pressButton(screen, 'Amount, needed');
        await typeAmount(screen, '80');
        await press(screen, 'Done');
      },
    ],
    [
      'a name',
      { prefillCategory: 'other', prefillAmount: '80', prefillDate: '2026-10-09' },
      async (screen: Screen) => {
        await press(screen, 'Name, needed');
        await fireEvent.changeText(nameInput(screen), 'Gym');
        await press(screen, 'Done');
      },
    ],
    [
      'a category',
      { prefillName: 'Water', prefillAmount: '80', prefillDate: '2026-10-09' },
      async (screen: Screen) => {
        await press(screen, 'Category, needed');
        await press(screen, TILE.housing);
      },
    ],
    [
      'a due date',
      { prefillCategory: 'internet', prefillAmount: '80' },
      async (screen: Screen) => {
        await press(screen, 'Due on, needed');
        await press(screen, 'Friday 9 October 2026');
        await press(screen, 'Done');
      },
    ],
  ])('is held back without %s, and freed by giving it', async (_what, params, give) => {
    mockParams = params;
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText(/^Tap to add/)).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Save bill'));
    expect(mockCreate).not.toHaveBeenCalled();

    await give(screen);

    expect(screen.queryByText(/^Tap to add/)).toBeNull();
    expect(screen.getByLabelText('Save bill')).toBeEnabled();
    await press(screen, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });

  it('draws the lines it waits for as gaps to fill, and the optional ones as quiet', async () => {
    mockParams = { prefillCategory: 'other' };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Tap to add the amount')).toBeTruthy();
    expect(screen.getByLabelText('Name, needed')).toBeTruthy();
    expect(screen.getByLabelText('Due on, needed')).toBeTruthy();
    expect(screen.getByLabelText('Category, Other bill')).toBeTruthy();
    // Nothing is flagged as wrong before anyone has tried to save.
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    expect(screen.getByLabelText('Note, not set, optional')).toBeTruthy();
  });
});

describe('Add bill — the name follows the category only while it is a default', () => {
  it('renames an untouched default when the category changes on the way back', async () => {
    const screen = await render(<AddBillScreen />);
    await press(screen, TILE.internet);
    await press(screen, 'Back');

    await press(screen, TILE.mobile);
    await typeAmount(screen, '80');
    await press(screen, 'Continue');

    expect(screen.getByLabelText('Name, Mobile Phone')).toBeTruthy();
  });

  it('renames an untouched default when the category changes on the final page', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    expect(screen.getByLabelText('Name, Internet')).toBeTruthy();

    await press(screen, 'Category, Internet');
    await press(screen, TILE.insurance);

    expect(screen.getByLabelText('Category, Insurance')).toBeTruthy();
    expect(screen.getByLabelText('Name, Insurance')).toBeTruthy();
  });

  it('keeps a name that was typed', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Name, Internet');
    await fireEvent.changeText(screen.getByDisplayValue('Internet'), 'Home fibre');
    await press(screen, 'Done');

    await press(screen, 'Category, Internet');
    await press(screen, TILE.insurance);

    expect(screen.getByLabelText('Category, Insurance')).toBeTruthy();
    expect(screen.getByLabelText('Name, Home fibre')).toBeTruthy();
  });

  it('keeps the name of the company picked for it', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');
    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();

    await press(screen, 'Category, Internet');
    await press(screen, TILE.mobile);

    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();
  });

  it('empties the name of a bill that becomes Other, which asks for one', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');

    await press(screen, 'Category, Internet');
    await press(screen, TILE.other);

    expect(screen.getByLabelText('Name, needed')).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeDisabled();
  });

  it('names an unnamed Other bill after the category it becomes', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.other, '80');
    expect(screen.getByLabelText('Name, needed')).toBeTruthy();

    await press(screen, 'Category, Other bill');
    await press(screen, TILE.housing);

    expect(screen.getByLabelText('Name, Housing')).toBeTruthy();
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
    expect(screen.getByLabelText('Name, Rent')).toBeTruthy();

    await press(screen, 'Category, Housing');
    await press(screen, TILE.insurance);

    expect(screen.getByLabelText('Name, Rent')).toBeTruthy();
  });

  it('keeps the name of a saved bill when its category changes', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Category, Electricity & Gas');
    await press(screen, TILE.housing);

    expect(screen.getByLabelText('Name, Power')).toBeTruthy();
    expect(screen.getByLabelText('Category, Housing')).toBeTruthy();
  });

  it('names a bill after its company while the name is still the category’s', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    expect(screen.getByLabelText('Name, Internet')).toBeTruthy();

    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');

    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();
    expect(screen.getByLabelText('Category, Internet')).toBeTruthy();
  });

  it('names an unnamed Other bill after its company', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.other, '80');
    expect(screen.getByLabelText('Name, needed')).toBeTruthy();

    await chooseCompany(screen, 'Search for a company', 'Comcast');

    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeDisabled();
  });

  it('does not rename a bill that was named by hand when a company is picked', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await press(screen, 'Name, Internet');
    await fireEvent.changeText(screen.getByDisplayValue('Internet'), 'Home fibre');
    await press(screen, 'Done');

    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');

    expect(screen.getByLabelText('Name, Home fibre')).toBeTruthy();
    expect(screen.getByLabelText('Change company, currently Comcast')).toBeTruthy();
  });

  it('does not rename a saved bill when a company is picked for it', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await chooseCompany(screen, 'AEP, Duke Energy, National Grid', 'Greystar');

    expect(screen.getByLabelText('Name, Power')).toBeTruthy();
  });

  it('keeps the name when the company is taken off', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');
    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();

    await press(screen, 'Change company, currently Comcast');

    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();
    expect(screen.getByPlaceholderText('Xfinity, Spectrum, Verizon')).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeDisabled();
  });

  it('follows the category again only for a name that is the category’s, once the company is off', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '80');
    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');
    await press(screen, 'Change company, currently Comcast');

    await press(screen, 'Category, Internet');
    await press(screen, TILE.mobile);

    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();
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
