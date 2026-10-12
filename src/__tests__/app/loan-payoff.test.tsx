import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import LoanPayoffScreen from '@/app/loan-payoff';
import type { LoanDetail, LoanDetailRead } from '@/api/loans';
import type { PaymentSourceRow } from '@/api/queries';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { termsFromStored } from '@/lib/loan';
import { checkPayoff, payoffQuote } from '@/lib/loan-payoff';

/**
 * Paying a loan off, all or part of it, on 12 Oct 2026. The car loan is the wireframe loan as Add
 * loan saves it ($18,000 at 6.25% over four years, $424.80 a month, first paid
 * 27 Jan 2025, daily interest): 21 payments made, $10,673.67 left, 27 to go. Paying it all that
 * day is $10,701.09: the $10,673.67 plus $27.42 of interest since 27 Sep (10,673.67 × 6.25% ×
 * 15 / 365 = 27.416…). Every figure on the page is the engine's; the tests check both.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockWarn = jest.fn();
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  selection: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: () => mockWarn(),
}));
jest.mock('@/theme/loan-icons', () => {
  const { View } = jest.requireActual('react-native');
  const named = () =>
    new Proxy({}, { get: (_, name) => () => <View testID={`icon-${String(name)}`} /> });
  return { useLoanIcons: named, useLoanTypeIcons: named };
});
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useTheme: () => ({ scheme: 'light' }),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/ui/skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return { SkeletonList: () => <View testID="skeleton" />, Skeleton: () => null };
});
// The day picked on the calendar, and the limits it was given.
let mockPickedDay = new Date(2026, 9, 3);
const mockCalendar: { minDate?: Date | null; maxDate?: Date | null }[] = [];
jest.mock('@/components/flow/inline-calendar', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    InlineCalendar: (props: {
      onChange: (date: Date) => void;
      minDate?: Date | null;
      maxDate?: Date | null;
    }) => {
      mockCalendar.push({ minDate: props.minDate, maxDate: props.maxDate });
      return <Pressable testID="calendar" onPress={() => props.onChange(mockPickedDay)} />;
    },
  };
});

const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

const mockRecord = jest.fn(async (_input: Record<string, unknown>) => undefined);
jest.mock('@/api/mutations', () => ({
  useRecordPayoff: () => ({ mutateAsync: mockRecord, isPending: false }),
}));

const CHASE: PaymentSourceRow = {
  id: 'acct-chase',
  label: 'Chase ••4821',
  name: 'Chase',
  last4: '4821',
  color: '#2D6CDF',
  kind: 'account',
};
const AMEX: PaymentSourceRow = {
  id: 'card-amex',
  label: 'Amex ••6334',
  name: 'Amex',
  last4: '6334',
  color: '#4F7DBA',
  kind: 'card',
};
jest.mock('@/api/queries', () => ({
  usePaymentSources: () => ({ sources: [AMEX, CHASE] }),
}));

const TODAY = '2026-10-12';
let mockToday = TODAY;
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));

const mockNav = jest.fn();
let mockFocused = true;
const mockSwipe: boolean[] = [];
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'bill-car' }),
  useFocusEffect: () => {},
  useIsFocused: () => mockFocused,
  Stack: {
    Screen: ({ options }: { options: { gestureEnabled: boolean } }) => {
      mockSwipe.push(options.gestureEnabled);
      return null;
    },
  },
  router: {
    back: () => mockNav('back'),
    canGoBack: () => true,
    push: (href: unknown) => mockNav('push', href),
    replace: (href: unknown) => mockNav('replace', href),
  },
}));

const mockRefetch = jest.fn();
let mockDetail: {
  data: LoanDetailRead | undefined;
  isPending: boolean;
  isError: boolean;
  /** Read since the page opened, rather than from the cache. */
  isFetchedAfterMount: boolean;
  isFetching: boolean;
  refetch: () => void;
};
/** A read that has landed since the page opened. */
const freshRead = (data: LoanDetailRead | undefined, isError = false): typeof mockDetail => ({
  data,
  isPending: false,
  isError,
  isFetchedAfterMount: true,
  isFetching: false,
  refetch: mockRefetch,
});
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
    payoffs: [],
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

const showing = (loan: LoanDetail) => {
  mockDetail = freshRead({ kind: 'loan', loan });
};
/** $2,000 paid off on 3 Oct from the Amex. */
const EXTRA_ON_THIRD: LoanDetail['payoffs'][number] = {
  id: 'po-1',
  bill_id: 'bill-car',
  paid_on: '2026-10-03',
  amount: 2000,
  kind: 'partial',
  card_id: 'card-amex',
  bank_account_id: null,
  counted: true,
  created_at: '2026-10-03T12:00:00Z',
  source: AMEX,
};
const termsOf = (loan: LoanDetail) => termsFromStored(loan, loan.bill.starts_on ?? undefined)!;

/** Types an amount on the keypad, key by key. */
async function type(amount: string) {
  for (const key of amount) {
    await fireEvent.press(
      screen.getByRole('button', { name: key === '.' ? 'Decimal point' : key }),
    );
  }
}
const line = () => screen.getByTestId('payoff-line');
const continueButton = () => screen.getByRole('button', { name: 'Continue' });
const payOffButton = () => screen.getByRole('button', { name: 'Pay off' });

let announce: jest.SpyInstance;

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockCalendar.length = 0;
  mockSwipe.length = 0;
  mockToday = TODAY;
  mockFocused = true;
  mockPickedDay = new Date(2026, 9, 3);
  mockRecord.mockImplementation(async () => undefined);
  showing(carLoan());
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

afterEach(() => {
  announce.mockRestore();
});

describe('the amount', () => {
  it('opens on the keypad, saying what clears the loan today', async () => {
    await render(<LoanPayoffScreen />);
    expect(screen.getByRole('header', { name: 'Pay off Car loan' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'How much are you paying?' })).toBeTruthy();
    expect(screen.getByText('All of it or part of it, as you like.')).toBeTruthy();
    expect(payoffQuote(termsOf(carLoan()), TODAY).payoff).toBe(10_701.09);
    expect(line().props.children).toBe('$10,701.09 clears this loan today');
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: true });
    const all = screen.getByRole('button', { name: 'Pay it all' });
    expect(all.props.accessibilityState).toMatchObject({ selected: false });
    expect(all.props.accessibilityHint).toBe('$10,701.09 clears this loan today');
    // The page the flow opens on lets the edge swipe leave.
    expect(mockSwipe.at(-1)).toBe(true);
  });

  it('says what part of it does as it is typed: fewer payments, and the new last one', async () => {
    await render(<LoanPayoffScreen />);
    await type('2000');
    const check = checkPayoff(termsOf(carLoan()), { on: TODAY, amount: 2000 }, TODAY);
    expect(check).toMatchObject({
      ok: true,
      kind: 'partial',
      paymentsLeft: 22,
      paymentsLeftBefore: 27,
      endsOn: '2028-07-27',
    });
    expect(line().props.children).toBe('22 payments left instead of 27, last payment 27 Jul 2028');
    expect(line().props.accessibilityLabel).toBe(
      '22 payments left instead of 27, last payment 27 Jul 2028',
    );
    expect(continueButton().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('says the count stays when a part is too small to take a payment off', async () => {
    await render(<LoanPayoffScreen />);
    await type('100');
    expect(line().props.children).toBe('Still 27 payments left, last payment 27 Dec 2028');
  });

  it('fills in what clears the loan with Pay it all, and says the loan is paid off', async () => {
    await render(<LoanPayoffScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay it all' }));
    expect(screen.getByText('10,701.09')).toBeTruthy();
    expect(line().props.children).toBe('This pays off Car loan. No more payments after 12 Oct.');
    expect(line().props.accessibilityLabel).toBe(
      'This pays off Car loan. No more payments after 12 Oct 2026.',
    );
    expect(
      screen.getByRole('button', { name: 'Pay it all' }).props.accessibilityState,
    ).toMatchObject({ selected: true });

    // Typing takes over from it, starting from the figure it filled in.
    await fireEvent.press(screen.getByRole('button', { name: 'Delete last digit' }));
    expect(screen.getByText('10,701.0')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Pay it all' }).props.accessibilityState,
    ).toMatchObject({ selected: false });
    expect(line().props.children).toMatch(/payments? left/);
  });

  it('refuses more than it takes, in words, with Pay it all right under it', async () => {
    await render(<LoanPayoffScreen />);
    await type('99999');
    expect(line().props.children).toBe(
      'That’s more than this loan needs. $10,701.09 clears it today.',
    );
    await fireEvent.press(continueButton());
    // Still on the keypad, told why.
    expect(screen.getByRole('header', { name: 'How much are you paying?' })).toBeTruthy();
    expect(mockWarn).toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith(
      'That’s more than this loan needs. $10,701.09 clears it today.',
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Pay it all' }));
    expect(line().props.children).toBe('This pays off Car loan. No more payments after 12 Oct.');
  });

  it('on a payment day, pays it all after that day’s payment, which posts first', async () => {
    mockToday = '2026-10-27';
    await render(<LoanPayoffScreen />);
    // $424.80 goes in that day, then the balance it leaves: $10,303.70.
    expect(payoffQuote(termsOf(carLoan()), '2026-10-27').payoff).toBe(10_303.7);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay it all' }));
    expect(screen.getByText('10,303.7')).toBeTruthy();
    expect(line().props.children).toBe('This pays off Car loan. No more payments after 27 Oct.');
    await fireEvent.press(continueButton());
    expect(within(screen.getByTestId('payoff-card')).getByText('$10,303.70')).toBeTruthy();
  });

  it('refuses paying it all before a payment already made, naming the first day it can', async () => {
    await render(<LoanPayoffScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay it all' }));
    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('button', { name: /^Paid on/ }));
    mockPickedDay = new Date(2026, 8, 20);
    await fireEvent.press(screen.getByTestId('calendar'));
    const refusal = 'Your payment on 27 Sep is already made. You can pay it all from 27 Sep.';
    expect(screen.getByTestId('payoff-review-line').props.children).toBe(refusal);
    await fireEvent.press(payOffButton());
    expect(mockRecord).not.toHaveBeenCalled();
    // Read out with the dates in full.
    expect(announce).toHaveBeenCalledWith(
      'Your payment on 27 Sep 2026 is already made. You can pay it all from 27 Sep 2026.',
    );
  });
});

describe('the review', () => {
  it('shows the amount and what it does, the interest in it, today, and the loan’s own account', async () => {
    await render(<LoanPayoffScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay it all' }));
    await fireEvent.press(continueButton());

    const card = within(screen.getByTestId('payoff-card'));
    expect(card.getByText('Car loan')).toBeTruthy();
    expect(card.getByText('$10,701.09')).toBeTruthy();
    expect(card.getByText('You’re paying')).toBeTruthy();
    expect(card.getByText('This pays off Car loan. No more payments after 12 Oct.')).toBeTruthy();
    // The $10,673.67 left on the Loans page, plus what built up since the last payment.
    expect(card.getByText('Includes $27.42 of interest since 27 Sep.')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Car loan. You’re paying, $10,701.09. This pays off Car loan. No more payments after 12 Oct 2026. Includes $27.42 of interest since 27 Sep 2026.',
      ).props.accessible,
    ).toBe(true);

    expect(screen.getByText('Paid on')).toBeTruthy();
    expect(screen.getByText(/^Today/)).toBeTruthy();
    const chase = screen.getByRole('radio', { name: 'Chase, ending in 4821' });
    expect(chase.props.accessibilityState).toMatchObject({ selected: true });
    // Only the keypad page lets the edge swipe leave; here it steps back.
    expect(mockSwipe.at(-1)).toBe(false);
  });

  it('offers days from the first one it can be paid in full to today, none after', async () => {
    await render(<LoanPayoffScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay it all' }));
    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('button', { name: /^Paid on/ }));
    const limits = mockCalendar.at(-1)!;
    // Paid in full from the 27 Sep payment already made, which posts first that day.
    expect(limits.minDate?.toDateString()).toBe(new Date(2026, 8, 27).toDateString());
    expect(limits.maxDate?.toDateString()).toBe(new Date(2026, 9, 12).toDateString());
  });

  it('offers any day from the loan’s start for a part payment', async () => {
    await render(<LoanPayoffScreen />);
    await type('2000');
    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('button', { name: /^Paid on/ }));
    expect(mockCalendar.at(-1)!.minDate?.toDateString()).toBe(
      new Date(2024, 11, 27).toDateString(),
    );
  });

  it('moves Pay it all with the day picked', async () => {
    await render(<LoanPayoffScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay it all' }));
    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('button', { name: /^Paid on/ }));
    await fireEvent.press(screen.getByTestId('calendar'));

    const onThird = payoffQuote(termsOf(carLoan()), '2026-10-03').payoff;
    expect(onThird).toBe(10_684.64);
    expect(within(screen.getByTestId('payoff-card')).getByText('$10,684.64')).toBeTruthy();
    expect(screen.getByText('This pays off Car loan. No more payments after 3 Oct.')).toBeTruthy();

    await fireEvent.press(payOffButton());
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ paidOn: '2026-10-03', amount: 10_684.64, kind: 'full' }),
    );
  });

  it('keeps a typed amount when the day moves, refusing it if it then clears more than owed', async () => {
    await render(<LoanPayoffScreen />);
    await type('10701.09');
    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('button', { name: /^Paid on/ }));
    await fireEvent.press(screen.getByTestId('calendar'));

    const refusal = 'That’s more than this loan needs. $10,684.64 clears it on 3 Oct.';
    expect(screen.getByTestId('payoff-review-line').props.children).toBe(refusal);
    await fireEvent.press(payOffButton());
    expect(mockRecord).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Pay $10,684.64' }));
    expect(screen.getByText('This pays off Car loan. No more payments after 3 Oct.')).toBeTruthy();
    expect(screen.queryByText(refusal)).toBeNull();
  });

  it('goes back to the keypad with the amount kept, from Back and from Change amount', async () => {
    await render(<LoanPayoffScreen />);
    await type('2000');
    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('2,000')).toBeTruthy();
    expect(mockNav).not.toHaveBeenCalled();

    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('button', { name: 'Change amount' }));
    expect(screen.getByText('2,000')).toBeTruthy();
  });
});

describe('paying', () => {
  it('records the whole payoff from the loan’s account, ending the loan today', async () => {
    await render(<LoanPayoffScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay it all' }));
    await fireEvent.press(continueButton());
    await fireEvent.press(payOffButton());
    expect(mockRecord).toHaveBeenCalledWith({
      billId: 'bill-car',
      paidOn: TODAY,
      amount: 10_701.09,
      kind: 'full',
      cardId: null,
      bankAccountId: 'acct-chase',
      lastPaymentOn: TODAY,
      today: TODAY,
    });
    expect(mockToast).toHaveBeenCalledWith('toast.loan.paidOff');
    // Back to the loan's page, which the payoff sits on.
    expect(mockNav.mock.calls).toEqual([['back']]);
  });

  it('records a part payment from the card picked, ending the bill on the new last payment', async () => {
    await render(<LoanPayoffScreen />);
    await type('2000');
    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('radio', { name: 'Amex, ending in 6334' }));
    await fireEvent.press(payOffButton());
    expect(mockRecord).toHaveBeenCalledWith({
      billId: 'bill-car',
      paidOn: TODAY,
      amount: 2000,
      kind: 'partial',
      cardId: 'card-amex',
      bankAccountId: null,
      lastPaymentOn: '2028-07-27',
      today: TODAY,
    });
    expect(mockToast).toHaveBeenCalledWith('toast.loan.paymentRecorded');
    expect(mockNav.mock.calls).toEqual([['back']]);
  });

  it('pays from no card or account with Skip', async () => {
    await render(<LoanPayoffScreen />);
    await type('500');
    await fireEvent.press(continueButton());
    await fireEvent.press(screen.getByRole('radio', { name: 'Skip' }));
    await fireEvent.press(payOffButton());
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: null, bankAccountId: null }),
    );
  });

  it('starts on Skip for a loan paid from no card or account', async () => {
    showing(carLoan({ bank_account_id: null }, { source: null }));
    await render(<LoanPayoffScreen />);
    await type('500');
    await fireEvent.press(continueButton());
    expect(screen.getByRole('radio', { name: 'Skip' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('says Paying off… while it records, and records once however often it is pressed', async () => {
    let finish: () => void = () => {};
    mockRecord.mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          finish = () => resolve(undefined);
        }),
    );
    await render(<LoanPayoffScreen />);
    await type('500');
    await fireEvent.press(continueButton());
    await fireEvent.press(payOffButton());
    const busy = screen.getByRole('button', { name: 'Paying off…' });
    expect(busy.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(busy);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(mockNav.mock.calls).toEqual([['back']]);
  });

  it('stays, with the one failure line, when it cannot record, and can be tried again', async () => {
    mockRecord.mockImplementation(async () => {
      throw new Error('PGRST202');
    });
    await render(<LoanPayoffScreen />);
    await type('500');
    await fireEvent.press(continueButton());
    await fireEvent.press(payOffButton());
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockNav).not.toHaveBeenCalled();

    await fireEvent.press(payOffButton());
    expect(mockRecord).toHaveBeenCalledTimes(2);
  });
});

describe('leaving', () => {
  it('goes back to the loan from the keypad’s Back, and asks before close throws it away', async () => {
    await render(<LoanPayoffScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockNav.mock.calls).toEqual([['back']]);

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cancel this payment?' }),
    );
  });
});

describe('a loan that cannot be paid off', () => {
  it('says a finished loan is paid off already', async () => {
    mockToday = '2029-03-01';
    await render(<LoanPayoffScreen />);
    expect(screen.getByText('This loan is already paid off.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pay it all' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockNav).toHaveBeenCalledWith('back');
  });

  it('says one stopped with money left is finished too', async () => {
    showing(carLoan({ next_due_on: null, ends_on: '2026-06-27' }));
    await render(<LoanPayoffScreen />);
    expect(screen.getByText('This loan is already paid off.')).toBeTruthy();
  });

  it('says one not started yet starts later', async () => {
    showing(
      carLoan(
        { starts_on: '2027-01-27', next_due_on: '2027-01-27', ends_on: '2030-12-27' },
        { first_payment_on: '2027-01-27', funded_on: '2026-12-27' },
      ),
    );
    await render(<LoanPayoffScreen />);
    expect(
      screen.getByText('This loan starts on 27 Dec. You can pay it off from then.'),
    ).toBeTruthy();
  });

  it('waits while it reads, offers Try again when it cannot, and leaves when the loan is gone', async () => {
    mockDetail = {
      ...freshRead(undefined),
      isPending: true,
      isFetchedAfterMount: false,
      isFetching: true,
    };
    const first = await render(<LoanPayoffScreen />);
    expect(screen.getByTestId('skeleton')).toBeTruthy();
    await first.unmount();

    mockDetail = freshRead(undefined, true);
    const second = await render(<LoanPayoffScreen />);
    mockRefetch.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockNav).not.toHaveBeenCalled();
    await second.unmount();

    mockDetail = freshRead({ kind: 'gone' });
    await render(<LoanPayoffScreen />);
    expect(mockNav).toHaveBeenCalledWith('back');
  });

  it('reads the loan again on opening, and prices nothing until that read lands', async () => {
    // The cache still has the loan from before a $2,000 payoff on 3 Oct.
    const cached = carLoan();
    const now = carLoan({}, { payoffs: [EXTRA_ON_THIRD] });
    mockDetail = {
      ...freshRead({ kind: 'loan', loan: cached }),
      isFetchedAfterMount: false,
      isFetching: true,
    };
    const { rerender } = await render(<LoanPayoffScreen />);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('skeleton')).toBeTruthy();
    expect(screen.queryByText('$10,701.09 clears this loan today')).toBeNull();

    mockDetail = freshRead({ kind: 'loan', loan: now });
    await rerender(<LoanPayoffScreen />);
    expect(line().props.children).toBe('$8,698.02 clears this loan today');
    // Asked once, not on every draw.
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('never prices on what the cache held when reading again fails', async () => {
    mockDetail = freshRead({ kind: 'loan', loan: carLoan() }, true);
    await render(<LoanPayoffScreen />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pay it all' })).toBeNull();
  });
});

describe('a loan already paid down', () => {
  const extra = {
    id: 'po-1',
    bill_id: 'bill-car',
    paid_on: '2026-10-03',
    amount: 2000,
    kind: 'partial' as const,
    card_id: 'card-amex',
    bank_account_id: null,
    counted: true,
    created_at: '2026-10-03T12:00:00Z',
    source: AMEX,
  };

  it('counts an earlier payoff in what clears it, and in what a part payment does', async () => {
    const loan = carLoan({}, { payoffs: [extra] });
    showing(loan);
    await render(<LoanPayoffScreen />);
    const quote = payoffQuote(termsOf(loan), TODAY).payoff;
    expect(quote).toBe(8698.02);
    expect(line().props.children).toBe('$8,698.02 clears this loan today');

    // 9 days of interest on the $8,684.64 left after it: $13.38, then $1,986.62 off the balance.
    await type('2000');
    expect(checkPayoff(termsOf(loan), { on: TODAY, amount: 2000 }, TODAY)).toMatchObject({
      ok: true,
      interest: 13.38,
      principal: 1986.62,
      paymentsLeft: 17,
      paymentsLeftBefore: 22,
      endsOn: '2028-02-27',
    });
    expect(line().props.children).toBe('17 payments left instead of 22, last payment 27 Feb 2028');
  });

  it('says a loan a payoff has cleared is paid off already', async () => {
    const all = {
      ...extra,
      id: 'po-2',
      paid_on: '2026-10-12',
      amount: 10_701.09,
      kind: 'full' as const,
    };
    showing(carLoan({ ends_on: '2026-10-12' }, { payoffs: [all] }));
    await render(<LoanPayoffScreen />);
    expect(screen.getByText('This loan is already paid off.')).toBeTruthy();
  });
});

describe('in other languages', () => {
  it('reads in Spanish and French', async () => {
    setLanguage('es');
    const { unmount } = await render(<LoanPayoffScreen />);
    expect(screen.getByRole('header', { name: 'Pagar Car loan' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pagarlo todo' })).toBeTruthy();
    expect(line().props.children).toBe(`${formatCurrency(10_701.09)} salda este préstamo hoy`);
    await unmount();

    setLanguage('fr');
    await render(<LoanPayoffScreen />);
    expect(screen.getByRole('header', { name: 'Rembourser Car loan' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tout rembourser' })).toBeTruthy();
    expect(screen.getByText('Combien rembourses-tu ?')).toBeTruthy();
  });
});
