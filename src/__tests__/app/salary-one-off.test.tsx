import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { SalaryValues } from '@/api/mutations';
import SalaryScreen from '@/app/salary';

/**
 * One-off pays on the Salary page: work that pays differently each time is recorded pay by pay.
 * Pinned: a one-off pay is made with "Just this time" under How often, there is no button of its
 * own; it asks for the day it was paid, not a last payday, and promises no next one; it needs no
 * name; the monthly total stays the schedules' and says what one-off pays added this month; earlier
 * months' one-off pays wait behind one row, never touched until opened; and a misclick on "Just
 * this time" can always be undone.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

// Pay that has already landed is written down before a save changes anything; none of that is under
// test in this file, so the sweep finds nothing and an edit to a salary that has paid is not asked.
jest.mock('@/api/pay', () => ({
  recordDuePay: jest.fn(async () => 0),
  usePastPay: () => ({
    choose: jest.fn(async () => 'upcoming'),
    apply: jest.fn(async () => {}),
    saving: false,
  }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

const mockCreate = jest.fn(async () => ({ id: 'new' }));
const mockUpdate = jest.fn(async () => ({}));
const mockDelete = jest.fn(async () => ({}));
const mockSetAccounts = jest.fn(async () => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSalarySource: () => ({ mutateAsync: mockDelete, isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: mockSetAccounts, isPending: false }),
}));

const row = {
  id: 's1',
  name: 'Acme',
  amount: 1880,
  frequency: 'semimonthly',
  last_payday: '2026-09-30',
  pay_type: 'fixed',
  hourly_rate: null,
  hours_per_week: null,
  overtime_hours_per_week: 0,
  overtime_multiplier: 1.5,
  deduction_percent: 0,
  account_ids: ['acc1'],
};
const oneOff = (id: string, payday: string, amount: number, name = '') => ({
  ...row,
  id,
  name,
  amount,
  frequency: 'once',
  last_payday: payday,
});

let mockRows: unknown[] = [row];
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: { rows: mockRows, hourlyAvailable: true },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' }],
  }),
}));

// 8 October 2026.
jest.useFakeTimers().setSystemTime(new Date('2026-10-08T10:00:00'));

beforeEach(() => {
  jest.clearAllMocks();
  mockRows = [row];
});

type Screen = Awaited<ReturnType<typeof render>>;

/** Opens a source's How often choices and picks one. */
async function chooseFrequency(screen: Screen, index: number, label: string) {
  await fireEvent.press(screen.getAllByLabelText('How often')[index]);
  await fireEvent.press(screen.getByLabelText(label));
}

/** The line under Last payday; the total card's own says "Next payday 15 Oct · 1 source". */
const NEXT_PAYDAY = /^Next payday \d+ \w+ \d{4}$/;

it('asks for the day it was paid, and promises no next payday, for a pay just this time', async () => {
  const screen = await render(<SalaryScreen />);
  expect(screen.getByText('Last payday')).toBeTruthy();
  expect(screen.getByText(NEXT_PAYDAY)).toBeTruthy();

  await chooseFrequency(screen, 0, 'Just this time');

  expect(screen.getByText('Paid on')).toBeTruthy();
  expect(screen.queryByText('Last payday')).toBeNull();
  expect(screen.queryByText(NEXT_PAYDAY)).toBeNull();
  expect(screen.getByText('Counts once, in the month it was paid')).toBeTruthy();
  expect(screen.getByText('One-off pay')).toBeTruthy();
  // A pay just this time is dated today, not the schedule's last payday.
  expect(screen.getByText('8 Oct 2026')).toBeTruthy();
});

it('takes a saved schedule back from a misclick, with its own last payday', async () => {
  mockRows = [
    row,
    { ...row, id: 's2', name: 'Weekend job', frequency: 'weekly', last_payday: '2026-10-03' },
  ];
  const screen = await render(<SalaryScreen />);

  await chooseFrequency(screen, 0, 'Just this time');
  await chooseFrequency(screen, 0, 'Twice a month');

  expect(screen.queryByText('One-off pay')).toBeNull();
  expect(screen.getByText('30 Sep 2026')).toBeTruthy();
});

it('makes a one-off pay from a new source with "Just this time", dated today', async () => {
  const screen = await render(<SalaryScreen />);
  expect(screen.queryByLabelText('Add a one-off pay')).toBeNull();

  await fireEvent.press(screen.getByLabelText('Add source'));
  await chooseFrequency(screen, 1, 'Just this time');

  expect(screen.getByText('One-off pay')).toBeTruthy();
  expect(screen.getByText('8 Oct 2026')).toBeTruthy();
});

it('numbers a schedule added beside one-off pays as the first source', async () => {
  mockRows = [oneOff('o1', '2026-10-02', 400)];
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByLabelText('Add source'));

  expect(screen.getByText('Source 1')).toBeTruthy();
});

it('turns a one-off pay into a second schedule', async () => {
  mockRows = [row, oneOff('o1', '2026-10-02', 400, 'Shift')];
  const screen = await render(<SalaryScreen />);

  await chooseFrequency(screen, 1, 'Weekly');

  expect(router.push).not.toHaveBeenCalled();
  expect(screen.queryByText('One-off pay')).toBeNull();
  expect(screen.getByText('Source 2')).toBeTruthy();

  await fireEvent.press(screen.getByText('Save'));

  expect(mockUpdate).toHaveBeenCalledWith({
    id: 'o1',
    values: expect.objectContaining({ name: 'Shift', frequency: 'weekly' }),
  });
  expect(router.back).toHaveBeenCalled();
});

it('keeps the monthly total the schedules’, and says what one-off pays added this month', async () => {
  mockRows = [row, oneOff('o1', '2026-10-02', 400), oneOff('o2', '2026-10-06', 250.5)];
  const screen = await render(<SalaryScreen />);

  // Twice a month: 2 × $1,880.
  expect(screen.getByText('$3,760.00')).toBeTruthy();
  expect(screen.getByText('+ $650.50 paid once this month')).toBeTruthy();
});

it('saves a one-off pay with no name of its own', async () => {
  mockRows = [row, oneOff('o1', '2026-10-02', 400)];
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByText('Save'));

  expect(mockUpdate).toHaveBeenCalledWith({
    id: 'o1',
    values: expect.objectContaining({
      name: '',
      amount: 400,
      frequency: 'once',
      last_payday: '2026-10-02',
    }),
  });
  expect(router.back).toHaveBeenCalled();
});

it('keeps earlier months’ one-off pays behind one row, and never touches them unopened', async () => {
  mockRows = [row, oneOff('old1', '2026-08-14', 400), oneOff('old2', '2026-09-20', 300)];
  const screen = await render(<SalaryScreen />);

  expect(screen.queryByText('One-off pay')).toBeNull();
  expect(screen.getByLabelText('2 earlier one-off pays')).toBeTruthy();

  await fireEvent.press(screen.getByText('Save'));

  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
});

it('opens the earlier one-off pays to change or remove, newest first', async () => {
  mockRows = [row, oneOff('old1', '2026-08-14', 400), oneOff('old2', '2026-09-20', 300)];
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByLabelText('2 earlier one-off pays'));

  expect(screen.queryByLabelText('2 earlier one-off pays')).toBeNull();
  expect(screen.getAllByText('One-off pay')).toHaveLength(2);
  const dates = screen
    .getAllByText(/^\$[0-9]+\.00 · \d+ \w+ 2026$/)
    .map((node) => node.props.children);
  expect(dates).toEqual(['$300.00 · 20 Sep 2026', '$400.00 · 14 Aug 2026']);

  // Removing one deletes it on Save; the other is saved as it was.
  await fireEvent.press(screen.getByLabelText('Remove source 3'));
  await fireEvent.press(screen.getByText('Save'));

  expect(mockDelete).toHaveBeenCalledWith('old1');
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 'old2' }));
});

it('saves a one-off pay and a schedule that swapped places in the order of the page', async () => {
  mockRows = [oneOff('o1', '2026-10-02', 400, 'Shift'), row];
  const screen = await render(<SalaryScreen />);

  await chooseFrequency(screen, 1, 'Just this time');
  await chooseFrequency(screen, 0, 'Weekly');

  await fireEvent.press(screen.getByText('Save'));

  const saved = (mockUpdate.mock.calls as unknown as [{ id: string; values: SalaryValues }][]).map(
    ([call]) => [call.id, call.values.frequency],
  );
  expect(saved).toEqual([
    ['o1', 'weekly'],
    ['s1', 'once'],
  ]);
});

it('works an hourly one-off pay out from the hours worked for it', async () => {
  mockRows = [
    {
      ...oneOff('o1', '2026-10-02', 0),
      pay_type: 'hourly',
      hourly_rate: 20,
      hours_per_week: 12,
    },
  ];
  const screen = await render(<SalaryScreen />);

  expect(screen.getByText('Hours worked')).toBeTruthy();
  expect(screen.getByText('This pay, before tax')).toBeTruthy();
  // 12 hours × $20, once.
  expect(screen.getAllByText('$240.00').length).toBeGreaterThan(0);
  expect(screen.queryByText(/^About .* a month$/)).toBeNull();

  await fireEvent.press(screen.getByText('Save'));

  expect(mockUpdate).toHaveBeenCalledWith({
    id: 'o1',
    values: expect.objectContaining({ amount: 240, frequency: 'once', pay_type: 'hourly' }),
  });
});

it('asks for a name rather than drop a saved pay turned into a schedule without one', async () => {
  mockRows = [row, oneOff('o1', '2026-10-02', 400)];
  const screen = await render(<SalaryScreen />);

  await chooseFrequency(screen, 1, 'Weekly');
  await fireEvent.press(screen.getByText('Save'));

  expect(screen.getByText('Give each source a name and its pay.')).toBeTruthy();
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
});
