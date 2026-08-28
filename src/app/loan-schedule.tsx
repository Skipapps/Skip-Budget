import { useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { ProportionBar } from '@/components/calculators/proportion-bar';
import { Screen } from '@/components/ui/screen';
import { Subtitle, Title } from '@/components/ui/typography';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import {
  amortisationSchedule,
  calculateLoan,
  formatTerm,
  scheduleByYear,
  type AmortisationRow,
} from '@/lib/loan';

/**
 * Every payment, and where it goes.
 *
 * A total interest figure tells you a loan is expensive. This tells you why:
 * the first payments are mostly interest and the last are almost all balance,
 * and watching the bar flip over the term is the point of the screen.
 *
 * Grouped by year because a thirty-year mortgage is 360 rows, and a flat list
 * that long cannot be navigated — the year totals are also the figure people
 * actually want when they ask what a loan cost them last year.
 */
export default function LoanScheduleScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    rate?: string;
    months?: string;
    start?: string;
    name?: string;
  }>();

  const principal = Number(params.amount) || 0;
  const annualRate = Number(params.rate) || 0;
  const months = Number(params.months) || 0;
  const start = params.start ? new Date(`${params.start}T00:00:00`) : new Date();

  const loan = calculateLoan(principal, annualRate, months);
  const rows = amortisationSchedule(principal, annualRate, months, start);
  const years = scheduleByYear(rows);

  return (
    <Screen showBack>
      <Title className="mt-2">{params.name || 'Payment schedule'}</Title>
      <Subtitle className="mt-3">
        {formatCurrency(loan.monthlyPayment)} a month for {formatTerm(months)}, at {annualRate}%
        APR.
      </Subtitle>

      <View className="mt-7 w-full rounded-[10px] border border-line px-4 py-4">
        <ProportionBar principal={principal} interest={loan.totalInterest} />
      </View>

      {years.map((year) => (
        <Fragment key={year.year}>
          <View className="mt-8 w-full flex-row items-baseline justify-between gap-3">
            <Text
              className="font-poppins-semibold text-[17px] text-ink"
              maxFontSizeMultiplier={1.3}
            >
              {year.year}
            </Text>
            <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
              {formatCurrency(year.interest)} interest · {formatCurrency(year.principal)} off
            </Text>
          </View>

          <View className="mt-1 h-px w-full bg-line" />

          {year.payments.map((row) => (
            <PaymentRow key={row.number} row={row} />
          ))}
        </Fragment>
      ))}

      <Text
        className="mb-10 mt-8 w-full text-center font-poppins text-[12px] leading-[18px] text-muted"
        maxFontSizeMultiplier={1.4}
      >
        Assumes every payment lands on time and the rate never moves. Paying extra against the
        balance shortens the term and cuts the interest.
      </Text>
    </Screen>
  );
}

function PaymentRow({ row }: { row: AmortisationRow }) {
  return (
    <View
      className="w-full py-3"
      accessible
      accessibilityLabel={`Payment ${row.number}, ${formatFullDate(new Date(`${row.date}T00:00:00`))}. ${formatCurrency(row.payment)}: ${formatCurrency(row.interest)} interest, ${formatCurrency(row.principal)} off the balance. ${formatCurrency(row.balance)} left.`}
    >
      <View className="w-full flex-row items-baseline justify-between gap-3">
        <Text
          className="font-poppins-medium text-[14px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {row.number}. {formatFullDate(new Date(`${row.date}T00:00:00`))}
        </Text>
        <Text className="font-poppins-semibold text-[14px] text-ink" maxFontSizeMultiplier={1.3}>
          {formatCurrency(row.payment)}
        </Text>
      </View>

      {/* Principal first, so the dark section growing left to right down the
          list is the loan being paid off. */}
      <View className="mt-2 h-2 w-full flex-row overflow-hidden rounded-full bg-black/5">
        <View style={{ flex: Math.max(row.principal, 0) }} className="bg-control" />
        <View style={{ flex: Math.max(row.interest, 0) }} className="bg-accent" />
      </View>

      <View className="mt-1.5 w-full flex-row items-center justify-between gap-3">
        <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatCurrency(row.principal)} off · {formatCurrency(row.interest)} interest
        </Text>
        <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatCurrency(row.balance)} left
        </Text>
      </View>
    </View>
  );
}
