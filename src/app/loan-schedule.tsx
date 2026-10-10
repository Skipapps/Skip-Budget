import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PaymentHeadline } from '@/components/calculators/payment-headline';
import { problemNote, unusedNote } from '@/components/calculators/override-words';
import { PaymentRow } from '@/components/calculators/payment-row';
import { loanRateText, loanTermText } from '@/components/calculators/schedule-card';
import { SummaryGrid, type SummaryItem } from '@/components/calculators/summary-grid';
import { Screen } from '@/components/ui/screen';
import { SectionHeading } from '@/components/ui/typography';
import { percent, t } from '@/i18n';
import { truthInLending } from '@/lib/apr';
import { formatCurrency } from '@/lib/format';
import { scheduleByYear, type AccrualBasis, type ScheduleRow } from '@/lib/loan';
import { useLoanDraft } from '@/lib/loan-draft';
import { scheduleWithOverrides } from '@/lib/loan-overrides';
import { baseParams, readLoanRoute, termsFromRoute, type LoanRouteParams } from '@/lib/loan-route';
import { TEXT_CAP } from '@/theme/text-scale';

/** As many as the design shows before "Show all": the first months tell the story. */
const FIRST_ROWS = 8;

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
  const params = useLocalSearchParams<LoanRouteParams>();
  const route = readLoanRoute(params);
  const [showAll, setShowAll] = useState(false);

  // The open calculator's changes, live, when it opened this page; else what the link carries.
  const live = useLoanDraft(route.draft);
  const linked = useMemo(
    () => readLoanRoute({ monthly: params.monthly, overrides: params.overrides }).overrides,
    [params.monthly, params.overrides],
  );
  const overrides = live ?? linked;
  const terms = useMemo(
    () =>
      termsFromRoute(
        readLoanRoute({
          amount: params.amount,
          rate: params.rate,
          months: params.months,
          start: params.start,
          funded: params.funded,
          basis: params.basis,
          payment: params.payment,
          extra: params.extra,
          lump: params.lump,
          lumpOn: params.lumpOn,
        }),
        { withExtras: true },
      ),
    [
      params.amount,
      params.rate,
      params.months,
      params.start,
      params.funded,
      params.basis,
      params.payment,
      params.extra,
      params.lump,
      params.lumpOn,
    ],
  );
  const loan = useMemo(() => scheduleWithOverrides(terms, overrides), [terms, overrides]);
  const contract = loan.contract;
  const rows = loan.rows;
  const overpaid = route.extraMonthly > 0 || route.lumpSum > 0;
  const footnote = basisFootnote(route.basis);

  // The rate is only called an APR when the fees are known and the disclosure agrees with it, as
  // the calculator decides. The disclosure is of the contract, never the overpaid schedule.
  let apr: number | null = null;
  if (route.fees !== null && rows.length > 0) {
    apr = truthInLending({
      advance: route.principal,
      prepaidFinanceCharge: route.fees,
      advancedOn: contract.fundedOn,
      payments: contract.rows.map((row) => ({
        on: new Date(`${row.date}T00:00:00`),
        amount: row.payment,
      })),
    }).apr;
  }
  const aprAgrees = apr !== null && Math.abs(apr - route.annualRate) < 0.005;
  const rate = loanRateText(route.annualRate);

  const summary: SummaryItem[] = [
    {
      id: 'rate',
      label: t('loan.rate'),
      value: aprAgrees ? t('loan.schedule.rateApr', { rate }) : rate,
    },
    {
      id: 'term',
      label: t('loan.termLabel'),
      value: t('loan.schedule.termCount', { term: loanTermText(route.months), count: rows.length }),
    },
    {
      id: 'interest',
      label: t('loan.totalInterest'),
      value: formatCurrency(loan.totalInterest),
    },
    { id: 'total', label: t('loan.calculator.totalRepay'), value: formatCurrency(loan.totalPaid) },
  ];
  // APR is a disclosure term and stays as written.
  if (apr !== null && !aprAgrees) summary.push({ id: 'apr', label: 'APR', value: percent(apr, 2) });

  const notes = [
    ...loan.problems.map(problemNote),
    ...(loan.balloon
      ? [t('loan.calculator.balloon', { amount: formatCurrency(contract.finalPayment) })]
      : []),
  ];
  const unused = unusedNote(loan.unused);

  // Only the open calculator's own loan can be changed: a loan on file is changed from its bill.
  const openPayment = live
    ? (row: ScheduleRow) =>
        router.push({
          pathname: '/loan-payment',
          params: { ...baseParams(route), draft: route.draft, target: String(row.number) },
        })
    : undefined;

  const shown = showAll ? rows.length : Math.min(rows.length, FIRST_ROWS);
  const years = scheduleByYear(rows)
    .map((year) => ({
      ...year,
      shown: year.payments.filter((row) => row.number <= shown),
    }))
    .filter((year) => year.shown.length > 0);

  return (
    <Screen title={route.name || t('loan.schedule.title')} showBack>
      <View className="mt-3 w-full rounded-[20px] border border-line bg-card p-[20px]">
        <PaymentHeadline
          payment={loan.payment}
          label={
            loan.applied.monthlyPayment !== undefined ? t('loan.calculator.bankPayment') : undefined
          }
          size={28}
        />
        <View className="mt-[18px] w-full">
          <SummaryGrid items={summary} columns={2} testID="schedule-summary" />
        </View>
        {notes.map((note) => (
          <Text
            key={note}
            className="mt-3 font-app-medium text-[13px] leading-[18px] text-danger"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {note}
          </Text>
        ))}
        {unused ? (
          <Text
            className="mt-3 font-app text-[12px] leading-[17px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {unused}
          </Text>
        ) : null}
      </View>

      {years.map((year) => (
        <View key={year.year} className="mt-8 w-full">
          {/* The year's own totals, whether or not all its rows are showing yet. */}
          <SectionHeading
            className="mb-3 px-1"
            caption={t('loan.schedule.yearSummary', {
              count: year.payments.length,
              interest: formatCurrency(year.interest),
            })}
          >
            {year.year}
          </SectionHeading>
          <View className="w-full overflow-hidden rounded-[20px] border border-line bg-card">
            {year.shown.map((row, index) => (
              <PaymentRow key={row.number} row={row} first={index === 0} onPress={openPayment} />
            ))}
          </View>
        </View>
      ))}

      {shown < rows.length ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll(true)}
          className="mt-6 min-h-[48px] w-full items-center justify-center rounded-full bg-accent/10 px-5 py-3 active:bg-accent/20"
        >
          <Text
            className="text-center font-app-medium text-[15px] text-accent-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('loan.schedule.showAll', { count: rows.length })}
          </Text>
        </Pressable>
      ) : null}

      <Text
        className="mb-10 mt-8 w-full text-center font-app text-[12px] leading-[18px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {`${footnote} ${t('loan.schedule.assumes')} ${t(
          overpaid ? 'loan.schedule.overpaidNote' : 'loan.schedule.payExtraNote',
        )}`}
      </Text>
    </Screen>
  );
}
