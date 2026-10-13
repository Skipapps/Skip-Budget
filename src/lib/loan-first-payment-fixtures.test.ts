/**
 * First payments picked as a date, priced to the cent. The rows come from an independent reference
 * that shares no code with `@/lib/loan`: a Python script on exact fractions with its own calendar
 * (due dates: the first payment as given, then its month + k on min(payment day, month length);
 * interest balance¢ × rate × days / 365 rounded half up once a period, or on monthly rests rate/12
 * with the opening stub as months/12 + days/365; the last payment settles the balance). Rows are
 * [date, days, interest¢, paid¢, balance¢ after].
 *
 * The opening period is what the engine already charges from `funded_on` to the first payment:
 * the principal's simple interest for the days between them, posted once with the first payment.
 * Nothing here changes how interest is worked out; the dates are only picked differently.
 */

import { DAY_31_2024, DAY_31_2025 } from '@/lib/__fixtures__/add-loan-reference';
import { inCents, referenceSchedule } from '@/lib/__fixtures__/loan-reference';
import {
  amortise,
  payoffQuote,
  solvePayment,
  termsFromStored,
  type AccrualBasis,
  type LoanTerms,
  type StoredLoan,
} from '@/lib/loan';
import { scheduleWithOverrides } from '@/lib/loan-overrides';
import { loanReview, type LoanReviewFields, type LoanReviewFigures } from '@/lib/loan-review';
import { readLoanRoute, termsFromRoute } from '@/lib/loan-route';

type Row = readonly [string, number, number, number, number];

const TODAY = '2026-10-13';
const local = (iso: string) => new Date(`${iso}T00:00:00`);

/** Simple interest on the amount borrowed for the opening days, in cents, half up: no engine code. */
function openingCents(principalCents: number, ratePerMille: number, days: number): number {
  const numerator = BigInt(principalCents) * BigInt(ratePerMille) * BigInt(days);
  const denominator = BigInt(100 * 1000 * 365);
  return Number((BigInt(2) * numerator + denominator) / (BigInt(2) * denominator));
}

function review(fields: LoanReviewFields): LoanReviewFigures {
  const priced = loanReview(fields, TODAY);
  if (!priced.ok) throw new Error(`refused: ${JSON.stringify(priced.refusal)}`);
  return priced;
}

const tuples = (terms: LoanTerms) =>
  amortise(terms).rows.map((row) => [
    row.date,
    row.days,
    Math.round(row.interest * 100),
    Math.round(row.payment * 100),
    Math.round(row.balance * 100),
  ]);

/** As `save_loan` files it, read back the way the Loans page reads it. */
function stored(figures: LoanReviewFigures): StoredLoan {
  const { save } = figures;
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

/** The schedule page's rows, opened from Review's link as `loan-schedule.tsx` reads it. */
function scheduleLinkRows(figures: LoanReviewFigures) {
  const route = readLoanRoute(figures.scheduleParams);
  return scheduleWithOverrides(termsFromRoute(route, { withExtras: true }), route.overrides).rows;
}

type Fixture = {
  name: string;
  start: string;
  first: string;
  paymentDay: number;
  /** What `save_loan` files as `payment_day`: null when the first payment's own day says it. */
  storedDay: number | null;
  basis: AccrualBasis;
  principalCents: number;
  /** The rate in thousandths of a percent: 7.5% is 7500. */
  ratePerMille: number;
  months: number;
  solvedCents: number;
  openingDays: number;
  openingCents: number;
  totalInterestCents: number;
  rows: readonly Row[];
};

const fieldsOf = (fixture: Fixture): LoanReviewFields => ({
  principal: fixture.principalCents / 100,
  annualRate: fixture.ratePerMille / 1000,
  termMonths: fixture.months,
  startDate: local(fixture.start),
  firstPaymentOn: local(fixture.first),
  paymentDay: fixture.paymentDay,
  monthlyPayment: fixture.solvedCents / 100,
  basis: fixture.basis,
});

/** $10,000 at 7.5% over 12 months, first due 15 days after the money landed: $30.82 opening. */
const DAYS_15: Fixture = {
  name: 'first payment 15 days after funding: 20 Feb 2026 → 7 Mar 2026',
  start: '2026-02-20',
  first: '2026-03-07',
  paymentDay: 7,
  storedDay: null,
  basis: 'actual/365',
  principalCents: 1_000_000,
  ratePerMille: 7500,
  months: 12,
  solvedCents: 86502,
  openingDays: 15,
  openingCents: 3082,
  totalInterestCents: 38030,
  rows: [
    ['2026-03-07', 15, 3082, 86502, 916580],
    ['2026-04-07', 31, 5838, 86502, 835916],
    ['2026-05-07', 30, 5153, 86502, 754567],
    ['2026-06-07', 31, 4806, 86502, 672871],
    ['2026-07-07', 30, 4148, 86502, 590517],
    ['2026-08-07', 31, 3762, 86502, 507777],
    ['2026-09-07', 31, 3234, 86502, 424509],
    ['2026-10-07', 30, 2617, 86502, 340624],
    ['2026-11-07', 31, 2170, 86502, 256292],
    ['2026-12-07', 30, 1580, 86502, 171370],
    ['2027-01-07', 31, 1092, 86502, 85960],
    ['2027-02-07', 31, 548, 86508, 0],
  ],
};

/** The same loan first due 45 days after the money landed, across February: $92.47 opening. */
const DAYS_45: Fixture = {
  name: 'first payment 45 days after funding: 15 Jan 2026 → 1 Mar 2026',
  start: '2026-01-15',
  first: '2026-03-01',
  paymentDay: 1,
  storedDay: null,
  basis: 'actual/365',
  principalCents: 1_000_000,
  ratePerMille: 7500,
  months: 12,
  solvedCents: 87034,
  openingDays: 45,
  openingCents: 9247,
  totalInterestCents: 44409,
  rows: [
    ['2026-03-01', 45, 9247, 87034, 922213],
    ['2026-04-01', 31, 5874, 87034, 841053],
    ['2026-05-01', 30, 5185, 87034, 759204],
    ['2026-06-01', 31, 4836, 87034, 677006],
    ['2026-07-01', 30, 4173, 87034, 594145],
    ['2026-08-01', 31, 3785, 87034, 510896],
    ['2026-09-01', 31, 3254, 87034, 427116],
    ['2026-10-01', 30, 2633, 87034, 342715],
    ['2026-11-01', 31, 2183, 87034, 257864],
    ['2026-12-01', 30, 1590, 87034, 172420],
    ['2027-01-01', 31, 1098, 87034, 86484],
    ['2027-02-01', 31, 551, 87035, 0],
  ],
};

/**
 * The 45-day loan on monthly rests (a calculator hand-off can carry them): one month at 7.5%/12
 * plus 14 days per diem, $62.50 + $28.77 = $91.27 opening, then a flat $62.50-per-$10,000 rest.
 */
const DAYS_45_MONTHLY: Fixture = {
  ...DAYS_45,
  name: 'first payment 45 days after funding, monthly rests',
  basis: 'monthly',
  solvedCents: 87005,
  openingCents: 9127,
  totalInterestCents: 44066,
  rows: [
    ['2026-03-01', 45, 9127, 87005, 922122],
    ['2026-04-01', 31, 5763, 87005, 840880],
    ['2026-05-01', 30, 5256, 87005, 759131],
    ['2026-06-01', 31, 4745, 87005, 676871],
    ['2026-07-01', 30, 4230, 87005, 594096],
    ['2026-08-01', 31, 3713, 87005, 510804],
    ['2026-09-01', 31, 3193, 87005, 426992],
    ['2026-10-01', 30, 2669, 87005, 342656],
    ['2026-11-01', 31, 2142, 87005, 257793],
    ['2026-12-01', 30, 1611, 87005, 172399],
    ['2027-01-01', 31, 1077, 87005, 86471],
    ['2027-02-01', 31, 540, 87011, 0],
  ],
};

const fromReference = (
  name: string,
  reference: typeof DAY_31_2025,
  totalInterestCents: number,
): Fixture => ({
  name,
  start: reference.start,
  first: reference.firstPayment,
  paymentDay: reference.paymentDay,
  storedDay: reference.paymentDay,
  basis: 'actual/365',
  principalCents: Math.round(reference.principal * 100),
  ratePerMille: Math.round(reference.annualRate * 1000),
  months: reference.months,
  solvedCents: reference.solvedCents,
  openingDays: reference.rows[0][1],
  openingCents: reference.rows[0][2],
  totalInterestCents,
  rows: reference.rows,
});

/** A 31 Jan start at each month's end: 28 Feb, 31 Mar, 30 Apr, … (payment_day 31). $57.53 opening. */
const MONTH_END_2025 = fromReference(
  '31 Jan 2025 start, last day of each month: 28 Feb, 31 Mar, 30 Apr…',
  DAY_31_2025,
  40793,
);

/** The leap year: 29 Feb, 31 Mar, 30 Apr, … $59.59 opening for 29 days. */
const MONTH_END_2024 = fromReference(
  '31 Jan 2024 start, last day of each month: 29 Feb, 31 Mar, 30 Apr…',
  DAY_31_2024,
  41006,
);

/** The same 31 Jan 2025 start with "On the 28th" chosen: 28 Feb, 28 Mar, 28 Apr, … */
const ON_THE_28TH: Fixture = {
  ...MONTH_END_2025,
  name: '31 Jan 2025 start, on the 28th: 28 Feb, 28 Mar, 28 Apr…',
  paymentDay: 28,
  storedDay: null,
  solvedCents: 86690,
  totalInterestCents: 40283,
  rows: [
    ['2025-02-28', 28, 5753, 86690, 919063],
    ['2025-03-28', 28, 5288, 86690, 837661],
    ['2025-04-28', 31, 5336, 86690, 756307],
    ['2025-05-28', 30, 4662, 86690, 674279],
    ['2025-06-28', 31, 4295, 86690, 591884],
    ['2025-07-28', 30, 3649, 86690, 508843],
    ['2025-08-28', 31, 3241, 86690, 425394],
    ['2025-09-28', 31, 2710, 86690, 341414],
    ['2025-10-28', 30, 2105, 86690, 256829],
    ['2025-11-28', 31, 1636, 86690, 171775],
    ['2025-12-28', 30, 1059, 86690, 86144],
    ['2026-01-28', 31, 549, 86693, 0],
  ],
};

describe.each([DAYS_15, DAYS_45, DAYS_45_MONTHLY, MONTH_END_2025, MONTH_END_2024, ON_THE_28TH])(
  '$name',
  (fixture) => {
    const figures = review(fieldsOf(fixture));

    it('charges the opening period the engine always has, from the start date to the first payment', () => {
      const [first] = amortise(figures.terms).rows;
      expect([first.date, first.days, Math.round(first.interest * 100)]).toEqual([
        fixture.first,
        fixture.openingDays,
        fixture.openingCents,
      ]);
      // On daily interest that is plain per diem on the amount borrowed for those days.
      if (fixture.basis === 'actual/365') {
        expect(
          openingCents(fixture.principalCents, fixture.ratePerMille, fixture.openingDays),
        ).toBe(fixture.openingCents);
      }
    });

    it('solves the payment the independent reference solves', () => {
      expect(Math.round(solvePayment(figures.terms) * 100)).toBe(fixture.solvedCents);
    });

    it('agrees with the independent reference on every row, and on the total', () => {
      expect(tuples(figures.terms)).toEqual(fixture.rows);
      expect(Math.round(figures.totalInterest * 100)).toBe(fixture.totalInterestCents);
      expect(fixture.rows.reduce((sum, row) => sum + row[2], 0)).toBe(fixture.totalInterestCents);
    });

    it('agrees with the exact-integer reference amortiser', () => {
      expect(inCents(amortise(figures.terms).rows)).toEqual(
        referenceSchedule({
          principalCents: fixture.principalCents,
          rateUnits: fixture.ratePerMille,
          unitsPerPercent: 1000,
          months: fixture.months,
          fundedOn: local(fixture.start),
          firstPaymentOn: local(fixture.first),
          paymentDay: fixture.paymentDay,
          basis: fixture.basis,
          paymentCents: fixture.solvedCents,
        }),
      );
    });

    it('saves the dates and payment day that read back to the same schedule, on the Loans page and the schedule link', () => {
      expect(figures.save).toEqual(
        expect.objectContaining({
          firstPaymentOn: fixture.first,
          fundedOn: fixture.start,
          paymentDay: fixture.storedDay,
          dayCountBasis: fixture.basis,
        }),
      );
      expect(figures.scheduleParams.day).toBe(
        fixture.storedDay === null ? undefined : String(fixture.storedDay),
      );
      expect(amortise(termsFromStored(stored(figures)) as LoanTerms).rows).toEqual(
        amortise(figures.terms).rows,
      );
      expect(scheduleLinkRows(figures)).toEqual(amortise(figures.terms).rows);
    });
  },
);

/**
 * The Founder's own loan, from the real lender's statement (see loan.test.ts): $31,394.33 at 8.14%
 * over 72 months, the money landed 30 Nov 2025, first payment 14 Jan 2026, $554.34 a month. With the
 * payment day chips this first payment could not be set; picked as a date, Review prices the
 * statement's loan.
 */
describe('a 30 Nov 2025 start with the first payment on 14 Jan 2026 (the real lender’s loan)', () => {
  const FIELDS: LoanReviewFields = {
    principal: 31_394.33,
    annualRate: 8.14,
    termMonths: 72,
    startDate: local('2025-11-30'),
    firstPaymentOn: local('2026-01-14'),
    paymentDay: 14,
    monthlyPayment: 554.34,
    basis: 'actual/365',
  };
  const STATEMENT: LoanTerms = {
    principal: 31_394.33,
    annualRatePercent: 8.14,
    months: 72,
    fundedOn: local('2025-11-30'),
    firstPaymentOn: local('2026-01-14'),
    basis: 'actual/365',
    payment: 554.34,
  };
  const figures = review(FIELDS);

  it('charges the statement’s 45-day opening period: $315.06', () => {
    const [first] = amortise(figures.terms).rows;
    expect([first.date, first.days, first.interest]).toEqual(['2026-01-14', 45, 315.06]);
    expect(openingCents(3_139_433, 8140, 45)).toBe(31_506);
  });

  it('is the statement’s schedule, row for row, ending on the lender’s maturity date', () => {
    const rows = amortise(figures.terms).rows;
    expect(rows).toEqual(amortise(STATEMENT).rows);
    expect(rows).toHaveLength(72);
    expect(rows[71]).toEqual(expect.objectContaining({ date: '2031-12-14', balance: 0 }));
    // The independent reference's totals for the loan as lent (no statement balance).
    expect([figures.totalInterest, figures.totalPaid]).toEqual([8519.22, 39_913.55]);
  });

  it('quotes the lender’s payoff once the statement’s balance is added', () => {
    const anchored: LoanTerms = {
      ...figures.terms,
      statement: { on: local('2026-08-14'), principal: 28_698.15 },
    };
    const quote = payoffQuote(anchored, local('2026-08-28'));
    expect([quote.payoff, quote.accruedInterest, quote.daysAccrued]).toEqual([28_787.75, 89.6, 14]);
  });

  it('saves the 14th as the first payment’s own day, so no payment day is stored', () => {
    expect(figures.save).toEqual(
      expect.objectContaining({
        firstPaymentOn: '2026-01-14',
        fundedOn: '2025-11-30',
        paymentDay: null,
        monthlyPayment: 554.34,
      }),
    );
    expect(amortise(termsFromStored(stored(figures)) as LoanTerms).rows).toEqual(
      amortise(STATEMENT).rows,
    );
    expect(scheduleLinkRows(figures)).toEqual(amortise(STATEMENT).rows);
  });

  it('left on the default, 30 Dec 2025, it is 30 days and $210.04 of opening interest instead', () => {
    const asDefault = review({ ...FIELDS, firstPaymentOn: local('2025-12-30'), paymentDay: 30 });
    const [first] = amortise(asDefault.terms).rows;
    expect([first.date, first.days, first.interest]).toEqual(['2025-12-30', 30, 210.04]);
    expect(openingCents(3_139_433, 8140, 30)).toBe(21_004);
    // The independent reference: at the same $554.34, 72 payments to 30 Nov 2031, the last $390.42.
    expect([asDefault.totalInterest, asDefault.payoffOn, asDefault.finalPayment]).toEqual([
      8354.23,
      '2031-11-30',
      390.42,
    ]);
  });
});
