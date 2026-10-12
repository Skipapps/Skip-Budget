import { fireEvent, render, screen, within } from '@testing-library/react-native';

import LoanScreen from '@/app/loan/[id]';
import type { LoanDetail, LoanDetailRead } from '@/api/loans';
import type { PaymentSourceRow } from '@/api/queries';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { termsFromStored } from '@/lib/loan';
import { loanStatus } from '@/lib/loan-status';
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
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
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
    // Edit loan is the footer's only action for now, outlined.
    const footer = within(screen.getByTestId('loan-view-footer'));
    expect(footer.getAllByRole('button')).toHaveLength(1);
    expect(footer.getByRole('button').props.className).toContain('border-control');
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
  });

  it('reads in French', async () => {
    setLanguage('fr');
    await render(<LoanScreen />);
    expect(screen.getByText('Reste à payer')).toBeTruthy();
    expect(screen.getByText('27 sur 48')).toBeTruthy();
    expect(screen.getByText('Historique')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modifier le prêt' })).toBeTruthy();
  });
});
