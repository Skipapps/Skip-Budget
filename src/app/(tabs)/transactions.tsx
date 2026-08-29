import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  EMPTY_FILTERS,
  FilterSheet,
  countActiveFilters,
  type LedgerFilters,
} from '@/components/transactions/filter-sheet';
import { useArtwork } from '@/theme/artwork';
import { LedgerRow } from '@/components/transactions/ledger-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Title } from '@/components/ui/typography';
import { usePaymentSources, useLedger } from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { PageState } from '@/components/ui/page-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FlowChart, type FlowBucket } from '@/components/transactions/flow-chart';
import { LedgerSummary } from '@/components/transactions/ledger-summary';
import { TRANSACTION_KINDS } from '@/data/transactions-mock';
import {
  PERIODS,
  isEarliestPeriod,
  isLatestPeriod,
  periodBuckets,
  periodLabel,
  periodRange,
  stepPeriod,
  type PeriodKey,
} from '@/lib/period';

import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

const KIND_LABELS = Object.fromEntries(
  TRANSACTION_KINDS.map((kind) => [kind.value, kind.label]),
) as Record<string, string>;

export default function TransactionsScreen() {
  const artwork = useArtwork();
  const colors = useColors();
  const moneyColor = useMoneyColor();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // Weeks by default. Fixed edges, not a window measured from today: a ledger
  // answers "what did that week cost", and two people comparing notes on the
  // same week have to be looking at the same days.
  const [periodKey, setPeriodKey] = useState<PeriodKey>('week');
  const [anchor, setAnchor] = useState(() => new Date());

  const todayDate = useMemo(() => new Date(), []);
  const today = toIsoDate(todayDate);

  const atLatest = isLatestPeriod(periodKey, anchor, todayDate);
  const atEarliest = isEarliestPeriod(periodKey, anchor, todayDate);

  /**
   * The period, cut off at today.
   *
   * This page is a record of what happened, so it never reaches past the
   * present. Looking at this month in the middle of it shows the days that
   * have been, not a projection of the ones still to come — those live on the
   * dashboard under Coming up, where they are labelled as still to happen.
   */
  const range = useMemo(() => {
    const period = periodRange(periodKey, anchor);
    return { from: period.from, to: period.to > today ? today : period.to };
  }, [periodKey, anchor, today]);

  const { entries: ledger, totals, isLoading, isError, refetch } = useLedger(range, today);
  const { refresh, refreshing } = useRefreshAll();
  const { sources } = usePaymentSources();

  const activeCount = countActiveFilters(filters);

  const sourceOptions = useMemo(
    () => sources.map((source) => ({ value: source.id, label: source.label })),
    [sources],
  );
  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  /**
   * The period's divisions, used twice.
   *
   * The same buckets draw the chart and head the list, so a bar and the run of
   * rows under it are guaranteed to be the same slice of time. Deriving them
   * separately is how a chart and a list quietly stop agreeing.
   */
  const buckets = useMemo(() => periodBuckets(periodKey, anchor), [periodKey, anchor]);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ledger.filter((entry) => {
      if (needle && !entry.label.toLowerCase().includes(needle)) return false;
      if (filters.date && entry.date !== filters.date) return false;
      if (filters.sourceIds.length > 0 && !filters.sourceIds.includes(entry.sourceId)) return false;
      if (filters.kinds.length > 0 && !filters.kinds.includes(entry.kind)) return false;
      return true;
    });
  }, [ledger, query, filters]);

  // Spending only. Income still counts in the totals above and appears in the
  // list below; it is left off the chart so every bar measures one thing.
  const chartBuckets = useMemo<FlowBucket[]>(
    () =>
      buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        spent: matching
          .filter(
            (entry) => entry.amount < 0 && entry.date >= bucket.from && entry.date <= bucket.to,
          )
          .reduce((sum, entry) => sum + Math.abs(entry.amount), 0),
      })),
    [buckets, matching],
  );

  /** Newest first, and empty buckets dropped — a heading over nothing is noise. */
  const groups = useMemo(
    () =>
      buckets
        .map((bucket) => {
          const entries = matching
            .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
            .sort((a, b) =>
              a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date),
            );
          return {
            ...bucket,
            entries,
            total: entries.reduce((sum, entry) => sum + entry.amount, 0),
          };
        })
        .filter((bucket) => bucket.entries.length > 0)
        .reverse(),
    [buckets, matching],
  );

  return (
    <Screen avoidKeyboard onRefresh={refresh} refreshing={refreshing}>
      <Title className="mt-2">Transactions</Title>

      <View className="mt-5 w-full">
        <ChoiceChips
          options={PERIODS}
          value={periodKey}
          onChange={(key) => {
            setPeriodKey(key);
            // Switching between the stepped periods keeps your place, which is
            // the point of them. "All" is not stepped and always ends now, so
            // arriving from a browse of 2023 has to come back to the present.
            if (key === 'all') setAnchor(new Date());
          }}
        />
      </View>

      {/* The window itself, and the way through it. Forward stops at the
          period holding today; back stops where the kept history ends. */}
      <View className="mt-4 w-full flex-row items-center justify-between rounded-[10px] border border-line px-1.5 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Earlier"
          accessibilityState={{ disabled: atEarliest }}
          disabled={atEarliest}
          onPress={() => setAnchor((current) => stepPeriod(periodKey, current, -1))}
          className={
            atEarliest
              ? 'h-10 w-10 items-center justify-center rounded-[8px] opacity-30'
              : 'h-10 w-10 items-center justify-center rounded-[8px] active:bg-ink/5'
          }
        >
          <ChevronLeft size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>

        <Text
          className="flex-1 text-center font-poppins-semibold text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {periodLabel(periodKey, anchor)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Later"
          accessibilityState={{ disabled: atLatest }}
          disabled={atLatest}
          onPress={() => setAnchor((current) => stepPeriod(periodKey, current, 1))}
          className={
            atLatest
              ? 'h-10 w-10 items-center justify-center rounded-[8px] opacity-30'
              : 'h-10 w-10 items-center justify-center rounded-[8px] active:bg-ink/5'
          }
        >
          <ChevronRight size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>

      {!isLoading && !isError ? (
        <View className="mt-4 w-full gap-4">
          <LedgerSummary totals={totals} />
          {/* The chart earns its space only once there is more than one slot to
              compare; a single day is a number, not a shape. */}
          {chartBuckets.length > 1 ? <FlowChart buckets={chartBuckets} /> : null}
        </View>
      ) : null}

      <View className="mt-5 w-full flex-row items-center gap-3">
        <SearchField value={query} onChangeText={setQuery} placeholder="Search transactions" />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activeCount > 0 ? `Filters, ${activeCount} active` : 'Filter transactions'
          }
          onPress={() => setFilterOpen(true)}
          className="min-h-12 w-12 items-center justify-center rounded-[10px] border border-line active:bg-ink/5"
        >
          <SlidersHorizontal size={20} color={colors.ink} strokeWidth={2} />
          {activeCount > 0 ? (
            <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1">
              <Text allowFontScaling={false} className="font-poppins-medium text-[11px] text-ink">
                {activeCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {isLoading ? <SkeletonList rows={7} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title="Could not load your transactions"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && ledger.length === 0 ? (
        <PageState
          art={artwork.emptyWallet}
          title="Nothing here yet"
          message="Receipts, bills and subscriptions all show up here together once you add a few."
          actionLabel="Add a receipt"
          onAction={() => router.push('/add-receipt')}
        />
      ) : null}

      {!isLoading && !isError && ledger.length > 0 && groups.length === 0 ? (
        <PageState
          art={artwork.noResults}
          title="Nothing matches"
          message="No transaction fits that search and those filters."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setFilters(EMPTY_FILTERS);
          }}
        />
      ) : null}

      {!isLoading && !isError && groups.length > 0 ? (
        <View className="mt-2 w-full pb-24">
          {groups.map((group) => (
            <View key={group.key} className="w-full">
              {group.from === group.to ? (
                <DateGroupHeader date={group.from} today={today} total={group.total} />
              ) : (
                <View className="w-full flex-row items-center justify-between gap-3 bg-surface pb-1.5 pt-4">
                  <Text
                    className="font-poppins-medium text-[13px] uppercase tracking-wide text-muted"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {group.label}
                  </Text>
                  <Text
                    className="font-poppins text-[13px]"
                    style={{ color: moneyColor(group.total) }}
                    maxFontSizeMultiplier={1.3}
                  >
                    {formatCurrency(group.total)}
                  </Text>
                </View>
              )}

              <View className="mt-1 h-px w-full bg-line" />

              {group.entries.map((entry) => (
                <LedgerRow
                  key={entry.id}
                  entry={entry}
                  sourceLabel={sourceLabels.get(entry.sourceId) ?? ''}
                  kindLabel={KIND_LABELS[entry.kind] ?? entry.kind}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {filterOpen ? (
        <FilterSheet
          filters={filters}
          sourceOptions={sourceOptions}
          onCancel={() => setFilterOpen(false)}
          onApply={(next) => {
            setFilters(next);
            setFilterOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
