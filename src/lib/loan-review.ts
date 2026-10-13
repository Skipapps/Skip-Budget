/**
 * The Review page's figures for a loan typed into the Add Loan flow, from the same engine and the
 * same terms the Loans page, the bill page and the schedule read back once it is saved: the bank's
 * payment as typed is the contract payment, and the last payment takes up any difference.
 *
 * Fields → terms (the first payment as picked, the start date as `funded_on`, the payment day as
 * the anchor) → `scheduleWithOverrides` → figures, the values `save_loan` takes, and the params that
 * open `/loan-schedule` on exactly this schedule.
 *
 * The opening period is the engine's: interest from the start date to the first payment, on the
 * days between them, posted once with the first payment (`runSchedule`), however short or long.
 */

import { toIsoDate } from '@/lib/date';
import {
  payoffDate,
  type AccrualBasis,
  type LoanPayoff,
  type LoanTerms,
  type PaymentOverrideMap,
} from '@/lib/loan';
import { paymentDayFits } from '@/lib/loan-first-payment';
import {
  paymentOverridesJson,
  scheduleWithOverrides,
  type OverrideProblem,
} from '@/lib/loan-overrides';
import { overrideParams, payoffParams, rateSavable, type LoanRouteParams } from '@/lib/loan-route';
import type { NextLoanPayment } from '@/lib/loan-status';
import { fromCents, wholeCents } from '@/lib/money';

/** What the details page holds. */
export type LoanReviewFields = {
  /** Amount borrowed. */
  principal: number;
  /** The rate in percent, as typed: 6.25 is 6.25%. */
  annualRate: number;
  termMonths: number;
  /** The Start date field, the day the money landed (`funded_on`). */
  startDate: Date;
  /** The First payment field: any day after the start date. Null while it is empty. */
  firstPaymentOn: Date | null;
  /**
   * The day later payments fall on (`LoanTerms.paymentDay`): the first payment's own day, or, when
   * that is a short month's last day, a later day it stands for (31 for every month's end).
   */
  paymentDay: number;
  /** The bank's monthly payment, as typed. */
  monthlyPayment: number;
  /** Defaults to daily interest, actual/365, the app's default. */
  basis?: AccrualBasis;
  /** Single payments changed in the calculator, carried over. */
  paymentOverrides?: PaymentOverrideMap;
  /**
   * A saved loan's payoffs (`termsFromStored(...).payoffs`), when it is edited: every figure, and
   * the last payment `update_loan` ends the bill on, then follow them.
   */
  payoffs?: readonly LoanPayoff[];
};

export type LoanReviewField =
  'principal' | 'rate' | 'term' | 'startDate' | 'firstPayment' | 'monthlyPayment';

export type LoanReviewRefusal =
  /**
   * Missing or unusable, in the page's order. 'firstPayment' also covers a payment day the first
   * payment cannot carry, which the page never sends.
   */
  | { reason: 'fields'; fields: LoanReviewField[] }
  /** Outside 0–100%, or more decimals than the loans table keeps (`loan.save.rateOutOfRange`). */
  | { reason: 'rate' }
  /** The first payment is on or before the start date: there would be no days of interest. */
  | { reason: 'first-payment' }
  /**
   * The monthly payment cannot clear the loan; `problem.minimum` is the least that can, as
   * `refusalText(problem)` says it.
   */
  | { reason: 'payment'; problem: OverrideProblem }
  /**
   * The start date is after a payoff already made (the earliest such, yyyy-mm-dd and amount): the
   * schedule would take it as paid on the start, with none of the interest it really paid.
   */
  | { reason: 'start-after-payoff'; on: string; amount: number };

/** The money part of `useSaveLoan`'s values, as `save_loan` files it. */
export type LoanReviewSave = {
  principal: number;
  annualRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  /** yyyy-mm-dd */
  firstPaymentOn: string;
  /** yyyy-mm-dd, the start date. */
  fundedOn: string;
  dayCountBasis: AccrualBasis;
  /** As `paymentOverridesJson` writes them; null for none. */
  paymentOverrides: Record<string, number> | null;
  /** yyyy-mm-dd of the last payment when it comes before the term's end, else null. */
  lastPaymentOn: string | null;
  /**
   * The payment day when the first payment's own day is not it (it was clamped: day 31, first due
   * 28 Feb), else null, as the anchor then changes nothing.
   */
  paymentDay: number | null;
};

export type LoanReviewFigures = {
  /** The terms every figure is read from, as `termsFromStored` reads the saved loan back. */
  terms: LoanTerms;
  /** yyyy-mm-dd */
  firstPaymentOn: string;
  /** The regular payment: the bank's, as typed. */
  monthlyPayment: number;
  /** The schedule's real count, which a payment above the solved one can bring under the term. */
  paymentCount: number;
  termMonths: number;
  totalInterest: number;
  /** Everything repaid: the amount borrowed plus the interest. */
  totalPaid: number;
  /** The last payment, which takes up the difference. */
  finalPayment: number;
  /**
   * The last payment is more than two regular ones: the payment barely clears the loan in its
   * term. Allowed, with the calculator's warning (`loan.calculator.balloon`, `finalPayment`).
   */
  balloon: boolean;
  /** Payments dated on or before today, which count as made, as on the Loans page. */
  paymentsMade: number;
  /** The first payment after today; null when every payment is already behind it. */
  nextPayment: NextLoanPayment | null;
  /** yyyy-mm-dd of the schedule's last payment, or of the payoff that clears it. */
  payoffOn: string;
  /** yyyy-mm-dd of the term's last due date. */
  termEndsOn: string;
  /** Changed payments carried over that no longer fit these terms: left out and not saved. */
  dropped: OverrideProblem[];
  /** Changed payments the loan is paid off before: not saved. */
  unused: number[];
  save: LoanReviewSave;
  /** Opens `/loan-schedule` (read-only, no draft) on exactly this schedule. */
  scheduleParams: LoanRouteParams;
};

export type LoanReview =
  { ok: false; refusal: LoanReviewRefusal } | ({ ok: true } & LoanReviewFigures);

const isDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

/** A local calendar day, without the time of day a picker or `new Date()` may carry. */
const calendarDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const positiveCents = (amount: number) => {
  const cents = wholeCents(amount);
  return cents !== null && cents > 0 ? cents : null;
};

/** `today` is the device's local day as yyyy-mm-dd (`useToday`), as `loanStatus` takes it. */
export function loanReview(fields: LoanReviewFields, today: string): LoanReview {
  const principalCents = positiveCents(fields.principal);
  const paymentCents = positiveCents(fields.monthlyPayment);
  const start = isDate(fields.startDate) ? calendarDay(fields.startDate) : null;
  const first = isDate(fields.firstPaymentOn) ? calendarDay(fields.firstPaymentOn) : null;

  const missing: LoanReviewField[] = [];
  if (principalCents === null) missing.push('principal');
  if (!Number.isFinite(fields.annualRate)) missing.push('rate');
  if (!Number.isInteger(fields.termMonths) || fields.termMonths < 1) missing.push('term');
  if (!start) missing.push('startDate');
  if (!first || !paymentDayFits(first, fields.paymentDay)) missing.push('firstPayment');
  if (paymentCents === null) missing.push('monthlyPayment');
  if (missing.length > 0 || !start || !first || principalCents === null || paymentCents === null) {
    return { ok: false, refusal: { reason: 'fields', fields: missing } };
  }
  if (!rateSavable(fields.annualRate)) return { ok: false, refusal: { reason: 'rate' } };
  const startedOn = toIsoDate(start);
  const paidBefore = (fields.payoffs ?? [])
    .map((payoff) => ({ on: toIsoDate(payoff.on), amount: payoff.amount }))
    .filter((payoff) => payoff.on < startedOn)
    .sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0))[0];
  // Before the first payment's own check: an earlier start, which it asks for, mends both.
  if (paidBefore) {
    return { ok: false, refusal: { reason: 'start-after-payoff', ...paidBefore } };
  }
  if (toIsoDate(first) <= startedOn) return { ok: false, refusal: { reason: 'first-payment' } };

  const basis = fields.basis ?? 'actual/365';
  const terms: LoanTerms = {
    principal: fromCents(principalCents),
    annualRatePercent: fields.annualRate,
    months: fields.termMonths,
    firstPaymentOn: first,
    paymentDay: fields.paymentDay,
    fundedOn: start,
    basis,
    payoffs: fields.payoffs && fields.payoffs.length > 0 ? fields.payoffs : undefined,
  };
  const priced = scheduleWithOverrides(terms, {
    monthlyPayment: fromCents(paymentCents),
    payments: fields.paymentOverrides ?? {},
  });

  const monthly = priced.problems.find((problem) => problem.payment === 'monthly');
  if (monthly) return { ok: false, refusal: { reason: 'payment', problem: monthly } };

  // No extras here, so the schedule is the contract: what is saved and what is read back.
  const contract = priced.contract;
  const rows = contract.rows;
  const next = rows.findIndex((row) => row.date > today);
  const made = next === -1 ? rows.length : next;
  const upcoming = next === -1 ? null : rows[next];

  const firstOn = toIsoDate(first);
  const fundedOn = startedOn;
  const payoffOn = contract.payoffOn ?? firstOn;
  const termEndsOn = toIsoDate(payoffDate(first, fields.termMonths, fields.paymentDay));
  const savedTerms: LoanTerms = {
    ...terms,
    payment: contract.payment,
    paymentOverrides: priced.applied.payments,
  };
  const overrides = paymentOverridesJson(priced.applied.payments);
  const storedDay = first.getDate() === fields.paymentDay ? null : fields.paymentDay;

  return {
    ok: true,
    terms: savedTerms,
    firstPaymentOn: firstOn,
    monthlyPayment: contract.payment,
    paymentCount: rows.length,
    termMonths: fields.termMonths,
    totalInterest: contract.totalInterest,
    totalPaid: contract.totalPaid,
    finalPayment: contract.finalPayment,
    balloon: priced.balloon,
    paymentsMade: made,
    nextPayment: upcoming
      ? { number: upcoming.number, date: upcoming.date, amount: upcoming.payment }
      : null,
    payoffOn,
    termEndsOn,
    dropped: priced.problems,
    unused: priced.unused,
    save: {
      principal: terms.principal,
      annualRate: fields.annualRate,
      termMonths: fields.termMonths,
      monthlyPayment: contract.payment,
      totalInterest: contract.totalInterest,
      firstPaymentOn: firstOn,
      fundedOn,
      dayCountBasis: basis,
      paymentOverrides: overrides,
      lastPaymentOn: payoffOn < termEndsOn ? payoffOn : null,
      paymentDay: storedDay,
    },
    scheduleParams: {
      amount: String(terms.principal),
      rate: String(fields.annualRate),
      months: String(fields.termMonths),
      start: firstOn,
      funded: fundedOn,
      basis,
      ...(storedDay === null ? {} : { day: String(storedDay) }),
      ...overrideParams({
        monthlyPayment: contract.payment,
        payments: priced.applied.payments,
      }),
      ...payoffParams(terms.payoffs),
    },
  };
}
