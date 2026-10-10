import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  LOAN_COLUMNS,
  readLoanRow,
  useBills,
  withPaymentOverrides,
  type LoanRow,
} from '@/api/queries';
import { activeLoans, loanBillEnded } from '@/lib/active-loans';
import type { LoanTerms } from '@/lib/loan';
import { loanTermsForBill } from '@/lib/loan-start';
import { withTimeout } from '@/lib/deadline';
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

  return {
    loans,
    isPending: bills.isPending || loanBillIds.isPending,
    // A failed read must not pass for "no loans", which would offer to add one.
    isError: bills.isError || loanBillIds.isError,
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
  /** The bill no longer runs (no next date, or its end date has passed), as of `today`. */
  billEnded: boolean;
};

type RawLoanWithBill = Parameters<typeof readLoanRow>[0] & {
  created_at: string;
  bill: LoanBillSummary | null;
};

/**
 * Every loan the person has saved, oldest first, each with its bill, in one read. Cached under
 * 'loans', which saving a loan invalidates, and which every bill write and bill change from another
 * device invalidates too: renaming or deleting the bill changes, or removes, its loan.
 */
export function useLoans(today: string) {
  const userId = useUserId();
  const query = useQuery({
    queryKey: ['loans', userId, 'list'],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await withPaymentOverrides((overrides) =>
            supabase
              .from('loans')
              .select(
                `${LOAN_COLUMNS}${overrides}, created_at, bill:bills!inner(id, name, icon_id, starts_on, next_due_on, ends_on)`,
              )
              .order('created_at', { ascending: true })
              .order('id', { ascending: true }),
          );
          if (error) throw error;
          return ((data ?? []) as unknown as RawLoanWithBill[])
            .filter((row) => row.bill)
            .map(({ bill, created_at, ...loan }) => ({
              ...readLoanRow(loan),
              created_at,
              bill: bill as LoanBillSummary,
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
 * The terms the schedule is built from. A loan saved without its own first payment date falls back
 * to its bill's first due date: the next due date would restart the schedule today and show no
 * payments made.
 */
export function loanTermsOf(row: LoanListRow): LoanTerms | null {
  return loanTermsForBill(row, row.bill);
}
