import { inCents, referenceSchedule } from '@/lib/__fixtures__/loan-reference';
import { amortise, termsFromStored, type LoanTerms } from '@/lib/loan';
import { loanStatus, loansSummary, type LoanStatus } from '@/lib/loan-status';

/**
 * The Loans page design (.claude/team/design/reference/loans-page/loans.png), reproduced: two loans
 * on monthly rests with a month before each first payment, seen on 9 Oct 2026.
 *
 * - Car loan: $18,000 at 6.25% over 48 months, first payment 15 Jan 2025. The annuity formula gives
 *   424.7967… so $424.80. Payment 21 (15 Sep 2026) leaves $10,673.63, payment 22 is 15 Oct.
 * - Personal loan: $25,000 at 7.50% over 60 months, first payment 9 Oct 2026 (today). $500.95; a
 *   month's interest is 25,000 × 7.5% ÷ 12 = $156.25, so payment one leaves 25,000 − 344.70 =
 *   $24,655.30, and payment two is 9 Nov.
 *
 * Every balance below was also worked by a Python `decimal` amortiser and by `referenceSchedule`.
 * The design's figures are monthly rests: on the calculator's default daily accrual the same two
 * loans would leave $10,673.67 and $24,653.14 (that payment being $500.97).
 */
const CAR: LoanTerms = {
  principal: 18_000,
  annualRatePercent: 6.25,
  months: 48,
  fundedOn: new Date(2024, 11, 15),
  firstPaymentOn: new Date(2025, 0, 15),
  basis: 'monthly',
};
const PERSONAL: LoanTerms = {
  principal: 25_000,
  annualRatePercent: 7.5,
  months: 60,
  fundedOn: new Date(2026, 8, 9),
  firstPaymentOn: new Date(2026, 9, 9),
  basis: 'monthly',
};
const TODAY = '2026-10-09';

const page = (today: string, ...loans: [string, LoanTerms][]) =>
  loans.map(([name, terms]) => ({ name, status: loanStatus(terms, today) }));

describe('the Loans page as designed', () => {
  it('shows the car loan: $424.80, 27 of 48, next 15 Oct, 41% paid off, $10,673.63 left', () => {
    expect(loanStatus(CAR, TODAY)).toEqual({
      borrowed: 18_000,
      monthlyPayment: 424.8,
      paymentCount: 48,
      paymentsMade: 21,
      paymentsLeft: 27,
      amountLeft: 10_673.63,
      // (18,000 − 10,673.63) / 18,000 = 40.70%.
      percentPaid: 41,
      nextPayment: { number: 22, date: '2026-10-15', amount: 424.8 },
      lastPaymentOn: '2028-12-15',
      paidOff: false,
    });
  });

  it('shows the personal loan: $500.95, 59 of 60, next 9 Nov, 1% paid off, $24,655.30 left', () => {
    expect(loanStatus(PERSONAL, TODAY)).toEqual({
      borrowed: 25_000,
      monthlyPayment: 500.95,
      paymentCount: 60,
      paymentsMade: 1,
      paymentsLeft: 59,
      amountLeft: 24_655.3,
      // 344.70 / 25,000 = 1.38%.
      percentPaid: 1,
      nextPayment: { number: 2, date: '2026-11-09', amount: 500.95 },
      lastPaymentOn: '2031-09-09',
      paidOff: false,
    });
  });

  it('totals $35,328.93 owed and $925.75 a month, next 15 Oct on the car loan', () => {
    const summary = loansSummary(page(TODAY, ['Car loan', CAR], ['Personal loan', PERSONAL]));
    expect(summary).toMatchObject({
      totalOwed: 35_328.93,
      monthlyPayments: 925.75,
      openCount: 2,
      paidOffCount: 0,
    });
    expect(summary.nextPayment).toMatchObject({ date: '2026-10-15', amount: 424.8 });
    expect(summary.nextPayment?.loan.name).toBe('Car loan');
  });

  it('agrees with the exact-integer amortiser on every row behind those figures', () => {
    for (const [terms, payment] of [
      [CAR, 424.8],
      [PERSONAL, 500.95],
    ] as const) {
      expect(inCents(amortise(terms).rows)).toEqual(
        referenceSchedule({
          principalCents: terms.principal * 100,
          rateUnits: terms.annualRatePercent * 1000,
          unitsPerPercent: 1000,
          months: terms.months,
          fundedOn: terms.fundedOn as Date,
          firstPaymentOn: terms.firstPaymentOn,
          basis: 'monthly',
          paymentCents: Math.round(payment * 100),
        }),
      );
    }
  });

  it('is the same any day up to the 14th, and moves on the car loan’s payment day', () => {
    expect(loanStatus(CAR, '2026-10-14').paymentsMade).toBe(21);
    const after = loanStatus(CAR, '2026-10-15');
    expect(after).toMatchObject({ paymentsMade: 22, paymentsLeft: 26, amountLeft: 10_304.42 });
    expect(after.nextPayment).toEqual({ number: 23, date: '2026-11-15', amount: 424.8 });
  });
});

describe('a payment day counts as paid', () => {
  it('makes the personal loan’s first payment on 9 Oct, not the day after', () => {
    expect(loanStatus(PERSONAL, '2026-10-08').paymentsMade).toBe(0);
    expect(loanStatus(PERSONAL, '2026-10-09').paymentsMade).toBe(1);
  });
});

describe('a loan not yet started', () => {
  it('owes the whole amount, has every payment left, and is 0% paid off', () => {
    expect(loanStatus(PERSONAL, '2026-10-08')).toMatchObject({
      paymentsMade: 0,
      paymentsLeft: 60,
      paymentCount: 60,
      amountLeft: 25_000,
      percentPaid: 0,
      nextPayment: { number: 1, date: '2026-10-09', amount: 500.95 },
      paidOff: false,
    });
  });

  it('counts in the totals, and its first payment can be the soonest', () => {
    const summary = loansSummary(
      page('2026-10-08', ['Car loan', CAR], ['Personal loan', PERSONAL]),
    );
    expect(summary.totalOwed).toBe(35_673.63);
    expect(summary.nextPayment?.loan.name).toBe('Personal loan');
    expect(summary.nextPayment?.date).toBe('2026-10-09');
  });
});

describe('a paid-off loan', () => {
  // $1,200 at 9% over 12 months: $104.94 a month, the last payment $104.98 on 1 Dec 2025.
  const SHORT: LoanTerms = {
    principal: 1200,
    annualRatePercent: 9,
    months: 12,
    fundedOn: new Date(2024, 11, 1),
    firstPaymentOn: new Date(2025, 0, 1),
    basis: 'monthly',
  };

  it('is paid off on its last payment’s day, with nothing left and no next payment', () => {
    expect(loanStatus(SHORT, '2025-11-30')).toMatchObject({
      paymentsMade: 11,
      amountLeft: 104.2,
      percentPaid: 91,
      nextPayment: { number: 12, date: '2025-12-01', amount: 104.98 },
      paidOff: false,
    });
    for (const today of ['2025-12-01', TODAY]) {
      expect(loanStatus(SHORT, today)).toMatchObject({
        paymentsMade: 12,
        paymentsLeft: 0,
        amountLeft: 0,
        percentPaid: 100,
        nextPayment: null,
        lastPaymentOn: '2025-12-01',
        paidOff: true,
      });
    }
  });

  it('is counted but left out of every total', () => {
    const summary = loansSummary(
      page(TODAY, ['Old loan', SHORT], ['Car loan', CAR], ['Personal loan', PERSONAL]),
    );
    expect(summary).toMatchObject({
      totalOwed: 35_328.93,
      monthlyPayments: 925.75,
      openCount: 2,
      paidOffCount: 1,
    });
    expect(summary.nextPayment?.loan.name).toBe('Car loan');
  });
});

describe('a loan with changed payments', () => {
  // The car loan with $1,500 as payment 10 (already made) and $3,000 as payment 22 (next).
  const CHANGED: LoanTerms = { ...CAR, paymentOverrides: { 10: 1500, 22: 3000 } };

  it('counts what was really paid, and shows the changed next payment and the shorter loan', () => {
    expect(loanStatus(CHANGED, TODAY)).toMatchObject({
      paymentCount: 39,
      paymentsMade: 21,
      paymentsLeft: 18,
      amountLeft: 9535.2,
      percentPaid: 47,
      nextPayment: { number: 22, date: '2026-10-15', amount: 3000 },
      lastPaymentOn: '2028-03-15',
    });
    expect(loanStatus(CHANGED, '2026-10-15')).toMatchObject({
      paymentsMade: 22,
      amountLeft: 6584.86,
      nextPayment: { number: 23, date: '2026-11-15', amount: 424.8 },
    });
  });

  it('reads the changes back from the saved row, as the page will', () => {
    const terms = termsFromStored({
      principal: 18_000,
      annual_rate: 6.25,
      term_months: 48,
      monthly_payment: 424.8,
      first_payment_on: '2025-01-15',
      funded_on: '2024-12-15',
      day_count_basis: 'monthly',
      statement_on: null,
      statement_principal: null,
      payment_overrides: { '10': 1500, '22': 3000 },
    }) as LoanTerms;
    expect(loanStatus(terms, TODAY)).toEqual(loanStatus(CHANGED, TODAY));
  });
});

describe('a loan pinned to a statement', () => {
  // The real lender: $31,394.33 at 8.14%, $554.34 a month, $28,698.15 owed on 14 Aug 2026.
  const terms = termsFromStored({
    principal: 31_394.33,
    annual_rate: 8.14,
    term_months: 72,
    monthly_payment: 554.34,
    first_payment_on: '2026-01-14',
    funded_on: '2025-11-30',
    day_count_basis: 'actual/365',
    statement_on: '2026-08-14',
    statement_principal: 28_698.15,
  }) as LoanTerms;

  it('owes the statement’s balance on the statement’s day', () => {
    expect(loanStatus(terms, '2026-08-14')).toMatchObject({
      paymentsMade: 8,
      amountLeft: 28_698.15,
      percentPaid: 9,
    });
  });

  it('carries on from the statement: 28,698.15 × 8.14% × 31/365 = $198.40, so $28,342.21 left', () => {
    expect(loanStatus(terms, TODAY)).toMatchObject({
      paymentCount: 72,
      paymentsMade: 9,
      paymentsLeft: 63,
      amountLeft: 28_342.21,
      percentPaid: 10,
      nextPayment: { number: 10, date: '2026-10-14', amount: 554.34 },
    });
  });
});

describe('the paid-off share', () => {
  it('never shows 100% while a cent is left', () => {
    // A changed payment one cent short of the payoff: $0.01 left of $32,001 is 99.99997%.
    const terms: LoanTerms = {
      principal: 32_001,
      annualRatePercent: 7.5,
      months: 72,
      fundedOn: new Date(2026, 1, 6),
      firstPaymentOn: new Date(2026, 2, 15),
      basis: 'actual/365',
      paymentOverrides: { 30: 20_970.79 },
    };
    expect(loanStatus(terms, '2028-08-15')).toMatchObject({
      amountLeft: 0.01,
      percentPaid: 99,
      paymentsLeft: 1,
      nextPayment: { number: 31, date: '2028-09-15', amount: 0.01 },
      paidOff: false,
    });
    expect(loanStatus(terms, '2028-09-15')).toMatchObject({ percentPaid: 100, paidOff: true });
  });

  it('reads 0%, not less, when the first period’s interest outran the payment', () => {
    // 15% over 30 years with a 75-day opening: $9,246.58 of interest against a $3,863.11 payment
    // leaves $305,383.47, 1.8% more than was borrowed.
    const terms: LoanTerms = {
      principal: 300_000,
      annualRatePercent: 15,
      months: 360,
      fundedOn: new Date(2025, 9, 18),
      firstPaymentOn: new Date(2026, 0, 1),
      basis: 'actual/365',
    };
    expect(loanStatus(terms, '2026-01-01')).toMatchObject({
      amountLeft: 305_383.47,
      percentPaid: 0,
    });
  });

  it('rounds a half percent up, on whole cents', () => {
    // $1,000 at 0% over 200 months, $5 a month: one payment is exactly 0.5%.
    const terms: LoanTerms = {
      principal: 1000,
      annualRatePercent: 0,
      months: 200,
      fundedOn: new Date(2025, 11, 1),
      firstPaymentOn: new Date(2026, 0, 1),
    };
    expect(loanStatus(terms, '2026-01-01')).toMatchObject({ amountLeft: 995, percentPaid: 1 });
  });
});

describe('the page totals', () => {
  const status = (overrides: Partial<LoanStatus>): LoanStatus => ({
    ...loanStatus(CAR, TODAY),
    ...overrides,
  });

  it('adds in cents, so no float sum drifts', () => {
    const loans = Array.from({ length: 10 }, () => ({
      status: status({ amountLeft: 0.1, monthlyPayment: 0.2 }),
    }));
    expect(loansSummary(loans)).toMatchObject({ totalOwed: 1, monthlyPayments: 2 });
  });

  it('gives a tie for the soonest payment to the loan listed first', () => {
    const next = { number: 3, date: '2026-10-20', amount: 100 };
    const summary = loansSummary([
      { name: 'First', status: status({ nextPayment: next }) },
      { name: 'Second', status: status({ nextPayment: { ...next, amount: 200 } }) },
    ]);
    expect(summary.nextPayment).toMatchObject({ amount: 100, loan: { name: 'First' } });
  });

  it('is nothing at all with no loans', () => {
    expect(loansSummary([])).toEqual({
      totalOwed: 0,
      monthlyPayments: 0,
      nextPayment: null,
      openCount: 0,
      paidOffCount: 0,
    });
  });
});
