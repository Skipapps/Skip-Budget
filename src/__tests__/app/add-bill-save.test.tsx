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
 * line Save shows for the answers still missing and the words of the checks inside it, the icon
 * rule (only an Other bill keeps an icon of its own), 'period', `starts_on` through
 * floorAfterCharges, the order of the past-charges question, the write and the reminder, and the
 * logo columns.
 *
 * The pages are the real ones, walked the way a person walks them (category grid, keypad, the Name
 * box, the day boxes, the Paid with pills, the reminder chips, note); only the network and the logo
 * images are replaced.
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
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
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

// A saved bill with a company behind its name and a logo chosen for it.
const WITH_COMPANY = {
  ...POWER,
  brand_id: 'b-cc',
  brands: { domain: 'comcast.com' },
  logo_domain: 'x.com',
};

const TILE = {
  housing: 'Housing. Rent, mortgage, HOA fees',
  energy: 'Electricity & Gas. Power, heating, cooking gas',
  internet: 'Internet. Home broadband and Wi-Fi',
  insurance: 'Insurance. Car, health, home, life',
  other: 'Other bill. Anything else you pay',
};

// What the Name box says before anything is typed in it, per category.
const HINT = {
  housing: 'Rent, mortgage or your landlord',
  energy: 'AEP, Duke Energy, National Grid',
  internet: 'Xfinity, Spectrum, Verizon',
};

// The day boxes, as a screen reader reads them while they are empty.
const PAYMENT_ON = 'Payment on, Select a date';
const STARTS_ON = 'Starts on, Select a date';
const ENDS_ON = 'To, Ongoing — no end date';

const MISSING = /^To save this bill, fill in:/;

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));

/** The amount is a button on the page and a figure inside it, both worded alike: by role, the button. */
const pressButton = (screen: Screen, name: string) =>
  fireEvent.press(screen.getByRole('button', { name }));

async function typeAmount(screen: Screen, digits: string) {
  for (const key of digits) await press(screen, key === '.' ? 'Decimal point' : key);
}

/**
 * Types into the Name box the way a finger does: a tap into it, then the letters. It is the only
 * text box on the page while the bill has no name, so without a placeholder it is the empty one.
 */
async function typeName(screen: Screen, text: string, placeholder?: string) {
  const input = placeholder
    ? screen.getByPlaceholderText(placeholder)
    : screen.getByDisplayValue('');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
}

/** Picks a company the catalogue knows from the Name box. */
async function chooseCompany(screen: Screen, placeholder: string, text: string, result = text) {
  await typeName(screen, text, placeholder);
  await fireEvent.press(await screen.findByLabelText(result));
}

/** A blank bill as far as its final page: pick the category, type the amount, Continue. */
async function newBill(screen: Screen, tile: string, amount: string) {
  await press(screen, tile);
  await typeAmount(screen, amount);
  await press(screen, 'Continue');
}

/**
 * Opens a day box, pages `ahead` months on from where its calendar opens, and picks the day. The
 * calendar folds away on its own: there is no Done.
 */
async function pickDay(screen: Screen, box: string, day: string, ahead = 0) {
  await press(screen, box);
  for (let step = 0; step < ahead; step += 1) await press(screen, 'Next month');
  await press(screen, day);
}

type Answers = {
  name?: string | null;
  day?: string | null;
  source?: string | null;
  reminder?: string | null;
};

/**
 * Answers what a new bill still asks once it has a category and an amount: a name, a day, how it
 * is paid and whether to remind. A test passes only what it is about; null leaves a question
 * unanswered, for a name already picked or a gap on purpose.
 */
async function fillIn(screen: Screen, answers: Answers = {}) {
  const { name, day, source, reminder } = {
    name: 'Rent',
    day: 'Thursday 15 October 2026',
    source: 'Skip',
    reminder: 'No reminder',
    ...answers,
  };
  if (name !== null) await typeName(screen, name);
  if (day !== null) await pickDay(screen, PAYMENT_ON, day);
  if (source !== null) await press(screen, source);
  if (reminder !== null) await press(screen, reminder);
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
  it('goes category, amount, final page and saves what was typed and picked', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '1100');
    // Nothing is filled in for the person.
    expect(screen.getByPlaceholderText(HINT.housing)).toBeTruthy();
    expect(screen.getByLabelText(PAYMENT_ON)).toBeTruthy();
    await typeName(screen, 'Rent');
    await pickDay(screen, PAYMENT_ON, 'Sunday 1 November 2026', 1);
    // The calendar folds away behind the day; nothing leaves the page.
    expect(screen.getByLabelText('Payment on, Sun Nov 1')).toBeTruthy();
    expect(screen.queryByLabelText('Next month')).toBeNull();
    await press(screen, 'Checking ••0099');
    await press(screen, 'No reminder');
    await press(screen, 'Save bill');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Rent',
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
    expect(mockPast.choose).toHaveBeenCalledWith('Rent', false);
    expect(mockPast.apply).not.toHaveBeenCalled();
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', null, '09:00');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it("names the bill after the company picked from the catalogue and keeps the bill's own category", async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.internet, '0.10');
    await chooseCompany(screen, HINT.internet, 'Comcast');
    expect(screen.getByLabelText('Change name, currently Comcast')).toBeTruthy();
    await fillIn(screen, { name: null, source: 'VISA ••4421' });
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

  it('saves a name that was only typed, trimmed, with no company behind it', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.internet, '60');
    await typeName(screen, '  Cable  ', HINT.internet);
    // Still a box with a suggestion under it, not a company picked.
    expect(screen.getByLabelText('Use Cable as the name')).toBeTruthy();
    expect(screen.queryByLabelText('Change name, currently Cable')).toBeNull();
    await fillIn(screen, { name: null });
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Cable',
      brand_id: null,
      category_id: 'internet',
    });
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_hidden');
  });

  // The Name box is drawn afresh each time a row's own page closes over the final page, so what
  // was typed has to come back with it, and still be what Save writes.
  it.each([
    ['note', (screen: Screen) => press(screen, 'Note, not set, optional')],
    ['category', (screen: Screen) => press(screen, 'Category, Other bill')],
    ['amount', (screen: Screen) => pressButton(screen, 'Amount, $25.00')],
  ])('still shows a typed name in the box after a visit to the %s page', async (_, open) => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.other, '25');
    await typeName(screen, 'Gym');

    await open(screen);
    await press(screen, 'Back');

    expect(screen.getByDisplayValue('Gym')).toBeTruthy();
    await fillIn(screen, { name: null });
    await press(screen, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ name: 'Gym', brand_id: null });
  });

  it('keeps the name a company was picked with when the category changes', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.internet, '60');
    await chooseCompany(screen, HINT.internet, 'Comcast');
    await press(screen, 'Category, Internet');
    await press(screen, TILE.insurance);
    expect(screen.getByLabelText('Category, Insurance')).toBeTruthy();
    expect(screen.getByLabelText('Change name, currently Comcast')).toBeTruthy();
    await fillIn(screen, { name: null });
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Comcast',
      brand_id: 'b-cc',
      category_id: 'insurance',
    });
  });

  it('gives a new Other bill the plain Other icon, and trims its name and note', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.other, '15.99');
    await press(screen, 'Note, not set, optional');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Anything worth remembering'),
      '  Off-peak  ',
    );
    await press(screen, 'Done');
    await fillIn(screen, { name: '  Gym  ', day: 'Saturday 3 October 2026' });
    await press(screen, 'Weekly');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Gym',
      amount: 15.99,
      brand_id: null,
      category_id: 'other',
      icon_id: 'other',
      recurrence: 'weekly',
      next_due_on: '2026-10-03',
      starts_on: '2026-10-03',
      ends_on: null,
      card_id: null,
      bank_account_id: null,
      note: 'Off-peak',
    });
  });

  it('gives a bill that is not Other no icon of its own', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '1030.5');
    await fillIn(screen, { day: 'Tuesday 20 October 2026' });
    await press(screen, 'Every 3 months');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      amount: 1030.5,
      icon_id: null,
      recurrence: 'quarterly',
      starts_on: '2026-10-20',
    });
  });

  it('saves today as the first payment day from the calendar’s Today', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '1100');
    await fillIn(screen, { day: null });
    await press(screen, PAYMENT_ON);
    await press(screen, 'Today');
    expect(screen.getByLabelText('Payment on, Today, Wed Oct 7')).toBeTruthy();
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      next_due_on: '2026-10-07',
      starts_on: '2026-10-07',
    });
  });

  it("writes a specific period as 'period', starting on its own first day", async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.insurance, '0.10');
    await fillIn(screen, { name: 'Renters', day: null });
    await press(screen, 'Specific period');
    // The day box now asks when the period starts.
    await pickDay(screen, STARTS_ON, 'Monday 5 October 2026');
    // October to March, from the page the calendar opens on.
    await pickDay(screen, ENDS_ON, 'Wednesday 31 March 2027', 5);
    expect(screen.getByLabelText('To, Wed Mar 31')).toBeTruthy();
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Renters',
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
    await fillIn(screen, { day: 'Monday 5 October 2026' });
    await press(screen, 'Specific period');
    expect(screen.getByLabelText(ENDS_ON)).toBeTruthy();
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
    await fillIn(screen, { day: 'Monday 5 October 2026' });
    await press(screen, 'Specific period');
    await pickDay(screen, ENDS_ON, 'Thursday 15 October 2026');
    expect(screen.getByLabelText('To, Thu Oct 15')).toBeTruthy();
    await press(screen, 'Monthly');
    expect(screen.queryByLabelText(/^To,/)).toBeNull();
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
    await fillIn(screen);
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(saved);
  });

  it('saves the amount as corrected on the final page, not as first typed', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '49.11');
    await fillIn(screen);

    await pressButton(screen, 'Amount, $49.11');
    for (let key = 0; key < 5; key += 1) await press(screen, 'Delete last digit');
    await typeAmount(screen, '1100');
    await press(screen, 'Done');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(1100);
  });

  it('keeps the answers already given when the amount page is visited and left', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '49.11');
    await fillIn(screen, { source: 'VISA ••4421', reminder: '3 days' });

    await pressButton(screen, 'Amount, $49.11');
    await press(screen, 'Back');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Rent',
      amount: 49.11,
      next_due_on: '2026-10-15',
      card_id: 'card-1',
    });
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', 3, '09:00');
  });

  it.each([
    ['a card', 'VISA ••4421', { card_id: 'card-1', bank_account_id: null }],
    ['a bank account', 'Checking ••0099', { card_id: null, bank_account_id: 'acct-1' }],
    ['Skip', 'Skip', { card_id: null, bank_account_id: null }],
  ])('paid with %s, saves the matching column and nulls the other', async (_, pill, columns) => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '12');
    await fillIn(screen, { source: pill });
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject(columns);
  });

  it('lets a second pill replace the first', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '12');
    await fillIn(screen, { source: 'VISA ••4421' });
    await press(screen, 'Checking ••0099');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      card_id: null,
      bank_account_id: 'acct-1',
    });
  });
});

describe('Add bill — the reminder a save applies', () => {
  it('applies "No reminder" as no lead at all, which stores nothing', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '12');
    await fillIn(screen, { reminder: 'No reminder' });
    expect(screen.queryByLabelText(/^Sent at/)).toBeNull();
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', null, '09:00');
  });

  it.each([
    ['On the day', 0],
    ['1 day', 1],
    ['3 days', 3],
    ['1 week', 7],
  ])('turns the %s chip into a lead of %p, at nine', async (chip, lead) => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '12');
    await fillIn(screen, { reminder: chip });
    expect(screen.getByLabelText('Sent at 9:00 AM. Change the time.')).toBeTruthy();
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', lead, '09:00');
  });

  it('applies the time picked on the clock along with the chip', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '12');
    await fillIn(screen, { reminder: '1 week' });

    await press(screen, 'Sent at 9:00 AM. Change the time.');
    await press(screen, 'PM');
    await press(screen, 'Confirm time');
    expect(screen.getByLabelText('Sent at 9:00 PM. Change the time.')).toBeTruthy();
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', 7, '21:00');
  });

  it('applies the last chip pressed', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '12');
    await fillIn(screen, { reminder: '1 week' });
    await press(screen, 'On the day');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', 0, '09:00');
  });
});

describe('Add bill — the order of a save', () => {
  it('asks about past charges before it writes, and sets the reminder once the bill exists', async () => {
    const screen = await render(<AddBillScreen />);

    await newBill(screen, TILE.housing, '1100');
    await fillIn(screen, { reminder: '3 days' });
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

    expect(screen.getByLabelText('3 days')).toBeSelected();
    expect(screen.getByLabelText('Sent at 8:30 AM. Change the time.')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', 3, '08:30');
  });

  it('keeps a reminder chosen here when the saved one arrives late', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, '1 week');
    mockSavedReminder = { choice: '1', remindAt: '07:00' };
    await screen.rerender(<AddBillScreen />);
    expect(screen.getByLabelText('1 week')).toBeSelected();
    await press(screen, 'Save changes');

    // The lead is the one picked here. No time was set here, so the saved bill's own stands.
    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', 7, '07:00');
  });

  it('keeps a time set here when the saved one arrives late', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, '1 week');
    await press(screen, 'Sent at 9:00 AM. Change the time.');
    await press(screen, 'PM');
    await press(screen, 'Confirm time');
    mockSavedReminder = { choice: '1', remindAt: '07:00' };
    await screen.rerender(<AddBillScreen />);
    expect(screen.getByLabelText('Sent at 9:00 PM. Change the time.')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', 7, '21:00');
  });
});

describe('Add bill — what an edit saves', () => {
  it('writes the bill back as it was when nothing was touched', async () => {
    editing({ ...POWER, name: 'Rent', category_id: 'housing', icon_id: 'other' });
    const screen = await render(<AddBillScreen />);

    // Opens on the final page, already filled in: Save is the first thing to press, and no reminder
    // saved is the answer "No reminder".
    expect(screen.getByLabelText('Save changes')).toBeEnabled();
    expect(screen.getByLabelText('No reminder')).toBeSelected();
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

  it('keeps the name, company, account, note and reminder of a bill nobody touched', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    editing({
      ...WITH_COMPANY,
      name: 'Comcast home',
      card_id: null,
      bank_account_id: 'acct-1',
      note: 'Autopay',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toEqual({
      name: 'Comcast home',
      amount: 84.2,
      brand_id: 'b-cc',
      category_id: 'energy',
      icon_id: null,
      recurrence: 'monthly',
      next_due_on: '2026-09-01',
      starts_on: '2026-09-01',
      ends_on: null,
      card_id: null,
      bank_account_id: 'acct-1',
      note: 'Autopay',
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Comcast home', false);
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', 3, '08:30');
  });

  it('keeps an Other bill’s own icon', async () => {
    editing({ ...POWER, name: 'Dog food', category_id: 'other', icon_id: 'pets' });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      category_id: 'other',
      icon_id: 'pets',
    });
  });

  it('keeps the name when the category changes, and fits the icon to the new category', async () => {
    editing({ ...POWER, name: 'Dog food', category_id: 'other', icon_id: 'pets' });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Category, Other bill');
    await press(screen, TILE.housing);
    expect(screen.getByLabelText('Category, Housing')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'Dog food',
      category_id: 'housing',
      icon_id: null,
    });
  });

  it('gives a bill moved onto Other the plain Other icon, under the name it had', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Category, Electricity & Gas');
    await press(screen, TILE.other);
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'Power',
      category_id: 'other',
      icon_id: 'other',
    });
  });

  it('floors the start after the last charge when the due date moves inside a charged month', async () => {
    mockPast.lastChargedOn = '2026-09-01';
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await pickDay(screen, 'Payment on, Tue Sep 1', 'Tuesday 15 September 2026');
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

    await pickDay(screen, 'Payment on, Tue Sep 1', 'Tuesday 20 October 2026', 1);
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

    // The box says where the period starts, not where the bill is next due.
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

    // A repeating bill has no "To" box to show it, but Save does not lose it.
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

    await pickDay(screen, 'To, Thu Dec 31', 'Thursday 24 December 2026');
    expect(screen.getByLabelText('To, Thu Dec 24')).toBeTruthy();
    await press(screen, 'Save changes');
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values.ends_on).toBe('2026-12-24');

    mockUpdate.mockClear();
    await press(screen, 'Clear — make it ongoing');
    expect(screen.getByLabelText(ENDS_ON)).toBeTruthy();
    await press(screen, 'Save changes');
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'period',
      ends_on: null,
    });
  });

  it('drops an end date the start has been moved past', async () => {
    editing(PERIOD);
    const screen = await render(<AddBillScreen />);

    // June 2026 to January 2027, past the December 31 the period ended on.
    await pickDay(screen, 'Starts on, Mon Jun 1', 'Friday 15 January 2027', 7);
    expect(screen.getByLabelText(ENDS_ON)).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'period',
      starts_on: '2027-01-15',
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
    await press(screen, 'Checking ••0099');
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

    await press(screen, 'Change name, currently Power');
    await typeName(screen, 'Electric');
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

  it('takes the card off a bill with Skip', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Skip');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Power', true);
  });

  it('saves a bill that never had a card or account without asking for one', async () => {
    editing({ ...POWER, card_id: null });
    const screen = await render(<AddBillScreen />);

    // Skip is already its answer.
    expect(screen.getByLabelText('Skip')).toBeSelected();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(MISSING)).toBeNull();
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      card_id: null,
      bank_account_id: null,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Power', false);
  });

  it('turns a saved reminder off with No reminder', async () => {
    mockSavedReminder = { choice: '3', remindAt: '08:30' };
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'No reminder');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockApplyReminder).toHaveBeenCalledTimes(1));
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', null, '08:30');
  });
});

describe('Add bill — the line Save shows for what is missing', () => {
  it('names every unanswered line in the order of the page, and writes nothing', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.other, '25');

    // Never greyed out: Save answers instead.
    expect(screen.getByLabelText('Save bill')).toBeEnabled();
    await press(screen, 'Save bill');

    expect(
      screen.getByText('To save this bill, fill in: Name, Payment on, Paid with, Reminder.'),
    ).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    expect(screen.getByLabelText('Save bill')).toBeEnabled();
    expect(mockPast.choose).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('asks again for only what is still missing, and saves once there is nothing left', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.other, '25');

    await press(screen, 'Save bill');
    expect(screen.getByText(/Name, Payment on, Paid with, Reminder\.$/)).toBeTruthy();

    await typeName(screen, 'Gym');
    await press(screen, 'Save bill');
    expect(
      screen.getByText('To save this bill, fill in: Payment on, Paid with, Reminder.'),
    ).toBeTruthy();

    await pickDay(screen, PAYMENT_ON, 'Thursday 15 October 2026');
    await press(screen, 'Save bill');
    expect(screen.getByText('To save this bill, fill in: Paid with, Reminder.')).toBeTruthy();

    await press(screen, 'Skip');
    await press(screen, 'Save bill');
    expect(screen.getByText('To save this bill, fill in: Reminder.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();

    await press(screen, 'No reminder');
    await press(screen, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ name: 'Gym', amount: 25 });
    expect(screen.queryByText(MISSING)).toBeNull();
  });

  it('asks for Starts on, not Payment on, for a specific period', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.insurance, '25');
    await press(screen, 'Specific period');

    await press(screen, 'Save bill');

    expect(
      screen.getByText('To save this bill, fill in: Name, Starts on, Paid with, Reminder.'),
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('names a reminder left unanswered, though every other line is filled in', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '1100');
    await fillIn(screen, { reminder: null });

    await press(screen, 'Save bill');

    expect(screen.getByText('To save this bill, fill in: Reminder.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
  });

  it('names a way of paying left unanswered, though every other line is filled in', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '1100');
    await fillIn(screen, { source: null });

    await press(screen, 'Save bill');

    expect(screen.getByText('To save this bill, fill in: Paid with.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('names the amount and the category too, for a hand-off that brought neither', async () => {
    // Nothing but a note: no amount, name, category, day, card or reminder.
    mockParams = { prefillNote: 'Landlord' };
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save bill');

    expect(
      screen.getByText(
        'To save this bill, fill in: Amount, Name, Category, Payment on, Paid with, Reminder.',
      ),
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('leaves the name to the person when a hand-off heard only a category', async () => {
    mockParams = { prefillCategory: 'housing' };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByPlaceholderText(HINT.housing)).toBeTruthy();
    await press(screen, 'Save bill');

    expect(
      screen.getByText(
        'To save this bill, fill in: Amount, Name, Payment on, Paid with, Reminder.',
      ),
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('counts a name of spaces as no name', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.other, '25');
    await fillIn(screen, { name: '   ' });

    await press(screen, 'Save bill');

    expect(screen.getByText('To save this bill, fill in: Name.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('asks for the name again once a saved bill’s name has been taken off', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Change name, currently Power');
    await press(screen, 'Save changes');

    expect(screen.getByText('To save this bill, fill in: Name.')).toBeTruthy();
    expect(mockPast.choose).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
  });

  const CHANGES: [string, (screen: Screen) => Promise<unknown>][] = [
    ['typing the name', (screen) => typeName(screen, 'Gym')],
    ['picking a day', (screen) => pickDay(screen, PAYMENT_ON, 'Thursday 15 October 2026')],
    ['picking how it is paid', (screen) => press(screen, 'Skip')],
    ['picking a reminder', (screen) => press(screen, 'No reminder')],
    ['picking how often it repeats', (screen) => press(screen, 'Weekly')],
  ];

  it.each(CHANGES)('drops the line once the person is %s', async (_, change) => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.other, '25');
    await press(screen, 'Save bill');
    expect(screen.getByText(MISSING)).toBeTruthy();

    await change(screen);

    expect(screen.queryByText(MISSING)).toBeNull();
  });
});

describe('Add bill — the checks inside Save', () => {
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

  // Everything on the page is a box, so changing one is what clears a message about it; otherwise
  // a fixed problem shows in red above an enabled Save.
  it('drops the message once a new end date has been picked, and saves with it', async () => {
    editing({
      ...PERIOD,
      starts_on: '2026-10-10',
      next_due_on: '2026-10-10',
      ends_on: '2026-10-01',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');
    expect(screen.getByText('The end date cannot be before the start date.')).toBeTruthy();
    await pickDay(screen, 'To, Thu Oct 1', 'Saturday 31 October 2026');

    expect(screen.queryByText('The end date cannot be before the start date.')).toBeNull();
    await press(screen, 'Save changes');
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      starts_on: '2026-10-10',
      ends_on: '2026-10-31',
    });
  });

  // The Clear link only empties the end date; the picks around it also drop the message.
  it('drops the message once the end date it names has been cleared', async () => {
    editing({
      ...PERIOD,
      starts_on: '2026-10-10',
      next_due_on: '2026-10-10',
      ends_on: '2026-10-01',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Save changes');
    expect(screen.getByText('The end date cannot be before the start date.')).toBeTruthy();
    await press(screen, 'Clear — make it ongoing');

    expect(screen.getByLabelText(ENDS_ON)).toBeTruthy();
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
    await fillIn(screen);

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

  it('drops the failure line once something on the page changes', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '1100');
    await fillIn(screen);
    await press(screen, 'Save bill');
    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

    await press(screen, 'VISA ••4421');

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

describe('Add bill — leaving after a save from a voice hand-off', () => {
  const HEARD = {
    from: 'voice',
    prefillName: 'Gym',
    prefillCategory: 'other',
    prefillAmount: '25',
    prefillDate: '2026-10-15',
    prefillSource: 'card-1',
  };

  it('arrives with what was heard filled in and asks only for the reminder', async () => {
    mockParams = HEARD;
    const screen = await render(<AddBillScreen />);

    expect(screen.getByLabelText('Change name, currently Gym')).toBeTruthy();
    expect(screen.getByLabelText('Payment on, Thu Oct 15')).toBeTruthy();
    expect(screen.getByLabelText('VISA ••4421')).toBeSelected();
    await press(screen, 'Save bill');

    expect(screen.getByText('To save this bill, fill in: Reminder.')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('goes back to Home, never onto the page it came from', async () => {
    mockParams = HEARD;
    const screen = await render(<AddBillScreen />);

    await press(screen, 'No reminder');
    await press(screen, 'Save bill');

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/home'));
    expect(router.back).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Gym',
      amount: 25,
      brand_id: null,
      category_id: 'other',
      icon_id: 'other',
      recurrence: 'monthly',
      next_due_on: '2026-10-15',
      starts_on: '2026-10-15',
      ends_on: null,
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
    });
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', null, '09:00');
  });
});

describe('Add bill — deleting', () => {
  it('asks first, then deletes the bill and leaves', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Delete this bill');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete this bill?', destructive: true }),
    );
    expect(mockDelete).toHaveBeenCalledWith('bill-1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps the bill when the question is declined', async () => {
    mockConfirm.mockResolvedValueOnce(false);
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Delete this bill');

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says the one failure line when the delete fails, and stays', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockDelete.mockRejectedValueOnce(new Error('network down'));
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Delete this bill');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('offers no delete on a bill that does not exist yet', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '12');

    expect(screen.queryByLabelText('Delete this bill')).toBeNull();
  });
});

describe('Add bill — the logo', () => {
  /** A new Energy bill on its final page, with a company the catalogue does not know just added. */
  async function addTownPower() {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.energy, '84.2');
    await typeName(screen, 'Town Power', HINT.energy);
    await fireEvent.press(await screen.findByLabelText('Use Town Power as the name'));
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
    // Named after the company, with its logo drawn in the box.
    expect(screen.getByLabelText('Change name, currently Town Power')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Town Power|townpower.example');
    await fillIn(screen, { name: null });
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
    await newBill(screen, TILE.energy, '84.2');
    await typeName(screen, 'Metro Hydro', HINT.energy);
    await fireEvent.press(await screen.findByLabelText('Use Metro Hydro as the name'));

    expect(screen.queryByLabelText(LOGO_COPY.icon)).toBeNull();
    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.queryByText(/^Looks like/)).toBeNull();
    expect(screen.getByLabelText('Change name, currently Metro Hydro')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Metro Hydro|metrohydro.example');
    expect(screen.getByLabelText(LOGO_COPY.changeLogo)).toBeTruthy();
    await fillIn(screen, { name: null });
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
      { teach: false },
    );
  });

  it('still asks when the service only half knows the name', async () => {
    mockLogoAnswer.mockImplementation(() => ({ ...METRO_HYDRO_LOGO, kind: 'fuzzy' }));
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.energy, '84.2');
    await typeName(screen, 'Metro Hydra', HINT.energy);
    await fireEvent.press(await screen.findByLabelText('Use Metro Hydra as the name'));

    expect(screen.getByLabelText(LOGO_COPY.yes)).toBeTruthy();
    await fillIn(screen, { name: null });
    await press(screen, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
  });

  it('offers a company added before first, with its logo, and asks nothing about it', async () => {
    mockKnown = [
      { name: 'Metro Hydro', categoryId: 'energy', logoDomain: 'old.example', logoHidden: false },
    ];
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.energy, '84.2');

    await typeName(screen, 'Metro', HINT.energy);
    await fireEvent.press(await screen.findByLabelText('Metro Hydro'));

    expect(screen.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(screen.queryByLabelText(LOGO_COPY.icon)).toBeNull();
    expect(screen.getByLabelText('Change name, currently Metro Hydro')).toBeTruthy();
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Metro Hydro|old.example');
    expect(mockLogoAnswer).not.toHaveBeenCalledWith('Metro Hydro');
    await fillIn(screen, { name: null });
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
    await fillIn(first, { name: null });
    await press(first, 'Save bill');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockRemember).toHaveBeenCalledTimes(1);
    const remembered = mockRemember.mock.calls[0][0];
    await first.unmount();

    mockKnown = [remembered];
    mockCreate.mockClear();
    const second = await render(<AddBillScreen />);
    await newBill(second, TILE.energy, '90');
    await typeName(second, 'town', HINT.energy);
    await fireEvent.press(await second.findByLabelText('Town Power'));

    expect(second.queryByLabelText(LOGO_COPY.yes)).toBeNull();
    expect(second.queryByLabelText(LOGO_COPY.icon)).toBeNull();
    await fillIn(second, { name: null });
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
    // No domain to draw: the mark falls back to the category's icon.
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Town Power|');
    await fillIn(screen, { name: null });
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
    await chooseCompany(screen, HINT.internet, 'Comcast');
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Comcast|comcast.com');
    await fillIn(screen, { name: null });
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ brand_id: 'b-cc' });
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_hidden');
  });

  it('writes no logo columns when nobody answered the logo question', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.housing, '1100');
    await fillIn(screen);
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_domain');
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('logo_hidden');
  });

  it('an edit that keeps its company shows the row’s logo and leaves it alone', async () => {
    editing(WITH_COMPANY);
    const screen = await render(<AddBillScreen />);

    // In the Name box, where the row's own choice shows.
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

    expect(screen.getByTestId('logo-32')).toHaveTextContent('Power|');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({ brand_id: 'b-cc' });
    expect(mockUpdate.mock.calls[0][0].values).not.toHaveProperty('logo_hidden');
  });

  it('an edit that clears the name and types a plain one takes the company and its logo off', async () => {
    editing(WITH_COMPANY);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Change name, currently Power');
    // The box is a box again, with the category's suggestions and no mark.
    expect(screen.queryByTestId('logo-32')).toBeNull();
    await typeName(screen, 'Power', HINT.energy);
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

    await press(screen, 'Change name, currently Power');
    await chooseCompany(screen, HINT.energy, 'Comcast');
    expect(screen.getByTestId('logo-32')).toHaveTextContent('Comcast|comcast.com');
    await press(screen, 'Save changes');

    // The earlier logo choice (x.com) went with the company that was taken off.
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'Comcast',
      brand_id: 'b-cc',
      category_id: 'energy',
      logo_domain: null,
      logo_hidden: false,
    });
  });

  it('an edit that swaps the company for another is named after it and drops the old logo', async () => {
    editing({ ...WITH_COMPANY, name: 'My power' });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Change name, currently My power');
    await chooseCompany(screen, HINT.energy, 'Greystar');
    expect(screen.getByLabelText('Change name, currently Greystar')).toBeTruthy();
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      name: 'Greystar',
      brand_id: 'b-gs',
      category_id: 'energy',
      logo_domain: null,
      logo_hidden: false,
    });
  });

  it('names the bill after the second company when the first one gave it its name', async () => {
    const screen = await render(<AddBillScreen />);
    await newBill(screen, TILE.internet, '0.10');
    await chooseCompany(screen, HINT.internet, 'Comcast');
    expect(screen.getByLabelText('Change name, currently Comcast')).toBeTruthy();

    await press(screen, 'Change name, currently Comcast');
    await chooseCompany(screen, HINT.internet, 'Greystar');
    expect(screen.getByLabelText('Change name, currently Greystar')).toBeTruthy();
    await fillIn(screen, { name: null });
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    // The bill keeps its own category, whatever the company is filed under.
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Greystar',
      brand_id: 'b-gs',
      category_id: 'internet',
    });
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

  it('offers the payment schedule on a bill that came from the loan calculator', async () => {
    mockLoan = LOAN;
    editing({ ...POWER, name: 'Car loan', category_id: 'loans', amount: 386.66 });
    const screen = await render(<AddBillScreen />);

    const card = screen.getByRole('button', { name: 'Payment schedule' });
    expect(card.props.accessibilityHint).toBe('See where all 60 payments go');
    expect(screen.getByText('See where all 60 payments go')).toBeTruthy();

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

  it('counts a loan saved without its own first payment date from the bill’s first due date', async () => {
    mockLoan = { ...LOAN, first_payment_on: null };
    editing({
      ...POWER,
      name: 'Car loan',
      category_id: 'loans',
      amount: 386.66,
      starts_on: '2025-01-01',
      next_due_on: '2026-10-01',
    });
    const screen = await render(<AddBillScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Payment schedule' }));
    // From the first due date, as the Loans page counts it, not the next one.
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ start: '2025-01-01' }) }),
    );
  });

  it('is not there for an ordinary bill', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    expect(screen.queryByText('Payment schedule')).toBeNull();
  });
});
