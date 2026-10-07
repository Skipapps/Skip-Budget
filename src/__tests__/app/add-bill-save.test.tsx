import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddBillScreen from '@/app/add-bill';
import type { KnownStore } from '@/api/known-stores';
import { LOGO_COPY } from '@/components/brands/logo-choices';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { logoHints } from '@/lib/logo-lookup';

/**
 * Golden: exactly what the bill form's Save writes. Pins the object handed to create/update, the
 * words of the checks inside Save, the icon rule (only an Other bill keeps an icon of its own),
 * 'period', `starts_on` through floorAfterCharges, the order of the past-charges question, the
 * write and the reminder, and the logo columns.
 *
 * The pages are the real ones, walked the way a person walks them (category grid, keypad, company
 * search, calendar, card tiles, reminder chips, note); only the network and the logo images are
 * replaced. The one exception is the primary button, a stub that accepts a press even while
 * disabled: the only way to reach the checks inside Save, which the final page normally holds back.
 * It still reports its disabled state.
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

const mockConfirm = jest.fn(async (_: object) => true);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
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

const mockPast = {
  lastChargedOn: null as string | null,
  ready: true,
  saving: false,
  choose: jest.fn(async () => 'upcoming' as 'upcoming' | 'all' | null),
  apply: jest.fn(async () => {}),
  retry: jest.fn(),
};
jest.mock('@/api/past-charges', () => ({ usePastCharges: () => mockPast }));

// The real choices and lead conversion; only the table reads and writes are replaced.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
const mockApplyReminder = jest.fn(async () => {});
let mockSavedReminder = { choice: 'off', remindAt: '09:00' };
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
  useReminderChoice: () => mockSavedReminder,
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
let mockPending = false;
jest.mock('@/api/mutations', () => ({
  useCreateBill: () => ({ mutateAsync: mockCreate, isPending: mockPending }),
  useUpdateBill: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteBill: () => ({ mutateAsync: mockDelete, isPending: false }),
}));

const BRANDS = [
  // A spend category: a bill must never take it as its own.
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

// What the logo service answers for a company the catalogue does not know, and what it was asked.
const TOWN_POWER_LOGO = {
  matched: true,
  name: 'Town Power',
  domain: 'townpower.example',
  confidence: 0.97,
  margin: 0.9,
  candidates: [],
};
// A company in our own logo list: found by its exact name, with nothing else close.
const METRO_HYDRO_LOGO = {
  matched: true,
  name: 'Metro Hydro',
  domain: 'metrohydro.example',
  confidence: 0.99,
  margin: 0.9,
  kind: 'alias',
  candidates: [{ domain: 'metrohydro.example', name: 'Metro Hydro', confidence: 0.99 }],
};
const mockLogoAnswer = jest.fn();
const mockLogoHints: unknown[] = [];

// The companies this person added before, and the answers written down for the next time.
let mockKnown: KnownStore[] = [];
const mockRemember = jest.fn(async (_store: KnownStore) => {});
jest.mock('@/api/known-stores', () => ({
  ...jest.requireActual('@/api/known-stores'),
  useKnownStores: () => mockKnown,
  useRememberStore: () => mockRemember,
}));
jest.mock('@/api/logos', () => ({
  useLogoMatch: (name: string, hints: unknown) => {
    if (name) mockLogoHints.push(hints);
    return { data: mockLogoAnswer(name), isLoading: false, isFetching: false };
  },
}));

const SOURCES = [
  { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
  { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
];
let mockBill: { data: unknown; isError: boolean; isFetched: boolean };
let mockLoan: unknown = null;
jest.mock('@/api/queries', () => ({
  useBill: () => ({ ...mockBill, refetch: jest.fn() }),
  useLoanForBill: () => ({ data: mockLoan }),
  usePaymentSources: () => ({ sources: SOURCES }),
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
  next_due_on: '2026-09-01',
  starts_on: '2026-01-01',
  ends_on: null,
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  brand_id: null,
  brands: null,
};

// A saved period bill: its first day is `starts_on`, whatever `next_due_on` has moved to.
const PERIOD = {
  ...POWER,
  recurrence: 'period',
  starts_on: '2026-06-01',
  next_due_on: '2026-10-01',
  ends_on: '2026-12-31',
};

const TILE = {
  housing: 'Housing. Rent, mortgage, HOA fees',
  internet: 'Internet. Home broadband and Wi-Fi',
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

/** The Name page holds one text box, and an Other bill's is empty until someone names it. */
const nameInput = (screen: Screen) => screen.getByDisplayValue('');

/** Types into the company box on the final page the way a finger does: a tap into it, then the letters. */
async function searchCompany(screen: Screen, placeholder: string, text: string) {
  const input = screen.getByPlaceholderText(placeholder);
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Picks a company the catalogue knows from the box on the final page. */
async function chooseCompany(screen: Screen, placeholder: string, text: string, result = text) {
  await searchCompany(screen, placeholder, text);
  await fireEvent.press(await screen.findByLabelText(result));
}

/** A blank bill as far as its final page: pick the category, type the amount, Continue. */
async function newBill(screen: Screen, tile: string, amount: string) {
  await press(screen, tile);
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
}

/**
 * Opens the calendar from `row`, pages `ahead` months on from where it opens, picks the day and
 * keeps it.
 */
async function pickDay(screen: Screen, row: string, day: string, ahead = 0) {
  await press(screen, row);
  for (let step = 0; step < ahead; step += 1) await press(screen, 'Next month');
  await press(screen, day);
  await press(screen, 'Done');
}

/** Opens Paid with, picks a card or account and keeps it. */
async function payWith(screen: Screen, row: string, source: string) {
  await press(screen, row);
  await press(screen, source);
  await press(screen, 'Done');
}

const editing = (bill: Record<string, unknown>) => {
  mockParams = { id: String(bill.id) };
  mockBill = { data: bill, isError: false, isFetched: true };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockPending = false;
  mockBill = { data: null, isError: false, isFetched: false };
  mockLoan = null;
  mockSavedReminder = { choice: 'off', remindAt: '09:00' };
  mockPast.lastChargedOn = null;
  mockPast.ready = true;
  mockPast.choose.mockResolvedValue('upcoming');
  mockKnown = [];
  mockLogoAnswer.mockImplementation((name: string) =>
    name === 'Town Power' ? TOWN_POWER_LOGO : name === 'Metro Hydro' ? METRO_HYDRO_LOGO : null,
  );
  mockLogoHints.length = 0;
  mockCreate.mockResolvedValue({ id: 'bill-new' });
  mockUpdate.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
});

describe('Add bill — what a new bill saves', () => {
  it('goes category, amount, final page and writes the category label as the name', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '1100');
    expect(screen.getByLabelText('Name, Housing')).toBeTruthy();
    await payWith(screen, 'Paid with, not set, optional', 'Checking ••0099');
    await pickDay(screen, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(screen, 'Save bill');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Housing',
      amount: 1100,
      brand_id: null,
      category_id: 'housing',
      icon_id: null,
      recurrence: 'monthly',
      next_due_on: '2026-11-01',
      starts_on: '2026-11-01',
      ends_on: null,
      card_id: null,
      bank_account_id: 'acct-1',
      note: null,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Housing', false);
    expect(mockPast.apply).not.toHaveBeenCalled();
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', null, '09:00');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it("names the bill after its company and keeps the bill's own category", async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.internet, '0.10');
    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');
    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();
    await payWith(screen, 'Paid with, not set, optional', 'VISA ••4421');
    await pickDay(screen, 'Due on, needed', 'Thursday 15 October 2026');
    await press(screen, 'Yearly');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Comcast',
      amount: 0.1,
      brand_id: 'b-cc',
      category_id: 'internet',
      icon_id: null,
      recurrence: 'yearly',
      next_due_on: '2026-10-15',
      starts_on: '2026-10-15',
      ends_on: null,
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
    });
  });

  it('keeps the icon an Other bill was given, and trims its name and note', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.other, '15.99');
    // Nothing names an Other bill until someone does.
    expect(screen.getByLabelText('Name, needed')).toBeTruthy();
    await press(screen, 'Name, needed');
    await fireEvent.changeText(nameInput(screen), '  Gym  ');
    await press(screen, 'Pets');
    await press(screen, 'Done');
    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Anything worth remembering'),
      '  Off-peak  ',
    );
    await press(screen, 'Done');
    await pickDay(screen, 'Due on, needed', 'Saturday 3 October 2026');
    await press(screen, 'Weekly');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Gym',
      amount: 15.99,
      brand_id: null,
      category_id: 'other',
      icon_id: 'pets',
      recurrence: 'weekly',
      next_due_on: '2026-10-03',
      starts_on: '2026-10-03',
      ends_on: null,
      card_id: null,
      bank_account_id: null,
      note: 'Off-peak',
    });
  });

  it("saves the picker's own 'other' icon for an Other bill nobody changed", async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.other, '1030.5');
    await press(screen, 'Name, needed');
    await fireEvent.changeText(nameInput(screen), 'Storage unit');
    await press(screen, 'Done');
    await pickDay(screen, 'Due on, needed', 'Tuesday 20 October 2026');
    await press(screen, 'Every 3 months');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Storage unit',
      amount: 1030.5,
      icon_id: 'other',
      recurrence: 'quarterly',
      starts_on: '2026-10-20',
    });
  });

  it("writes a specific period as 'period', starting on its own first day", async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.insurance, '0.10');
    await pickDay(screen, 'Due on, needed', 'Monday 5 October 2026');
    await press(screen, 'Specific period');
    // October to March, from the page the calendar opens on.
    await pickDay(screen, 'To, not set, optional', 'Wednesday 31 March 2027', 5);
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Insurance',
      amount: 0.1,
      brand_id: null,
      category_id: 'insurance',
      icon_id: null,
      recurrence: 'period',
      next_due_on: '2026-10-05',
      starts_on: '2026-10-05',
      ends_on: '2027-03-31',
      card_id: null,
      bank_account_id: null,
      note: null,
    });
  });

  it('leaves a period with no end date open-ended', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.insurance, '42');
    await pickDay(screen, 'Due on, needed', 'Monday 5 October 2026');
    await press(screen, 'Specific period');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      recurrence: 'period',
      starts_on: '2026-10-05',
      ends_on: null,
    });
  });

  it('drops an end date picked for a period once the bill goes back to repeating', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.insurance, '42');
    await pickDay(screen, 'Due on, needed', 'Monday 5 October 2026');
    await press(screen, 'Specific period');
    await pickDay(screen, 'To, not set, optional', 'Thursday 15 October 2026');
    expect(screen.getByLabelText('To, Thu Oct 15')).toBeTruthy();
    await press(screen, 'Monthly');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    // The first due date stays: every bill needs one.
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      recurrence: 'monthly',
      next_due_on: '2026-10-05',
      starts_on: '2026-10-05',
      ends_on: null,
    });
  });

  it.each([
    ['1100', 1100],
    ['15.99', 15.99],
    ['0.10', 0.1],
    ['1030.5', 1030.5],
    ['999999999.99', 999999999.99],
  ])('saves a typed %s as exactly %p dollars', async (typed, saved) => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, typed);
    await pickDay(screen, 'Due on, needed', 'Thursday 15 October 2026');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(saved);
  });

  it('saves the amount as corrected on the final page, not as first typed', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '49.11');
    await pickDay(screen, 'Due on, needed', 'Thursday 15 October 2026');

    await pressButton(screen, 'Amount, $49.11');
    for (let key = 0; key < 5; key += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '1100');
    await press(screen, 'Done');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(1100);
  });

  it('files a card under card_id and leaves the account column empty', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '12');
    await payWith(screen, 'Paid with, not set, optional', 'VISA ••4421');
    await pickDay(screen, 'Due on, needed', 'Thursday 15 October 2026');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ card_id: 'card-1', bank_account_id: null });
  });
});

describe('Add bill — the order of a save', () => {
  it('asks about past charges before it writes, and sets the reminder once the bill exists', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '1100');
    await pickDay(screen, 'Due on, needed', 'Thursday 15 October 2026');
    await press(screen, 'Reminder, not set, optional');
    await press(screen, '3 days');
    await press(screen, 'Done');
    expect(screen.getByLabelText('Reminder, 3 days before · 9:00 AM')).toBeTruthy();
    await press(screen, 'Save bill');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', 3, '09:00');
    const asked = mockPast.choose.mock.invocationCallOrder[0];
    const written = mockCreate.mock.invocationCallOrder[0];
    const reminded = mockApplyReminder.mock.invocationCallOrder[0];
    expect(asked).toBeLessThan(written);
    expect(written).toBeLessThan(reminded);
  });

  it('rewrites past charges between the write and the reminder', async () => {
    mockPast.choose.mockResolvedValue('all');
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await pressButton(screen, 'Amount, $84.20');
    await press(screen, 'Delete last digit');
    await typeAmount(screen, '25');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockPast.apply).toHaveBeenCalledWith({
      label: 'Power',
      amount: 84.25,
      card_id: 'card-1',
      bank_account_id: null,
    });
    expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mockPast.apply.mock.invocationCallOrder[0],
    );
    expect(mockPast.apply.mock.invocationCallOrder[0]).toBeLessThan(
      mockApplyReminder.mock.invocationCallOrder[0],
    );
  });

  it('writes nothing when the past-charges question is dismissed', async () => {
    mockPast.choose.mockResolvedValue(null);
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockPast.choose).toHaveBeenCalledTimes(1));
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    // Still on the final page, ready for another try.
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
  });

  it('re-applies a reminder that was already on the bill, at its time', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Reminder, 3 days before · 8:30 AM')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', 3, '08:30');
  });

  it('keeps a reminder chosen here when the saved one arrives late', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Reminder, not set, optional');
    await press(screen, '1 week');
    await press(screen, 'Done');
    mockSavedReminder = { choice: '1', remindAt: '07:00' };
    await screen.rerender(<AddBillScreen />);
    expect(screen.getByLabelText('Reminder, 1 week before · 9:00 AM')).toBeTruthy();
    await press(screen, 'Save changes');

    // Done keeps the choice and the time the person saw on the page.
    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', 7, '09:00');
  });
});

describe('Add bill — what an edit saves', () => {
  it('writes the bill back as it was when nothing was touched', async () => {
    editing({ ...POWER, name: 'Rent', category_id: 'housing', icon_id: 'other' });
    const screen = await render(<AddBillScreen />);

    // Opens on the final page, already filled in: Save is the first thing to press.
    expect(screen.getByLabelText('Save changes')).toBeEnabled();
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'bill-1',
      values: {
        name: 'Rent',
        amount: 84.2,
        brand_id: null,
        category_id: 'housing',
        // Housing wears its category's icon; a stored 'other' is dropped.
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2026-09-01',
        starts_on: '2026-09-01',
        ends_on: null,
        card_id: 'card-1',
        bank_account_id: null,
        note: null,
      },
    });
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', null, '09:00');
  });

  it('floors the start after the last charge when the due date moves inside a charged month', async () => {
    mockPast.lastChargedOn = '2026-09-01';
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await pickDay(screen, 'Due on, Tue Sep 1', 'Tuesday 15 September 2026');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_due_on: '2026-09-15',
      starts_on: '2026-10-01',
    });
  });

  it('keeps a start that is already past the floor', async () => {
    mockPast.lastChargedOn = '2026-09-01';
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await pickDay(screen, 'Due on, Tue Sep 1', 'Tuesday 20 October 2026', 1);
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_due_on: '2026-10-20',
      starts_on: '2026-10-20',
    });
  });

  it('never floors a set period, which keeps its own first day', async () => {
    mockPast.lastChargedOn = '2026-09-01';
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);

    // The line says where the period starts, not where the bill is next due.
    expect(screen.getByLabelText('Starts on, Mon Jun 1')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'period',
      next_due_on: '2026-06-01',
      starts_on: '2026-06-01',
      ends_on: '2026-12-31',
    });
  });

  it('drops the end date when a period bill becomes monthly', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Monthly');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'monthly',
      next_due_on: '2026-06-01',
      starts_on: '2026-06-01',
      ends_on: null,
    });
  });

  it('keeps an end date a repeating bill already had', async () => {
    editing({ ...POWER, ends_on: '2027-01-31' });
    const screen = await render(<AddBillScreen />);

    // A repeating bill has no "To" line to show it, but Save does not lose it.
    expect(screen.queryByLabelText(/^To,/)).toBeNull();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'monthly',
      ends_on: '2027-01-31',
    });
  });

  it('moves the end of a period and clears it again', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);

    await pickDay(screen, 'To, Thu Dec 31', 'Thursday 31 December 2026', 0);
    await press(screen, 'Save changes');
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values.ends_on).toBe('2026-12-31');

    mockUpdate.mockClear();
    await press(screen, 'To, Thu Dec 31');
    await press(screen, 'Clear — make it ongoing');
    expect(screen.getByLabelText('To, not set, optional')).toBeTruthy();
    await press(screen, 'Save changes');
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'period',
      ends_on: null,
    });
  });

  it('asks about past charges with what changed, and rewrites them with the new figures', async () => {
    mockPast.choose.mockResolvedValue('all');
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await pressButton(screen, 'Amount, $84.20');
    for (let key = 0; key < 4; key += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '1030.5');
    await press(screen, 'Done');
    await payWith(screen, 'Paid with, VISA ••4421', 'Checking ••0099');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledWith('Power', true);
    expect(mockPast.apply).toHaveBeenCalledWith({
      label: 'Power',
      amount: 1030.5,
      card_id: null,
      bank_account_id: 'acct-1',
    });
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      amount: 1030.5,
      card_id: null,
      bank_account_id: 'acct-1',
    });
  });

  it('asks about past charges when only the name changed', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Name, Power');
    await fireEvent.changeText(screen.getByDisplayValue('Power'), 'Electric');
    await press(screen, 'Done');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledWith('Electric', true);
    expect(mockUpdate.mock.calls[0][0].values.name).toBe('Electric');
  });

  it('says nothing changed when nothing did', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledWith('Power', false);
  });

  it('takes the card off a bill with No card or account', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Paid with, VISA ••4421');
    await press(screen, 'No card or account');
    await press(screen, 'Done');
    expect(screen.getByLabelText('Paid with, not set, optional')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Power', true);
  });
});

describe('Add bill — the checks inside Save', () => {
  /** An Other bill that arrived with nothing but its category: name, amount and date all missing. */
  const blankOther = () => {
    mockParams = { prefillCategory: 'other' };
  };

  it('asks for a name, then the amount, then the date, each on the final page', async () => {
    blankOther();
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Save bill')).toBeDisabled();
    await press(screen, 'Save bill');
    expect(screen.getByText('Give the bill a name.')).toBeTruthy();
    expect(warn).toHaveBeenCalled();

    await press(screen, 'Name, needed');
    await fireEvent.changeText(nameInput(screen), 'Gym');
    await press(screen, 'Done');
    await press(screen, 'Save bill');
    expect(screen.getByText('Enter how much it costs.')).toBeTruthy();
    expect(screen.queryByText('Give the bill a name.')).toBeNull();

    await pressButton(screen, 'Amount, needed');
    await typeAmount(screen, '25');
    await press(screen, 'Done');
    await press(screen, 'Save bill');
    expect(screen.getByText('Pick the first due date.')).toBeTruthy();
    expect(screen.queryByText('Enter how much it costs.')).toBeNull();

    await press(screen, 'Specific period');
    await press(screen, 'Save bill');
    expect(screen.getByText('Pick the date it starts.')).toBeTruthy();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPast.choose).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
  });

  it('counts a name of spaces as no name', async () => {
    blankOther();
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Name, needed');
    await fireEvent.changeText(nameInput(screen), '   ');
    // Done waits for something to keep.
    expect(screen.getByLabelText('Done')).toBeDisabled();
    await press(screen, 'Back');
    await press(screen, 'Save bill');

    expect(screen.getByText('Give the bill a name.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('refuses a period that ends before it starts', async () => {
    editing({
      ...PERIOD,
      starts_on: '2026-10-10',
      next_due_on: '2026-10-10',
      ends_on: '2026-10-01',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    expect(screen.getByText('The end date cannot be before the start date.')).toBeTruthy();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockPast.choose).not.toHaveBeenCalled();
  });

  // The final page has no step to move on from, so keeping a change on a page is what clears a
  // message about it; otherwise a fixed problem shows in red above an enabled Save.
  it('drops the message once the end date it names has been fixed', async () => {
    editing({
      ...PERIOD,
      starts_on: '2026-10-10',
      next_due_on: '2026-10-10',
      ends_on: '2026-10-01',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');
    expect(screen.getByText('The end date cannot be before the start date.')).toBeTruthy();
    await press(screen, 'To, Thu Oct 1');
    await press(screen, 'Clear — make it ongoing');

    expect(screen.getByLabelText('To, not set, optional')).toBeTruthy();
    expect(screen.queryByText('The end date cannot be before the start date.')).toBeNull();
  });

  it('lets a period end on the day it starts', async () => {
    editing({
      ...PERIOD,
      starts_on: '2026-10-10',
      next_due_on: '2026-10-10',
      ends_on: '2026-10-10',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      starts_on: '2026-10-10',
      ends_on: '2026-10-10',
    });
  });

  it('says the one failure line and writes nothing while past charges cannot be read', async () => {
    mockPast.ready = false;
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(mockPast.retry).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says the one failure line, stays on the form, and saves on the next try', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '1100');
    await pickDay(screen, 'Due on, needed', 'Thursday 15 October 2026');

    await press(screen, 'Save bill');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(screen.getByText('You can edit this later.')).toBeTruthy();
    expect(screen.getByLabelText('Save bill')).toBeEnabled();

    await press(screen, 'Save bill');
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(FAILURE_MESSAGE)).toBeNull();
    log.mockRestore();
  });

  it('holds Save, saying so, while the write is in flight', async () => {
    mockPending = true;
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    expect(screen.queryByLabelText('Save changes')).toBeNull();
    expect(screen.getByLabelText('Saving…')).toBeDisabled();
  });

  it('holds Save, saying so, while past charges are being rewritten', async () => {
    mockPast.saving = true;
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Saving…')).toBeDisabled();
    mockPast.saving = false;
  });
});

describe('Add bill — the logo', () => {
  const ENERGY_SEARCH = 'AEP, Duke Energy, National Grid';

  /** A new Energy bill on its final page, with a company the catalogue does not know just added. */
  async function addTownPower() {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, 'Electricity & Gas. Power, heating, cooking gas', '84.2');
    await searchCompany(screen, ENERGY_SEARCH, 'Town Power');
    await fireEvent.press(await screen.findByLabelText('Add Town Power as a new company'));
    return screen;
  }

  it('asks the logo service for the bill’s category, with the icon as its "no logo"', async () => {
    const screen = await addTownPower();

    expect(mockLogoHints).toContainEqual(logoHints('energy'));
    expect(mockLogoHints).not.toContainEqual({});
    expect(screen.getByLabelText(LOGO_COPY.icon)).toBeTruthy();
    expect(screen.queryByLabelText(LOGO_COPY.letters)).toBeNull();
  });

  it('saves the logo confirmed for a company the catalogue does not know', async () => {
    const screen = await addTownPower();

    await fireEvent.press(await screen.findByLabelText(LOGO_COPY.yes));
    // Named after the company, with its logo drawn on the Name line and in the box.
    expect(screen.getByLabelText('Name, Town Power')).toBeTruthy();
    expect(screen.getByTestId('logo-40')).toHaveTextContent('Town Power|townpower.example');
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Town Power|townpower.example');
    await pickDay(screen, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Town Power',
      brand_id: null,
      category_id: 'energy',
      logo_domain: 'townpower.example',
      logo_hidden: false,
    });
  });

  it('gives a company in our own logo list its logo with no question, and saves it', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, 'Electricity & Gas. Power, heating, cooking gas', '84.2');
    await searchCompany(screen, ENERGY_SEARCH, 'Metro Hydro');
    await fireEvent.press(await screen.findByLabelText('Add Metro Hydro as a new company'));

    expect(screen.queryByLabelText(LOGO_COPY.icon)).toBeNull();
    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.queryByText(/^Looks like/)).toBeNull();
    expect(screen.getByLabelText('Name, Metro Hydro')).toBeTruthy();
    expect(screen.getByTestId('logo-40')).toHaveTextContent('Metro Hydro|metrohydro.example');
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Metro Hydro|metrohydro.example');
    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();
    await pickDay(screen, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Metro Hydro',
      brand_id: null,
      category_id: 'energy',
      logo_domain: 'metrohydro.example',
      logo_hidden: false,
    });
    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Metro Hydro',
        logoDomain: 'metrohydro.example',
        logoHidden: false,
      }),
    );
  });

  it('still asks when the service only half knows the name', async () => {
    mockLogoAnswer.mockImplementation(() => ({ ...METRO_HYDRO_LOGO, kind: 'fuzzy' }));
    const screen = await render(<AddBillScreen />);
    await newBill(screen, 'Electricity & Gas. Power, heating, cooking gas', '84.2');
    await searchCompany(screen, ENERGY_SEARCH, 'Metro Hydra');
    await fireEvent.press(await screen.findByLabelText('Add Metro Hydra as a new company'));

    expect(screen.getByLabelText(LOGO_COPY.yes)).toBeTruthy();
    await pickDay(screen, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(screen, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
  });

  it('offers a company added before first, with its logo, and asks nothing about it', async () => {
    mockKnown = [
      { name: 'Metro Hydro', categoryId: 'energy', logoDomain: 'old.example', logoHidden: false },
    ];
    const screen = await render(<AddBillScreen />);
    await newBill(screen, 'Electricity & Gas. Power, heating, cooking gas', '84.2');

    await searchCompany(screen, ENERGY_SEARCH, 'Metro');
    await fireEvent.press(await screen.findByLabelText('Metro Hydro'));

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.queryByLabelText(LOGO_COPY.icon)).toBeNull();
    expect(screen.getByLabelText('Name, Metro Hydro')).toBeTruthy();
    expect(screen.getByTestId('logo-40')).toHaveTextContent('Metro Hydro|old.example');
    expect(mockLogoAnswer).not.toHaveBeenCalledWith('Metro Hydro');
    await pickDay(screen, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Metro Hydro',
      brand_id: null,
      category_id: 'energy',
      logo_domain: 'old.example',
      logo_hidden: false,
    });
  });

  it('is not asked a second time: what was confirmed once is offered the next', async () => {
    const first = await addTownPower();
    await fireEvent.press(await first.findByLabelText(LOGO_COPY.yes));
    await pickDay(first, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(first, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockRemember).toHaveBeenCalledTimes(1);
    const remembered = mockRemember.mock.calls[0][0];
    await first.unmount();

    mockKnown = [remembered];
    mockCreate.mockClear();
    const second = await render(<AddBillScreen />);
    await newBill(second, 'Electricity & Gas. Power, heating, cooking gas', '90');
    await searchCompany(second, ENERGY_SEARCH, 'town');
    await fireEvent.press(await second.findByLabelText('Town Power'));

    expect(second.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(second.queryByLabelText(LOGO_COPY.icon)).toBeNull();
    await pickDay(second, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(second, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Town Power',
      amount: 90,
      logo_domain: 'townpower.example',
      logo_hidden: false,
    });
  });

  it('saves letters for a company whose logo was declined', async () => {
    const screen = await addTownPower();

    await fireEvent.press(await screen.findByLabelText(LOGO_COPY.icon));
    expect(screen.queryByTestId('logo-40')).toBeNull();
    await pickDay(screen, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Town Power',
      logo_domain: null,
      logo_hidden: true,
    });
  });

  it('writes no logo columns for a company picked from the catalogue, whose own logo is the default', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '0.10');
    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');
    expect(screen.getByTestId('logo-40')).toHaveTextContent('Comcast|comcast.com');
    await pickDay(screen, 'Due on, needed', 'Sunday 1 November 2026', 1);
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ brand_id: 'b-cc' });
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_hidden');
  });

  it('writes no logo columns when nobody answered the logo question', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '1100');
    await pickDay(screen, 'Due on, needed', 'Thursday 15 October 2026');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_hidden');
  });

  const WITH_COMPANY = {
    ...POWER,
    brand_id: 'b-cc',
    brands: { domain: 'comcast.com' },
    logo_domain: 'x.com',
  };

  it('an edit that keeps its company shows the row’s logo and leaves it alone', async () => {
    editing(WITH_COMPANY);
    const screen = await render(<AddBillScreen />);

    // On the Name line and in the company box, where the row's own choice shows.
    expect(screen.getByTestId('logo-40')).toHaveTextContent('Power|x.com');
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Power|x.com');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ brand_id: 'b-cc' });
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_domain');
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_hidden');
  });

  it('draws the category’s icon, not the logo, once the logo was turned off', async () => {
    editing({ ...WITH_COMPANY, logo_domain: null, logo_hidden: true });
    const screen = await render(<AddBillScreen />);

    expect(screen.queryByTestId('logo-40')).toBeNull();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ brand_id: 'b-cc' });
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_hidden');
  });

  it('an edit that takes the company off takes its logo with it, and keeps the name', async () => {
    editing(WITH_COMPANY);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Change company, currently Power');
    // The bill falls back to its category's icon, under the name it had.
    expect(screen.queryByTestId('logo-40')).toBeNull();
    expect(screen.queryByTestId('logo-32')).toBeNull();
    expect(screen.getByLabelText('Name, Power')).toBeTruthy();
    expect(screen.getByPlaceholderText(ENERGY_SEARCH)).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'Power',
      brand_id: null,
      logo_domain: null,
      logo_hidden: false,
    });
  });

  it('an edit that takes the company off and picks one from the catalogue writes the catalogue’s logo', async () => {
    editing(WITH_COMPANY);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Change company, currently Power');
    await chooseCompany(screen, ENERGY_SEARCH, 'Comcast');
    expect(screen.getByTestId('logo-40')).toHaveTextContent('Power|comcast.com');
    await press(screen, 'Save changes');

    // The earlier logo choice (x.com) went with the company that was taken off.
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'Power',
      brand_id: 'b-cc',
      logo_domain: null,
      logo_hidden: false,
    });
  });

  it('an edit that swaps the company for another keeps the name and drops the old logo', async () => {
    editing({ ...WITH_COMPANY, name: 'My power' });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Change company, currently My power');
    await chooseCompany(screen, ENERGY_SEARCH, 'Greystar');
    // The name is the person's own: a company picked after it does not rename the bill.
    expect(screen.getByLabelText('Name, My power')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'My power',
      brand_id: 'b-gs',
      logo_domain: null,
      logo_hidden: false,
    });
  });

  // A name a company gave the bill is not the person's own: replacing the company renames it, even
  // though the box can only replace one by taking it off first.
  it('names the bill after the second company when the first one gave it its name', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '0.10');
    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Comcast');
    expect(screen.getByLabelText('Name, Comcast')).toBeTruthy();

    await press(screen, 'Change company, currently Comcast');
    await chooseCompany(screen, 'Xfinity, Spectrum, Verizon', 'Greystar');

    expect(screen.getByLabelText('Name, Greystar')).toBeTruthy();
  });
});

describe('Add bill — a loan’s schedule', () => {
  // $20,000 over 60 months at 6.00%, 30/360: a payment of $386.66 whose first month is $100.00 of
  // interest and $286.66 off the balance.
  const LOAN = {
    id: 'loan-1',
    bill_id: 'bill-1',
    principal: 20000,
    annual_rate: 6,
    term_months: 60,
    monthly_payment: 386.66,
    total_interest: 3199.6,
    first_payment_on: '2026-11-01',
    funded_on: '2026-10-01',
    day_count_basis: '30/360',
    statement_on: null,
    statement_principal: null,
  };

  it('shows where the first payment goes on a bill that came from the loan calculator', async () => {
    mockLoan = LOAN;
    editing({ ...POWER, name: 'Car loan', category_id: 'loans', amount: 386.66 });
    const screen = await render(<AddBillScreen />);

    const card = screen.getByLabelText(
      'Where each payment goes. First payment: $100.00 interest, $286.66 off the balance. Opens the full schedule.',
    );
    expect(card).toBeTruthy();
    expect(
      screen.getByText(/of your first payment is interest — see all 60 payments/),
    ).toBeTruthy();

    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/loan-schedule',
      params: {
        amount: '20000',
        rate: '6',
        months: '60',
        start: '2026-11-01',
        funded: '2026-10-01',
        basis: '30/360',
        payment: '386.66',
        name: 'Car loan',
      },
    });
  });

  it('is not there for an ordinary bill', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    expect(screen.queryByText('Where each payment goes')).toBeNull();
  });
});
