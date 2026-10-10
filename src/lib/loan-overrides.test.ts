import { inCents, referenceSchedule } from '@/lib/__fixtures__/loan-reference';
import {
  amortise,
  comparePrepayment,
  payoffQuote,
  readPaymentOverrides,
  solvePayment,
  steadyPayment,
  termsFromStored,
  type LoanTerms,
} from '@/lib/loan';
import {
  applyOverrides,
  checkOverride,
  paymentChoice,
  paymentOverridesJson,
  scheduleWithOverrides,
} from '@/lib/loan-overrides';

/**
 * Every figure pinned below was worked twice outside the engine: by `referenceSchedule` (exact
 * integers, in this suite) and by a separate Python `decimal` amortiser (ROUND_HALF_UP, 60 digits)
 * written from the same definitions. They agreed with the engine to the cent on every row.
 */

/**
 * $32,001.00 at 7.500% over 72 months, actual/365, first payment 15 Mar 2026. The bank funded on
 * 6 Feb 2026, a 37-day opening period, and its contract payment is $554.23. Left on its default
 * (money received a month before the first payment, 28 days here) the calculator works out $553.21:
 * the "$554.23 vs $553.21" gap, from nothing but the opening period.
 */
const CAR = {
  principal: 32_001,
  annualRatePercent: 7.5,
  months: 72,
  firstPaymentOn: new Date(2026, 2, 15),
  basis: 'actual/365' as const,
};
const CAR_BANK = { ...CAR, fundedOn: new Date(2026, 1, 6) };

const reference = (terms: LoanTerms, payment: number, changes?: Record<number, number>) =>
  referenceSchedule({
    principalCents: Math.round(terms.principal * 100),
    rateUnits: Math.round(terms.annualRatePercent * 1000),
    unitsPerPercent: 1000,
    months: terms.months,
    fundedOn: terms.fundedOn ?? new Date(2026, 1, 15),
    firstPaymentOn: terms.firstPaymentOn,
    basis: terms.basis ?? 'actual/365',
    paymentCents: Math.round(payment * 100),
    changes: changes
      ? Object.fromEntries(Object.entries(changes).map(([n, v]) => [n, Math.round(v * 100)]))
      : undefined,
  });

describe('the bank’s monthly payment, a dollar above the app’s', () => {
  it('reproduces the gap: $553.21 on the default dates, $554.23 on the bank’s', () => {
    expect(solvePayment(CAR)).toBe(553.21);
    expect(solvePayment(CAR_BANK)).toBe(554.23);
  });

  it('follows $554.23 for the whole term, the last payment taking up the difference', () => {
    const loan = scheduleWithOverrides(CAR, { monthlyPayment: 554.23 });

    expect(loan.problems).toEqual([]);
    expect(loan.solvedPayment).toBe(553.21);
    expect(loan.payment).toBe(554.23);
    expect(loan.applied).toEqual({ monthlyPayment: 554.23 });

    // 32,001 × 7.5% × 28/365 = 184.1153… posts $184.12; 554.23 − 184.12 = 370.11 off the balance.
    expect(loan.rows[0]).toMatchObject({ interest: 184.12, principal: 370.11, balance: 31_630.89 });
    // 31,630.89 × 7.5% × 31/365 = 201.4844… posts $201.48.
    expect(loan.rows[1]).toMatchObject({ interest: 201.48, balance: 31_278.14 });

    expect(loan.paymentCount).toBe(72);
    expect(loan.payoffOn).toBe('2032-02-15');
    expect(loan.rows[70].balance).toBe(459.19);
    expect(loan.finalPayment).toBe(462.11);
    expect(loan.rows[71].balance).toBe(0);
    expect(loan.totalInterest).toBe(7811.44);
    expect(loan.totalPaid).toBe(39_812.44);
    expect(loan.balloon).toBe(false);

    expect(inCents(loan.rows)).toEqual(reference(CAR, 554.23));
  });

  it('is the bank’s own schedule once the bank’s dates are in, and then nothing is changed', () => {
    const loan = scheduleWithOverrides(CAR_BANK, { monthlyPayment: 554.23 });

    // Typing what the app already works out is not a change.
    expect(loan.applied).toEqual({});
    // 32,001 × 7.5% × 37/365 = 243.2953… posts $243.30.
    expect(loan.rows[0]).toMatchObject({ days: 37, interest: 243.3, balance: 31_690.07 });
    expect(loan.finalPayment).toBe(554.29);
    expect(loan.payoffOn).toBe('2032-02-15');
    expect(loan.totalInterest).toBe(7903.62);
    expect(loan.totalPaid).toBe(39_904.62);
    expect(inCents(loan.rows)).toEqual(reference(CAR_BANK, 554.23));
  });
});

/**
 * The real installment loan in loan.test.ts ($31,394.33 at 8.14%, 72 months, funded 30 Nov 2025,
 * first payment 14 Jan 2026, statement balance $28,698.15 on 14 Aug 2026). On the default dates the
 * calculator says $552.64; the lender bills $554.34, a $1.70 gap.
 */
describe('a real lender’s payment typed in', () => {
  const REAL = {
    principal: 31_394.33,
    annualRatePercent: 8.14,
    months: 72,
    firstPaymentOn: new Date(2026, 0, 14),
    basis: 'actual/365' as const,
  };
  const REAL_BANK = {
    ...REAL,
    fundedOn: new Date(2025, 10, 30),
    statement: { on: new Date(2026, 7, 14), principal: 28_698.15 },
  };

  it('shows the gap the person sees', () => {
    expect(solvePayment(REAL)).toBe(552.64);
  });

  it('on the default dates, follows the bank’s payment and ends with a smaller last payment', () => {
    const loan = scheduleWithOverrides(REAL, { monthlyPayment: 554.34 });
    expect(loan.rows[0]).toMatchObject({ days: 31, interest: 217.04, balance: 31_057.03 });
    expect(loan.paymentCount).toBe(72);
    expect(loan.finalPayment).toBe(397.03);
    expect(loan.totalInterest).toBe(8360.84);
    expect(loan.totalPaid).toBe(39_755.17);
  });

  it('with the bank’s dates and statement, quotes the payoff and maturity the lender does', () => {
    const { terms, applied, problems } = applyOverrides(REAL_BANK, { monthlyPayment: 554.34 });
    expect(problems).toEqual([]);
    // The solver gives $554.35, so the lender's $554.34 is a real change and is kept.
    expect(applied).toEqual({ monthlyPayment: 554.34 });
    expect(payoffQuote(terms, new Date(2026, 7, 28)).payoff).toBe(28_787.75);
    expect(amortise(terms).payoffOn).toBe('2031-12-14');
  });

  it('recomputes from the statement balance after a changed payment, not before it', () => {
    // Payment 9 (14 Sep 2026) is $1,000 more. From the statement's $28,698.15:
    // 28,698.15 × 8.14% × 31/365 = 198.4025… posts $198.40; 1,554.34 − 198.40 = 1,355.94 off.
    const loan = scheduleWithOverrides(REAL_BANK, {
      monthlyPayment: 554.34,
      payments: { 9: 1554.34 },
    });
    expect(loan.rows[7].balance).toBe(28_698.15);
    expect(loan.rows[8]).toMatchObject({
      payment: 1554.34,
      interest: 198.4,
      principal: 1355.94,
      balance: 27_342.21,
      overridden: true,
    });
    expect(loan.paymentCount).toBe(70);
    expect(loan.payoffOn).toBe('2031-10-14');
    expect(loan.finalPayment).toBe(142.73);
    expect(loan.totalInterest).toBe(7997.52);

    // The payoff the lender quoted before that payment is untouched.
    const terms = applyOverrides(REAL_BANK, {
      monthlyPayment: 554.34,
      payments: { 9: 1554.34 },
    }).terms;
    expect(payoffQuote(terms, new Date(2026, 7, 28)).payoff).toBe(28_787.75);
  });

  it('leaves everything after the statement alone when a change is before it', () => {
    // The statement balance already includes whatever was really paid.
    const plain = scheduleWithOverrides(REAL_BANK, { monthlyPayment: 554.34 });
    const early = scheduleWithOverrides(REAL_BANK, {
      monthlyPayment: 554.34,
      payments: { 3: 2000 },
    });
    expect(early.rows[2]).toMatchObject({ payment: 2000, overridden: true, estimated: true });
    expect(early.rows.slice(8)).toEqual(plain.rows.slice(8));
  });
});

/**
 * £/$20,000 at 6.990% over 48 months on monthly rests, funded 10 Mar 2026, first payment
 * 25 Apr 2026: a month and 15 days. The lender quotes the textbook payment (as if the first period
 * were a month), M = 20,000 · i(1+i)⁴⁸ / ((1+i)⁴⁸ − 1), i = 0.5825%, = 478.8321… so $478.83, and
 * collects the 15 odd days in the first payment: 20,000 × 6.99% × 15/365 = 57.4521… → $57.45, so
 * payment one is $536.28. A month's interest is exactly $116.50, so the first posting is
 * 116.50 + 57.4521 = 173.9521 → $173.95 and payment one takes off the textbook $362.33.
 */
describe('the bank’s odd first payment', () => {
  const ODD = {
    principal: 20_000,
    annualRatePercent: 6.99,
    months: 48,
    fundedOn: new Date(2026, 2, 10),
    firstPaymentOn: new Date(2026, 3, 25),
    basis: 'monthly' as const,
  };
  const TEXTBOOK = { ...ODD, fundedOn: new Date(2026, 2, 25) };

  it('puts the loan back on the textbook schedule from payment two to the last', () => {
    const loan = scheduleWithOverrides(ODD, { monthlyPayment: 478.83, payments: { 1: 536.28 } });
    const textbook = amortise({ ...TEXTBOOK, payment: 478.83 });

    expect(loan.problems).toEqual([]);
    expect(loan.rows[0]).toMatchObject({
      days: 46,
      payment: 536.28,
      interest: 173.95,
      principal: 362.33,
      balance: 19_637.67,
      overridden: true,
    });
    expect(textbook.rows[0]).toMatchObject({ interest: 116.5, principal: 362.33 });

    const tail = (rows: typeof loan.rows) =>
      rows.slice(1).map((row) => [row.date, row.payment, row.interest, row.balance]);
    expect(tail(loan.rows)).toEqual(tail(textbook.rows));
    expect(loan.finalPayment).toBe(478.97);
    expect(textbook.finalPayment).toBe(478.97);
    expect(loan.totalInterest).toBe(3041.43);
    expect(loan.payoffOn).toBe('2030-03-25');
    expect(inCents(loan.rows)).toEqual(reference(ODD, 478.83, { 1: 536.28 }));
  });

  it('without it, carries the odd days to a larger last payment', () => {
    const loan = scheduleWithOverrides(ODD, { monthlyPayment: 478.83 });
    expect(loan.rows[0]).toMatchObject({ interest: 173.95, principal: 304.88 });
    expect(loan.finalPayment).toBe(554.4);
    expect(loan.totalInterest).toBe(3059.41);
  });

  it('on the app’s own payment, which already prices the odd days, pays it down early', () => {
    expect(solvePayment(ODD)).toBe(480.2);
    const loan = scheduleWithOverrides(ODD, { payments: { 1: 536.28 } });
    expect(loan.applied).toEqual({ payments: { 1: 536.28 } });
    expect(loan.finalPayment).toBe(406.5);
    expect(loan.totalInterest).toBe(3031.98);
  });
});

describe('a large payment ends the loan early', () => {
  it('a $10,000 twelfth payment ends it after 49 payments', () => {
    const loan = scheduleWithOverrides(CAR_BANK, { payments: { 12: 10_000 } });
    expect(loan.rows[11]).toMatchObject({
      payment: 10_000,
      interest: 178.6,
      principal: 9821.4,
      balance: 18_216.8,
      overridden: true,
    });
    expect(loan.paymentCount).toBe(49);
    expect(loan.payoffOn).toBe('2030-03-15');
    expect(loan.finalPayment).toBe(499.5);
    expect(loan.totalInterest).toBe(4547.31);
    expect(loan.totalPaid).toBe(36_548.31);
    expect(inCents(loan.rows)).toEqual(reference(CAR_BANK, 554.23, { 12: 10_000 }));
  });

  it('a payment above what is owed is the last one: paid as what is owed, kept as typed', () => {
    const loan = scheduleWithOverrides(CAR_BANK, { payments: { 30: 50_000, 40: 600 } });
    expect(loan.rows[29]).toMatchObject({
      payment: 20_970.8,
      owed: 20_970.8,
      interest: 132.74,
      principal: 20_838.06,
      extra: 0,
      balance: 0,
      overridden: true,
    });
    expect(loan.paymentCount).toBe(30);
    expect(loan.payoffOn).toBe('2028-08-15');
    expect(loan.applied).toEqual({ payments: { 30: 50_000 } });
    // Never reached, so not refused either: reported, and left out of what is saved.
    expect(loan.unused).toEqual([40]);
    expect(loan.problems).toEqual([]);
    expect(loan.totalPaid).toBe(37_043.47);

    // The engine cuts it the same way when handed the raw $50,000.
    const raw = amortise({ ...CAR_BANK, paymentOverrides: { 30: 50_000 } });
    expect(raw.rows).toHaveLength(30);
    expect(raw.rows[29]).toMatchObject({ payment: 20_970.8, principal: 20_838.06, extra: 0 });
  });

  it('keeps paying the loan off there after an earlier payment is lowered', () => {
    const saved = scheduleWithOverrides(CAR_BANK, { payments: { 30: 50_000 } }).applied.payments;
    // Payment three lowered to $300 leaves more owed at payment thirty, which the typed $50,000 covers.
    const later = scheduleWithOverrides(CAR_BANK, { payments: { ...saved, 3: 300 } });
    expect(later.rows[2]).toMatchObject({ payment: 300, interest: 193.18, balance: 31_230.88 });
    expect(later.paymentCount).toBe(30);
    expect(later.rows[29]).toMatchObject({ payment: 21_271.72, balance: 0 });
    // Kept as what was owed instead, the same change would leave a 31st payment of $302.84.
    const cut = scheduleWithOverrides(CAR_BANK, { payments: { 30: 20_970.8, 3: 300 } });
    expect(cut.paymentCount).toBe(31);
    expect(cut.finalPayment).toBe(302.84);
  });

  it('a high monthly payment ends it early too', () => {
    const loan = scheduleWithOverrides(CAR_BANK, { monthlyPayment: 1500 });
    expect(loan.paymentCount).toBe(24);
    expect(loan.payoffOn).toBe('2028-02-15');
    expect(loan.rows[22].balance).toBe(9.72);
    // 9.72 × 7.5% × 31/365 = 0.0619… posts $0.06, and the $1,500 is cut to what is owed.
    expect(loan.rows[23]).toMatchObject({
      payment: 9.78,
      interest: 0.06,
      principal: 9.72,
      extra: 0,
    });
    expect(loan.finalPayment).toBe(9.78);
    expect(loan.totalInterest).toBe(2508.78);
  });
});

describe('a payment below its interest is refused', () => {
  it('refuses one cent under the period’s interest and says what the least is', () => {
    const loan = scheduleWithOverrides(CAR_BANK, { payments: { 1: 243.29 } });
    expect(loan.problems).toEqual([{ payment: 1, reason: 'below-interest', minimum: 243.3 }]);
    // Refused means left out: the regular payment stands.
    expect(loan.rows[0]).toMatchObject({ payment: 554.23, overridden: false });
    expect(loan.applied).toEqual({});
  });

  it('takes exactly the interest, which leaves the balance where it was', () => {
    const loan = scheduleWithOverrides(CAR_BANK, { payments: { 1: 243.3 } });
    expect(loan.problems).toEqual([]);
    expect(loan.rows[0]).toMatchObject({ payment: 243.3, principal: 0, balance: 32_001 });
  });

  it('judges a payment on the balance the changes before it leave', () => {
    // After a $10,000 first payment, payment two's interest is 22,244.30 × 7.5% × 31/365 = 141.69.
    const after = { 1: 10_000 };
    expect(checkOverride(CAR_BANK, { payments: after }, 2, 141.68)).toEqual({
      payment: 2,
      reason: 'below-interest',
      minimum: 141.69,
    });
    expect(checkOverride(CAR_BANK, { payments: after }, 2, 141.69)).toBeNull();
  });

  it('refuses a monthly payment under the costliest month’s interest', () => {
    // A 31-day month on what is borrowed: 32,001 × 7.5% × 31/365 = 203.8420… posts $203.84. The
    // first period is 28 days ($184.12), so the first payment leaves less than was borrowed.
    expect(steadyPayment(CAR)).toBe(203.84);
    expect(checkOverride(CAR, {}, 'monthly', 203.83)).toEqual({
      payment: 'monthly',
      reason: 'below-interest',
      minimum: 203.84,
    });
    expect(checkOverride(CAR, {}, 'monthly', 203.84)).toBeNull();
    const refused = scheduleWithOverrides(CAR, { monthlyPayment: 200 });
    expect(refused.payment).toBe(553.21);
    expect(refused.applied).toEqual({});
  });

  it('counts what a long first period leaves owing, which a month on the loan would miss', () => {
    // The bank's 37 days cost $243.30, so at payment m the first payment leaves 32,244.30 − m, and
    // m must cover a 31-day month on that: at $204.09 it leaves 32,040.21, whose month is 204.0887…
    // → $204.09; at $204.08 it leaves 32,040.22 and the month is still $204.09.
    expect(steadyPayment(CAR_BANK)).toBe(204.09);
    expect(checkOverride(CAR_BANK, {}, 'monthly', 204.08)?.minimum).toBe(204.09);
  });

  it('takes a monthly payment at that floor, keeps every balance under what payment one left, and flags the balloon', () => {
    const loan = scheduleWithOverrides(CAR_BANK, { monthlyPayment: 204.09 });
    expect(loan.problems).toEqual([]);
    expect(loan.rows[0].balance).toBe(32_040.21);
    expect(Math.max(...loan.rows.map((row) => row.balance))).toBe(32_040.21);
    expect(loan.finalPayment).toBe(31_930.87);
    expect(loan.balloon).toBe(true);

    // Payment one's 37 days cost $243.30, more than this regular payment: a change to it may go
    // down to the regular payment, not only to that interest.
    expect(paymentChoice(CAR_BANK, { monthlyPayment: 204.09 }, 1)).toMatchObject({
      interest: 243.3,
      minimum: 204.09,
    });
    expect(checkOverride(CAR_BANK, { monthlyPayment: 204.09 }, 1, 210)).toBeNull();
    expect(checkOverride(CAR_BANK, { monthlyPayment: 204.09 }, 1, 204.08)?.minimum).toBe(204.09);
  });

  it('prices the floor on the loan’s own convention: actual/360 earns 31/360 in a long month', () => {
    // $25,000 at 24.99% over 30 years, actual/360. Rate ÷ 12 ($520.63) would compound to a last
    // payment of $664,264.78; the costliest month is 25,000 × 24.99% × 31/360 = $537.98. Here even
    // the app's own $528.18 is under that (31-day months outrun it), so its own figure is the least.
    const terms = {
      principal: 25_000,
      annualRatePercent: 24.99,
      months: 360,
      firstPaymentOn: new Date(2026, 1, 1),
      basis: 'actual/360' as const,
    };
    expect(amortise({ ...terms, payment: 520.63 }).finalPayment).toBe(664_264.78);
    expect(steadyPayment(terms)).toBe(537.98);
    expect(solvePayment(terms)).toBe(528.18);
    expect(checkOverride(terms, {}, 'monthly', 520.63)).toEqual({
      payment: 'monthly',
      reason: 'below-interest',
      minimum: 528.18,
    });
    // A cent under the app's figure would leave $1,603.42 at the end: refused too.
    expect(amortise({ ...terms, payment: 528.17 }).finalPayment).toBe(1603.42);
    expect(checkOverride(terms, {}, 'monthly', 528.17)?.reason).toBe('below-interest');
    // At the steady payment the balance never passes what was borrowed.
    const steady = scheduleWithOverrides(terms, { monthlyPayment: 537.98 });
    expect(Math.max(...steady.rows.map((row) => row.balance))).toBeLessThanOrEqual(25_000);
    expect(steady.paymentCount).toBe(191);
    // With the regular payment all that keeps it on course, a single payment can only go up, even
    // in February: payment one leaves 25,000 + 537.98 − 528.18 = 25,009.80, whose 28 days cost
    // 25,009.80 × 24.99% × 28/360 = 486.1076… → $486.11, under the regular payment.
    expect(paymentChoice(terms, {}, 2)).toMatchObject({ interest: 486.11, minimum: 528.18 });
    expect(checkOverride(terms, {}, 2, 500)).toEqual({
      payment: 2,
      reason: 'below-interest',
      minimum: 528.18,
    });
    expect(checkOverride(terms, {}, 2, 600)).toBeNull();
    expect(paymentChoice(terms, {}, 5)?.minimum).toBe(528.18);
    expect(checkOverride(terms, {}, 5, 528.17)).toEqual({
      payment: 5,
      reason: 'below-interest',
      minimum: 528.18,
    });
  });

  it('refuses the old floor that ran past 2^53 cents at 100% over 40 years', () => {
    const terms = {
      principal: 25_000,
      annualRatePercent: 100,
      months: 480,
      firstPaymentOn: new Date(2026, 1, 1),
      basis: 'actual/360' as const,
    };
    expect(amortise({ ...terms, payment: 2083.33 }).finalPayment).toBeGreaterThan(
      Number.MAX_SAFE_INTEGER / 100,
    );
    expect(checkOverride(terms, {}, 'monthly', 2083.33)?.minimum).toBe(2108.35);
  });

  it('never refuses the app’s own figure on a loan whose 31-day months outrun it', () => {
    // 15% over 30 years on daily accrual: early 31-day months cost more than the level payment.
    const terms = {
      principal: 300_000,
      annualRatePercent: 15,
      months: 360,
      firstPaymentOn: new Date(2026, 0, 1),
      basis: 'actual/365' as const,
    };
    const solved = solvePayment(terms);
    const loan = amortise(terms);
    expect(loan.rows.some((row) => row.interest > row.payment)).toBe(true);
    expect(checkOverride(terms, {}, 'monthly', solved)).toBeNull();
    expect(checkOverride(terms, {}, 'monthly', solved - 0.01)).toBeNull();
  });

  it('lets a change on such a row go no lower than the regular payment', () => {
    // A 45-day opening at 15% over 30 years: payment one does not cover its own interest.
    const terms = {
      principal: 300_000,
      annualRatePercent: 15,
      months: 360,
      fundedOn: new Date(2025, 10, 17),
      firstPaymentOn: new Date(2026, 0, 1),
      basis: 'actual/365' as const,
    };
    const first = amortise(terms).rows[0];
    expect(first.interest).toBeGreaterThan(first.payment);
    const choice = paymentChoice(terms, {}, 1);
    expect(choice?.minimum).toBe(first.payment);
    expect(checkOverride(terms, {}, 1, first.payment - 0.01)?.reason).toBe('below-interest');
    expect(checkOverride(terms, {}, 1, first.payment + 100)).toBeNull();
  });
});

describe('cents', () => {
  it('refuses anything that is not a positive amount in whole cents', () => {
    expect(checkOverride(CAR, {}, 'monthly', 554.235)?.reason).toBe('not-an-amount');
    expect(checkOverride(CAR, {}, 'monthly', Number.NaN)?.reason).toBe('not-an-amount');
    expect(checkOverride(CAR, {}, 'monthly', Number.POSITIVE_INFINITY)?.reason).toBe(
      'not-an-amount',
    );
    expect(checkOverride(CAR, {}, 'monthly', 0)?.reason).toBe('zero');
    expect(checkOverride(CAR, {}, 3, 0)?.reason).toBe('zero');
    expect(checkOverride(CAR, {}, 3, -50)?.reason).toBe('zero');
    expect(checkOverride(CAR, {}, 3, 600.001)?.reason).toBe('not-an-amount');
  });

  it('reads float noise as the cents it meant, not as a third decimal', () => {
    // 0.1 + 0.2 is 0.30000000000000004, and 554.23 is stored as 554.2299999…
    expect(checkOverride(CAR, {}, 'monthly', 554 + 0.1 + 0.13)).toBeNull();
    const free = { ...CAR, annualRatePercent: 0, principal: 1200, months: 12 };
    const loan = scheduleWithOverrides(free, { payments: { 1: 0.1 + 0.2 } });
    expect(loan.rows[0]).toMatchObject({ payment: 0.3, balance: 1199.7 });
  });

  it('refuses a skipped payment even at 0%, where there is no interest to fall short of', () => {
    const free = { ...CAR, annualRatePercent: 0, principal: 1200, months: 12 };
    expect(checkOverride(free, {}, 4, 0)?.reason).toBe('zero');
    expect(paymentChoice(free, {}, 4)?.minimum).toBe(0.01);
    expect(checkOverride(free, {}, 4, 0.01)).toBeNull();
  });

  it('a change one cent short of what is owed leaves a last payment of one cent', () => {
    const owed = paymentChoice(CAR_BANK, {}, 30)?.owed;
    expect(owed).toBe(20_970.8);
    const loan = scheduleWithOverrides(CAR_BANK, { payments: { 30: 20_970.79 } });
    expect(loan.rows[29].balance).toBe(0.01);
    // A cent at 7.5% for 31 days earns 0.0000637¢, which posts as nothing.
    expect(loan.rows[30]).toMatchObject({ interest: 0, payment: 0.01, balance: 0 });
    expect(loan.paymentCount).toBe(31);
    expect(loan.finalPayment).toBe(0.01);
  });

  it('posts a half cent of interest up, not to even, after a change', () => {
    // $1,200 at 6% on monthly rests. Payment one of $205.00 leaves $1,001.00, whose month at 0.5%
    // is $5.005: half up posts $5.01 where banker's rounding would post $5.00.
    const loan = scheduleWithOverrides(
      {
        principal: 1200,
        annualRatePercent: 6,
        months: 12,
        fundedOn: new Date(2026, 0, 1),
        firstPaymentOn: new Date(2026, 1, 1),
        basis: 'monthly',
      },
      { payments: { 1: 205 } },
    );
    expect(loan.rows[0]).toMatchObject({ interest: 6, balance: 1001 });
    expect(loan.rows[1]).toMatchObject({ interest: 5.01, payment: 103.28, balance: 902.73 });
    expect(loan.paymentCount).toBe(11);
    expect(loan.finalPayment).toBe(99.1);
    expect(loan.totalInterest).toBe(33.62);
  });

  it('drops a change that changes nothing, so the row does not read as changed', () => {
    const same = scheduleWithOverrides(CAR_BANK, { payments: { 5: 554.23 } });
    expect(same.applied).toEqual({});
    expect(same.rows[4].overridden).toBe(false);
    expect(same.problems).toEqual([]);
    expect(same.unused).toEqual([]);

    // On the payment that already pays the loan off, any amount at or above what is owed is the same.
    const payoff = scheduleWithOverrides(CAR_BANK, { monthlyPayment: 1500, payments: { 24: 100 } });
    expect(payoff.applied).toEqual({ monthlyPayment: 1500 });
    expect(payoff.rows[23]).toMatchObject({ payment: 9.78, overridden: false });
  });

  it('never lets the last payment of the term be set, and knows which numbers do not exist', () => {
    const loan = scheduleWithOverrides(CAR, {
      payments: { 72: 100, 0: 100, 1.5: 100, [-3]: 100, 100: 100 },
    });
    expect(loan.problems).toEqual([
      { payment: -3, reason: 'no-such-payment' },
      { payment: 0, reason: 'no-such-payment' },
      { payment: 1.5, reason: 'no-such-payment' },
      { payment: 72, reason: 'last-payment' },
    ]);
    expect(loan.unused).toEqual([100]);
    expect(paymentChoice(CAR, {}, 72)?.locked).toBe(true);
  });
});

describe('with overpayments and lump sums', () => {
  const WITH_EXTRA = { ...CAR_BANK, extra: { monthly: 100 } };

  it('rides the extra on top of a changed payment, and comparePrepayment follows both', () => {
    const { terms, problems } = applyOverrides(WITH_EXTRA, { payments: { 1: 1054.23 } });
    expect(problems).toEqual([]);
    const comparison = comparePrepayment(terms);

    // The contract side keeps the change and drops the what-if extra.
    expect(comparison.base.rows[0]).toMatchObject({
      payment: 1054.23,
      extra: 0,
      balance: 31_190.07,
    });
    expect(comparison.accelerated.rows[0]).toMatchObject({
      payment: 1154.23,
      extra: 100,
      balance: 31_090.07,
    });
    expect(comparison.base.rows).toHaveLength(71);
    expect(comparison.base.totalInterest).toBe(7626.26);
    expect(comparison.accelerated.rows).toHaveLength(58);
    expect(comparison.accelerated.totalInterest).toBe(6172.46);
    expect(comparison.interestSaved).toBe(1453.8);
    expect(comparison.monthsSaved).toBe(13);

    // One call gives both sides, as the calculator needs them.
    const loan = scheduleWithOverrides(WITH_EXTRA, { payments: { 1: 1054.23 } });
    expect(loan.rows).toEqual(comparison.accelerated.rows);
    expect(loan.contract.rows).toEqual(comparison.base.rows);
    expect(loan.contract.totalInterest - loan.totalInterest).toBeCloseTo(1453.8, 2);
  });

  it('judges a change on the contract, never on a what-if that is not saved', () => {
    // A $20,000 lump sum the day after funding would cut payment one's interest to $95.35, but the
    // saved loan has no lump sum, so $200 is still under its $243.30 and refused.
    const lumpy = {
      ...CAR_BANK,
      extra: { lumpSums: [{ on: new Date(2026, 1, 7), amount: 20_000 }] },
    };
    const loan = scheduleWithOverrides(lumpy, { payments: { 1: 200 } });
    expect(loan.rows[0].interest).toBe(95.35);
    expect(loan.problems).toEqual([{ payment: 1, reason: 'below-interest', minimum: 243.3 }]);
  });
});

describe('the page for one payment', () => {
  it('has the payment now, unchanged, the least it may be, and the payoff that day', () => {
    expect(paymentChoice(CAR_BANK, {}, 30)).toEqual({
      number: 30,
      date: '2028-08-15',
      current: 554.23,
      typed: null,
      regular: 554.23,
      minimum: 132.74,
      owed: 20_970.8,
      interest: 132.74,
      overridden: false,
      locked: false,
    });
    expect(paymentChoice(CAR_BANK, { payments: { 30: 1000 } }, 30)).toMatchObject({
      current: 1000,
      regular: 554.23,
      overridden: true,
    });
  });

  it('on the payment that pays the loan off, regular is what is owed, not the level payment', () => {
    // At $1,500 a month the loan ends on payment 24 with $9.78 owed.
    expect(paymentChoice(CAR_BANK, { monthlyPayment: 1500 }, 24)).toMatchObject({
      current: 9.78,
      regular: 9.78,
      owed: 9.78,
      locked: false,
    });
    // The term's last payment is locked, and is whatever is left.
    expect(paymentChoice(CAR_BANK, {}, 72)).toMatchObject({
      current: 554.29,
      regular: 554.29,
      owed: 554.29,
      locked: true,
    });
  });

  it('opens on what was typed when a change pays the loan off', () => {
    expect(paymentChoice(CAR_BANK, { payments: { 30: 50_000 } }, 30)).toMatchObject({
      current: 20_970.8,
      typed: 50_000,
      owed: 20_970.8,
      overridden: true,
    });
  });

  it('is gone once the loan is paid off before it', () => {
    expect(paymentChoice(CAR_BANK, { payments: { 30: 50_000 } }, 31)).toBeNull();
  });
});

describe('saved with the loan', () => {
  it('reads back from the database to the very same schedule', () => {
    const shown = scheduleWithOverrides(CAR, {
      monthlyPayment: 554.23,
      payments: { 1: 612.4, 14: 1000 },
    });
    const json = paymentOverridesJson(shown.applied.payments);
    expect(json).toEqual({ 1: 612.4, 14: 1000 });

    // What the save sends, and what comes back through jsonb and supabase-js.
    const stored = termsFromStored({
      principal: CAR.principal,
      annual_rate: CAR.annualRatePercent,
      term_months: CAR.months,
      monthly_payment: shown.payment,
      first_payment_on: '2026-03-15',
      funded_on: '2026-02-15',
      day_count_basis: 'actual/365',
      statement_on: null,
      statement_principal: null,
      payment_overrides: JSON.parse(JSON.stringify(json)),
    }) as LoanTerms;

    const saved = amortise(stored);
    expect(saved.rows).toEqual(shown.rows);
    expect(saved.totalInterest).toBe(shown.totalInterest);
    expect(saved.payoffOn).toBe(shown.payoffOn);
    // The monthly payment lives in monthly_payment, so only the single changes come back as changes.
    expect(scheduleWithOverrides(stored).applied).toEqual({ payments: shown.applied.payments });
  });

  it('saves nothing when nothing was changed, and reads nothing back as no change', () => {
    expect(paymentOverridesJson(undefined)).toBeNull();
    expect(paymentOverridesJson({})).toBeNull();
    expect(readPaymentOverrides(null)).toBeUndefined();
    expect(readPaymentOverrides(undefined)).toBeUndefined();
  });

  it('reads a route param the same way as the jsonb', () => {
    expect(readPaymentOverrides('{"1":612.4,"14":1000}')).toEqual({ 1: 612.4, 14: 1000 });
  });

  it('leaves out anything malformed rather than guessing', () => {
    expect(
      readPaymentOverrides({
        1: '612.40',
        2: 0,
        3: -5,
        4: 600.001,
        0: 100,
        '1.5': 100,
        '-2': 100,
        abc: 100,
        5: 500,
      }),
    ).toEqual({ 5: 500 });
    expect(readPaymentOverrides('not json')).toBeUndefined();
    expect(readPaymentOverrides([500])).toBeUndefined();
    expect(readPaymentOverrides(42)).toBeUndefined();
  });
});

/**
 * The jsonb check in 20261009100007_loan_overrides.sql, written again here so every change the app
 * would save is shown to pass it: keys are payment numbers below the term, amounts positive whole
 * cents no larger than the numeric(14,2) columns hold.
 */
function databaseAccepts(json: Record<string, unknown> | null, termMonths: number): boolean {
  if (json === null) return true;
  return Object.entries(json).every(
    ([key, amount]) =>
      /^[1-9][0-9]{0,4}$/.test(key) &&
      Number(key) < termMonths &&
      typeof amount === 'number' &&
      amount > 0 &&
      amount <= 999_999_999_999.99 &&
      /^\d+(\.\d{1,2})?$/.test(JSON.stringify(amount)),
  );
}

/** A deterministic pseudo-random sweep (Numerical Recipes LCG), seeded so failures reproduce. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('every schedule with changes, whatever the inputs', () => {
  const random = seededRandom(20261009);
  const bases = ['actual/365', 'actual/360', '30/360', 'monthly'] as const;

  const cases = Array.from({ length: 200 }, () => {
    const firstPaymentOn = new Date(2026, Math.floor(random() * 12), 1 + Math.floor(random() * 28));
    const fundedOn = new Date(firstPaymentOn);
    fundedOn.setDate(firstPaymentOn.getDate() - (20 + Math.floor(random() * 40)));
    const principal = Math.round((500 + random() * 2_999_500) * 100) / 100;
    const months = 6 + Math.floor(random() * 355);
    const terms: LoanTerms = {
      principal,
      annualRatePercent: Math.round(random() * (random() < 0.3 ? 90_000 : 30_000)) / 1000,
      months,
      firstPaymentOn,
      fundedOn,
      basis: bases[Math.floor(random() * bases.length)],
    };
    const solved = solvePayment(terms);
    const payments: Record<number, number> = {};
    for (let count = Math.floor(random() * 5); count > 0; count -= 1) {
      const number = 1 + Math.floor(random() * months);
      // From well under the interest to several payments' worth, in whole cents.
      payments[number] = Math.round(solved * random() * 4 * 100) / 100;
    }
    const monthlyPayment =
      random() < 0.5 ? Math.round(solved * (0.9 + random() * 0.3) * 100) / 100 : undefined;
    return { terms, overrides: { monthlyPayment, payments } };
  });

  const results = cases.map(({ terms, overrides }) => ({
    terms,
    overrides,
    loan: scheduleWithOverrides(terms, overrides),
  }));

  it('agrees with the exact-integer amortiser on every row of every loan', () => {
    const broken = results.filter(
      ({ terms, loan }) =>
        JSON.stringify(inCents(loan.rows)) !==
        JSON.stringify(reference(terms, loan.payment, loan.applied.payments)),
    );
    expect(broken.map(({ terms }) => terms)).toEqual([]);
  });

  it('repays exactly the sum borrowed and closes at zero', () => {
    const broken = results.filter(({ terms, loan }) => {
      const repaid = loan.rows.reduce((sum, row) => sum + Math.round(row.principal * 100), 0);
      return repaid !== Math.round(terms.principal * 100) || loan.rows.at(-1)?.balance !== 0;
    });
    expect(broken).toEqual([]);
  });

  it('splits every payment into interest and principal with nothing left over', () => {
    const broken = results.filter(({ loan }) =>
      loan.rows.some(
        (row) =>
          Math.round(row.interest * 100) + Math.round(row.principal * 100) !==
          Math.round(row.payment * 100),
      ),
    );
    expect(broken).toEqual([]);
  });

  it('never lets a change grow the balance where the regular payment would not', () => {
    const broken = results.filter(({ loan }) =>
      loan.rows.some(
        (row) =>
          row.overridden &&
          Math.round(row.payment * 100) <
            Math.min(Math.round(row.interest * 100), Math.round(loan.payment * 100)),
      ),
    );
    expect(broken).toEqual([]);
  });

  it('never runs past the term and accounts for every change asked for', () => {
    const broken = results.filter(({ terms, overrides, loan }) => {
      const asked = Object.keys(overrides.payments).map(Number);
      const accounted = new Set([
        ...Object.keys(loan.applied.payments ?? {}).map(Number),
        ...loan.problems.map((problem) => problem.payment),
        ...loan.unused,
      ]);
      const noOps = asked.filter((number) => !accounted.has(number));
      // A change left out of all three must be one that changes nothing.
      const harmless = noOps.every((number) => {
        const row = loan.rows[number - 1];
        return (
          row &&
          Math.round(row.payment * 100) ===
            Math.min(Math.round(loan.payment * 100), Math.round(row.owed * 100))
        );
      });
      return loan.rows.length > terms.months || !harmless;
    });
    expect(broken).toEqual([]);
  });

  it('checks on the very schedule it saves, so no second run can disagree', () => {
    const broken = results.filter(({ terms, overrides, loan }) => {
      const { terms: applied, contract } = applyOverrides(terms, overrides);
      return (
        JSON.stringify(contract.rows) !== JSON.stringify(amortise(applied).rows) ||
        JSON.stringify(loan.contract.rows) !== JSON.stringify(loan.rows)
      );
    });
    expect(broken.map(({ terms }) => terms)).toEqual([]);
  });

  it('is stable: what it saves, read back, is the same schedule with nothing refused', () => {
    const broken = results.filter(({ terms, loan }) => {
      const json = paymentOverridesJson(loan.applied.payments);
      const again = scheduleWithOverrides(
        { ...terms, payment: loan.payment },
        { payments: readPaymentOverrides(JSON.parse(JSON.stringify(json))) ?? {} },
      );
      return (
        again.problems.length > 0 ||
        JSON.stringify(again.rows) !== JSON.stringify(loan.rows) ||
        !databaseAccepts(json, terms.months)
      );
    });
    expect(broken.map(({ terms }) => terms)).toEqual([]);
  });
});

/**
 * No figure the rules allow can run away. Adversarial inputs: rates to 100%, terms to 480 months,
 * openings to 75 days, every convention, principals to $10 billion, and typed payments placed on,
 * just around, and well away from the floors.
 */
describe('nothing allowed runs away', () => {
  const random = seededRandom(253);
  const bases = ['actual/365', 'actual/360', '30/360', 'monthly'] as const;

  const results = Array.from({ length: 300 }, () => {
    const firstPaymentOn = new Date(2026, Math.floor(random() * 12), 1 + Math.floor(random() * 31));
    const fundedOn = new Date(firstPaymentOn);
    fundedOn.setDate(firstPaymentOn.getDate() - Math.floor(random() * 76));
    const terms: LoanTerms = {
      principal: Math.round((100 + random() * (random() < 0.3 ? 1e10 : 1e6)) * 100) / 100,
      annualRatePercent: Math.round(random() * 100_000) / 1000,
      months: 1 + Math.floor(random() * 480),
      firstPaymentOn,
      fundedOn,
      basis: bases[Math.floor(random() * bases.length)],
    };
    const solved = solvePayment(terms);
    const steady = steadyPayment(terms);
    const anchor = [solved, steady, Math.min(solved, steady)][Math.floor(random() * 3)];
    const nudge = random() < 0.5 ? 1 + (random() - 0.5) * 0.002 : 0.5 + random();
    const monthlyPayment = Math.max(0.01, Math.round(anchor * nudge * 100) / 100);
    const payments: Record<number, number> = {};
    for (let count = Math.floor(random() * 6); count > 0; count -= 1) {
      const amount = Math.round(monthlyPayment * random() * 3 * 100) / 100;
      payments[1 + Math.floor(random() * terms.months)] = Math.max(0.01, amount);
    }
    return { terms, steady, loan: scheduleWithOverrides(terms, { monthlyPayment, payments }) };
  });

  const cents = (value: number) => Math.round(value * 100);

  it('keeps every figure a whole number of cents JavaScript holds exactly', () => {
    const broken = results.filter(({ loan }) =>
      loan.rows.some((row) =>
        [row.balance, row.payment, row.interest, row.principal, row.owed].some(
          (value) => !Number.isSafeInteger(cents(value)),
        ),
      ),
    );
    expect(broken.map(({ terms }) => terms)).toEqual([]);
  });

  it('ends no loan above what was borrowed, its opening interest and two payments', () => {
    const broken = results.filter(({ terms, loan }) => {
      const bound = cents(terms.principal) + cents(loan.rows[0].interest) + 2 * cents(loan.payment);
      return cents(loan.finalPayment) > bound;
    });
    expect(broken.map(({ terms }) => terms)).toEqual([]);
  });

  it('at or above the steady payment, never lets a balance pass what the first payment left', () => {
    const broken = results.filter(({ terms, steady, loan }) => {
      if (cents(loan.payment) < cents(steady)) return false;
      const ceiling = Math.max(cents(terms.principal), cents(loan.rows[0].balance));
      return loan.rows.slice(1).some((row) => cents(row.balance) > ceiling);
    });
    expect(broken.map(({ terms }) => terms)).toEqual([]);
  });
});
