import { annualPercentageRate, truthInLending } from '@/lib/apr';
import { amortise } from '@/lib/loan';

const stream = (terms: Parameters<typeof amortise>[0]) =>
  amortise(terms).rows.map((row) => ({
    on: new Date(`${row.date}T00:00:00`),
    amount: row.payment,
  }));

describe('annualPercentageRate', () => {
  /**
   * The one case with a closed form, so it checks the solver against algebra
   * rather than against another implementation of the same idea.
   *
   * Borrow $100, repay $110 one month later: the unit period rate is plainly
   * 10%, and Appendix J's APR is the unit rate times the number of unit periods
   * in a year — 10% × 12 = 120%. (Reg Z does not compound the APR; that is what
   * separates it from an effective annual rate, which would be 213.8%.)
   */
  it('is the unit period rate times the periods in a year', () => {
    expect(
      annualPercentageRate({
        advance: 100,
        advancedOn: new Date(2026, 0, 1),
        payments: [{ on: new Date(2026, 1, 1), amount: 110 }],
      }),
    ).toBe(120);
  });

  /**
   * Two payments, solved by hand with the quadratic formula.
   *
   *     1000 = 600/(1+i) + 600/(1+i)²
   *
   * Substituting x = 1/(1+i) gives 3x² + 3x − 5 = 0, so x = (−3 + √69)/6 =
   * 0.8844373…, 1 + i = 1.1306624…, i = 0.13066238… and the APR is 12i =
   * 156.794864…%. Nothing about that derivation touches this file's code.
   */
  it('matches the closed-form answer on a two-payment loan', () => {
    const byHand = ((6 / (-3 + Math.sqrt(69)) - 1) * 12 * 100).toFixed(5);
    expect(
      annualPercentageRate({
        advance: 1000,
        advancedOn: new Date(2026, 0, 1),
        payments: [
          { on: new Date(2026, 1, 1), amount: 600 },
          { on: new Date(2026, 2, 1), amount: 600 },
        ],
      }),
    ).toBe(Number(byHand));
    expect(byHand).toBe('156.79486');
  });

  it('is exactly the note rate when there are no fees and no odd days', () => {
    // With a regular monthly stream and nothing deducted at closing, the APR
    // and the nominal rate are the same number by construction. If the odd-days
    // handling or the unit period counting were wrong, this would not land on
    // a flat 7.
    expect(
      annualPercentageRate({
        advance: 100_000,
        advancedOn: new Date(2025, 11, 1),
        payments: stream({
          principal: 100_000,
          annualRatePercent: 7,
          months: 360,
          fundedOn: new Date(2025, 11, 1),
          firstPaymentOn: new Date(2026, 0, 1),
          basis: 'monthly',
        }),
      }),
    ).toBe(7);
  });

  it('quotes nothing on an interest-free plan', () => {
    expect(
      annualPercentageRate({
        advance: 1200,
        advancedOn: new Date(2026, 0, 1),
        payments: Array.from({ length: 12 }, (unused, index) => ({
          on: new Date(2026, index + 1, 1),
          amount: 100,
        })),
      }),
    ).toBe(0);
  });

  it('has nothing to quote on an empty or impossible transaction', () => {
    expect(annualPercentageRate({ advance: 0, advancedOn: new Date(), payments: [] })).toBe(0);
    expect(
      annualPercentageRate({
        advance: 1000,
        prepaidFinanceCharge: 1000,
        advancedOn: new Date(2026, 0, 1),
        payments: [{ on: new Date(2026, 1, 1), amount: 1000 }],
      }),
    ).toBe(0);
  });
});

/**
 * Fixture 5 — the textbook Truth in Lending example: a $100,000 loan at 7.000%
 * over 30 years with $2,000 of points and origination fees paid at closing.
 *
 * The note payment is $665.30 (annuity formula), the borrower receives $98,000,
 * and the disclosed APR comes out above the note rate because the fee buys
 * nothing but the loan. Source for the maths: Appendix J to 12 CFR Part 1026,
 * part (b) — the APR is the rate that discounts the payment stream back to the
 * amount financed. The check below is the definition itself: discount the 360
 * payments at the returned rate and the present value must be $98,000 to the
 * cent, which no wrong rate can satisfy.
 */
describe('fixture: $100,000 at 7% for 30 years with $2,000 in fees (Reg Z Appendix J)', () => {
  const ADVANCED_ON = new Date(2025, 11, 1);
  const payments = stream({
    principal: 100_000,
    annualRatePercent: 7,
    months: 360,
    fundedOn: ADVANCED_ON,
    firstPaymentOn: new Date(2026, 0, 1),
    basis: 'monthly',
  });

  const disclosure = truthInLending({
    advance: 100_000,
    prepaidFinanceCharge: 2_000,
    advancedOn: ADVANCED_ON,
    payments,
  });

  it('discloses an APR above the note rate', () => {
    expect(payments[0].amount).toBe(665.3);
    expect(disclosure.apr).toBe(7.20136);
  });

  it('fills in the rest of the Truth in Lending box', () => {
    expect(disclosure.amountFinanced).toBe(98_000);
    expect(disclosure.totalOfPayments).toBe(239_510.98);
    expect(disclosure.totalInterest).toBe(139_510.98);
    // The finance charge is the interest plus the prepaid fee (§1026.4).
    expect(disclosure.financeCharge).toBe(141_510.98);
  });

  it('satisfies the equation that defines it', () => {
    // Written out independently: discount each payment at the disclosed rate
    // and the present value must be the amount financed. Because the rate is
    // reported to five decimals, the check is that the true root is bracketed
    // by the last reported digit — a rate half a unit below must overshoot
    // $98,000 and half a unit above must undershoot it. Nothing but the
    // correctly rounded rate can do both. (Five decimals of APR is worth about
    // five cents of present value over thirty years, which is why this is a
    // bracket and not an equality.)
    const presentValue = (apr: number) => {
      const unitRate = apr / 100 / 12;
      return payments.reduce(
        (total, payment, index) => total + payment.amount / (1 + unitRate) ** (index + 1),
        0,
      );
    };

    expect(presentValue(disclosure.apr - 0.000005)).toBeGreaterThan(disclosure.amountFinanced);
    expect(presentValue(disclosure.apr + 0.000005)).toBeLessThan(disclosure.amountFinanced);
    expect(presentValue(disclosure.apr)).toBeCloseTo(disclosure.amountFinanced, 0);
  });
});

/**
 * Fixture 6 — the real installment loan from `loan.test.ts`, disclosed.
 *
 * $31,394.33 at 8.14% over 72 months, funded 30 Nov 2025 with a first payment
 * on 14 Jan 2026 and a contract payment of $554.34. No fees, but the 45-day
 * opening period and the lender's cent of rounding on the payment both move the
 * APR off the note rate — which is exactly what a disclosure is for.
 */
describe('fixture: the real lender statement, disclosed', () => {
  const disclosure = truthInLending({
    advance: 31_394.33,
    advancedOn: new Date(2025, 10, 30),
    payments: stream({
      principal: 31_394.33,
      annualRatePercent: 8.14,
      months: 72,
      fundedOn: new Date(2025, 10, 30),
      firstPaymentOn: new Date(2026, 0, 14),
      basis: 'actual/365',
      payment: 554.34,
    }),
  });

  it('lands within a hundredth of a point of the note rate', () => {
    expect(disclosure.apr).toBe(8.13592);
    // §1026.22(a)(2) allows an eighth of a percentage point either way; this is
    // comfortably inside it, which is the test that the odd-days handling is
    // not wildly wrong.
    expect(Math.abs(disclosure.apr - 8.14)).toBeLessThan(0.125);
  });

  it('totals what the borrower actually repays', () => {
    expect(disclosure.totalOfPayments).toBe(39_913.55);
    expect(disclosure.totalInterest).toBe(8519.22);
    expect(disclosure.financeCharge).toBe(8519.22);
    expect(disclosure.amountFinanced).toBe(31_394.33);
  });
});

describe('odd days', () => {
  it('costs more APR the longer the money sits before the first payment', () => {
    // Same note, same payments, funded earlier: the borrower holds the money
    // longer for the same money back, so the rate it is costing is higher.
    const payments = stream({
      principal: 20_000,
      annualRatePercent: 6,
      months: 48,
      fundedOn: new Date(2026, 0, 1),
      firstPaymentOn: new Date(2026, 1, 1),
      basis: 'monthly',
    });

    const onTime = annualPercentageRate({
      advance: 20_000,
      advancedOn: new Date(2026, 0, 1),
      payments,
    });
    const early = annualPercentageRate({
      advance: 20_000,
      advancedOn: new Date(2025, 11, 17),
      payments,
    });

    expect(onTime).toBeCloseTo(6, 3);
    expect(early).toBeLessThan(onTime);
  });

  it('treats a clamped month end as a whole unit period, not as odd days', () => {
    // Advanced 31 Jan, paid on the 28th, 31st and 30th: three clean unit
    // periods. Counting forward instead of backward would invent odd days in
    // February and quote a different rate.
    const apr = annualPercentageRate({
      advance: 1000,
      advancedOn: new Date(2026, 0, 31),
      payments: [
        { on: new Date(2026, 1, 28), amount: 400 },
        { on: new Date(2026, 2, 31), amount: 400 },
        { on: new Date(2026, 3, 30), amount: 400 },
      ],
    });
    const plain = annualPercentageRate({
      advance: 1000,
      advancedOn: new Date(2026, 0, 15),
      payments: [
        { on: new Date(2026, 1, 15), amount: 400 },
        { on: new Date(2026, 2, 15), amount: 400 },
        { on: new Date(2026, 3, 15), amount: 400 },
      ],
    });
    expect(apr).toBe(plain);
  });
});
