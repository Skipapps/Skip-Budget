import { ArrowDownLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { LedgerEntry } from '@/api/queries';
import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

type LedgerRowProps = {
  entry: LedgerEntry;
  /** Human label for the card or account it came from. */
  sourceLabel: string;
  kindLabel: string;
  /**
   * Opens the record behind the row. Undefined leaves it inert: not a button, no dimming, not
   * announced by VoiceOver as pressable.
   */
  onPress?: () => void;
};

export function LedgerRow({ entry, sourceLabel, kindLabel, onPress }: LedgerRowProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  // Income is the one kind with nothing to draw: a paycheque has no merchant, and a monogram of the
  // employer's name reads as a mistake next to real logos.
  const isIncome = entry.kind === 'income';
  // A bill is not a brand either — it carries the category icon instead.
  const isBill = entry.kind === 'bill';

  const label = [entry.label, kindLabel, sourceLabel, formatCurrency(entry.amount)]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        'w-full flex-row items-center gap-3 py-3',
        onPress ? 'active:opacity-60' : undefined,
      )}
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
        <BrandMark name={entry.label} domain={entry.domain} hidden={entry.logoHidden} size={40} />
      )}

      <View className="min-w-0 flex-1">
        <Text
          className="font-app text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {entry.label}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {sourceLabel ? `${kindLabel} · ${sourceLabel}` : kindLabel}
        </Text>
      </View>

      <Text
        className="font-app-semibold text-[15px] text-ink"
        style={{ color: moneyColor(entry.amount) }}
        maxFontSizeMultiplier={1.4}
      >
        {formatCurrency(entry.amount)}
      </Text>
    </Pressable>
  );
}
