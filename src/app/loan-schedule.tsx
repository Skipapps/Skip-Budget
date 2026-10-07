import { useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { ProportionBar } from '@/components/calculators/proportion-bar';
import { useProGate } from '@/components/pro/pro-gate';
import { Screen } from '@/components/ui/screen';
import { Subtitle } from '@/components/ui/typography';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import {
  amortise,
  formatTerm,
  scheduleByYear,
  type AccrualBasis,
  type ScheduleRow,
} from '@/lib/loan';

/** Only the app's own conventions get through a hand-edited link. */
const BASES: readonly AccrualBasis[] = ['actual/365', 'actual/360', '30/360', 'monthly'];
const parseBasis = (value: string | undefined): AccrualBasis =>
  BASES.find((basis) => basis === value) ?? 'actual/365';

const BASIS_FOOTNOTES: Record<AccrualBasis, string> = {
  'actual/365':
    'Interest accrues daily on what is still owed, so a 31-day month costs more than a 28-day one.',
  'actual/360':
    'Interest accrues daily on what is still owed, over a 360-day year, so a full year costs a little more than the quoted rate.',
  '30/360':
    'Every month is counted as 30 days and every year as 360, so every period costs the same.',
  monthly:
    'Interest is charged in monthly rests — one twelfth of the annual rate on what is still owed — so February costs the same as March. Any odd days before the first payment are charged on top, by the day.',
};

/** Every payment and where it goes, grouped by year (a thirty-year loan is 360 rows). */
export default function LoanScheduleScreen() {
  // Wrapper, not inline: an early return above the screen's own hooks would change the hook count
  // when the entitlement answer lands.
  const gate = useProGate('loans');
  if (gate) return gate;
  return <LoanScheduleScreenInner />;
}

function LoanScheduleScreenInner() {
  const params = useLocalSearchParams<{
    amount?: string;
    rate?: string;
    months?: string;
    start?: string;
    funded?: string;
    basis?: string;
    payment?: string;
    extra?: string;
    lump?: string;
    lumpOn?: string;
    name?: string;
  }>();

  const principal = Number(params.amount) || 0;
  const annualRate = Number(params.rate) || 0;
  const months = Number(params.months) || 0;
  const start = params.start ? new Date(`${params.start}T00:00:00`) : new Date();
  const funded = params.funded ? new Date(`${params.funded}T00:00:00`) : undefined;
  const basis = parseBasis(params.basis);
  // A loan on file carries the payment the lender actually bills, which can sit a cent from the
  // solved one. When passed, it wins.
  const contractPayment = Math.max(0, Number(params.payment) || 0);
  const extraMonthly = Math.max(0, Number(params.extra) || 0);
  const lumpAmount = Math.max(0, Number(params.lump) || 0);
  const lumpOn = params.lumpOn ? new Date(`${params.lumpOn}T00:00:00`) : null;

  const loan = amortise({
    principal,
    annualRatePercent: annualRate,
    months,
    firstPaymentOn: start,
    fundedOn: funded,
    basis,
    payment: contractPayment > 0 ? contractPayment : undefined,
    extra: {
      monthly: extraMonthly,
      lumpSums: lumpAmount > 0 && lumpOn ? [{ on: lumpOn, amount: lumpAmount }] : [],
    },
  });
  const rows = loan.rows;
  const years = scheduleByYear(rows);

  return (
    <Screen title={params.name || 'Payment schedule'} showBack>
      <Subtitle className="mt-3">
        {formatCurrency(loan.payment)} a month for {formatTerm(rows.length)}, at {annualRate}%.{' '}
        {BASIS_FOOTNOTES[basis]}
      </Subtitle>

      <View className="mt-6 w-full rounded-[16px] border border-line bg-card px-4 py-4">
        <ProportionBar principal={principal} interest={loan.totalInterest} />
      </View>

      {years.map((year) => (
        <Fragment key={year.year}>
          <View className="mt-8 w-full flex-row items-baseline justify-between gap-3">
            <Text className="font-app-semibold text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
              {year.year}
            </Text>
            <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
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
        className="mb-10 mt-8 w-full text-center font-app text-[12px] leading-[18px] text-muted"
        maxFontSizeMultiplier={1.4}
      >
        {BASIS_FOOTNOTES[basis]} Assumes every payment lands on time and the rate never moves —
        paying late costs the extra days.
        {extraMonthly > 0 || lumpAmount > 0
          ? ' The overpayments you set are already in these rows, which is why the schedule ends early.'
          : ' Paying extra against the balance shortens the term.'}
      </Text>
    </Screen>
  );
}

function PaymentRow({ row }: { row: ScheduleRow }) {
  return (
    <View
      className="w-full py-3"
      accessible
      accessibilityLabel={`Payment ${row.number}, ${formatFullDate(new Date(`${row.date}T00:00:00`))}, covering ${row.days} days. ${formatCurrency(row.payment)}: ${formatCurrency(row.interest)} interest, ${formatCurrency(row.principal)} off the balance${row.extra > 0 ? `, including ${formatCurrency(row.extra)} paid extra` : ''}. ${formatCurrency(row.balance)} left.`}
    >
      <View className="w-full flex-row items-baseline justify-between gap-3">
        <Text
          className="font-app-medium text-[14px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {row.number}. {formatFullDate(new Date(`${row.date}T00:00:00`))}
        </Text>
        <Text className="font-app-semibold text-[14px] text-ink" maxFontSizeMultiplier={1.3}>
          {formatCurrency(row.payment)}
        </Text>
      </View>

      <View className="mt-2 h-2 w-full flex-row overflow-hidden rounded-full bg-ink/5">
        <View style={{ flex: Math.max(row.principal, 0) }} className="bg-body" />
        <View style={{ flex: Math.max(row.interest, 0) }} className="bg-accent" />
      </View>

      <View className="mt-1.5 w-full flex-row items-center justify-between gap-3">
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatCurrency(row.principal)} off · {formatCurrency(row.interest)} interest
          {row.extra > 0 ? ` · ${formatCurrency(row.extra)} extra` : ` · ${row.days}d`}
        </Text>
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatCurrency(row.balance)} left
        </Text>
      </View>
    </View>
  );
}
