import type { LoanDetail } from '@/api/loans';
import type { PaymentSourceRow } from '@/api/queries';
import { loanTypeOf, type LoanType } from '@/data/loan-types';
import { numberMarks, t, type MessageKey } from '@/i18n';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { LATE_DAYS, dayOrdinal } from '@/lib/due-day';
import { amortise, type AccrualBasis, type PaymentOverrideMap } from '@/lib/loan';
import {
  defaultFirstPayment,
  firstPaymentProblem,
  latestFirstPayment,
  paymentDayChoices,
  paymentDayFits,
  type FirstPaymentProblem,
} from '@/lib/loan-first-payment';
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
  /**
   * The first payment (yyyy-mm-dd) once it is set: picked on the page, or carried in from the
   * calculator or the saved loan. Null while it follows the start date (`defaultFirstPayment`).
   */
  pickedFirst: string | null;
  /**
   * The payment day picked with the month-end chips. Null for the first payment's default; ignored
   * unless the first payment is a short month's last day and the day is one of the chips.
   */
  pickedDay: number | null;
  /**
   * The dates and payment day the calculator or the saved loan came with. While the first payment
   * is theirs, their day is its default; while the start is theirs, the page takes a first payment
   * up to theirs, however far past the year (the limit guards a slip in this calendar, not a loan
   * set up elsewhere). A saved loan's first payment is a fact, so it never follows the start.
   */
  carried: { start: string; first: string; day: number; saved: boolean } | null;
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
    pickedFirst: null,
    pickedDay: null,
    carried: null,
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
  return formFromRoute(route, false);
}

function formFromRoute(route: LoanRoute, saved: boolean): LoanForm {
  const months = Number.isInteger(route.months) && route.months > 0 ? route.months : 0;
  const inYears = months > 0 && months % 12 === 0;
  const first = dayOrNull(route.start);
  const startDate = dayOrNull(route.funded);

  return {
    ...emptyLoanForm(),
    monthly: draftFromAmount(String(route.overrides.monthlyPayment ?? '')),
    principal: draftFromAmount(String(route.principal)),
    // Without a term this is not the calculator's loan, and an unparsed rate reads as 0%.
    rate: months > 0 ? String(route.annualRate) : '',
    term: months > 0 ? String(inYears ? months / 12 : months) : '',
    termUnit: months > 0 && !inYears ? 'months' : 'years',
    startDate,
    ...firstPaymentCarried(startDate, first, route.paymentDay ?? first?.getDate() ?? 0, saved),
    basis: route.basis,
    payments: route.overrides.payments,
  };
}

/**
 * A first payment handed over with its payment day. From the calculator, on the start date's
 * default with the day the default would give, it follows the start date like an untouched one; on
 * the default with another day, that day is the chips' answer. Anywhere else, and always for a saved
 * loan, it is set, and its dates and day carried.
 */
function firstPaymentCarried(
  startDate: Date | null,
  first: Date | null,
  day: number,
  saved: boolean,
): Pick<LoanForm, 'pickedFirst' | 'pickedDay' | 'carried'> {
  if (!first) return { pickedFirst: null, pickedDay: null, carried: null };
  const fits = paymentDayFits(first, day) ? day : first.getDate();
  const onDefault = startDate ? defaultFirstPayment(startDate) : null;
  if (!saved && startDate && onDefault && sameDay(onDefault, first)) {
    return {
      pickedFirst: null,
      pickedDay: fits === startDate.getDate() ? null : fits,
      carried: null,
    };
  }
  return {
    pickedFirst: toIsoDate(first),
    pickedDay: null,
    carried: {
      start: startDate ? toIsoDate(startDate) : '',
      first: toIsoDate(first),
      day: fits,
      saved,
    },
  };
}

/**
 * A saved loan on the details page, to be changed: its figures as stored, its first payment and
 * payment day as saved, and its name following its type only while it is still the type's own
 * name. A loan saved before types is an Other loan, as it is drawn everywhere.
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
    ...formFromRoute(route, true),
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

const sameDay = (a: Date, b: Date) => toIsoDate(a) === toIsoDate(b);

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

/** The first payment: as set, else a month after the start date. Null with neither. */
export function firstPaymentOf(form: LoanForm): Date | null {
  if (form.pickedFirst) return dayOrNull(form.pickedFirst);
  return form.startDate ? defaultFirstPayment(form.startDate) : null;
}

/**
 * The day the first payment stands for when no chip is picked: the start date's for the untouched
 * default (a 31 Jan start, first due 28 Feb, is paid at each month's end), the carried day for a
 * carried date, and the date's own day for a date picked here.
 */
function defaultDayOf(form: LoanForm, first: Date): number {
  const fromStart = form.pickedFirst === null ? form.startDate?.getDate() : undefined;
  const fromCarried =
    form.carried && form.carried.first === form.pickedFirst ? form.carried.day : undefined;
  const day = fromStart ?? fromCarried;
  return day !== undefined && paymentDayFits(first, day) ? day : first.getDate();
}

/**
 * The payment day chips, when the first payment is the last day of a month shorter than 31 days
 * and so could mean that day or every month's end. Null when the date says it on its own.
 */
export function paymentDayChoicesOf(form: LoanForm): number[] | null {
  const first = firstPaymentOf(form);
  return first ? paymentDayChoices(first, defaultDayOf(form, first)) : null;
}

/** The day later payments fall on (31 is the last day of each month); null with no first payment. */
export function paymentDayOf(form: LoanForm): number | null {
  const first = firstPaymentOf(form);
  if (!first) return null;
  const choices = paymentDayChoices(first, defaultDayOf(form, first));
  if (!choices) return first.getDate();
  if (form.pickedDay !== null && choices.includes(form.pickedDay)) return form.pickedDay;
  return defaultDayOf(form, first);
}

/** A new start date: an untouched first payment moves with it; a set one stays where it is. */
export function withStartDate(form: LoanForm, startDate: Date): Partial<LoanForm> {
  return form.pickedFirst === null ? { startDate, pickedDay: null } : { startDate };
}

/**
 * A first payment picked in the calendar. The date already shown changes nothing, chips included.
 * The start date's default goes back to following the start (not on a saved loan, whose first
 * payment never moves by itself); the carried date takes its carried day again; any other date is
 * its own day until a chip says otherwise.
 */
export function withFirstPayment(form: LoanForm, day: Date): Partial<LoanForm> {
  const on = toIsoDate(day);
  const shown = firstPaymentOf(form);
  if (shown && toIsoDate(shown) === on) return {};
  const onDefault = form.startDate ? defaultFirstPayment(form.startDate) : null;
  if (!form.carried?.saved && onDefault && toIsoDate(onDefault) === on) {
    return { pickedFirst: null, pickedDay: null };
  }
  return { pickedFirst: on, pickedDay: null };
}

/**
 * The last first payment the page takes for this start: a year on, or the carried first payment
 * when that is later and the start is still the carried one.
 */
export function latestFirstPaymentOf(form: LoanForm): Date | null {
  if (!form.startDate) return null;
  const latest = latestFirstPayment(form.startDate);
  const carried =
    form.carried && form.carried.start === toIsoDate(form.startDate)
      ? dayOrNull(form.carried.first)
      : null;
  return latest && carried && carried > latest ? carried : latest;
}

/**
 * What is wrong with the first payment against the start date, if anything: not after it, or later
 * than the page takes (`latestFirstPaymentOf`).
 */
export function firstPaymentProblemOf(form: LoanForm): FirstPaymentProblem | null {
  const first = firstPaymentOf(form);
  if (!form.startDate || !first) return null;
  const problem = firstPaymentProblem(form.startDate, first);
  if (problem !== 'too-late') return problem;
  const latest = latestFirstPaymentOf(form);
  return latest && toIsoDate(first) <= toIsoDate(latest) ? null : problem;
}

/** The line under the First payment: the day later payments fall on. */
export function paymentRhythm(day: number): string {
  if (day >= 31) return t('loanFlow.rhythm.monthEnd');
  if (day >= LATE_DAYS) return t('loanFlow.rhythm.lateDay', { day: dayOrdinal(day) });
  return t('loanFlow.rhythm.day', { day: dayOrdinal(day) });
}

/** What the month-end chips choose, said above them so VoiceOver reads the chips in context. */
export const paymentDayChoiceTitle = () => t('loanFlow.monthEnd.label');

/** A month-end chip: "On the 28th", or "Last day of each month" for 31. */
export function paymentDayChoiceLabel(day: number): string {
  return day >= 31
    ? t('loanFlow.monthEnd.lastDay')
    : t('loanFlow.monthEnd.onDay', { day: dayOrdinal(day) });
}

/** The words under the First payment, and on Continue, for a date that does not fit the start. */
export function firstPaymentHint(problem: FirstPaymentProblem, startDate: Date): string {
  const latest = latestFirstPayment(startDate);
  return problem === 'too-late' && latest
    ? t('loanFlow.firstDate.tooLate', { date: formatFullDate(latest) })
    : t('loanFlow.firstDate.notAfterStart');
}

/** The term in months; NaN while the box is empty. */
export function termMonthsOf(form: LoanForm): number {
  if (!form.term) return Number.NaN;
  const typed = Number(form.term);
  return form.termUnit === 'years' ? typed * 12 : typed;
}

/** What Review prices. An empty box is passed as nothing, never as zero. */
export function reviewFieldsOf(form: LoanForm): LoanReviewFields {
  return {
    principal: form.principal ? Number(form.principal) : Number.NaN,
    annualRate: form.rate ? Number(form.rate) : Number.NaN,
    termMonths: termMonthsOf(form),
    startDate: form.startDate ?? new Date(Number.NaN),
    firstPaymentOn: firstPaymentOf(form),
    paymentDay: paymentDayOf(form) ?? 0,
    monthlyPayment: form.monthly ? Number(form.monthly) : Number.NaN,
    basis: form.basis,
    paymentOverrides: form.payments,
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
  'firstPayment',
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
  firstPayment: 'loanFlow.field.firstPayment',
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
