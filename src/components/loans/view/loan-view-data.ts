import type { LoanDetail } from '@/api/loans';
import type { PaymentSourceRow } from '@/api/queries';
import { dayMonth } from '@/components/loans/day-month';
import { loanEnding, type LoanEnding } from '@/components/loans/loan-ending';
import { localDate } from '@/components/loans/loan-words';
import { loanTypeOf, type LoanType } from '@/data/loan-types';
import { t } from '@/i18n';
import { loanPricingDay } from '@/lib/active-loans';
import { formatFullDate } from '@/lib/date';
import { loanTermsForBill } from '@/lib/loan-start';
import { loanStatus, type LoanStatus } from '@/lib/loan-status';
import {
  loanHistory,
  loanScheduleParams,
  upcomingPayments,
  type LoanHistory,
  type LoanPayment,
} from '@/lib/loan-view';
import type { LoanRouteParams } from '@/lib/loan-route';

/** As many as the page shows before See all. */
export const UPCOMING_SHOWN = 4;
export const HISTORY_SHOWN = 3;

export type LoanView = {
  billId: string;
  name: string;
  type: LoanType;
  status: LoanStatus;
  ending: LoanEnding;
  /** yyyy-mm-dd it ended: its last payment, or the bill's end date for a stopped loan. */
  endedOn: string | null;
  /** The next payments, soonest first; none once the loan is finished. */
  upcoming: LoanPayment[];
  /** Every payment made, newest first. */
  history: LoanHistory;
  /** Null when its whole schedule cannot be opened (a loan pinned to a statement balance). */
  scheduleParams: LoanRouteParams | null;
  /** Null is no card or account (Skip). */
  paidFrom: PaymentSourceRow | null;
};

/**
 * Where a saved loan stands, every figure off its own schedule, as the Loans page reads it: on
 * `today`, or on the day its bill stopped when that came first (`loanPricingDay`), so a stopped
 * loan lists no payment after it stopped. Null when the stored loan gives no schedule.
 */
export function loanViewOf(loan: LoanDetail, today: string): LoanView | null {
  const terms = loanTermsForBill(loan, loan.bill);
  if (!terms) return null;
  const day = loanPricingDay(loan.bill, today);
  const status = loanStatus(terms, day);
  const { ending, endedOn } = loanEnding(loan.bill, status, today);
  return {
    billId: loan.bill.id,
    name: loan.bill.name,
    // A loan saved before loan types is drawn as Other, as everywhere else.
    type: loanTypeOf(loan.bill.icon_id) ?? 'other',
    status,
    ending,
    endedOn,
    // A finished loan has nothing coming, whatever its schedule held past the stop.
    upcoming: ending ? [] : upcomingPayments(terms, day, UPCOMING_SHOWN),
    history: loanHistory(terms, day),
    scheduleParams: loanScheduleParams(terms),
    paidFrom: loan.source,
  };
}

/** The name a card or account goes by on its Paid from tile. */
export function sourceName(source: PaymentSourceRow): string {
  return source.name || source.label;
}

/** "Chase ••4821", or the name alone with no digits given. */
export function paidFromText(source: PaymentSourceRow): string {
  return source.last4 ? `${sourceName(source)} ••${source.last4}` : sourceName(source);
}

/** The same, as VoiceOver should say it: it reads "••" as bullets. */
export function paidFromSpoken(source: PaymentSourceRow): string {
  return source.last4
    ? t('ui.source.endingIn', { name: sourceName(source), last4: source.last4 })
    : sourceName(source);
}

/**
 * A payment's date on the page: "27 Oct" within this year, where the year goes without saying, and
 * with it otherwise ("27 Jan 2027"). VoiceOver always reads the year (`formatFullDate`).
 */
export function pageDate(iso: string, today: string): string {
  const date = localDate(iso);
  return iso.slice(0, 4) === today.slice(0, 4) ? dayMonth(date) : formatFullDate(date);
}

export function spokenDate(iso: string): string {
  return formatFullDate(localDate(iso));
}
