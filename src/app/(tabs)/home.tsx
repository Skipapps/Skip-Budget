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
import { useKeepSchedulesCurrent, useRefreshAll } from '@/api/refresh';
import { spendingCategories } from '@/data/dashboard-mock';
import { chargeOwners, ledgerHref } from '@/lib/ledger-link';
import { orderByIds } from '@/lib/order';
import { groupByDate } from '@/lib/group';
import { rangeFor } from '@/lib/range';
import { addDays, formatDateRange, formatDayLabel, toIsoDate } from '@/lib/date';
import { useToday } from '@/lib/use-today';

const KIND_LABELS: Record<string, string> = {
  receipt: 'Receipt',
  bill: 'Bill',
  subscription: 'Subscription',
};

/** Where each destination goes. The screen keeps owning its own routing. */
const DESTINATION_ROUTES: Record<string, Href> = {
  'monthly-bills': '/bills',
  receipts: '/receipts',
  subscriptions: '/subscriptions',
  'loan-calculator': '/loan-calculator',
  'split-calculator': '/splits',
};

export default function HomeScreen() {
  const { pro } = usePro();
  // Opening the app is the moment to bring stale due dates up to date.
  useKeepSchedulesCurrent();
  const { refresh, refreshing } = useRefreshAll();

  const profile = useProfile();

  // Whichever order they arranged them in, with anything unmentioned behind.
  const tiles = useMemo(
    () => orderByIds(spendingCategories, profile.data?.tile_order),
    [profile.data?.tile_order],
  );

  // One consistent day for every window below — and it turns at midnight and
  // on resume, so the dashboard never wakes up showing yesterday.
  const { today, todayDate } = useToday();

  // The calendar month we are actually in, which is what the card reports on.
  // Deliberately not the date picker below it: moving the selector to browse
  // another day changes the list, not the month you are living in.
  const monthRange = useMemo(() => rangeFor('month', todayDate), [todayDate]);
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

  // When the day turns while the dashboard is alive, follow it — but only if
  // the selector was sitting on the old today. A deliberately browsed day is
  // a choice, and midnight is no reason to overrule it.
  const prevToday = useRef(today);
  useEffect(() => {
    if (prevToday.current !== today) {
      setSelectedDate((held) => (toIsoDate(held) === prevToday.current ? todayDate : held));
      prevToday.current = today;
    }
  }, [today, todayDate]);

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

  /**
   * Which plan each recorded charge came from.
   *
   * A row in either week opens the record behind it, and an occurrence that
   * was written down at the time is named after the charge rather than the
   * bill or subscription that made it. The ledger reads the same query, so
   * this costs no extra fetch.
   */
  const charges = useCharges();
  const owners = useMemo(() => chargeOwners(charges.data ?? []), [charges.data]);

  /** The row's handler, or undefined when there is nothing to open. */
  const openEntry = (entry: LedgerEntry) => {
    const href = ledgerHref(entry, owners);
    return href ? () => router.push(href) : undefined;
  };

  const { weekday, date } = formatDayLabel(selectedDate);

  const handleConfirmDate = (date: Date) => {
    // Forward is not a direction here: the week ahead already has its own
    // heading, so picking a future day would only duplicate it.
    setSelectedDate(date > todayDate ? todayDate : date);
    setPickerOpen(false);
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
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
          error={month.isError}
        />
      </View>

      {/* Recording something is the one thing on this screen that is not
          reading: four of them, one tap each, right under the figure they
          change. */}
      <View className="mt-5 w-full">
        <QuickActions onPress={(href) => router.push(href)} />
      </View>

      {/* Renders nothing once its five steps are done or it was waved away —
          margin included, so established accounts get no phantom gap. */}
      <GettingStartedCard />

      <View className="mt-8 w-full">
        <SectionHeading caption="This month">Where it goes</SectionHeading>
      </View>

      {/* One column of five, rather than a carousel that hid three of them
          behind a gesture. The order is whatever they arranged. */}
      <View className="mt-3 w-full">
        <DestinationList
          items={tiles}
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

      {/* Full width and outside the list — it is a story, not a figure. */}
      <View className="mt-3 w-full">
        {/* Transactions is the story: the chart, the timeline and the
            periods to read them over. The banner said so already and had
            nowhere to send anyone. */}
        <InsightBanner onPress={() => router.push('/insights')} />
      </View>

      {/* Whitespace separates this from the blocks above it. The rule that
          used to sit here was drawing a line the gap already drew. */}
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
        title="Recent"
        range={formatDateRange(recentFrom, selectedDate)}
        entries={recent.entries}
        empty="Nothing in this week."
        loading={recent.isLoading}
        error={recent.isError}
        onRetry={refresh}
        today={today}
        onEntryPress={openEntry}
        // Oldest day first, the chosen day last — the house rule for every
        // dated list. Recent covers one week, so the newest day is at most six
        // headings below the first rather than off the end of the page.
        direction="asc"
      />

      <View className="w-full pb-24">
        <Section
          title="Coming up"
          range={formatDateRange(addDays(selectedDate, 1), addDays(selectedDate, 7))}
          entries={upcoming.entries}
          empty="Nothing due in the week ahead."
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
  /** The week this heading covers, which moves with the chosen day. */
  range: string;
  entries: LedgerEntry[];
  empty: string;
  loading: boolean;
  /** The week could not be fetched. An empty list would be a lie. */
  error: boolean;
  onRetry: () => void;
  today: string;
  /**
   * What a row opens, worked out per entry by the screen — undefined for an
   * entry with no edit screen, which leaves that row inert.
   */
  onEntryPress: (entry: LedgerEntry) => (() => void) | undefined;
  /**
   * Day order. Both weeks run `'asc'` today — oldest heading first — so Recent
   * ends on the chosen day and Coming up starts the morning after it, and the
   * two halves of the screen read in one direction. Kept as a prop rather than
   * hardcoded because the section is shared and the two weeks are not the same
   * question.
   */
  direction: 'asc' | 'desc';
};

/**
 * One headed run of transactions.
 *
 * Recent and Coming up are the same list of the same rows over two different
 * weeks, so they are the same component — anything that made one read
 * differently from the other would be an accident rather than a decision.
 */
function Section({
  title,
  range,
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
      {/* Each heading carries its own dates: two weeks are on screen at once,
          and a single caption above them could only ever describe one. */}
      <SectionHeading caption={range}>{title}</SectionHeading>

      {error ? (
        // An empty week and a week that failed to arrive look identical, so
        // the failure has to say so itself.
        <View className="mt-2 w-full items-center">
          <Text
            className="w-full text-center font-poppins text-[14px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            We could not load this week.
          </Text>
          <TextLink label="Try again" variant="subtle" onPress={onRetry} />
        </View>
      ) : loading ? (
        // The shape of what is coming, like every other list in the app.
        <View className="mt-1 w-full">
          <SkeletonList rows={3} />
        </View>
      ) : entries.length === 0 ? (
        <Text
          className="w-full py-6 text-center font-poppins text-[14px] text-muted"
          maxFontSizeMultiplier={1.4}
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
                    kindLabel={KIND_LABELS[entry.kind]}
                    domain={entry.domain}
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
