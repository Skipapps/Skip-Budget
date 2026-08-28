import { router } from 'expo-router';
import {} from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AddButton } from '@/components/dashboard/add-button';
import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { AmountTile } from '@/components/ui/amount-tile';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { InsightBanner } from '@/components/dashboard/insight-banner';
import { DateSelector } from '@/components/dashboard/date-selector';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import {
  useBills,
  useDashboard,
  useLedger,
  useProfile,
  useReceipts,
  useSubscriptions,
} from '@/api/queries';
import { useKeepSchedulesCurrent, useRefreshAll } from '@/api/refresh';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { LedgerSummary } from '@/components/transactions/ledger-summary';
import { spendingCategories } from '@/data/dashboard-mock';
import { RANGES, rangeFor, type RangeKey } from '@/lib/range';
import { addDays, formatDayLabel, toIsoDate } from '@/lib/date';

// The gutter Screen applies. The category carousel cancels it so the cards
// bleed to both edges and the last one peeks, signalling that the row scrolls.
const GUTTER = 24;

const KIND_LABELS: Record<string, string> = {
  receipt: 'Receipt',
  bill: 'Bill',
  subscription: 'Subscription',
};

export default function HomeScreen() {
  // Opening the app is the moment to bring stale due dates up to date.
  useKeepSchedulesCurrent();
  const { refresh, refreshing } = useRefreshAll();

  const profile = useProfile();
  const dashboard = useDashboard();
  const bills = useBills();
  const receipts = useReceipts();
  const subscriptions = useSubscriptions();

  const monthlyBillsTotal = (bills.data ?? []).reduce((sum, bill) => {
    const perMonth =
      bill.recurrence === 'weekly'
        ? bill.amount * (52 / 12)
        : bill.recurrence === 'quarterly'
          ? bill.amount / 3
          : bill.recurrence === 'yearly'
            ? bill.amount / 12
            : bill.amount;
    return sum + perMonth;
  }, 0);

  // This calendar month, so the tile agrees with "Left this month" above it.
  const monthPrefix = toIsoDate(new Date()).slice(0, 7);
  const receiptsTotal = (receipts.data ?? [])
    .filter((row) => row.purchased_on.startsWith(monthPrefix))
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);

  const subscriptionsTotal = (subscriptions.data ?? [])
    .filter((row) => row.active)
    .reduce((sum, row) => {
      const perMonth =
        row.cycle === 'weekly'
          ? row.amount * (52 / 12)
          : row.cycle === 'quarterly'
            ? row.amount / 3
            : row.cycle === 'yearly'
              ? row.amount / 12
              : row.amount;
      return sum + perMonth;
    }, 0);

  /**
   * Everything going out this month: the recurring commitments plus what has
   * actually been spent.
   *
   * Not v_dashboard.expenses, which counts bills alone — that figure came out
   * identical to the Monthly Bills tile sitting right below it, so receipts
   * and subscriptions were simply missing from the headline. Summing the same
   * three numbers the tiles show means the card can never disagree with them.
   */
  const expensesThisMonth = monthlyBillsTotal + receiptsTotal + subscriptionsTotal;
  const payday = dashboard.data?.payday ?? 0;

  /** Calculators open a tool, so they carry no figure. */
  const tileAmounts: Record<string, number | undefined> = {
    'monthly-bills': -monthlyBillsTotal,
    receipts: -receiptsTotal,
    subscriptions: -subscriptionsTotal,
  };

  // Today, not a hardcoded date: the dashboard opens on the day you are in.
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  // Today by default, so opening the app answers "what is happening now"
  // rather than handing over a year of rows to scroll.
  const [rangeKey, setRangeKey] = useState<RangeKey>('today');

  const range = useMemo(() => rangeFor(rangeKey, selectedDate), [rangeKey, selectedDate]);
  const { entries: ledger, totals } = useLedger(range);

  const { weekday, date } = formatDayLabel(selectedDate);

  // The window's entries, from the same ledger the transactions tab reads.
  const dayEntries = ledger;

  const handleConfirmDate = (date: Date) => {
    setSelectedDate(date);
    setPickerOpen(false);
  };

  return (
    <Screen floating={<AddButton />} onRefresh={refresh} refreshing={refreshing}>
      <View className="mt-2 w-full">
        <DashboardHeader name={profile.data?.display_name ?? 'Welcome'} />
      </View>

      <View className="mt-6 w-full">
        <BalanceSummary
          // Derived from the same total, so income minus expenses is exactly
          // what the card says is left rather than two views of the month.
          leftThisMonth={payday - expensesThisMonth}
          payday={payday}
          expenses={expensesThisMonth}
          loading={
            dashboard.isPending || bills.isPending || receipts.isPending || subscriptions.isPending
          }
        />
      </View>

      <View className="mt-8 w-full flex-row items-baseline justify-between gap-3">
        <Text className="font-poppins-semibold text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
          Where it goes
        </Text>
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.2}>
          {spendingCategories.length} categories
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
        {spendingCategories.map((category) => (
          <View key={category.id} className="w-[150px]">
            <AmountTile
              label={category.label}
              amount={tileAmounts[category.id]}
              artwork={category.artwork}
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
                          ? () => router.push('/split-calculator')
                          : undefined
              }
            />
          </View>
        ))}
      </ScrollView>

      {/* Full width and outside the carousel — it is a destination, not a stat. */}
      <View className="mt-3 w-full">
        <InsightBanner />
      </View>

      <View className="mt-5 h-px w-full bg-line" />

      <View className="mt-5 w-full">
        <DateSelector
          weekday={weekday}
          date={date}
          onPrevious={() => setSelectedDate((current) => addDays(current, -1))}
          onNext={() => setSelectedDate((current) => addDays(current, 1))}
          onPickDate={() => setPickerOpen(true)}
        />
      </View>

      {/* The window sits directly under the date, because the date is what it
          is measured from — a week means the week containing that day. */}
      <View className="mt-4 w-full">
        <ChoiceChips options={RANGES} value={rangeKey} onChange={setRangeKey} />
      </View>

      <View className="mt-4 w-full">
        <LedgerSummary totals={totals} />
      </View>

      <View className="mt-1 w-full pb-24">
        {dayEntries.length === 0 ? (
          <Text
            className="w-full py-8 text-center font-poppins text-[14px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            {rangeKey === 'today' ? 'Nothing on this day.' : 'Nothing in this window.'}
          </Text>
        ) : (
          dayEntries.map((entry, index) => (
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
          ))
        )}
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
