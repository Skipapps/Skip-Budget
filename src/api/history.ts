import { useMemo } from 'react';

import { historyFloor } from '@/lib/allowance';
import { useProStatus } from '@/lib/pro-status';
import { useToday } from '@/lib/use-today';

/**
 * Whether lists are cut to the free window: only once the plan is known to be free, so someone who
 * paid never sees their history flash shorter while Pro is still being checked. Reads the shared
 * store, not the purchases module, so list screens never load the store SDK.
 */
export function useListsFree(): boolean {
  const { pro, ready } = useProStatus();
  return ready && !pro;
}

/**
 * The earliest day this account's plan lists (yyyy-mm-dd), for screens that list history without
 * the ledger (which applies it itself). `free` says whether to tell somebody older rows are kept.
 */
export function useHistoryFloor(): { floor: string; free: boolean } {
  const free = useListsFree();
  const { todayDate } = useToday();
  const floor = useMemo(() => historyFloor(!free, todayDate), [free, todayDate]);
  return { floor, free };
}
