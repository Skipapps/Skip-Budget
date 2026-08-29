import { Bell, CreditCard, Landmark, ReceiptText, Repeat, Trash2 } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import {
  DEFAULT_LEAD_DAYS,
  LEAD_OPTIONS,
  reminderKey,
  targetKey,
  useReminders,
  useRemoveReminder,
  useSetReminder,
  type ReminderKind,
} from '@/api/reminders';
import { useArtwork } from '@/theme/artwork';
import { useBankAccounts, useBills, useCards, useSubscriptions } from '@/api/queries';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Subtitle, Title } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { formatFullDate } from '@/lib/date';
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
        })),
      },
    ],
    [bills.data, subscriptions.data, cards.data, accounts.data],
  );

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const on = (reminders.data ?? []).filter((row) => row.enabled).length;

  return (
    <Screen showBack onRefresh={() => reminders.refetch()}>
      <Title align="left" className="mt-1 w-full">
        Reminders
      </Title>
      <Subtitle className="mt-2 w-full text-left">
        {total === 0
          ? 'Once you add a bill, a subscription, a card or an account, it can remind you here.'
          : `${on} of ${total} things will let you know before they land.`}
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

              <View className="mt-2 w-full">
                {group.items.map((item) => {
                  const row = stored.get(targetKey(item.kind, item.id));
                  const enabled = row?.enabled ?? false;
                  const leadDays = row?.lead_days ?? DEFAULT_LEAD_DAYS;

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
                      </View>

                      {/* The lead time only exists once there is something to
                          lead. Showing it on an off reminder asks people to
                          set a detail of a thing that will not happen. */}
                      {enabled ? (
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
