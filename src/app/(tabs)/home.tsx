import { router, type Href } from 'expo-router';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { DestinationList } from '@/components/dashboard/destination-list';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { usePro } from '@/api/pro';
import { GettingStartedCard } from '@/components/dashboard/getting-started-card';
import { InsightBanner } from '@/components/dashboard/insight-banner';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ToolCards } from '@/components/dashboard/tool-cards';
import { DateSelector } from '@/components/dashboard/date-selector';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { TextLink } from '@/components/ui/text-link';
import { SectionHeading } from '@/components/ui/typography';
import { useLedger, useProfile, type LedgerEntry } from '@/api/queries';
import { useCharges } from '@/api/charges';
import { useHasUnreadNews } from '@/api/news';
import { useKeepSchedulesCurrent, useRefreshAll } from '@/api/refresh';
import { spendingCategories, type SpendingCategory } from '@/data/dashboard-mock';
import { t, type MessageKey } from '@/i18n';
import { chargeOwners, ledgerHref } from '@/lib/ledger-link';
import { groupByDate } from '@/lib/group';
import { rangeFor, restOfMonth } from '@/lib/range';
import { addDays, formatDayLabel, toIsoDate } from '@/lib/date';
import { useToday } from '@/lib/use-today';
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

/** What each kind of row says under its name; kinds missing here say nothing. */
const KIND_LABELS: Record<string, MessageKey> = {
  receipt: 'home.kind.receipt',
  bill: 'home.kind.bill',
  subscription: 'home.kind.subscription',
};

/** The tile ids are stored values; only what the rows show is looked up by them. */
const DESTINATION_LABELS: Record<string, MessageKey> = {
  'monthly-bills': 'home.destination.monthlyBills',
  receipts: 'home.destination.receipts',
  subscriptions: 'home.destination.subscriptions',
  'loan-calculator': 'home.tool.loanCalculator',
};

const worded = (tile: SpendingCategory): SpendingCategory => {
  const key = DESTINATION_LABELS[tile.id];
  return key ? { ...tile, label: t(key) } : tile;
};

const DESTINATION_ROUTES: Record<string, Href> = {
  'monthly-bills': '/bills',
  receipts: '/receipts',
  subscriptions: '/subscriptions',
};

/** The loan calculator is drawn as a card below the list, not as a destination tile. */
const TOOL_IDS = new Set(['loan-calculator']);

const TILES = spendingCategories.filter((tile) => !TOOL_IDS.has(tile.id));

export default function HomeScreen() {
  const { pro } = usePro();
  useKeepSchedulesCurrent();
  const { refresh, refreshing } = useRefreshAll();

  const profile = useProfile();

  // One day for every window below; it turns at midnight and on resume.
  const { today, todayDate } = useToday();

  // The calendar month we are in, not the date picker's: browsing another day changes the list,
  // not this month.
  const monthRange = useMemo(() => rangeFor('month', todayDate), [todayDate]);
  const month = useLedger(monthRange, today);

  // One window of real occurrences (bill on its due date, subscription on its renewal, receipt on
  // the day bought, salary on paydays); nothing is averaged into a monthly rate.
  const spentOn = (kind: string) =>
    month.entries
      .filter((entry) => entry.kind === kind)
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  const monthlyBillsTotal = spentOn('bill');
  const receiptsTotal = spentOn('receipt');
  const subscriptionsTotal = spentOn('subscription');

  // The three tiles add up to expenses exactly: they are the same entries grouped by kind.
  const expensesThisMonth = month.totals.out;
  const payday = month.totals.in;

  const tileAmounts: Record<string, number | undefined> = {
    'monthly-bills': -monthlyBillsTotal,
    receipts: -receiptsTotal,
    subscriptions: -subscriptionsTotal,
  };

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  // Follow midnight only if the selector was on the old today; a deliberately browsed day stays.
  const prevToday = useRef(today);
  useEffect(() => {
    if (prevToday.current !== today) {
      setSelectedDate((held) => (toIsoDate(held) === prevToday.current ? todayDate : held));
      prevToday.current = today;
    }
  }, [today, todayDate]);

  const atLatest = toIsoDate(selectedDate) >= today;

  // Recent is the chosen day alone. Coming up is what the bills still schedule for the rest of this
  // month, from today whichever day is chosen: the selector never passes today, so anchoring it to
  // the chosen day would list days that have already happened as coming up.
  const recent = useLedger(
    useMemo(() => {
      const day = toIsoDate(selectedDate);
      return { from: day, to: day };
    }, [selectedDate]),
    today,
  );
  const upcoming = useLedger(
    useMemo(() => restOfMonth(todayDate), [todayDate]),
    today,
  );

  // Which plan each recorded charge came from, so a row opens the record behind it. The ledger
  // reads the same query, so this costs no extra fetch.
  const charges = useCharges();
  const unreadNews = useHasUnreadNews();
  const owners = useMemo(() => chargeOwners(charges.data ?? []), [charges.data]);

  /** The row's handler, or undefined when there is nothing to open. */
  const openEntry = (entry: LedgerEntry) => {
    const href = ledgerHref(entry, owners);
    return href ? () => router.push(href) : undefined;
  };

  const { weekday, date } = formatDayLabel(selectedDate);

  const handleConfirmDate = (date: Date) => {
    // No future days: what is ahead already has its own heading.
    setSelectedDate(date > todayDate ? todayDate : date);
    setPickerOpen(false);
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View className="mt-2 w-full">
        <DashboardHeader
          name={profile.data?.display_name ?? t('home.welcome')}
          avatarId={profile.data?.avatar_id}
          onAvatarPress={() => router.push('/avatar')}
          onNotificationsPress={() => router.push('/notifications')}
          unread={unreadNews}
        />
      </View>

      <View className="mt-6 w-full">
        <BalanceSummary
          leftThisMonth={payday - expensesThisMonth}
          payday={payday}
          expenses={expensesThisMonth}
          loading={month.isLoading}
          error={month.isError}
        />
      </View>

      <View className="mt-6 w-full">
        <SectionHeading>{t('home.quickAdd')}</SectionHeading>
      </View>
      <View className="mt-3 w-full">
        <QuickActions onPress={(href) => router.push(href)} />
      </View>

      {/* Renders nothing, margin included, once done or dismissed. */}
      <GettingStartedCard />

      <View className="mt-8 w-full">
        <SectionHeading caption={t('home.thisMonth')}>{t('home.whereItGoes')}</SectionHeading>
      </View>

      <View className="mt-3 w-full">
        <DestinationList
          items={TILES.map(worded)}
          amounts={tileAmounts}
          pro={pro}
          loading={month.isLoading}
          error={month.isError}
          onRetry={refresh}
          onPress={(id) => {
            const href = DESTINATION_ROUTES[id];
            if (href) router.push(href);
          }}
        />
      </View>

      <View className="mt-8 w-full">
        <SectionHeading caption={t('home.includedWithPro')}>{t('home.goFurther')}</SectionHeading>
      </View>
      <View className="mt-3 w-full">
        <ToolCards pro={pro} onPress={(href) => router.push(href)} />
      </View>
      <View className="mt-4 w-full">
        <InsightBanner pro={pro} onPress={() => router.push('/insights')} />
      </View>

      <View className="mt-8 w-full">
        <DateSelector
          weekday={weekday}
          date={date}
          onPrevious={() => setSelectedDate((current) => addDays(current, -1))}
          onNext={() => setSelectedDate((current) => addDays(current, 1))}
          onPickDate={() => setPickerOpen(true)}
          atLatest={atLatest}
        />
      </View>

      <Section
        title={t('home.recent')}
        entries={recent.entries}
        empty={t('home.recent.empty')}
        loading={recent.isLoading}
        error={recent.isError}
        onRetry={refresh}
        today={today}
        onEntryPress={openEntry}
        // Oldest day first, the chosen day last, like every dated list.
        direction="asc"
      />

      <View className="w-full pb-24">
        <Section
          title={t('home.comingUp')}
          entries={upcoming.entries}
          empty={t('home.comingUp.empty')}
          loading={upcoming.isLoading}
          error={upcoming.isError}
          onRetry={refresh}
          today={today}
          onEntryPress={openEntry}
          direction="asc"
        />
      </View>

      {pickerOpen ? (
        <DatePicker
          value={selectedDate}
          onCancel={() => setPickerOpen(false)}
          onConfirm={handleConfirmDate}
        />
      ) : null}
    </Screen>
  );
}

type SectionProps = {
  title: string;
  entries: LedgerEntry[];
  empty: string;
  loading: boolean;
  /** The list could not be fetched; an empty one would be a lie. */
  error: boolean;
  onRetry: () => void;
  today: string;
  /** What a row opens; undefined leaves the row inert. */
  onEntryPress: (entry: LedgerEntry) => (() => void) | undefined;
  direction: 'asc' | 'desc';
};

/** One headed run of transactions; Recent and Coming up share it. */
function Section({
  title,
  entries,
  empty,
  loading,
  error,
  onRetry,
  today,
  onEntryPress,
  direction,
}: SectionProps) {
  const groups = groupByDate(entries, (entry) => entry.date, {
    amountOf: (entry) => entry.amount,
    direction,
  });

  return (
    <View className="mt-8 w-full">
      <SectionHeading>{title}</SectionHeading>

      {error ? (
        // A failed fetch would look like an empty list, so the failure says so itself.
        <View className="mt-2 w-full items-center">
          <Text
            className="w-full text-center font-app text-[14px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {failureText()}
          </Text>
          <TextLink label={t('common.tryAgain')} variant="subtle" onPress={onRetry} />
        </View>
      ) : loading ? (
        <View className="mt-1 w-full">
          <SkeletonList rows={3} />
        </View>
      ) : entries.length === 0 ? (
        <Text
          className="w-full py-6 text-center font-app text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {empty}
        </Text>
      ) : (
        <View className="mt-1 w-full">
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((entry, index) => (
                <Fragment key={entry.id}>
                  {index > 0 ? <View className="ml-[52px] h-px bg-line/60" /> : null}
                  <TransactionRow
                    label={entry.label}
                    amount={entry.amount}
                    kindLabel={KIND_LABELS[entry.kind] ? t(KIND_LABELS[entry.kind]) : undefined}
                    domain={entry.domain}
                    logoHidden={entry.logoHidden}
                    kind={entry.kind}
                    categoryId={entry.categoryId}
                    iconId={entry.iconId}
                    onPress={onEntryPress(entry)}
                  />
                </Fragment>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
