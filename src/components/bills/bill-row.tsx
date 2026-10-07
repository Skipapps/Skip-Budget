import { createElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BrandLogo } from '@/components/brands/brand-logo';
import { getBillIcon, type Bill } from '@/data/bills-mock';
import { GLYPH_STROKE } from '@/data/glyphs';
import { t, type MessageKey } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

type BillRowProps = {
  bill: Bill;
  sourceLabel: string;
  onPress?: () => void;
};

const RECURRENCE_KEYS = new Map<string, MessageKey>([
  ['weekly', 'dates.weekly'],
  ['monthly', 'dates.monthly'],
  ['quarterly', 'bills.recurrence.quarterly'],
  ['yearly', 'bills.recurrence.yearly'],
  ['period', 'bills.recurrence.period'],
]);

/** How often a bill repeats, as read; the stored value only picks the line. */
export function recurrenceLabel(recurrence: string): string {
  const key = RECURRENCE_KEYS.get(recurrence);
  return key ? t(key) : recurrence;
}

const CATEGORY_KEYS = new Map<string, { label: MessageKey; hint: MessageKey }>([
  ['housing', { label: 'bills.category.housing', hint: 'bills.categoryHint.housing' }],
  ['energy', { label: 'bills.category.energy', hint: 'bills.categoryHint.energy' }],
  ['water', { label: 'bills.category.water', hint: 'bills.categoryHint.water' }],
  ['internet', { label: 'bills.category.internet', hint: 'bills.categoryHint.internet' }],
  ['mobile', { label: 'bills.category.mobile', hint: 'bills.categoryHint.mobile' }],
  ['insurance', { label: 'bills.category.insurance', hint: 'bills.categoryHint.insurance' }],
  ['loans', { label: 'bills.category.loans', hint: 'bills.categoryHint.loans' }],
  ['transport', { label: 'bills.category.transport', hint: 'bills.categoryHint.transport' }],
  ['family', { label: 'bills.category.family', hint: 'bills.categoryHint.family' }],
  ['other', { label: 'bills.category.other', hint: 'bills.categoryHint.other' }],
]);

/**
 * A bill category's name as read; the id is what is stored. A new bill is pre-named with this, so
 * its name is in the language it was created in. `fallback` covers an id this build does not know.
 */
export function billCategoryLabel(id: string | null | undefined, fallback = ''): string {
  const keys = id ? CATEGORY_KEYS.get(id) : undefined;
  return keys ? t(keys.label) : fallback;
}

/** What a bill category covers, under its name on the picker. */
export function billCategoryHint(id: string, fallback = ''): string {
  const keys = CATEGORY_KEYS.get(id);
  return keys ? t(keys.hint) : fallback;
}

export function BillRow({ bill, sourceLabel, onPress }: BillRowProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  // createElement, not JSX: a capitalised local for a looked-up component trips the lint rule.
  const icon = createElement(getBillIcon(bill), {
    size: 20,
    strokeWidth: GLYPH_STROKE,
    color: colors.body,
  });
  const recurrence = recurrenceLabel(bill.recurrence);
  const domain = bill.domain;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('bills.row.a11y', {
        name: bill.name,
        amount: formatCurrency(bill.amount),
        recurrence,
        source: sourceLabel,
      })}
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
