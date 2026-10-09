import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useBills } from '@/api/queries';
import { activeLoans } from '@/lib/active-loans';
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
