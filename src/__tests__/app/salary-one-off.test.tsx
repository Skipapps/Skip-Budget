import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SalaryScreen from '@/app/salary';

/**
 * One-off pays on the Salary page: work that pays differently each time is recorded pay by pay.
 * Pinned: "Just this time" asks for the day it was paid, not a last payday, and promises no next
 * one; a one-off pay is free on every plan and needs no name; the monthly total stays the
 * schedules' and says what one-off pays added this month; and earlier months' one-off pays stay
 * saved without crowding the page.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));

let mockPro = false;
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: mockPro, ready: true }) }));

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
  mockPro = false;
  mockRows = [row];
});

it('asks for the day it was paid, and promises no next payday, for a pay just this time', async () => {
  const screen = await render(<SalaryScreen />);
  expect(screen.getByText('Last payday')).toBeTruthy();
  expect(screen.getByText(/^Next payday/)).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Just this time'));

  expect(screen.getByText('Paid on')).toBeTruthy();
  expect(screen.queryByText('Last payday')).toBeNull();
  expect(screen.queryByText(/^Next payday/)).toBeNull();
  expect(screen.getByText('Counts once, in the month it was paid')).toBeTruthy();
  expect(screen.getByText('One-off pay')).toBeTruthy();
});

it('adds a one-off pay on the free plan beside its one income, dated today', async () => {
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByLabelText('Add a one-off pay'));

  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByText('One-off pay')).toBeTruthy();
  expect(screen.getByText('8 Oct 2026')).toBeTruthy();
});

it('still keeps a second income schedule for Pro on the free plan', async () => {
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByLabelText('Add salary source'));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/pro-feature',
    params: { id: 'unlimited' },
  });
});

it('lets the free plan add a schedule when it only has one-off pays', async () => {
  mockRows = [oneOff('o1', '2026-10-02', 400)];
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByLabelText('Add salary source'));

  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByText('Source 1')).toBeTruthy();
});

it('will not turn a one-off pay into a second schedule on the free plan', async () => {
  mockRows = [row, oneOff('o1', '2026-10-02', 400)];
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getAllByLabelText('Weekly')[1]);

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/pro-feature',
    params: { id: 'unlimited' },
  });
  expect(screen.getByText('One-off pay')).toBeTruthy();
});

it('lets Pro turn a one-off pay into a schedule', async () => {
  mockPro = true;
  mockRows = [row, oneOff('o1', '2026-10-02', 400)];
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getAllByLabelText('Weekly')[1]);

  expect(router.push).not.toHaveBeenCalled();
  expect(screen.queryByText('One-off pay')).toBeNull();
  expect(screen.getByText('Source 2')).toBeTruthy();
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

it('keeps earlier months’ one-off pays saved, out of the page, and never deletes them', async () => {
  mockRows = [row, oneOff('old1', '2026-08-14', 400), oneOff('old2', '2026-09-20', 300)];
  const screen = await render(<SalaryScreen />);

  expect(screen.queryByText('One-off pay')).toBeNull();
  expect(screen.getByText('2 one-off pays from earlier months are kept in Activity.')).toBeTruthy();

  await fireEvent.press(screen.getByText('Save'));

  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
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
