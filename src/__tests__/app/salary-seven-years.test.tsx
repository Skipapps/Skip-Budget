import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SalaryScreen from '@/app/salary';

/**
 * The Salary page's calendar, for a last payday and for a one-off pay's "Paid on", greys out every
 * day before the first kept day (today less seven years, a leap day going back to the 28th, as the
 * database counts) and still takes the first kept day.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
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
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => jest.fn(async () => true),
  useDialog: () => jest.fn(async () => 'everything'),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/pay', () => ({
  recordDuePay: jest.fn(async () => 0),
  usePastPay: () => ({
    choose: jest.fn(async () => 'upcoming'),
    apply: jest.fn(async () => {}),
    saving: false,
  }),
  useDeletePay: () => ({ countPast: async () => 0, remove: jest.fn(), removing: false }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

const mockUpdate = jest.fn(async () => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: jest.fn(async () => ({ id: 'new' })) }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSalarySource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteUnseenPay: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(async () => ({})), isPending: false }),
}));

const row = {
  id: 's1',
  name: 'Acme',
  amount: 1880,
  frequency: 'monthly',
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

jest.useFakeTimers();

type Screen = Awaited<ReturnType<typeof render>>;

async function showMonth(screen: Screen, month: string, yearsBack: number) {
  await fireEvent.press(screen.getByLabelText(/Choose a different month\.$/));
  for (let i = 0; i < yearsBack; i += 1) {
    await fireEvent.press(screen.getByLabelText('Previous year'));
  }
  await fireEvent.press(screen.getByLabelText(month));
}

const blocked = (screen: Screen, label: string) =>
  Boolean(screen.getByLabelText(label).props.accessibilityState?.disabled);

beforeEach(() => {
  jest.clearAllMocks();
  // Friday 9 October 2026: the first kept day is Wednesday 9 October 2019.
  jest.setSystemTime(new Date('2026-10-09T10:00:00'));
  mockRows = [row];
});

describe('the Salary calendar, seven years back', () => {
  it('greys out the day before the first kept day for a last payday, and saves the first', async () => {
    const screen = await render(<SalaryScreen />);
    await fireEvent.press(screen.getByLabelText(/^Last payday/));
    await showMonth(screen, 'October', 7);

    expect(blocked(screen, 'Tuesday 8 October 2019')).toBe(true);
    expect(blocked(screen, 'Wednesday 9 October 2019')).toBe(false);

    await fireEvent.press(screen.getByLabelText('Wednesday 9 October 2019'));
    await fireEvent.press(screen.getByLabelText('Save'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 's1',
      values: expect.objectContaining({ last_payday: '2019-10-09' }),
    });
  });

  it('holds a one-off pay’s Paid on to the same first day', async () => {
    const screen = await render(<SalaryScreen />);
    await fireEvent.press(screen.getByLabelText('How often'));
    await fireEvent.press(screen.getByLabelText('Just this time'));
    await fireEvent.press(screen.getByLabelText(/^Paid on/));
    await showMonth(screen, 'October', 7);

    expect(blocked(screen, 'Tuesday 8 October 2019')).toBe(true);
    expect(blocked(screen, 'Wednesday 9 October 2019')).toBe(false);
  });

  it('takes a leap day back to the 28th, as the database does', async () => {
    // Tuesday 29 February 2028: the first kept day is Sunday 28 February 2021, not 1 March.
    jest.setSystemTime(new Date('2028-02-29T10:00:00'));
    mockRows = [{ ...row, last_payday: '2028-02-15' }];
    const screen = await render(<SalaryScreen />);
    await fireEvent.press(screen.getByLabelText(/^Last payday/));
    await showMonth(screen, 'February', 7);

    expect(blocked(screen, 'Saturday 27 February 2021')).toBe(true);
    expect(blocked(screen, 'Sunday 28 February 2021')).toBe(false);
  });
});
