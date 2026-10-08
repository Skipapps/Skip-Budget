import { Text, View } from 'react-native';

import { percent, t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type ProportionBarProps = {
  principal: number;
  interest: number;
};

export function ProportionBar({ principal, interest }: ProportionBarProps) {
  const colors = useColors();
  const total = principal + interest;
  const interestShare = total > 0 ? interest / total : 0;

  return (
    <View className="w-full">
      <View className="h-3 w-full flex-row overflow-hidden rounded-full bg-ink/5">
        <View style={{ flex: Math.max(principal, 0) }} className="bg-body" />
        <View style={{ flex: Math.max(interest, 0) }} className="bg-accent" />
      </View>

      {/* The second key moves under the first when the two do not fit on one line. */}
      <View className="mt-3 w-full flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <View className="max-w-full flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.body }} />
          <Text
            className="shrink font-app text-[12px] text-body"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('loan.proportion.borrowed', {
              amount: formatCurrency(principal, { cents: false }),
            })}
          </Text>
        </View>

        <View className="max-w-full flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.accent }} />
          <Text
            className="shrink font-app text-[12px] text-body"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('loan.proportion.interest', { share: percent(Math.round(interestShare * 100), 0) })}
          </Text>
        </View>
      </View>
    </View>
  );
}
