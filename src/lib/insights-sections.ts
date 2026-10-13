import type { Href } from 'expo-router';

import { habitMaths, type HabitRow } from '@/api/habits';
import type { BillRow, SubscriptionRow } from '@/api/queries';
import { countsInSpending } from '@/lib/bill-spending';
import { nextDueAfter, type PlanKind, type PlanMonth, type PlanSchedule } from '@/lib/bill-month';
import {
  savedAllTime,
  savedInWeek,
  skippedDaysInWeek,
  tapsForHabit,
  weekStartOf,
  type HabitTap,
} from '@/lib/habit-week';
import { belowOnePercent, percentOfCents } from '@/lib/insights';
import { fromCents, toCents } from '@/lib/money';
import type { PotView } from '@/lib/savings';

/**
 * Insights' section figures that no other page already computes. Pure, in whole cents. Everything
 * else on the page is read from the owning page's own hooks and helpers.
 */

/** A Next due row on the Bills & subscriptions card. */
export type NextDue = {
  planId: string;
  kind: PlanKind;
  name: string;
  /** yyyy-mm-dd, after today: a date due today is already paid. */
  date: string;
  /** That one payment. */
  amount: number;
  domain: string | null;
  logoHidden: boolean;
  categoryId: string | null;
  iconId: string | null;
  /** The bill's page (a loan's opens the loan) or the subscription's. */
  href: Href;
};

function billSchedule(row: BillRow): PlanSchedule {
  return {
    anchor: row.next_due_on,
    recurrence: row.recurrence,
    startsOn: row.starts_on,
    createdAt: row.created_at,
    endsOn: row.ends_on,
  };
}

function subscriptionSchedule(row: SubscriptionRow): PlanSchedule {
  return {
    anchor: row.next_renewal_on,
    recurrence: row.cycle,
    startsOn: row.started_on,
    createdAt: row.created_at,
    endsOn: null,
  };
}

/**
 * The next `count` dues after today across bills and subscriptions, soonest first (then by name),
 * from the plans the Monthly bills and Subscriptions pages list this month (`usePlanMonth(kind,
 * monthOf(today), today).view`). Those views give no date for a plan already paid this month, so
 * its next one is walked from its row (`useBills`, `useSubscriptions`) as those pages walk it.
 */
export function nextDue(
  input: {
    bills: Pick<PlanMonth, 'rows'>;
    subscriptions: Pick<PlanMonth, 'rows'>;
    billRows: readonly BillRow[];
    subscriptionRows: readonly SubscriptionRow[];
    today: string;
  },
  count = 2,
): NextDue[] {
  const { today } = input;
  const bills = new Map(input.billRows.map((row) => [row.id, row]));
  const subscriptions = new Map(input.subscriptionRows.map((row) => [row.id, row]));

  const found: (NextDue & { cents: number })[] = [];
  for (const row of [...input.bills.rows, ...input.subscriptions.rows]) {
    const bill = row.kind === 'bill' ? bills.get(row.planId) : undefined;
    const subscription = row.kind === 'subscription' ? subscriptions.get(row.planId) : undefined;
    const plan = bill ?? subscription;
    const planCents = plan ? Math.abs(toCents(plan.amount)) : null;

    let date: string | null = null;
    let cents: number | null = null;
    if (row.status.kind === 'next') {
      date = row.status.date;
      const due = row.occurrences.find((each) => !each.paid && each.date === date);
      // With nothing due in the month the row's amount is already one payment.
      cents = due
        ? toCents(due.amount)
        : (planCents ?? (row.occurrences.length === 0 ? toCents(row.amount) : null));
    } else if (row.status.kind === 'paid') {
      // A loan kept out of monthly bills lists what it was charged, but nothing more is a bill.
      if (bill && countsInSpending(bill)) date = nextDueAfter(billSchedule(bill), today);
      else if (subscription) date = nextDueAfter(subscriptionSchedule(subscription), today);
      cents = planCents;
    }
    if (!date || date <= today || cents === null) continue;

    found.push({
      planId: row.planId,
      kind: row.kind,
      name: row.name,
      date,
      cents,
      amount: 0,
      domain: row.domain,
      logoHidden: row.logoHidden,
      categoryId: row.categoryId,
      iconId: row.iconId,
      href: row.href,
    });
  }

  return found
    .sort((a, b) =>
      a.date !== b.date
        ? a.date.localeCompare(b.date)
        : a.name !== b.name
          ? a.name.localeCompare(b.name)
          : a.planId.localeCompare(b.planId),
    )
    .slice(0, count)
    .map(({ cents, ...due }) => ({ ...due, amount: fromCents(cents) }));
}

/** What the Habits card reads of a habit; a full `HabitRow` passes through to its row. */
export type SummaryHabit = Pick<HabitRow, 'id' | 'price' | 'started_on' | 'saved_from'>;

/** The Habits card. */
export type HabitsSummary<H extends SummaryHabit = SummaryHabit> = {
  /** The first `limit` habits, in the Habits page's order, each with this week's figures. */
  rows: { habit: H; skipped: number; saved: number }[];
  /** Saved so far by every active habit, shown or not: the Habits page's hero figure. */
  savedSoFar: number;
  /** Active habits. */
  count: number;
};

/**
 * This week's skipped days and saving per habit, as each habit card computes them, and Saved so
 * far as the Habits page does. Pass `useHabits().data` (active only) and `useHabitTaps().data`.
 */
export function habitsSummary<H extends SummaryHabit>(
  habits: readonly H[],
  taps: readonly HabitTap[],
  today: string,
  limit = 3,
): HabitsSummary<H> {
  const week = weekStartOf(today);
  const rows = habits.slice(0, limit).map((habit) => {
    const maths = habitMaths(habit);
    const tapped = new Set(tapsForHabit(taps, habit.id).keys());
    return {
      habit,
      skipped: skippedDaysInWeek(maths, tapped, week, today),
      saved: savedInWeek(maths, tapped, week, today),
    };
  });
  return {
    rows,
    savedSoFar: savedAllTime(habits.map(habitMaths), taps, today),
    count: habits.length,
  };
}

/** The Savings card's first line. "Total in savings" is `useSavingsCore().summary.readyToUse`. */
export type SavingsMoved = {
  /** Reached savings this month: last month's wrap-up on the 1st, and money added dated this month. */
  moved: number;
  /** moved as a whole percent of the hero's income; null with none, when the line is hidden. */
  incomeShare: number | null;
  /** Something moved, yet `incomeShare` rounded to 0. */
  belowOnePercent: boolean;
};

/**
 * From `useSavingsCore().summary.pots` (live pots only) and `heroFigures(...).in`. A pot counts in
 * full, whatever of it has gone on to goals since: it is what moved, not what is left.
 */
export function movedThisMonth(
  pots: readonly Pick<PotView, 'movedOn' | 'amount'>[],
  income: number,
  today: string,
): SavingsMoved {
  const month = today.slice(0, 7);
  let cents = 0;
  for (const pot of pots) {
    if (pot.movedOn.slice(0, 7) !== month) continue;
    // Numeric columns can arrive as text; a negative pot holds nothing, as `savingsSummary` reads it.
    cents += Math.max(0, toCents(Number(pot.amount)));
  }
  const incomeShare = percentOfCents(cents, toCents(income));
  return {
    moved: fromCents(cents),
    incomeShare,
    belowOnePercent: belowOnePercent(cents, incomeShare),
  };
}

/** The Coming up card. */
export type SubscriptionCost = {
  /** perYear ÷ 12, to the cent, half up. */
  perMonth: number;
  perYear: number;
  /** Subscriptions counted: active, with a next date. */
  count: number;
};

const PER_YEAR: Record<SubscriptionRow['cycle'], number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

/**
 * What the running subscriptions cost by their billing cycle. Running is active with a next date,
 * as the ledger reads it: one with no date is never charged, so it costs nothing ahead. A year is
 * each amount × 52, 12, 4 or 1; a month is the year ÷ 12, rounded once on the total, so a $120
 * yearly plan is $10.00 a month and not $120.
 */
export function subscriptionCost(
  subscriptions: readonly Pick<
    SubscriptionRow,
    'amount' | 'cycle' | 'active' | 'next_renewal_on'
  >[],
): SubscriptionCost {
  let yearCents = 0;
  let count = 0;
  for (const subscription of subscriptions) {
    if (!subscription.active || !subscription.next_renewal_on) continue;
    // A cycle this build has no word for is read as monthly, as every plan was before cycles.
    const times = PER_YEAR[subscription.cycle] ?? 12;
    yearCents += Math.abs(toCents(Number(subscription.amount))) * times;
    count += 1;
  }
  const whole = Math.floor(yearCents / 12);
  const monthCents = whole + (2 * (yearCents - whole * 12) >= 12 ? 1 : 0);
  return { perMonth: fromCents(monthCents), perYear: fromCents(yearCents), count };
}
