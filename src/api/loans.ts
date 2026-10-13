import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  accountSource,
  cardSource,
  LOAN_COLUMNS,
  readLoanRow,
  readPayoffRows,
  useBills,
  useLoanPayoffRows,
  withLoanPayoffs,
  withNewerLoanColumns,
  type BankAccountRow,
  type CardRow,
  type LoanPayoffRow,
  type LoanRow,
  type PaymentSourceRow,
} from '@/api/queries';
import { activeLoans, loanBillEnded } from '@/lib/active-loans';
import { countsInSpending, withSpendingFlag } from '@/lib/bill-spending';
import type { LoanTerms } from '@/lib/loan';
import { loanTermsForBill } from '@/lib/loan-start';
import { withTimeout } from '@/lib/deadline';
import { anyRefreshFailed, failedEmpty } from '@/lib/query-state';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * Which bills have a loan behind them. Only the ids: the bill row already holds the name and the
 * dates, and the bills are read for the balances anyway. Keyed under 'loans', which saving a loan
 * and the realtime feed both invalidate.
 */
function useLoanBillIds() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['loans', userId, 'bill-ids'],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase.from('loans').select('bill_id');
          if (error) throw error;
          return ((data ?? []) as { bill_id: string }[]).map((row) => row.bill_id);
        })(),
        12_000,
        'Could not load your loans. Check your connection and try again.',
      ),
  });
}

/** The loans still being paid, by name and the bill each one lives behind. */
export function useActiveLoans(today: string) {
  const bills = useBills();
  const loanBillIds = useLoanBillIds();

  const loans = useMemo(
    () => activeLoans(bills.data ?? [], loanBillIds.data ?? [], today),
    [bills.data, loanBillIds.data, today],
  );

  // A failed read must not pass for "no loans", which would offer to add one.
  const isError = failedEmpty(bills) || failedEmpty(loanBillIds);
  return {
    loans,
    isPending: bills.isPending || loanBillIds.isPending,
    isError,
    /** The list shows, from a reload that failed behind it (RefreshNote). */
    refreshFailed: !isError && anyRefreshFailed([bills, loanBillIds]),
    refetch: () => {
      void bills.refetch();
      void loanBillIds.refetch();
    },
  };
}

/** The bill a loan lives behind, as the Loans page shows it. */
export type LoanBillSummary = {
  id: string;
  name: string;
  /** The loan's type, 'loan-<type>' (src/data/loan-types.ts); null for one saved before types. */
  icon_id: string | null;
  /** The bill's first due date: a loan saved without its own first payment date counts from here. */
  starts_on: string | null;
  next_due_on: string | null;
  ends_on: string | null;
};

/** A saved loan with its bill: everything `termsFromStored` needs, and what the card shows. */
export type LoanListRow = LoanRow & {
  /** When it was saved; the list's order. */
  created_at: string;
  bill: LoanBillSummary;
  /** Its payoffs, oldest first; `termsFromStored` reads them as `StoredLoan.payoffs`. */
  payoffs: LoanPayoffRow[];
  /** The bill no longer runs (no next date, or its end date has passed), as of `today`. */
  billEnded: boolean;
};

type RawLoanWithBill = Parameters<typeof readLoanRow>[0] & {
  created_at: string;
  bill: LoanBillSummary | null;
  payoffs?: unknown;
};

/**
 * Every loan the person has saved, oldest first, each with its bill and its payoffs. Cached under
 * 'loans', which saving a loan or a payoff invalidates, and which every bill write and bill change
 * from another device invalidates too: renaming or deleting the bill changes, or removes, its loan,
 * and a payoff always writes its bill.
 */
export function useLoans(today: string) {
  const userId = useUserId();
  const query = useQuery({
    queryKey: ['loans', userId, 'list'],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await withLoanPayoffs((payoffs) =>
            withNewerLoanColumns((newer) =>
              supabase
                .from('loans')
                .select(
                  `${LOAN_COLUMNS}${newer}, created_at${payoffs}, bill:bills!inner(id, name, icon_id, starts_on, next_due_on, ends_on)`,
                )
                .order('created_at', { ascending: true })
                .order('id', { ascending: true }),
            ),
          );
          if (error) throw error;
          return ((data ?? []) as unknown as RawLoanWithBill[])
            .filter((row) => row.bill)
            .map(({ bill, created_at, payoffs, ...loan }) => ({
              ...readLoanRow(loan),
              created_at,
              bill: bill as LoanBillSummary,
              payoffs: readPayoffRows(payoffs),
            }));
        })(),
        12_000,
        'Could not load your loans. Check your connection and try again.',
      ),
  });

  const loans = useMemo<LoanListRow[]>(
    () => (query.data ?? []).map((row) => ({ ...row, billEnded: loanBillEnded(row.bill, today) })),
    [query.data, today],
  );

  return {
    loans,
    isPending: query.isPending,
    // A failed read must not pass for "no loans", which would show the empty page's invitation.
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}

/**
 * The terms the schedule is built from, for a Loans page row or a loan's own page. A loan saved
 * without its own first payment date falls back to its bill's first due date: the next due date
 * would restart the schedule today and show no payments made.
 */
export function loanTermsOf(
  row: LoanRow & { bill: Pick<LoanBillSummary, 'starts_on'> },
): LoanTerms | null {
  return loanTermsForBill(row, row.bill);
}

/** A loan's bill as its own page and its edit page need it. */
export type LoanDetailBill = LoanBillSummary & {
  /** The monthly payment the bill charges. */
  amount: number;
  category_id: string;
  card_id: string | null;
  bank_account_id: string | null;
  /** "Add to monthly bills"; true on a database without the column, where every bill counted. */
  in_spending: boolean;
  created_at: string;
};

/** A saved loan with its bill, where its payments come from, and its payoffs, read in one go. */
export type LoanDetail = LoanRow & {
  created_at: string;
  bill: LoanDetailBill;
  /** The bill's card or account, as the Paid from tiles draw it; null for Skip (none, or deleted). */
  source: PaymentSourceRow | null;
  /**
   * Its payoffs, oldest first, each with its own card or account; `termsFromStored` reads them as
   * `StoredLoan.payoffs`. None on a database without them.
   */
  payoffs: LoanPayoffRow[];
};

/**
 * What a bill id led to: its loan; a bill with no loan behind it (an old Loans & Credit bill, which
 * keeps the bill page); or nothing at all (deleted here or on another device, or not this person's).
 */
export type LoanDetailRead =
  { kind: 'loan'; loan: LoanDetail } | { kind: 'bill' } | { kind: 'gone' };

const DETAIL_BILL_COLUMNS =
  'id, name, icon_id, category_id, amount, starts_on, next_due_on, ends_on, card_id, bank_account_id, created_at';
const DETAIL_SOURCE_COLUMNS =
  'card:cards(id, holder, network, last4, color), account:bank_accounts(id, bank_name, nickname, last4, color)';

type RawLoanDetail = Omit<LoanDetailBill, 'amount' | 'in_spending'> & {
  amount: number | string;
  in_spending?: boolean;
  // One-to-one through loans.bill_id's unique key, so an object; a list on a server that does not
  // see it so.
  loan:
    | (Parameters<typeof readLoanRow>[0] & { created_at: string; payoffs?: unknown })
    | unknown[]
    | null;
  card: Pick<CardRow, 'id' | 'holder' | 'network' | 'last4' | 'color'> | null;
  account: Pick<BankAccountRow, 'id' | 'bank_name' | 'nickname' | 'last4' | 'color'> | null;
};

/** The read's row as the page uses it; exported for its tests. */
export function readLoanDetail(raw: RawLoanDetail | null): LoanDetailRead {
  if (!raw) return { kind: 'gone' };
  const embedded = Array.isArray(raw.loan) ? (raw.loan[0] ?? null) : raw.loan;
  if (!embedded) return { kind: 'bill' };
  const {
    created_at: loanCreatedAt,
    payoffs,
    ...loan
  } = embedded as Parameters<typeof readLoanRow>[0] & { created_at: string; payoffs?: unknown };
  const { loan: _loan, card, account, amount, in_spending, ...bill } = raw;
  return {
    kind: 'loan',
    loan: {
      ...readLoanRow(loan),
      created_at: loanCreatedAt,
      bill: { ...bill, amount: Number(amount), in_spending: countsInSpending({ in_spending }) },
      source: card ? cardSource(card) : account ? accountSource(account) : null,
      payoffs: readPayoffRows(payoffs),
    },
  };
}

/**
 * One loan for its own page, its edit page and its Pay off page: the loan with its payoffs, its
 * bill and the bill's paid-from source, in one read from the bill's side, so a bill with no loan
 * behind it and a bill that is gone read differently. A failed read is an error, never "gone".
 * Cached under 'loans', which saving or editing a loan, a payoff, every bill write (deleting the
 * bill deletes the loan), card and account writes, and the realtime feed all invalidate.
 */
export function useLoanDetail(billId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['loans', userId, 'detail', billId],
    enabled: Boolean(userId && billId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await withLoanPayoffs((payoffs) =>
            withNewerLoanColumns((newer) =>
              withSpendingFlag((flag) =>
                supabase
                  .from('bills')
                  .select(
                    `${DETAIL_BILL_COLUMNS}${flag}, loan:loans(${LOAN_COLUMNS}${newer}, created_at${payoffs}), ${DETAIL_SOURCE_COLUMNS}`,
                  )
                  .eq('id', billId!)
                  .maybeSingle(),
              ),
            ),
          );
          if (error) throw error;
          return readLoanDetail(data as unknown as RawLoanDetail | null);
        })(),
        12_000,
        'Could not load your loan. Check your connection and try again.',
      ),
  });
}

/**
 * One loan's payoffs, oldest first (by date, then as recorded), each with its own card or account.
 * The same read as the ledger's, so the two never disagree; none on a database without them.
 */
export function useLoanPayoffs(billId: string | undefined) {
  const query = useLoanPayoffRows();
  const payoffs = useMemo(
    () => (billId ? (query.data ?? []).filter((row) => row.bill_id === billId) : []),
    [query.data, billId],
  );
  return {
    payoffs,
    isPending: query.isPending,
    // A failed read must not pass for "no payoffs", which would show the loan as never paid down.
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
