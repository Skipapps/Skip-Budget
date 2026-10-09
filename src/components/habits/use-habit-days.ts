import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTapHabitDay, useUntapHabitDay, type TappableHabit } from '@/api/habits';
import { t } from '@/i18n';
import { weekdayLong } from '@/i18n/calendar';
import { formatFullDate } from '@/lib/date';
import { failureMessage } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { isCurrentWeek, type HabitTap } from '@/lib/habit-week';
import { success, warn } from '@/lib/haptics';
import { useConfirm } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';

/** A day being filled or emptied, drawn as done before the server says so. */
type Pending = {
  habitId: string;
  day: string;
  kind: 'tap' | 'untap';
  /** The receipt an undo removes. */
  receiptId?: string;
  /** What the filled circle stands for meanwhile: the habit's price. */
  amount: number;
  /**
   * The request came back fine. It stays until the taps are read again and show it: the hooks
   * refresh the taps after answering, and dropping it sooner would blink the circle back.
   */
  done: boolean;
  /**
   * A read after the answer did not show it. A read that set out before the answer can miss it;
   * the one after cannot, so a second miss means the day really changed elsewhere.
   */
  missed?: boolean;
};

const sameDay = (pending: Pending, habitId: string, day: string) =>
  pending.habitId === habitId && pending.day === day;

/** Whether the taps as read already say what this request did. */
function shown(pending: Pending, taps: readonly HabitTap[]): boolean {
  return pending.kind === 'tap'
    ? taps.some((tap) => tap.habitId === pending.habitId && tap.day === pending.day)
    : !taps.some((tap) => tap.receiptId === pending.receiptId);
}

/** "Remove Monday’s Coffee ($5.00)?", "Remove today’s …", or with the date for older weeks. */
export function removeTitle(name: string, tap: HabitTap, today: string): string {
  const amount = formatCurrency(tap.amount);
  const date = new Date(`${tap.day}T00:00:00`);
  if (tap.day === today) return t('habits.remove.titleToday', { name, amount });
  if (isCurrentWeek(tap.day, today)) {
    return t('habits.remove.title', { weekday: weekdayLong(date.getDay()), name, amount });
  }
  return t('habits.remove.titleDate', { name, date: formatFullDate(date), amount });
}

/**
 * Filling and emptying days, for every card on a page. A day fills the moment it is tapped and
 * empties the moment its removal is confirmed; a failure puts it back and raises `failed` for the
 * page's one failure line, which the next success clears. A day ignores taps while its request is
 * in flight.
 */
export function useHabitDays(taps: readonly HabitTap[] | undefined, today: string) {
  const tapDay = useTapHabitDay();
  const untapDay = useUntapHabitDay();
  const confirm = useConfirm();
  const toast = useToast();
  const [pending, setPending] = useState<Pending[]>([]);
  const [failed, setFailed] = useState(false);

  // The latest read, for a request that answers after the taps it changed have already landed.
  const latest = useRef(taps);
  useEffect(() => {
    latest.current = taps;
  }, [taps]);

  // A new read of the taps retires the requests it shows. Done while rendering, not in an effect,
  // so the read and the retired circle are drawn in the same frame.
  const [seen, setSeen] = useState(taps);
  if (seen !== taps) {
    setSeen(taps);
    if (taps && pending.some((entry) => entry.done)) {
      setPending(
        pending.flatMap((entry) => {
          if (!entry.done) return [entry];
          if (shown(entry, taps) || entry.missed) return [];
          return [{ ...entry, missed: true }];
        }),
      );
    }
  }

  const settle = useCallback((habitId: string, day: string) => {
    setPending((list) =>
      list.flatMap((entry) => {
        if (!sameDay(entry, habitId, day)) return [entry];
        const now = latest.current;
        return now && shown(entry, now) ? [] : [{ ...entry, done: true }];
      }),
    );
  }, []);

  const drop = useCallback((habitId: string, day: string) => {
    setPending((list) => list.filter((entry) => !sameDay(entry, habitId, day)));
  }, []);

  const shownTaps = useMemo(() => {
    if (!taps) return taps;
    let list: readonly HabitTap[] = taps;
    for (const entry of pending) {
      if (entry.kind === 'untap') {
        list = list.filter((tap) => tap.receiptId !== entry.receiptId);
      } else if (!list.some((tap) => tap.habitId === entry.habitId && tap.day === entry.day)) {
        list = [
          ...list,
          {
            habitId: entry.habitId,
            day: entry.day,
            amount: entry.amount,
            receiptId: `pending:${entry.habitId}:${entry.day}`,
          },
        ];
      }
    }
    return list;
  }, [taps, pending]);

  const busyDays = useCallback(
    (habitId: string): ReadonlySet<string> =>
      new Set(pending.filter((entry) => entry.habitId === habitId).map((entry) => entry.day)),
    [pending],
  );

  const isBusy = (habitId: string, day: string) =>
    pending.some((entry) => sameDay(entry, habitId, day));

  const fill = (habit: TappableHabit, day: string) => {
    if (isBusy(habit.id, day)) return;
    success();
    setPending((list) => [
      ...list,
      { habitId: habit.id, day, kind: 'tap', amount: habit.price, done: false },
    ]);
    tapDay.mutateAsync({ habit, day }).then(
      (result) => {
        settle(habit.id, day);
        setFailed(false);
        // Already there (a second phone, a double tap): nothing new was filed.
        if (!result.alreadyTapped) toast('toast.receipt.added');
      },
      (thrown: unknown) => {
        failureMessage(thrown);
        warn();
        drop(habit.id, day);
        setFailed(true);
      },
    );
  };

  const empty = async (habit: Pick<TappableHabit, 'id' | 'name'>, tap: HabitTap) => {
    if (isBusy(habit.id, tap.day)) return;
    const ok = await confirm({
      title: removeTitle(habit.name, tap, today),
      message: t('habits.remove.message'),
      confirmLabel: t('common.remove'),
      destructive: true,
    });
    if (!ok) return;

    setPending((list) => [
      ...list.filter((entry) => !sameDay(entry, habit.id, tap.day)),
      {
        habitId: habit.id,
        day: tap.day,
        kind: 'untap',
        receiptId: tap.receiptId,
        amount: tap.amount,
        done: false,
      },
    ]);
    try {
      await untapDay.mutateAsync(tap.receiptId);
      settle(habit.id, tap.day);
      setFailed(false);
      toast('toast.receipt.deleted', 'deleted');
    } catch (thrown) {
      failureMessage(thrown);
      warn();
      drop(habit.id, tap.day);
      setFailed(true);
    }
  };

  return {
    /** The taps as read, with every day in flight drawn as it will be. */
    taps: shownTaps,
    busyDays,
    fill,
    empty,
    failed,
    clearFailure: useCallback(() => setFailed(false), []),
  };
}
