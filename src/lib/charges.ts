import {
  billWindow,
  dayAfter,
  occurrencesInRange,
  planFloor,
  type Recurrence,
} from '@/lib/card-ledger';

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

  // One charge per cycle, not just per date: a moved due date would otherwise
  // look like a month nobody had recorded. The database holds the same rule
  // (charges_one_per_cycle) for every writer; this keeps the app from asking.
  const charged = new Set([...recorded].map((date) => cycleStart(date, plan.recurrence)));

  return occurrencesInRange(plan.nextDate, plan.recurrence, window.from, window.to)
    .filter((date) => !recorded.has(date) && !charged.has(cycleStart(date, plan.recurrence)))
    .sort();
}

/**
 * Where a plan counts from once somebody has picked a date for it.
 *
 * The date picked, unless the plan already counts from earlier: moving the
 * start later would drop occurrences that are already on the books, and
 * nothing a person does in an edit form should quietly unspend money.
 */
export function countFromAfterPick(picked: string | null, current: string | null): string | null {
  return picked && (!current || picked < current) ? picked : current;
}

/**
 * The first day of the cycle `date` falls in: its week's Monday, the 1st of
 * its month, its calendar quarter or its year. A set period has no cycle, so
 * each date is its own. Matches Postgres's date_trunc, which the database's
 * copy of the rule uses.
 */
export function cycleStart(date: string, recurrence: Recurrence): string {
  const [year, month, day] = date.split('-').map(Number);
  const at = (start: Date) => start.toISOString().slice(0, 10);
  switch (recurrence) {
    case 'weekly': {
      const monday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
      return at(new Date(Date.UTC(year, month - 1, day - monday)));
    }
    case 'monthly':
      return at(new Date(Date.UTC(year, month - 1, 1)));
    case 'quarterly':
      return at(new Date(Date.UTC(year, Math.floor((month - 1) / 3) * 3, 1)));
    case 'yearly':
      return at(new Date(Date.UTC(year, 0, 1)));
    default:
      return date;
  }
}

/**
 * The first day of the cycle after the one `date` falls in: next Monday, the
 * 1st of next month, the next calendar quarter or the next New Year's Day.
 */
function nextCycleStart(date: string, recurrence: Recurrence): string {
  const [year, month, day] = date.split('-').map(Number);
  const at = (next: Date) => next.toISOString().slice(0, 10);
  switch (recurrence) {
    case 'weekly': {
      const monday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
      return at(new Date(Date.UTC(year, month - 1, day + 7 - monday)));
    }
    case 'monthly':
      return at(new Date(Date.UTC(year, month, 1)));
    case 'quarterly':
      return at(new Date(Date.UTC(year, (Math.floor((month - 1) / 3) + 1) * 3, 1)));
    case 'yearly':
      return at(new Date(Date.UTC(year + 1, 0, 1)));
    default:
      return dayAfter(date);
  }
}

/**
 * Keeps an edited plan from recording a cycle it has already been charged for.
 *
 * Both recorders — this app's and the server's — write every due date from
 * the plan's start up to today that is not on the record yet, matched by exact
 * date. So moving a charged rent from the 28th to the 1st made 1 Sep look like
 * a September nobody had recorded, and September was charged twice; moving it
 * the other way did the same with the 28th. Starting the plan at the next
 * cycle after its newest charge leaves what is recorded as it is, and the next
 * due date on or after that is the first one written.
 */
export function floorAfterCharges(
  start: string | null,
  lastCharged: string | null,
  recurrence: Recurrence,
): string | null {
  if (!lastCharged) return start;
  const floor = nextCycleStart(lastCharged, recurrence);
  return start && start > floor ? start : floor;
}
