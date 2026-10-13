import type { Href } from 'expo-router';

import type { BillRow, LedgerEntry, SubscriptionRow } from '@/api/queries';
import { billPageHref } from '@/lib/ledger-link';

/**
 * The payment pages' rows (history, years, search, export): bill and subscription money that has
 * gone out, read off the ledger. A stopped bill's or cancelled subscription's recorded charges are
 * in the ledger, so they are here; a loan payoff is here with its own status.
 */

export type PaymentKind = 'bill' | 'subscription';
export type PaymentKindFilter = 'all' | PaymentKind;
/** Every instalment or renewal that went out is 'paid'; a loan payoff says which kind it was. */
export type PaymentStatus = 'paid' | 'paidOff' | 'extraPayment';

export type PaymentEntry = {
  id: string;
  /** yyyy-mm-dd */
  date: string;
  /** As recorded: a renamed plan's earlier charges keep the name they went out under. */
  name: string;
  /** The plan's name now, so a search finds charges recorded under an older one; null if unknown. */
  planName: string | null;
  /** What went out, positive. */
  amount: number;
  kind: PaymentKind;
  status: PaymentStatus;
  /** The card or account it came out of; '' when none was set. */
  sourceId: string;
  planId: string | null;
  categoryId: string | null;
  iconId: string | null;
  domain: string | null;
  logoHidden: boolean;
};

const PAYOFF_STATUS: Record<NonNullable<LedgerEntry['payoff']>, PaymentStatus> = {
  full: 'paidOff',
  partial: 'extraPayment',
};

/** Newest first; one day's payments by id, compared by code unit so no locale reorders them. */
function byNewest(a: PaymentEntry, b: PaymentEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Every bill and subscription payment in a ledger dated today or earlier, newest first. A later
 * date is a forecast, not a payment. Today counts: a charge is recorded on its due date.
 */
export function paymentEntries(
  entries: readonly LedgerEntry[],
  plans: {
    bills: readonly Pick<BillRow, 'id' | 'name'>[];
    subscriptions: readonly Pick<SubscriptionRow, 'id' | 'name'>[];
  },
  today: string,
): PaymentEntry[] {
  // Bills and subscriptions are separate tables, so an id is only unique within its kind.
  const names: Record<PaymentKind, Map<string, string>> = {
    bill: new Map(plans.bills.map((row) => [row.id, row.name])),
    subscription: new Map(plans.subscriptions.map((row) => [row.id, row.name])),
  };

  const payments: PaymentEntry[] = [];
  for (const entry of entries) {
    if (entry.kind !== 'bill' && entry.kind !== 'subscription') continue;
    if (entry.date > today) continue;
    const planId = entry.planId ?? null;
    payments.push({
      id: entry.id,
      date: entry.date,
      name: entry.label,
      planName: planId ? (names[entry.kind].get(planId) ?? null) : null,
      amount: Math.abs(entry.amount),
      kind: entry.kind,
      status: entry.payoff ? PAYOFF_STATUS[entry.payoff] : 'paid',
      sourceId: entry.sourceId,
      planId,
      categoryId: entry.categoryId ?? null,
      iconId: entry.iconId ?? null,
      domain: entry.domain ?? null,
      logoHidden: Boolean(entry.logoHidden),
    });
  }
  return payments.sort(byNewest);
}

/** The rows a tab shows: all of them, or one kind. */
export function ofKind<T extends { kind: PaymentKind }>(
  rows: readonly T[],
  kind: PaymentKindFilter,
): T[] {
  return kind === 'all' ? [...rows] : rows.filter((row) => row.kind === kind);
}

/**
 * The page a payment row opens: its plan's page, never an edit form. A payoff opens its loan
 * whatever its bill is filed under. Null when the plan is unknown: the row is then not pressable.
 */
export function paymentHref(
  payment: Pick<PaymentEntry, 'kind' | 'status' | 'planId' | 'categoryId'>,
): Href | null {
  const id = payment.planId;
  if (!id) return null;
  if (payment.status !== 'paid') return { pathname: '/loan/[id]', params: { id } };
  return payment.kind === 'bill'
    ? billPageHref(id, payment.categoryId)
    : { pathname: '/subscription/[id]', params: { id } };
}

const YEAR = /^\d{4}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** A route param as one string: expo-router hands a repeated one over as an array. */
function oneParam(value: unknown): string | null {
  const first = Array.isArray(value) ? (value as unknown[])[0] : value;
  if (typeof first === 'number') return String(first);
  return typeof first === 'string' ? first : null;
}

/** `kind` from a link: anything but the three the pages know is the fallback. */
export function parseKind(value: unknown, fallback: PaymentKindFilter): PaymentKindFilter {
  const asked = oneParam(value);
  return asked === 'all' || asked === 'bill' || asked === 'subscription' ? asked : fallback;
}

/**
 * `year` from a link, held between the floor's year and this year. Anything that is not a year
 * (missing, a typo, a date) is this year.
 */
export function parseYear(value: unknown, today: string, floor: string): number {
  const thisYear = Number(today.slice(0, 4));
  const asked = oneParam(value);
  if (asked === null || !YEAR.test(asked)) return thisYear;
  return Math.min(Math.max(Number(asked), Number(floor.slice(0, 4))), thisYear);
}

/** 'yyyy-mm' moved by whole months. */
function shiftMonth(month: string, by: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + by;
  const year = Math.floor(index / 12);
  const number = index - year * 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(number).padStart(2, '0')}`;
}

/**
 * `month` (yyyy-mm) from a link, held between the floor's month and `ahead` months after this one.
 * Anything that is not a month is this month.
 */
export function parseMonth(value: unknown, today: string, floor: string, ahead = 12): string {
  const thisMonth = today.slice(0, 7);
  const asked = oneParam(value);
  if (asked === null || !MONTH.test(asked)) return thisMonth;
  const floorMonth = floor.slice(0, 7);
  const first = floorMonth < thisMonth ? floorMonth : thisMonth;
  const last = shiftMonth(thisMonth, Math.max(0, ahead));
  return asked < first ? first : asked > last ? last : asked;
}
