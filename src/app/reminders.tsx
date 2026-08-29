import {
  Bell,
  Clock,
  CreditCard,
  Landmark,
  ReceiptText,
  Repeat,
  Trash2,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import {
  DEFAULT_LEAD_DAYS,
  DEFAULT_REMIND_AT,
  LEAD_OPTIONS,
  REMINDER_CAPTION,
  reminderKey,
  targetKey,
  useReminders,
  useRemoveReminder,
  useSetReminder,
  type ReminderKind,
} from '@/api/reminders';
import { useArtwork } from '@/theme/artwork';
import {
  useBankAccounts,
  useBills,
  useCards,
  useSalaryAccountIds,
  useSubscriptions,
} from '@/api/queries';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { TimePicker } from '@/components/ui/time-picker';
import { Subtitle, Title } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { formatClock, formatFullDate, parseClock } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { tap, toggle as toggleFeedback } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';

/**
 * Every reminder in the app, in one place.
 *
 * The alternative was a switch on each of four different forms, which is where
 * this started: the card form had one and nothing else did. That spreads the
 * same decision across four screens and gives nobody a way to answer "what is
 * Skip going to message me about" without visiting all of them.
 *
 * Grouped by what the thing is rather than by when it fires, because that is
 * how people look for them — you come here to turn off the reminder for a
 * subscription you just cancelled, and you know it was a subscription.
 */

type Item = {
  kind: ReminderKind;
  id: string;
  label: string;
  caption: string;
  /**
   * Why this one cannot be reminded about, if it cannot. A card with no
   * payment day and an account nothing is paid into have no date to count
   * back from, and a switch that saves a setting nothing can act on is a
   * promise the app cannot keep.
   */
  blocked?: string;
};

type Group = {
  title: string;
  icon: LucideIcon;
  items: Item[];
};

export default function RemindersScreen() {
  const artwork = useArtwork();
  const colors = useColors();

  const bills = useBills();
  const subscriptions = useSubscriptions();
  const cards = useCards();
  const accounts = useBankAccounts();
  const reminders = useReminders();
  const { ids: salaryAccountIds } = useSalaryAccountIds();

  // Which row's clock is open, by target key. One at a time.
  const [timeFor, setTimeFor] = useState<string | null>(null);

  const setReminder = useSetReminder();
  const removeReminder = useRemoveReminder();

  const loading =
    bills.isLoading ||
    subscriptions.isLoading ||
    cards.isLoading ||
    accounts.isLoading ||
    reminders.isPending;

  /** "4 May 2026" rather than the stored ISO. Dates here are read, not parsed. */
  const when = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

  /** What is stored, keyed the way the rows ask for it. */
  const stored = useMemo(
    () => new Map((reminders.data ?? []).map((row) => [reminderKey(row), row])),
    [reminders.data],
  );

  const groups = useMemo<Group[]>(
    () => [
      {
        title: 'Bills',
        icon: ReceiptText,
        items: (bills.data ?? []).map((row) => ({
          kind: 'bill' as const,
          id: row.id,
          label: row.name,
          caption: row.next_due_on
            ? `${formatCurrency(row.amount)} · due ${when(row.next_due_on)}`
            : formatCurrency(row.amount),
        })),
      },
      {
        title: 'Subscriptions',
        icon: Repeat,
        items: (subscriptions.data ?? [])
          .filter((row) => row.active)
          .map((row) => ({
            kind: 'subscription' as const,
            id: row.id,
            label: row.name,
            caption: row.next_renewal_on
              ? `${formatCurrency(row.amount)} · renews ${when(row.next_renewal_on)}`
              : formatCurrency(row.amount),
          })),
      },
      {
        title: 'Cards',
        icon: CreditCard,
        items: (cards.data ?? []).map((row) => ({
          kind: 'card' as const,
          id: row.id,
          label: row.holder || 'Card',
          caption: row.last4 ? `•••• ${row.last4}` : row.network,
          blocked: row.bill_due_day ? undefined : 'Add a payment day to this card first',
        })),
      },
      {
        title: 'Bank accounts',
        icon: Landmark,
        items: (accounts.data ?? []).map((row) => ({
          kind: 'account' as const,
          id: row.id,
          label: row.nickname || row.bank_name || 'Account',
          caption: row.last4 ? `•••• ${row.last4}` : row.account_type,
          blocked: salaryAccountIds.has(row.id) ? undefined : 'No pay lands here yet',
        })),
      },
    ],
    [bills.data, subscriptions.data, cards.data, accounts.data, salaryAccountIds],
  );

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  // Counted over what can actually be switched on. A card with no payment day
  // is not one of nine things you have declined to be told about.
  const available = groups.reduce(
    (sum, group) => sum + group.items.filter((item) => !item.blocked).length,
    0,
  );
  const on = (reminders.data ?? []).filter((row) => row.enabled).length;

  return (
    <Screen showBack onRefresh={() => reminders.refetch()}>
      <Title align="left" className="mt-1 w-full">
        Reminders
      </Title>
      <Subtitle className="mt-2 w-full text-left">
        {total === 0
          ? 'Once you add a bill, a subscription, a card or an account, it can remind you here.'
          : `${on} of ${available} will let you know.`}
      </Subtitle>

      {loading ? <SkeletonList rows={6} /> : null}

      {!loading && total === 0 ? (
        <PageState
          art={artwork.emptyWallet}
          title="Nothing to remind you about"
          message="Reminders follow the things you track, so add a bill or a subscription first."
        />
      ) : null}

      {!loading &&
        groups
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <View key={group.title} className="mt-7 w-full">
              <View className="flex-row items-center gap-2">
                <group.icon size={18} color={colors.muted} strokeWidth={2} />
                <Text
                  className="font-poppins-bold text-[18px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {group.title}
                </Text>
              </View>

              {/* What the reminder is counted from. Different for each kind,
                  and the account one runs the other way — it is about money
                  arriving rather than leaving. */}
              <Text
                className="mt-1 font-poppins text-[13px] text-muted"
                maxFontSizeMultiplier={1.3}
              >
                {REMINDER_CAPTION[group.items[0].kind]}
              </Text>

              <View className="mt-2 w-full">
                {group.items.map((item) => {
                  const key = targetKey(item.kind, item.id);
                  const row = stored.get(key);
                  const enabled = row?.enabled ?? false;
                  const leadDays = row?.lead_days ?? DEFAULT_LEAD_DAYS;
                  const remindAt = row?.remind_at?.slice(0, 5) ?? DEFAULT_REMIND_AT;
                  const clock = parseClock(remindAt);

                  return (
                    <View
                      key={item.id}
                      className="mt-2.5 w-full rounded-[16px] border border-line bg-card px-4 py-3.5"
                    >
                      <View className="w-full flex-row items-center gap-3">
                        <View className="flex-1">
                          <Text
                            className="font-poppins-semibold text-[15px] text-ink"
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.3}
                          >
                            {item.label}
                          </Text>
                          <Text
                            className="font-poppins text-[13px] text-muted"
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.3}
                          >
                            {item.caption}
                          </Text>
                        </View>

                        {item.blocked ? (
                          <Text
                            className="max-w-[45%] text-right font-poppins text-[12px] text-muted"
                            maxFontSizeMultiplier={1.2}
                          >
                            {item.blocked}
                          </Text>
                        ) : (
                          <Switch
                            value={enabled}
                            onValueChange={(next) => {
                              toggleFeedback();
                              setReminder.mutate({
                                kind: item.kind,
                                targetId: item.id,
                                enabled: next,
                                leadDays,
                              });
                            }}
                            trackColor={{ false: colors.line, true: colors.control }}
                            thumbColor="#FFFFFF"
                            ios_backgroundColor={colors.line}
                          />
                        )}
                      </View>

                      {/* The lead time only exists once there is something to
                          lead. Showing it on an off reminder asks people to
                          set a detail of a thing that will not happen. */}
                      {enabled && !item.blocked ? (
                        <View className="mt-3 w-full flex-row flex-wrap items-center gap-2">
                          {LEAD_OPTIONS.map((option) => {
                            const selected = option.value === leadDays;
                            return (
                              <Pressable
                                key={option.value}
                                accessibilityRole="radio"
                                accessibilityState={{ selected }}
                                accessibilityLabel={`Remind ${option.label.toLowerCase()} before`}
                                onPress={() => {
                                  tap();
                                  setReminder.mutate({
                                    kind: item.kind,
                                    targetId: item.id,
                                    enabled: true,
                                    leadDays: option.value,
                                    remindAt,
                                  });
                                }}
                                className={cn(
                                  'rounded-full border px-3 py-1.5',
                                  selected
                                    ? 'border-control bg-control'
                                    : 'border-line bg-card active:bg-ink/5',
                                )}
                              >
                                <Text
                                  className={cn(
                                    'text-[12px]',
                                    selected
                                      ? 'font-poppins-medium text-on-control'
                                      : 'font-poppins text-body',
                                  )}
                                  maxFontSizeMultiplier={1.2}
                                >
                                  {option.label}
                                </Text>
                              </Pressable>
                            );
                          })}

                          {/* What time of day it arrives. A reminder with no
                              time lands whenever the job happens to run, which
                              is how you get told about the rent at 3am. */}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Sent at ${formatClock(
                              clock.hour,
                              clock.minute,
                            )}. Change the time for ${item.label}.`}
                            onPress={() => {
                              tap();
                              setTimeFor(key);
                            }}
                            className="flex-row items-center gap-1.5 rounded-full border border-line px-3 py-1.5 active:bg-ink/5"
                          >
                            <Clock size={13} color={colors.muted} strokeWidth={2} />
                            <Text
                              className="font-poppins text-[12px] text-body"
                              maxFontSizeMultiplier={1.2}
                            >
                              {formatClock(clock.hour, clock.minute)}
                            </Text>
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove the reminder for ${item.label}`}
                            onPress={() => {
                              tap();
                              removeReminder.mutate({ kind: item.kind, targetId: item.id });
                            }}
                            className="ml-auto h-8 w-8 items-center justify-center rounded-full active:bg-ink/5"
                          >
                            <Trash2 size={16} color={colors.muted} strokeWidth={2} />
                          </Pressable>
                        </View>
                      ) : null}

                      {timeFor === key ? (
                        <TimePicker
                          value={remindAt}
                          onCancel={() => setTimeFor(null)}
                          onConfirm={(next) => {
                            setTimeFor(null);
                            setReminder.mutate({
                              kind: item.kind,
                              targetId: item.id,
                              enabled: true,
                              leadDays,
                              remindAt: next,
                            });
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

      {!loading && total > 0 ? (
        <View className="mt-8 w-full flex-row items-start gap-2.5 rounded-[14px] bg-ink/[0.035] px-4 py-3.5">
          <Bell size={16} color={colors.muted} strokeWidth={2} />
          <Text
            className="flex-1 font-poppins text-[13px] leading-[19px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            Reminders arrive as a notification. Turn them off for Skip in your phone&apos;s settings
            and nothing here will reach you.
          </Text>
        </View>
      ) : null}

      <View className="h-16 w-full" />
    </Screen>
  );
}
