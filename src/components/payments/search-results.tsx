import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  amountText,
  rangeText,
  sourceText,
  type FilterKind,
} from '@/components/payments/filter-rows';
import { PaymentRow } from '@/components/payments/payment-row';
import { SectionCard } from '@/components/payments/section-card';
import { HistoryNotice } from '@/components/pro/history-notice';
import { PageState } from '@/components/ui/page-state';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { paymentHref, type PaymentEntry } from '@/lib/payment-entries';
import { activeFilterCount, searchGroups, type PaymentFilters } from '@/lib/payment-search';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

type SearchResultsProps = {
  /** Every match, newest first, listed or not: the counts and totals are figures. */
  matches: readonly PaymentEntry[];
  /** Marked in each name it matches. */
  query: string;
  /** Where listed rows start: 90 days back on free. */
  listFloor: string;
  labelOf: (id: string) => string | null;
  /** As they stand: each is offered above the results, with its value once set. */
  filters: PaymentFilters;
  /** A result opened; the page keeps the search before it goes. */
  onOpen: (payment: PaymentEntry) => void;
  /** Opens one filter's page. */
  onFilter: (filter: FilterKind) => void;
  onClearFilters: () => void;
};

/**
 * What a search found: how many and over which years, then each year's matches with its total and
 * count, the two newest years in full and older ones folded into one row that opens them here. On
 * free, matches older than 90 days count but are not listed, and the history notice says why.
 */
export function SearchResults({
  matches,
  query,
  listFloor,
  labelOf,
  filters,
  onOpen,
  onFilter,
  onClearFilters,
}: SearchResultsProps) {
  const colors = useColors();
  const artwork = useArtwork();
  const [expanded, setExpanded] = useState(false);
  const found = searchGroups(matches, listFloor, expanded);
  const sourceOf = (id: string) => (id ? labelOf(id) : null);
  const filtersActive = activeFilterCount(filters) > 0;

  // The filter rows give way to the results, so every filter is changed, or undone, from here.
  const filterLinks = (clear: boolean) => (
    <ResultsFilters
      filters={filters}
      labelOf={labelOf}
      onFilter={onFilter}
      onClearFilters={clear && filtersActive ? onClearFilters : undefined}
    />
  );

  if (!found.span) {
    return (
      <View testID="search-empty" className="w-full">
        {/* The empty page offers Clear filters itself; one button of a name is enough. */}
        {filterLinks(false)}
        <PageState
          art={artwork.noResults}
          title={t('payments.search.nothing')}
          message={t('payments.search.noMatches')}
          actionLabel={filtersActive ? t('payments.search.clearFilters') : undefined}
          onAction={filtersActive ? onClearFilters : undefined}
        />
      </View>
    );
  }

  const { first, last } = found.span;
  const folded = found.folded;

  return (
    <View testID="search-results" className="mb-4 w-full">
      {filterLinks(true)}
      <Text
        className="mt-3 w-full px-[4px] font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {t('payments.search.results', {
          count: found.count,
          span: first === last ? String(last) : t('payments.year.span', { first, last }),
        })}
      </Text>

      {found.groups.map((group) => {
        const total = formatCurrency(group.total);
        return (
          <SectionCard
            key={group.year}
            testID={`results-${group.year}`}
            className="mt-5"
            title={String(group.year)}
            caption={t('payments.search.yearTotal', { amount: total, count: group.count })}
            titleA11y={t('payments.years.rowA11y', {
              year: group.year,
              count: t('payments.count', { count: group.count }),
              amount: total,
            })}
          >
            {group.rows.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                sourceLabel={sourceOf(payment.sourceId)}
                withYear
                highlight={query}
                onOpen={paymentHref(payment) ? () => onOpen(payment) : undefined}
              />
            ))}
          </SectionCard>
        );
      })}

      {folded ? (
        <SectionCard className="mt-5">
          <Pressable
            accessibilityRole="button"
            onPress={withTap(() => setExpanded(true))}
            testID="results-folded"
            className="min-h-[52px] w-full flex-row items-center justify-between gap-3 px-[16px] py-[16px] active:bg-ink/5"
          >
            <Text
              className="shrink font-app-medium text-[15px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {folded.newest === folded.oldest
                ? t('payments.search.moreOneYear', { year: folded.newest, count: folded.count })
                : t('payments.search.more', {
                    newest: folded.newest,
                    oldest: folded.oldest,
                    count: folded.count,
                  })}
            </Text>
            <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
          </Pressable>
        </SectionCard>
      ) : null}

      {found.hiddenOlder ? <HistoryNotice className="mt-5" /> : null}

      <Text
        className="mt-5 w-full text-center font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {t('payments.search.noMatches')}
      </Text>
    </View>
  );
}

/**
 * Date range, Amount and Paid from as small links on the page, each with its value once set ("Amount:
 * $10.00 or more"), then Clear filters when any is set. On the page, not a card: accent-ink holds
 * its 4.5:1 there.
 */
function ResultsFilters({
  filters,
  labelOf,
  onFilter,
  onClearFilters,
}: {
  filters: PaymentFilters;
  labelOf: (id: string) => string | null;
  onFilter: (filter: FilterKind) => void;
  onClearFilters?: () => void;
}) {
  const links: { kind: FilterKind; label: string; value: string | null; testID: string }[] = [
    {
      kind: 'date',
      label: t('payments.search.dateRange'),
      value: filters.range !== 'any' ? rangeText(filters.range) : null,
      testID: 'results-date-range',
    },
    {
      kind: 'amount',
      label: t('payments.search.amount'),
      value: filters.minCents !== null || filters.maxCents !== null ? amountText(filters) : null,
      testID: 'results-amount',
    },
    {
      kind: 'from',
      label: t('payments.search.paidFrom'),
      value: filters.source !== null ? sourceText(filters.source, labelOf) : null,
      testID: 'results-paid-from',
    },
  ];

  return (
    <View
      testID="results-filters"
      className="mt-4 w-full flex-row flex-wrap items-baseline gap-x-4 gap-y-2 px-[4px]"
    >
      {links.map((link) => (
        <ResultsLink
          key={link.kind}
          label={
            link.value
              ? t('payments.search.filterSet', { filter: link.label, value: link.value })
              : link.label
          }
          onPress={() => onFilter(link.kind)}
          testID={link.testID}
        />
      ))}
      {onClearFilters ? (
        <ResultsLink
          label={t('payments.search.clearFilters')}
          onPress={onClearFilters}
          testID="results-clear-filters"
        />
      ) : null}
    </View>
  );
}

function ResultsLink({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={withTap(onPress)}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      testID={testID}
      className="active:opacity-60"
    >
      <Text
        className="font-app-semibold text-[14px] text-accent-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {label}
      </Text>
    </Pressable>
  );
}
