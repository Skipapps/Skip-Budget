import { billWindow, occurrencesInRange, type Recurrence } from '@/lib/card-ledger';

/**
 * Deciding which occurrences still need writing down.
 *
 * A plan describes what repeats; a charge is one time it actually landed. This
 * works out the gap between the two — every date a plan has come due on that
 * has not been recorded yet — so opening the app after a fortnight away catches
 * up on the fortnight rather than only noticing today.
 *
 * Pure on purpose: the caller does the reading and writing, this only decides.
 */

export type ChargeablePlan = {
  id: string;
  recurrence: Recurrence;
  /** The stored anchor. Occurrences are walked outwards from it. */
  nextDate: string | null;
  /** When the plan began. Nothing is recorded before it. */
  startsOn?: string | null;
  /** When it stopped, if it has. */
  endsOn?: string | null;
};

/**
 * Dates a plan has come due on and that are not recorded yet, oldest first.
 *
 * Never reaches back beyond `startsOn`. A plan without one is not backfilled at
 * all — it is recorded from today forward. Inventing months of charges nobody
 * made would be worse than starting late, and there is no way to tell from the
 * row whether the plan ran before the app knew about it.
 */
export function unrecordedDates(
  plan: ChargeablePlan,
  today: string,
  recorded: ReadonlySet<string>,
): string[] {
  if (!plan.nextDate) return [];

  // No start date means no history worth trusting, so only from now on.
  const floor = plan.startsOn ?? today;
  const window = billWindow({ starts_on: floor, ends_on: plan.endsOn ?? null }, floor, today);
  if (window.from && window.from > window.to) return [];

  return occurrencesInRange(plan.nextDate, plan.recurrence, window.from, window.to)
    .filter((date) => !recorded.has(date))
    .sort();
}

/** Key for the set above: one plan's occurrence on one day. */
export function chargeKey(planId: string, date: string): string {
  return `${planId}@${date}`;
}
