import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { fullDateText } from '@/components/payments/plan-month-row';
import { SectionCard } from '@/components/payments/section-card';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { fromCents } from '@/lib/money';
import type { DateRangeChoice, PaymentFilters } from '@/lib/payment-search';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type FilterKind = 'date' | 'amount' | 'from';

/** "Any time", "Last 3 months", "1 Jan 2026 – 31 Mar 2026". */
export function rangeText(range: DateRangeChoice): string {
  switch (range) {
    case 'any':
      return t('payments.search.anyTime');
    case 'thisMonth':
      return t('payments.range.thisMonth');
    case 'last3Months':
      return t('payments.range.last3Months');
    case 'thisYear':
      return t('payments.range.thisYear');
    case 'lastYear':
      return t('payments.range.lastYear');
    default:
      return t('payments.range.span', {
        from: fullDateText(range.from),
        to: fullDateText(range.to),
      });
  }
}

/** "Any amount", "$10.00 or more", "Up to $50.00", "$10.00 – $50.00". */
export function amountText({
  minCents,
  maxCents,
}: Pick<PaymentFilters, 'minCents' | 'maxCents'>): string {
  const money = (cents: number) => formatCurrency(fromCents(cents));
  if (minCents !== null && maxCents !== null) {
    return t('payments.amount.between', { min: money(minCents), max: money(maxCents) });
  }
  if (minCents !== null) return t('payments.amount.atLeast', { amount: money(minCents) });
  if (maxCents !== null) return t('payments.amount.atMost', { amount: money(maxCents) });
  return t('payments.search.anyAmount');
}

/** "All accounts", "Card not set", or the card or account's name. */
export function sourceText(source: string | null, labelOf: (id: string) => string | null) {
  if (source === null) return t('payments.search.allAccounts');
  if (source === '') return t('payments.cardNotSet');
  return labelOf(source) ?? t('payments.cardNotSet');
}

/**
 * Date range, Amount and Paid from, each with what it is set to, each opening its own page. At large
 * text a value wraps under its name rather than squeezing it.
 */
export function FilterRows({
  filters,
  labelOf,
  onOpen,
}: {
  filters: PaymentFilters;
  labelOf: (id: string) => string | null;
  onOpen: (filter: FilterKind) => void;
}) {
  const colors = useColors();
  const rows: { kind: FilterKind; label: string; value: string }[] = [
    { kind: 'date', label: t('payments.search.dateRange'), value: rangeText(filters.range) },
    { kind: 'amount', label: t('payments.search.amount'), value: amountText(filters) },
    {
      kind: 'from',
      label: t('payments.search.paidFrom'),
      value: sourceText(filters.source, labelOf),
    },
  ];

  return (
    <SectionCard
      testID="search-filters"
      className="mt-6"
      title={t('payments.search.filters')}
      titleTone="label"
    >
      {rows.map((row) => (
        <Pressable
          key={row.kind}
          accessibilityRole="button"
          accessibilityLabel={`${row.label}, ${row.value}`}
          onPress={withTap(() => onOpen(row.kind))}
          testID={`filter-${row.kind}`}
          className="min-h-[52px] w-full flex-row items-center gap-2 px-[16px] py-[14px] active:bg-ink/5"
        >
          <View className="min-w-0 flex-1 flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <Text
              className="shrink font-app text-[15px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {row.label}
            </Text>
            <Text
              className="shrink font-app text-[14px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {row.value}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
        </Pressable>
      ))}
    </SectionCard>
  );
}
