import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SalaryScreen from '@/app/salary';

/**
 * Salary is free on every plan. Pinned on a free account: a second and a third source can be added
 * and are saved, more saved sources never send Add to the Pro page, and the page has one add button,
 * full width, with no separate One-off pay button.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-08', todayDate: new Date('2026-10-08T00:00:00') }),
}));
// 8 October 2026: the calendar opens on this month when no payday is set yet.
jest.useFakeTimers().setSystemTime(new Date('2026-10-08T10:00:00'));

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

// The page reads no plan; a free account is mocked anyway, so a wall that came back would be met
// as the free plan meets it.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false, ready: true }) }));

let mockNextId = 0;
const mockCreate = jest.fn(async (_values: Record<string, unknown>) => ({
  id: `new-${++mockNextId}`,
}));
const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
const mockDelete = jest.fn(async (_id: string) => ({}));
const mockSetAccounts = jest.fn(async (_input: { salaryId: string; accountIds: string[] }) => ({}));
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

type Screen = Awaited<ReturnType<typeof render>>;

/** Fills in the first source still blank: its name, its pay on the keypad, and its last payday. */
async function fillBlankSource(screen: Screen, name: string, keys: string[]) {
  // A named card shows its name as a title, so the only text box left is the new source's name.
  await fireEvent.changeText(screen.getAllByDisplayValue('')[0], name);
  await fireEvent.press(screen.getAllByText('Enter an amount')[0]);
  for (const key of keys) await fireEvent.press(screen.getByLabelText(key));
  await fireEvent.press(screen.getByText('Done'));
  await fireEvent.press(screen.getAllByText('Pick the most recent one')[0]);
  await fireEvent.press(screen.getByLabelText('Friday 2 October 2026'));
}

/** Opens a source's How often choices and picks one. */
async function chooseFrequency(screen: Screen, index: number, label: string) {
  await fireEvent.press(screen.getAllByLabelText('How often')[index]);
  await fireEvent.press(screen.getByLabelText(label));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNextId = 0;
  mockRows = [row];
});

it('adds a second and a third source on the free plan, and saves them', async () => {
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByLabelText('Add source'));
  expect(screen.getByText('Source 2')).toBeTruthy();
  await fillBlankSource(screen, 'Weekend job', ['4', '0', '0']);

  await fireEvent.press(screen.getByLabelText('Add source'));
  expect(screen.getByText('Source 3')).toBeTruthy();
  await fillBlankSource(screen, 'Tutoring', ['2', '5', '0']);
  await chooseFrequency(screen, 2, 'Weekly');

  await fireEvent.press(screen.getByText('Save'));

  expect(router.push).not.toHaveBeenCalled();
  expect(screen.queryByText('Give each source a name and its pay.')).toBeNull();
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  expect(mockCreate).toHaveBeenCalledTimes(2);
  expect(mockCreate).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      name: 'Weekend job',
      amount: 400,
      frequency: 'monthly',
      last_payday: '2026-10-02',
    }),
  );
  expect(mockCreate).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      name: 'Tutoring',
      amount: 250,
      frequency: 'weekly',
      last_payday: '2026-10-02',
    }),
  );
  // Each new source is linked under its own new id: "No account" was left picked for both.
  expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 'new-1', accountIds: [] });
  expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 'new-2', accountIds: [] });
  expect(mockDelete).not.toHaveBeenCalled();
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('never sends Add to the Pro page, however many sources are saved', async () => {
  mockRows = [
    row,
    { ...row, id: 's2', name: 'Weekend job', frequency: 'weekly' },
    { ...row, id: 's3', name: 'Tutoring', frequency: 'monthly' },
  ];
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByLabelText('Add source'));

  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByText('Source 4')).toBeTruthy();
});

it('has one add button, full width, and no One-off pay button', async () => {
  const screen = await render(<SalaryScreen />);

  expect(screen.queryByLabelText('Add a one-off pay')).toBeNull();
  expect(screen.queryByText('Add a one-off pay')).toBeNull();
  const add = screen.getByRole('button', { name: 'Add source' });
  expect(String(add.props.className)).toContain('w-full');
  expect(String(add.props.className)).toContain('rounded-full');
  // "Just this time" stays a choice under How often.
  await fireEvent.press(screen.getByLabelText('How often'));
  expect(screen.getByLabelText('Just this time')).toBeTruthy();
});
