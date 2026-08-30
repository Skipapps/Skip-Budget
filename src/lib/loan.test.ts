import {
  accruedInterest,
  amortisationSchedule,
  amortise,
  calculateLoan,
  daysBetween,
  paymentDates,
  payoffQuote,
  scheduleByYear,
  solvePayment,
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
