import { act, fireEvent, render, screen } from '@testing-library/react-native';

import LoanCalculatorScreen from '@/app/loan-calculator';
import LoanScheduleScreen from '@/app/loan-schedule';
import SaveLoanScreen from '@/app/save-loan';
import { resetLocaleForTests } from '@/i18n/store';
import { failureMessage } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import type { LoanTerms } from '@/lib/loan';
import { resetLoanDraftForTests, startLoanDraft, updateLoanDraft } from '@/lib/loan-draft';
import { checkOverride, scheduleWithOverrides, type PaymentOverrides } from '@/lib/loan-overrides';

/**
 * The person's own numbers, end to end: the calculator opens the payment pages on its draft and
 * follows what they write; the schedule marks and opens changed payments; Save files the contract
 * with the changes, or says what to fix first. Every figure is the engine's for the same changes.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
  useLoanTypeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const mockConfirm = jest.fn(async (_options: Record<string, string>) => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));
jest.mock('@/providers/toast-context', () => ({ useToast: () => jest.fn() }));

const mockSave = jest.fn(async (_input: Record<string, unknown>) => ({ id: 'bill-1' }));
jest.mock('@/api/mutations', () => ({
  useSaveLoan: () => ({ mutateAsync: mockSave, isPending: false }),
}));
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: [] }) }));

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: jest.fn(),
    canDismiss: () => true,
    dismissAll: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
}));

// 9 Oct 2026: the calculator's first payment defaults to today, the money to a month before.
const TODAY = new Date(2026, 9, 9, 9, 0);
jest.useFakeTimers().setSystemTime(TODAY);

/** The calculator as it opens: $25,000 at 7.5% over five years, daily interest. */
const OPENING: LoanTerms = {
  principal: 25_000,
  annualRatePercent: 7.5,
  months: 60,
  firstPaymentOn: TODAY,
  fundedOn: new Date(2026, 8, 9, 9, 0),
  basis: 'actual/365',
  extra: { monthly: 0, lumpSums: [] },
};

/** Drew's car loan on the bank's own dates: $554.23 a month. */
const CAR_BANK = {
  amount: '32001',
  rate: '7.5',
  months: '72',
  start: '2026-03-15',
  funded: '2026-02-06',
  basis: 'actual/365',
};

afterAll(() => jest.useRealTimers());

beforeEach(() => {
  resetLocaleForTests();
  resetLoanDraftForTests();
  jest.clearAllMocks();
  mockParams = {};
});

/** Opens the calculator and its monthly payment page; returns the draft the page was given. */
async function openCalculator(): Promise<string> {
  await render(<LoanCalculatorScreen />);
  await fireEvent.press(
    screen.getByRole('button', { name: /^Monthly payment, \$[\d,.]+\. Edit$/ }),
  );
  const [[route]] = mockPush.mock.calls as [[{ pathname: string; params: Record<string, string> }]];
  expect(route.pathname).toBe('/loan-payment');
  expect(route.params).toEqual(
    expect.objectContaining({ amount: '25000', rate: '7.5', months: '60', target: 'monthly' }),
  );
  mockPush.mockClear();
  return route.params.draft;
}

/** What the payment page writes on Done. */
const write = (draft: string, overrides: PaymentOverrides) =>
  act(async () => {
    updateLoanDraft(draft, overrides);
  });

describe('the calculator', () => {
  it('follows the bank’s payment, says it is the bank’s, and still shows Skip’s figure', async () => {
    const draft = await openCalculator();
    await write(draft, { monthlyPayment: 505 });

    const engine = scheduleWithOverrides(OPENING, { monthlyPayment: 505 });
    expect(screen.getByText('Your bank’s payment')).toBeTruthy();
    expect(screen.getByText('$505.00')).toBeTruthy();
    expect(screen.getByText('Skip works it out as $500.97.')).toBeTruthy();
    expect(screen.getByText(formatCurrency(engine.totalInterest))).toBeTruthy();
    expect(
      screen.getAllByText(`${engine.paymentCount} payments`, { exact: false }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Your bank’s payment, $505.00. Edit' })).toBeTruthy();
  });

  it('warns of a balloon last payment, in the engine’s figure', async () => {
    const draft = await openCalculator();
    await write(draft, { monthlyPayment: 160 });
    const engine = scheduleWithOverrides(OPENING, { monthlyPayment: 160 });
    expect(engine.balloon).toBe(true);
    expect(
      screen.getByText(
        `Your last payment would be ${formatCurrency(engine.contract.finalPayment)}.`,
      ),
    ).toBeTruthy();
  });

  it('notes changes the loan never reaches, and saves without them', async () => {
    const draft = await openCalculator();
    await write(draft, { monthlyPayment: 2500, payments: { 58: 1000 } });
    expect(
      screen.getByText('Your change to payment 58 isn’t used: the loan is paid off before it.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/save-loan',
      params: expect.objectContaining({ monthly: '2500', overrides: '{"58":1000}' }),
    });
  });

  it('holds Save and says what to fix when a change no longer fits the loan', async () => {
    const draft = await openCalculator();
    await write(draft, { monthlyPayment: 300 });
    expect(screen.queryByText(/less than a month’s interest/)).toBeNull();

    // A bigger loan, which $300 a month no longer keeps up with.
    await fireEvent.press(screen.getByLabelText(/^Loan amount, /));
    for (let i = 0; i < 6; i += 1)
      await fireEvent.press(screen.getByLabelText('Delete last digit'));
    for (const key of [...'100000']) await fireEvent.press(screen.getByLabelText(key));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    const refused = checkOverride({ ...OPENING, principal: 100_000 }, {}, 'monthly', 300);
    expect(refused).toEqual(expect.objectContaining({ reason: 'below-interest' }));
    expect(
      screen.getByText(
        `Your bank’s payment can’t keep up with this loan’s interest any more (at least ${formatCurrency(refused?.minimum ?? 0)}). Change it, or use Skip’s figure.`,
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('To save this loan, fix: the monthly payment.')).toBeTruthy();
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the schedule on its draft, with the changes as they stand', async () => {
    const draft = await openCalculator();
    await write(draft, { payments: { 12: 1000 } });
    await fireEvent.press(screen.getByRole('button', { name: 'Payment schedule' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/loan-schedule',
      params: expect.objectContaining({ draft, overrides: '{"12":1000}' }),
    });
  });
});

describe('the schedule', () => {
  it('marks a changed payment and opens any payment on the open draft', async () => {
    const draft = startLoanDraft();
    updateLoanDraft(draft, { payments: { 3: 2000 } });
    mockParams = { ...CAR_BANK, draft };
    await render(<LoanScheduleScreen />);

    const changed = screen.getByRole('button', { name: /^Payment 3, .* Changed by you\.$/ });
    expect(changed.props.accessibilityHint).toBe('Opens this payment so you can change it.');
    expect(screen.getAllByTestId('payment-changed')).toHaveLength(1);
    expect(screen.getByText('Changed')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /^Payment 5, / }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/loan-payment',
      params: { ...CAR_BANK, draft, target: '5' },
    });
  });

  it('follows a change written while it is open', async () => {
    const draft = startLoanDraft();
    mockParams = { ...CAR_BANK, draft };
    await render(<LoanScheduleScreen />);
    expect(screen.queryByText('Changed')).toBeNull();

    await write(draft, { payments: { 12: 10_000 } });
    // Payment 12 is past the first eight rows.
    await fireEvent.press(screen.getByRole('button', { name: /^Show all \d+ payments$/ }));
    expect(screen.getByText('Changed')).toBeTruthy();
    // $10,000 as payment 12 ends the loan after 49 payments.
    expect(screen.getByText('6 years · 49')).toBeTruthy();
  });

  it('shows a saved loan’s changes but opens none of its payments', async () => {
    mockParams = { ...CAR_BANK, payment: '554.23', overrides: '{"12":10000}', name: 'Car loan' };
    await render(<LoanScheduleScreen />);
    expect(screen.getByText('Car loan')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^Show all \d+ payments$/ }));
    expect(screen.getByText('Changed')).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /^Payment \d+, / })).toHaveLength(0);
    expect(screen.getAllByLabelText(/^Payment \d+, /).length).toBeGreaterThan(0);
  });

  it('calls the bank’s payment so, and warns of a balloon', async () => {
    mockParams = { ...CAR_BANK, monthly: '245' };
    await render(<LoanScheduleScreen />);
    const engine = scheduleWithOverrides(
      {
        principal: 32_001,
        annualRatePercent: 7.5,
        months: 72,
        firstPaymentOn: new Date(2026, 2, 15),
        fundedOn: new Date(2026, 1, 6),
        basis: 'actual/365',
      },
      { monthlyPayment: 245 },
    );
    expect(engine.balloon).toBe(true);
    expect(screen.getByText('Your bank’s payment')).toBeTruthy();
    expect(
      screen.getByText(
        `Your last payment would be ${formatCurrency(engine.contract.finalPayment)}.`,
      ),
    ).toBeTruthy();
  });
});

describe('saving', () => {
  async function saveWith(params: Record<string, string>) {
    mockParams = params;
    await render(<SaveLoanScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Car loan'), 'Car loan');
    await fireEvent.press(screen.getByRole('radio', { name: 'Skip' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save to Loans' }));
  }

  it('files the bank’s payment and the contract’s interest, with nothing else to send', async () => {
    await saveWith({ ...CAR_BANK, funded: '2026-02-15', monthly: '554.23' });
    expect(screen.getAllByText('Your bank’s payment').length).toBeGreaterThan(0);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyPayment: 554.23,
        // Drew's fixture: a final payment of $462.11, 72 payments, $7,811.44 of interest.
        totalInterest: 7811.44,
        paymentOverrides: null,
        lastPaymentOn: null,
      }),
    );
  });

  it('files changed payments and the earlier payoff they bring', async () => {
    await saveWith({ ...CAR_BANK, overrides: '{"12":10000}' });
    expect(screen.getByText('49 monthly')).toBeTruthy();
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyPayment: 554.23,
        totalInterest: 4547.31,
        paymentOverrides: { '12': 10_000 },
        lastPaymentOn: '2030-03-15',
      }),
    );
  });

  it('files a change above what is owed as typed, and the payoff it brings', async () => {
    await saveWith({ ...CAR_BANK, overrides: '{"30":50000,"40":600}' });
    const engine = scheduleWithOverrides(
      {
        principal: 32_001,
        annualRatePercent: 7.5,
        months: 72,
        firstPaymentOn: new Date(2026, 2, 15),
        fundedOn: new Date(2026, 1, 6),
        basis: 'actual/365',
      },
      { payments: { 30: 50_000, 40: 600 } },
    );
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        // Kept as typed; the engine takes it as exactly what is owed, so it still pays off.
        paymentOverrides: { '30': 50_000 },
        lastPaymentOn: engine.contract.payoffOn,
        totalInterest: engine.contract.totalInterest,
      }),
    );
    expect(engine.contract.rows).toHaveLength(30);
    expect(engine.contract.rows[29].payment).toBeLessThan(50_000);
  });

  it('says what to fix from the start, and saves nothing until it is fixed', async () => {
    await saveWith({ ...CAR_BANK, monthly: '150' });
    expect(screen.getByText('To save this loan, fix: the monthly payment.')).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it.each([
    [
      { code: '23514', message: 'violates check constraint "loans_payment_overrides_valid"' },
      'Skip couldn’t save your changed payments. Check them on the schedule, then try again.',
    ],
    [
      { code: '23514', message: 'violates check constraint "loans_annual_rate_check"' },
      'Skip can save rates from 0% to 100%, with up to nine decimals.',
    ],
    [
      { code: 'P0001', message: 'the last payment must fall within the term' },
      'Skip couldn’t save when this loan ends. Check your changed payments, then try again.',
    ],
    [new Error('network down'), failureMessage(new Error('network down'))],
  ])('says in its own words why the database refused it', async (thrown, words) => {
    mockSave.mockRejectedValueOnce(thrown);
    await saveWith(CAR_BANK);
    expect(screen.getByText(words)).toBeTruthy();
  });
});
