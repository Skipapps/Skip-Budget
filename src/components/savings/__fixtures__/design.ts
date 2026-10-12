import type { GoalView } from '@/lib/goals';
import type { MoveRow, PotView } from '@/lib/savings';

/**
 * The six designs' own figures, as the hooks hand them to the screens: September $640 ready, August
 * $520 all sent, July $410 with $210 left; Trip $300 of $1,200 and Emergency fund $420 of $1,000,
 * New phone reached in August. Ready to use $850; goals $720 of $2,200.
 */

export function potView(overrides: Partial<PotView> & { id: string }): PotView {
  return {
    kind: 'month',
    month: '2026-09-01',
    label: null,
    earned: 3700,
    spent: 3060,
    amount: 640,
    added_on: '2026-10-01',
    note: null,
    wrap_up_seen_at: '2026-10-01T09:00:00Z',
    removed_at: null,
    created_at: '2026-10-01T08:00:00Z',
    status: 'ready',
    left: 640,
    sentFromIt: 0,
    leftOver: 640,
    movedOn: '2026-10-01',
    ...overrides,
  };
}

export const SEPTEMBER = potView({ id: 'sep' });
export const AUGUST = potView({
  id: 'aug',
  month: '2026-08-01',
  spent: 3180,
  amount: 520,
  leftOver: 520,
  status: 'sent',
  left: 0,
  sentFromIt: 520,
  movedOn: '2026-09-01',
});
export const JULY = potView({
  id: 'jul',
  month: '2026-07-01',
  spent: 3290,
  amount: 410,
  leftOver: 410,
  status: 'partly',
  left: 210,
  sentFromIt: 200,
  movedOn: '2026-08-01',
});

export function goalView(overrides: Partial<GoalView> & { id: string }): GoalView {
  return {
    name: 'Trip',
    icon_id: 'trip',
    target: 1200,
    target_date: '2027-03-31',
    start_amount: 0,
    created_at: '2026-06-01T10:00:00Z',
    closed_at: null,
    saved: 300,
    need: 900,
    percent: 25,
    done: false,
    reachedOn: null,
    weekly: 37,
    monthly: 159,
    datePassed: false,
    fromSavings: 300,
    ...overrides,
  };
}

export const TRIP = goalView({ id: 'trip' });
export const EMERGENCY = goalView({
  id: 'ef',
  name: 'Emergency fund',
  icon_id: 'emergency',
  target: 1000,
  target_date: '2026-12-31',
  saved: 420,
  need: 580,
  percent: 42,
  weekly: 49,
  monthly: 211,
  fromSavings: 420,
});
export const NEW_PHONE = goalView({
  id: 'phone',
  name: 'New phone',
  icon_id: 'phone',
  target: 600,
  target_date: null,
  saved: 600,
  need: 0,
  percent: 100,
  done: true,
  reachedOn: '2026-08-14',
  weekly: null,
  monthly: null,
  fromSavings: 600,
});

export function move(overrides: Partial<MoveRow> & { id: string }): MoveRow {
  return {
    goal_id: 'trip',
    amount: 400,
    pot_id: 'sep',
    batch_id: 'batch-1',
    created_at: '2026-10-11T12:00:00Z',
    ...overrides,
  };
}
