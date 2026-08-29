import { billWindow, occurrencesInRange, planFloor, type Recurrence } from '@/lib/card-ledger';

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
  /** When the row was made, as the floor of last resort. */
  createdAt?: string | null;
  /** When it stopped, if it has. */
  endsOn?: string | null;
};

/**
 * Dates a plan has come due on and that are not recorded yet, oldest first.
 *
 * The floor is `planFloor`, which is the same one the screens read with, and
 * that sharing is the point of it: what gets written down and what gets shown
 * have to be the same set of dates. If the recorder stopped at `starts_on`
 * while the screens reached back to `created_at`, switching them over to the
 * record would quietly lose every month only the projection knew about.
 *
 * A plan with neither date is not backfilled at all — it records from today
 * forward. Inventing months of charges nobody made would be worse than
 * starting late.
 */
export function unrecordedDates(
  plan: ChargeablePlan,
  today: string,
  recorded: ReadonlySet<string>,
): string[] {
  if (!plan.nextDate) return [];

  // Nothing known about when it began means no history worth trusting.
  const floor = planFloor(plan.startsOn, plan.createdAt) ?? today;
  const window = billWindow({ starts_on: floor, ends_on: plan.endsOn ?? null }, floor, today);
  if (window.from && window.from > window.to) return [];

  return occurrencesInRange(plan.nextDate, plan.recurrence, window.from, window.to)
    .filter((date) => !recorded.has(date))
    .sort();
}
