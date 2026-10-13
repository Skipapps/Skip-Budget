import { render, screen } from '@testing-library/react-native';

import LoansScreen from '@/app/loans';
import { loanTermsOf, type LoanListRow } from '@/api/loans';
import { cardOf, loansPageSummary, priceLoans } from '@/components/loans/priced-loans';
import { resetLocaleForTests } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { payoffQuote } from '@/lib/loan-payoff';

/**
 * F14: Insights' Loans card adds up the loans exactly as the Loans page does, because both call
 * `priceLoans` and `loansPageSummary`. Proven by drawing the real Loans page on the same rows and
 * reading its summary card, on:
 * - the real lender statement pinned in src/lib/loan.test.ts ($31,394.33 at 8.14% over 72 months,
 *   funded 30 Nov 2025, first paid 14 Jan 2026, actual/365, $554.34 a month; $28,698.15 principal
 *   on the 14 Aug 2026 statement), saved as the app saves it, read on 28 Aug 2026;
 * - the design's car and personal loans on 12 Oct 2026: $35,328.93 owed, 18% paid off,
 *   $925.75 a month, with a paid-off and a stopped loan left out.
 * Only the read is a fake: the rows go through the real `loanTermsOf` and the real engine.
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
jest.mock('@/theme/loan-icons', () => ({
  YOUR_LOANS_IMAGE: { testUri: 'your-loans.png' },
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
  useLoanTypeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => {
  const colors = new Proxy({}, { get: () => '#000000' });
  return { useColors: () => colors, useTheme: () => ({ scheme: 'light', colors }) };
});
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'owner' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

let mockToday = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));

let mockLoans: LoanListRow[] = [];
jest.mock('@/api/loans', () => ({
  ...jest.requireActual('@/api/loans'),
  useLoans: () => ({ loans: mockLoans, isPending: false, isError: false, refetch: jest.fn() }),
}));

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

/** The lender's statement, saved as Add loan saves it. */
const LENDER = loan(
  'bill-lender',
  'Auto loan',
  'loan-car',
  {
    principal: 31_394.33,
    annual_rate: 8.14,
    term_months: 72,
    monthly_payment: 554.34,
    total_interest: 8_519.44,
    first_payment_on: '2026-01-14',
    funded_on: '2025-11-30',
    day_count_basis: 'actual/365',
    statement_on: '2026-08-14',
    statement_principal: 28_698.15,
  },
  { next_due_on: '2026-09-14', ends_on: '2031-12-14' },
);

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

/** What the Loans page's summary card reads aloud: every figure it draws, in one line. */
async function loansPageSays(loans: LoanListRow[], today: string): Promise<string> {
  mockLoans = loans;
  mockToday = today;
  await render(<LoansScreen />);
  const said = screen.getByTestId('loans-summary').props.accessibilityLabel as string;
  await screen.unmount();
  return said;
}

/** Insights' figures, as its Loans card will draw them. */
function insights(loans: LoanListRow[], today: string) {
  const priced = priceLoans(loans, today);
  return {
    summary: loansPageSummary(priced),
    rows: priced.filter((each) => each.ending === null).map(cardOf),
  };
}

beforeEach(() => resetLocaleForTests());

describe('F14 the real lender statement', () => {
  const AS_OF = '2026-08-28';

  it('is the fixture in src/lib/loan.test.ts, figure for figure, as saved and read back', () => {
    const quote = payoffQuote(loanTermsOf(LENDER)!, new Date(2026, 7, 28));
    expect(quote.payoff).toBe(28_787.75);
    expect(quote.principal).toBe(28_698.15);
    expect(quote.accruedInterest).toBe(89.6);
    expect(quote.daysAccrued).toBe(14);
    expect(quote.nextPaymentOn?.getTime()).toBe(new Date(2026, 8, 14).getTime());
    expect(quote.nextPaymentAmount).toBe(554.34);
  });

  it('owes the statement’s principal, to the cent, on Insights and the Loans page', async () => {
    const { summary, rows } = insights([LENDER], AS_OF);
    expect(summary).toEqual({
      owed: 28_698.15,
      monthly: 554.34,
      borrowed: 31_394.33,
      paid: 2_696.18,
      // 2,696.18 ÷ 31,394.33 = 8.588%
      percentPaid: 9,
      rateRange: { min: 8.14, max: 8.14 },
      count: 1,
    });
    expect(rows.map((row) => [row.name, row.nextOn, row.monthly, row.left])).toEqual([
      ['Auto loan', '2026-09-14', 554.34, 28_698.15],
    ]);
    expect(await loansPageSays([LENDER], AS_OF)).toBe(
      'Your loans. $28,698.15 left on 1 loan. $554.34 a month. 9% paid off, $2,696.18 of $31,394.33. Rate 8.14%.',
    );
  });
});

describe('F14 the design’s loans', () => {
  const TODAY = '2026-10-12';

  it('reads $35,328.93 owed on 2 loans, 18% paid off and $925.75 a month on both pages', async () => {
    const { summary, rows } = insights([CAR, PERSONAL, OLD, ENDED], TODAY);
    expect(summary).toMatchObject({ owed: 35_328.93, monthly: 925.75, percentPaid: 18, count: 2 });
    expect(rows.map((row) => [row.name, row.nextOn, row.monthly])).toEqual([
      ['Car loan', '2026-10-27', 424.8],
      ['Personal loan', '2026-11-09', 500.95],
    ]);
    expect(await loansPageSays([CAR, PERSONAL, OLD, ENDED], TODAY)).toBe(
      'Your loans. $35,328.93 left across 2 loans. $925.75 a month. 18% paid off, $7,671.07 of $43,000. Rates from 6.25% to 7.50%.',
    );
  });

  it.each([
    ['the lender’s loan beside them', [CAR, PERSONAL, LENDER, OLD, ENDED]],
    [
      'a payoff on the car loan',
      [
        {
          ...CAR,
          payoffs: [
            {
              id: 'po-1',
              bill_id: 'bill-car',
              paid_on: '2026-10-03',
              amount: 2000,
              kind: 'partial' as const,
              card_id: null,
              bank_account_id: null,
              counted: true,
              created_at: '2026-10-03T12:00:00Z',
              source: null,
            },
          ],
        },
        PERSONAL,
      ],
    ],
    ['only finished loans', [OLD, ENDED]],
  ])('agrees to the cent with %s', async (_name, loans) => {
    const { summary } = insights(loans, TODAY);
    const said = await loansPageSays(loans, TODAY);
    expect(said).toContain(`${formatCurrency(summary.owed)} left`);
    if (summary.count > 0) {
      expect(said).toContain(`${formatCurrency(summary.monthly)} a month`);
      expect(said).toContain(
        `${summary.percentPaid}% paid off, ${formatCurrency(summary.paid)} of`,
      );
    }
  });
});
