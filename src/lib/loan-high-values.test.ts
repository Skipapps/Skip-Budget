import { inCents, referenceSchedule } from '@/lib/__fixtures__/loan-reference';
import { truthInLending } from '@/lib/apr';
import { amortise, calculateLoan, payoffQuote, solvePayment, type LoanTerms } from '@/lib/loan';

/**
 * Typed figures go past the calculator's sliders: amounts over a million, rates over
 * 30% (Mexican personal loans run 40–90%). Nothing in the engine clamps them, and every figure here
 * was worked twice outside it: by `referenceSchedule` (exact integers) and by a Python `decimal`
 * amortiser (ROUND_HALF_UP, 60 digits).
 */

const reference = (terms: LoanTerms, payment: number, unitsPerPercent = 1000) =>
  referenceSchedule({
    principalCents: Math.round(terms.principal * 100),
    rateUnits: Math.round(terms.annualRatePercent * unitsPerPercent),
    unitsPerPercent,
    months: terms.months,
    fundedOn: terms.fundedOn as Date,
    firstPaymentOn: terms.firstPaymentOn,
    basis: terms.basis ?? 'actual/365',
    paymentCents: Math.round(payment * 100),
  });

/**
 * $2,500,000 at 6.875% over 30 years on monthly rests, the jumbo mortgage. The annuity formula
 * gives 16,423.2203… so $16,423.22. Month one: 2,500,000 × 6.875% ÷ 12 = 14,322.9166… posts
 * $14,322.92; month two: 2,497,899.70 × 6.875% ÷ 12 = 14,310.8794… posts $14,310.88.
 */
describe('fixture: a $2.5M mortgage at 6.875% over 30 years', () => {
  const TERMS = {
    principal: 2_500_000,
    annualRatePercent: 6.875,
    months: 360,
    fundedOn: new Date(2025, 11, 1),
    firstPaymentOn: new Date(2026, 0, 1),
    basis: 'monthly' as const,
  };
  const loan = amortise(TERMS);

  it('quotes the published payment and splits the first two the way the formula does', () => {
    expect(loan.payment).toBe(16_423.22);
    expect(calculateLoan(2_500_000, 6.875, 360).monthlyPayment).toBe(16_423.22);
    expect(loan.rows[0]).toMatchObject({
      interest: 14_322.92,
      principal: 2100.3,
      balance: 2_497_899.7,
    });
    expect(loan.rows[1]).toMatchObject({ interest: 14_310.88, balance: 2_495_787.36 });
  });

  it('closes exactly, the last payment absorbing 55 cents of real rounding', () => {
    expect(loan.rows).toHaveLength(360);
    expect(loan.payoffOn).toBe('2055-12-01');
    expect(loan.finalPayment).toBe(16_423.89);
    expect(loan.totalInterest).toBe(3_412_359.87);
    expect(calculateLoan(2_500_000, 6.875, 360).totalInterest).toBe(3_412_359.32);
    expect(loan.totalPaid).toBe(5_912_359.87);
  });

  it('agrees with the exact-integer amortiser on all 360 rows', () => {
    expect(inCents(loan.rows)).toEqual(reference(TERMS, loan.payment));
  });

  it('quotes a mid-month payoff to the cent', () => {
    // 2,497,899.70 × 6.875% × 14/365 = 6,586.9272… of per diem since the January payment.
    const quote = payoffQuote(TERMS, new Date(2026, 0, 15));
    expect(quote.accruedInterest).toBe(6586.93);
    expect(quote.payoff).toBe(2_504_486.63);
  });
});

/**
 * MXN 50,000 at 60% a year over 24 months, the way a Mexican bank accrues it: the balance times the
 * annual rate over 360, by the days elapsed. Funded 15 Jan 2026, first payment 15 Feb 2026.
 * Month one: 50,000 × 60% × 31/360 = 2,583.333… posts 2,583.33; month two (28 days):
 * 48,940.10 × 60% × 28/360 = 2,283.871… posts 2,283.87. (IVA on interest is not modelled.)
 */
describe('fixture: a 60% a year personal loan', () => {
  const TERMS = {
    principal: 50_000,
    annualRatePercent: 60,
    months: 24,
    fundedOn: new Date(2026, 0, 15),
    firstPaymentOn: new Date(2026, 1, 15),
    basis: 'actual/360' as const,
  };
  const loan = amortise(TERMS);

  it('prices it to the cent', () => {
    expect(loan.payment).toBe(3643.23);
    expect(loan.rows[0]).toMatchObject({
      days: 31,
      interest: 2583.33,
      principal: 1059.9,
      balance: 48_940.1,
    });
    expect(loan.rows[1]).toMatchObject({ days: 28, interest: 2283.87, balance: 47_580.74 });
    expect(loan.rows[22]).toMatchObject({ interest: 338.45, balance: 3464.18 });
    expect(loan.finalPayment).toBe(3643.16);
    expect(loan.payoffOn).toBe('2028-01-15');
    expect(loan.totalInterest).toBe(37_437.45);
    expect(inCents(loan.rows)).toEqual(reference(TERMS, loan.payment));
  });

  it('discloses an APR above the note rate, as actual/360 earns 365 days a year', () => {
    const disclosure = truthInLending({
      advance: 50_000,
      advancedOn: TERMS.fundedOn,
      payments: loan.rows.map((row) => ({
        on: new Date(`${row.date}T00:00:00`),
        amount: row.payment,
      })),
    });
    expect(disclosure.apr).toBe(60.66925);
    expect(disclosure.totalOfPayments).toBe(87_437.45);
    // Every payment is a whole number of months from funding, so the present value at the APR's
    // monthly rate is a plain sum, and it returns the amount financed.
    const monthly = disclosure.apr / 1200;
    const present = loan.rows.reduce(
      (sum, row, index) => sum + row.payment / (1 + monthly) ** (index + 1),
      0,
    );
    expect(Math.abs(present - 50_000)).toBeLessThan(0.01);
  });
});

/**
 * A loan that barely shrinks: 60% over 20 years, $30,000, monthly rests. A month's interest is
 * exactly $1,500.00, so a payment of $1,500.01 takes a cent off; the cent moves the last payment by
 * thousands. Rounded half up the payment is $1,500.01 and leaves a $9,148.07 balloon; a lender rounds
 * up, to $1,500.02, which ends the loan after 231 payments.
 */
describe('a payment that cannot close the loan to the cent', () => {
  const TERMS = {
    principal: 30_000,
    annualRatePercent: 60,
    months: 240,
    fundedOn: new Date(2026, 1, 15),
    firstPaymentOn: new Date(2026, 2, 15),
    basis: 'monthly' as const,
  };

  it('rounds up rather than leave a balloon', () => {
    const halfUp = amortise({ ...TERMS, payment: 1500.01 });
    expect(halfUp.finalPayment).toBe(9148.07);

    expect(solvePayment(TERMS)).toBe(1500.02);
    const loan = amortise(TERMS);
    expect(loan.rows[0]).toMatchObject({ interest: 1500, principal: 0.02 });
    expect(loan.rows).toHaveLength(231);
    expect(loan.payoffOn).toBe('2045-05-15');
    expect(loan.finalPayment).toBe(1150.92);
    expect(loan.totalInterest).toBe(316_155.52);
  });

  it('turns a trillion-dollar balloon into a loan that ends early', () => {
    // 90% over 40 years on daily accrual: the payment one cent lower runs the balance up for decades.
    const terms = { ...TERMS, annualRatePercent: 90, months: 480, basis: 'actual/365' as const };
    expect(amortise({ ...terms, payment: 2242.97 }).finalPayment).toBe(17_556_087_015_652.17);

    expect(solvePayment(terms)).toBe(2242.98);
    const loan = amortise(terms);
    expect(loan.rows).toHaveLength(173);
    expect(loan.payoffOn).toBe('2040-07-15');
    expect(loan.finalPayment).toBe(314.51);
    expect(loan.totalInterest).toBe(356_107.07);
  });

  it('leaves the published payment alone on every loan that does amortise', () => {
    // The guard only runs where one cent moves the last payment by more than a payment.
    expect(solvePayment({ ...TERMS, months: 60 })).toBe(1584.85);
    expect(solvePayment({ ...TERMS, months: 36, basis: 'actual/365' })).toBe(1809.28);
  });
});

describe('the rate to the decimal the bank printed', () => {
  it('posts a 7.4995% note differently from 7.500%, from the very first payment', () => {
    // 32,001 × 7.4995% × 37/365 = 243.2790… → $243.28, against $243.30 at 7.500%.
    const car = {
      principal: 32_001,
      months: 72,
      fundedOn: new Date(2026, 1, 6),
      firstPaymentOn: new Date(2026, 2, 15),
      basis: 'actual/365' as const,
    };
    expect(amortise({ ...car, annualRatePercent: 7.4995 }).rows[0].interest).toBe(243.28);
    expect(amortise({ ...car, annualRatePercent: 7.5 }).rows[0].interest).toBe(243.3);

    // 2,500,000 × 7.4995% ÷ 12 = 15,623.9583… → $15,623.96, against $15,625.00.
    const jumbo = {
      principal: 2_500_000,
      months: 360,
      fundedOn: new Date(2025, 11, 1),
      firstPaymentOn: new Date(2026, 0, 1),
      basis: 'monthly' as const,
    };
    const exact = amortise({ ...jumbo, annualRatePercent: 7.4995 });
    expect(exact.rows[0].interest).toBe(15_623.96);
    expect(amortise({ ...jumbo, annualRatePercent: 7.5 }).rows[0].interest).toBe(15_625);
    expect(inCents(exact.rows)).toEqual(
      reference({ ...jumbo, annualRatePercent: 7.4995 }, exact.payment, 10_000),
    );
  });

  it('keeps a daily periodic rate × 365 exact to six decimals', () => {
    // 0.022301% a day is 8.139865% a year.
    const terms = {
      principal: 31_394.33,
      annualRatePercent: 8.139865,
      months: 72,
      fundedOn: new Date(2025, 10, 30),
      firstPaymentOn: new Date(2026, 0, 14),
      basis: 'actual/365' as const,
    };
    const loan = amortise(terms);
    expect(inCents(loan.rows)).toEqual(reference(terms, loan.payment, 1_000_000));
  });

  it('still closes exactly on a rate with more decimals than it can hold exactly', () => {
    const loan = amortise({
      principal: 250_000,
      annualRatePercent: 100 / 15, // 6.666…%
      months: 360,
      firstPaymentOn: new Date(2026, 0, 1),
      basis: 'monthly',
    });
    expect(loan.rows.at(-1)?.balance).toBe(0);
    const repaid = loan.rows.reduce((sum, row) => sum + Math.round(row.principal * 100), 0);
    expect(repaid).toBe(25_000_000);
  });
});

/** A deterministic pseudo-random sweep (Numerical Recipes LCG), seeded so failures reproduce. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('large and high-rate loans, whatever the inputs', () => {
  const random = seededRandom(25_000_000);
  const bases = ['actual/365', 'actual/360', '30/360', 'monthly'] as const;

  const cases: LoanTerms[] = Array.from({ length: 120 }, () => {
    const firstPaymentOn = new Date(2026, Math.floor(random() * 12), 1 + Math.floor(random() * 28));
    const fundedOn = new Date(firstPaymentOn);
    fundedOn.setDate(firstPaymentOn.getDate() - (20 + Math.floor(random() * 40)));
    const highRate = random() < 0.5;
    return {
      principal: Math.round((1_000_000 + random() * 24_000_000) * 100) / 100,
      annualRatePercent: Math.round(random() * (highRate ? 100_000 : 30_000)) / 1000,
      months: highRate ? 6 + Math.floor(random() * 115) : 6 + Math.floor(random() * 475),
      firstPaymentOn,
      fundedOn,
      basis: bases[Math.floor(random() * bases.length)],
    };
  });
  const schedules = cases.map((terms) => ({ terms, loan: amortise(terms) }));

  it('agrees with the exact-integer amortiser on every row', () => {
    const broken = schedules.filter(
      ({ terms, loan }) =>
        JSON.stringify(inCents(loan.rows)) !== JSON.stringify(reference(terms, loan.payment)),
    );
    expect(broken.map(({ terms }) => terms)).toEqual([]);
  });

  it('repays exactly the sum borrowed, closes at zero, and never leaves a balloon', () => {
    const broken = schedules.filter(({ terms, loan }) => {
      const repaid = loan.rows.reduce((sum, row) => sum + Math.round(row.principal * 100), 0);
      return (
        repaid !== Math.round(terms.principal * 100) ||
        loan.rows.at(-1)?.balance !== 0 ||
        loan.finalPayment > 2 * loan.payment
      );
    });
    expect(broken.map(({ terms }) => terms)).toEqual([]);
  });
});
