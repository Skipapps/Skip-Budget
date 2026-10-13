import { router, type Href } from 'expo-router';
import { useEffect, useId, useState } from 'react';

import { monthOf } from '@/lib/bill-month';
import { CURRENT_PERIOD, shownMonth, shownYear, type InsightsPeriod } from '@/lib/insights';
import { onPaymentPicked } from '@/lib/payment-pick';
import { useNavigateOnce } from '@/lib/use-navigate-once';

const yearOf = (day: string) => Number(day.slice(0, 4));

/** What Choose month and Choose year are opened with. */
export type PeriodPickerParams = {
  kind: InsightsPeriod['mode'];
  /** This page's id on the pick bus. */
  owner: string;
  /** yyyy-mm or yyyy: the one ticked. */
  selected: string;
};

/** The picker page's href for these params; the route that draws Insights supplies it. */
export type PeriodPickerHref = (params: PeriodPickerParams) => Href;

/**
 * The period What goes out shows, and the ways to change it. A pick of the current month or year is
 * kept as null, "the current one", so a page left open across the 1st moves on with the calendar.
 * Switching to Year shows the year of the month on screen; switching back shows that month again.
 * Choose month and Choose year hand their pick back over the pick bus, to this page's own id.
 */
export function useInsightsPeriod(
  today: string,
  pickerHref: PeriodPickerHref,
): {
  period: InsightsPeriod;
  setMode: (mode: InsightsPeriod['mode']) => void;
  /** Opens Choose month or Choose year for the side on screen. */
  choose: () => void;
} {
  const owner = useId();
  const once = useNavigateOnce();
  const [period, setPeriod] = useState<InsightsPeriod>(CURRENT_PERIOD);

  useEffect(
    () =>
      onPaymentPicked(owner, 'month', (pick) =>
        setPeriod((held) => ({
          ...held,
          mode: 'month',
          month: pick.month === monthOf(today) ? null : pick.month,
        })),
      ),
    [owner, today],
  );
  useEffect(
    () =>
      onPaymentPicked(owner, 'year', (pick) =>
        setPeriod((held) => ({
          mode: 'year',
          year: pick.year === yearOf(today) ? null : pick.year,
          // A month picked in another year would come back on Month as if it belonged to this one.
          month: held.month && yearOf(held.month) !== pick.year ? null : held.month,
        })),
      ),
    [owner, today],
  );

  const setMode = (mode: InsightsPeriod['mode']) =>
    setPeriod((held) => {
      if (held.mode === mode) return held;
      if (mode === 'month') return { ...held, mode };
      const year = yearOf(shownMonth(held, today));
      return { ...held, mode, year: year === yearOf(today) ? null : year };
    });

  const choose = () =>
    once(() =>
      router.push(
        pickerHref({
          kind: period.mode,
          owner,
          selected:
            period.mode === 'month' ? shownMonth(period, today) : String(shownYear(period, today)),
        }),
      ),
    );

  return { period, setMode, choose };
}
