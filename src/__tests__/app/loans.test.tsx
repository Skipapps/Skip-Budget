import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import LoansScreen from '@/app/loans';
import { loanTermsOf, type LoanListRow } from '@/api/loans';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { payoffQuote } from '@/lib/loan-payoff';
import { loanStatus } from '@/lib/loan-status';
import { fromCents, toCents } from '@/lib/money';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The Loans page on real schedules, seen on 12 Oct 2026 as the design is. The car loan ($18,000 at
 * 6.25% over four years, monthly rests, first paid 27 Jan 2025 with no funding date saved) and the
 * personal loan ($25,000 at 7.50% over five years, funded 9 Sep 2026) come out exactly as drawn:
 * $10,673.63 and $24,655.30 left, $35,328.93 together of $43,000, 18% paid off, $925.75 a month.
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
    YOUR_LOANS_IMAGE: { testUri: 'your-loans.png' },
    useLoanIcons: () => new Proxy({}, { get: (_target, name) => drawn(String(name)) }),
    useLoanTypeIcons: () =>
      new Proxy({}, { get: (_target, name) => drawn(`type-${String(name)}`) }),
  };
});
jest.mock('@/providers/theme-provider', () => {
  const colors = new Proxy({}, { get: () => '#000000' });
  return { useColors: () => colors, useTheme: () => ({ scheme: 'light', colors }) };
});
jest.mock('@/components/ui/skeleton', () => ({
  SkeletonList: () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return createElement(View, { testID: 'skeleton' });
  },
}));

const TODAY = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-12', todayDate: new Date(2026, 9, 12) }),
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
    payoffs: [],
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
  first_payment_on: '2025-01-27',
  funded_on: null,
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
    first_payment_on: '2025-11-12',
    funded_on: '2025-10-12',
  },
  { next_due_on: TODAY, ends_on: TODAY },
);

const statusOf = (row: LoanListRow, on = TODAY) => loanStatus(loanTermsOf(row)!, on);
const hidden = { includeHiddenElements: true };

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

/** Each line is drawn somewhere in `scope`. */
function expectLines(scope: Pick<typeof screen, 'queryAllByText'>, lines: string[]) {
  for (const line of lines) {
    expect([line, scope.queryAllByText(line, { normalizer: (text) => text }).length > 0]).toEqual([
      line,
      true,
    ]);
  }
}

const layout = async (testID: string, width: number, index = 0) =>
  fireEvent(screen.getAllByTestId(testID, hidden)[index], 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockLoans = { loans: [CAR, PERSONAL, OLD, ENDED], isPending: false, isError: false };
});

describe('the header', () => {
  it('names the page and says what it holds, with the back arrow and no "+"', async () => {
    await render(<LoansScreen />);
    expect(screen.getByRole('header', { name: 'Loans' })).toBeTruthy();
    expect(screen.getByText('Everything you owe, in one place')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New loan calculation' })).toBeNull();
    expect(screen.queryByText('Saved loans from the calculator show up here.')).toBeNull();
  });
});

describe('the two tiles', () => {
  it('open the calculator and the Add loan pages', async () => {
    await render(<LoansScreen />);
    const calculator = screen.getByRole('button', { name: 'Loan calculator' });
    const add = screen.getByRole('button', { name: 'Add loan' });
    expect(add.props.accessibilityHint).toBeUndefined();
    await fireEvent.press(calculator);
    await fireEvent.press(add);
    expect(mockPush.mock.calls).toEqual([['/loan-calculator'], ['/add-loan']]);
    expect(screen.getAllByTestId('icon-details', hidden)).toHaveLength(1);
    expect(screen.getAllByTestId('icon-add', hidden)).toHaveLength(1);
  });
});

describe('the summary card', () => {
  it('adds up the open loans as the design does', async () => {
    await render(<LoansScreen />);
    const car = statusOf(CAR);
    const personal = statusOf(PERSONAL);
    expect([car.amountLeft, personal.amountLeft]).toEqual([10_673.63, 24_655.3]);

    const card = within(screen.getByTestId('loans-summary'));
    expectLines(card, [
      'Your loans',
      '$35,328.93',
      'Total balance across 2 loans',
      'Monthly',
      '$925.75',
      '18% paid off · $7,671.07 of $43,000',
      'Base',
      '$43,000',
      'Rate',
      '6.25% – 7.50%',
      'Active',
      '2 loans',
    ]);
    expect(screen.getByTestId('loans-summary-progress', hidden).props.style).toEqual(
      expect.arrayContaining([{ width: '18%' }]),
    );
    expect(screen.getByTestId('loans-summary-icon', hidden).props.source).toEqual({
      testUri: 'your-loans.png',
    });
  });

  it('leaves the paid-off and the stopped loans out of every figure', async () => {
    await render(<LoansScreen />);
    // The stopped boat loan borrowed $25,000 more; none of it is counted.
    const card = within(screen.getByTestId('loans-summary'));
    expect(card.queryByText('$68,000')).toBeNull();
    expect(card.getByText('$43,000')).toBeTruthy();
    expect(card.getByText('2 loans')).toBeTruthy();
  });

  it('reads to VoiceOver as one summary, its dots left out', async () => {
    await render(<LoansScreen />);
    const card = screen.getByTestId('loans-summary');
    expect(card.props.accessible).toBe(true);
    expect(card.props.accessibilityLabel).toBe(
      'Your loans. $35,328.93 left across 2 loans. $925.75 a month. 18% paid off, $7,671.07 of $43,000. Rates from 6.25% to 7.50%.',
    );
    for (const [id, colour] of [
      ['base', '#905479'],
      ['rate', '#C39BB4'],
      ['active', '#E4D3DE'],
    ]) {
      const dot = within(card).getByTestId(`fact-dot-${id}`, hidden);
      expect([id, dot.props.accessibilityElementsHidden]).toEqual([id, true]);
      expect(dot.props.style).toEqual(expect.objectContaining({ backgroundColor: colour }));
    }
  });

  it('shows one rate, and one loan, when there is one', async () => {
    mockLoans = { loans: [PERSONAL], isPending: false, isError: false };
    await render(<LoansScreen />);
    const card = within(screen.getByTestId('loans-summary'));
    expectLines(card, ['Total balance across 1 loan', '7.50%', '1 loan']);
    expect(screen.getByTestId('loans-summary').props.accessibilityLabel).toBe(
      'Your loans. $24,655.30 left on 1 loan. $500.95 a month. 1% paid off, $344.70 of $25,000. Rate 7.50%.',
    );
    expect(screen.getByText('1 active')).toBeTruthy();
  });

  it('stays, owing nothing, when every loan is finished', async () => {
    mockLoans = { loans: [OLD, ENDED], isPending: false, isError: false };
    await render(<LoansScreen />);
    expect(screen.queryByTestId('loans-empty')).toBeNull();
    const summary = screen.getByTestId('loans-summary');
    const card = within(summary);
    // The total and its line stay; nothing else has anything to say with no open loan.
    expect(card.getAllByText('$0.00')).toHaveLength(1);
    expect(card.getByText('Total balance across 0 loans')).toBeTruthy();
    for (const gone of ['Monthly', /paid off/, 'Base', 'Rate', 'Active', '—', '0 loans']) {
      expect([String(gone), card.queryAllByText(gone)]).toEqual([String(gone), []]);
    }
    expect(card.queryByTestId('loans-summary-progress', hidden)).toBeNull();
    expect(summary.props.accessibilityLabel).toBe('Your loans. $0.00 left across 0 loans.');
    expect(screen.queryByText(/active$/)).toBeNull();
    expect(screen.getByText('Finished')).toBeTruthy();
  });
});

describe('a loan’s card', () => {
  it('shows the design’s car loan exactly as drawn', async () => {
    await render(<LoansScreen />);
    expect(screen.getByText('2 active')).toBeTruthy();
    const card = within(screen.getByTestId('loan-card-bill-car'));
    expectLines(card, [
      'Car loan',
      '4 yrs · started Dec 2024',
      'Next',
      '27 Oct',
      '$10,673.63',
      'left',
      '$424.80/mo',
      '41% paid off',
      'Base',
      '$18,000',
      'Rate',
      '6.25%',
      'Left',
      '27 of 48 payments',
      'View details',
    ]);
    expect(screen.getByTestId('loan-progress-bill-car', hidden).props.style).toEqual(
      expect.arrayContaining([{ width: '41%' }]),
    );
  });

  it('shows the design’s personal loan exactly as drawn', async () => {
    await render(<LoansScreen />);
    expectLines(within(screen.getByTestId('loan-card-bill-personal')), [
      'Personal loan',
      '5 yrs · started Sep 2026',
      '9 Nov',
      '$24,655.30',
      '$500.95/mo',
      '1% paid off',
      '$25,000',
      '7.50%',
      '59 of 60 payments',
    ]);
  });

  it('draws each loan’s own type, and Other for a loan saved before types', async () => {
    await render(<LoansScreen />);
    expect(screen.getAllByTestId('icon-type-car', hidden)).toHaveLength(1);
    expect(screen.getAllByTestId('icon-type-personal', hidden)).toHaveLength(1);
    expect(screen.getAllByTestId('icon-type-other', hidden)).toHaveLength(2);
  });

  it('reads as one summary, and opens the loan’s page from View details only', async () => {
    await render(<LoansScreen />);
    const card = screen.getByTestId('loan-card-bill-car');
    expect(card.props.accessibilityRole).toBeUndefined();
    expect(card.props.onPress).toBeUndefined();
    expect(
      screen.getByLabelText(
        'Car loan. $10,673.63 left, $424.80 a month. 41% paid off. Borrowed $18,000 at 6.25%. 4 years, started Dec 2024. 27 of 48 payments left. Next payment 27 Oct 2026.',
      ).props.accessible,
    ).toBe(true);

    expect(within(card).getAllByRole('button')).toHaveLength(1);
    const details = screen.getByRole('button', { name: 'View details, Car loan' });
    expect(details.props.accessibilityHint).toBe('Opens the loan.');
    // The card's own action is the compact 48pt pill.
    expect(details.props.className).toContain('min-h-[48px]');
    await fireEvent.press(details);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/loan/[id]', params: { id: 'bill-car' } });
  });
});

describe('finished loans', () => {
  it('lists paid-off and stopped loans under Finished, in the same cards, and opens them', async () => {
    await render(<LoansScreen />);
    const finished = within(screen.getByTestId('loans-finished'));
    expectLines(finished, ['Laptop loan', '1 yr · started Dec 2024', 'Paid off on 1 Dec 2025']);
    expect(
      screen.getByLabelText('Laptop loan. Paid off on 1 Dec 2025. 1 year, started Dec 2024.'),
    ).toBeTruthy();
    // No next payment once it has ended.
    expect(within(screen.getByTestId('loan-card-bill-old')).queryByText('Next')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'View details, Laptop loan' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/loan/[id]', params: { id: 'bill-old' } });
  });

  it('says a stopped loan stopped, and keeps what it still owes in sight', async () => {
    mockLoans = { loans: [PERSONAL, ENDED, UNDATED], isPending: false, isError: false };
    await render(<LoansScreen />);
    // Read as of the day its bill stopped: nothing was paid on it after that.
    const owed = statusOf(ENDED, '2026-06-05').amountLeft;
    expect(owed).toBeGreaterThan(0);
    expect(statusOf(ENDED, '2026-06-05').paidOff).toBe(false);
    expect(screen.getByText(`Stopped on 5 Jun 2026 · ${formatCurrency(owed)} left`)).toBeTruthy();
    expect(
      screen.getByText(`Stopped · ${formatCurrency(statusOf(UNDATED).amountLeft)} left`),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Boat loan. Stopped on 5 Jun 2026, ${formatCurrency(owed)} left. 5 years, started Dec 2025.`,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/^Paid off on/)).toBeNull();
    // Out of the totals: only the personal loan is owed.
    const card = within(screen.getByTestId('loans-summary'));
    expect(card.getByText(formatCurrency(statusOf(PERSONAL).amountLeft))).toBeTruthy();
    expect(card.getByText('1 loan')).toBeTruthy();
  });

  it('freezes a stopped loan at the day it stopped, never counting the payments after it', async () => {
    mockLoans = { loans: [PERSONAL, ENDED], isPending: false, isError: false };
    await render(<LoansScreen />);
    const atStop = statusOf(ENDED, '2026-06-05');
    const ifStillPaid = statusOf(ENDED);
    // Six payments (5 Jan to 5 Jun) were made before it stopped; today's reading would say ten.
    expect(atStop.paymentsMade).toBe(6);
    expect(ifStillPaid.paymentsMade).toBe(10);
    expect(atStop.amountLeft).toBeGreaterThan(ifStillPaid.amountLeft);
    expect(
      screen.getByText(`Stopped on 5 Jun 2026 · ${formatCurrency(atStop.amountLeft)} left`),
    ).toBeTruthy();
    expect(screen.queryByText(formatCurrency(ifStillPaid.amountLeft), { exact: false })).toBeNull();
  });

  it('counts a loan as paid off on its last payment’s own day, as the Cards tab does', async () => {
    mockLoans = { loans: [PERSONAL, LAST_TODAY], isPending: false, isError: false };
    await render(<LoansScreen />);
    expect(statusOf(LAST_TODAY)).toEqual(
      expect.objectContaining({ paidOff: true, lastPaymentOn: TODAY }),
    );
    expect(screen.getByText('Paid off on 12 Oct 2026')).toBeTruthy();
    const summary = within(screen.getByTestId('loans-summary'));
    expect(summary.getByText(formatCurrency(statusOf(PERSONAL).amountLeft))).toBeTruthy();
    expect(summary.getByText(formatCurrency(statusOf(PERSONAL).monthlyPayment))).toBeTruthy();
  });
});

describe('payoffs', () => {
  const paid = (id: string, paidOn: string, amount: number, kind: 'full' | 'partial') => ({
    id,
    bill_id: 'bill-car',
    paid_on: paidOn,
    amount,
    kind,
    card_id: null,
    bank_account_id: null,
    counted: true,
    created_at: `${paidOn}T12:00:00Z`,
    source: null,
  });

  it('reads a loan paid down by one with it, in its card and in the sums', async () => {
    const paidDown = { ...CAR, payoffs: [paid('po-1', '2026-10-03', 2000, 'partial')] };
    mockLoans = { loans: [paidDown, PERSONAL], isPending: false, isError: false };
    await render(<LoansScreen />);
    const car = statusOf(paidDown);
    const personal = statusOf(PERSONAL);
    // Less left than the same loan without it.
    expect(car.amountLeft).toBeLessThan(statusOf(CAR).amountLeft);
    expect(screen.getAllByText(formatCurrency(car.amountLeft)).length).toBeGreaterThan(0);
    const summary = within(screen.getByTestId('loans-summary'));
    expect(
      summary.getByText(
        formatCurrency(fromCents(toCents(car.amountLeft) + toCents(personal.amountLeft))),
      ),
    ).toBeTruthy();
  });

  it('lists a loan one cleared as paid off on that day, out of the sums', async () => {
    const all = payoffQuote(loanTermsOf(CAR)!, TODAY).payoff;
    const cleared = loan(
      'bill-car',
      'Car loan',
      'loan-car',
      { ...CAR, payoffs: [paid('po-2', TODAY, all, 'full')] },
      { ends_on: TODAY },
    );
    mockLoans = { loans: [cleared, PERSONAL], isPending: false, isError: false };
    await render(<LoansScreen />);
    expect(screen.getByText('Paid off on 12 Oct 2026')).toBeTruthy();
    const summary = within(screen.getByTestId('loans-summary'));
    expect(summary.getByText(formatCurrency(statusOf(PERSONAL).amountLeft))).toBeTruthy();
    expect(summary.getByText('1 loan')).toBeTruthy();
  });
});

describe('with no loans', () => {
  it('keeps the tiles and invites a first loan, with no summary and no list', async () => {
    mockLoans = { loans: [], isPending: false, isError: false };
    await render(<LoansScreen />);
    expect(screen.getByTestId('loans-empty')).toBeTruthy();
    expect(screen.getByText('No loans yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Add a loan you already have, or work one out in the calculator. What you owe shows here.',
      ),
    ).toBeTruthy();
    expect(screen.getAllByTestId('icon-result', hidden)).toHaveLength(1);
    expect(screen.queryByTestId('loans-summary')).toBeNull();
    expect(screen.queryByText('Finished')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add loan' }));
    expect(mockPush).toHaveBeenCalledWith('/add-loan');
  });
});

describe('the page', () => {
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

const NB = ' ';

describe('in Spanish and French', () => {
  it.each([
    [
      'es' as const,
      [
        'Préstamos',
        'Todo lo que debes, en un solo lugar',
        'Calculadora de préstamos',
        'Agregar préstamo',
        'Tus préstamos',
        'Saldo total de 2 préstamos',
        'Mensual',
        '18% pagado · $7,671.07 de $43,000',
        'Capital',
        'Tasa',
        '6.25% – 7.50%',
        'Activos',
        '2 préstamos',
        '2 activos',
        '4 años · desde dic 2024',
        'Próximo',
        '27 oct',
        'por pagar',
        '$424.80/mes',
        '41% pagado',
        'Restantes',
        '27 de 48 pagos',
        'Ver detalles',
        'Terminados',
        'Liquidado el 1 dic 2025',
      ],
    ],
    [
      'fr' as const,
      [
        'Prêts',
        'Tout ce que tu dois, au même endroit',
        'Calculateur de prêt',
        'Ajouter un prêt',
        'Tes prêts',
        'Solde total de 2 prêts',
        'Mensuel',
        `18${NB}% remboursé · 7${NB}671,07${NB}$ sur 43${NB}000${NB}$`,
        'Capital',
        'Taux',
        `6,25${NB}% – 7,50${NB}%`,
        'Actifs',
        '2 prêts',
        '2 actifs',
        '4 ans · depuis déc. 2024',
        'Prochain',
        '27 oct.',
        'restants',
        `424,80${NB}$/mois`,
        `41${NB}% remboursé`,
        'Restants',
        '27 sur 48 paiements',
        'Voir les détails',
        'Terminés',
        'Remboursé le 1 déc. 2025',
      ],
    ],
  ])('writes the page in %s', async (language: Language, lines) => {
    setLanguage(language);
    await render(<LoansScreen />);
    expectLines(screen, lines);
    for (const line of everythingSaid()) {
      expect(line).not.toMatch(/^(?:loan|ui)\.[a-zA-Z.]+$|\{\w+\}/);
    }
  });
});

describe('at the largest text size', () => {
  beforeAll(() => {
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
    Dimensions.set({ window, screen: window });
  });

  it('takes the role ceilings for the card’s words and cuts nothing', async () => {
    await render(<LoansScreen />);
    const card = within(screen.getByTestId('loan-card-bill-personal'));
    for (const [line, cap] of [
      ['Personal loan', TEXT_CAP.row],
      ['5 yrs · started Sep 2026', TEXT_CAP.row],
      ['$24,655.30', TEXT_CAP.figure],
      ['$500.95/mo', TEXT_CAP.figure],
      ['1% paid off', TEXT_CAP.row],
      ['59 of 60 payments', TEXT_CAP.row],
    ] as const) {
      for (const text of card.getAllByText(line)) {
        expect([line, text.props.maxFontSizeMultiplier]).toEqual([line, cap]);
        expect(text.props.numberOfLines).toBeUndefined();
        expect(text.props.adjustsFontSizeToFit).toBeUndefined();
      }
    }
  });

  it('puts the monthly figure under what is left once the two cannot share a line', async () => {
    await render(<LoansScreen />);
    const group = 'loan-figures-bill-car';
    const beside = () => String(screen.getByTestId(group).props.className).includes('flex-row');
    expect(beside()).toBe(true);
    await layout('loan-left-word-bill-car', 40);
    await layout('fit-slot-bill-car-left', 150);
    await layout('fit-copy-bill-car-left', 140);
    await layout(group, 300);
    expect(beside()).toBe(false);
    expect(within(screen.getByTestId(group)).getByText('$424.80/mo')).toBeTruthy();
  });

  it('moves Next under the name once the name’s widest word cannot fit beside it', async () => {
    await render(<LoansScreen />);
    expect(screen.queryByText('Next 9 Nov')).toBeNull();
    await layout('fit-slot-bill-personal-name', 60);
    await layout('fit-copy-bill-personal-name', 90);
    await layout('loan-head-bill-personal', 300);
    expect(screen.getByText('Next 9 Nov')).toBeTruthy();
  });

  it('puts every fact’s value under its label once one label cannot fit beside its value', async () => {
    await render(<LoansScreen />);
    const facts = within(screen.getByTestId('loan-facts-bill-car'));
    const inRows = () =>
      String(facts.getByTestId('fit-slot-base-label', hidden).props.className).includes('flex-1');
    const laidOut = (testID: string, width: number) =>
      fireEvent(facts.getByTestId(testID, hidden), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
      });
    expect(inRows()).toBe(true);
    for (const id of ['base', 'rate', 'left']) {
      // "Left" has 40pt beside "27 of 48 payments": less than its dot and its word.
      await laidOut(`fit-slot-${id}-label`, id === 'left' ? 40 : 120);
      await laidOut(`fit-copy-${id}-label`, 60);
    }
    await fireEvent(screen.getByTestId('loan-facts-bill-car'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 120 } },
    });
    expect(inRows()).toBe(false);
    // Stacked, each value starts where its label's words do: past the dot and its gap.
    const dot = facts.getByTestId('fact-dot-left', hidden).props.style;
    expect(facts.getByTestId('fact-value-left').props.style).toEqual({
      paddingLeft: dot.width + dot.marginRight,
    });
  });

  it('stacks the two tiles full width once a label’s widest word cannot fit beside its button', async () => {
    await render(<LoansScreen />);
    const isRow = (id: string) =>
      String(screen.getByTestId(`loan-tile-${id}`).props.className).includes('min-h-[130px]');
    expect(isRow('calculator') && isRow('add')).toBe(true);
    await layout('fit-slot-calculator-label', 80);
    await layout('fit-copy-calculator-label', 95);
    await layout('fit-slot-add-label', 80);
    await layout('fit-copy-add-label', 40);
    await layout('loan-tiles', 327);
    expect(isRow('calculator') || isRow('add')).toBe(false);
    expect(String(screen.getByTestId('loan-tile-add').props.className)).toContain('w-full');
  });
});
