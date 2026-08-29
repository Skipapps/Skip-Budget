import { Pressable, Text, View } from 'react-native';

import { BrandMark } from '@/components/brands/brand-mark';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useMoneyColor } from '@/providers/theme-provider';

export const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

type SubscriptionRowProps = {
  name: string;
  amount: number;
  cycle: string;
  /** yyyy-mm-dd, or null when the renewal date is unknown. */
  renewsOn: string | null;
  sourceLabel: string;
  domain?: string | null;
  /** Cancelled plans stay in the list, dimmed rather than hidden. */
  active?: boolean;
  onPress?: () => void;
};

export function SubscriptionRow({
  name,
  amount,
  cycle,
  renewsOn,
  sourceLabel,
  domain,
  active = true,
  onPress,
}: SubscriptionRowProps) {
  const moneyColor = useMoneyColor();
  const cycleLabel = CYCLE_LABELS[cycle] ?? cycle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${formatCurrency(amount)} ${cycleLabel}${sourceLabel ? `, charged to ${sourceLabel}` : ''}${active ? '' : ', cancelled'}`}
      accessibilityHint="Opens this subscription"
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
      style={active ? undefined : { opacity: 0.5 }}
    >
      <BrandMark name={name} domain={domain} size={44} />

      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {name}
        </Text>
        <Text
          className="mt-0.5 font-poppins text-[12px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {active ? cycleLabel : 'Cancelled'}
          {sourceLabel ? ` · ${sourceLabel}` : ''}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className="font-poppins-semibold text-[15px] text-ink"
          style={{ color: moneyColor(-Math.abs(amount)) }}
          maxFontSizeMultiplier={1.4}
        >
          {formatCurrency(amount)}
        </Text>
        <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {renewsOn ? formatFullDate(new Date(`${renewsOn}T00:00:00`)) : 'No renewal date'}
        </Text>
      </View>
    </Pressable>
  );
}
