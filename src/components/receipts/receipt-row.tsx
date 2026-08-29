import { Pressable, Text, View } from 'react-native';

import { BrandMark } from '@/components/brands/brand-mark';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useMoneyColor } from '@/providers/theme-provider';

type ReceiptRowProps = {
  merchant: string;
  /** Stored positive; money out is a presentation decision, made here. */
  amount: number;
  /** yyyy-mm-dd */
  date: string;
  sourceLabel: string;
  /** Known when the receipt is linked to a catalog brand; skips the lookup. */
  domain?: string | null;
  onPress?: () => void;
};

export function ReceiptRow({
  merchant,
  amount,
  date,
  sourceLabel,
  domain,
  onPress,
}: ReceiptRowProps) {
  const moneyColor = useMoneyColor();
  const spent = -Math.abs(amount);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${merchant}, ${formatCurrency(spent)}${sourceLabel ? `, paid with ${sourceLabel}` : ''}`}
      accessibilityHint="Opens this receipt"
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
    >
      <BrandMark name={merchant} domain={domain} size={44} />

      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {merchant}
        </Text>
        {sourceLabel ? (
          <Text
            className="mt-0.5 font-poppins text-[12px] text-muted"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {sourceLabel}
          </Text>
        ) : null}
      </View>

      <View className="items-end">
        <Text
          className="font-poppins-semibold text-[15px] text-ink"
          style={{ color: moneyColor(spent) }}
          maxFontSizeMultiplier={1.4}
        >
          {formatCurrency(spent)}
        </Text>
        <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatFullDate(new Date(`${date}T00:00:00`))}
        </Text>
      </View>
    </Pressable>
  );
}
