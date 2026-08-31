import { router } from 'expo-router';
import {} from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { AddButton } from '@/components/dashboard/add-button';
import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { AmountTile } from '@/components/ui/amount-tile';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { usePro } from '@/api/pro';
import { GettingStartedCard } from '@/components/dashboard/getting-started-card';
import { InsightBanner } from '@/components/dashboard/insight-banner';
import { DateSelector } from '@/components/dashboard/date-selector';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { useLedger, useProfile, type LedgerEntry } from '@/api/queries';
import { useKeepSchedulesCurrent, useRefreshAll } from '@/api/refresh';
import { spendingCategories } from '@/data/dashboard-mock';
import { orderByIds } from '@/lib/order';
import { groupByDate } from '@/lib/group';
import { rangeFor } from '@/lib/range';
import { addDays, formatDateRange, formatDayLabel, toIsoDate } from '@/lib/date';

// The gutter Screen applies. The category carousel cancels it so the cards
// bleed to both edges and the last one peeks, signalling that the row scrolls.
const GUTTER = 24;

const KIND_LABELS: Record<string, string> = {
  receipt: 'Receipt',
  bill: 'Bill',
  subscription: 'Subscription',
};

export default function HomeScreen() {
  const artwork = useArtwork();
  const { pro } = usePro();
  // Opening the app is the moment to bring stale due dates up to date.
  useKeepSchedulesCurrent();
  const { refresh, refreshing } = useRefreshAll();

  const profile = useProfile();

  // Held for the life of the screen so every window below is measured from
  // one day. Reading the clock per call would let a midnight rollover put two
  // sections on different days.
  // Whichever order they arranged them in, with anything unmentioned behind.
  const tiles = useMemo(
    () => orderByIds(spendingCategories, profile.data?.tile_order),
    [profile.data?.tile_order],
  );

  const todayDate = useMemo(() => new Date(), []);
  const today = toIsoDate(todayDate);

  // The calendar month we are actually in, which is what the card reports on.
  // Deliberately not the date picker below it: moving the selector to browse
  // another day changes the list, not the month you are living in.
  const monthRange = useMemo(() => rangeFor('month', new Date()), []);
  const month = useLedger(monthRange, today);

  /**
   * This month, as it actually falls.
   *
   * Every figure on the card comes from one window of real occurrences — a
   * bill on its due date, a subscription on its renewal date, a receipt on the
   * day it was bought, salary on its paydays. Nothing is averaged into a
   * per-month rate, so a bill due in September belongs to September and this
   * month starts again at zero on the first.
   */
  const spentOn = (kind: string) =>
    month.entries
      .filter((entry) => entry.kind === kind)
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  const monthlyBillsTotal = spentOn('bill');
  const receiptsTotal = spentOn('receipt');
  const subscriptionsTotal = spentOn('subscription');

  // Out and in for the same window. The three tiles below add up to expenses
  // exactly, because they are the same entries grouped by kind.
  const expensesThisMonth = month.totals.out;
  const payday = month.totals.in;

  /** Calculators open a tool, so they carry no figure. */
  const tileAmounts: Record<string, number | undefined> = {
    'monthly-bills': -monthlyBillsTotal,
    receipts: -receiptsTotal,
    subscriptions: -subscriptionsTotal,
  };

  // Today, not a hardcoded date: the dashboard opens on the day you are in.
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  const atLatest = toIsoDate(selectedDate) >= today;

  /**
   * A week behind the chosen day, and the week in front of it.
   *
   * Both are seven days measured from the same point, so stepping the date
   * back a day slides both windows together — you are always looking at one
   * week of what happened and the week that followed it.
   */
  const recentFrom = useMemo(() => addDays(selectedDate, -6), [selectedDate]);
  const recent = useLedger(
    useMemo(
      () => ({ from: toIsoDate(recentFrom), to: toIsoDate(selectedDate) }),
      [recentFrom, selectedDate],
    ),
    today,
  );
  const upcoming = useLedger(
    useMemo(
      () => ({
        from: toIsoDate(addDays(selectedDate, 1)),
        to: toIsoDate(addDays(selectedDate, 7)),
      }),
      [selectedDate],
    ),
    today,
  );

  const { weekday, date } = formatDayLabel(selectedDate);

  const handleConfirmDate = (date: Date) => {
    // Forward is not a direction here: the week ahead already has its own
    // heading, so picking a future day would only duplicate it.
    setSelectedDate(date > todayDate ? todayDate : date);
    setPickerOpen(false);
  };

  return (
    <Screen
      // The quickest thing anyone does in a budget app is note what they just
      // bought, so the button that is always on screen goes straight there.
      floating={<AddButton onPress={() => router.push('/add-receipt')} />}
      onRefresh={refresh}
      refreshing={refreshing}
    >
      <View className="mt-2 w-full">
        <DashboardHeader
          name={profile.data?.display_name ?? 'Welcome'}
          avatarId={profile.data?.avatar_id}
          onAvatarPress={() => router.push('/avatar')}
          onNotificationsPress={() => router.push('/notifications')}
        />
      </View>

      <View className="mt-6 w-full">
        <BalanceSummary
          // Derived from the same total, so income minus expenses is exactly
          // what the card says is left rather than two views of the month.
          leftThisMonth={payday - expensesThisMonth}
          payday={payday}
          expenses={expensesThisMonth}
          loading={month.isLoading}
        />
      </View>

      {/* Renders nothing once its five steps are done or it was waved away —
          margin included, so established accounts get no phantom gap. */}
      <GettingStartedCard />

      <View className="mt-8 w-full flex-row items-baseline justify-between gap-3">
        <Text className="font-poppins-semibold text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
          Where it goes
        </Text>
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.2}>
          {tiles.length} categories
        </Text>
      </View>

      {/* Full-bleed, so a tile is cut by the screen edge rather than by a
          margin. That cut is the affordance: tiles are sized so a third is
          plainly half-visible, which is what says the row moves. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={{ marginHorizontal: -GUTTER }}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12, paddingVertical: 12 }}
        className="w-full"
      >
        {tiles.map((category) => (
          <View key={category.id} className="w-[150px]">
            {/* Locked features keep their tile — a hidden feature sells
                nothing; a visible locked one is an advert that renders
                itself. The gate on the screen does the actual refusing. */}
            {!pro && (category.id === 'loan-calculator' || category.id === 'split-calculator') ? (
              <View
                pointerEvents="none"
                className="absolute right-2 top-2 z-10 rounded-full bg-accent px-2 py-0.5"
              >
                <Text
                  allowFontScaling={false}
                  className="font-poppins-bold text-[9px] text-on-control"
                >
                  PRO
                </Text>
              </View>
            ) : null}
            <AmountTile
              label={category.label}
              amount={tileAmounts[category.id]}
              artwork={artwork[category.artwork]}
              onPress={
                category.id === 'monthly-bills'
                  ? () => router.push('/bills')
                  : category.id === 'receipts'
                    ? () => router.push('/receipts')
                    : category.id === 'subscriptions'
                      ? () => router.push('/subscriptions')
                      : category.id === 'loan-calculator'
                        ? () => router.push('/loan-calculator')
                        : category.id === 'split-calculator'
                          ? () => router.push('/splits')
                          : undefined
              }
            />
          </View>
        ))}
      </ScrollView>

      {/* Full width and outside the carousel — it is a destination, not a stat. */}
      <View className="mt-3 w-full">
        {/* Transactions is the story: the chart, the timeline and the
            periods to read them over. The banner said so already and had
            nowhere to send anyone. */}
        <InsightBanner onPress={() => router.push('/insights')} />
      </View>

      <View className="mt-5 h-px w-full bg-line" />

      <View className="mt-5 w-full">
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
        title="Recent"
        range={formatDateRange(recentFrom, selectedDate)}
        entries={recent.entries}
        empty="Nothing in this week."
        loading={recent.isLoading}
        today={today}
        direction="desc"
      />

      <View className="w-full pb-24">
        <Section
          title="Coming up"
          range={formatDateRange(addDays(selectedDate, 1), addDays(selectedDate, 7))}
          entries={upcoming.entries}
          empty="Nothing due in the week ahead."
          loading={upcoming.isLoading}
          today={today}
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
  /** The week this heading covers, which moves with the chosen day. */
  range: string;
  entries: LedgerEntry[];
  empty: string;
  loading: boolean;
  today: string;
  /** Recent counts back from the chosen day; Coming up counts forward. */
  direction: 'asc' | 'desc';
};

/**
 * One headed run of transactions.
 *
 * Recent and Coming up are the same list of the same rows over two different
 * weeks, so they are the same component — anything that made one read
 * differently from the other would be an accident rather than a decision.
 */
function Section({ title, range, entries, empty, loading, today, direction }: SectionProps) {
  const groups = groupByDate(entries, (entry) => entry.date, {
    amountOf: (entry) => entry.amount,
    direction,
  });

  return (
    <View className="mt-7 w-full">
      {/* Each heading carries its own dates: two weeks are on screen at once,
          and a single caption above them could only ever describe one. */}
      <View className="w-full flex-row items-baseline justify-between gap-3">
        <Text className="font-poppins-semibold text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        <Text
          className="font-poppins text-[13px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {range}
        </Text>
      </View>

      {loading || entries.length === 0 ? (
        <Text
          className="w-full py-6 text-center font-poppins text-[14px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          {loading ? 'Loading' : empty}
        </Text>
      ) : (
        <View className="mt-1 w-full">
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((entry, index) => (
                <Fragment key={entry.id}>
                  {index > 0 ? <View className="ml-13 h-px bg-line/60" /> : null}
                  <TransactionRow
                    label={entry.label}
                    amount={entry.amount}
                    kindLabel={KIND_LABELS[entry.kind]}
                    domain={entry.domain}
                    kind={entry.kind}
                    categoryId={entry.categoryId}
                    iconId={entry.iconId}
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
