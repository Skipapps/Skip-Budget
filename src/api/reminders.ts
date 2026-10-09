import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { NOTHING_SAVED } from '@/api/mutations';
import { withTimeout } from '@/lib/deadline';
import { enableReminders } from '@/api/push';
import { t } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/session-provider';

/**
 * What the user has asked to be told about. One table for every remindable thing; a row holds only
 * the decision (on/off, days ahead), never a copy of the date, which is read from the bill or card
 * when the push is sent. Each kind is answered by a different date:
 *
 *   bill          its next due date
 *   subscription  its next renewal
 *   card          the card's own payment day (cards.bill_due_day)
 *   account       the next payday landing in it
 *
 * The account kind is about money arriving, not leaving: an account has no date of its own, so it
 * borrows the payday of whatever salary source pays into it, and one nothing is paid into has
 * nothing to announce.
 */

export type ReminderKind = 'bill' | 'subscription' | 'card' | 'account';

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

/** Labels are read when drawn, never at import, so they follow the language on screen. */
export const LEAD_OPTIONS = [
  {
    value: 0,
    get label() {
      return t('api.reminders.onTheDay');
    },
  },
  {
    value: 1,
    get label() {
      return t('api.reminders.days', { count: 1 });
    },
  },
  {
    value: 3,
    get label() {
      return t('api.reminders.days', { count: 3 });
    },
  },
  {
    value: 7,
    get label() {
      return t('api.reminders.weeks', { count: 1 });
    },
  },
] as const;

export const DEFAULT_LEAD_DAYS = 1;

/** Nine in the morning: early enough to act on, late enough not to wake anyone. */
export const DEFAULT_REMIND_AT = '09:00';

/**
 * The same choices with an off switch folded in, for the creation forms, where one row of chips
 * including "Off" is one decision instead of two.
 */
export const REMINDER_CHOICES = [
  {
    value: 'off',
    get label() {
      return t('api.reminders.off');
    },
  },
  {
    value: '0',
    get label() {
      return t('api.reminders.onTheDay');
    },
  },
  {
    value: '1',
    get label() {
      return t('api.reminders.days', { count: 1 });
    },
  },
  {
    value: '3',
    get label() {
      return t('api.reminders.days', { count: 3 });
    },
  },
  {
    value: '7',
    get label() {
      return t('api.reminders.weeks', { count: 1 });
    },
  },
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
  get bill() {
    return t('api.reminders.caption.bill');
  },
  get subscription() {
    return t('api.reminders.caption.subscription');
  },
  get card() {
    return t('api.reminders.caption.card');
  },
  get account() {
    return t('api.reminders.caption.account');
  },
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
 * Turns a reminder on or off, or changes how far ahead it lands. An upsert, because the unique
 * index per target is what makes "one reminder per thing" true: two quick taps resolve to one row.
 *
 * Saving is the loudest possible yes to being reminded, so it also enables reminders for the
 * account (permission, token, profile flag) for somebody who never met the Getting Started step.
 * Failures there are ignored: the reminder row is worth keeping even when the phone refuses to be
 * pushed.
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

      // All four columns, three null, because the constraint spans all four: naming only the set
      // one gives ON CONFLICT nothing to infer (a planning error, not a failed row).
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
 * The choice already stored for one thing, for a form to open on. 'off' for anything with no row,
 * which to a person looking at a form is the same as "never asked".
 *
 * `unknown` is true while that answer is not known: for something saved, until the reminders read
 * has succeeded (loading, or failed). Then 'off' is a guess, and a Save that writes it
 * (`applyReminder(…, null)` deletes the row) removes a reminder the person never touched, so a form
 * writes the reminder only when it is false. Never true for something new: nothing is stored yet.
 */
export function useReminderChoice(
  kind: ReminderKind,
  targetId: string | undefined,
): { choice: ReminderChoice; remindAt: string; unknown: boolean } {
  const reminders = useReminders();

  const row = (reminders.data ?? []).find(
    (candidate) => targetId && reminderKey(candidate) === targetKey(kind, targetId),
  );

  return {
    choice: row?.enabled ? leadToChoice(row.lead_days) : 'off',
    remindAt: row?.remind_at?.slice(0, 5) ?? DEFAULT_REMIND_AT,
    unknown: Boolean(targetId) && !reminders.isSuccess,
  };
}

/**
 * Sets or clears the reminder for one thing in a single call, for the creation forms. Off deletes
 * rather than storing a disabled row, so a form never touched leaves nothing behind.
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
 * Removes a reminder entirely. Unlike switching it off (a decision visible on the page) this is
 * back to never having asked; it is for the person tidying up, not the scheduler.
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

/**
 * The daily receipts reminder is deliberately not a `reminders` row: that table requires exactly
 * one of its four target columns and the upsert conflicts on all four, while this reminder points
 * at nothing and there is one per account, so it lives as three columns on `profiles`. Kept out of
 * `useProfile` so dragging the clock does not invalidate the dashboard header query.
 */

/** Eight in the evening: the day's shopping is done and the receipts are still in a pocket. */
export const DEFAULT_RECEIPT_REMIND_AT = '20:00';

/** The two columns a screen reads; the sender owns the third. */
type ReceiptReminderRow = {
  receipt_reminder_enabled: boolean | null;
  /** Local time of day, "HH:MM:SS". */
  receipt_reminder_at: string | null;
};

export type ReceiptReminder = {
  enabled: boolean;
  /** "HH:MM", local wall clock. */
  remindAt: string;
};

/**
 * The stored setting in the shape a screen wants. Separate from the hook so the defaulting is
 * testable: a profile written before the migration, or no row at all, must still show the default
 * rather than an empty pill or midnight.
 */
export function receiptReminderFrom(row: ReceiptReminderRow | null | undefined): ReceiptReminder {
  const at =
    typeof row?.receipt_reminder_at === 'string' ? row.receipt_reminder_at.slice(0, 5) : '';
  return {
    enabled: row?.receipt_reminder_enabled === true,
    remindAt: /^\d{2}:\d{2}$/.test(at) ? at : DEFAULT_RECEIPT_REMIND_AT,
  };
}

/**
 * Whether the daily receipts reminder is on, and when. `enabled` is false and `remindAt` the
 * default until proven otherwise, the safe way round for something that sends a notification.
 */
export function useReceiptReminder() {
  const userId = useUserId();

  const query = useQuery({
    // Keyed by user so switching accounts cannot serve the previous one's setting.
    queryKey: ['receipt-reminder', userId],
    enabled: Boolean(userId),
    queryFn: () =>
      withTimeout(
        (async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('receipt_reminder_enabled, receipt_reminder_at')
            // The select policy also returns friends' and groupmates' rows, so name this one.
            .eq('id', userId!)
            .maybeSingle();
          if (error) throw error;
          return (data ?? null) as ReceiptReminderRow | null;
        })(),
        12_000,
        'Could not load your receipts reminder. Check your connection and try again.',
      ),
  });

  const setting = receiptReminderFrom(query.data);

  return {
    enabled: setting.enabled,
    remindAt: setting.remindAt,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

type SetReceiptReminderInput = {
  enabled: boolean;
  /** "HH:MM". Left off to keep whatever time is already stored. */
  remindAt?: string;
};

/**
 * Turns the daily receipts reminder on or off, or moves it. Switching it on enables reminders for
 * the account first, as saving any other reminder does; failure there is ignored and the next
 * launch retries. The time is only written when given, so toggling cannot reset a time the user
 * chose.
 */
export function useSetReceiptReminder() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ enabled, remindAt }: SetReceiptReminderInput) => {
      if (enabled) {
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) void enableReminders(auth.user.id);
      }
      if (!userId) throw new Error('Sign in first.');

      const { data, error } = await supabase
        .from('profiles')
        .update({
          receipt_reminder_enabled: enabled,
          ...(remindAt ? { receipt_reminder_at: remindAt } : {}),
        } as never)
        // RLS already scopes this to the caller; naming the row as well means a
        // mistake here cannot become an update across the table.
        .eq('id', userId)
        // A missing profile is a 204 with no error; without the select the switch would report
        // success and the next launch would read it back off.
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error(NOTHING_SAVED);
    },
    // Its own key: the profile query behind the dashboard is left alone.
    onSuccess: () => client.invalidateQueries({ queryKey: ['receipt-reminder'] }),
  });
}
