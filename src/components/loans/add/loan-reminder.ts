import { addDays, toIsoDate } from '@/lib/date';

/**
 * The day a loan's next reminder goes out (yyyy-mm-dd): `lead` days before the first payment that
 * can still be reminded about from `today`, as the scheduler sends it (`due_on - lead_days`). Null
 * once every payment is too close or behind.
 */
export function loanReminderOn(
  dueDates: readonly Date[],
  lead: number,
  today: string,
): string | null {
  for (const due of dueDates) {
    const on = toIsoDate(addDays(due, -lead));
    if (on >= today) return on;
  }
  return null;
}
