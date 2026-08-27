import { Pressable, Text, View } from 'react-native';

import { BrandMark } from '@/components/brands/brand-mark';

import { BILLING_CYCLES, type Subscription } from '@/data/subscriptions-mock';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';

const CYCLE_LABELS = Object.fromEntries(
  BILLING_CYCLES.map((cycle) => [cycle.value, cycle.label]),
) as Record<string, string>;

type SubscriptionRowProps = {
  subscription: Subscription;
  sourceLabel: string;
  onPress?: () => void;
};

export function SubscriptionRow({ subscription, sourceLabel, onPress }: SubscriptionRowProps) {
  const cycle = CYCLE_LABELS[subscription.cycle] ?? subscription.cycle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${subscription.name}, ${formatCurrency(subscription.amount)} ${cycle}, charged to ${sourceLabel}`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
    >
      <BrandMark name={subscription.name} size={44} />

      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {subscription.name}
        </Text>
        <Text
          className="mt-0.5 font-poppins text-[12px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {cycle} · {sourceLabel}
        </Text>
      </View>

      <View className="items-end">
        <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.4}>
          {formatCurrency(subscription.amount)}
        </Text>
        <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatFullDate(new Date(`${subscription.renewsOn}T00:00:00`))}
        </Text>
      </View>
    </Pressable>
  );
}
