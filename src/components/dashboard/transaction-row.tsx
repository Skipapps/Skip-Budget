import { ArrowDownLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

type TransactionRowProps = {
  label: string;
  /** Negative is money out. */
  amount: number;
  /** What it came from, so the row says more than a name and a number. */
  kindLabel?: string;
  domain?: string | null;
  /** Bills draw their category icon rather than a brand logo. */
  kind?: 'receipt' | 'bill' | 'subscription' | 'payment' | 'income';
  categoryId?: string | null;
  iconId?: string | null;
  onPress?: () => void;
};

/**
 * One line in the day's transaction list.
 *
 * Uses the same brand mark as the receipts and subscriptions lists rather than
 * a category glyph — the merchant's own logo is what people recognise, and it
 * keeps every list in the app reading the same way.
 */
export function TransactionRow({
  label,
  amount,
  kindLabel,
  domain,
  kind,
  categoryId,
  iconId,
  onPress,
}: TransactionRowProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatCurrency(amount)}${kindLabel ? `, ${kindLabel}` : ''}`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
    >
      {kind === 'bill' ? (
        <BillMark categoryId={categoryId} iconId={iconId} domain={domain} name={label} size={40} />
      ) : kind === 'payment' || kind === 'income' ? (
        // Neither is a purchase from anyone, so neither has a logo. A monogram
        // of the word "Payment" reads as a logo that failed to load; an arrow
        // says what actually happened — money came in.
        <View className="h-10 w-10 items-center justify-center rounded-full bg-ink/5">
          <ArrowDownLeft size={18} color={colors.body} strokeWidth={1.8} />
        </View>
      ) : (
        <BrandMark name={label} domain={domain} size={40} />
      )}

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

      <Text
        className="font-poppins-semibold text-[15px] text-ink"
        style={{ color: moneyColor(amount) }}
        maxFontSizeMultiplier={1.4}
      >
        {formatCurrency(amount)}
      </Text>
    </Pressable>
  );
}
