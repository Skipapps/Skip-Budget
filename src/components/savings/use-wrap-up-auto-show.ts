import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useWrapUpDue } from '@/api/savings';
import { useUserId } from '@/providers/session-provider';

/**
 * Wrap-ups on screen since launch, however they were opened, per person: someone else signing in on
 * this phone still gets their own.
 */
const shown = new Set<string>();
const keyOf = (userId: string, month: string) => `${userId}:${month}`;

/** The wrap-up page says it is showing `month`, so the auto-show never opens it a second time. */
export function noteWrapUpShown(userId: string | null | undefined, month: string): void {
  if (userId) shown.add(keyOf(userId, month));
}

/**
 * The tab screens: the only places the wrap-up opens over by itself. Never over a form someone is
 * filling in, sign-in or setup, and never over the wrap-up the 9:00 notification already opened.
 */
const TABS = new Set(['/home', '/cards', '/transactions', '/settings']);

/**
 * Opens last month's wrap-up once, the first time a tab shows after the month has closed. Seen is
 * marked by the page itself; until that lands, this session will not open it again.
 */
export function useWrapUpAutoShow(): void {
  const due = useWrapUpDue();
  const pathname = usePathname();
  const userId = useUserId();

  useEffect(() => {
    if (!due || !userId || shown.has(keyOf(userId, due)) || !TABS.has(pathname)) return;
    shown.add(keyOf(userId, due));
    router.push({ pathname: '/wrap-up', params: { month: due } });
  }, [due, pathname, userId]);
}
