import { fireEvent, render, screen } from '@testing-library/react-native';

import SaveLoanScreen from '@/app/save-loan';
import { resetLocaleForTests } from '@/i18n/store';
import { amortise } from '@/lib/loan';

/**
 * Saving a loan as designed: the summary card, a name, the loan type (kept on the bill as its icon,
 * so every list draws the type), and Paid from with a Skip tile, answered before it saves. A rate
 * the loans table cannot hold as priced is refused with the reason on screen, never rounded or cut.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
  useLoanTypeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

const mockSave = jest.fn(async (_input: Record<string, unknown>) => ({}));
jest.mock('@/api/mutations', () => ({
  useSaveLoan: () => ({ mutateAsync: mockSave, isPending: false }),
}));
const mockSources = [
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
];
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: mockSources }) }));

const mockDismissTo = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { dismissTo: (...args: unknown[]) => mockDismissTo(...args), back: jest.fn() },
}));

const DESIGN = {
  amount: '25000',
  rate: '7.5',
  months: '60',
  start: '2026-10-09',
  funded: '2026-09-09',
  basis: 'monthly',
};

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockParams = DESIGN;
});

async function fillIn(name: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('e.g. Car loan'), name);
}

const save = () => fireEvent.press(screen.getByRole('button', { name: 'Save to Loans' }));

describe('the summary card', () => {
  it('shows the design’s loan as the engine prices it', async () => {
    await render(<SaveLoanScreen />);
    for (const line of [
      'Save this loan',
      'It’ll show under Loans as a monthly bill.',
      'Monthly payment',
      '$500.95',
      '/ month',
      'Borrowed',
      '$25,000',
      'Rate',
      '7.50%',
      'Term',
      '5 years',
      'Payments',
      '60 monthly',
      'First payment',
      '9 Oct 2026',
      'Total interest',
      '$5,056.96',
    ]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
  });
});

describe('the loan type', () => {
  it('starts on Personal and is saved on the bill as its icon', async () => {
    await render(<SaveLoanScreen />);
    expect(screen.getByRole('radio', { name: 'Personal' }).props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    await fillIn('Loan');
    await fireEvent.press(screen.getByRole('radio', { name: 'Skip' }));
    await save();
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ iconId: 'loan-personal' }));
  });

  it.each([
    ['Car', 'loan-car'],
    ['Student', 'loan-student'],
    ['Home', 'loan-home'],
    ['Business', 'loan-business'],
    ['Medical', 'loan-medical'],
    ['Credit card', 'loan-credit-card'],
    ['Other', 'loan-other'],
  ])('saves %s as %s', async (label, iconId) => {
    await render(<SaveLoanScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: label }));
    expect(screen.getByRole('radio', { name: label }).props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
    expect(screen.getByRole('radio', { name: 'Personal' }).props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false }),
    );
    await fillIn('Loan');
    await fireEvent.press(screen.getByRole('radio', { name: 'Skip' }));
    await save();
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ iconId }));
  });
});

describe('Paid from', () => {
  it('starts unanswered, and Save says so', async () => {
    await render(<SaveLoanScreen />);
    for (const name of [/^Amex/, /^Chase/, 'Skip']) {
      expect(screen.getByRole('radio', { name }).props.accessibilityState).toEqual(
        expect.objectContaining({ checked: false }),
      );
    }
    await fillIn('Car loan');
    await save();
    expect(screen.getByText('To save this loan, fill in: Paid from.')).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('names every box still empty, in the order they sit', async () => {
    await render(<SaveLoanScreen />);
    await save();
    expect(screen.getByText('To save this loan, fill in: Name, Paid from.')).toBeTruthy();
    await fillIn('Car loan');
    expect(screen.queryByText(/^To save this loan/)).toBeNull();
  });

  it('saves Skip as no card and no account', async () => {
    await render(<SaveLoanScreen />);
    await fillIn('Car loan');
    await fireEvent.press(screen.getByRole('radio', { name: 'Skip' }));
    await save();
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ cardId: null, bankAccountId: null }),
    );
    expect(mockToast).toHaveBeenCalledWith('toast.loan.saved');
    expect(mockDismissTo).toHaveBeenCalledWith('/bills');
  });

  it.each([
    ['Amex', { cardId: 'card-1', bankAccountId: null }],
    ['Chase', { cardId: null, bankAccountId: 'acct-1' }],
  ])('saves %s as its own source', async (name, columns) => {
    await render(<SaveLoanScreen />);
    await fillIn('Car loan');
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${name}`) }));
    await save();
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining(columns));
  });
});

describe('the figures saved', () => {
  it('are the engine’s, as priced, with the rate exactly as given', async () => {
    const engine = amortise({
      principal: 25_000,
      annualRatePercent: 7.5,
      months: 60,
      firstPaymentOn: new Date(2026, 9, 9),
      fundedOn: new Date(2026, 8, 9),
      basis: 'monthly',
    });
    await render(<SaveLoanScreen />);
    await fillIn('  Car loan ');
    await fireEvent.press(screen.getByRole('radio', { name: 'Car' }));
    await fireEvent.press(screen.getByRole('radio', { name: /^Chase/ }));
    await save();
    expect(mockSave).toHaveBeenCalledWith({
      name: 'Car loan',
      iconId: 'loan-car',
      principal: 25_000,
      annualRate: 7.5,
      termMonths: 60,
      monthlyPayment: engine.payment,
      totalInterest: engine.totalInterest,
      firstPaymentOn: '2026-10-09',
      fundedOn: '2026-09-09',
      dayCountBasis: 'monthly',
      cardId: null,
      bankAccountId: 'acct-1',
      paymentOverrides: null,
      lastPaymentOn: null,
    });
    expect([engine.payment, engine.totalInterest]).toEqual([500.95, 5056.96]);
  });

  it('keeps an amount over 1,000,000 and a rate over 30% as typed', async () => {
    mockParams = { ...DESIGN, amount: '2500000', rate: '45.25' };
    await render(<SaveLoanScreen />);
    expect(screen.queryByText(/^Skip can save rates/)).toBeNull();
    await fillIn('Big loan');
    await fireEvent.press(screen.getByRole('radio', { name: 'Skip' }));
    await save();
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ principal: 2_500_000, annualRate: 45.25 }),
    );
  });

  it.each(['100.5', '150', '7.12345678949', '-1'])(
    'refuses a rate of %s the loans table cannot hold as priced, saying so from the start',
    async (rate) => {
      mockParams = { ...DESIGN, rate };
      await render(<SaveLoanScreen />);
      const reason = 'Skip can save rates from 0% to 100%, with up to nine decimals.';
      expect(screen.getByText(reason)).toBeTruthy();

      await fillIn('Loan');
      await fireEvent.press(screen.getByRole('radio', { name: 'Skip' }));
      await save();
      expect(screen.getByText(reason)).toBeTruthy();
      expect(mockSave).not.toHaveBeenCalled();
    },
  );

  it('saves a rate of exactly 100%', async () => {
    mockParams = { ...DESIGN, rate: '100' };
    await render(<SaveLoanScreen />);
    await fillIn('Loan');
    await fireEvent.press(screen.getByRole('radio', { name: 'Skip' }));
    await save();
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ annualRate: 100 }));
  });
});
