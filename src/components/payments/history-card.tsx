import { Text, View } from 'react-native';

import { MonthBars } from '@/components/payments/month-bars';
import { PlumCard } from '@/components/payments/plum-card';
import { numberMarks, t } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import { groupDigits } from '@/i18n/number';
import { formatCurrency } from '@/lib/format';
import type { YearSummary } from '@/lib/payment-years';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The card as VoiceOver reads it: the year's figures, then each month's amount up to this month
 * (months still to come have nothing to say).
 */
export function historyCardSpoken(summary: YearSummary): string {
  const shown =
    summary.highlight === null ? summary.bars : summary.bars.slice(0, summary.highlight + 1);
  const list = shown
    .map((amount, index) =>
      t('payments.history.barA11y', { month: monthLong(index), amount: formatCurrency(amount) }),
    )
    .join(', ');
  return `${t('payments.history.cardA11y', {
    year: summary.year,
    amount: formatCurrency(summary.total),
    count: summary.count,
    avg: formatCurrency(summary.average),
  })} ${t('payments.history.barsA11y', { list })}`;
}

function Stat({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View testID={testID} className="max-w-full">
      <Text
        className="font-app text-[13px] text-on-control/90"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {label}
      </Text>
      <Text
        className="mt-[2px] font-app-bold text-[17px] text-on-control"
        maxFontSizeMultiplier={TEXT_CAP.figure}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * "Paid in {year}" on the plum card: the year's total, how many payments and the average a month,
 * then January to December as bars. The figures are the whole year's, rows hidden on free included.
 * The two stats wrap under each other rather than shrink at large text.
 */
export function HistoryCard({ summary }: { summary: YearSummary }) {
  return (
    <PlumCard
      testID="history-card"
      label={t('payments.history.paidIn', { year: summary.year })}
      figure={formatCurrency(summary.total)}
      accessibilityLabel={historyCardSpoken(summary)}
    >
      <View className="mt-[14px] w-full flex-row flex-wrap gap-x-[28px] gap-y-[10px]">
        <Stat
          testID="history-count"
          label={t('payments.history.payments')}
          value={groupDigits(String(summary.count), numberMarks().group)}
        />
        <Stat
          testID="history-average"
          label={t('payments.history.avg')}
          value={formatCurrency(summary.average)}
        />
      </View>
      <MonthBars bars={summary.bars} highlight={summary.highlight} />
    </PlumCard>
  );
}
