import type { GoalPace } from '@/components/savings/goal-cards';
import type { GoalMoveLine } from '@/components/savings/goal-detail-parts';
import { dayMonthText, shortMoney } from '@/components/savings/savings-words';
import { t } from '@/i18n';
import type { GoalView } from '@/lib/goals';
import { fromCents, toCents } from '@/lib/money';
import { localDayOf, type MoveRow } from '@/lib/savings';

/** What the goal still asks: a weekly figure to its date, how short it is once the date has passed, or nothing. */
export function paceOf(goal: GoalView): GoalPace | null {
  if (goal.done) return null;
  if (goal.datePassed) return { kind: 'passed', toGo: goal.need };
  return goal.weekly !== null ? { kind: 'weekly', amount: goal.weekly } : null;
}

/**
 * A goal's history, newest first: one line per send or take-back (a send that drew on two pots is
 * two moves and one line), then what it started with.
 */
export function goalMoveLines(goal: GoalView, moves: readonly MoveRow[]): GoalMoveLine[] {
  const batches: { id: string; cents: number; day: string }[] = [];
  for (const move of moves) {
    if (move.goal_id !== goal.id) continue;
    const key = move.batch_id ?? move.id;
    const known = batches.find((batch) => batch.id === key);
    if (known) known.cents += toCents(move.amount);
    else batches.push({ id: key, cents: toCents(move.amount), day: localDayOf(move.created_at) });
  }

  const lines: GoalMoveLine[] = batches
    .filter((batch) => batch.cents !== 0)
    .map((batch) => ({
      id: batch.id,
      text: t(batch.cents > 0 ? 'goals.detail.fromSavings' : 'goals.detail.toSavings', {
        amount: shortMoney(fromCents(Math.abs(batch.cents))),
        date: dayMonthText(batch.day),
      }),
    }));
  if (toCents(goal.start_amount) > 0) {
    lines.push({
      id: 'start',
      text: t('goals.detail.startAmount', { amount: shortMoney(goal.start_amount) }),
    });
  }
  return lines;
}
