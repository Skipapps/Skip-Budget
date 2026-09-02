import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { toIsoDate } from '@/lib/date';

/**
 * The current day, as state.
 *
 * A date computed once at mount freezes: tab screens never unmount and iOS
 * keeps the app alive for days, so "today" read at first launch is still on
 * screen two mornings later. Reading the clock on every render is no better —
 * a backgrounded app does not re-render, and within one render two reads could
 * straddle midnight and put two sections on different days.
 *
 * Holding the day as state gives both halves: every consumer sees one
 * consistent day, and the page turns when the day actually changes — checked
 * on resume from background and once a minute while open. The date is always
 * the device's own local day; the server's UTC clock has no say here.
 */
export function useToday(): { today: string; todayDate: Date } {
  const [today, setToday] = useState(() => toIsoDate(new Date()));

  useEffect(() => {
    const check = () => {
      const fresh = toIsoDate(new Date());
      setToday((held) => (held === fresh ? held : fresh));
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    const timer = setInterval(check, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  const todayDate = useMemo(() => new Date(`${today}T00:00:00`), [today]);
  return { today, todayDate };
}
