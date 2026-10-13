import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import LoanScreen from '@/app/loan/[id]';
import type { LoanDetail, LoanDetailRead } from '@/api/loans';
import type { PaymentSourceRow } from '@/api/queries';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { termsFromStored } from '@/lib/loan';
import { loanStatus } from '@/lib/loan-status';
import { withoutPayoff } from '@/lib/loan-payoff';
import { loanHistory, loanScheduleParams, upcomingPayments } from '@/lib/loan-view';

/**
 * A saved loan's own page, seen on 12 Oct 2026. The car loan is the Founder's wireframe loan as Add
 * loan saves it ($18,000 at 6.25% over four years, $424.80 a month, from 27 Dec 2024, first paid
 * 27 Jan 2025, daily interest): 21 payments made, $10,673.67 left, 27 of 48 to go, next 27 Oct.
 * Those figures are the independent reference's (src/lib/__fixtures__/add-loan-reference.ts).
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  selection: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/loan-icons', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const drawn = (name: string) => () => createElement(View, { testID: `icon-${name}` });
  return {
    useLoanIcons: () => new Proxy({}, { get: (_target, name) => drawn(String(name)) }),
    useLoanTypeIcons: () =>
      new Proxy({}, { get: (_target, name) => drawn(`type-${String(name)}`) }),
  };
});
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ card: '#FFFFFF', muted: '#77706A', ink: '#1B1A19', tintInk: '#6E3F5C' }),
  useTheme: () => ({ scheme: 'light' }),
}));
jest.mock('@/components/ui/skeleton', () => ({
  SkeletonList: () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return createElement(View, { testID: 'skeleton' });
  },
}));

const TODAY = '2026-10-12';
let mockToday = TODAY;
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRedirect = jest.fn();
let mockFocused = true;
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: () => mockBack(),
    replace: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => ({ id: 'bill-car' }),
  useIsFocused: () => mockFocused,
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));

const CHASE: PaymentSourceRow = {
  id: 'acct-chase',
  label: 'Chase ••4821',
  name: 'Chase',
  last4: '4821',
  color: '#2D6CDF',
  kind: 'account',
};

const mockRefetch = jest.fn();
let mockDetail: {
  data: LoanDetailRead | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};
jest.mock('@/api/loans', () => ({ useLoanDetail: () => mockDetail }));

const mockDeletePayoff = jest.fn(async (_input: unknown) => undefined);
const mockDeleteBill = jest.fn(async (id: string) => ({ id }));
jest.mock('@/api/mutations', () => ({
  useDeletePayoff: () => ({ mutateAsync: mockDeletePayoff, isPending: false }),
  useDeleteBill: () => ({ mutateAsync: mockDeleteBill, isPending: false }),
}));
// The real delete question over the loan's recorded payments (two, unless a test says so).
let mockPayments = 2;
let mockPaymentsRead = true;
const mockRetryPayments = jest.fn();
jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => {
    const { askDelete } = jest.requireActual('@/components/ui/past-choice').usePastChoice();
    return {
      ready: mockPaymentsRead,
      count: mockPayments,
      lastChargedOn: null,
      retry: mockRetryPayments,
      chooseDelete: (name: string, options: { stopped?: boolean; extra?: number } = {}) =>
        askDelete({
          name,
          noun: 'payments',
          count: mockPayments + (options.extra ?? 0),
          stopped: options.stopped,
        }),
    };
  },
}));
const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => true);
const mockAsk = jest.fn(async (_request: Record<string, unknown>) => null);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => mockAsk,
}));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

function carLoan(
  bill: Partial<LoanDetail['bill']> = {},
  loan: Partial<Omit<LoanDetail, 'bill'>> = {},
): LoanDetail {
  return {
    id: 'loan-car',
    bill_id: 'bill-car',
    principal: 18_000,
    annual_rate: 6.25,
    term_months: 48,
    monthly_payment: 424.8,
    total_interest: 2390.1,
    first_payment_on: '2025-01-27',
    funded_on: '2024-12-27',
    day_count_basis: 'actual/365',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    payment_day: null,
    created_at: '2026-10-12T09:00:00Z',
    source: CHASE,
    payoffs: [],
    ...loan,
    bill: {
      id: 'bill-car',
      name: 'Car loan',
      icon_id: 'loan-car',
      category_id: 'loans',
      amount: 424.8,
      starts_on: '2026-10-27',
      next_due_on: '2026-10-27',
      ends_on: '2028-12-27',
      card_id: null,
      bank_account_id: 'acct-chase',
      in_spending: true,
      created_at: '2026-10-12T09:00:00Z',
      ...bill,
    },
  };
}

const detailOf = (
  data: LoanDetailRead | undefined,
  more: Partial<typeof mockDetail> = {},
): typeof mockDetail => ({
  data,
  isPending: data === undefined,
  isError: false,
  refetch: mockRefetch,
  ...more,
});
const showing = (loan: LoanDetail) => {
  mockDetail = detailOf({ kind: 'loan', loan });
};

const termsOf = (loan: LoanDetail) => termsFromStored(loan, loan.bill.starts_on ?? undefined)!;
const hidden = { includeHiddenElements: true };

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockToday = TODAY;
  mockFocused = true;
  mockPayments = 2;
  mockPaymentsRead = true;
  showing(carLoan());
});

describe('the card', () => {
  it('shows what is left to pay, how far along it is, and the four facts, as drawn', async () => {
    await render(<LoanScreen />);
    expect(screen.getByRole('header', { name: 'Car loan' })).toBeTruthy();
    const card = within(screen.getByTestId('loan-view-card'));
    expect(card.getByText('Car loan')).toBeTruthy();
    expect(card.getByText('Next payment 27 Oct')).toBeTruthy();
    expect(card.getByText('$10,673.67')).toBeTruthy();
    expect(card.getByText('Left to pay')).toBeTruthy();
    expect(card.getByText('41% paid off')).toBeTruthy();
    for (const [label, value] of [
      ['Monthly', '$424.80'],
      ['Rate', '6.25%'],
      ['Payments left', '27 of 48'],
      ['Paid from', 'Chase ••4821'],
    ]) {
      expect(card.getByText(label)).toBeTruthy();
      expect(card.getByText(value)).toBeTruthy();
    }
    expect(screen.getAllByTestId('icon-type-car', hidden)).toHaveLength(1);
    // The bar is drawn to the percent said under it.
    expect(screen.getByTestId('loan-view-progress', hidden).props.style).toEqual([
      { width: '41%' },
      null,
    ]);
  });

  it('is read out as one summary, with the card’s digits said as words', async () => {
    await render(<LoanScreen />);
    expect(
      screen.getByLabelText(
        'Car loan. Next payment 27 Oct 2026. $10,673.67 left to pay, 41% paid off. Monthly, $424.80 Rate, 6.25% 27 of 48 payments left. Paid from, Chase, ending in 4821',
      ).props.accessible,
    ).toBe(true);
  });

  it('says First payment before any is made', async () => {
    showing(
      carLoan(
        { starts_on: '2027-01-27', next_due_on: '2027-01-27', ends_on: '2030-12-27' },
        { first_payment_on: '2027-01-27', funded_on: '2026-12-27' },
      ),
    );
    await render(<LoanScreen />);
    // Next year, so the year is said.
    expect(screen.getByText('First payment 27 Jan 2027')).toBeTruthy();
    expect(screen.getByText('$18,000.00')).toBeTruthy();
    expect(screen.getByText('0% paid off')).toBeTruthy();
  });

  it('says Skip when it is paid from no card or account', async () => {
    showing(carLoan({ bank_account_id: null }, { source: null }));
    await render(<LoanScreen />);
    expect(within(screen.getByTestId('loan-view-card')).getByText('Skip')).toBeTruthy();
  });

  it('names a card by its own name, as its Paid from tile does', async () => {
    const card: PaymentSourceRow = {
      id: 'card-2',
      label: 'Visa ••9001',
      name: 'Sapphire',
      last4: '9001',
      color: '#1F2A44',
      kind: 'card',
    };
    showing(carLoan({ bank_account_id: null, card_id: 'card-2' }, { source: card }));
    await render(<LoanScreen />);
    expect(screen.getByText('Sapphire ••9001')).toBeTruthy();
    expect(screen.getAllByText('Paid from Sapphire ••9001')).toHaveLength(3);
  });
});

describe('the payment schedule', () => {
  it('lists the next four payments, each with its date tile and split, off the loan’s schedule', async () => {
    await render(<LoanScreen />);
    const next = upcomingPayments(termsOf(carLoan()), TODAY, 4);
    expect(next.map((row) => [row.number, row.date])).toEqual([
      [22, '2026-10-27'],
      [23, '2026-11-27'],
      [24, '2026-12-27'],
      [25, '2027-01-27'],
    ]);
    const card = within(screen.getByTestId('loan-upcoming'));
    expect(card.getByRole('header', { name: 'Payment schedule' })).toBeTruthy();
    for (const row of next) {
      const line = within(screen.getByTestId(`loan-upcoming-${row.number}`));
      expect(line.getByText(`Payment ${row.number}`)).toBeTruthy();
      expect(
        line.getByText(
          `${formatCurrency(row.principal)} principal · ${formatCurrency(row.interest)} interest`,
        ),
      ).toBeTruthy();
      expect(line.getByText(formatCurrency(row.payment))).toBeTruthy();
      // Principal and interest are the payment, to the cent.
      expect(Math.round(row.principal * 100) + Math.round(row.interest * 100)).toBe(
        Math.round(row.payment * 100),
      );
    }
    const tiles = screen.getAllByTestId('loan-date-tile', hidden);
    expect(tiles).toHaveLength(4);
    expect(within(tiles[0]).getByText('27', hidden)).toBeTruthy();
    expect(within(tiles[0]).getByText('Oct', hidden)).toBeTruthy();
    expect(within(tiles[3]).getByText('Jan', hidden)).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Payment 22, 27 Oct 2026. $424.80: ${formatCurrency(next[0].principal)} principal, ${formatCurrency(next[0].interest)} interest.`,
      ),
    ).toBeTruthy();
  });

  it('opens the whole schedule from See all, on exactly this loan', async () => {
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'See all, Payment schedule' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/loan-schedule',
      params: { ...loanScheduleParams(termsOf(carLoan())), name: 'Car loan' },
    });
  });

  it('keeps the payment day of a day-31 loan first due on a clamped day', async () => {
    const loan = carLoan(
      { starts_on: '2026-10-31', next_due_on: '2026-10-31' },
      { first_payment_on: '2025-02-28', funded_on: '2025-01-31', payment_day: 31 },
    );
    showing(loan);
    await render(<LoanScreen />);
    expect(screen.getByText('Next payment 31 Oct')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'See all, Payment schedule' }));
    expect(mockPush.mock.calls[0][0].params.day).toBe('31');
  });
});

describe('the history', () => {
  it('lists the three latest payments made, newest first, with where they were paid from', async () => {
    await render(<LoanScreen />);
    const made = loanHistory(termsOf(carLoan()), TODAY);
    expect(made.total).toBe(21);
    const card = within(screen.getByTestId('loan-history'));
    expect(card.getByRole('header', { name: 'History' })).toBeTruthy();
    expect(['21', '20', '19'].map((n) => screen.queryByTestId(`loan-history-${n}`))).not.toContain(
      null,
    );
    expect(screen.queryByTestId('loan-history-18')).toBeNull();
    expect(card.getByText('27 Sep')).toBeTruthy();
    expect(card.getByText('27 Aug')).toBeTruthy();
    expect(card.getByText('27 Jul')).toBeTruthy();
    expect(card.getAllByText('Paid from Chase ••4821')).toHaveLength(3);
    expect(card.getAllByText('$424.80')).toHaveLength(3);
    expect(screen.getAllByTestId('loan-source-chip', hidden)[0].props.style).toEqual([
      { backgroundColor: '#2D6CDF' },
      false,
    ]);
    expect(
      screen.getByLabelText('Payment 21, 27 Sep 2026, $424.80, paid from Chase, ending in 4821.'),
    ).toBeTruthy();
  });

  it('shows every payment made after See all', async () => {
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'See all, History' }));
    expect(screen.getByTestId('loan-history-1')).toBeTruthy();
    expect(within(screen.getByTestId('loan-history')).getAllByText('$424.80')).toHaveLength(21);
    // Nothing more to see.
    expect(screen.queryByRole('button', { name: 'See all, History' })).toBeNull();
  });

  it('says when the first payment is, before any is made, and offers no See all', async () => {
    showing(
      carLoan(
        { starts_on: '2027-01-27', next_due_on: '2027-01-27', ends_on: '2030-12-27' },
        { first_payment_on: '2027-01-27', funded_on: '2026-12-27' },
      ),
    );
    await render(<LoanScreen />);
    expect(screen.getByText('Your first payment is on 27 Jan 2027.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'See all, History' })).toBeNull();
  });

  it('marks a loan paid from no card or account with the empty chip', async () => {
    showing(carLoan({ bank_account_id: null }, { source: null }));
    await render(<LoanScreen />);
    const card = within(screen.getByTestId('loan-history'));
    expect(card.getAllByText('No payment method')).toHaveLength(3);
    expect(screen.getAllByTestId('loan-source-chip-none', hidden)).toHaveLength(3);
    expect(screen.getByLabelText('Payment 21, 27 Sep 2026, $424.80.')).toBeTruthy();
  });
});

const AMEX: PaymentSourceRow = {
  id: 'card-amex',
  label: 'Amex ••6334',
  name: 'Amex',
  last4: '6334',
  color: '#4F7DBA',
  kind: 'card',
};

/** A payoff as `useLoanDetail` reads it: the stored row with its own card or account. */
function payoff(
  id: string,
  paidOn: string,
  amount: number,
  kind: 'full' | 'partial',
  source: PaymentSourceRow | null,
): LoanDetail['payoffs'][number] {
  return {
    id,
    bill_id: 'bill-car',
    paid_on: paidOn,
    amount,
    kind,
    card_id: source?.kind === 'card' ? source.id : null,
    bank_account_id: source?.kind === 'account' ? source.id : null,
    counted: true,
    created_at: `${paidOn}T12:00:00Z`,
    source,
  };
}

describe('payoffs', () => {
  // $2,000 from the Amex on 3 Oct: interest since 27 Sep first, the rest off the balance.
  const extra = payoff('po-1', '2026-10-03', 2000, 'partial', AMEX);

  it('reads the loan with them: less left to pay and fewer payments left', async () => {
    const loan = carLoan({}, { payoffs: [extra] });
    showing(loan);
    await render(<LoanScreen />);
    const status = loanStatus(termsOf(loan), TODAY);
    expect(status.amountLeft).toBe(8684.64);
    expect(status.paymentsLeft).toBe(22);
    const card = within(screen.getByTestId('loan-view-card'));
    expect(card.getByText('$8,684.64')).toBeTruthy();
    expect(card.getByText(`22 of ${status.paymentCount}`)).toBeTruthy();
  });

  it('lists one in History, newest first, from its own card, among the payments', async () => {
    showing(carLoan({}, { payoffs: [extra] }));
    await render(<LoanScreen />);
    const row = within(screen.getByTestId('loan-history-payoff-po-1'));
    expect(row.getByText('Extra payment')).toBeTruthy();
    expect(row.getByText('3 Oct · Paid from Amex ••6334')).toBeTruthy();
    expect(row.getByText('$2,000.00')).toBeTruthy();
    // It came after the 27 Sep payment, so it is on top; two payments fill the three shown.
    expect(screen.getByTestId('loan-history-21')).toBeTruthy();
    expect(screen.getByTestId('loan-history-20')).toBeTruthy();
    expect(screen.queryByTestId('loan-history-19')).toBeNull();
  });

  it('takes one back out after a confirm, putting the loan’s end back where it was', async () => {
    showing(carLoan({}, { payoffs: [extra] }));
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-1'));
    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'Remove this payment?',
      message:
        '$2,000.00 paid on 3 Oct 2026 comes off this loan, and its figures go back to how they were without it.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    expect(mockDeletePayoff).toHaveBeenCalledWith({
      billId: 'bill-car',
      payoffId: 'po-1',
      // The schedule without it: the term's own last payment.
      lastPaymentOn: '2028-12-27',
    });
    expect(mockToast).toHaveBeenCalledWith('toast.loan.paymentRemoved', 'deleted');
  });

  it('offers the same from a long press, and does nothing when the confirm is turned down', async () => {
    mockConfirm.mockResolvedValueOnce(false);
    showing(carLoan({}, { payoffs: [extra] }));
    await render(<LoanScreen />);
    await fireEvent(screen.getByTestId('loan-history-payoff-po-1'), 'longPress');
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockDeletePayoff).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('says the one failure line when it cannot take it out, and keeps the row', async () => {
    mockDeletePayoff.mockRejectedValueOnce(new Error('PGRST202'));
    showing(carLoan({}, { payoffs: [extra] }));
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-1'));
    expect(mockAsk).toHaveBeenCalledWith({ title: 'Something went wrong. Please try again.' });
    expect(mockToast).not.toHaveBeenCalled();
    expect(screen.getByTestId('loan-history-payoff-po-1')).toBeTruthy();
  });

  it('shows a loan paid off by one as finished, with no Pay off, and taking it back reopens it', async () => {
    const all = payoff('po-2', '2026-10-12', 10_701.09, 'full', null);
    // Its bill ends the day it was paid off.
    showing(carLoan({ ends_on: '2026-10-12' }, { payoffs: [all] }));
    await render(<LoanScreen />);
    const card = within(screen.getByTestId('loan-view-card'));
    expect(card.getByText('Paid off on 12 Oct 2026')).toBeTruthy();
    expect(card.getByText('$0.00')).toBeTruthy();
    expect(card.getByText('100% paid off')).toBeTruthy();
    expect(screen.getByText('No more payments on this loan.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pay off' })).toBeNull();

    const row = within(screen.getByTestId('loan-history-payoff-po-2'));
    expect(row.getByText('Paid off')).toBeTruthy();
    expect(row.getByText('12 Oct · No payment method')).toBeTruthy();
    expect(row.getByText('$10,701.09')).toBeTruthy();

    // The one thing a finished loan still offers: undoing the full payoff that finished it.
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-2'));
    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'Remove this payment?',
      message:
        '$10,701.09 paid on 12 Oct 2026 comes off this loan, and its figures go back to how they were without it.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    // Back to the term's own last payment: the loan runs again.
    expect(mockDeletePayoff).toHaveBeenCalledWith({
      billId: 'bill-car',
      payoffId: 'po-2',
      lastPaymentOn: '2028-12-27',
    });
    expect(mockToast).toHaveBeenCalledWith('toast.loan.paymentRemoved', 'deleted');
  });

  it('offers only the finishing payoff back: an earlier one on that loan stays history', async () => {
    const all = payoff('po-2', '2026-10-12', 8_701.09, 'full', null);
    showing(carLoan({ ends_on: '2026-10-12' }, { payoffs: [extra, all] }));
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-1'));
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockAsk).not.toHaveBeenCalled();
    expect(mockDeletePayoff).not.toHaveBeenCalled();
  });

  it('offers nothing back on a loan paid off on schedule', async () => {
    mockToday = '2029-03-01';
    showing(carLoan({}, { payoffs: [extra] }));
    await render(<LoanScreen />);
    expect(screen.getByText(/^Paid off on /)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'See all, History' }));
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-1'));
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeletePayoff).not.toHaveBeenCalled();
  });

  it('keeps the payoffs of a stopped loan as history too', async () => {
    showing(carLoan({ next_due_on: null, ends_on: '2026-10-05' }, { payoffs: [extra] }));
    await render(<LoanScreen />);
    expect(screen.getByText(/^Stopped on 5 Oct 2026/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-1'));
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeletePayoff).not.toHaveBeenCalled();
  });

  it('takes out only the latest; an earlier one says to take out the later first', async () => {
    const later = payoff('po-3', '2026-10-10', 500, 'partial', CHASE);
    const loan = carLoan({}, { payoffs: [extra, later] });
    showing(loan);
    await render(<LoanScreen />);

    // The earlier one: told, in words, which to take out first; nothing asked, nothing removed.
    const earlier = screen.getByTestId('loan-history-payoff-po-1');
    expect(earlier.props.accessibilityHint).toBe('Remove the later payment first');
    await fireEvent.press(earlier);
    expect(mockAsk).toHaveBeenCalledWith({
      title: 'Remove the later payment first',
      message: 'Payments come off newest first. Remove the one on 10 Oct 2026, then this one.',
    });
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeletePayoff).not.toHaveBeenCalled();

    // The latest: confirmed, and the bill goes back to where the loan ends without it.
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-3'));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    const back = withoutPayoff(termsOf(loan), 'po-3')!.endsOn;
    // The $2,000 that stays still ends the loan before its term's 27 Dec 2028.
    expect(back! < '2028-12-27').toBe(true);
    expect(mockDeletePayoff).toHaveBeenCalledWith({
      billId: 'bill-car',
      payoffId: 'po-3',
      lastPaymentOn: back,
    });
  });

  it('opens the whole schedule with its payoffs in it', async () => {
    showing(carLoan({}, { payoffs: [extra] }));
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'See all, Payment schedule' }));
    expect(mockPush.mock.calls[0][0].params.payoffs).toBe('[["2026-10-03",2000]]');
  });

  it('asks one removal at a time', async () => {
    let answer: (ok: boolean) => void = () => {};
    mockConfirm.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
    );
    showing(carLoan({}, { payoffs: [extra] }));
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-1'));
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-1'));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    await act(async () => answer(true));
    expect(mockDeletePayoff).toHaveBeenCalledTimes(1);
  });
});

describe('a finished loan', () => {
  it('says when it was paid off and has nothing coming', async () => {
    mockToday = '2029-03-01';
    await render(<LoanScreen />);
    const card = within(screen.getByTestId('loan-view-card'));
    expect(card.getByText('Paid off on 27 Dec 2028')).toBeTruthy();
    expect(card.getByText('$0.00')).toBeTruthy();
    expect(card.getByText('100% paid off')).toBeTruthy();
    expect(card.getByText('0 of 48')).toBeTruthy();
    expect(screen.getByText('No more payments on this loan.')).toBeTruthy();
    expect(screen.queryAllByTestId('loan-date-tile', hidden)).toHaveLength(0);
    // The last one first; earlier years say theirs.
    expect(within(screen.getByTestId('loan-history-48')).getByText('27 Dec 2028')).toBeTruthy();
  });

  it('freezes a stopped loan at the day its bill stopped: no payment after it, what was left then', async () => {
    const stopped = carLoan({ next_due_on: null, ends_on: '2026-06-27' });
    showing(stopped);
    await render(<LoanScreen />);
    const atStop = loanStatus(termsOf(stopped), '2026-06-27');
    const ifStillPaid = loanStatus(termsOf(stopped), TODAY);
    expect(atStop.paymentsMade).toBe(18);
    expect(ifStillPaid.paymentsMade).toBe(21);

    const card = within(screen.getByTestId('loan-view-card'));
    const left = formatCurrency(atStop.amountLeft);
    expect(card.getByText(`Stopped on 27 Jun 2026 · ${left} left`)).toBeTruthy();
    expect(card.getByText(left)).toBeTruthy();
    expect(card.getByText('30 of 48')).toBeTruthy();
    expect(screen.queryByText(formatCurrency(ifStillPaid.amountLeft))).toBeNull();

    // History ends at the stop; nothing is coming.
    expect(screen.getByTestId('loan-history-18')).toBeTruthy();
    expect(screen.queryByTestId('loan-history-19')).toBeNull();
    expect(screen.getByText('No more payments on this loan.')).toBeTruthy();
  });
});

describe('getting about', () => {
  it('opens the loan’s details to change, from the pencil and from Edit loan', async () => {
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit Car loan' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Edit loan' }));
    const edit = { pathname: '/add-loan', params: { id: 'bill-car' } };
    expect(mockPush.mock.calls).toEqual([[edit], [edit]]);
  });

  it('pins Pay off, in plum, over Edit loan, outlined, and opens the payoff for this loan', async () => {
    await render(<LoanScreen />);
    const footer = within(screen.getByTestId('loan-view-footer'));
    const [payOff, edit] = footer.getAllByRole('button');
    expect(payOff.props.accessibilityLabel).toBe('Pay off');
    expect(payOff.props.accessibilityHint).toBe('Pay all of this loan, or part of it.');
    expect(payOff.props.className).toContain('bg-control');
    expect(edit.props.accessibilityLabel).toBe('Edit loan');
    expect(edit.props.className).toContain('border-control');

    await fireEvent.press(payOff);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/loan-payoff', params: { id: 'bill-car' } });
  });

  it('offers no Pay off on a finished loan, paid off or stopped', async () => {
    mockToday = '2029-03-01';
    const { unmount } = await render(<LoanScreen />);
    expect(screen.queryByRole('button', { name: 'Pay off' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit loan' })).toBeNull();
    await unmount();

    mockToday = TODAY;
    showing(carLoan({ next_due_on: null, ends_on: '2026-06-27' }));
    await render(<LoanScreen />);
    expect(screen.queryByRole('button', { name: 'Pay off' })).toBeNull();
  });

  it('waits while it reads', async () => {
    mockDetail = detailOf(undefined);
    await render(<LoanScreen />);
    expect(screen.getByTestId('skeleton')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('offers Try again when it cannot read, never taking that for a loan gone', async () => {
    mockDetail = detailOf(undefined, { isPending: false, isError: true });
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('sends a Loans bill with no loan behind it to its bill page', async () => {
    mockDetail = detailOf({ kind: 'bill' });
    await render(<LoanScreen />);
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/bill/[id]',
      params: { id: 'bill-car' },
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('stays put once the loan is gone while its edit page is on top, which leaves for both', async () => {
    mockDetail = detailOf({ kind: 'gone' });
    mockFocused = false;
    await render(<LoanScreen />);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('steps back once the loan is gone while it is the page on top', async () => {
    mockDetail = detailOf({ kind: 'gone' });
    await render(<LoanScreen />);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('a finished loan is final', () => {
  // Stopped by Delete's "Keep past payments" today: final, so there is nothing to edit.
  const stopped = () => carLoan({ ends_on: TODAY });

  it('offers no pencil and no Edit loan, and Delete loan in their place', async () => {
    showing(stopped());
    await render(<LoanScreen />);
    expect(screen.getByText(/^Stopped on 12 Oct 2026/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit Car loan' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit loan' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pay off' })).toBeNull();
    const footer = within(screen.getByTestId('loan-view-footer'));
    expect(footer.getAllByRole('button').map((node) => node.props.accessibilityLabel)).toEqual([
      'Delete loan',
    ]);
  });

  it('asks only to remove it, the way out keeping its past, and deletes it on Remove everything', async () => {
    const payoff = { id: 'po-1', paid_on: '2026-10-03', amount: 2000, kind: 'partial' };
    showing(carLoan({ ends_on: TODAY }, { payoffs: [payoff] as never }));
    mockAsk.mockResolvedValueOnce('everything' as never);
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete loan' }));

    expect(mockAsk).toHaveBeenCalledWith({
      title: 'Delete Car loan?',
      // Two recorded payments and the payoff.
      message:
        'Car loan has 3 past payments. Keep them in your history, or remove them from past months too? Either way, nothing after today is recorded.',
      actions: [{ id: 'everything', label: 'Remove everything', destructive: true }],
      cancelLabel: 'Keep past payments',
    });
    expect(mockDeleteBill).toHaveBeenCalledWith('bill-car');
    expect(mockToast).toHaveBeenCalledWith('toast.loan.deleted', 'deleted');
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeTruthy();
  });

  it('keeps it as it is when the person keeps its past', async () => {
    showing(stopped());
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete loan' }));
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockDeleteBill).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete loan' })).toBeTruthy();
  });

  it('with nothing recorded, asks the plain Delete', async () => {
    mockPayments = 0;
    showing(stopped());
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete loan' }));
    expect(mockAsk).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete Car loan?', message: 'This can’t be undone.' }),
    );
  });

  it('waits for the payments, saying the one failure line, and asks nothing', async () => {
    mockPaymentsRead = false;
    showing(stopped());
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete loan' }));
    expect(mockRetryPayments).toHaveBeenCalled();
    expect(mockAsk).toHaveBeenCalledWith({ title: 'Something went wrong. Please try again.' });
    expect(mockDeleteBill).not.toHaveBeenCalled();
  });

  it('says the one failure line when it cannot delete, and offers Delete again', async () => {
    jest.spyOn(console, 'log').mockImplementationOnce(() => {});
    mockDeleteBill.mockRejectedValueOnce(new Error('offline'));
    mockAsk.mockResolvedValueOnce('everything' as never);
    showing(stopped());
    await render(<LoanScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete loan' }));
    expect(mockAsk).toHaveBeenLastCalledWith({ title: 'Something went wrong. Please try again.' });
    expect(screen.getByRole('button', { name: 'Delete loan' })).toBeTruthy();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('is just as final once paid off on schedule: its history, and Delete only', async () => {
    mockToday = '2029-03-01';
    await render(<LoanScreen />);
    expect(screen.getByText(/^Paid off on 27 Dec 2028/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit Car loan' })).toBeNull();
    const footer = within(screen.getByTestId('loan-view-footer'));
    expect(footer.getAllByRole('button').map((node) => node.props.accessibilityLabel)).toEqual([
      'Delete loan',
    ]);
    mockAsk.mockResolvedValueOnce('everything' as never);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete loan' }));
    expect(mockAsk).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: [{ id: 'everything', label: 'Remove everything', destructive: true }],
        cancelLabel: 'Keep past payments',
      }),
    );
    expect(mockDeleteBill).toHaveBeenCalledWith('bill-car');
  });
});

describe('in other languages', () => {
  it('reads in Spanish', async () => {
    setLanguage('es');
    await render(<LoanScreen />);
    expect(screen.getByText('Próximo pago: 27 oct')).toBeTruthy();
    expect(screen.getByText('Por pagar')).toBeTruthy();
    expect(screen.getByText('Pagos restantes')).toBeTruthy();
    expect(screen.getByText('27 de 48')).toBeTruthy();
    expect(screen.getByText('Historial')).toBeTruthy();
    expect(screen.getAllByText('Pagado desde Chase ••4821')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Editar préstamo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pagar' })).toBeTruthy();
  });

  it('reads in French', async () => {
    setLanguage('fr');
    await render(<LoanScreen />);
    expect(screen.getByText('Reste à payer')).toBeTruthy();
    expect(screen.getByText('27 sur 48')).toBeTruthy();
    expect(screen.getByText('Historique')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modifier le prêt' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rembourser' })).toBeTruthy();
  });
});
