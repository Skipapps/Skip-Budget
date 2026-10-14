import { useQuery } from '@tanstack/react-query';

import { withTimeout } from '@/lib/deadline';
import { supabase } from '@/lib/supabase';
import { useToday } from '@/lib/use-today';
import { useUserId } from '@/providers/session-provider';

/**
 * The receipts read by camera or upload this month, as the database keeps them for the free
 * allowance: one row per receipt read, still there after the receipt is deleted
 * (20261013100002_capture_usage.sql).
 */

export type CaptureUsageRow = { source: string; created_at: string };

/** A database without the table yet: PostgREST has none (PGRST205), Postgres none (42P01). */
const lacksUsage = (error: { code?: string } | null) =>
  error?.code === 'PGRST205' || error?.code === '42P01';

/**
 * Null when the database has no usage table yet, so the allowance counts receipts as it used to.
 * Keyed on the month it starts from, so the 1st reads afresh.
 */
export function useCaptureUsage() {
  const userId = useUserId();
  const { todayDate } = useToday();
  const since = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString();

  return useQuery({
    queryKey: ['capture_usage', userId, since],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async (): Promise<CaptureUsageRow[] | null> => {
          const { data, error } = await supabase
            .from('capture_usage')
            .select('source, created_at')
            .gte('created_at', since);
          if (lacksUsage(error)) return null;
          if (error) throw error;
          return (data ?? []) as CaptureUsageRow[];
        })(),
        12_000,
        'Could not count your scans. Check your connection and try again.',
      ),
  });
}
