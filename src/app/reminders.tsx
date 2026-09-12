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
import { Pressable, Text, View } from 'react-native';

import {
  DEFAULT_LEAD_DAYS,
  DEFAULT_REMIND_AT,
  LEAD_OPTIONS,
  REMINDER_CAPTION,
  reminderKey,
  targetKey,
  useReceiptReminder,
  useReminders,
  useRemoveReminder,
  useSetReceiptReminder,
  useSetReminder,
  type ReminderKind,
} from '@/api/reminders';
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
import { SwitchControl } from '@/components/ui/switch-control';
import { TextLink } from '@/components/ui/text-link';
import { TimePicker } from '@/components/ui/time-picker';
import { Subtitle, Title } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { formatClock, formatFullDate, parseClock } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { tap } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

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

/**
 * The one reminder that points at nothing, so it cannot be a row in a group.
 *
 * `targetKey` produces `kind:id`, so this sentinel cannot collide with one.
 */
const RECEIPTS_KEY = 'receipts';

export default function RemindersScreen() {
  const colors = useColors();
  const artwork = useArtwork();

  const bills = useBills();
  const subscriptions = useSubscriptions();
  const cards = useCards();
  const accounts = useBankAccounts();
  const reminders = useReminders();
  const receipts = useReceiptReminder();
  const salaryAccounts = useSalaryAccountIds();

  // Which row's clock is open, by target key. One at a time.
  const [timeFor, setTimeFor] = useState<string | null>(null);

  const setReminder = useSetReminder();
  const removeReminder = useRemoveReminder();
  const setReceiptReminder = useSetReceiptReminder();

  const loading =
    bills.isLoading ||
    subscriptions.isLoading ||
    cards.isLoading ||
    accounts.isLoading ||
    reminders.isPending ||
    // Held back with the rest rather than rendered early: a switch that snaps
    // itself on a beat after the page draws reads as the app changing its mind.
    receipts.isLoading ||
    // Held back for the same reason, one step further on: until this lands,
    // no account looks like one pay arrives in, so every account row would
    // draw "No pay lands here yet" and then quietly grow a switch.
    salaryAccounts.isLoading;

  /**
   * Any read that decides what a switch says.
   *
   * A switch drawn off is a statement — "you have turned this off" — and it is
   * the most misleading answer a notification setting can give to a read that
   * never landed. The same goes for the two reads that decide whether a row
   * can be switched at all: without them a card or an account is shown as
   * nothing Skip could ever remind you about. So a failure anywhere takes the
   * page rather than being drawn as a setting.
   *
   * The daily receipts reminder is the exception, and deliberately so. It is
   * one row, read from one column, and it is the row whose migration is not on
   * every database yet — so its failure is its own. Losing it must not take
   * down the bill, subscription, card and account reminders, which come from
   * different tables and are the reason most people opened this page.
   */
  const failed =
    bills.isError ||
    subscriptions.isError ||
    cards.isError ||
    accounts.isError ||
    reminders.isError ||
    salaryAccounts.isError;

  /** The receipts read alone, which takes its own section and nothing else. */
  const receiptsFailed = receipts.isError;

  /** Every read on the page, because any one of them can be the one that failed. */
  const retry = () => {
    void bills.refetch();
    void subscriptions.refetch();
    void cards.refetch();
    void accounts.refetch();
    void reminders.refetch();
    void receipts.refetch();
    void salaryAccounts.refetch();
  };

  /** "4 May 2026" rather than the stored ISO. Dates here are read, not parsed. */
  const when = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

  /** The receipts reminder's hour, defaulted upstream to the Founder's 8:00 pm. */
  const receiptClock = parseClock(receipts.remindAt);

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
          blocked: salaryAccounts.ids.has(row.id) ? undefined : 'No pay lands here yet',
        })),
      },
    ],
    [bills.data, subscriptions.data, cards.data, accounts.data, salaryAccounts.ids],
  );

  const targets = groups.reduce((sum, group) => sum + group.items.length, 0);
  /**
   * Counted over what can actually be switched on, plus the receipts reminder.
   *
   * A card with no payment day is not one of nine things you have declined to
   * be told about. The receipts reminder needs nothing to point at, so it is
   * always available and always counted — leaving it out of both numbers made
   * the sentence a lie the moment somebody turned it on. Unless its own read
   * failed, in which case it is in neither number: the page cannot say whether
   * it is on, so it cannot count it.
   */
  const available =
    (receiptsFailed ? 0 : 1) +
    groups.reduce((sum, group) => sum + group.items.filter((item) => !item.blocked).length, 0);
  const on =
    (receipts.enabled && !receiptsFailed ? 1 : 0) +
    (reminders.data ?? []).filter((row) => row.enabled).length;

  return (
    <Screen showBack onRefresh={retry}>
      <Title align="left" className="mt-1 w-full">
        Reminders
      </Title>
      {/* The count always leads, because there is always at least the receipts
          reminder to count. On a fresh account it carries the sentence the
          empty state used to: there is something here to set, and more of it
          arrives as things are added. Not drawn over a failed read: "0 of 1"
          would be a figure about settings nobody could see. */}
      {failed ? null : (
        <Subtitle className="mt-2 w-full text-left">
          {available === 0
            ? 'Add a bill, a subscription, a card or an account and Skip can remind you about those.'
            : targets === 0
              ? `${on} of ${available} will let you know. Add a bill, a subscription, a card or an account and Skip can remind you about those too.`
              : `${on} of ${available} will let you know.`}
        </Subtitle>
      )}

      {loading && !failed ? <SkeletonList rows={6} /> : null}

      {failed ? (
        <PageState
          art={artwork.error}
          title="Could not load your reminders"
          message="Nothing has changed. Check your connection and try again — until this loads, Skip cannot tell you what it is set to send."
          actionLabel="Try again"
          onAction={retry}
        />
      ) : null}

      {!loading && !failed ? (
        <View className="mt-8 w-full">
          <View className="flex-row items-center gap-2">
            <ReceiptText size={18} color={colors.muted} strokeWidth={1.8} />
            <Text
              className="font-poppins-semibold text-[17px] text-ink"
              maxFontSizeMultiplier={1.3}
            >
              Receipts
            </Text>
          </View>

          <Text className="mt-1 font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
            Every day, so nothing gets forgotten.
          </Text>

          <View className="mt-2 w-full">
            <View className="mt-3 w-full rounded-[16px] border border-line bg-card px-4 py-3.5">
              <View className="w-full flex-row items-center gap-3">
                <View className="flex-1">
                  <Text
                    className="font-poppins-semibold text-[15px] text-ink"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    Daily receipts reminder
                  </Text>
                  <Text
                    className="font-poppins text-[13px] text-muted"
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.3}
                  >
                    {receiptsFailed
                      ? 'Skip could not check whether this one is on.'
                      : 'A nudge to log what you bought today.'}
                  </Text>
                </View>

                {/* No switch over a read that never landed: off would be a
                    statement about a setting nobody can see. */}
                {receiptsFailed ? (
                  <TextLink
                    label="Try again"
                    variant="subtle"
                    onPress={() => void receipts.refetch()}
                  />
                ) : (
                  <SwitchControl
                    value={receipts.enabled}
                    onValueChange={(next) => {
                      // No time sent: turning it off and on again keeps whatever
                      // hour was chosen rather than snapping back to the default.
                      setReceiptReminder.mutate({ enabled: next });
                    }}
                    accessibilityLabel="Daily receipts reminder"
                  />
                )}
              </View>

              {/* No lead-day chips: there is nothing to lead. The time is the
                  only detail this one has. */}
              {receipts.enabled && !receiptsFailed ? (
                <View className="mt-3 w-full flex-row flex-wrap items-center gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Sent at ${formatClock(
                      receiptClock.hour,
                      receiptClock.minute,
                    )}. Change the time for the daily receipts reminder.`}
                    onPress={() => {
                      tap();
                      setTimeFor(RECEIPTS_KEY);
                    }}
                    hitSlop={8}
                    className="min-h-10 flex-row items-center gap-1.5 rounded-full bg-ink/5 px-4 active:bg-ink/10"
                  >
                    <Clock size={18} color={colors.body} strokeWidth={1.8} />
                    <Text
                      className="font-poppins-medium text-[14px] text-body"
                      maxFontSizeMultiplier={1.2}
                    >
                      {formatClock(receiptClock.hour, receiptClock.minute)}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {timeFor === RECEIPTS_KEY ? (
                <TimePicker
                  value={receipts.remindAt}
                  onCancel={() => setTimeFor(null)}
                  onConfirm={(next) => {
                    setTimeFor(null);
                    setReceiptReminder.mutate({ enabled: true, remindAt: next });
                  }}
                />
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {!loading &&
        !failed &&
        groups
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <View key={group.title} className="mt-8 w-full">
              <View className="flex-row items-center gap-2">
                <group.icon size={18} color={colors.muted} strokeWidth={1.8} />
                <Text
                  className="font-poppins-semibold text-[17px] text-ink"
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
                      className="mt-3 w-full rounded-[16px] border border-line bg-card px-4 py-3.5"
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
                          <SwitchControl
                            value={enabled}
                            onValueChange={(next) => {
                              setReminder.mutate({
                                kind: item.kind,
                                targetId: item.id,
                                enabled: next,
                                leadDays,
                              });
                            }}
                            accessibilityLabel={`Remind me about ${item.label}`}
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
                                hitSlop={{ top: 4, bottom: 4 }}
                                className={cn(
                                  'min-h-10 justify-center rounded-full px-4',
                                  selected ? 'bg-control' : 'bg-ink/5 active:bg-ink/10',
                                )}
                              >
                                <Text
                                  className={cn(
                                    'text-[14px]',
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
                            hitSlop={8}
                            className="min-h-10 flex-row items-center gap-1.5 rounded-full bg-ink/5 px-4 active:bg-ink/10"
                          >
                            <Clock size={18} color={colors.body} strokeWidth={1.8} />
                            <Text
                              className="font-poppins-medium text-[14px] text-body"
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
                            // The box is 32pt because the row cannot afford 44;
                            // the target is 44 regardless.
                            hitSlop={8}
                            className="ml-auto h-8 w-8 items-center justify-center rounded-full active:bg-ink/5"
                          >
                            <Trash2 size={16} color={colors.muted} strokeWidth={1.8} />
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

      {/* Always worth saying now: the receipts reminder means every account has
          at least one thing that arrives as a notification. */}
      {!loading && !failed ? (
        <View className="mt-8 w-full flex-row items-start gap-3 rounded-[16px] bg-ink/5 px-4 py-3.5">
          <Bell size={18} color={colors.muted} strokeWidth={1.8} />
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
