import { fireEvent, render, screen } from '@testing-library/react-native';

import LoanScheduleScreen from '@/app/loan-schedule';
import { resetLocaleForTests } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { amortise, scheduleByYear } from '@/lib/loan';

/**
 * The schedule as designed: a summary card, then the payments by year, the first few showing and
 * the rest behind "Show all". Each year's heading counts the whole year. The rate is called an APR
 * only when the fees are known and the disclosure agrees with it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { back: jest.fn(), canGoBack: () => true },
}));

// The design's loan: $25,000 at 7.50% over five years, monthly rests, first paid 9 Oct 2026.
const DESIGN = {
  amount: '25000',
  rate: '7.5',
  months: '60',
  start: '2026-10-09',
  funded: '2026-09-09',
  basis: 'monthly',
  extra: '0',
  lump: '0',
  lumpOn: '2027-10-09',
  fees: '0',
};
const ENGINE = amortise({
  principal: 25_000,
  annualRatePercent: 7.5,
  months: 60,
  firstPaymentOn: new Date(2026, 9, 9),
  fundedOn: new Date(2026, 8, 9),
  basis: 'monthly',
});

const rowsShown = () =>
  screen
    .queryAllByLabelText(/^Payment \d+, /)
    .map((row) => Number(/\d+/.exec(row.props.accessibilityLabel)?.[0]));

beforeEach(() => {
  resetLocaleForTests();
  mockParams = DESIGN;
});

describe('the summary card', () => {
  it('shows the design’s figures, and calls the rate an APR when the disclosure agrees', async () => {
    await render(<LoanScheduleScreen />);
    for (const line of [
      'Payment schedule',
      'Monthly payment',
      '$500.95',
      'Rate',
      '7.50% APR',
      'Term',
      '5 years · 60',
      'Total interest',
      '$5,056.96',
      'Total you repay',
      '$30,056.96',
    ]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
    expect([ENGINE.payment, ENGINE.totalInterest, ENGINE.totalPaid]).toEqual([
      500.95, 5056.96, 30056.96,
    ]);
  });

  it('keeps the rate plain and adds the APR when fees take it away from the rate', async () => {
    mockParams = { ...DESIGN, fees: '500' };
    await render(<LoanScheduleScreen />);
    expect(screen.getByText('7.50%')).toBeTruthy();
    expect(screen.queryByText('7.50% APR')).toBeNull();
    expect(screen.getByText('APR')).toBeTruthy();
    expect(screen.getByText(/^8\.\d\d%$/)).toBeTruthy();
  });

  it('does not call a loan on file’s rate an APR: its fees were never kept', async () => {
    const { fees: _fees, ...onFile } = DESIGN;
    mockParams = { ...onFile, payment: '500.95', name: 'Car loan' };
    await render(<LoanScheduleScreen />);
    expect(screen.getByText('Car loan')).toBeTruthy();
    expect(screen.getByText('7.50%')).toBeTruthy();
    expect(screen.queryByText(/APR/)).toBeNull();
  });
});

describe('the payments', () => {
  it('shows the first eight, under each year’s whole-year totals', async () => {
    await render(<LoanScheduleScreen />);
    expect(rowsShown()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const [y2026, y2027] = scheduleByYear(ENGINE.rows);
    expect(screen.getByText('2026')).toBeTruthy();
    expect(
      screen.getByText(`3 payments · ${formatCurrency(y2026.interest)} interest`),
    ).toBeTruthy();
    expect(
      screen.getByText(`12 payments · ${formatCurrency(y2027.interest)} interest`),
    ).toBeTruthy();
    // As drawn: $462.28 and $1,649.02.
    expect([y2026.interest, y2027.interest]).toEqual([462.28, 1649.02]);
    expect(screen.queryByText('2028')).toBeNull();
  });

  it('draws the first row as designed', async () => {
    await render(<LoanScheduleScreen />);
    for (const line of [
      '1',
      '9 Oct 2026',
      '$344.70 principal · $156.25 interest',
      '$24,655.30 left',
    ]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
  });

  it('shows all of them, once asked, and ends on nothing left', async () => {
    await render(<LoanScheduleScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Show all 60 payments' }));
    expect(rowsShown()).toEqual(ENGINE.rows.map((row) => row.number));
    expect(screen.queryByRole('button', { name: /^Show all/ })).toBeNull();
    expect(screen.getByText('2031')).toBeTruthy();
    expect(screen.getAllByText('$0.00 left').length).toBe(1);
  });

  it('has no Show all for a loan of eight payments or fewer', async () => {
    mockParams = { ...DESIGN, months: '8' };
    await render(<LoanScheduleScreen />);
    expect(rowsShown()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(screen.queryByRole('button', { name: /^Show all/ })).toBeNull();
  });
});
