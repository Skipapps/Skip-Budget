import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AddButton } from '@/components/dashboard/add-button';
import { BalanceSummary } from '@/components/dashboard/balance-summary';
import { AmountTile } from '@/components/ui/amount-tile';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { InsightBanner } from '@/components/dashboard/insight-banner';
import { DateSelector } from '@/components/dashboard/date-selector';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { useBills, useDashboard, useLedger, useProfile } from '@/api/queries';
import { spendingCategories } from '@/data/dashboard-mock';
import { addDays, formatDayLabel, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';

// The gutter Screen applies. The category carousel cancels it so the cards
// bleed to both edges and the last one peeks, signalling that the row scrolls.
const GUTTER = 24;

const KIND_LABELS: Record<string, string> = {
  receipt: 'Receipt',
  bill: 'Bill',
  subscription: 'Subscription',
};

export default function HomeScreen() {
  const profile = useProfile();
  const dashboard = useDashboard();
  const bills = useBills();
  const { entries: ledger } = useLedger();

  // Only the Monthly Bills tile has a table behind it so far; receipts and
  // subscriptions keep their placeholder figures until those tables exist.
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

  // Today, not a hardcoded date: the dashboard opens on the day you are in.
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  const { weekday, date } = formatDayLabel(selectedDate);

  // The day's entries, from the same ledger the transactions tab reads.
  const dayKey = toIsoDate(selectedDate);
  const dayEntries = ledger.filter((entry) => entry.date === dayKey);
  const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const handleConfirmDate = (date: Date) => {
    setSelectedDate(date);
    setPickerOpen(false);
  };

  return (
    <Screen floating={<AddButton />}>
      <View className="mt-2 w-full">
        <DashboardHeader name={profile.data?.display_name ?? 'Welcome'} />
      </View>

      <View className="mt-6 w-full">
        <BalanceSummary
          leftThisMonth={dashboard.data?.left_this_month ?? 0}
          payday={dashboard.data?.payday ?? 0}
          expenses={dashboard.data?.expenses ?? 0}
          loading={dashboard.isPending}
        />
      </View>

      <Text
        className="mt-8 w-full font-poppins-medium text-[15px] text-body"
        maxFontSizeMultiplier={1.3}
      >
        Spending category
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -GUTTER }}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12, paddingVertical: 12 }}
        className="w-full"
      >
        {spendingCategories.map((category) => (
          <View key={category.id} className="w-[164px]">
            <AmountTile
              label={category.label}
              amount={category.id === 'monthly-bills' ? -monthlyBillsTotal : category.amount}
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

      <View className="mt-5 w-full flex-row items-center justify-between">
        <Text className="font-poppins text-[17px] text-body" maxFontSizeMultiplier={1.3}>
          Total <Text className="font-poppins-semibold text-ink">{formatCurrency(dayTotal)}</Text>
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter transactions"
          className="flex-row items-center gap-1 rounded-full border border-line py-1.5 pl-4 pr-2 active:bg-black/5"
        >
          <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.2}>
            All
          </Text>
          <ChevronRight size={16} color={colors.muted} strokeWidth={2} />
        </Pressable>
      </View>

      <View className="mt-1 w-full pb-24">
        {dayEntries.length === 0 ? (
          <Text
            className="w-full py-8 text-center font-poppins text-[14px] text-muted"
            maxFontSizeMultiplier={1.4}
          >
            Nothing on this day.
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
