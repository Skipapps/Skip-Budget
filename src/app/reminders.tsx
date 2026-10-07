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
import { Subtitle } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { formatClock, formatFullDate, parseClock } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { tap } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { failureText } from '@/lib/failure';
import { t } from '@/i18n';

type Item = {
  kind: ReminderKind;
  id: string;
  label: string;
  caption: string;
  /** Why it cannot be reminded about: with no payment day or no pay arriving there is no date. */
  blocked?: string;
};

type Group = {
  title: string;
  icon: LucideIcon;
  items: Item[];
};

/** The one reminder that points at nothing. `targetKey` makes `kind:id`, so this cannot collide. */
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
    // Held back with the rest so a switch does not snap on after the page draws.
    receipts.isLoading ||
    // Until this lands no account looks like one pay arrives in, so rows would flash "No pay lands
    // here yet".
    salaryAccounts.isLoading;

  /**
   * Any read that decides what a switch says. A switch drawn off for a read that never landed would
   * misreport the setting, so a failure takes the page. The daily receipts reminder is the
   * exception: its failure stays its own and must not take down the other reminders.
   */
  const failed =
    bills.isError ||
    subscriptions.isError ||
    cards.isError ||
    accounts.isError ||
    reminders.isError ||
    salaryAccounts.isError;

  const receiptsFailed = receipts.isError;

  const retry = () => {
    void bills.refetch();
    void subscriptions.refetch();
    void cards.refetch();
    void accounts.refetch();
    void reminders.refetch();
    void receipts.refetch();
    void salaryAccounts.refetch();
  };

  /** "4 May 2026" rather than the stored ISO. */
  const when = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

  const receiptClock = parseClock(receipts.remindAt);

  const stored = useMemo(
    () => new Map((reminders.data ?? []).map((row) => [reminderKey(row), row])),
    [reminders.data],
  );

  const groups = useMemo<Group[]>(
    () => [
      {
        title: t('reminders.group.bills'),
        icon: ReceiptText,
        items: (bills.data ?? []).map((row) => ({
          kind: 'bill' as const,
          id: row.id,
          label: row.name,
          caption: row.next_due_on
            ? t('reminders.bill.due', {
                amount: formatCurrency(row.amount),
                date: when(row.next_due_on),
              })
            : formatCurrency(row.amount),
        })),
      },
      {
        title: t('reminders.group.subscriptions'),
        icon: Repeat,
        items: (subscriptions.data ?? [])
          .filter((row) => row.active)
          .map((row) => ({
            kind: 'subscription' as const,
            id: row.id,
            label: row.name,
            caption: row.next_renewal_on
              ? t('reminders.subscription.renews', {
                  amount: formatCurrency(row.amount),
                  date: when(row.next_renewal_on),
                })
              : formatCurrency(row.amount),
          })),
      },
      {
        title: t('reminders.group.cards'),
        icon: CreditCard,
        items: (cards.data ?? []).map((row) => ({
          kind: 'card' as const,
          id: row.id,
          label: row.holder || t('reminders.card.fallback'),
          // The network is a brand name ("VISA"), the same in every language.
          caption: row.last4 ? `•••• ${row.last4}` : row.network,
          blocked: row.bill_due_day ? undefined : t('reminders.card.noPaymentDay'),
        })),
      },
      {
        title: t('reminders.group.accounts'),
        icon: Landmark,
        items: (accounts.data ?? []).map((row) => ({
          kind: 'account' as const,
          id: row.id,
          label: row.nickname || row.bank_name || t('reminders.account.fallback'),
          caption: row.last4
            ? `•••• ${row.last4}`
            : t(
                row.account_type === 'savings'
                  ? 'reminders.account.savings'
                  : 'reminders.account.checking',
              ),
          blocked: salaryAccounts.ids.has(row.id) ? undefined : t('reminders.account.noPay'),
        })),
      },
    ],
    [bills.data, subscriptions.data, cards.data, accounts.data, salaryAccounts.ids],
  );

  const targets = groups.reduce((sum, group) => sum + group.items.length, 0);
  // Counted over what can actually be switched on, plus the receipts reminder (in neither number if
  // its own read failed, since the page cannot say whether it is on).
  const available =
    (receiptsFailed ? 0 : 1) +
    groups.reduce((sum, group) => sum + group.items.filter((item) => !item.blocked).length, 0);
  const on =
    (receipts.enabled && !receiptsFailed ? 1 : 0) +
    (reminders.data ?? []).filter((row) => row.enabled).length;

  return (
    <Screen title={t('reminders.title')} showBack onRefresh={retry}>
      {failed ? null : (
        <Subtitle className="mt-2 w-full text-left">
          {available === 0
            ? t('reminders.summary.nothing')
            : t(targets === 0 ? 'reminders.summary.countAndAdd' : 'reminders.summary.count', {
                count: on,
                available,
              })}
        </Subtitle>
      )}

      {loading && !failed ? <SkeletonList rows={6} /> : null}

      {failed ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={retry}
        />
      ) : null}

      {!loading && !failed ? (
        <View className="mt-8 w-full">
          <View className="flex-row items-center gap-2">
            <ReceiptText size={18} color={colors.muted} strokeWidth={1.8} />
            <Text className="font-app-semibold text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
              {t('reminders.receipts.title')}
            </Text>
          </View>

          <Text className="mt-1 font-app text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
            {t('reminders.receipts.caption')}
          </Text>

          <View className="mt-2 w-full">
            <View className="mt-3 w-full rounded-[16px] border border-line bg-card px-4 py-3.5">
              <View className="w-full flex-row items-center gap-3">
                <View className="flex-1">
                  <Text
                    className="font-app-semibold text-[15px] text-ink"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {t('reminders.receipts.daily')}
                  </Text>
                  <Text
                    className="font-app text-[13px] text-muted"
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.3}
                  >
                    {receiptsFailed ? failureText() : t('reminders.receipts.nudge')}
                  </Text>
                </View>

                {receiptsFailed ? (
                  <TextLink
                    label={t('common.tryAgain')}
                    variant="subtle"
                    onPress={() => void receipts.refetch()}
                  />
                ) : (
                  <SwitchControl
                    value={receipts.enabled}
                    onValueChange={(next) => {
                      // No time sent, so toggling keeps the hour already chosen.
                      setReceiptReminder.mutate({ enabled: next });
                    }}
                    accessibilityLabel={t('reminders.receipts.daily')}
                  />
                )}
              </View>

              {receipts.enabled && !receiptsFailed ? (
                <View className="mt-3 w-full flex-row flex-wrap items-center gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('reminders.receipts.time', {
                      time: formatClock(receiptClock.hour, receiptClock.minute),
                    })}
                    onPress={() => {
                      tap();
                      setTimeFor(RECEIPTS_KEY);
                    }}
                    hitSlop={8}
                    className="min-h-10 flex-row items-center gap-1.5 rounded-full bg-ink/5 px-4 active:bg-ink/10"
                  >
                    <Clock size={18} color={colors.body} strokeWidth={1.8} />
                    <Text
                      className="font-app-medium text-[14px] text-body"
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
                  className="font-app-semibold text-[17px] text-ink"
                  maxFontSizeMultiplier={1.3}
                >
                  {group.title}
                </Text>
              </View>

              <Text className="mt-1 font-app text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
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
                            className="font-app-semibold text-[15px] text-ink"
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.3}
                          >
                            {item.label}
                          </Text>
                          <Text
                            className="font-app text-[13px] text-muted"
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.3}
                          >
                            {item.caption}
                          </Text>
                        </View>

                        {item.blocked ? (
                          <Text
                            className="max-w-[45%] text-right font-app text-[12px] text-muted"
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
                            accessibilityLabel={t('reminders.remindAbout', { name: item.label })}
                          />
                        )}
                      </View>

                      {enabled && !item.blocked ? (
                        <View className="mt-3 w-full flex-row flex-wrap items-center gap-2">
                          {LEAD_OPTIONS.map((option) => {
                            const selected = option.value === leadDays;
                            return (
                              <Pressable
                                key={option.value}
                                accessibilityRole="radio"
                                accessibilityState={{ selected }}
                                accessibilityLabel={
                                  option.value === 0
                                    ? t('reminders.lead.sameDay')
                                    : t('reminders.lead.before', {
                                        lead: option.label.toLowerCase(),
                                      })
                                }
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
                                      ? 'font-app-medium text-on-control'
                                      : 'font-app text-body',
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
                            accessibilityLabel={t('reminders.time', {
                              time: formatClock(clock.hour, clock.minute),
                              name: item.label,
                            })}
                            onPress={() => {
                              tap();
                              setTimeFor(key);
                            }}
                            hitSlop={8}
                            className="min-h-10 flex-row items-center gap-1.5 rounded-full bg-ink/5 px-4 active:bg-ink/10"
                          >
                            <Clock size={18} color={colors.body} strokeWidth={1.8} />
                            <Text
                              className="font-app-medium text-[14px] text-body"
                              maxFontSizeMultiplier={1.2}
                            >
                              {formatClock(clock.hour, clock.minute)}
                            </Text>
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('reminders.remove', { name: item.label })}
                            onPress={() => {
                              tap();
                              removeReminder.mutate({ kind: item.kind, targetId: item.id });
                            }}
                            // 32pt box to fit the row; hitSlop brings the target up to 44pt+.
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

      {!loading && !failed ? (
        <View className="mt-8 w-full flex-row items-start gap-3 rounded-[16px] bg-ink/5 px-4 py-3.5">
          <Bell size={18} color={colors.muted} strokeWidth={1.8} />
          <Text
            className="flex-1 font-app text-[13px] leading-[19px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            {t('reminders.footer')}
          </Text>
        </View>
      ) : null}

      <View className="h-16 w-full" />
    </Screen>
  );
}
