import { useCallback, useMemo } from 'react';

import { useCharges, type ChargeRow } from '@/api/charges';
import { usePaymentLabels } from '@/api/payment-labels';
import {
  ledgerEntries,
  useBills,
  useLoanPayoffRows,
  useSubscriptions,
  type BillRow,
  type LedgerEntry,
  type LedgerPayoff,
  type PaymentSourceRow,
  type SubscriptionRow,
} from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { countsInSpending } from '@/lib/bill-spending';
import {
  lastChargedBy,
  monthBounds,
  monthOf,
  planMonth,
  type PlanKind,
  type PlanMonth,
} from '@/lib/bill-month';
import { paymentEntries, type PaymentEntry } from '@/lib/payment-entries';
import { paymentFloor } from '@/lib/payment-years';
import { useKnownFree } from '@/lib/pro-status';
import { useUserId } from '@/providers/session-provider';

/**
 * The reads behind the Monthly bills, Subscriptions and payment pages. They are the ledger's own
 * bill and subscription entries, worked out once per change of the data and shared by every page
 * that shows them, so walking from history to a year to search does not walk seven years again.
 */

/** What the ledger's bill and subscription entries are built from. */
export type PlanReads = {
  bills: readonly BillRow[];
  subscriptions: readonly SubscriptionRow[];
  charges: readonly ChargeRow[];
  payoffs: readonly LedgerPayoff[];
};

const NONE: readonly never[] = Object.freeze([]);

const dayOf = (today: string) => new Date(`${today}T00:00:00`);

/**
 * The ledger's bill and subscription entries over a window: `ledgerEntries` itself, with the window
 * held to the seven years the app keeps, as `useLedger` holds it. Receipts, salaries and pay are
 * separate loops in it that no bill or subscription entry reads, so leaving them out changes none of
 * these entries and saves most of the walk.
 */
export function planLedger(
  reads: PlanReads,
  range: { from: string; to: string },
  today: string,
): LedgerEntry[] {
  const kept = historyFloor(true, dayOf(today));
  return ledgerEntries({
    ...reads,
    receipts: NONE,
    salaries: NONE,
    pay: NONE,
    accountOrder: NONE,
    from: range.from > kept ? range.from : kept,
    to: range.to,
    today,
  });
}

type MemoNode<R> = { next: WeakMap<object, MemoNode<R>>; answers: Map<string, R> };

const memoNode = <R>(): MemoNode<R> => ({ next: new WeakMap(), answers: new Map() });

/** Answers kept for one set of reads: enough for a year of months, a day change, a second account. */
const KEPT_ANSWERS = 16;

/**
 * Work done once per set of reads, whichever page asks. Each level is one read's data, compared by
 * identity: a refetch that brings anything new, an invalidate or another account's cache entry is
 * a new object, so it is never answered from the old one, and data the query cache lets go of takes
 * its answers with it. The key tells windows, days and accounts apart on the same data.
 */
function remembered<R>(root: MemoNode<R>, reads: readonly object[], key: string, work: () => R): R {
  let node = root;
  for (const read of reads) {
    let next = node.next.get(read);
    if (!next) {
      next = memoNode<R>();
      node.next.set(read, next);
    }
    node = next;
  }
  if (node.answers.has(key)) return node.answers.get(key)!;
  const answer = work();
  node.answers.set(key, answer);
  if (node.answers.size > KEPT_ANSWERS) node.answers.delete(node.answers.keys().next().value!);
  return answer;
}

const paymentsMemo = memoNode<readonly PaymentEntry[]>();
const monthMemo = memoNode<PlanMonth>();
const lastChargedMemo = new WeakMap<object, ReadonlyMap<string, string>>();

function lastChargedOf(charges: readonly ChargeRow[]): ReadonlyMap<string, string> {
  let found = lastChargedMemo.get(charges);
  if (!found) {
    found = lastChargedBy(charges);
    lastChargedMemo.set(charges, found);
  }
  return found;
}

const NO_READS: PlanReads = { bills: NONE, subscriptions: NONE, charges: NONE, payoffs: NONE };

/**
 * The plans, their charges and payoffs, and the names of where they were paid from. A failed or
 * loading read of any of them holds the page: a missing charges read would swap a recorded amount
 * for a projected one, and a missing label would read as "Card not set".
 */
function usePlanReads() {
  const userId = useUserId();
  const bills = useBills();
  const subscriptions = useSubscriptions();
  const charges = useCharges();
  const payoffs = useLoanPayoffRows();
  const labels = usePaymentLabels();

  // Nothing is worked out from part of the data: the page holds until all of it is in, and the
  // reads land one by one, each of which would otherwise walk every plan again.
  const reads: PlanReads =
    bills.data && subscriptions.data && charges.data && payoffs.data
      ? {
          bills: bills.data,
          subscriptions: subscriptions.data,
          charges: charges.data,
          payoffs: payoffs.data,
        }
      : NO_READS;

  const { refetch: refetchBills } = bills;
  const { refetch: refetchSubscriptions } = subscriptions;
  const { refetch: refetchCharges } = charges;
  const { refetch: refetchPayoffs } = payoffs;
  const { refetch: refetchLabels } = labels;
  const refetch = useCallback(() => {
    refetchBills();
    refetchSubscriptions();
    refetchCharges();
    refetchPayoffs();
    refetchLabels();
  }, [refetchBills, refetchSubscriptions, refetchCharges, refetchPayoffs, refetchLabels]);

  return {
    reads,
    memoKeys: [reads.bills, reads.subscriptions, reads.charges, reads.payoffs],
    /** Two accounts never share an answer, even on data that compares equal. */
    owner: userId ?? '',
    labelOf: labels.labelOf,
    sources: labels.sources,
    isLoading:
      bills.isLoading ||
      subscriptions.isLoading ||
      charges.isLoading ||
      payoffs.isLoading ||
      labels.isLoading,
    isError:
      bills.isError ||
      subscriptions.isError ||
      charges.isError ||
      payoffs.isError ||
      labels.isError,
    refetch,
  };
}

export type PaymentsData = {
  /**
   * Every bill and subscription payment (loan payoffs included) from `paymentFloor(today)` to today,
   * newest first. The whole window, for figures; list only those on or after `listFloor`. Shared by
   * every page, so never changed in place.
   */
  payments: readonly PaymentEntry[];
  /** Where listed rows start: 90 days back on free, the window's first day otherwise. */
  listFloor: string;
  /** Known to be free. An answer not in yet reads as Pro, so a payer never sees rows flash away. */
  free: boolean;
  /** Null for no card or account, or one deleted since. */
  labelOf: (id: string) => string | null;
  /** Every card, then every account; locked ones too. */
  sources: PaymentSourceRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/** Payment history, years, search and export: what went out over the seven calendar years. */
export function usePayments(today: string): PaymentsData {
  const read = usePlanReads();
  const free = useKnownFree();
  const from = paymentFloor(today);

  const payments = remembered(paymentsMemo, read.memoKeys, `${read.owner}|${from}|${today}`, () =>
    Object.freeze(
      paymentEntries(planLedger(read.reads, { from, to: today }, today), read.reads, today),
    ),
  );

  // `useLedger`'s own floor, so free lists the same 90 days everywhere. Pro's seven kept years
  // reach back further than this window, so its rows start where the window does.
  const listFloor = useMemo(() => {
    const floor = historyFloor(!free, dayOf(today));
    return floor > from ? floor : from;
  }, [free, today, from]);

  return {
    payments,
    listFloor,
    free,
    labelOf: read.labelOf,
    sources: read.sources,
    isLoading: read.isLoading,
    isError: read.isError,
    refetch: read.refetch,
  };
}

export type PlanMonthData = {
  view: PlanMonth;
  /** Any plan of the kind at all, stopped ones included: none shows the empty page. */
  hasPlans: boolean;
  /** Null for no source, or one deleted since. */
  labelOf: (id: string) => string | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * One month of bills or subscriptions, for the Monthly bills and Subscriptions pages. A month that
 * is not yyyy-mm shows this month: a hook that throws takes the whole page down.
 */
export function usePlanMonth(kind: PlanKind, asked: string, today: string): PlanMonthData {
  const read = usePlanReads();
  const { bills, subscriptions, charges } = read.reads;
  const month = typeof asked === 'string' && MONTH.test(asked) ? asked : monthOf(today);

  const view = remembered(
    monthMemo,
    read.memoKeys,
    `${read.owner}|${kind}|${month}|${today}`,
    () => {
      const found = planMonth({
        kind,
        month,
        today,
        entries: planLedger(read.reads, monthBounds(month), today),
        bills,
        subscriptions,
        lastCharged: lastChargedOf(charges),
      });
      Object.freeze(found.rows);
      Object.freeze(found.comingUp);
      Object.freeze(found.stopped);
      return Object.freeze(found);
    },
  );

  // A loan kept out of bills is not a bill here, unless the month lists a charge it had as one.
  const hasPlans = useMemo(
    () =>
      (kind === 'bill' ? bills.some(countsInSpending) : subscriptions.length > 0) ||
      view.rows.length > 0 ||
      view.stopped.length > 0,
    [kind, bills, subscriptions, view],
  );

  return {
    view,
    hasPlans,
    labelOf: read.labelOf,
    isLoading: read.isLoading,
    isError: read.isError,
    refetch: read.refetch,
  };
}
