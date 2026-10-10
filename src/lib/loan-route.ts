import type { AccrualBasis, LoanTerms } from '@/lib/loan';
import {
  paymentOverridesJson,
  readPaymentOverrides,
  type PaymentOverrides,
} from '@/lib/loan-overrides';
import { wholeCents } from '@/lib/money';

/** What the loan pages are opened with: plain ASCII figures, so no language changes them. */
export type LoanRouteParams = {
  amount?: string;
  rate?: string;
  months?: string;
  /** yyyy-mm-dd of the first payment. */
  start?: string;
  /** yyyy-mm-dd the money landed. */
  funded?: string;
  basis?: string;
  /** The payment the lender bills, when known; it wins over the solved one. */
  payment?: string;
  extra?: string;
  lump?: string;
  lumpOn?: string;
  /** Prepaid finance charges. Left out when not known, which is not the same as none. */
  fees?: string;
  /** The loan's own name, for a loan already on file. */
  name?: string;
  /** The bank's monthly payment, typed in place of the one the app works out. */
  monthly?: string;
  /** Single payments changed on the schedule, as `paymentOverridesJson` writes them. */
  overrides?: string;
  /** The open calculator's draft (`loan-draft.ts`); without it the changes are read-only. */
  draft?: string;
  /** The payment page's subject: 'monthly' or a payment number. */
  target?: string;
};

const BASES: readonly AccrualBasis[] = ['actual/365', 'actual/360', '30/360', 'monthly'];

/** Only the app's own conventions get through a hand-edited link. */
export function parseBasis(value: string | undefined): AccrualBasis {
  return BASES.find((basis) => basis === value) ?? 'actual/365';
}

/** A yyyy-mm-dd as local midnight: these dates have no time zone. */
export function routeDate(value: string | undefined): Date | undefined {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

const atLeastZero = (value: string | undefined) => Math.max(0, Number(value) || 0);

/** The figures a loan page was opened with; a missing or garbled one reads as nothing. */
export function readLoanRoute(params: LoanRouteParams) {
  return {
    principal: Number(params.amount) || 0,
    annualRate: Number(params.rate) || 0,
    months: Number(params.months) || 0,
    start: params.start ?? '',
    funded: params.funded ?? '',
    basis: parseBasis(params.basis),
    payment: atLeastZero(params.payment),
    extraMonthly: atLeastZero(params.extra),
    lumpSum: atLeastZero(params.lump),
    lumpOn: params.lumpOn ?? '',
    fees: params.fees === undefined ? null : atLeastZero(params.fees),
    name: params.name ?? '',
    overrides: readOverrides(params),
    draft: params.draft ?? '',
  };
}

export type LoanRoute = ReturnType<typeof readLoanRoute>;

function readOverrides(params: LoanRouteParams): PaymentOverrides {
  const overrides: PaymentOverrides = {};
  const monthly = Number(params.monthly);
  const cents = wholeCents(monthly);
  if (params.monthly && cents !== null && cents > 0) overrides.monthlyPayment = monthly;
  const payments = readPaymentOverrides(params.overrides);
  if (payments) overrides.payments = payments;
  return overrides;
}

/** The changes as params, leaving out what is not set. */
export function overrideParams(
  overrides: PaymentOverrides,
): Pick<LoanRouteParams, 'monthly' | 'overrides'> {
  const params: Pick<LoanRouteParams, 'monthly' | 'overrides'> = {};
  if (overrides.monthlyPayment !== undefined) params.monthly = String(overrides.monthlyPayment);
  const payments = paymentOverridesJson(overrides.payments);
  if (payments) params.overrides = JSON.stringify(payments);
  return params;
}

/**
 * The loan a page was opened with. `withExtras` adds the overpayments; the contract, which is what
 * is saved and what a change is checked against, leaves them out.
 */
export function termsFromRoute(
  route: LoanRoute,
  { withExtras }: { withExtras: boolean },
): LoanTerms {
  const lumpOn = routeDate(route.lumpOn);
  return {
    principal: route.principal,
    annualRatePercent: route.annualRate,
    months: route.months,
    firstPaymentOn: routeDate(route.start) ?? new Date(),
    fundedOn: routeDate(route.funded),
    basis: route.basis,
    // A loan on file carries the payment the lender actually bills, which can sit a cent from the
    // solved one. When passed, it wins.
    payment: route.payment > 0 ? route.payment : undefined,
    extra: withExtras
      ? {
          monthly: route.extraMonthly,
          lumpSums: route.lumpSum > 0 && lumpOn ? [{ on: lumpOn, amount: route.lumpSum }] : [],
        }
      : undefined,
  };
}

/** A typed loan amount: anything above zero, however far past the slider's ends. */
export function typedAmount(draft: string): number | null {
  const value = Number(draft);
  return draft.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}

/** A typed rate: zero or more, however far past the slider's end. An empty draft is not zero. */
export function typedRate(draft: string): number | null {
  const value = Number(draft);
  return draft.trim() !== '' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** The highest rate the loans table accepts (its check). */
export const SAVABLE_RATE_MAX = 100;

/** The loans column keeps nine decimals, whole billionths of a percent, as the engine posts them. */
const RATE_UNITS_PER_PERCENT = 1e9;

/**
 * Whether a rate can be filed exactly as priced; past these the database refuses it, or rounds it
 * to nine decimals without a word. Read as the engine reads a rate: scaled, then corrected at 15
 * significant digits, so 7.4995 is whole billionths though 7.4995 × 1e9 is not exact in floating
 * point.
 */
export function rateSavable(rate: number): boolean {
  if (!Number.isFinite(rate) || rate < 0 || rate > SAVABLE_RATE_MAX) return false;
  return Number.isInteger(Number((rate * RATE_UNITS_PER_PERCENT).toPrecision(15)));
}

/** The loan itself as params, without extras or changes: what the payment pages are opened with. */
export function baseParams(route: LoanRoute): LoanRouteParams {
  const params: LoanRouteParams = {
    amount: String(route.principal),
    rate: String(route.annualRate),
    months: String(route.months),
    start: route.start,
    funded: route.funded,
    basis: route.basis,
  };
  if (route.payment > 0) params.payment = String(route.payment);
  return params;
}
