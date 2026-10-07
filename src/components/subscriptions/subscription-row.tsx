import { Pressable, Text, View } from 'react-native';

import { BrandMark } from '@/components/brands/brand-mark';
import { t, type MessageKey } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useMoneyColor } from '@/providers/theme-provider';

const CYCLE_KEYS = new Map<string, MessageKey>([
  ['weekly', 'dates.weekly'],
  ['monthly', 'dates.monthly'],
  ['quarterly', 'subscriptions.cycle.quarterly'],
  ['yearly', 'subscriptions.cycle.yearly'],
]);

/** A billing cycle as read; the stored value only picks the line. */
export function cycleLabel(cycle: string): string {
  const key = CYCLE_KEYS.get(cycle);
  return key ? t(key) : cycle;
}

type SubscriptionRowProps = {
  name: string;
  amount: number;
  cycle: string;
  /** yyyy-mm-dd, or null when the renewal date is unknown. */
  renewsOn: string | null;
  sourceLabel: string;
  domain?: string | null;
  /** The owner chose letters for this subscription. */
  logoHidden?: boolean | null;
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
  logoHidden,
  active = true,
  onPress,
}: SubscriptionRowProps) {
  const moneyColor = useMoneyColor();
  const shownCycle = cycleLabel(cycle);
  const spoken = {
    name,
    amount: formatCurrency(amount),
    cycle: shownCycle,
    source: sourceLabel,
  };
  const accessibilityLabel = sourceLabel
    ? t(active ? 'subscriptions.row.a11ySource' : 'subscriptions.row.a11ySourceCancelled', spoken)
    : t(active ? 'subscriptions.row.a11y' : 'subscriptions.row.a11yCancelled', spoken);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t('subscriptions.row.hint')}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
      style={active ? undefined : { opacity: 0.5 }}
    >
      <BrandMark name={name} domain={domain} hidden={logoHidden} size={40} />

      <View className="min-w-0 flex-1">
        <Text
          className="font-app-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {name}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {active ? shownCycle : t('subscriptions.cancelled')}
          {sourceLabel ? ` · ${sourceLabel}` : ''}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          style={{ color: moneyColor(-Math.abs(amount)) }}
          maxFontSizeMultiplier={1.4}
        >
          {formatCurrency(amount)}
        </Text>
        <Text className="mt-0.5 font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {renewsOn
            ? formatFullDate(new Date(`${renewsOn}T00:00:00`))
            : t('subscriptions.row.noRenewalDate')}
        </Text>
      </View>
    </Pressable>
  );
}
