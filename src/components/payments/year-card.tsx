import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { ProBadge } from '@/components/payments/pro-badge';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { numberMarks, t } from '@/i18n';
import { groupDigits } from '@/i18n/number';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import type { YearsList } from '@/lib/payment-years';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';

/** One year as the years list gives it: its total, how many payments, and whether only Pro lists it. */
export type YearRow = YearsList['years'][number];

/**
 * "67 payments", "1,234 payments". The plural is chosen from the number, so the digits are grouped
 * after, the way the language groups them.
 */
export function paymentsCountText(count: number): string {
  const digits = String(count);
  return t('payments.count', { count }).replace(digits, groupDigits(digits, numberMarks().group));
}

/**
 * One year on the All years page: the year (with the Pro badge when only Pro lists its rows), how
 * many payments, the year's total and the arrow that opens it. The year and the count are measured
 * against the room the total leaves; when a word cannot fit beside it, the total moves under them.
 */
export function YearCard({
  summary,
  onOpen,
  className,
}: {
  summary: YearRow;
  onOpen: () => void;
  className?: string;
}) {
  const colors = useColors();
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const amount = formatCurrency(summary.total);
  const count = paymentsCountText(summary.count);
  const spoken = t('payments.years.rowA11y', {
    year: summary.proOnly ? t('payments.pro.yearA11y', { year: summary.year }) : summary.year,
    count,
    amount,
  });

  const figure = (
    <FitText
      id="amount"
      hug
      role="row"
      size={17}
      className="font-app-bold text-ink"
      slotClassName={stacked ? 'mt-1' : undefined}
    >
      {amount}
    </FitText>
  );

  return (
    <FitGroup
      group={words}
      className={cn('w-full', className)}
      testID={`year-card-${summary.year}-words`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        onPress={withTap(onOpen)}
        testID={`year-card-${summary.year}`}
        className="min-h-[64px] w-full flex-row items-center gap-3 rounded-[20px] border border-line bg-card px-[18px] py-[16px] active:bg-ink/5"
      >
        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="year"
            role="row"
            size={17}
            className="font-app-bold text-ink"
            slotClassName="w-full flex-row flex-wrap items-center gap-x-[8px] gap-y-[2px]"
            after={summary.proOnly ? <ProBadge /> : undefined}
          >
            {String(summary.year)}
          </FitText>
          {stacked ? figure : null}
          <FitText
            id="count"
            role="row"
            size={13}
            className="mt-0.5 font-app text-muted"
            slotClassName="w-full"
          >
            {count}
          </FitText>
        </View>
        {stacked ? null : figure}
        <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
      </Pressable>
    </FitGroup>
  );
}
