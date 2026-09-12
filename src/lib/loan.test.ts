import {
  accruedInterest,
  addMonths,
  amortisationSchedule,
  amortise,
  calculateLoan,
  comparePrepayment,
  daysBetween,
  formatTerm,
  interestFraction,
  monthsAndDaysBetween,
  paymentDates,
  payoffDate,
  payoffQuote,
  scheduleByYear,
  solvePayment,
  termsFromStored,
  type LoanTerms,
} from '@/lib/loan';

const START = new Date(2026, 7, 27); // 27 Aug 2026

describe('calculateLoan', () => {
  it('matches the standard amortisation formula', () => {
    // $25,000 at 7.5% over 5 years — the example on the calculator screen.
    const loan = calculateLoan(25_000, 7.5, 60);
    expect(loan.monthlyPayment).toBeCloseTo(500.95, 2);
    expect(loan.totalInterest).toBeCloseTo(5056.92, 2);
  });

  it('divides evenly at 0% rather than dividing by zero', () => {
    const loan = calculateLoan(1200, 0, 12);
    expect(loan.monthlyPayment).toBe(100);
    expect(loan.totalInterest).toBe(0);
  });

  it('returns zeroes for a loan that does not exist', () => {
    expect(calculateLoan(0, 5, 12).monthlyPayment).toBe(0);
    expect(calculateLoan(1000, 5, 0).monthlyPayment).toBe(0);
  });
});

describe('amortisationSchedule', () => {
  const rows = amortisationSchedule(25_000, 7.5, 60, START);

  it('produces one row per payment', () => {
    expect(rows).toHaveLength(60);
    expect(rows[0].number).toBe(1);
    expect(rows[59].number).toBe(60);
  });

  it('clears the balance exactly on the last payment', () => {
    // The whole point of squaring off the final row rather than recomputing it.
    expect(rows[59].balance).toBe(0);
  });

  it('starts mostly interest and ends almost none', () => {
    // This shift is the story the schedule exists to tell.
    expect(rows[0].interest).toBeGreaterThan(rows[0].principal * 0.4);
    expect(rows[59].interest).toBeLessThan(rows[59].principal * 0.02);
  });

  it('never lets the balance go negative', () => {
    expect(rows.every((row) => row.balance >= 0)).toBe(true);
  });

  it('falls monotonically to zero', () => {
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index].balance).toBeLessThanOrEqual(rows[index - 1].balance);
    }
  });

  it('interest plus principal equals the payment on every row', () => {
    for (const row of rows) {
      expect(row.interest + row.principal).toBeCloseTo(row.payment, 2);
    }
  });

  it('total principal repaid equals what was borrowed', () => {
    const repaid = rows.reduce((sum, row) => sum + row.principal, 0);
    expect(repaid).toBeCloseTo(25_000, 1);
  });

  it('total interest agrees with the summary figure', () => {
    const interest = rows.reduce((sum, row) => sum + row.interest, 0);
    expect(interest).toBeCloseTo(calculateLoan(25_000, 7.5, 60).totalInterest, 0);
  });

  it('walks the payment date forward a month at a time', () => {
    expect(rows[0].date).toBe('2026-08-27');
    expect(rows[1].date).toBe('2026-09-27');
    expect(rows[12].date).toBe('2027-08-27');
  });

  it('keeps a 31st payment inside short months', () => {
    const short = amortisationSchedule(1200, 0, 4, new Date(2026, 0, 31));
    expect(short.map((row) => row.date)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('charges no interest at 0%', () => {
    const free = amortisationSchedule(1200, 0, 12, START);
    expect(free.every((row) => row.interest === 0)).toBe(true);
    expect(free[11].balance).toBe(0);
  });

  it('returns nothing for a loan that does not exist', () => {
    expect(amortisationSchedule(0, 5, 12, START)).toEqual([]);
  });
});

describe('scheduleByYear', () => {
  it('groups payments and totals each year', () => {
    const years = scheduleByYear(amortisationSchedule(25_000, 7.5, 60, START));
    expect(years.map((entry) => entry.year)).toEqual([
      '2026',
      '2027',
      '2028',
      '2029',
      '2030',
      '2031',
    ]);
    // Aug to Dec 2026 is five payments.
    expect(years[0].payments).toHaveLength(5);
    expect(years[0].interest).toBeGreaterThan(0);
  });
});

describe('daysBetween', () => {
  it('counts real days by default', () => {
    // The 45-day gap between funding and a first payment, which is where a
    // naive schedule loses its first hundred dollars.
    expect(daysBetween(new Date(2025, 10, 30), new Date(2026, 0, 14))).toBe(45);
    expect(daysBetween(new Date(2026, 1, 14), new Date(2026, 2, 14))).toBe(28);
    expect(daysBetween(new Date(2026, 2, 14), new Date(2026, 3, 14))).toBe(31);
  });

  it('survives a daylight-saving boundary', () => {
    // US clocks go forward on 8 Mar 2026; a naive millisecond division reads
    // this month as 30.958 days and rounds the interest down.
    expect(daysBetween(new Date(2026, 1, 14), new Date(2026, 2, 14))).toBe(28);
    expect(daysBetween(new Date(2026, 2, 1), new Date(2026, 3, 1))).toBe(31);
  });

  it('makes every month 30 days on the 30/360 basis', () => {
    expect(daysBetween(new Date(2026, 1, 14), new Date(2026, 2, 14), '30/360')).toBe(30);
    expect(daysBetween(new Date(2026, 0, 31), new Date(2026, 1, 28), '30/360')).toBe(28);
    expect(daysBetween(new Date(2026, 0, 1), new Date(2027, 0, 1), '30/360')).toBe(360);
  });
});

describe('accruedInterest', () => {
  it('charges by the day, not by the twelfth', () => {
    // $28,698.15 at 8.14% for 14 days, to the cent.
    expect(accruedInterest(28_698.15, 8.14, 14)).toBe(89.6);
  });

  it('reproduces APR ÷ 12 exactly on the 30/360 basis', () => {
    expect(accruedInterest(30_000, 8.14, 30, '30/360')).toBeCloseTo((30_000 * 0.0814) / 12, 2);
  });

  it('charges nothing for no time, no balance or no rate', () => {
    expect(accruedInterest(10_000, 8.14, 0)).toBe(0);
    expect(accruedInterest(0, 8.14, 30)).toBe(0);
    expect(accruedInterest(10_000, 0, 30)).toBe(0);
  });
});

describe('paymentDates', () => {
  it('holds the day of month through short months', () => {
    const dates = paymentDates(new Date(2026, 0, 31), 4).map((date) => date.getDate());
    expect(dates).toEqual([31, 28, 31, 30]);
  });

  it('returns to the anchor day after a short month rather than sticking', () => {
    // The bug in walking a date forward one month at a time: February drags
    // every later payment to the 28th and never lets go.
    const dates = paymentDates(new Date(2026, 0, 31), 14).map((date) => date.getDate());
    expect(dates[13]).toBe(28); // Feb 2027
    expect(dates[2]).toBe(31); // Mar 2026 — back to the 31st
  });
});

describe('payoffDate', () => {
  it('is the last date paymentDates would produce', () => {
    const start = new Date(2026, 0, 31);
    expect(payoffDate(start, 4)).toEqual(paymentDates(start, 4)[3]);
  });

  it('holds the anchor day through a short month', () => {
    // 31 Jan → 28 Feb → 31 Mar: three payments end on the 31st, not dragged
    // down to the 28th by February the way a naive month-walk would.
    expect(payoffDate(new Date(2026, 0, 31), 3).getDate()).toBe(31);
  });

  it('falls back to the start date when there is nothing to repay', () => {
    const start = new Date(2026, 0, 31);
    expect(payoffDate(start, 0)).toEqual(start);
  });
});

describe('formatTerm', () => {
  it('is months alone under a year', () => {
    expect(formatTerm(0)).toBe('0 mo');
    expect(formatTerm(7)).toBe('7 mo');
    expect(formatTerm(11)).toBe('11 mo');
  });

  it('is years alone on an exact multiple of twelve', () => {
    expect(formatTerm(12)).toBe('1 yr');
    expect(formatTerm(24)).toBe('2 yrs');
  });

  it('pluralises "yr" only past one year', () => {
    expect(formatTerm(19)).not.toContain('yrs'); // 1 yr 7 mo — singular
    expect(formatTerm(30)).toContain('yrs'); // 2 yrs 6 mo — plural
  });

  it('combines years and months once both are non-zero', () => {
    expect(formatTerm(19)).toBe('1 yr 7 mo');
    expect(formatTerm(30)).toBe('2 yrs 6 mo');
  });
});

/**
 * A real installment loan, read off the lender's own statement.
 *
 * $31,394.33 at 8.14% over 72 months, funded 30 Nov 2025, first payment
 * 14 Jan 2026. Every expectation here is a figure the bank displays, so if the
 * engine drifts from how lenders actually charge interest, these fail.
 */
describe('a real lender statement', () => {
  const TERMS = {
    principal: 31_394.33,
    annualRatePercent: 8.14,
    months: 72,
    fundedOn: new Date(2025, 10, 30),
    firstPaymentOn: new Date(2026, 0, 14),
    basis: 'actual/365' as const,
    payment: 554.34,
    statement: { on: new Date(2026, 7, 14), principal: 28_698.15 },
  };

  const AS_OF = new Date(2026, 7, 28);

  it('quotes the payoff the lender quotes', () => {
    expect(payoffQuote(TERMS, AS_OF).payoff).toBe(28_787.75);
  });

  it('accrues the interest the lender has accrued this period', () => {
    const quote = payoffQuote(TERMS, AS_OF);
    expect(quote.accruedInterest).toBe(89.6);
    expect(quote.daysAccrued).toBe(14);
  });

  it('separates principal owed from the payoff figure', () => {
    // The payoff is higher than the balance because interest has been running
    // since the last payment. Conflating the two is the classic off-by-$90.
    const quote = payoffQuote(TERMS, AS_OF);
    expect(quote.principal).toBe(28_698.15);
    expect(quote.payoff).toBeGreaterThan(quote.principal);
  });

  it('knows the next payment and its amount', () => {
    const quote = payoffQuote(TERMS, AS_OF);
    expect(quote.nextPaymentOn?.getTime()).toBe(new Date(2026, 8, 14).getTime());
    expect(quote.nextPaymentAmount).toBe(554.34);
  });

  it('charges nothing in the year before the first payment', () => {
    expect(payoffQuote(TERMS, AS_OF).interestPaidLastYear).toBe(0);
  });

  it('matures on the lender’s maturity date', () => {
    const rows = amortise(TERMS).rows;
    expect(rows).toHaveLength(72);
    expect(rows[71].date).toBe('2031-12-14');
    expect(rows[71].balance).toBe(0);
  });

  it('charges 45 days on the opening period, not 30', () => {
    const first = amortise(TERMS).rows[0];
    expect(first.days).toBe(45);
    expect(first.interest).toBe(315.06);
  });

  it('varies the interest by the length of the period', () => {
    const rows = amortise(TERMS).rows;
    const february = rows[2]; // 14 Feb → 14 Mar, 28 days
    const march = rows[3]; // 14 Mar → 14 Apr, 31 days

    expect(february.days).toBe(28);
    expect(march.days).toBe(31);
    // The whole reason two consecutive statements disagree.
    expect(march.interest - february.interest).toBeCloseTo(18.11, 2);
  });

  it('marks reconstructed history as estimated and the rest as exact', () => {
    const rows = amortise(TERMS).rows;
    expect(rows.filter((row) => row.estimated)).toHaveLength(8);
    expect(rows[7].estimated).toBe(true);
    expect(rows[8].estimated).toBe(false);
  });

  it('costs $126.86 more than the flat APR ÷ 12 model claimed', () => {
    // The gap this whole engine exists to close.
    const flat = calculateLoan(31_394.33, 8.14, 72);
    expect(flat.monthlyPayment).toBe(552.59);
    expect(
      amortise({ ...TERMS, statement: undefined }).totalInterest - flat.totalInterest,
    ).toBeCloseTo(126.86, 2);
  });
});

describe('amortise', () => {
  const BASE = {
    principal: 25_000,
    annualRatePercent: 7.5,
    months: 60,
    firstPaymentOn: new Date(2026, 7, 27),
  };

  it('clears the balance to exactly zero', () => {
    expect(amortise(BASE).rows[59].balance).toBe(0);
  });

  it('never lets the balance go negative or rise', () => {
    const rows = amortise(BASE).rows;
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index].balance).toBeGreaterThanOrEqual(0);
      expect(rows[index].balance).toBeLessThanOrEqual(rows[index - 1].balance);
    }
  });

  it('adds up: principal repaid equals the sum borrowed, to the cent', () => {
    // Integer cents rather than floats, so this is exact and not merely close.
    const rows = amortise(BASE).rows;
    const repaid = rows.reduce((sum, row) => sum + Math.round(row.principal * 100), 0);
    expect(repaid).toBe(2_500_000);
  });

  it('splits every payment into interest and principal with nothing left over', () => {
    for (const row of amortise(BASE).rows) {
      expect(Math.round(row.interest * 100) + Math.round(row.principal * 100)).toBe(
        Math.round(row.payment * 100),
      );
    }
  });

  it('assumes one month of interest when no funding date is known', () => {
    expect(amortise(BASE).rows[0].days).toBe(31); // 27 Jul → 27 Aug
  });

  it('costs more on actual/360 than actual/365, and 30/360 sits between', () => {
    // Same rate, same term: the convention alone moves the total.
    const of365 = amortise({ ...BASE, basis: 'actual/365' }).totalInterest;
    const of360 = amortise({ ...BASE, basis: 'actual/360' }).totalInterest;
    const thirty = amortise({ ...BASE, basis: '30/360' }).totalInterest;

    expect(of360).toBeGreaterThan(of365);
    expect(thirty).toBeLessThan(of360);
  });

  it('handles a 0% loan without dividing by zero', () => {
    const zero = amortise({ ...BASE, annualRatePercent: 0, principal: 1200, months: 12 });
    expect(zero.rows.every((row) => row.interest === 0)).toBe(true);
    expect(zero.rows[11].balance).toBe(0);
    expect(zero.payment).toBe(100);
  });

  it('returns nothing for a loan that does not exist', () => {
    expect(amortise({ ...BASE, principal: 0 }).rows).toEqual([]);
    expect(amortise({ ...BASE, months: 0 }).rows).toEqual([]);
  });
});

describe('solvePayment', () => {
  it('lands within a cent of the annuity formula when every period is equal', () => {
    // 30/360 is the assumption the closed form makes, so the two must agree.
    const solved = solvePayment({
      principal: 25_000,
      annualRatePercent: 7.5,
      months: 60,
      firstPaymentOn: new Date(2026, 7, 27),
      basis: '30/360',
    });
    expect(solved).toBeCloseTo(calculateLoan(25_000, 7.5, 60).monthlyPayment, 1);
  });

  it('charges more when the opening period is long', () => {
    // 45 days of interest before the first payment has to go somewhere.
    const odd = solvePayment({
      principal: 31_394.33,
      annualRatePercent: 8.14,
      months: 72,
      fundedOn: new Date(2025, 10, 30),
      firstPaymentOn: new Date(2026, 0, 14),
    });

    // $554.3518 exactly. The lender on this note contracted for $554.34 — a
    // cent under, by whatever their house rounding is. That one cent is the
    // entire reason `payment` is an input: derive it and every later balance
    // inherits the difference, so a known payment always beats a solved one.
    expect(odd).toBeCloseTo(554.35, 2);
    expect(odd).toBeGreaterThan(calculateLoan(31_394.33, 8.14, 72).monthlyPayment);
  });

  it('leaves a final payment close to all the others', () => {
    // A solve that is off drops the whole error on the last row.
    const loan = amortise({
      principal: 31_394.33,
      annualRatePercent: 8.14,
      months: 72,
      fundedOn: new Date(2025, 10, 30),
      firstPaymentOn: new Date(2026, 0, 14),
    });
    expect(Math.abs(loan.finalPayment - loan.payment)).toBeLessThan(1);
  });
});

// --- Monthly rests ----------------------------------------------------------

/**
 * An independent amortiser, written from the textbook recursion rather than
 * from the engine, in whole cents with nothing clever in it.
 *
 * It exists so the fixtures below are checked against something other than the
 * code they are testing: if `runSchedule`'s ordering, rounding or capping is
 * wrong, these two disagree row for row.
 *
 *     interestₙ = round(balanceₙ₋₁ × rate ÷ 12)
 *     principalₙ = payment − interestₙ
 *     balanceₙ = balanceₙ₋₁ − principalₙ
 */
function referenceMonthlyRests(
  principal: number,
  annualRatePercent: number,
  months: number,
  payment: number,
  extra = 0,
) {
  const rows: { interest: number; principal: number; balance: number }[] = [];
  const paymentCents = Math.round(payment * 100);
  const extraCents = Math.round(extra * 100);
  let balance = Math.round(principal * 100);

  for (let number = 1; number <= months && balance > 0; number += 1) {
    const interest = Math.round((balance * (annualRatePercent / 100)) / 12);
    // The final scheduled payment settles whatever is left, which is where
    // 360 roundings of a half cent end up.
    const scheduled = number === months ? balance : Math.min(paymentCents - interest, balance);
    balance -= scheduled;
    const over = Math.min(extraCents, balance);
    balance -= over;
    rows.push({ interest, principal: scheduled + over, balance });
  }

  return rows;
}

/**
 * Fixture 1 — $200,000 at 6.000% for 30 years, monthly rests.
 *
 * The example every US mortgage primer prints, and the one to check a
 * calculator against because all three opening figures are round enough to do
 * in your head: 6% ÷ 12 is 0.5% a month, 0.5% of $200,000 is exactly $1,000 of
 * interest, so the first payment of $1,199.10 puts $199.10 against the balance
 * and leaves $199,800.90.
 *
 * Source for the payment: the standard annuity formula, which is also what
 * `calculateLoan` implements —
 *     M = P · i(1+i)ⁿ / ((1+i)ⁿ − 1)
 *       = 200000 × 0.005 × 1.005³⁶⁰ / (1.005³⁶⁰ − 1) = 1199.10105…
 * Every row after the first is checked against `referenceMonthlyRests` above.
 */
describe('fixture: $200,000 at 6% over 30 years (standard annuity formula, monthly rests)', () => {
  const TERMS = {
    principal: 200_000,
    annualRatePercent: 6,
    months: 360,
    fundedOn: new Date(2025, 11, 1),
    firstPaymentOn: new Date(2026, 0, 1),
    basis: 'monthly' as const,
  };

  const loan = amortise(TERMS);

  it('solves the published payment to the cent', () => {
    expect(loan.payment).toBe(1199.1);
    expect(solvePayment(TERMS)).toBe(1199.1);
    // Monthly rests over whole months ARE the flat formula, so the two agree.
    expect(loan.payment).toBe(calculateLoan(200_000, 6, 360).monthlyPayment);
  });

  it('splits the first two payments the way the published table does', () => {
    expect(loan.rows[0].interest).toBe(1000);
    expect(loan.rows[0].principal).toBe(199.1);
    expect(loan.rows[0].balance).toBe(199_800.9);

    // $199,800.90 × 0.5% = $999.0045, which posts as $999.00.
    expect(loan.rows[1].interest).toBe(999);
    expect(loan.rows[1].principal).toBe(200.1);
    expect(loan.rows[1].balance).toBe(199_600.8);
  });

  it('agrees with an independent amortiser on all 360 rows', () => {
    const reference = referenceMonthlyRests(200_000, 6, 360, 1199.1);
    expect(loan.rows).toHaveLength(reference.length);

    const mismatches = loan.rows.filter(
      (row, index) =>
        Math.round(row.interest * 100) !== reference[index].interest ||
        Math.round(row.principal * 100) !== reference[index].principal ||
        Math.round(row.balance * 100) !== reference[index].balance,
    );
    expect(mismatches).toEqual([]);
  });

  it('closes at exactly zero, with the last payment absorbing the rounding', () => {
    expect(loan.rows[359].balance).toBe(0);
    expect(loan.finalPayment).toBe(1200.14);
    expect(loan.payoffOn).toBe('2055-12-01');
  });

  it('costs 66 cents more than the idealised figure, because cents are real', () => {
    // The textbook total is payment × term with the rounding ignored. A real
    // schedule rounds 360 times and the difference lands on the last payment.
    expect(loan.totalInterest).toBe(231_677.04);
    expect(calculateLoan(200_000, 6, 360).totalInterest).toBe(231_676.38);
  });
});

/**
 * Fixture 2 — $10,000 at 5.00% over 60 months.
 *
 * The standard personal-loan illustration. From the annuity formula,
 *     M = 10000 × (0.05/12) × (1+0.05/12)⁶⁰ / ((1+0.05/12)⁶⁰ − 1) = 188.71234…
 * so the contract payment is $188.71 and the term costs $1,322.74 in interest
 * (the tail lands on the final payment, which is why it is not 188.71 × 60 −
 * 10,000 = $1,322.60).
 */
describe('fixture: $10,000 at 5% over 60 months (standard annuity formula)', () => {
  const TERMS = {
    principal: 10_000,
    annualRatePercent: 5,
    months: 60,
    fundedOn: new Date(2026, 0, 15),
    firstPaymentOn: new Date(2026, 1, 15),
    basis: 'monthly' as const,
  };

  it('matches the quoted payment and the published first split', () => {
    const loan = amortise(TERMS);
    expect(loan.payment).toBe(188.71);
    // 10,000 × 5% ÷ 12 = 41.6666… → $41.67 posts.
    expect(loan.rows[0].interest).toBe(41.67);
    expect(loan.rows[0].principal).toBe(147.04);
    expect(loan.rows[0].balance).toBe(9852.96);
    expect(loan.rows[59].balance).toBe(0);
    expect(loan.totalInterest).toBe(1322.74);
  });

  it('is the same loan on a 30/360 basis, to the cent', () => {
    // Whole months: 30 days ÷ 360 is one twelfth, so the two conventions are
    // the same arithmetic. This is what lets a monthly-rest loan be stored in
    // the '30/360' column without moving a figure.
    const monthly = amortise(TERMS);
    const thirty = amortise({ ...TERMS, basis: '30/360' });
    expect(thirty.rows.map((row) => row.balance)).toEqual(monthly.rows.map((row) => row.balance));
    expect(thirty.totalInterest).toBe(monthly.totalInterest);
  });
});

/**
 * Fixture 3 — £10,000 at 5.9% over 60 months, the shape a UK personal loan is
 * advertised in (monthly rests, interest charged on the reducing balance).
 *
 * From the annuity formula: M = 192.86337…, so £192.86 a month.
 */
describe('fixture: £10,000 at 5.9% over 60 months (UK personal loan, monthly rests)', () => {
  const loan = amortise({
    principal: 10_000,
    annualRatePercent: 5.9,
    months: 60,
    fundedOn: new Date(2026, 2, 31),
    firstPaymentOn: new Date(2026, 3, 30),
    basis: 'monthly',
  });

  it('quotes £192.86 a month', () => {
    expect(loan.payment).toBe(192.86);
  });

  it('holds a month-end due date without drifting', () => {
    // Funded on 31 March with a first payment on 30 April: every later payment
    // is the 30th, and February is the 28th, and the 30th comes back after it.
    expect(loan.rows[0].date).toBe('2026-04-30');
    expect(loan.rows[9].date).toBe('2027-01-30');
    expect(loan.rows[10].date).toBe('2027-02-28');
    expect(loan.rows[11].date).toBe('2027-03-30');
  });

  it('repays exactly what was borrowed', () => {
    const repaid = loan.rows.reduce((sum, row) => sum + Math.round(row.principal * 100), 0);
    expect(repaid).toBe(1_000_000);
    expect(loan.rows[59].balance).toBe(0);
  });
});

describe('monthly rests', () => {
  it('charges the same in February as in March', () => {
    const terms = {
      principal: 12_000,
      annualRatePercent: 9,
      months: 12,
      fundedOn: new Date(2026, 0, 14),
      firstPaymentOn: new Date(2026, 1, 14),
      basis: 'monthly' as const,
      payment: 1050,
    };
    const rows = amortise(terms).rows;
    // 28 days then 31, and the interest does not notice — the whole point of
    // the convention, and the reason it disagrees with a daily-accrual lender.
    expect(rows[0].interest).toBe(90);
    expect(rows[1].interest).toBe(82.8);
    expect(amortise({ ...terms, basis: 'actual/365' }).rows[1].interest).not.toBe(82.8);
  });

  it('charges the odd days of a stub period as per diem interest', () => {
    // Funded 15 Dec, first payment 1 Feb: one whole month plus 17 days.
    // 10,000 × 9%… no — 12%: 10,000 × 12% ÷ 12 = 100.00, plus
    // 10,000 × 12% × 17 ÷ 365 = 55.8904 → $155.89 posts.
    const loan = amortise({
      principal: 10_000,
      annualRatePercent: 12,
      months: 12,
      fundedOn: new Date(2025, 11, 15),
      firstPaymentOn: new Date(2026, 1, 1),
      basis: 'monthly',
      payment: 900,
    });
    expect(loan.rows[0].days).toBe(48);
    expect(loan.rows[0].interest).toBe(155.89);
  });
});

/**
 * Fixture 4 — $25,000 at 7.500% over 60 months on MONTHLY RESTS, funded on
 * 15 January 2026 with the first payment due 1 March 2026.
 *
 * The opening period is one whole rest (15 Jan to 15 Feb) plus a 14-day stub,
 * which is the one shape where monthly rests and 30/360 disagree — and the
 * shape the loan calculator used to refuse to file. It is priced on the
 * calculator, saved from `/save-loan` and re-read on `/loan-schedule`, so all
 * three have to be the same loan to the cent.
 *
 * Every figure below is worked by hand from the conventions in this module,
 * not read back off the engine:
 *
 *     i  = 7.5% / 12                 = 0.00625              (one monthly rest)
 *     f0 = i + 14 x 7.5% / 365       = 0.00912671232876712  (rest + per diem)
 *
 * `solvePayment` closes the loan on its last due date:
 *
 *     payment = P (1+f0) (1+i)^59 i / ((1+i)^60 - 1)
 *             = 25,000 x 1.00912671232876712 x 1.44426773493316237
 *               x 0.00625 / 0.45329440827649464
 *             = 502.38084939...                          -> $502.38
 *
 * First posting, one rounding:
 *
 *     25,000 x 0.00625          = 156.25000000   (the rest)
 *   + 25,000 x 7.5% x 14 / 365  =  71.91780822   (the stub)
 *   = 228.16780822                               -> $228.17 posts
 *
 * leaving 502.38 - 228.17 = $274.21 off the balance and $24,725.79 owed. Run to
 * the end at the same payment the term costs $5,142.83 and the last payment is
 * $502.41, the roundings landing there as a lender puts them.
 *
 * Sources: the stub rule is the "odd days interest" a monthly-rest lender
 * collects for the days before the first full period (Reg Z Appendix J counts
 * an irregular first period the same way, as whole unit-periods plus a
 * fraction); the annuity closed form is the one documented on `solvePayment`.
 */
describe('fixture: $25,000 at 7.5% over 60 months, monthly rests with a 14-day stub', () => {
  const TERMS = {
    principal: 25_000,
    annualRatePercent: 7.5,
    months: 60,
    fundedOn: new Date(2026, 0, 15),
    firstPaymentOn: new Date(2026, 2, 1),
    basis: 'monthly' as const,
  };

  it('prices the stub as a whole rest plus per diem on the odd days', () => {
    expect(monthsAndDaysBetween(TERMS.fundedOn, TERMS.firstPaymentOn)).toEqual({
      months: 1,
      days: 14,
    });

    const loan = amortise(TERMS);
    expect(loan.payment).toBe(502.38);
    // The row still reports the 45 real days it covers; the interest on them is
    // a rest plus fourteen days, which is not the same thing.
    expect(loan.rows[0].days).toBe(45);
    expect(loan.rows[0].interest).toBe(228.17);
    expect(loan.rows[0].principal).toBe(274.21);
    expect(loan.rows[0].balance).toBe(24_725.79);
    expect(loan.totalInterest).toBe(5142.83);
    expect(loan.finalPayment).toBe(502.41);
    expect(loan.rows[59].balance).toBe(0);
  });

  it('costs more than the same loan funded a whole month before the first payment', () => {
    // No stub at all: 1 February to 1 March is one rest and nothing else, which
    // is the textbook $500.95 payment for these terms.
    const wholeMonth = amortise({ ...TERMS, fundedOn: new Date(2026, 1, 1) });
    expect(wholeMonth.payment).toBe(500.95);
    expect(wholeMonth.rows[0].interest).toBe(156.25);
  });

  it('is NOT the same loan on a 30/360 basis, which is why the basis is stored as itself', () => {
    // 30/360 counts 15 Jan to 1 March as 46 thirtieths-of-a-month days:
    // 25,000 x 7.5% x 46 / 360 = 239.5833... -> $239.58, $11.41 more than the
    // monthly rest posts, on a payment $0.23 a month higher. Filing a
    // monthly-rest loan in the '30/360' column would move both.
    const thirty = amortise({ ...TERMS, basis: '30/360' });
    expect(thirty.rows[0].interest).toBe(239.58);
    expect(thirty.payment).toBe(502.61);
  });

  it('shows the same figures on the calculator, on save and on the saved schedule', () => {
    // 1. The calculator: the hero and the schedule card come off the contract
    //    side of the comparison, with nothing extra being paid.
    const calculator = comparePrepayment({ ...TERMS, extra: { monthly: 0, lumpSums: [] } }).base;

    // 2. /save-loan re-derives the payment from the same inputs before filing.
    const saved = amortise(TERMS);
    expect(saved.payment).toBe(calculator.payment);
    expect(saved.totalInterest).toBe(calculator.totalInterest);

    // 3. /loan-schedule reads the row back, contract payment and all.
    const stored = termsFromStored({
      principal: 25_000,
      annual_rate: 7.5,
      term_months: 60,
      monthly_payment: saved.payment,
      first_payment_on: '2026-03-01',
      funded_on: '2026-01-15',
      day_count_basis: 'monthly',
      statement_on: null,
      statement_principal: null,
    });
    expect(stored).not.toBeNull();
    const schedule = amortise(stored as LoanTerms);
    expect(schedule.payment).toBe(502.38);
    expect(schedule.rows).toEqual(calculator.rows);
    expect(schedule.totalInterest).toBe(5142.83);
  });
});

describe('monthsAndDaysBetween', () => {
  it('counts whole months first and leaves the rest as days', () => {
    expect(monthsAndDaysBetween(new Date(2025, 10, 30), new Date(2026, 0, 14))).toEqual({
      months: 1,
      days: 15,
    });
    expect(monthsAndDaysBetween(new Date(2026, 0, 1), new Date(2026, 1, 1))).toEqual({
      months: 1,
      days: 0,
    });
  });

  it('treats a clamped month end as a whole month', () => {
    // 31 Jan to 28 Feb is one month, not 28 days of nothing.
    expect(monthsAndDaysBetween(new Date(2026, 0, 31), new Date(2026, 1, 28))).toEqual({
      months: 1,
      days: 0,
    });
    expect(monthsAndDaysBetween(new Date(2026, 0, 31), new Date(2026, 2, 1))).toEqual({
      months: 1,
      days: 1,
    });
  });

  it('is nothing at all when the dates are the same or backwards', () => {
    expect(monthsAndDaysBetween(new Date(2026, 5, 1), new Date(2026, 5, 1))).toEqual({
      months: 0,
      days: 0,
    });
    expect(monthsAndDaysBetween(new Date(2026, 5, 1), new Date(2026, 4, 1))).toEqual({
      months: 0,
      days: 0,
    });
  });
});

describe('addMonths', () => {
  it('clamps to the end of a shorter month without drifting afterwards', () => {
    const anchor = new Date(2026, 0, 31);
    expect(toIso(addMonths(anchor, 1))).toBe('2026-02-28');
    expect(toIso(addMonths(anchor, 2))).toBe('2026-03-31');
    expect(toIso(addMonths(anchor, 3))).toBe('2026-04-30');
    expect(toIso(addMonths(anchor, -1))).toBe('2025-12-31');
  });
});

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// --- Overpayments -----------------------------------------------------------

/**
 * Fixture 4 — the published overpayment rule of thumb, checked exactly.
 *
 * $200,000 at 6% over 30 years with $200 a month extra. The figure quoted in
 * every "should I overpay?" article is "about nine years off the term"; the
 * exact answer is 108 payments and $79,800.86 of interest. Both sides of the
 * comparison are also reproduced by `referenceMonthlyRests` above, which knows
 * nothing about how the engine applies an overpayment.
 */
describe('fixture: $200 a month extra on a $200,000 30-year mortgage', () => {
  const TERMS = {
    principal: 200_000,
    annualRatePercent: 6,
    months: 360,
    fundedOn: new Date(2025, 11, 1),
    firstPaymentOn: new Date(2026, 0, 1),
    basis: 'monthly' as const,
    extra: { monthly: 200 },
  };

  const comparison = comparePrepayment(TERMS);

  it('takes nine years and $79,800.86 off the loan', () => {
    expect(comparison.monthsSaved).toBe(108);
    expect(comparison.interestSaved).toBe(79_800.86);
    expect(comparison.accelerated.rows).toHaveLength(252);
    expect(comparison.accelerated.payoffOn).toBe('2046-12-01');
  });

  it('keeps the contract payment and rides the extra on top of it', () => {
    const first = comparison.accelerated.rows[0];
    expect(comparison.accelerated.payment).toBe(1199.1);
    expect(first.payment).toBe(1399.1);
    expect(first.extra).toBe(200);
    expect(first.interest).toBe(1000);
    expect(first.principal).toBe(399.1);
    expect(first.balance).toBe(199_600.9);
  });

  it('agrees with an independent amortiser on every row', () => {
    const reference = referenceMonthlyRests(200_000, 6, 360, 1199.1, 200);
    expect(comparison.accelerated.rows).toHaveLength(reference.length);

    const mismatches = comparison.accelerated.rows.filter(
      (row, index) =>
        Math.round(row.interest * 100) !== reference[index].interest ||
        Math.round(row.principal * 100) !== reference[index].principal ||
        Math.round(row.balance * 100) !== reference[index].balance,
    );
    expect(mismatches).toEqual([]);
  });

  it('still repays exactly the sum borrowed', () => {
    const repaid = comparison.accelerated.rows.reduce(
      (sum, row) => sum + Math.round(row.principal * 100),
      0,
    );
    expect(repaid).toBe(20_000_000);
    expect(comparison.accelerated.rows[251].balance).toBe(0);
  });

  it('reports no saving when nothing extra is paid', () => {
    const nothing = comparePrepayment({ ...TERMS, extra: undefined });
    expect(nothing.interestSaved).toBe(0);
    expect(nothing.monthsSaved).toBe(0);
    expect(nothing.accelerated).toBe(nothing.base);
  });
});

describe('lump sums', () => {
  const BASE = {
    principal: 10_000,
    annualRatePercent: 12,
    months: 12,
    fundedOn: new Date(2026, 0, 1),
    firstPaymentOn: new Date(2026, 1, 1),
    payment: 900,
  };

  it('credits on the day it lands when interest accrues daily', () => {
    // Hand-computed: 15 days on $10,000 then 16 days on $5,000, at 12% on
    // actual/365 — 10,000 × 0.12 × 15/365 = 49.315068, 5,000 × 0.12 × 16/365 =
    // 26.301370, so $75.62 posts against $101.92 with no overpayment.
    const plain = amortise({ ...BASE, basis: 'actual/365' });
    const early = amortise({
      ...BASE,
      basis: 'actual/365',
      extra: { lumpSums: [{ on: new Date(2026, 0, 16), amount: 5_000 }] },
    });

    expect(plain.rows[0].interest).toBe(101.92);
    expect(early.rows[0].interest).toBe(75.62);
    expect(early.rows[0].extra).toBe(5_000);
    expect(early.rows[0].payment).toBe(5_900);
    expect(early.rows[0].balance).toBe(4175.62);
  });

  it('rounds the period once, not once per segment', () => {
    // Two segments of interest are one posting on the statement, so the cents
    // are decided on the sum: 49.315068 + 26.301370 = 75.616438 → 75.62, where
    // rounding each segment first would post 49.32 + 26.30 = 75.62… and other
    // figures would post a cent apart. The invariant below is what matters.
    const early = amortise({
      ...BASE,
      basis: 'actual/365',
      extra: { lumpSums: [{ on: new Date(2026, 0, 16), amount: 5_000 }] },
    });
    for (const row of early.rows) {
      expect(Math.round(row.interest * 100) + Math.round(row.principal * 100)).toBe(
        Math.round(row.payment * 100),
      );
    }
  });

  it('credits at the rest under monthly rests, because there is no day to credit on', () => {
    const monthly = amortise({
      ...BASE,
      basis: 'monthly',
      extra: { lumpSums: [{ on: new Date(2026, 0, 16), amount: 5_000 }] },
    });
    // A full rest of interest: 10,000 × 12% ÷ 12.
    expect(monthly.rows[0].interest).toBe(100);
    expect(monthly.rows[0].balance).toBe(4_200);
  });

  it('honours a lump sum dated before the money landed rather than dropping it', () => {
    const early = amortise({
      ...BASE,
      basis: 'actual/365',
      extra: { lumpSums: [{ on: new Date(2020, 0, 1), amount: 1_000 }] },
    });
    expect(early.rows[0].extra).toBe(1_000);
    // Credited at funding, so the whole period accrues on $9,000:
    // 9,000 × 0.12 × 31/365 = 91.726 → $91.73.
    expect(early.rows[0].interest).toBe(91.73);
  });

  it('never lets an oversized lump sum overpay the loan', () => {
    const cleared = amortise({
      ...BASE,
      basis: 'actual/365',
      extra: { lumpSums: [{ on: new Date(2026, 0, 16), amount: 999_999 }] },
    });
    expect(cleared.rows).toHaveLength(1);
    expect(cleared.rows[0].balance).toBe(0);
    const repaid = cleared.rows.reduce((sum, row) => sum + Math.round(row.principal * 100), 0);
    expect(repaid).toBe(1_000_000);
  });

  it('shortens the term when a lump sum lands mid-way', () => {
    const comparison = comparePrepayment({
      principal: 200_000,
      annualRatePercent: 6,
      months: 360,
      fundedOn: new Date(2025, 11, 1),
      firstPaymentOn: new Date(2026, 0, 1),
      basis: 'monthly',
      extra: { lumpSums: [{ on: new Date(2031, 0, 1), amount: 20_000 }] },
    });
    expect(comparison.monthsSaved).toBe(63);
    expect(comparison.interestSaved).toBe(55_775.36);
  });
});

// --- Properties -------------------------------------------------------------

/**
 * A deterministic pseudo-random sweep.
 *
 * Seeded so a failure is reproducible: this is a property test, not a fuzzer,
 * and a figure that only goes wrong on Tuesdays is worse than no test at all.
 * The generator is the Numerical Recipes linear congruential one.
 */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe('every schedule, whatever the inputs', () => {
  const random = seededRandom(20260912);
  const bases = ['actual/365', 'actual/360', '30/360', 'monthly'] as const;

  const cases: LoanTerms[] = Array.from({ length: 250 }, () => {
    const firstPaymentOn = new Date(2026, Math.floor(random() * 12), 1 + Math.floor(random() * 28));
    const fundedOn = addDaysBefore(firstPaymentOn, Math.floor(random() * 60));
    const principal = Math.round((500 + random() * 999_500) * 100) / 100;
    const months = 6 + Math.floor(random() * 475);

    return {
      principal,
      annualRatePercent: Math.round(random() * 3000) / 100,
      months,
      firstPaymentOn,
      fundedOn,
      basis: bases[Math.floor(random() * bases.length)],
      extra:
        random() < 0.5
          ? {
              monthly: Math.round(random() * (principal / months) * 100) / 100,
              lumpSums:
                random() < 0.5
                  ? [
                      {
                        on: addDaysBefore(firstPaymentOn, -Math.floor(random() * months * 30)),
                        amount: Math.round(random() * principal * 0.4 * 100) / 100,
                      },
                    ]
                  : [],
            }
          : undefined,
    };
  });

  // Amortised once and shared: five invariants over 250 forty-year schedules
  // is a lot of arithmetic to repeat five times.
  const schedules = new Map(cases.map((terms) => [terms, amortise(terms)]));
  const rowsFor = (terms: LoanTerms) => schedules.get(terms)!.rows;

  it('repays exactly the sum borrowed, to the cent, on every one of them', () => {
    const broken = cases.filter((terms) => {
      const rows = rowsFor(terms);
      const repaid = rows.reduce((sum, row) => sum + Math.round(row.principal * 100), 0);
      return repaid !== Math.round(terms.principal * 100);
    });
    expect(broken).toEqual([]);
  });

  it('never lets a balance go negative', () => {
    const broken = cases.filter((terms) => rowsFor(terms).some((row) => row.balance < 0));
    expect(broken).toEqual([]);
  });

  it('closes every loan at exactly zero', () => {
    const broken = cases.filter((terms) => {
      const rows = rowsFor(terms);
      return rows.length === 0 || rows[rows.length - 1].balance !== 0;
    });
    expect(broken).toEqual([]);
  });

  it('splits every payment into interest and principal with nothing left over', () => {
    const broken = cases.filter((terms) =>
      rowsFor(terms).some(
        (row) =>
          Math.round(row.interest * 100) + Math.round(row.principal * 100) !==
          Math.round(row.payment * 100),
      ),
    );
    expect(broken).toEqual([]);
  });

  it('never charges negative interest and never runs past the term', () => {
    const broken = cases.filter((terms) => {
      const rows = rowsFor(terms);
      return rows.length > terms.months || rows.some((row) => row.interest < 0);
    });
    expect(broken).toEqual([]);
  });
});

function addDaysBefore(date: Date, days: number): Date {
  const moved = new Date(date);
  moved.setDate(date.getDate() - days);
  return moved;
}

describe('interestFraction', () => {
  it('is the same number four different ways for one whole month', () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2026, 1, 1);
    expect(interestFraction(from, to, 12, 'monthly')).toBeCloseTo(0.01, 12);
    expect(interestFraction(from, to, 12, '30/360')).toBeCloseTo(0.01, 12);
    expect(interestFraction(from, to, 12, 'actual/365')).toBeCloseTo((0.12 * 31) / 365, 12);
    expect(interestFraction(from, to, 12, 'actual/360')).toBeCloseTo((0.12 * 31) / 360, 12);
  });

  it('is nothing when there is no rate, no time, or time runs backwards', () => {
    expect(interestFraction(new Date(2026, 0, 1), new Date(2026, 1, 1), 0)).toBe(0);
    expect(interestFraction(new Date(2026, 0, 1), new Date(2026, 0, 1), 12)).toBe(0);
    expect(interestFraction(new Date(2026, 1, 1), new Date(2026, 0, 1), 12)).toBe(0);
  });
});
