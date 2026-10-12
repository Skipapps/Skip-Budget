import {
  DAY_31_2024,
  DAY_31_2025,
  WIREFRAME,
  WIREFRAME_DAY_22,
} from '@/lib/__fixtures__/add-loan-reference';
import { inCents, referenceSchedule } from '@/lib/__fixtures__/loan-reference';
import { amortise, termsFromStored, type LoanTerms, type StoredLoan } from '@/lib/loan';
import { scheduleWithOverrides } from '@/lib/loan-overrides';
import {
  loanReview,
  type LoanReview,
  type LoanReviewFields,
  type LoanReviewFigures,
} from '@/lib/loan-review';
import { readLoanRoute, termsFromRoute } from '@/lib/loan-route';
import { loanTermsForBill } from '@/lib/loan-start';
import { loanStatus } from '@/lib/loan-status';

const TODAY = '2026-10-12';

/** The wireframe's loan: $18,000 at 6.25% over 4 years from 27 Dec 2024, paid on the 27th. */
const WIREFRAME_FIELDS: LoanReviewFields = {
  principal: 18_000,
  annualRate: 6.25,
  termMonths: 48,
  startDate: new Date(2024, 11, 27),
  paymentDay: 27,
  monthlyPayment: 424.8,
};

function figures(review: LoanReview): LoanReviewFigures {
  if (!review.ok) throw new Error(`refused: ${JSON.stringify(review.refusal)}`);
  return review;
}

const reviewOf = (fields: Partial<LoanReviewFields>, today = TODAY) =>
  figures(loanReview({ ...WIREFRAME_FIELDS, ...fields }, today));

const tuples = (terms: LoanTerms) =>
  amortise(terms).rows.map((row) => [
    row.date,
    row.days,
    Math.round(row.interest * 100),
    Math.round(row.payment * 100),
    Math.round(row.balance * 100),
  ]);

/** The loan as `save_loan` files it and the Loans page reads it back. */
function stored(review: LoanReviewFigures): StoredLoan {
  const { save } = review;
  return {
    principal: save.principal,
    annual_rate: save.annualRate,
    term_months: save.termMonths,
    monthly_payment: save.monthlyPayment,
    first_payment_on: save.firstPaymentOn,
    funded_on: save.fundedOn,
    day_count_basis: save.dayCountBasis,
    statement_on: null,
    statement_principal: null,
    payment_overrides: save.paymentOverrides,
    payment_day: save.paymentDay,
  };
}

describe('the wireframe loan on the Review page (daily interest, actual/365)', () => {
  const review = reviewOf({});

  it('is first due 27 Jan 2025 and runs all 48 payments at the bank’s $424.80', () => {
    expect(review.firstPaymentOn).toBe('2025-01-27');
    expect(review.monthlyPayment).toBe(424.8);
    expect(review.paymentCount).toBe(48);
    expect(review.termMonths).toBe(48);
    expect(review.finalPayment).toBe(424.5);
    expect(review.balloon).toBe(false);
  });

  it('costs $2,390.10 in interest, $20,390.10 in all, as the independent reference adds up', () => {
    expect(review.totalInterest).toBe(2390.1);
    expect(review.totalPaid).toBe(20_390.1);
    const referenceInterest = WIREFRAME.rows.reduce((sum, row) => sum + row[2], 0);
    const referencePaid = WIREFRAME.rows.reduce((sum, row) => sum + row[3], 0);
    expect([referenceInterest, referencePaid]).toEqual([239_010, 2_039_010]);
  });

  it('agrees with the independent reference and the exact-integer amortiser on every row', () => {
    expect(tuples(review.terms)).toEqual(WIREFRAME.rows);
    expect(inCents(amortise(review.terms).rows)).toEqual(
      referenceSchedule({
        principalCents: 1_800_000,
        rateUnits: 625,
        unitsPerPercent: 100,
        months: 48,
        fundedOn: new Date(2024, 11, 27),
        firstPaymentOn: new Date(2025, 0, 27),
        basis: 'actual/365',
        paymentCents: 42_480,
      }),
    );
  });

  it('on 12 Oct 2026 has made 21 payments; the next is 27 Oct 2026, as on the Loans page', () => {
    expect(review.paymentsMade).toBe(21);
    expect(review.nextPayment).toEqual({ number: 22, date: '2026-10-27', amount: 424.8 });
    const status = loanStatus(review.terms, TODAY);
    expect(status.nextPayment).toEqual(review.nextPayment);
    expect([status.paymentsLeft, status.paymentCount, status.amountLeft]).toEqual([
      27, 48, 10_673.67,
    ]);
  });

  it('ends on its term’s last day, so no last payment date is sent', () => {
    expect(review.payoffOn).toBe('2028-12-27');
    expect(review.termEndsOn).toBe('2028-12-27');
    expect(review.save.lastPaymentOn).toBeNull();
  });

  it('files the figures save_loan takes, and the Loans page reads back the same schedule', () => {
    expect(review.save).toEqual({
      principal: 18_000,
      annualRate: 6.25,
      termMonths: 48,
      monthlyPayment: 424.8,
      totalInterest: 2390.1,
      firstPaymentOn: '2025-01-27',
      fundedOn: '2024-12-27',
      dayCountBasis: 'actual/365',
      paymentOverrides: null,
      lastPaymentOn: null,
      paymentDay: null,
    });
    const readBack = loanTermsForBill(stored(review), { starts_on: '2025-01-27' }) as LoanTerms;
    expect(amortise(readBack).rows).toEqual(amortise(review.terms).rows);
    expect(loanStatus(readBack, TODAY)).toEqual(loanStatus(review.terms, TODAY));
  });

  it('opens the schedule page on exactly this schedule', () => {
    expect(review.scheduleParams).toEqual({
      amount: '18000',
      rate: '6.25',
      months: '48',
      start: '2025-01-27',
      funded: '2024-12-27',
      basis: 'actual/365',
      monthly: '424.8',
    });
    // As loan-schedule.tsx reads it.
    const route = readLoanRoute(review.scheduleParams);
    const shown = scheduleWithOverrides(
      termsFromRoute(route, { withExtras: true }),
      route.overrides,
    );
    expect(shown.problems).toEqual([]);
    expect(shown.rows).toEqual(amortise(review.terms).rows);
    expect([shown.totalInterest, shown.totalPaid]).toEqual([2390.1, 20_390.1]);
  });

  it('on monthly rests reads $10,673.63 left, the Loans page design’s figure', () => {
    const rests = reviewOf({ basis: 'monthly' });
    expect(loanStatus(rests.terms, TODAY).amountLeft).toBe(10_673.63);
    expect(rests.save.dayCountBasis).toBe('monthly');
    expect(rests.scheduleParams.basis).toBe('monthly');
  });

  it('ignores the time of day the date picker carries', () => {
    const late = reviewOf({ startDate: new Date(2024, 11, 27, 22, 30) });
    expect(late.save.fundedOn).toBe('2024-12-27');
    expect(late.terms).toEqual(review.terms);
    expect(amortise(late.terms)).toEqual(amortise(review.terms));
  });
});

describe('the wireframe’s chip, day 22: earlier than the 27th, so first due 22 Feb 2025', () => {
  const review = reviewOf({ paymentDay: 22 });

  it('charges the 57-day opening period and lets the last payment take up the difference', () => {
    expect(review.firstPaymentOn).toBe('2025-02-22');
    expect(amortise(review.terms).rows[0]).toEqual(
      expect.objectContaining({ days: 57, interest: 175.68 }),
    );
    expect(tuples(review.terms)).toEqual(WIREFRAME_DAY_22.rows);
    expect(review.finalPayment).toBe(524.62);
    expect(review.balloon).toBe(false);
    expect(review.totalInterest).toBe(2490.22);
    expect(review.nextPayment).toEqual({ number: 21, date: '2026-10-22', amount: 424.8 });
  });
});

describe('a payment day the first month cannot hold', () => {
  it('day 31 from 31 Jan 2025: first due 28 Feb, then the 31st or month end, and the day is saved', () => {
    const review = reviewOf({
      principal: 10_000,
      annualRate: 7.5,
      termMonths: 12,
      startDate: new Date(2025, 0, 31),
      paymentDay: 31,
      monthlyPayment: 867.33,
    });
    expect(review.firstPaymentOn).toBe('2025-02-28');
    expect(tuples(review.terms)).toEqual(DAY_31_2025.rows);
    expect(review.termEndsOn).toBe('2026-01-31');
    expect(review.save.paymentDay).toBe(31);
    expect(review.save.lastPaymentOn).toBeNull();
    expect(review.scheduleParams.day).toBe('31');

    // Read back with the day: the same schedule. Read back without it (a database that dropped
    // it): every payment slides to the 28th, which is why such a save must be refused, not made.
    const saved = stored(review);
    expect(amortise(termsFromStored(saved) as LoanTerms).rows).toEqual(amortise(review.terms).rows);
    const dropped = amortise(termsFromStored({ ...saved, payment_day: null }) as LoanTerms);
    expect(dropped.payoffOn).toBe('2026-01-28');

    const route = readLoanRoute(review.scheduleParams);
    expect(
      scheduleWithOverrides(termsFromRoute(route, { withExtras: true }), route.overrides).rows,
    ).toEqual(amortise(review.terms).rows);
  });

  it('day 31 from 31 Jan 2024: first due 29 Feb', () => {
    const review = reviewOf({
      principal: 10_000,
      annualRate: 7.5,
      termMonths: 12,
      startDate: new Date(2024, 0, 31),
      paymentDay: 31,
      monthlyPayment: 867.51,
    });
    expect(review.firstPaymentOn).toBe('2024-02-29');
    expect(tuples(review.terms)).toEqual(DAY_31_2024.rows);
    expect(review.save.paymentDay).toBe(31);
  });

  it('day 30 from 31 Jan: earlier than the 31st, so first due 30 Mar; nothing to anchor', () => {
    const review = reviewOf({
      principal: 10_000,
      annualRate: 7.5,
      termMonths: 12,
      startDate: new Date(2025, 0, 31),
      paymentDay: 30,
      monthlyPayment: 872.62,
    });
    expect(review.firstPaymentOn).toBe('2025-03-30');
    expect(review.save.paymentDay).toBeNull();
    expect(review.scheduleParams.day).toBeUndefined();
    // Its 12th payment is in February: the day clamps there, and the stored loan agrees.
    expect(review.payoffOn).toBe('2026-02-28');
    expect(amortise(termsFromStored(stored(review)) as LoanTerms).rows).toEqual(
      amortise(review.terms).rows,
    );
  });
});

describe('next payment or first payment', () => {
  it('before the first payment, nothing is made and the next is the first', () => {
    const review = reviewOf({}, '2025-01-26');
    expect(review.paymentsMade).toBe(0);
    expect(review.nextPayment).toEqual({ number: 1, date: '2025-01-27', amount: 424.8 });
  });

  it('a payment due today counts as made, as on the Loans page', () => {
    const review = reviewOf({}, '2025-01-27');
    expect(review.paymentsMade).toBe(1);
    expect(review.nextPayment?.date).toBe('2025-02-27');
  });

  it('a loan whose payments are all behind today has none next', () => {
    const review = reviewOf({}, '2029-01-01');
    expect(review.paymentsMade).toBe(48);
    expect(review.nextPayment).toBeNull();
  });
});

describe('a payment other than the loan’s own', () => {
  it('a larger one ends the loan early: fewer payments and a last payment date to save', () => {
    const review = reviewOf({ monthlyPayment: 1000 });
    expect(review.paymentCount).toBe(19);
    expect(review.finalPayment).toBe(948.88);
    expect(review.totalInterest).toBe(948.88);
    expect(review.totalPaid).toBe(18_948.88);
    expect(review.payoffOn).toBe('2026-07-27');
    expect(review.save.lastPaymentOn).toBe('2026-07-27');
    expect(review.nextPayment).toBeNull();
  });

  it('one that barely clears the loan in its term is allowed, as a balloon', () => {
    const review = reviewOf({ monthlyPayment: 96 });
    expect(review.balloon).toBe(true);
    expect(review.paymentCount).toBe(48);
    expect(review.finalPayment).toBe(17_976.67);
    expect(review.totalInterest).toBe(4488.67);
  });

  it('one that never clears the loan is refused, with the least that does', () => {
    const review = loanReview({ ...WIREFRAME_FIELDS, monthlyPayment: 95 }, TODAY);
    expect(review).toEqual({
      ok: false,
      refusal: {
        reason: 'payment',
        problem: { payment: 'monthly', reason: 'below-interest', minimum: 95.55 },
      },
    });
    expect(reviewOf({ monthlyPayment: 95.55 }).balloon).toBe(true);
  });

  it('at 0% the loan is the amount borrowed, spread out', () => {
    const review = reviewOf({ annualRate: 0, monthlyPayment: 375 });
    expect([review.paymentCount, review.totalInterest, review.totalPaid]).toEqual([48, 0, 18_000]);
  });
});

describe('a first payment carried from the calculator', () => {
  it('is used as given, with the payment day on its own day', () => {
    const review = reviewOf({ firstPaymentOn: new Date(2025, 0, 15), paymentDay: 15 });
    expect(review.firstPaymentOn).toBe('2025-01-15');
    expect(amortise(review.terms).rows[0].days).toBe(19);
    expect(amortise(review.terms).rows[1].date).toBe('2025-02-15');
    expect(review.save.paymentDay).toBeNull();
  });

  it('is refused when it is not after the start date', () => {
    for (const first of [new Date(2024, 11, 27), new Date(2024, 11, 1)]) {
      expect(loanReview({ ...WIREFRAME_FIELDS, firstPaymentOn: first }, TODAY)).toEqual({
        ok: false,
        refusal: { reason: 'fields', fields: ['startDate'] },
      });
    }
  });
});

describe('the calculator’s loan, carried to the Review', () => {
  // As the calculator hands it over: its first payment, funding date, payment and changes, with
  // the payment day the first payment's own day.
  it.each([
    ['on the rule’s date', '2024-12-27', '2025-01-27', 'actual/365'],
    ['pinned before the rule’s date', '2024-12-27', '2025-01-15', 'actual/365'],
    ['pinned on a short month’s end', '2025-01-31', '2025-02-28', 'actual/365'],
    ['on monthly rests', '2024-12-27', '2025-01-27', 'monthly'],
  ] as const)('keeps every figure to the cent: %s', (_name, funded, start, basis) => {
    const calculator: LoanTerms = {
      principal: 18_000,
      annualRatePercent: 6.25,
      months: 48,
      firstPaymentOn: new Date(`${start}T00:00:00`),
      fundedOn: new Date(`${funded}T00:00:00`),
      basis,
    };
    const priced = scheduleWithOverrides(calculator, { payments: { 12: 2000 } });
    const route = readLoanRoute({
      amount: '18000',
      rate: '6.25',
      months: '48',
      start,
      funded,
      basis,
    });
    const first = new Date(`${route.start}T00:00:00`);
    const review = figures(
      loanReview(
        {
          principal: route.principal,
          annualRate: route.annualRate,
          termMonths: route.months,
          startDate: new Date(`${route.funded}T00:00:00`),
          paymentDay: first.getDate(),
          monthlyPayment: priced.payment,
          basis: route.basis,
          paymentOverrides: priced.applied.payments,
          firstPaymentOn: first,
        },
        TODAY,
      ),
    );
    expect(amortise(review.terms).rows).toEqual(priced.rows);
    expect([review.totalInterest, review.totalPaid, review.paymentCount]).toEqual([
      priced.totalInterest,
      priced.totalPaid,
      priced.paymentCount,
    ]);
  });
});

describe('payments changed in the calculator', () => {
  it('are kept, saved and shown on the schedule', () => {
    const review = reviewOf({ paymentOverrides: { 12: 2000 } });
    expect(review.save.paymentOverrides).toEqual({ '12': 2000 });
    expect(review.dropped).toEqual([]);
    expect(review.paymentCount).toBeLessThan(48);
    expect(review.save.lastPaymentOn).toBe(review.payoffOn);
    expect(review.scheduleParams.overrides).toBe('{"12":2000}');
    const route = readLoanRoute(review.scheduleParams);
    expect(
      scheduleWithOverrides(termsFromRoute(route, { withExtras: true }), route.overrides).rows,
    ).toEqual(amortise(review.terms).rows);
    expect(amortise(termsFromStored(stored(review)) as LoanTerms).rows).toEqual(
      amortise(review.terms).rows,
    );
  });

  it('that no longer fit are dropped and named; ones the loan never reaches are listed', () => {
    const review = reviewOf({
      termMonths: 36,
      monthlyPayment: 549.67,
      paymentOverrides: { 3: 10, 36: 500, 40: 500 },
    });
    expect(review.dropped).toEqual([
      { payment: 3, reason: 'below-interest', minimum: expect.any(Number) },
      { payment: 36, reason: 'last-payment' },
    ]);
    expect(review.unused).toEqual([40]);
    expect(review.save.paymentOverrides).toBeNull();
    expect(amortise(review.terms).rows.some((row) => row.overridden)).toBe(false);
  });
});

describe('what the Review refuses', () => {
  it('lists what is missing or unusable, in the page’s order', () => {
    expect(
      loanReview(
        {
          principal: 0,
          annualRate: Number.NaN,
          termMonths: 0,
          startDate: new Date(Number.NaN),
          paymentDay: 32,
          monthlyPayment: 0,
        },
        TODAY,
      ),
    ).toEqual({
      ok: false,
      refusal: {
        reason: 'fields',
        fields: ['principal', 'rate', 'term', 'startDate', 'paymentDay', 'monthlyPayment'],
      },
    });
    const one = (fields: Partial<LoanReviewFields>) =>
      loanReview({ ...WIREFRAME_FIELDS, ...fields }, TODAY);
    expect(one({ principal: 18_000.005 })).toEqual({
      ok: false,
      refusal: { reason: 'fields', fields: ['principal'] },
    });
    expect(one({ termMonths: 12.5 })).toEqual({
      ok: false,
      refusal: { reason: 'fields', fields: ['term'] },
    });
    expect(one({ paymentDay: 0 })).toEqual({
      ok: false,
      refusal: { reason: 'fields', fields: ['paymentDay'] },
    });
    expect(one({ monthlyPayment: 424.805 })).toEqual({
      ok: false,
      refusal: { reason: 'fields', fields: ['monthlyPayment'] },
    });
  });

  it('refuses a rate the loans table cannot keep', () => {
    for (const annualRate of [100.5, -1, 7.12345678949]) {
      expect(loanReview({ ...WIREFRAME_FIELDS, annualRate }, TODAY)).toEqual({
        ok: false,
        refusal: { reason: 'rate' },
      });
    }
    // The table's top rate is still a loan.
    expect(reviewOf({ annualRate: 100, monthlyPayment: 2000 }).paymentCount).toBeGreaterThan(0);
  });
});
