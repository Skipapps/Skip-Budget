import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { toIsoDate } from '@/lib/date';

/**
 * The current day as state, always the device's local day (never the server's UTC).
 *
 * Computing it once at mount freezes it: tab screens never unmount and iOS keeps the app alive
 * for days. Reading the clock every render is no better: a backgrounded app does not re-render,
 * and two reads in one render could straddle midnight. So the day is held as state and re-checked
 * on resume from background and once a minute.
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
