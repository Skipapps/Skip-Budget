import { useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { ProportionBar } from '@/components/calculators/proportion-bar';
import { loanRateText, loanTermText } from '@/components/calculators/schedule-card';
import { Screen } from '@/components/ui/screen';
import { Subtitle } from '@/components/ui/typography';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { amortise, scheduleByYear, type AccrualBasis, type ScheduleRow } from '@/lib/loan';

/** Only the app's own conventions get through a hand-edited link. */
const BASES: readonly AccrualBasis[] = ['actual/365', 'actual/360', '30/360', 'monthly'];
const parseBasis = (value: string | undefined): AccrualBasis =>
  BASES.find((basis) => basis === value) ?? 'actual/365';

function basisFootnote(basis: AccrualBasis): string {
  switch (basis) {
    case 'actual/365':
      return t('loan.basisFootnote.actual365');
    case 'actual/360':
      return t('loan.basisFootnote.actual360');
    case '30/360':
      return t('loan.basisFootnote.thirty360');
    case 'monthly':
      return t('loan.basisFootnote.monthly');
  }
}

/** Every payment and where it goes, grouped by year (a thirty-year loan is 360 rows). */
export default function LoanScheduleScreen() {
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
  const footnote = basisFootnote(basis);
  const overpaid = extraMonthly > 0 || lumpAmount > 0;

  return (
    <Screen title={params.name || t('loan.schedule.title')} showBack>
      <Subtitle className="mt-3">
        {`${t('loan.schedule.summary', {
          payment: formatCurrency(loan.payment),
          term: loanTermText(rows.length),
          rate: loanRateText(annualRate),
        })} ${footnote}`}
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
              {t('loan.schedule.yearSplit', {
                interest: formatCurrency(year.interest),
                principal: formatCurrency(year.principal),
              })}
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
        {`${footnote} ${t('loan.schedule.assumes')} ${t(
          overpaid ? 'loan.schedule.overpaidNote' : 'loan.schedule.payExtraNote',
        )}`}
      </Text>
    </Screen>
  );
}

function PaymentRow({ row }: { row: ScheduleRow }) {
  const date = formatFullDate(new Date(`${row.date}T00:00:00`));
  const figures = {
    number: row.number,
    date,
    count: row.days,
    payment: formatCurrency(row.payment),
    interest: formatCurrency(row.interest),
    principal: formatCurrency(row.principal),
    balance: formatCurrency(row.balance),
  };

  return (
    <View
      className="w-full py-3"
      accessible
      accessibilityLabel={
        row.extra > 0
          ? t('loan.schedule.rowA11yExtra', { ...figures, extra: formatCurrency(row.extra) })
          : t('loan.schedule.rowA11y', figures)
      }
    >
      <View className="w-full flex-row items-baseline justify-between gap-3">
        <Text
          className="font-app-medium text-[14px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {row.number}. {date}
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
          {row.extra > 0
            ? t('loan.schedule.rowSplitExtra', {
                principal: figures.principal,
                interest: figures.interest,
                extra: formatCurrency(row.extra),
              })
            : t('loan.schedule.rowSplitDays', {
                principal: figures.principal,
                interest: figures.interest,
                days: row.days,
              })}
        </Text>
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {t('loan.schedule.left', { amount: figures.balance })}
        </Text>
      </View>
    </View>
  );
}
