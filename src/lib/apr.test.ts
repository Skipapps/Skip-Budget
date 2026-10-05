import { annualPercentageRate, truthInLending } from '@/lib/apr';
import { amortise } from '@/lib/loan';

const stream = (terms: Parameters<typeof amortise>[0]) =>
  amortise(terms).rows.map((row) => ({
    on: new Date(`${row.date}T00:00:00`),
    amount: row.payment,
  }));

describe('annualPercentageRate', () => {
  // Closed form: $100 repaid as $110 a month later is a 10% unit rate, so 120% APR (not compounded;
  // an effective annual rate would be 213.8%).
  it('is the unit period rate times the periods in a year', () => {
    expect(
      annualPercentageRate({
        advance: 100,
        advancedOn: new Date(2026, 0, 1),
        payments: [{ on: new Date(2026, 1, 1), amount: 110 }],
      }),
    ).toBe(120);
  });

  // Solved by hand: 1000 = 600/(1+i) + 600/(1+i)^2 gives 3x^2 + 3x - 5 = 0 with x = 1/(1+i), so
  // x = (-3 + sqrt(69))/6 and the APR is 12i = 156.794864...%.
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
    // A regular monthly stream with nothing deducted at closing: APR equals the nominal rate.
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
 * Textbook Truth in Lending example: $100,000 at 7.000% over 30 years with $2,000 of points and
 * fees paid at closing. Note payment $665.30; the borrower receives $98,000, so the APR is above
 * the note rate.
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
    expect(disclosure.financeCharge).toBe(141_510.98);
  });

  it('satisfies the equation that defines it', () => {
    // Discounting each payment at the disclosed rate must give the amount financed. The rate is
    // reported to five decimals, so this is a bracket (half a unit either side), not an equality.
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
 * The real installment loan from `loan.test.ts`: $31,394.33 at 8.14% over 72 months, funded
 * 30 Nov 2025, first payment 14 Jan 2026, contract payment $554.34. No fees, but the 45-day opening
 * period and the lender's rounding of the payment move the APR off the note rate.
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
    // §1026.22(a)(2) tolerates an eighth of a percentage point either way.
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
    // Same payments, funded earlier: the money is held longer for the same money back.
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
    // Advanced 31 Jan, paid on the 28th, 31st and 30th: three clean unit periods, no odd days.
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
