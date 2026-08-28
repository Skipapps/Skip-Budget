import { amortisationSchedule, calculateLoan, scheduleByYear } from '@/lib/loan';

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
