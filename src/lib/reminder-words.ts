import type { LEAD_OPTIONS } from '@/api/reminders';
import { t } from '@/i18n';
import { shortDay } from '@/lib/due-day';

/** How long before: on the day, 1 or 3 days, a week. */
export type LeadDays = (typeof LEAD_OPTIONS)[number]['value'];

/** "19 Oct, 3 days before it's due": when a card's next reminder goes out, and why then. */
export function billReminderCaption(lead: LeadDays, on: string): string {
  const date = shortDay(on);
  if (lead === 0) return t('cards.add.remindOnDay', { date });
  if (lead === 7) return t('cards.add.remindWeek', { date });
  return t('cards.add.remindDays', { date, count: lead });
}

/** The same for an account, counted from pay landing; without a known payday, the lead alone. */
export function payReminderCaption(lead: LeadDays, on: string | null): string {
  if (!on) {
    if (lead === 0) return t('accounts.add.remindLeadOnDay');
    if (lead === 7) return t('accounts.add.remindLeadWeek');
    return t('accounts.add.remindLeadDays', { count: lead });
  }
  const date = shortDay(on);
  if (lead === 0) return t('accounts.add.remindOnDay', { date });
  if (lead === 7) return t('accounts.add.remindWeek', { date });
  return t('accounts.add.remindDays', { date, count: lead });
}

/** "19 Oct · 3 days before", for a finished page's row; the lead alone when the day is unknown. */
export function reminderRow(lead: LeadDays, on: string | null): string {
  if (!on) {
    return lead === 0
      ? t('api.reminders.onTheDay')
      : lead === 7
        ? t('api.reminders.weeks', { count: 1 })
        : t('api.reminders.days', { count: lead });
  }
  const date = shortDay(on);
  if (lead === 0) return t('cards.added.reminderOnDay', { date });
  if (lead === 7) return t('cards.added.reminderWeek', { date });
  return t('cards.added.reminderDays', { date, count: lead });
}

/** The line under "Card added" / "Account added"; null lead means no reminder was set. */
export function addedMessage(kind: 'bill' | 'pay', lead: LeadDays | null): string {
  if (lead === null) return t('cards.added.noReminder');
  if (kind === 'pay') {
    if (lead === 0) return t('accounts.added.remindOnDay');
    if (lead === 7) return t('accounts.added.remindWeek');
    return t('accounts.added.remindDays', { count: lead });
  }
  if (lead === 0) return t('cards.added.remindOnDay');
  if (lead === 7) return t('cards.added.remindWeek');
  return t('cards.added.remindDays', { count: lead });
}
