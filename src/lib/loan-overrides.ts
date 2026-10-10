/**
 * The person's own numbers on top of the engine's: the bank's monthly payment in place of the one
 * the app works out, and single payments changed on the schedule. Every balance after a change is
 * recomputed by `amortise` itself, so day counts, monthly rests, lump sums, statement anchors and
 * the once-per-period rounding behave exactly as they do without changes.
 *
 * Nothing re-solves the level payment: the last payment takes up every difference, so a higher
 * payment makes it smaller or ends the loan early, and a lower one makes it larger.
 *
 * What is refused, each with a reason the screen can put into words:
 * - Anything but a positive amount in whole cents. A zero payment would be a skipped one, which a
 *   fixed-term contract does not allow.
 * - A monthly payment that cannot keep up with the interest: below `steadyPayment` (the costliest
 *   month's interest on the most the loan can owe after the first payment, on the loan's own
 *   convention) and below the app's own figure too. Allowing either keeps a bank's real payment:
 *   on daily accrual a 31-day month can cost more than the app's own payment on a long, high-rate
 *   loan (15% over 30 years). A payment under both is still taken when it closes the loan without
 *   a balloon (a bank's figure a cent under the app's); otherwise its shortfall would compound.
 * - A changed payment below the interest its period charges, which would grow the balance. Where
 *   the regular payment itself falls short of that period's interest (a long opening period) the
 *   floor is the regular payment. Where the regular payment is under `steadyPayment`, the loan is
 *   only kept on course by it, so a single payment may be raised but not lowered.
 * - The term's last payment, which is always what is left.
 *
 * Together these keep every allowed schedule within what was borrowed plus the opening interest,
 * or under the app's own schedule, so no figure can run away.
 *
 * A change above what is owed on its date becomes the last payment (the engine pays exactly what is
 * owed) and is kept as typed, so it still pays the loan off after an earlier payment changes.
 * Changes after it are reported as unused rather than refused.
 */

import {
  amortise,
  solvePayment,
  steadyPayment,
  type Amortisation,
  type LoanTerms,
  type PaymentOverrideMap,
  type ScheduleRow,
} from '@/lib/loan';
import { fromCents, toCents, wholeCents } from '@/lib/money';

export { readPaymentOverrides } from '@/lib/loan';

export type PaymentOverrides = {
  /** The bank's regular payment, in place of the one the app works out (or `terms.payment`). */
  monthlyPayment?: number;
  /**
   * Single payments changed on the schedule, by 1-based payment number. When given it is the whole
   * set and replaces `terms.paymentOverrides`, so leaving a number out resets that payment.
   */
  payments?: PaymentOverrideMap;
};

export type OverrideRefusal =
  /** Not a finite amount in whole cents. */
  | 'not-an-amount'
  /** Zero or less: a skipped payment. */
  | 'zero'
  /** Leaves interest unpaid, so the balance would grow. `minimum` is the least taken. */
  | 'below-interest'
  /** Not a payment number at all (below 1, or not whole). */
  | 'no-such-payment'
  /** The term's last payment, which is always what is left. */
  | 'last-payment';

export type OverrideProblem = {
  /** The monthly payment, or the payment number that was refused. */
  payment: 'monthly' | number;
  reason: OverrideRefusal;
  /** For 'below-interest': the least amount that is taken. */
  minimum?: number;
};

export type AppliedOverrides = {
  /**
   * The terms with every accepted change folded in (`payment` and `paymentOverrides`). Give these to
   * `amortise`, `comparePrepayment` or `payoffQuote` and they all follow the changes.
   */
  terms: LoanTerms;
  /** What the app works out for these terms with nothing typed. */
  solvedPayment: number;
  /** The least monthly payment at which the balance never rises after the first (see loan.ts). */
  steadyPayment: number;
  /**
   * The changes the schedule took, as they should be saved: refused, unused and no-op changes left
   * out, each as typed (a change above what was owed is kept, and still pays the loan off).
   */
  applied: PaymentOverrides;
  /** Refused changes, which the schedule leaves out. Saving should wait until this is empty. */
  problems: OverrideProblem[];
  /** Changed payments the loan never reaches: paid off before them, or past the term. */
  unused: number[];
  /**
   * The schedule as it will be saved: the changes, no extras or lump sums. The contract side of
   * `comparePrepayment`, what the APR disclosure and Save use, and the same rows as
   * `amortise(terms)` once extras are left out.
   */
  contract: Amortisation;
};

export type OverriddenSchedule = Amortisation &
  Omit<AppliedOverrides, 'terms'> & {
    /** How many payments the loan takes; a higher payment can end it before the term. */
    paymentCount: number;
    /** The contract term, which `paymentCount` never exceeds. */
    termMonths: number;
    /**
     * The contract's last payment is more than two regular ones: a typed payment that barely
     * covers the interest (or a bank's balloon contract). Allowed, but worth saying on screen.
     */
    balloon: boolean;
  };

export type PaymentChoice = {
  number: number;
  /** yyyy-mm-dd */
  date: string;
  /** The payment as the schedule has it now: changed, regular, or cut to what is owed. */
  current: number;
  /** The amount the person set for this payment, as typed (above `owed` when it pays off), or null. */
  typed: number | null;
  /** What it would be with no change: the level payment, or what is owed if that is less. */
  regular: number;
  /** The least a change may be (see the rules above). */
  minimum: number;
  /** What closes the loan on this date. A change above it is taken as exactly this. */
  owed: number;
  /** This period's interest, which the payment covers first. */
  interest: number;
  overridden: boolean;
  /** The term's last payment: it is what is left, so it cannot be changed. */
  locked: boolean;
};

const byPayment = (a: OverrideProblem, b: OverrideProblem) =>
  (a.payment === 'monthly' ? -Infinity : a.payment) -
  (b.payment === 'monthly' ? -Infinity : b.payment);

function monthlyProblem(
  terms: LoanTerms,
  amount: number,
  solvedPayment: number,
  steady: number,
): OverrideProblem | null {
  const cents = wholeCents(amount);
  if (cents === null) return { payment: 'monthly', reason: 'not-an-amount' };
  if (cents <= 0) return { payment: 'monthly', reason: 'zero' };
  // Taken without a run at the steady payment or the app's own, whichever is less.
  const floor = Math.min(toCents(steady), toCents(solvedPayment));
  if (cents >= floor) return null;
  const run = amortise({
    ...terms,
    extra: undefined,
    paymentOverrides: undefined,
    payment: fromCents(cents),
  });
  if (toCents(run.finalPayment) <= 2 * cents) return null;
  return { payment: 'monthly', reason: 'below-interest', minimum: fromCents(floor) };
}

/**
 * The least a change to this row may be: its interest, or the level payment where that is lower;
 * and never under the level payment when that payment is all that keeps the loan on course.
 */
const minimumCents = (row: ScheduleRow, levelCents: number, keepsUp: boolean) =>
  keepsUp ? Math.max(1, Math.min(toCents(row.interest), levelCents)) : levelCents;

/**
 * Checks the person's numbers against the contract (extras left out, since they are what-ifs and
 * are never saved) and folds the accepted ones into the terms.
 */
export function applyOverrides(
  terms: LoanTerms,
  overrides: PaymentOverrides = {},
): AppliedOverrides {
  const problems: OverrideProblem[] = [];
  const unused: number[] = [];
  const solvedPayment = solvePayment(terms);
  const steady = steadyPayment(terms);
  const otherwise = terms.payment ?? solvedPayment;

  let payment = otherwise;
  let monthlyPayment: number | undefined;
  if (overrides.monthlyPayment !== undefined) {
    const problem = monthlyProblem(terms, overrides.monthlyPayment, solvedPayment, steady);
    if (problem) {
      problems.push(problem);
    } else {
      payment = fromCents(wholeCents(overrides.monthlyPayment) as number);
      if (toCents(payment) !== toCents(otherwise)) monthlyPayment = payment;
    }
  }

  const levelCents = toCents(payment);
  const keepsUp = levelCents >= toCents(steady);
  const asked: Record<number, number> = {};
  for (const [key, amount] of Object.entries(overrides.payments ?? terms.paymentOverrides ?? {})) {
    const number = Number(key);
    const cents = wholeCents(amount);
    if (!Number.isInteger(number) || number < 1) {
      problems.push({ payment: number, reason: 'no-such-payment' });
    } else if (number > terms.months) {
      unused.push(number);
    } else if (number === terms.months) {
      problems.push({ payment: number, reason: 'last-payment' });
    } else if (cents === null) {
      problems.push({ payment: number, reason: 'not-an-amount' });
    } else if (cents <= 0) {
      problems.push({ payment: number, reason: 'zero' });
    } else if (!keepsUp && cents < levelCents) {
      problems.push({ payment: number, reason: 'below-interest', minimum: fromCents(levelCents) });
    } else {
      asked[number] = fromCents(cents);
    }
  }

  // The engine leaves out a change below its floor and does not mark one that changes nothing, so
  // this run is the saved schedule itself, and its rows tell what was taken.
  const contract = amortise({ ...terms, extra: undefined, payment, paymentOverrides: asked });
  const payments: Record<number, number> = {};
  for (const number of Object.keys(asked).map(Number)) {
    const row = contract.rows[number - 1];
    if (!row) {
      unused.push(number);
    } else if (row.overridden) {
      payments[number] = asked[number];
    } else if (
      // Not taken, and not the same as the regular payment either: refused, never silently dropped.
      Math.min(toCents(asked[number]), toCents(row.owed)) !==
      Math.min(levelCents, toCents(row.owed))
    ) {
      problems.push({
        payment: number,
        reason: 'below-interest',
        minimum: fromCents(minimumCents(row, levelCents, keepsUp)),
      });
    }
  }

  const applied: PaymentOverrides = {};
  if (monthlyPayment !== undefined) applied.monthlyPayment = monthlyPayment;
  if (Object.keys(payments).length > 0) applied.payments = payments;

  return {
    terms: { ...terms, payment, paymentOverrides: applied.payments },
    solvedPayment,
    steadyPayment: steady,
    applied,
    problems: problems.sort(byPayment),
    unused: unused.sort((a, b) => a - b),
    contract,
  };
}

const hasExtra = (terms: LoanTerms) =>
  (terms.extra?.monthly ?? 0) > 0 || (terms.extra?.lumpSums?.length ?? 0) > 0;

/**
 * The schedule with the person's changes, extras and lump sums included as `amortise` has them,
 * plus what was refused and the totals the screens show: `paymentCount`, `payoffOn` (the last
 * payment's date), `finalPayment`, `totalInterest` and `totalPaid` (everything repaid). With extras,
 * `contract` is the same loan without them, so this one call is the whole calculator: the saving
 * is `contract.totalInterest − totalInterest`, as `comparePrepayment` reports it.
 */
export function scheduleWithOverrides(
  terms: LoanTerms,
  overrides: PaymentOverrides = {},
): OverriddenSchedule {
  const { terms: applied, ...checked } = applyOverrides(terms, overrides);
  const schedule = hasExtra(terms) ? amortise(applied) : checked.contract;
  return {
    ...schedule,
    ...checked,
    paymentCount: schedule.rows.length,
    termMonths: terms.months,
    balloon: toCents(checked.contract.finalPayment) > 2 * toCents(checked.contract.payment),
  };
}

/**
 * Whether one typed figure would be taken, before it is applied: null when it would, else why not.
 * For a single payment, the changes already made before it count, as they set its balance.
 */
export function checkOverride(
  terms: LoanTerms,
  overrides: PaymentOverrides,
  target: 'monthly' | number,
  amount: number,
): OverrideProblem | null {
  if (target === 'monthly') {
    return monthlyProblem(terms, amount, solvePayment(terms), steadyPayment(terms));
  }
  const next = { ...overrides, payments: { ...overrides.payments, [target]: amount } };
  return applyOverrides(terms, next).problems.find((problem) => problem.payment === target) ?? null;
}

/**
 * What the page for one payment needs, on the contract (extras left out, as they are not saved):
 * the payment now, what it would be unchanged, the least a change may be, and what pays the loan
 * off that day. Null when the loan is paid off before this payment.
 */
export function paymentChoice(
  terms: LoanTerms,
  overrides: PaymentOverrides,
  number: number,
): PaymentChoice | null {
  const { terms: applied, contract, steadyPayment: steady } = applyOverrides(terms, overrides);
  const row = contract.rows[number - 1];
  if (!row) return null;

  const levelCents = toCents(applied.payment ?? 0);
  const keepsUp = levelCents >= toCents(steady);
  const owedCents = toCents(row.owed);
  const locked = number === terms.months;

  return {
    number,
    date: row.date,
    current: row.payment,
    typed: applied.paymentOverrides?.[number] ?? null,
    regular: fromCents(locked ? owedCents : Math.min(levelCents, owedCents)),
    minimum: fromCents(minimumCents(row, levelCents, keepsUp)),
    owed: row.owed,
    interest: row.interest,
    overridden: row.overridden,
    locked,
  };
}

/**
 * Changed payments as the `loans.payment_overrides` jsonb holds them (string keys, amounts as JSON
 * numbers, which Postgres keeps as exact numerics), or null for none. Also fine as a route param
 * once stringified; `readPaymentOverrides` reads either back.
 */
export function paymentOverridesJson(
  payments: PaymentOverrideMap | undefined,
): Record<string, number> | null {
  const json: Record<string, number> = {};
  for (const [key, amount] of Object.entries(payments ?? {})) {
    const cents = wholeCents(amount);
    if (cents !== null && cents > 0) json[key] = fromCents(cents);
  }
  return Object.keys(json).length > 0 ? json : null;
}
