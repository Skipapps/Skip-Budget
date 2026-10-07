import { REMINDER_CHOICES, type ReminderChoice } from '@/api/reminders';
import { t } from '@/i18n';
import { formatClock, parseClock } from '@/lib/date';

/**
 * A reminder as one line for the final page: "1 day before · 9:00 AM". Null when it is off, so the
 * row says so in its own words instead.
 */
export function reminderSummary(choice: ReminderChoice, time: string): string | null {
  if (choice === 'off') return null;
  const lead = REMINDER_CHOICES.find((option) => option.value === choice)?.label ?? '';
  const clock = parseClock(time);
  return t('entry.reminder.summary', {
    // "On the day" already says when; the others count days or weeks before.
    when: choice === '0' ? lead : t('entry.reminder.before', { lead }),
    time: formatClock(clock.hour, clock.minute),
  });
}
