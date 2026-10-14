import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SalaryScreen from '@/app/salary';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Saving again after a Save that failed part way files no pay twice. Pinned:
 * - each new pay is filed under its own row id, made once and kept for the visit;
 * - a new pay a failed Save already filed is updated, not filed again, and the rest finishes;
 * - a new pay whose answer was lost is filed again under the same id, so the database finds it;
 * - either way its past pay takes the values on the page, since the person never saw it saved;
 * - a new pay filed and then removed before saving again is deleted, with any pay recorded for it;
 * - a new pay filed and then left without a name is asked for, never dropped.
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
// Removing a pay asks the shared past question; with nothing on record it is the plain Delete.
jest.mock('@/providers/dialog-provider', () => ({
  useDialog: () => jest.fn(async () => 'everything'),
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-08', todayDate: new Date('2026-10-08T00:00:00') }),
}));
// 8 October 2026: the calendar opens on this month when no payday is set yet.
jest.useFakeTimers().setSystemTime(new Date('2026-10-08T10:00:00'));

// Counted, so an id made again by a second Save would show as a new one.
let mockUuids = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `pay-${(mockUuids += 1)}` }));

/** The pay rows in the database, and pay_received as it keeps them. */
const mockFiled = new Set<string>();
const mockPayReceived: { salaryId: string | null }[] = [];

const mockApply = jest.fn(async (_id: string, _values: unknown) => {});
jest.mock('@/api/pay', () => ({
  // Records the last payday of every pay on file that has none recorded yet, as the sweep does.
  recordDuePay: jest.fn(async () => {
    let added = 0;
    for (const id of mockFiled) {
      if (mockPayReceived.some((row) => row.salaryId === id)) continue;
      mockPayReceived.push({ salaryId: id });
      added += 1;
    }
    return added;
  }),
  usePastPay: () => ({
    choose: jest.fn(async () => 'upcoming'),
    apply: mockApply,
    saving: false,
  }),
  useDeletePay: () => ({
    countPast: async () => 0,
    remove: ({ id }: { id: string }) => mockDelete(id),
    removing: false,
  }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: false, ready: true }) }));

// The database files a row under the id it is given, as the live one does.
const fileRow = async (values: Record<string, unknown>) => {
  mockFiled.add(values.id as string);
  return { id: values.id as string };
};
const mockCreate = jest.fn(fileRow);
const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
// A saved salary's delete keeps its pay as history: the key is set to null, the row stays.
const mockDelete = jest.fn(async (id: string) => {
  mockFiled.delete(id);
  for (const row of mockPayReceived) if (row.salaryId === id) row.salaryId = null;
  return {};
});
const mockDeleteUnseen = jest.fn(async (id: string) => {
  mockFiled.delete(id);
  const kept = mockPayReceived.filter((row) => row.salaryId !== id);
  mockPayReceived.splice(0, mockPayReceived.length, ...kept);
  return {};
});
const mockSetAccounts = jest.fn(async (_input: { salaryId: string; accountIds: string[] }) => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteUnseenPay: () => ({ mutateAsync: mockDeleteUnseen, isPending: false }),
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

jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: { rows: [row], hourlyAvailable: true },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' }],
  }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

/** Adds a source and fills it in: its name, its pay on the keypad, and its last payday. */
async function addSource(screen: Screen, name: string, keys: string[]) {
  await fireEvent.press(screen.getByLabelText('Add source'));
  await fireEvent.changeText(screen.getAllByDisplayValue('')[0], name);
  await fireEvent.press(screen.getAllByText('Enter an amount')[0]);
  for (const key of keys) await fireEvent.press(screen.getByLabelText(key));
  await fireEvent.press(screen.getByText('Done'));
  await fireEvent.press(screen.getAllByText('Pick the most recent one')[0]);
  await fireEvent.press(screen.getByLabelText('Friday 2 October 2026'));
}

async function pressSave(screen: Screen) {
  await fireEvent.press(screen.getByText('Save'));
}

let log: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  // A failure set up by one test must not carry into the next.
  mockCreate.mockImplementation(fileRow);
  mockFiled.clear();
  mockPayReceived.length = 0;
  mockSetAccounts.mockImplementation(async () => ({}));
  mockUuids = 0;
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => log.mockRestore());

it('files a new pay once, under its own id, and asks nothing of its past pay', async () => {
  const screen = await render(<SalaryScreen />);
  await addSource(screen, 'Weekend job', ['4', '0', '0']);

  await pressSave(screen);

  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'pay-1', name: 'Weekend job', amount: 400 }),
  );
  expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 'pay-1', accountIds: [] });
  expect(mockApply).not.toHaveBeenCalled();
});

it('after a later step failed, updates the pay already filed and finishes the rest', async () => {
  mockSetAccounts.mockImplementation(async ({ salaryId }) => {
    if (salaryId === 'pay-1' && mockSetAccounts.mock.calls.length <= 2) {
      throw new Error('network down');
    }
    return {};
  });
  const screen = await render(<SalaryScreen />);
  await addSource(screen, 'Weekend job', ['4', '0', '0']);

  await pressSave(screen);
  await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(router.back).not.toHaveBeenCalled();

  await pressSave(screen);

  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledWith({
    id: 'pay-1',
    values: expect.objectContaining({ name: 'Weekend job', amount: 400 }),
  });
  expect(mockSetAccounts).toHaveBeenLastCalledWith({ salaryId: 'pay-1', accountIds: [] });
  // Pay the sweep may have recorded for it in between takes the pay as saved.
  expect(mockApply).toHaveBeenCalledTimes(1);
  expect(mockApply).toHaveBeenCalledWith('pay-1', {
    label: 'Weekend job',
    amount: 400,
    bank_account_id: null,
  });
  expect(mockDelete).not.toHaveBeenCalled();
});

it('after a lost answer, files again under the same id with the name as it is now', async () => {
  mockCreate.mockImplementationOnce(async () => {
    throw new Error('TypeError: Network request failed');
  });
  const screen = await render(<SalaryScreen />);
  await addSource(screen, 'Weekend job', ['4', '0', '0']);

  await pressSave(screen);
  await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

  await fireEvent.changeText(screen.getByDisplayValue('Weekend job'), 'Weekend shifts');
  await pressSave(screen);

  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledTimes(2);
  expect(mockCreate.mock.calls[0][0]).toEqual(
    expect.objectContaining({ id: 'pay-1', name: 'Weekend job' }),
  );
  expect(mockCreate.mock.calls[1][0]).toEqual(
    expect.objectContaining({ id: 'pay-1', name: 'Weekend shifts' }),
  );
  expect(mockApply).toHaveBeenCalledWith('pay-1', {
    label: 'Weekend shifts',
    amount: 400,
    bank_account_id: null,
  });
});

it('deletes a new pay a failed Save filed, and the pay recorded for it, once it is removed', async () => {
  mockSetAccounts.mockImplementation(async ({ salaryId }) => {
    if (salaryId === 'pay-1') throw new Error('network down');
    return {};
  });
  const screen = await render(<SalaryScreen />);
  await addSource(screen, 'Weekend job', ['4', '0', '0']);
  await pressSave(screen);
  await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

  await fireEvent.press(screen.getByLabelText('Remove source 2'));
  await waitFor(() => expect(screen.queryByDisplayValue('Weekend job')).toBeNull());
  await pressSave(screen);

  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(mockDeleteUnseen).toHaveBeenCalledTimes(1);
  expect(mockDeleteUnseen).toHaveBeenCalledWith('pay-1');
  expect(mockDelete).not.toHaveBeenCalled();
  // Save again recorded its last payday before the delete; nothing of it is left as income.
  expect(mockPayReceived).toEqual([]);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  // The saved pay is still updated, and nothing else is filed.
  expect(mockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's1' }));
  expect(mockApply).not.toHaveBeenCalled();
});

it('gives a second new pay its own id', async () => {
  const screen = await render(<SalaryScreen />);
  await addSource(screen, 'Weekend job', ['4', '0', '0']);
  await addSource(screen, 'Tutoring', ['2', '5', '0']);

  await pressSave(screen);

  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(mockCreate.mock.calls.map(([values]) => values.id)).toEqual(['pay-1', 'pay-2']);
});

it('asks for the name of a pay a failed Save filed, rather than drop it under a saved toast', async () => {
  mockSetAccounts.mockImplementation(async ({ salaryId }) => {
    if (salaryId === 'pay-1') throw new Error('network down');
    return {};
  });
  const screen = await render(<SalaryScreen />);
  await addSource(screen, 'Weekend job', ['4', '0', '0']);
  await pressSave(screen);
  await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());

  await fireEvent.changeText(screen.getByDisplayValue('Weekend job'), '');
  await pressSave(screen);

  expect(screen.getByText('Source 2: fill in Name.')).toBeTruthy();
  expect(mockDeleteUnseen).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  expect(router.back).not.toHaveBeenCalled();
  expect(mockFiled.has('pay-1')).toBe(true);
});
