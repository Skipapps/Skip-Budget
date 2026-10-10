import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import LoansScreen from '@/app/loans';
import { loanTermsOf, type LoanListRow } from '@/api/loans';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { loanStatus } from '@/lib/loan-status';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The Loans page on real schedules. The design's personal loan ($25,000 at 7.50% over five years,
 * monthly rests, first paid 9 Oct 2026) is one payment in on 20 Oct 2026: $500.95 a month, 59 of 60
 * left, next on 9 Nov, $24,655.30 left, 1% paid off, exactly as drawn. Every other figure is the
 * engine's own for the same loan and day.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));
jest.mock('@/components/ui/skeleton', () => ({
  SkeletonList: () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return createElement(View, { testID: 'skeleton' });
  },
}));

const TODAY = '2026-10-20';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-20', todayDate: new Date(2026, 9, 20) }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

const mockRefetch = jest.fn();
let mockLoans: { loans: LoanListRow[]; isPending: boolean; isError: boolean } = {
  loans: [],
  isPending: false,
  isError: false,
};
jest.mock('@/api/loans', () => {
  const { termsFromStored } = jest.requireActual('@/lib/loan');
  return {
    useLoans: () => ({ ...mockLoans, refetch: mockRefetch }),
    // As the data layer builds them: a loan without its own first date uses its bill's first.
    loanTermsOf: (row: LoanListRow) => termsFromStored(row, row.bill.starts_on ?? undefined),
  };
});

function loan(
  id: string,
  name: string,
  iconId: string | null,
  fields: Partial<LoanListRow>,
  bill: Partial<LoanListRow['bill']> = {},
): LoanListRow {
  return {
    id: `loan-${id}`,
    bill_id: id,
    principal: 25_000,
    annual_rate: 7.5,
    term_months: 60,
    monthly_payment: 500.95,
    total_interest: 5056.96,
    first_payment_on: '2026-10-09',
    funded_on: '2026-09-09',
    day_count_basis: 'monthly',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    created_at: '2026-09-09T10:00:00Z',
    billEnded: false,
    ...fields,
    bill: {
      id,
      name,
      icon_id: iconId,
      starts_on: fields.first_payment_on ?? '2026-10-09',
      next_due_on: '2026-11-09',
      ends_on: '2031-09-09',
      ...bill,
    },
  };
}

const PERSONAL = loan('bill-personal', 'Personal loan', 'loan-personal', {});
const CAR = loan('bill-car', 'Car loan', 'loan-car', {
  principal: 18_000,
  annual_rate: 6.25,
  term_months: 48,
  monthly_payment: 424.8,
  first_payment_on: '2024-08-15',
  funded_on: '2024-07-15',
  day_count_basis: 'actual/365',
});
/** Its last payment went in 2025: paid off. */
const OLD = loan('bill-old', 'Laptop loan', null, {
  principal: 1_200,
  annual_rate: 5,
  term_months: 12,
  monthly_payment: 102.73,
  first_payment_on: '2025-01-01',
  funded_on: '2024-12-01',
});
/** Its bill was stopped in June with money still owed: finished, but not paid off. */
const ENDED = loan(
  'bill-ended',
  'Boat loan',
  'loan-other',
  { first_payment_on: '2026-01-05', funded_on: '2025-12-05', billEnded: true },
  { next_due_on: null, ends_on: '2026-06-05' },
);
/** Stopped with no end date on its bill. */
const UNDATED = loan(
  'bill-undated',
  'Sofa loan',
  'loan-other',
  { first_payment_on: '2026-01-05', funded_on: '2025-12-05', billEnded: true },
  { next_due_on: null, ends_on: null },
);
/** Twelve payments, the last of them today. */
const LAST_TODAY = loan(
  'bill-today',
  'Phone loan',
  'loan-other',
  {
    principal: 1_200,
    annual_rate: 5,
    term_months: 12,
    monthly_payment: 102.73,
    first_payment_on: '2025-11-20',
    funded_on: '2025-10-20',
  },
  { next_due_on: TODAY, ends_on: TODAY },
);

const statusOf = (row: LoanListRow) => loanStatus(loanTermsOf(row)!, TODAY);

/** Every string drawn or read out, in tree order. */
function everythingSaid(): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') return void out.push(node);
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown };
    for (const key of ['accessibilityLabel', 'accessibilityHint']) {
      if (typeof props?.[key] === 'string') out.push(props[key] as string);
    }
    walk(children);
  };
  walk(screen.toJSON());
  return out;
}

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockLoans = { loans: [CAR, PERSONAL, OLD, ENDED], isPending: false, isError: false };
});

describe('the summary', () => {
  it('adds up the open loans only, and names the soonest payment', async () => {
    await render(<LoansScreen />);
    const car = statusOf(CAR);
    const personal = statusOf(PERSONAL);
    expect(statusOf(OLD).paidOff).toBe(true);

    expect(screen.getByText('Total you owe')).toBeTruthy();
    expect(screen.getByText(formatCurrency(car.amountLeft + personal.amountLeft))).toBeTruthy();
    expect(screen.getByText('Monthly payments')).toBeTruthy();
    expect(
      screen.getByText(formatCurrency(car.monthlyPayment + personal.monthlyPayment)),
    ).toBeTruthy();
    // The personal loan's 9 Nov comes before the car loan's 15 Nov.
    expect(car.nextPayment?.date).toBe('2026-11-15');
    expect(screen.getByText('9 Nov · Personal loan')).toBeTruthy();
    expect(screen.getByText('4 saved')).toBeTruthy();
  });
});

describe('a loan’s card', () => {
  it('shows the design’s personal loan exactly as drawn', async () => {
    await render(<LoansScreen />);
    for (const line of [
      'Personal loan',
      '$25,000 · 7.50% · 5 years',
      '$500.95',
      '59 of 60',
      '9 Nov',
      '1% paid off · $24,655.30 left',
    ]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
    expect(
      screen.getByTestId('loan-progress-bill-personal', { includeHiddenElements: true }).props
        .style,
    ).toEqual(expect.objectContaining({ width: '1%' }));
  });

  it('shows the car loan as its schedule stands today', async () => {
    await render(<LoansScreen />);
    const car = statusOf(CAR);
    expect(screen.getByText('$18,000 · 6.25% · 4 years')).toBeTruthy();
    expect(screen.getByText(`${car.paymentsLeft} of ${car.paymentCount}`)).toBeTruthy();
    expect(screen.getByText('15 Nov')).toBeTruthy();
    expect(
      screen.getByText(`${car.percentPaid}% paid off · ${formatCurrency(car.amountLeft)} left`),
    ).toBeTruthy();
  });

  it('draws each loan’s own type, and Other for a loan saved before types', async () => {
    await render(<LoansScreen />);
    expect(screen.getAllByTestId('icon-type-car', { includeHiddenElements: true })).toHaveLength(1);
    expect(
      screen.getAllByTestId('icon-type-personal', { includeHiddenElements: true }),
    ).toHaveLength(1);
    expect(screen.getAllByTestId('icon-type-other', { includeHiddenElements: true })).toHaveLength(
      2,
    );
  });

  it('reads as one control to VoiceOver and opens the loan’s bill', async () => {
    await render(<LoansScreen />);
    const card = screen.getByRole('button', {
      name: 'Personal loan. $500.95 a month. 59 of 60 payments left, the next on 9 Nov 2026. 1% paid off, $24,655.30 left.',
    });
    expect(card.props.accessibilityHint).toBe('Opens the loan’s bill.');
    await fireEvent.press(card);
    expect(mockPush).toHaveBeenCalledWith('/bill/bill-personal');
  });
});

describe('finished loans', () => {
  it('lists paid-off and stopped loans under Finished, out of the totals, and opens them', async () => {
    await render(<LoansScreen />);
    expect(screen.getByText('Finished')).toBeTruthy();
    expect(screen.getByText('Paid off on 1 Dec 2025')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Laptop loan. Paid off on 1 Dec 2025.' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/bill/bill-old');
  });

  it('says a stopped loan stopped, and keeps what it still owes in sight', async () => {
    mockLoans = { loans: [PERSONAL, ENDED, UNDATED], isPending: false, isError: false };
    await render(<LoansScreen />);
    const owed = statusOf(ENDED).amountLeft;
    expect(owed).toBeGreaterThan(0);
    expect(statusOf(ENDED).paidOff).toBe(false);
    expect(screen.getByText(`Stopped on 5 Jun 2026 · ${formatCurrency(owed)} left`)).toBeTruthy();
    expect(
      screen.getByText(`Stopped · ${formatCurrency(statusOf(UNDATED).amountLeft)} left`),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: `Boat loan. Stopped on 5 Jun 2026, ${formatCurrency(owed)} left.`,
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/^Paid off on/)).toBeNull();
    // Out of the totals: only the personal loan is owed.
    expect(
      screen.getAllByText(formatCurrency(statusOf(PERSONAL).amountLeft)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('3 saved')).toBeTruthy();
  });

  it('counts a loan as paid off on its last payment’s own day, as the Cards tab does', async () => {
    mockLoans = { loans: [PERSONAL, LAST_TODAY], isPending: false, isError: false };
    await render(<LoansScreen />);
    expect(statusOf(LAST_TODAY)).toEqual(
      expect.objectContaining({ paidOff: true, lastPaymentOn: TODAY }),
    );
    expect(screen.getByText('Paid off on 20 Oct 2026')).toBeTruthy();
    // The totals are the personal loan's alone.
    const summary = within(screen.getByTestId('loans-summary'));
    expect(summary.getByText(formatCurrency(statusOf(PERSONAL).amountLeft))).toBeTruthy();
    expect(summary.getByText(formatCurrency(statusOf(PERSONAL).monthlyPayment))).toBeTruthy();
  });

  it('keeps the summary, owing nothing, when every loan is finished', async () => {
    mockLoans = { loans: [OLD, ENDED], isPending: false, isError: false };
    await render(<LoansScreen />);
    expect(screen.queryByTestId('loans-empty')).toBeNull();
    // Nothing owed and nothing going out a month.
    expect(screen.getAllByText('$0.00')).toHaveLength(2);
    expect(screen.queryByText('Your loans')).toBeNull();
    expect(screen.getByText('Finished')).toBeTruthy();
  });
});

describe('with no loans', () => {
  it('invites a first one, with no summary and no list', async () => {
    mockLoans = { loans: [], isPending: false, isError: false };
    await render(<LoansScreen />);
    expect(screen.getByTestId('loans-empty')).toBeTruthy();
    expect(screen.getByText('No loans yet')).toBeTruthy();
    expect(screen.queryByText('Total you owe')).toBeNull();
    expect(screen.queryByText('Saved loans from the calculator show up here.')).toBeNull();
    const [, button] = screen.getAllByRole('button', { name: 'New loan calculation' });
    await fireEvent.press(button);
    expect(mockPush).toHaveBeenCalledWith('/loan-calculator');
  });
});

describe('the page', () => {
  it('opens the calculator from the header and from the button', async () => {
    await render(<LoansScreen />);
    const both = screen.getAllByRole('button', { name: 'New loan calculation' });
    expect(both).toHaveLength(2);
    for (const button of both) await fireEvent.press(button);
    expect(mockPush.mock.calls).toEqual([['/loan-calculator'], ['/loan-calculator']]);
    expect(screen.getByText('Saved loans from the calculator show up here.')).toBeTruthy();
  });

  it('waits while reading, and never takes a failed read for no loans', async () => {
    mockLoans = { loans: [], isPending: true, isError: false };
    await render(<LoansScreen />);
    expect(screen.getByTestId('skeleton')).toBeTruthy();
    expect(screen.queryByTestId('loans-empty')).toBeNull();
    await screen.unmount();

    mockLoans = { loans: [], isPending: false, isError: true };
    await render(<LoansScreen />);
    expect(screen.queryByTestId('loans-empty')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
  });
});

describe('in Spanish and French', () => {
  it.each([
    [
      'es' as const,
      [
        'Préstamos',
        'Total que debes',
        'Pagos mensuales',
        'Próximo pago',
        'Tus préstamos',
        '4 guardados',
        'Mensual',
        'Pagos restantes',
        'Próximo',
        '59 de 60',
        '1% pagado · quedan $24,655.30',
        'Terminados',
        '$25,000 · 7.50% · 5 años',
        '9 nov · Personal loan',
      ],
    ],
    [
      'fr' as const,
      [
        'Prêts',
        'Total que tu dois',
        'Paiements mensuels',
        'Prochain paiement',
        'Tes prêts',
        '4 enregistrés',
        'Mensuel',
        'Paiements restants',
        'Prochain',
        '59 sur 60',
        '1 % remboursé · reste 24 655,30 $',
        'Terminés',
        '25 000 $ · 7,50 % · 5 ans',
      ],
    ],
  ])('writes the page in %s', async (language: Language, lines) => {
    setLanguage(language);
    await render(<LoansScreen />);
    for (const line of lines) {
      expect([
        line,
        screen.queryAllByText(line, { normalizer: (text) => text }).length > 0,
      ]).toEqual([line, true]);
    }
    for (const line of everythingSaid()) {
      expect(line).not.toMatch(/^loan\.[a-zA-Z.]+$|\{\w+\}/);
    }
  });
});

describe('at the largest text size', () => {
  beforeAll(() => {
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
    Dimensions.set({ window, screen: window });
  });

  it('takes the row ceiling for the card’s words and cuts nothing', async () => {
    await render(<LoansScreen />);
    for (const line of [
      'Personal loan',
      '$25,000 · 7.50% · 5 years',
      '1% paid off · $24,655.30 left',
    ]) {
      for (const text of screen.getAllByText(line)) {
        expect([line, text.props.maxFontSizeMultiplier]).toEqual([line, TEXT_CAP.row]);
        expect(text.props.numberOfLines).toBeUndefined();
      }
    }
  });

  it('stacks a card’s three columns once a word cannot fit its column', async () => {
    await render(<LoansScreen />);
    const grid = 'loan-figures-bill-personal';
    const inColumns = () =>
      String(
        screen.getAllByTestId('fit-slot-left-value')[1].parent?.parent?.props.className,
      ).includes('flex-1');
    expect(inColumns()).toBe(true);
    const layout = (testID: string, width: number, index = 1) =>
      fireEvent(screen.getAllByTestId(testID, { includeHiddenElements: true })[index], 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
      });
    for (const id of ['monthly', 'left', 'next']) {
      for (const part of ['label', 'value']) {
        await layout(`fit-slot-${id}-${part}`, 80);
        await layout(`fit-copy-${id}-${part}`, part === 'label' ? 90 : 60);
      }
    }
    await fireEvent(screen.getByTestId(grid), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 60 } },
    });
    expect(inColumns()).toBe(false);
  });
});
