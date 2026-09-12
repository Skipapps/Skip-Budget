import { fireEvent, render } from '@testing-library/react-native';

import SavingsMonthScreen from '@/app/savings-month';

/**
 * Correcting a month that arrives a moment after the screen does.
 *
 * The correction and the note are `useState` initial values, and an initial
 * value is read once. Reached on a cold cache — a deep link, or a cold start
 * onto this route — the row lands after the first render, so the screen used
 * to open with an empty amount on a month that already carried one. Saving
 * from there would have written that emptiness back over the figure.
 *
 * The other two cases are about what the screen says while it does not know:
 * "that month is not on your savings" is a fact about the account, and both a
 * still-running and a failed read used to be answered with it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));

jest.mock('@/api/mutations', () => ({
  useAdjustSavingsMonth: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useExcludeSavingsMonth: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ month: '2026-08-01' }),
}));

/** August, already corrected to $47.50 with a reason. */
const mockRow = {
  month: '2026-08-01',
  income: 4000,
  spent: 3600,
  saved: 400,
  adjusted_saved: 47.5,
  note: 'Paid the plumber in cash',
  excluded_at: null,
};

let mockState: { data: unknown[]; isLoading: boolean; isError: boolean } = {
  data: [mockRow],
  isLoading: false,
  isError: false,
};
const mockRefetch = jest.fn();

jest.mock('@/api/queries', () => ({
  useMonthlySavings: () => ({ ...mockState, refetch: mockRefetch }),
}));

beforeEach(() => {
  mockState = { data: [mockRow], isLoading: false, isError: false };
  mockRefetch.mockClear();
});

describe('A month on the savings list', () => {
  it('seeds the correction from a row that lands after the first render', async () => {
    mockState = { data: [], isLoading: true, isError: false };
    const view = await render(<SavingsMonthScreen />);

    // Nothing about the month is claimed while it is still being read.
    expect(view.queryByText('That month is not on your savings.')).toBeNull();

    mockState = { data: [mockRow], isLoading: false, isError: false };
    await view.rerender(<SavingsMonthScreen />);

    // The saved correction, not an empty field that would overwrite it.
    expect(view.getByText('$47.50')).toBeTruthy();
    expect(view.getByDisplayValue('Paid the plumber in cash')).toBeTruthy();
  });

  it('answers a failed read with an error and a retry, not with "not on your savings"', async () => {
    mockState = { data: [], isLoading: false, isError: true };
    const { getByText, queryByText } = await render(<SavingsMonthScreen />);

    expect(getByText('Could not load that month')).toBeTruthy();
    expect(queryByText('That month is not on your savings.')).toBeNull();

    await fireEvent.press(getByText('Try again'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('still says so when the read landed and the month genuinely is not there', async () => {
    mockState = { data: [], isLoading: false, isError: false };
    const { getByText } = await render(<SavingsMonthScreen />);

    expect(getByText('That month is not on your savings.')).toBeTruthy();
  });
});
