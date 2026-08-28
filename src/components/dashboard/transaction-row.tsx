import { Pressable, Text, View } from 'react-native';

import { BrandMark } from '@/components/brands/brand-mark';
import { formatCurrency } from '@/lib/format';

type TransactionRowProps = {
  label: string;
  /** Negative is money out. */
  amount: number;
  /** What it came from, so the row says more than a name and a number. */
  kindLabel?: string;
  domain?: string | null;
  onPress?: () => void;
};

/**
 * One line in the day's transaction list.
 *
 * Uses the same brand mark as the receipts and subscriptions lists rather than
 * a category glyph — the merchant's own logo is what people recognise, and it
 * keeps every list in the app reading the same way.
 */
export function TransactionRow({ label, amount, kindLabel, domain, onPress }: TransactionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatCurrency(amount)}${kindLabel ? `, ${kindLabel}` : ''}`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
    >
      <BrandMark name={label} domain={domain} size={40} />

      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {label}
        </Text>
        {kindLabel ? (
          <Text
            className="mt-0.5 font-poppins text-[12px] text-muted"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {kindLabel}
          </Text>
        ) : null}
      </View>

      <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.4}>
        {formatCurrency(amount)}
      </Text>
    </Pressable>
  );
}
