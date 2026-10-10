import { Calendar } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { FitFigure } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { shortDay } from '@/lib/due-day';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { useGradientIcons } from '@/theme/gradient-icons';
import { TEXT_CAP } from '@/theme/text-scale';

type SalaryTotalCardProps = {
  /** What the schedules bring in a month. */
  total: number;
  /** One-off pays dated this month, said apart from the total. */
  onceThisMonth: number;
  /** The soonest payday of any schedule, yyyy-mm-dd, or null when none has a last payday yet. */
  nextPayday: string | null;
  /** How many schedules there are; one-off pays are not sources. */
  sources: number;
};

/** The month's pay at the top of the Salary page, with when it next lands and from how many. */
export function SalaryTotalCard({
  total,
  onceThisMonth,
  nextPayday,
  sources,
}: SalaryTotalCardProps) {
  const colors = useColors();
  const { salary: SalaryIcon } = useGradientIcons();
  const footer =
    sources === 0
      ? null
      : nextPayday
        ? t('salary.total.next', { date: shortDay(nextPayday), count: sources })
        : t('salary.total.count', { count: sources });

  return (
    <View
      testID="salary-total-card"
      className="mt-3 w-full rounded-[20px] border border-line bg-card p-[20px]"
    >
      <View className="w-full flex-row items-center gap-[16px]">
        <View
          className="h-[48px] w-[48px]"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <SalaryIcon width="100%" height="100%" />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('salary.totalPerMonth')}
          </Text>
          <FitFigure
            id="monthly-total"
            size={30}
            className="font-app-bold text-ink"
            boxClassName="mt-0.5"
          >
            {formatCurrency(total)}
          </FitFigure>
          {onceThisMonth > 0 ? (
            <Text
              className="mt-1 font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {t('salary.oneOffThisMonth', { amount: formatCurrency(onceThisMonth) })}
            </Text>
          ) : null}
        </View>
      </View>

      {footer ? (
        <View className="mt-[16px] w-full flex-row items-center gap-2 border-t border-line pt-[14px]">
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Calendar size={15} color={colors.muted} strokeWidth={1.8} />
          </View>
          <Text
            className="min-w-0 flex-1 font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {footer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
