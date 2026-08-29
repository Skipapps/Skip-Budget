import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { withTimeout } from '@/lib/deadline';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * What the user has asked to be told about.
 *
 * One table for every kind of remindable thing, so the page can show them all
 * together and the scheduler can read them in one query. The row holds only the
 * decision — on or off, and how many days ahead — never a copy of the date,
 * which is read from the bill or the card when the push is actually sent.
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

export type ReminderRow = {
  id: string;
  bill_id: string | null;
  subscription_id: string | null;
  card_id: string | null;
  bank_account_id: string | null;
  enabled: boolean;
  lead_days: number;
};

const COLUMNS = 'id, bill_id, subscription_id, card_id, bank_account_id, enabled, lead_days';

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
};

/**
 * Turns a reminder on or off, or changes how far ahead it lands.
 *
 * An upsert rather than an insert-or-update, because the unique index per
 * target is what makes "one reminder per thing" true — two quick taps on the
 * same switch resolve to one row instead of racing each other into two.
 */
export function useSetReminder() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, targetId, enabled, leadDays }: SetReminderInput) => {
      if (!userId) throw new Error('Sign in first.');

      const { error } = await supabase.from('reminders').upsert(
        {
          user_id: userId,
          [COLUMN[kind]]: targetId,
          enabled,
          lead_days: leadDays,
        } as never,
        { onConflict: COLUMN[kind] },
      );
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['reminders'] }),
  });
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
