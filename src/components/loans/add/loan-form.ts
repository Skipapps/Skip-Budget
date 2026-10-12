import type { LoanDetail } from '@/api/loans';
import type { PaymentSourceRow } from '@/api/queries';
import { loanTypeOf, type LoanType } from '@/data/loan-types';
import { numberMarks, t, type MessageKey } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { amortise, type AccrualBasis, type PaymentOverrideMap } from '@/lib/loan';
import { firstPaymentOn } from '@/lib/loan-first-payment';
import type { LoanReviewField, LoanReviewFields } from '@/lib/loan-review';
import { overrideParams, readLoanRoute, routeDate, type LoanRoute } from '@/lib/loan-route';
import { loanTermsForBill } from '@/lib/loan-start';
import { draftFromAmount } from '@/lib/typed-amount';

export type TermUnit = 'years' | 'months';

/** Everything the Add loan pages hold, as typed. Figures stay drafts until Review prices them. */
export type LoanForm = {
  /** The bank's monthly payment, a keypad draft ("424.8"). */
  monthly: string;
  /** Amount borrowed, a keypad draft. */
  principal: string;
  type: LoanType | null;
  /** Null while the name follows the loan type ("Car loan"); '' once the person clears it. */
  typedName: string | null;
  /** The rate in percent, ASCII digits and "." ("6.25"). */
  rate: string;
  /** Whole years or months, digits only. */
  term: string;
  termUnit: TermUnit;
  /** The day the money landed (`funded_on`), local midnight. */
  startDate: Date | null;
  /** Null while the payment day follows the start date's day. */
  pickedDay: number | null;
  /**
   * The calculator's first payment when the rule would put it elsewhere (yyyy-mm-dd). It stands
   * until the start date or the payment day changes.
   */
  pinnedFirst: string | null;
  /** Null is not answered yet; '' is Skip. */
  sourceId: string | null;
  basis: AccrualBasis;
  /** Single payments changed in the calculator. */
  payments: PaymentOverrideMap | undefined;
};

/** Past this a typed term is a typing slip, not a loan. */
export const TERM_YEARS_MAX = 50;

export function emptyLoanForm(): LoanForm {
  return {
    monthly: '',
    principal: '',
    type: null,
    typedName: null,
    rate: '',
    term: '',
    termUnit: 'years',
    startDate: null,
    pickedDay: null,
    pinnedFirst: null,
    sourceId: null,
    basis: 'actual/365',
    payments: undefined,
  };
}

/**
 * The calculator's loan on the details page. The payment it showed is taken as the bank's, so the
 * page opens on the same loan. Extras and fees stay behind: they were what-ifs.
 */
export function loanFormFromCalculator(route: LoanRoute): LoanForm {
  const months = Number.isInteger(route.months) && route.months > 0 ? route.months : 0;
  const inYears = months > 0 && months % 12 === 0;
  const first = dayOrNull(route.start);
  const startDate = dayOrNull(route.funded);
  const day = route.paymentDay ?? first?.getDate() ?? null;
  const ruled = startDate && day ? firstPaymentOn(startDate, day) : null;
  const pinned =
    first && (!ruled || toIsoDate(ruled) !== toIsoDate(first)) ? toIsoDate(first) : null;

  return {
    ...emptyLoanForm(),
    monthly: draftFromAmount(String(route.overrides.monthlyPayment ?? '')),
    principal: draftFromAmount(String(route.principal)),
    // Without a term this is not the calculator's loan, and an unparsed rate reads as 0%.
    rate: months > 0 ? String(route.annualRate) : '',
    term: months > 0 ? String(inYears ? months / 12 : months) : '',
    termUnit: months > 0 && !inYears ? 'months' : 'years',
    startDate,
    pickedDay: day,
    pinnedFirst: pinned,
    basis: route.basis,
    payments: route.overrides.payments,
  };
}

/**
 * A saved loan on the details page, to be changed: its figures as stored, its first payment pinned
 * where the rule would put it elsewhere, and its name following its type only while it is still the
 * type's own name. A loan saved before types is an Other loan, as it is drawn everywhere.
 */
export function loanFormFromSaved(loan: LoanDetail): LoanForm {
  const terms = loanTermsForBill(loan, loan.bill);
  const route = readLoanRoute({
    amount: String(loan.principal),
    rate: String(loan.annual_rate),
    months: String(loan.term_months),
    start: terms ? toIsoDate(terms.firstPaymentOn) : '',
    day: terms?.paymentDay === undefined ? undefined : String(terms.paymentDay),
    // A loan saved without the day the money landed starts where its schedule does.
    funded: loan.funded_on ?? (terms ? toIsoDate(amortise(terms).fundedOn) : ''),
    basis: loan.day_count_basis,
    ...overrideParams({ monthlyPayment: loan.monthly_payment, payments: terms?.paymentOverrides }),
  });
  const type = loanTypeOf(loan.bill.icon_id) ?? 'other';
  return {
    ...loanFormFromCalculator(route),
    type,
    typedName: loan.bill.name === t(DEFAULT_NAMES[type]) ? null : loan.bill.name,
    sourceId: loan.bill.card_id ?? loan.bill.bank_account_id ?? '',
  };
}

/**
 * The Paid from tiles for a saved loan: what the plan offers, plus the card or account the loan is
 * paid from when the plan would not offer it today (no locks on lapse), among the others of its
 * kind. Unchanged when it is offered already, or the loan has none.
 */
export function withSourceKept(
  offered: readonly PaymentSourceRow[],
  kept: PaymentSourceRow | null,
): readonly PaymentSourceRow[] {
  if (!kept || offered.some((source) => source.id === kept.id)) return offered;
  const cards = offered.filter((source) => source.kind === 'card');
  const accounts = offered.filter((source) => source.kind === 'account');
  return kept.kind === 'card' ? [...cards, kept, ...accounts] : [...cards, ...accounts, kept];
}

/** A yyyy-mm-dd as local midnight; null for nothing or a garbled link. */
function dayOrNull(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = routeDate(iso);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

const DEFAULT_NAMES: Record<LoanType, MessageKey> = {
  personal: 'loanFlow.defaultName.personal',
  car: 'loanFlow.defaultName.car',
  student: 'loanFlow.defaultName.student',
  home: 'loanFlow.defaultName.home',
  business: 'loanFlow.defaultName.business',
  medical: 'loanFlow.defaultName.medical',
  'credit-card': 'loanFlow.defaultName.creditCard',
  other: 'loanFlow.defaultName.other',
};

/** The name box's words: the person's own, else the type's ("Car loan"). */
export function loanName(form: LoanForm): string {
  if (form.typedName !== null) return form.typedName;
  return form.type ? t(DEFAULT_NAMES[form.type]) : '';
}

export function paymentDayOf(form: LoanForm): number | null {
  return form.pickedDay ?? form.startDate?.getDate() ?? null;
}

/** The term in months; NaN while the box is empty. */
export function termMonthsOf(form: LoanForm): number {
  if (!form.term) return Number.NaN;
  const typed = Number(form.term);
  return form.termUnit === 'years' ? typed * 12 : typed;
}

/** The first payment the page shows under the days: the carried one, else the rule's. */
export function firstPaymentOf(form: LoanForm): Date | null {
  if (form.pinnedFirst) return dayOrNull(form.pinnedFirst);
  const day = paymentDayOf(form);
  return form.startDate && day ? firstPaymentOn(form.startDate, day) : null;
}

/** What Review prices. An empty box is passed as nothing, never as zero. */
export function reviewFieldsOf(form: LoanForm): LoanReviewFields {
  return {
    principal: form.principal ? Number(form.principal) : Number.NaN,
    annualRate: form.rate ? Number(form.rate) : Number.NaN,
    termMonths: termMonthsOf(form),
    startDate: form.startDate ?? new Date(Number.NaN),
    paymentDay: paymentDayOf(form) ?? 0,
    monthlyPayment: form.monthly ? Number(form.monthly) : Number.NaN,
    basis: form.basis,
    paymentOverrides: form.payments,
    firstPaymentOn: form.pinnedFirst ? dayOrNull(form.pinnedFirst) : null,
  };
}

type Field = 'type' | 'name' | LoanReviewField | 'source';

/** The page's order, top to bottom, which is the order a missing list names them in. */
const PAGE_ORDER: readonly Field[] = [
  'type',
  'name',
  'monthlyPayment',
  'principal',
  'rate',
  'term',
  'startDate',
  'paymentDay',
  'source',
];

const FIELD_LABELS: Record<Field, MessageKey> = {
  type: 'loan.save.loanType',
  name: 'loanFlow.field.name',
  monthlyPayment: 'loan.monthlyPayment',
  principal: 'loanFlow.field.borrowed',
  rate: 'loanFlow.field.apr',
  term: 'loan.termLabel',
  startDate: 'loanFlow.field.start',
  paymentDay: 'loanFlow.field.paymentDay',
  source: 'loan.save.paidFrom',
};

/**
 * The boxes still empty, by the names they carry on the page, in page order. `priced` is what
 * Review found missing among the figures and dates.
 */
export function missingFields(form: LoanForm, priced: readonly LoanReviewField[]): string[] {
  const missing = new Set<Field>(priced);
  if (!form.type) missing.add('type');
  if (!loanName(form).trim()) missing.add('name');
  if (form.sourceId === null) missing.add('source');
  return PAGE_ORDER.filter((field) => missing.has(field)).map((field) => t(FIELD_LABELS[field]));
}

/** A rate as the box draws it: the language's decimal mark ("6,25" in French). */
export function rateShown(draft: string): string {
  return draft.replace('.', numberMarks().decimal);
}

/**
 * The rate draft from what the box holds now. Digits stay; the first decimal mark, from either
 * keyboard (a phone set to another region sends "," or "."), becomes "."; anything else is left
 * out. Nothing is cut: a rate with more decimals than the loans table keeps is refused on
 * Continue with the reason, never shortened without a word.
 */
export function rateFromTyped(text: string): string {
  const { decimal } = numberMarks();
  let draft = '';
  for (const char of text) {
    if (/[0-9]/.test(char)) draft += char;
    else if ((char === '.' || char === ',' || char === decimal) && !draft.includes('.')) {
      draft += draft ? '.' : '0.';
    }
  }
  return draft;
}

/** A term box takes whole numbers only. */
export function termFromTyped(text: string): string {
  return text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
}
