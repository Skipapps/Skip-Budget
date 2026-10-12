/**
 * The payment day anchor (`LoanTerms.paymentDay`): a loan paid on the 29th–31st stays on that day
 * every month, though its first payment was clamped into a shorter month. Without it the dates
 * follow the first payment's own day, as before, and nothing moves by a cent.
 */

import {
  DAY_31_2024,
  DAY_31_2025,
  START_28_DEC_DAY_2,
  START_31_DAY_30,
  type AddLoanReference,
} from '@/lib/__fixtures__/add-loan-reference';
import { inCents, referenceSchedule } from '@/lib/__fixtures__/loan-reference';
import {
  amortise,
  isPaymentDay,
  paymentDates,
  payoffDate,
  payoffQuote,
  solvePayment,
  steadyPayment,
  termsFromStored,
  type LoanTerms,
  type StoredLoan,
} from '@/lib/loan';
import { scheduleWithOverrides } from '@/lib/loan-overrides';
import { fromCents } from '@/lib/money';

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const local = (iso: string) => new Date(`${iso}T00:00:00`);
const pad = (value: number) => String(value).padStart(2, '0');
const iso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const termsOf = (reference: AddLoanReference): LoanTerms => ({
  principal: reference.principal,
  annualRatePercent: reference.annualRate,
  months: reference.months,
  firstPaymentOn: local(reference.firstPayment),
  paymentDay: reference.paymentDay,
  fundedOn: local(reference.start),
  basis: 'actual/365',
});

/** The engine's rows in the reference's tuple shape. */
const asTuples = (terms: LoanTerms) =>
  amortise(terms).rows.map((row) => [
    row.date,
    row.days,
    Math.round(row.interest * 100),
    Math.round(row.payment * 100),
    Math.round(row.balance * 100),
  ]);

describe('paymentDates with a payment day', () => {
  it('returns to the 31st after a February first payment', () => {
    expect(paymentDates(day(2025, 2, 28), 12, 31).map(iso)).toEqual([
      '2025-02-28',
      '2025-03-31',
      '2025-04-30',
      '2025-05-31',
      '2025-06-30',
      '2025-07-31',
      '2025-08-31',
      '2025-09-30',
      '2025-10-31',
      '2025-11-30',
      '2025-12-31',
      '2026-01-31',
    ]);
  });

  it('without one, every later payment stays on the first payment’s 28th (why the day is kept)', () => {
    expect(paymentDates(day(2025, 2, 28), 4).map(iso)).toEqual([
      '2025-02-28',
      '2025-03-28',
      '2025-04-28',
      '2025-05-28',
    ]);
  });

  it('holds the 29th, 30th and 31st through leap and common Februaries', () => {
    expect(
      paymentDates(day(2024, 2, 29), 13, 31)
        .map(iso)
        .slice(0, 3),
    ).toEqual(['2024-02-29', '2024-03-31', '2024-04-30']);
    expect(paymentDates(day(2024, 2, 29), 13, 30).map(iso)[1]).toBe('2024-03-30');
    expect(paymentDates(day(2024, 2, 29), 13, 29).map(iso)[12]).toBe('2025-02-28');
    expect(paymentDates(day(2025, 2, 28), 13, 29).map(iso)[1]).toBe('2025-03-29');
    expect(paymentDates(day(2027, 2, 28), 13, 29).map(iso)[12]).toBe('2028-02-29');
    expect(paymentDates(day(2026, 4, 30), 3, 31).map(iso)).toEqual([
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ]);
  });

  it('keeps the first payment as given, even off the payment day', () => {
    // A first date carried from elsewhere is honoured; the day governs the rest.
    expect(paymentDates(day(2025, 1, 15), 3, 20).map(iso)).toEqual([
      '2025-01-15',
      '2025-02-20',
      '2025-03-20',
    ]);
  });

  it('changes nothing when it is the first payment’s own day, or not a day at all', () => {
    const changed: string[] = [];
    for (let first = day(2024, 1, 1); first <= day(2026, 12, 31);) {
      const plain = paymentDates(first, 25).map(iso).join();
      for (const paymentDay of [first.getDate(), undefined, 0, 32, 1.5, Number.NaN]) {
        if (paymentDates(first, 25, paymentDay).map(iso).join() !== plain) {
          changed.push(`${iso(first)} with ${paymentDay}`);
        }
      }
      first = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1);
    }
    expect(changed).toEqual([]);
  });

  it('ends the term on the payment day', () => {
    expect(iso(payoffDate(day(2025, 2, 28), 12, 31))).toBe('2026-01-31');
    expect(iso(payoffDate(day(2025, 2, 28), 12))).toBe('2026-01-28');
    expect(iso(payoffDate(day(2025, 2, 28), 1, 31))).toBe('2025-02-28');
  });
});

describe('isPaymentDay', () => {
  it('is a whole day from 1 to 31', () => {
    for (const value of [1, 15, 28, 29, 30, 31]) expect(isPaymentDay(value)).toBe(true);
    for (const value of [0, 32, -1, 1.5, Number.NaN, Infinity, '15', null, undefined]) {
      expect([value, isPaymentDay(value)]).toEqual([value, false]);
    }
  });
});

describe.each([
  ['day 31, first payment clamped to 28 Feb 2025', DAY_31_2025],
  ['day 31, first payment clamped to 29 Feb 2024', DAY_31_2024],
  ['start 31 Jan, day 30: first payment 30 Mar', START_31_DAY_30],
  ['start 28 Dec, day 2: first payment 2 Feb', START_28_DEC_DAY_2],
])('the schedule on its payment day: %s', (_name, reference) => {
  const terms = termsOf(reference);

  it('solves the payment the independent reference solves', () => {
    expect(solvePayment(terms)).toBe(fromCents(reference.solvedCents));
  });

  it('agrees with the independent reference on every row: date, days, interest, paid, balance', () => {
    expect(asTuples({ ...terms, payment: fromCents(reference.paymentCents) })).toEqual(
      reference.rows,
    );
  });

  it('agrees with the exact-integer reference amortiser on every row', () => {
    expect(
      inCents(amortise({ ...terms, payment: fromCents(reference.paymentCents) }).rows),
    ).toEqual(
      referenceSchedule({
        principalCents: Math.round(reference.principal * 100),
        rateUnits: Math.round(reference.annualRate * 1000),
        unitsPerPercent: 1000,
        months: reference.months,
        fundedOn: local(reference.start),
        firstPaymentOn: local(reference.firstPayment),
        paymentDay: reference.paymentDay,
        basis: 'actual/365',
        paymentCents: reference.paymentCents,
      }),
    );
  });
});

describe('a day-31 loan first due 28 Feb 2025: $10,000 at 7.5% over 12 months', () => {
  const terms = termsOf(DAY_31_2025);

  it('costs $867.33, and anchored on the 28th it would be priced on the wrong dates', () => {
    const anchored = amortise(terms);
    const drifted = amortise({ ...terms, paymentDay: undefined });
    expect(anchored.payment).toBe(867.33);
    expect(anchored.rows.map((row) => row.date.slice(8))).toEqual([
      '28',
      '31',
      '30',
      '31',
      '30',
      '31',
      '31',
      '30',
      '31',
      '30',
      '31',
      '31',
    ]);
    expect(drifted.rows.every((row) => row.date.endsWith('-28'))).toBe(true);
    expect(drifted.payoffOn).toBe('2026-01-28');
    expect(anchored.payoffOn).toBe('2026-01-31');
    expect(anchored.totalInterest).toBe(407.93);
    expect(drifted.totalInterest).not.toBe(anchored.totalInterest);
  });

  it('takes the funding month on the payment day when none is given', () => {
    const { fundedOn, rows } = amortise({ ...terms, fundedOn: undefined });
    expect(iso(fundedOn)).toBe('2025-01-31');
    expect(rows[0].days).toBe(28);
    // Without the day, a month before 28 Feb is 28 Jan.
    expect(iso(amortise({ ...terms, fundedOn: undefined, paymentDay: undefined }).fundedOn)).toBe(
      '2025-01-28',
    );
  });

  it('carries the day through changed payments and the payoff quote', () => {
    const priced = scheduleWithOverrides(terms, { monthlyPayment: 900, payments: { 3: 1500 } });
    expect(priced.problems).toEqual([]);
    expect(priced.rows.map((row) => row.date)).toEqual(
      paymentDates(terms.firstPaymentOn, priced.rows.length, 31).map(iso),
    );
    // On 15 Apr 2025 the last payment made was 31 Mar, so 15 days have accrued, not 18.
    const quote = payoffQuote({ ...terms, payment: 867.33 }, day(2025, 4, 15));
    expect(quote.lastPaymentOn && iso(quote.lastPaymentOn)).toBe('2025-03-31');
    expect(quote.daysAccrued).toBe(15);
    expect(quote.principal).toBe(8381.41);
  });
});

describe('termsFromStored reads payment_day', () => {
  const stored: StoredLoan = {
    principal: 10_000,
    annual_rate: 7.5,
    term_months: 12,
    monthly_payment: 867.33,
    first_payment_on: '2025-02-28',
    funded_on: '2025-01-31',
    day_count_basis: 'actual/365',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    payment_day: 31,
  };

  it('anchors the saved schedule on it, to the reference’s cent', () => {
    const terms = termsFromStored(stored) as LoanTerms;
    expect(terms.paymentDay).toBe(31);
    expect(asTuples(terms)).toEqual(DAY_31_2025.rows);
  });

  it('leaves a row with no day, a null day, or a broken one on the first payment’s day', () => {
    const { payment_day: _dropped, ...older } = stored;
    for (const row of [older, { ...stored, payment_day: null }, { ...stored, payment_day: 0 }]) {
      const terms = termsFromStored(row) as LoanTerms;
      expect(terms.paymentDay).toBeUndefined();
      expect(amortise(terms).payoffOn).toBe('2026-01-28');
    }
  });
});

describe('loans without a payment day are unchanged to the cent', () => {
  // The real lender's statement (see loan.test.ts): $31,394.33 at 8.14%, first payment 14 Jan 2026.
  const LENDER: LoanTerms = {
    principal: 31_394.33,
    annualRatePercent: 8.14,
    months: 72,
    fundedOn: new Date(2025, 10, 30),
    firstPaymentOn: new Date(2026, 0, 14),
    basis: 'actual/365',
    payment: 554.34,
    statement: { on: new Date(2026, 7, 14), principal: 28_698.15 },
  };

  it('the real lender’s statement: same rows with its own day as the payment day', () => {
    const plain = amortise(LENDER);
    expect(amortise({ ...LENDER, paymentDay: 14 })).toEqual(plain);
    expect(payoffQuote({ ...LENDER, paymentDay: 14 }, new Date(2026, 7, 28)).payoff).toBe(
      28_787.75,
    );
    expect(plain.rows[71].date).toBe('2031-12-14');
  });

  it('every basis, month-end first payments included, solved and run the same either way', () => {
    const moved: string[] = [];
    const firsts = [
      day(2025, 1, 31),
      day(2025, 2, 28),
      day(2024, 2, 29),
      day(2025, 4, 30),
      day(2025, 3, 29),
      day(2026, 1, 14),
    ];
    for (const basis of ['actual/365', 'actual/360', '30/360', 'monthly'] as const) {
      for (const firstPaymentOn of firsts) {
        for (const fundedOn of [undefined, day(2024, 12, 20)]) {
          const terms: LoanTerms = {
            principal: 25_000,
            annualRatePercent: 7.5,
            months: 60,
            firstPaymentOn,
            fundedOn,
            basis,
          };
          const same = { ...terms, paymentDay: firstPaymentOn.getDate() };
          if (
            solvePayment(same) !== solvePayment(terms) ||
            steadyPayment(same) !== steadyPayment(terms) ||
            JSON.stringify(amortise(same)) !== JSON.stringify(amortise(terms))
          ) {
            moved.push(`${basis} ${iso(firstPaymentOn)} funded ${fundedOn && iso(fundedOn)}`);
          }
        }
      }
    }
    expect(moved).toEqual([]);
  });
});
