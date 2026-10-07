import { createElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brands/brand-logo';
import { RECURRENCES, getBillIcon, type Bill } from '@/data/bills-mock';
import { GLYPH_STROKE } from '@/data/glyphs';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

type BillRowProps = {
  bill: Bill;
  sourceLabel: string;
  onPress?: () => void;
};

export const RECURRENCE_LABELS: Record<string, string> = {
  ...Object.fromEntries(RECURRENCES.map((option) => [option.value, option.label])),
  period: 'Set period',
};

export function BillRow({ bill, sourceLabel, onPress }: BillRowProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  // createElement, not JSX: a capitalised local for a looked-up component trips the lint rule.
  const icon = createElement(getBillIcon(bill), {
    size: 20,
    strokeWidth: GLYPH_STROKE,
    color: colors.body,
  });
  const recurrence = RECURRENCE_LABELS[bill.recurrence] ?? bill.recurrence;
  const domain = bill.domain;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${bill.name}, ${formatCurrency(bill.amount)}, ${recurrence}, paid with ${sourceLabel}`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
    >
      {domain ? (
        <BrandLogo name={bill.name} domain={domain} size={40} />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-ink/5">
          {icon}
        </View>
      )}

      <View className="min-w-0 flex-1">
        <Text
          className="font-app-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {bill.name}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {sourceLabel ? `${recurrence} · ${sourceLabel}` : recurrence}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          style={{ color: moneyColor(bill.amount) }}
          maxFontSizeMultiplier={1.4}
        >
          {formatCurrency(bill.amount)}
        </Text>
        <Text className="mt-0.5 font-app text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
          {formatFullDate(new Date(`${bill.dueDate}T00:00:00`))}
        </Text>
      </View>
    </Pressable>
  );
}
