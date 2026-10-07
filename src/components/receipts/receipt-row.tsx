import { Pressable, Text, View } from 'react-native';

import { BrandMark } from '@/components/brands/brand-mark';
import { t } from '@/i18n';
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
  /** The receipt's own logo (logoDomainOf); skips the lookup. */
  domain?: string | null;
  /** The owner chose letters for this receipt. */
  logoHidden?: boolean | null;
  onPress?: () => void;
};

export function ReceiptRow({
  merchant,
  amount,
  date,
  sourceLabel,
  domain,
  logoHidden,
  onPress,
}: ReceiptRowProps) {
  const moneyColor = useMoneyColor();
  const spent = -Math.abs(amount);
  const figure = formatCurrency(spent);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        sourceLabel
          ? t('receipts.row.paidWith', { merchant, amount: figure, source: sourceLabel })
          : `${merchant}, ${figure}`
      }
      accessibilityHint={t('receipts.row.hint')}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
    >
      <BrandMark name={merchant} domain={domain} hidden={logoHidden} size={40} />

      <View className="min-w-0 flex-1">
        <Text
          className="font-app-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {merchant}
        </Text>
        {sourceLabel ? (
          <Text
            className="mt-0.5 font-app text-[12px] text-muted"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {sourceLabel}
          </Text>
        ) : null}
      </View>

      <View className="items-end">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          style={{ color: moneyColor(spent) }}
          maxFontSizeMultiplier={1.4}
        >
          {figure}
        </Text>
        <Text className="mt-0.5 font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatFullDate(new Date(`${date}T00:00:00`))}
        </Text>
      </View>
    </Pressable>
  );
}
