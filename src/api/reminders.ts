import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { withTimeout } from '@/lib/deadline';
import { enableReminders } from '@/api/push';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * What the user has asked to be told about.
 *
 * One table for every kind of remindable thing, so the page can show them all
 * together and the scheduler can read them in one query. The row holds only the
 * decision — on or off, and how many days ahead — never a copy of the date,
 * which is read from the bill or the card when the push is actually sent.
 *
 * Four kinds, and each one is answered by a different date:
 *
 *   bill          its next due date
 *   subscription  its next renewal
 *   card          the card's own payment day (cards.bill_due_day)
 *   account       the next payday landing in it
 *
 * The account one is the odd one out and worth stating plainly: it is about
 * money arriving, not leaving. An account has no date of its own, so it
 * borrows the payday of whatever salary source pays into it — and an account
 * nothing is paid into has nothing to announce.
 */

/** The four things that can carry a reminder. */
export type ReminderKind = 'bill' | 'subscription' | 'card' | 'account';

/** Which column on `reminders` points at each kind. */
const COLUMN: Record<ReminderKind, string> = {
  bill: 'bill_id',
  subscription: 'subscription_id',
  card: 'card_id',
  account: 'bank_account_id',
};

/** The constraint the upsert resolves against. Must list every target column. */
const CONFLICT_TARGET = 'bill_id,subscription_id,card_id,bank_account_id';

export type ReminderRow = {
  id: string;
  bill_id: string | null;
  subscription_id: string | null;
  card_id: string | null;
  bank_account_id: string | null;
  enabled: boolean;
  lead_days: number;
  /** Local time of day, "HH:MM:SS" as Postgres hands a `time` back. */
  remind_at: string;
};

const COLUMNS =
  'id, bill_id, subscription_id, card_id, bank_account_id, enabled, lead_days, remind_at';

/** The kind and target a row points at, as the page keys them. */
export function reminderKey(row: ReminderRow): string {
  if (row.bill_id) return `bill:${row.bill_id}`;
  if (row.subscription_id) return `subscription:${row.subscription_id}`;
  if (row.card_id) return `card:${row.card_id}`;
  return `account:${row.bank_account_id}`;
}

export function targetKey(kind: ReminderKind, id: string): string {
  return `${kind}:${id}`;
}

/** How far ahead a reminder can be set, in the words the page uses. */
export const LEAD_OPTIONS = [
  { value: 0, label: 'On the day' },
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '1 week' },
] as const;

export const DEFAULT_LEAD_DAYS = 1;

/** Nine in the morning: early enough to act on, late enough not to wake anyone. */
export const DEFAULT_REMIND_AT = '09:00';

/**
 * The same choices with an off switch folded in, for the creation forms.
 *
 * The page has room for a toggle and a row of leads because it is showing
 * twenty of them at once. A form has one, and a single row of chips that
 * includes "Off" is one decision instead of two.
 */
export const REMINDER_CHOICES = [
  { value: 'off', label: 'Off' },
  { value: '0', label: 'On the day' },
  { value: '1', label: '1 day' },
  { value: '3', label: '3 days' },
  { value: '7', label: '1 week' },
] as const;

export type ReminderChoice = (typeof REMINDER_CHOICES)[number]['value'];

/** Lead days as the forms hold them: null when off. */
export function choiceToLead(choice: ReminderChoice): number | null {
  return choice === 'off' ? null : Number(choice);
}

export function leadToChoice(lead: number | null | undefined): ReminderChoice {
  if (lead === null || lead === undefined) return 'off';
  const match = REMINDER_CHOICES.find((option) => option.value === String(lead));
  return match ? match.value : '1';
}

/** What the reminder for each kind is actually counted from. */
export const REMINDER_CAPTION: Record<ReminderKind, string> = {
  bill: 'Before the bill is due',
  subscription: 'Before it renews',
  card: "Before this card's payment day",
  account: 'When your pay lands here',
};

export function useReminders() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['reminders', userId],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase.from('reminders').select(COLUMNS);
          if (error) throw error;
          return (data ?? []) as ReminderRow[];
        })(),
        12_000,
        'Could not load your reminders. Check your connection and try again.',
      ),
  });
}

type SetReminderInput = {
  kind: ReminderKind;
  targetId: string;
  enabled: boolean;
  leadDays: number;
  /** "HH:MM". Left off to keep whatever time is already stored. */
  remindAt?: string;
};

/**
 * Turns a reminder on or off, or changes how far ahead it lands.
 *
 * An upsert rather than an insert-or-update, because the unique index per
 * target is what makes "one reminder per thing" true — two quick taps on the
 * same switch resolve to one row instead of racing each other into two.
 */
/**
 * Saving a reminder is the loudest possible yes to being reminded, so it also
 * enables reminders for the account — permission, token and the profile flag —
 * for somebody who never met the Getting Started step. Failures are ignored:
 * the reminder row is worth keeping even when the phone refuses to be pushed.
 */
export function useSetReminder() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, targetId, enabled, leadDays, remindAt }: SetReminderInput) => {
      if (enabled) {
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) void enableReminders(auth.user.id);
      }
      if (!userId) throw new Error('Sign in first.');

      // All four columns, three of them null, because the constraint spans all
      // four — naming only the one that is set gives ON CONFLICT nothing it can
      // infer, which is a planning error rather than a failed row.
      const { error } = await supabase.from('reminders').upsert(
        {
          user_id: userId,
          bill_id: kind === 'bill' ? targetId : null,
          subscription_id: kind === 'subscription' ? targetId : null,
          card_id: kind === 'card' ? targetId : null,
          bank_account_id: kind === 'account' ? targetId : null,
          enabled,
          lead_days: leadDays,
          remind_at: remindAt ?? DEFAULT_REMIND_AT,
        } as never,
        { onConflict: CONFLICT_TARGET },
      );
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

/**
 * The choice already stored for one thing, for a form to open on.
 *
 * Returns 'off' for anything with no row, which is the same answer as "never
 * asked" — the distinction matters to the table and not to the person looking
 * at a form.
 */
export function useReminderChoice(
  kind: ReminderKind,
  targetId: string | undefined,
): { choice: ReminderChoice; remindAt: string } {
  const reminders = useReminders();

  const row = (reminders.data ?? []).find(
    (candidate) => targetId && reminderKey(candidate) === targetKey(kind, targetId),
  );

  return {
    choice: row?.enabled ? leadToChoice(row.lead_days) : 'off',
    // Trimmed to HH:MM; the seconds Postgres adds are noise here.
    remindAt: row?.remind_at?.slice(0, 5) ?? DEFAULT_REMIND_AT,
  };
}

/**
 * Sets or clears the reminder for one thing, in a single call.
 *
 * What the creation forms need: they hold one choice, and after the row is
 * saved they say what it should be. Off deletes rather than storing a disabled
 * row, because a form that was never touched should leave nothing behind.
 */
export function useApplyReminder() {
  const setReminder = useSetReminder();
  const removeReminder = useRemoveReminder();

  return useCallback(
    async (
      kind: ReminderKind,
      targetId: string,
      leadDays: number | null,
      remindAt: string = DEFAULT_REMIND_AT,
    ) => {
      if (leadDays === null) {
        await removeReminder.mutateAsync({ kind, targetId });
        return;
      }
      await setReminder.mutateAsync({ kind, targetId, enabled: true, leadDays, remindAt });
    },
    [setReminder, removeReminder],
  );
}

/**
 * Removes a reminder entirely.
 *
 * Different from switching it off: off is a decision the user made and can see
 * on the page, while removed is back to never having asked. Both stop the
 * push, so this exists for the person tidying up rather than for the scheduler.
 */
export function useRemoveReminder() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, targetId }: { kind: ReminderKind; targetId: string }) => {
      const { error } = await supabase.from('reminders').delete().eq(COLUMN[kind], targetId);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['reminders'] }),
  });
}
