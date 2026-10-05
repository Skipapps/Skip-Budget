import { fireEvent, render } from '@testing-library/react-native';

import SalaryScreen from '@/app/salary';

/**
 * The Salary page with hourly pay (Founder, 2026-10-03).
 *
 * Three things pinned: saving keeps the accounts each source was already paid
 * into (it used to start them empty and save that, unlinking every account);
 * an hourly source saves the pay it works out (before tax — there is no tax
 * field) plus the inputs behind it; and until the database has the hourly columns, the page is fixed-only
 * and sends nothing it cannot store.
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
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

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

const fixedRow = {
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

let mockDetails: { rows: unknown[]; hourlyAvailable: boolean } = {
  rows: [fixedRow],
  hourlyAvailable: true,
};
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: mockDetails,
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' }],
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDetails = { rows: [fixedRow], hourlyAvailable: true };
});

it('keeps the accounts a source is paid into when saving', async () => {
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByText('Save'));

  expect(mockSetAccounts).toHaveBeenCalledWith({ salaryId: 's1', accountIds: ['acc1'] });
});

it('saves an hourly source as the pay it works out to, with its inputs', async () => {
  mockDetails = {
    hourlyAvailable: true,
    rows: [
      {
        ...fixedRow,
        frequency: 'biweekly',
        pay_type: 'hourly',
        hourly_rate: 20,
        hours_per_week: 40,
        overtime_hours_per_week: 5,
        overtime_multiplier: 1.5,
        // A % saved before the tax field was removed is no longer applied.
        deduction_percent: 20,
      },
    ],
  };
  const screen = await render(<SalaryScreen />);

  // (40 × $20 + 5 × $30) × 2 weeks = $1,900, before tax.
  expect(screen.getByText('$1,900.00')).toBeTruthy();
  expect(screen.getByText('Each paycheck, before tax')).toBeTruthy();
  expect(screen.queryByText('Tax and deductions')).toBeNull();

  await fireEvent.press(screen.getByText('Save'));

  expect(mockUpdate).toHaveBeenCalledWith({
    id: 's1',
    values: expect.objectContaining({
      amount: 1900,
      pay_type: 'hourly',
      hourly_rate: 20,
      hours_per_week: 40,
      overtime_hours_per_week: 5,
      overtime_multiplier: 1.5,
      deduction_percent: 0,
    }),
  });
});

it('turns a fixed source hourly from the pay choice', async () => {
  const screen = await render(<SalaryScreen />);

  await fireEvent.press(screen.getByLabelText('Hourly'));

  expect(screen.getByText('Hourly rate')).toBeTruthy();
  expect(screen.getByText('Hours a week')).toBeTruthy();
  expect(screen.queryByText('Amount')).toBeNull();
});

it('offers fixed pay only, and sends no hourly fields, before the database has them', async () => {
  mockDetails = { rows: [fixedRow], hourlyAvailable: false };
  const screen = await render(<SalaryScreen />);

  expect(screen.queryByLabelText('Hourly')).toBeNull();
  await fireEvent.press(screen.getByText('Save'));

  const [{ values }] = mockUpdate.mock.calls[0] as unknown as [{ values: object }];
  expect(values).not.toHaveProperty('pay_type');
  expect(values).toEqual(
    expect.objectContaining({ amount: 1880, frequency: 'semimonthly', last_payday: '2026-09-30' }),
  );
});
