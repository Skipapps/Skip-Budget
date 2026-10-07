import { Text, View } from 'react-native';

import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';

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

      <View className="mt-3 w-full flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.body }} />
          <Text className="font-app text-[12px] text-body" maxFontSizeMultiplier={1.3}>
            Borrowed {formatCurrency(principal, { cents: false })}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.accent }} />
          <Text className="font-app text-[12px] text-body" maxFontSizeMultiplier={1.3}>
            Interest {Math.round(interestShare * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
}
