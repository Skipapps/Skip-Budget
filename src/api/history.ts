import { useMemo } from 'react';

import { historyFloor } from '@/lib/allowance';
import { useKnownFree } from '@/lib/pro-status';
import { useToday } from '@/lib/use-today';

/**
 * The earliest day this account's plan lists (yyyy-mm-dd), for screens that list history without
 * the ledger (which applies it itself). `free` says whether to tell somebody older rows are kept.
 */
export function useHistoryFloor(): { floor: string; free: boolean } {
  // The shared store, not the purchases module, so list screens never load the store SDK.
  const free = useKnownFree();
  const { todayDate } = useToday();
  const floor = useMemo(() => historyFloor(!free, todayDate), [free, todayDate]);
  return { floor, free };
}
