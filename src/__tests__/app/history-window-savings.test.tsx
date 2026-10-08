import { act, render } from '@testing-library/react-native';

import SavingsScreen from '@/app/savings';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * Savings on free lists the months inside the 90 days, but "Saved so far" counts every month, the
 * same figure the Cards tab shows: a lapse never makes money saved look smaller.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const mockRow = { income: 4000, spent: 0, adjusted_saved: null, note: null, excluded_at: null };
const mockMonths = [
  { ...mockRow, month: '2026-05-01', saved: 1000 },
  { ...mockRow, month: '2026-06-01', saved: 400 },
  { ...mockRow, month: '2026-07-01', saved: 250 },
  { ...mockRow, month: '2026-08-01', saved: 100 },
];

jest.mock('@/api/queries', () => ({
  savedFor: (month: {
    excluded_at: string | null;
    adjusted_saved: number | null;
    saved: number;
  }) => (month.excluded_at ? 0 : Number(month.adjusted_saved ?? month.saved)),
  useMonthlySavings: () => ({
    data: mockMonths,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

// 12 September 2026: the free window starts on 15 June, so May is out of the list.
jest.useFakeTimers().setSystemTime(new Date('2026-09-12T09:00:00'));

const NOTICE = 'Older history is saved. Free shows the last 90 days. Skip Pro shows up to 7 years.';

beforeEach(() => resetProStatusForTests());

it('lists from June on free, and still counts May in Saved so far', async () => {
  await act(async () => publishProStatus({ pro: false, ready: true }));
  const screen = await render(<SavingsScreen />);

  expect(screen.getByText('$1,750.00')).toBeTruthy();
  expect(screen.getByText('across 4 months that ended with something left')).toBeTruthy();
  expect(screen.queryByText(/May/)).toBeNull();
  expect(screen.getByText(/June/)).toBeTruthy();
  expect(screen.getByLabelText(NOTICE)).toBeTruthy();
});

it('shows the same total on Pro, with every month listed', async () => {
  await act(async () => publishProStatus({ pro: true, ready: true }));
  const screen = await render(<SavingsScreen />);

  expect(screen.getByText('$1,750.00')).toBeTruthy();
  expect(screen.getByText(/May/)).toBeTruthy();
  expect(screen.queryByLabelText(NOTICE)).toBeNull();
});
