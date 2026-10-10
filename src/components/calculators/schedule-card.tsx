import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { percent, t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import type { ScheduleRow } from '@/lib/loan';
import { toCents } from '@/lib/money';
import { useColors } from '@/providers/theme-provider';
import { useLoanIcons } from '@/theme/loan-icons';
import { TEXT_CAP } from '@/theme/text-scale';

/** A loan term in the language on screen: "5 years 3 months", "5 años 3 meses", "5 ans 3 mois". */
export function loanTermText(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return t('loan.term.months', { count: remainder });
  if (remainder === 0) return t('loan.term.years', { count: years });
  return t('loan.term.yearsMonths', {
    years: t('loan.term.years', { count: years }),
    months: t('loan.term.months', { count: remainder }),
  });
}

/**
 * A rate to at least two decimals and never rounded: 7.5 reads "7.50%", 6.125 "6.125%". toFixed at
 * the length of the shortest decimal String() writes gives back exactly those digits.
 */
export function loanRateText(rate: number): string {
  const decimals = (String(rate).split('.')[1] ?? '').length;
  return percent(rate, Math.min(Math.max(decimals, 2), 20));
}

/** An amount borrowed, in whole units unless it has cents, so $25,000.50 is never drawn as $25,001. */
export function loanAmountText(amount: number): string {
  return formatCurrency(amount, { cents: toCents(amount) % 100 !== 0 });
}

type ScheduleCardProps = {
  rows: readonly ScheduleRow[];
  onPress: () => void;
};

/** The way into the payment-by-payment schedule. */
export function ScheduleCard({ rows, onPress }: ScheduleCardProps) {
  const colors = useColors();
  const { schedule: Icon } = useLoanIcons();
  if (rows.length === 0) return null;

  const title = t('loan.schedule.title');
  const subtitle = t('loan.scheduleCard.subtitle', { count: rows.length });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={onPress}
      className="w-full flex-row items-center gap-[14px] rounded-[20px] border border-line bg-card px-[18px] py-[16px] active:bg-ink/5"
    >
      <View
        className="h-[38px] w-[38px]"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon width="100%" height="100%" />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {title}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {subtitle}
        </Text>
      </View>

      <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}
