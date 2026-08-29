import { ArrowDownLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { LedgerEntry } from '@/api/queries';
import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

type LedgerRowProps = {
  entry: LedgerEntry;
  /** Human label for the card or account it came from. */
  sourceLabel: string;
  kindLabel: string;
  onPress?: () => void;
};

export function LedgerRow({ entry, sourceLabel, kindLabel, onPress }: LedgerRowProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  // Income is the one kind with nothing to draw: a paycheque has no merchant,
  // and a monogram of the employer's name reads as a mistake next to real
  // logos. Everything that was actually bought somewhere gets its brand.
  const isIncome = entry.kind === 'income';
  // A bill is not a brand either — it carries the category icon instead.
  const isBill = entry.kind === 'bill';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[entry.label, kindLabel, sourceLabel, formatCurrency(entry.amount)]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3 active:opacity-60"
    >
      {isIncome ? (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-ink/5">
          <ArrowDownLeft size={18} color={colors.body} strokeWidth={1.8} />
        </View>
      ) : isBill ? (
        <BillMark
          categoryId={entry.categoryId}
          iconId={entry.iconId}
          domain={entry.domain}
          name={entry.label}
          size={40}
        />
      ) : (
        <BrandMark name={entry.label} domain={entry.domain} size={40} />
      )}

      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {entry.label}
        </Text>
        <Text
          className="mt-0.5 font-poppins text-[12px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {sourceLabel ? `${kindLabel} · ${sourceLabel}` : kindLabel}
        </Text>
      </View>

      <Text
        className="font-poppins-semibold text-[15px] text-ink"
        style={{ color: moneyColor(entry.amount) }}
        maxFontSizeMultiplier={1.4}
      >
        {formatCurrency(entry.amount)}
      </Text>
    </Pressable>
  );
}
