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
import { useBills, useDashboard, useProfile } from '@/api/queries';
import { dayTotal, initialDate, spendingCategories, transactions } from '@/data/dashboard-mock';
import { addDays, formatDayLabel } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';

// The gutter Screen applies. The category carousel cancels it so the cards
// bleed to both edges and the last one peeks, signalling that the row scrolls.
const GUTTER = 24;

export default function HomeScreen() {
  const profile = useProfile();
  const dashboard = useDashboard();
  const bills = useBills();

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

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { weekday, date } = formatDayLabel(selectedDate);

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
        {transactions.map((transaction, index) => (
          <Fragment key={transaction.id}>
            {index > 0 ? <View className="ml-13 h-px bg-line/60" /> : null}
            <TransactionRow transaction={transaction} />
          </Fragment>
        ))}
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
