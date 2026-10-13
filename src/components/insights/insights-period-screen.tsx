import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useCharges } from '@/api/charges';
import { usePayReceived } from '@/api/pay';
import { useLoanPayoffRows, useReceipts } from '@/api/queries';
import { ChoiceList, type ChoiceItem } from '@/components/payments/choice-list';
import { useProGate } from '@/components/pro/pro-gate';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import { monthOf } from '@/lib/bill-month';
import { failureText } from '@/lib/failure';
import { periodChoices } from '@/lib/insights';
import { pickPayment } from '@/lib/payment-pick';
import { paymentFloor } from '@/lib/payment-years';
import { useNavigateOnce } from '@/lib/use-navigate-once';
import { useToday } from '@/lib/use-today';
import { useArtwork } from '@/theme/artwork';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;

/** "October 2026". */
function monthYear(month: string): string {
  return t('ui.calendar.monthYear', {
    month: monthLong(Number(month.slice(5, 7)) - 1),
    year: Number(month.slice(0, 4)),
  });
}

/**
 * Choose month or Choose year for Insights (`?kind=month|year&owner=…&selected=yyyy-mm|yyyy`). Only
 * months and years with money on record are listed, newest first, plus the current one; months sit
 * under their year. A pick is only how Insights looks, so it is handed back to the page that opened
 * this one, and nothing is saved.
 */
export function InsightsPeriodScreen() {
  // Wrapper, not inline: an early return above the screen's own hooks would change the hook count
  // when the entitlement answer lands.
  const gate = useProGate('insights');
  if (gate) return gate;
  return <InsightsPeriodInner />;
}

function InsightsPeriodInner() {
  const params = useLocalSearchParams<{ kind?: string; owner?: string; selected?: string }>();
  const { today } = useToday();
  const artwork = useArtwork();
  const once = useNavigateOnce();
  const kind = params.kind === 'year' ? 'year' : 'month';
  const owner = typeof params.owner === 'string' ? params.owner : '';

  const receipts = useReceipts();
  const charges = useCharges();
  const pay = usePayReceived();
  const payoffs = useLoanPayoffRows();
  const reads = [receipts, charges, pay, payoffs];
  // A failed reload still holding its last answer has not lost it.
  const isError = reads.some((read) => read.isError && read.data === undefined);
  const isLoading = reads.some((read) => read.isLoading);
  const retry = () => {
    for (const read of reads) void read.refetch();
  };

  const choices = useMemo(
    () =>
      periodChoices(
        [
          ...(receipts.data ?? []).map((row) => row.purchased_on),
          ...(charges.data ?? []).map((row) => row.charged_on),
          ...(pay.data ?? []).map((row) => row.paid_on),
          ...(payoffs.data ?? []).map((row) => row.paid_on),
        ],
        today,
        paymentFloor(today),
      ),
    [receipts.data, charges.data, pay.data, payoffs.data, today],
  );

  const asked = typeof params.selected === 'string' ? params.selected : '';
  const selectedMonth = MONTH.test(asked) ? asked : monthOf(today);
  const selectedYear = YEAR.test(asked) ? Number(asked) : Number(today.slice(0, 4));

  const chooseMonth = (month: string) =>
    once(() => {
      if (owner) pickPayment({ owner, type: 'month', month });
      goBack();
    });
  const chooseYear = (year: number) =>
    once(() => {
      if (owner) pickPayment({ owner, type: 'year', year });
      goBack();
    });

  return (
    <Screen
      title={t(kind === 'year' ? 'payments.year.title' : 'payments.picker.monthTitle')}
      showBack
    >
      {isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={retry}
        />
      ) : isLoading ? (
        <View testID="insights-period-loading" className="mt-3 w-full">
          <SkeletonList rows={4} />
        </View>
      ) : kind === 'year' ? (
        <View className="mb-4 w-full">
          <ChoiceList
            testID="insights-years"
            className="mt-3"
            items={choices.years.map((year): ChoiceItem<number> => ({
              value: year,
              label: String(year),
            }))}
            value={selectedYear}
            onChoose={chooseYear}
          />
        </View>
      ) : (
        <View className="mb-4 w-full">
          {choices.monthsByYear.map((group, index) => (
            <ChoiceList
              key={group.year}
              testID={`insights-months-${group.year}`}
              className={index === 0 ? 'mt-3' : 'mt-6'}
              title={String(group.year)}
              items={group.months.map((month): ChoiceItem<string> => ({
                value: month,
                label: monthYear(month),
              }))}
              value={selectedMonth}
              onChoose={chooseMonth}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
