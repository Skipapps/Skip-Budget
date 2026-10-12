import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import AddLoanScreen from '@/app/add-loan';
import LoanScheduleScreen from '@/app/loan-schedule';
import { resetLocaleForTests } from '@/i18n/store';
import { loanReview } from '@/lib/loan-review';

/** A drawn element, as the queries hand them back. */
type Node = ReturnType<typeof screen.getByText>;

/**
 * Adding a loan you have, as the Founder drew it: the monthly payment on the keypad, the loan's
 * details, and the review it is saved from. The figures are the wireframe loan's on the engine
 * ($18,000 at 6.25% over 4 years, $424.80 a month, first due 27 Jan 2025), seen on 12 Oct 2026, and
 * the same as the independent reference in src/lib/__fixtures__/add-loan-reference.ts.
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
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
}));
// Each icon draws a marker naming it, so a test can see which one a page shows.
jest.mock('@/theme/loan-icons', () => {
  const { View } = jest.requireActual('react-native');
  const named = () =>
    new Proxy({}, { get: (_, name) => () => <View testID={`icon-${String(name)}`} /> });
  return { useLoanIcons: named, useLoanTypeIcons: named };
});
jest.mock('@/theme/gradient-icons', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useGradientIcons: () =>
      new Proxy({}, { get: (_, name) => () => <View testID={`icon-${String(name)}`} /> }),
  };
});
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useTheme: () => ({ scheme: 'light' }),
}));
// The start date picked is 27 Dec 2024, the wireframe's.
let mockPickedDay = new Date(2024, 11, 27);
jest.mock('@/components/flow/inline-calendar', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    InlineCalendar: ({ onChange }: { onChange: (date: Date) => void }) => (
      <Pressable testID="calendar" onPress={() => onChange(mockPickedDay)} />
    ),
  };
});

const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

const mockSave = jest.fn(async (_input: Record<string, unknown>) => ({ id: 'bill-9' }));
jest.mock('@/api/mutations', () => ({
  useSaveLoan: () => ({ mutateAsync: mockSave, isPending: false }),
}));
jest.mock('@/api/queries', () => ({
  usePaymentSources: () => ({
    sources: [
      {
        id: 'card-1',
        kind: 'card',
        label: 'Amex ••6334',
        name: 'Amex',
        last4: '6334',
        color: '#4F7DBA',
      },
      {
        id: 'acct-1',
        kind: 'account',
        label: 'Chase ••7010',
        name: 'Chase',
        last4: '7010',
        color: '#6A5FC9',
      },
    ],
  }),
}));
// The reminder choices are real; the client behind them is never called.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
const mockApplyReminder = jest.fn(async (..._args: unknown[]) => {});
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
}));

const mockNav = jest.fn();
let mockParams: Record<string, string> = {};
const mockSwipe: boolean[] = [];
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: {
    Screen: ({ options }: { options: { gestureEnabled: boolean } }) => {
      mockSwipe.push(options.gestureEnabled);
      return null;
    },
  },
  router: {
    back: () => mockNav('back'),
    canDismiss: () => true,
    canGoBack: () => true,
    dismissAll: () => mockNav('dismissAll'),
    push: (href: unknown) => mockNav('push', href),
    replace: (href: unknown) => mockNav('replace', href),
  },
}));

jest.useFakeTimers().setSystemTime(new Date(2026, 9, 12, 9, 0));
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockParams = {};
  mockSwipe.length = 0;
  mockPickedDay = new Date(2024, 11, 27);
});

const press = (node: Node) => fireEvent.press(node);
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const radio = (name: string | RegExp) => screen.getByRole('radio', { name });
const checked = (node: Node) => Boolean(node.props.accessibilityState?.checked);
const swipeNow = () => mockSwipe[mockSwipe.length - 1];

/** The text box under a label: TextField draws the label, then its box, in one column. */
function box(label: string): Node {
  let node: Node | null = screen.getByText(label);
  while (node) {
    const inputs = within(node).queryAllByDisplayValue(/.*/);
    if (inputs.length === 1) return inputs[0];
    if (inputs.length > 1) break;
    node = node.parent;
  }
  throw new Error(`No single text box under "${label}"`);
}

async function typeKeys(keys: string[]) {
  for (const key of keys) {
    await press(screen.getByLabelText(key === '.' ? 'Decimal point' : key));
  }
}

/** From the Loans page tile: the monthly payment, then the details page. */
async function toDetails(keys = ['4', '2', '4', '.', '8']) {
  await render(<AddLoanScreen />);
  await typeKeys(keys);
  await press(button('Continue'));
}

/** Everything else on the details page, as the wireframe has it. */
async function fillWireframe() {
  await press(radio('Car'));
  await press(button('Amount borrowed, empty. Add'));
  await typeKeys(['1', '8', '0', '0', '0']);
  await press(button('Done'));
  await fireEvent.changeText(box('APR'), '6.25');
  await fireEvent.changeText(box('Term'), '4');
  await press(button(/^Start date, /));
  await press(screen.getByTestId('calendar'));
  await press(radio(/^Chase/));
}

async function toReview() {
  await toDetails();
  await fillWireframe();
  await press(button('Continue'));
}

describe('the monthly payment page', () => {
  it('asks for the installment on the keypad, and waits for an amount', async () => {
    await render(<AddLoanScreen />);
    expect(screen.getByText('Add loan')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'How much do you pay each month?' })).toBeTruthy();
    expect(screen.getByText('Enter your monthly installment.')).toBeTruthy();
    expect(button('Continue').props.accessibilityState).toEqual({ disabled: true });

    await typeKeys(['4', '2', '4', '.', '8']);
    expect(screen.getByLabelText('Amount, $424.80')).toBeTruthy();
    expect(button('Continue').props.accessibilityState).toEqual({ disabled: false });
    // The page the flow opened on: the edge swipe leaves it.
    expect(swipeNow()).toBe(true);
  });

  it('goes on to the details with the payment in its box', async () => {
    await toDetails();
    expect(screen.getByText('Your loan')).toBeTruthy();
    expect(button('Monthly payment, $424.80. Edit')).toBeTruthy();
    expect(button('Amount borrowed, empty. Add')).toBeTruthy();
    // Past the first page the swipe is off, so it can never skip a step.
    expect(swipeNow()).toBe(false);
  });
});

describe('the details page', () => {
  it('offers all eight loan types, none chosen, and names the loan after the one picked', async () => {
    await toDetails();
    const types = screen
      .getAllByRole('radio')
      .filter((node) =>
        [
          'Personal',
          'Car',
          'Student',
          'Home',
          'Business',
          'Medical',
          'Credit card',
          'Other',
        ].includes(node.props.accessibilityLabel),
      );
    expect(types).toHaveLength(8);
    expect(types.some(checked)).toBe(false);
    expect(box('Loan name').props.value).toBe('');

    await press(radio('Car'));
    expect(checked(radio('Car'))).toBe(true);
    expect(box('Loan name').props.value).toBe('Car loan');
    await press(radio('Home'));
    expect(box('Loan name').props.value).toBe('Home loan');

    // Once typed, the name is the person's own.
    await fireEvent.changeText(box('Loan name'), 'Our house');
    await press(radio('Car'));
    expect(box('Loan name').props.value).toBe('Our house');
  });

  it('takes the payment day from the start date and shows the first payment under the days', async () => {
    await toDetails();
    expect(screen.queryByTestId('loan-first-payment')).toBeNull();
    await press(button('Start date, When you got the money'));
    await press(screen.getByTestId('calendar'));

    expect(button('Start date, 27 Dec 2024')).toBeTruthy();
    expect(checked(radio('Day 27'))).toBe(true);
    expect(screen.getByText('First payment 27 Jan 2025')).toBeTruthy();

    // An earlier day waits for the month after next.
    await press(radio('Day 22'));
    expect(screen.getByText('First payment 22 Feb 2025')).toBeTruthy();
    // A day must stay chosen: pressing it again keeps it, and says nothing of clearing it.
    await press(radio('Day 22'));
    expect(checked(radio('Day 22'))).toBe(true);
    expect(radio('Day 22').props.accessibilityHint).toBeUndefined();
  });

  it('changes a figure on the keypad, and Back from there writes nothing', async () => {
    await toDetails();
    await press(button('Monthly payment, $424.80. Edit'));
    expect(screen.getByText('Monthly payment')).toBeTruthy();
    await typeKeys(['9']);
    await press(button('Back'));
    expect(button('Monthly payment, $424.80. Edit')).toBeTruthy();

    await press(button('Amount borrowed, empty. Add'));
    expect(screen.getByRole('header', { name: 'How much did you borrow?' })).toBeTruthy();
    await typeKeys(['1', '8', '0', '0', '0']);
    await press(button('Done'));
    expect(button('Amount borrowed, $18,000. Edit')).toBeTruthy();
  });

  it('keeps the rate and the term as typed, in years or months', async () => {
    await toDetails();
    await fireEvent.changeText(box('APR'), '6,25');
    expect(box('APR').props.value).toBe('6.25');
    await fireEvent.changeText(box('Term'), '48');
    await press(radio('Months'));
    expect(checked(radio('Months'))).toBe(true);
    expect(box('Term').props.value).toBe('48');
  });

  it('says what is still missing, by the names on the page, in page order', async () => {
    await toDetails();
    await press(button('Continue'));
    expect(
      screen.getByText(
        'To continue, fill in: Loan type, Loan name, Amount borrowed, APR, Term, Start date, Payment day, Paid from.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Review your loan')).toBeNull();

    await press(radio('Car'));
    expect(screen.queryByText(/^To continue/)).toBeNull();
    await press(button('Continue'));
    expect(
      screen.getByText(
        'To continue, fill in: Amount borrowed, APR, Term, Start date, Payment day, Paid from.',
      ),
    ).toBeTruthy();

    await fireEvent.changeText(box('Loan name'), ' ');
    await press(button('Continue'));
    expect(screen.getByText(/^To continue, fill in: Loan name, Amount borrowed/)).toBeTruthy();
  });

  it.each([
    ['150', 'Skip can save rates from 0% to 100%, with up to nine decimals.'],
    ['6.1234567891', 'Skip can save rates from 0% to 100%, with up to nine decimals.'],
  ])('refuses a rate of %s with the reason', async (rate, words) => {
    await toDetails();
    await fillWireframe();
    await fireEvent.changeText(box('APR'), rate);
    await press(button('Continue'));
    expect(screen.getByText(words)).toBeTruthy();
    expect(screen.queryByText('Review your loan')).toBeNull();
  });

  it('refuses a term past 50 years', async () => {
    await toDetails();
    await fillWireframe();
    await fireEvent.changeText(box('Term'), '51');
    await press(button('Continue'));
    expect(screen.getByText('A loan’s term can be up to 50 years.')).toBeTruthy();
  });

  it('refuses a payment that never clears the loan, with the least that does', async () => {
    await toDetails(['5', '0']);
    await fillWireframe();
    await press(button('Continue'));
    const review = loanReview(
      {
        principal: 18_000,
        annualRate: 6.25,
        termMonths: 48,
        startDate: new Date(2024, 11, 27),
        paymentDay: 27,
        monthlyPayment: 50,
      },
      '2026-10-12',
    );
    expect(review.ok).toBe(false);
    const minimum =
      !review.ok && review.refusal.reason === 'payment' ? review.refusal.problem.minimum : 0;
    expect(minimum).toBeGreaterThan(50);
    expect(
      screen.getByText(
        `Your monthly payment can’t keep up with this loan’s interest. The least it can be is $${minimum?.toFixed(2)}.`,
      ),
    ).toBeTruthy();
  });

  it('steps back to the keypad with the payment kept, and the keypad leaves the flow', async () => {
    await toDetails();
    await press(button('Back'));
    expect(screen.getByLabelText('Amount, $424.80')).toBeTruthy();
    expect(mockNav).not.toHaveBeenCalled();
    await press(button('Back'));
    expect(mockNav.mock.calls).toEqual([['back']]);
  });
});

describe('the review', () => {
  it('shows the wireframe loan as the engine prices it', async () => {
    await toReview();
    expect(screen.getByText('Review your loan')).toBeTruthy();
    const card = within(screen.getByTestId('loan-review-card'));
    for (const line of [
      'Car loan',
      'Next payment 27 Oct 2026',
      '$18,000',
      'Amount borrowed',
      'Monthly',
      '$424.80',
      'APR',
      '6.25%',
      'Term',
      '4 years · 48 payments',
      'Total interest',
      '$2,390.10',
      'Total you’ll pay',
      '$20,390.10',
    ]) {
      expect([line, card.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
    expect(card.getByTestId('icon-car', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/^Your last payment would be/)).toBeNull();
  });

  it('reads the card to VoiceOver as one summary', async () => {
    await toReview();
    expect(
      screen.getByLabelText(
        'Car loan. Next payment 27 Oct 2026. Amount borrowed, $18,000. Monthly, $424.80. APR, 6.25%. Term, 4 years, 48 payments. Total interest, $2,390.10. Total you’ll pay, $20,390.10',
      ),
    ).toBeTruthy();
  });

  it('says "First payment" before any is made', async () => {
    mockPickedDay = new Date(2026, 9, 1);
    await toReview();
    expect(screen.getByText('First payment 1 Nov 2026')).toBeTruthy();
  });

  it('warns of a balloon last payment, and still saves it', async () => {
    await toDetails(['3', '5', '0']);
    await fillWireframe();
    await press(button('Continue'));
    expect(screen.getByText(/^Your last payment would be \$[\d,]+\.\d{2}\.$/)).toBeTruthy();
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ monthlyPayment: 350 }));
  });

  it('counts the loan in monthly bills and reminds three days ahead, by default', async () => {
    await toReview();
    const bills = screen.getByRole('switch', { name: 'Add to monthly bills' });
    expect(bills.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    expect(screen.getByText('Counts toward your monthly spending')).toBeTruthy();

    const remind = screen.getByRole('switch', { name: 'Remind me' });
    expect(remind.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    expect(screen.getByText('24 Oct, 3 days before it’s due')).toBeTruthy();
    expect(checked(radio('3 days'))).toBe(true);
    expect(screen.getByTestId('icon-bell', { includeHiddenElements: true })).toBeTruthy();

    await press(radio('1 week'));
    expect(screen.getByText('20 Oct, 1 week before it’s due')).toBeTruthy();
  });

  it('opens the schedule on exactly this loan', async () => {
    await toReview();
    expect(screen.getByTestId('icon-schedule', { includeHiddenElements: true })).toBeTruthy();
    await press(button('Payment schedule'));
    expect(mockNav).toHaveBeenCalledWith('push', {
      pathname: '/loan-schedule',
      params: {
        amount: '18000',
        rate: '6.25',
        months: '48',
        start: '2025-01-27',
        funded: '2024-12-27',
        basis: 'actual/365',
        monthly: '424.8',
        name: 'Car loan',
      },
    });
  });

  it('hands the schedule a day the first month could not hold, and the schedule keeps it', async () => {
    // Day 31 from 31 Jan: first due 28 Feb, then the 31st again.
    mockPickedDay = new Date(2025, 0, 31);
    await toReview();
    expect(screen.getByText('Next payment 31 Oct 2026')).toBeTruthy();
    await press(button('Payment schedule'));
    const [, route] = mockNav.mock.calls.find(([kind]) => kind === 'push') as [
      string,
      { params: Record<string, string> },
    ];
    expect(route.params).toEqual(
      expect.objectContaining({ start: '2025-02-28', funded: '2025-01-31', day: '31' }),
    );

    await screen.unmount();
    mockParams = route.params;
    await render(<LoanScheduleScreen />);
    expect(screen.getByLabelText(/^Payment 1, 28 Feb 2025, covering 28 days\./)).toBeTruthy();
    expect(screen.getByLabelText(/^Payment 2, 31 Mar 2025, covering 31 days\./)).toBeTruthy();
    expect(screen.getByLabelText(/^Payment 3, 30 Apr 2025, covering 30 days\./)).toBeTruthy();
  });

  it('goes back to the details with everything kept', async () => {
    await toReview();
    await press(button('Back to edit'));
    expect(screen.getByText('Your loan')).toBeTruthy();
    expect(box('Loan name').props.value).toBe('Car loan');
    expect(box('APR').props.value).toBe('6.25');
    expect(checked(radio(/^Chase/))).toBe(true);
    await press(button('Continue'));
    await press(button('Back'));
    expect(screen.getByText('Your loan')).toBeTruthy();
  });
});

describe('saving', () => {
  it('files the loan, its reminder and lands on Loans with nothing of the flow beneath', async () => {
    await toReview();
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenCalledWith({
      name: 'Car loan',
      iconId: 'loan-car',
      principal: 18_000,
      annualRate: 6.25,
      termMonths: 48,
      monthlyPayment: 424.8,
      totalInterest: 2390.1,
      firstPaymentOn: '2025-01-27',
      fundedOn: '2024-12-27',
      dayCountBasis: 'actual/365',
      cardId: null,
      bankAccountId: 'acct-1',
      paymentOverrides: null,
      lastPaymentOn: null,
      paymentDay: null,
      inSpending: true,
      countsFrom: '2026-10-12',
    });
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-9', 3);
    expect(mockToast).toHaveBeenCalledWith('toast.loan.saved');
    expect(mockNav.mock.calls).toEqual([['dismissAll'], ['push', '/loans']]);
  });

  it('keeps it out of spending and sets no reminder when both are switched off', async () => {
    await toReview();
    await press(screen.getByRole('switch', { name: 'Add to monthly bills' }));
    expect(screen.getByText('Stays under Loans, out of your spending')).toBeTruthy();
    await press(screen.getByRole('switch', { name: 'Remind me' }));
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ inSpending: false, cardId: null, bankAccountId: 'acct-1' }),
    );
    expect(mockApplyReminder).not.toHaveBeenCalled();
  });

  it('saves Skip as no card and no account, and a card as its own', async () => {
    await toReview();
    await press(button('Back to edit'));
    await press(radio('Skip'));
    await press(button('Continue'));
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ cardId: null, bankAccountId: null }),
    );

    await screen.unmount();
    await toReview();
    await press(button('Back to edit'));
    await press(radio(/^Amex/));
    await press(button('Continue'));
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ cardId: 'card-1', bankAccountId: null }),
    );
  });

  it('says the one failure line when the reminder fails after the save, as Add bill does', async () => {
    mockApplyReminder.mockRejectedValueOnce(new Error('offline'));
    await toReview();
    await press(button('Save loan'));
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(mockNav).not.toHaveBeenCalled();
    // The loan is filed: nothing here is left to edit or throw away.
    expect(screen.queryByRole('button', { name: 'Back to edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    // Saved with the loan, so Save again could not change it: it is not offered as if it could.
    expect(
      screen.getByRole('switch', { name: 'Add to monthly bills' }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: true, disabled: true }));

    // Save again writes the reminder alone, never a second loan.
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockApplyReminder).toHaveBeenCalledTimes(2);
    expect(mockApplyReminder).toHaveBeenLastCalledWith('bill', 'bill-9', 3);
    expect(mockToast).toHaveBeenCalledWith('toast.loan.saved');
    expect(mockNav.mock.calls).toEqual([['dismissAll'], ['push', '/loans']]);
  });

  it('stays busy through the reminder write, so a second tap neither saves nor lands twice', async () => {
    let finish = () => {};
    mockApplyReminder.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    await toReview();
    await press(button('Save loan'));
    const busy = button('Saving…');
    expect(busy.props.accessibilityState).toEqual({ disabled: true });
    await press(busy);
    await act(async () => finish());
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockApplyReminder).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockNav.mock.calls).toEqual([['dismissAll'], ['push', '/loans']]);
  });

  it('goes to the saved loan, not back into the flow, when left after a failed reminder', async () => {
    mockApplyReminder.mockRejectedValueOnce(new Error('offline'));
    await toReview();
    await press(button('Save loan'));
    await press(button('Back'));
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith('toast.loan.saved');
    expect(mockNav.mock.calls).toEqual([['dismissAll'], ['push', '/loans']]);
  });

  it('has nothing to remind about once every payment is behind, and writes no reminder', async () => {
    mockPickedDay = new Date(2019, 0, 15);
    await toReview();
    expect(screen.getByText('Last payment 15 Jan 2023')).toBeTruthy();
    expect(screen.getByText('No payments left to remind you about')).toBeTruthy();
    const remind = screen.getByRole('switch', { name: 'Remind me' });
    expect(remind.props.accessibilityState).toEqual({ checked: false, disabled: true });
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenCalled();
    expect(mockApplyReminder).not.toHaveBeenCalled();
  });
});

describe('close', () => {
  it('leaves the whole flow from Review in one tap, after asking', async () => {
    await toReview();
    await press(button('Close'));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cancel adding this loan?',
        message: 'Nothing you have entered here will be saved.',
      }),
    );
    expect(mockNav.mock.calls).toEqual([['back']]);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('stays when the person says to go back', async () => {
    mockConfirm.mockResolvedValueOnce(false);
    await toDetails();
    await press(button('Close'));
    expect(mockNav).not.toHaveBeenCalled();
    expect(screen.getByText('Your loan')).toBeTruthy();
  });

  it('is on the flow’s own pages, not on a figure sent back to the keypad', async () => {
    await render(<AddLoanScreen />);
    expect(button('Close')).toBeTruthy();
    await typeKeys(['4', '2', '4']);
    await press(button('Continue'));
    expect(button('Close')).toBeTruthy();
    await press(button('Monthly payment, $424.00. Edit'));
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});

describe('from the calculator', () => {
  const CALCULATOR = {
    view: 'details',
    amount: '25000',
    rate: '7.5',
    months: '60',
    start: '2026-10-12',
    funded: '2026-09-12',
    basis: 'actual/365',
    monthly: '500.97',
  };

  it('opens on the details, filled in, and Back returns to the calculator', async () => {
    mockParams = CALCULATOR;
    await render(<AddLoanScreen />);
    expect(screen.getByText('Your loan')).toBeTruthy();
    expect(button('Monthly payment, $500.97. Edit')).toBeTruthy();
    expect(button('Amount borrowed, $25,000. Edit')).toBeTruthy();
    expect(box('APR').props.value).toBe('7.5');
    expect(box('Term').props.value).toBe('5');
    expect(checked(radio('Years'))).toBe(true);
    expect(button('Start date, 12 Sep 2026')).toBeTruthy();
    expect(checked(radio('Day 12'))).toBe(true);
    expect(screen.getByText('First payment 12 Oct 2026')).toBeTruthy();
    expect(swipeNow()).toBe(true);

    await press(button('Back'));
    expect(mockNav.mock.calls).toEqual([['back']]);
  });

  it('keeps its own first payment until the dates change', async () => {
    mockParams = { ...CALCULATOR, start: '2026-09-20' };
    await render(<AddLoanScreen />);
    expect(screen.getByText('First payment 20 Sep 2026')).toBeTruthy();
    await press(radio('Day 21'));
    expect(screen.getByText('First payment 21 Oct 2026')).toBeTruthy();
  });

  it('names the changed payments the loan no longer takes, and saves without them', async () => {
    mockParams = { ...CALCULATOR, overrides: '{"59":600}' };
    await render(<AddLoanScreen />);
    await press(radio('Personal'));
    await press(radio('Skip'));
    // Payment 59 is now the last one, which is always what is left.
    await fireEvent.changeText(box('Term'), '59');
    await press(radio('Months'));
    await press(button('Continue'));
    expect(
      screen.getByText('Your change to payment 59 no longer fits this loan, so it isn’t saved.'),
    ).toBeTruthy();
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ termMonths: 59, paymentOverrides: null }),
    );

    // A shorter loan never reaches it at all.
    await screen.unmount();
    await render(<AddLoanScreen />);
    await press(radio('Personal'));
    await press(radio('Skip'));
    await fireEvent.changeText(box('Term'), '4');
    await press(button('Continue'));
    expect(
      screen.getByText('Your change to payment 59 isn’t used: the loan is paid off before it.'),
    ).toBeTruthy();
  });

  it('files the calculator’s convention and changed payments with the loan', async () => {
    mockParams = { ...CALCULATOR, basis: 'monthly', overrides: '{"12":1000}' };
    await render(<AddLoanScreen />);
    await press(radio('Personal'));
    await press(radio('Skip'));
    await press(button('Continue'));
    expect(screen.getByText('Interest is worked out monthly on what you still owe.')).toBeTruthy();
    await press(button('Save loan'));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Personal loan',
        dayCountBasis: 'monthly',
        paymentOverrides: { '12': 1000 },
        firstPaymentOn: '2026-10-12',
        fundedOn: '2026-09-12',
      }),
    );
  });
});
