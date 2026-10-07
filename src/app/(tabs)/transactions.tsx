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
import { usePaymentSources, useLedger, type LedgerEntry } from '@/api/queries';
import { useCharges } from '@/api/charges';
import { useRefreshAll } from '@/api/refresh';
import { PageState } from '@/components/ui/page-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { ChoiceChips } from '@/components/ui/choice-chips';
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

import { matchesSearch } from '@/lib/search';
import { useToday } from '@/lib/use-today';
import { chargeOwners, ledgerHref } from '@/lib/ledger-link';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';
import { FAILURE_MESSAGE } from '@/lib/failure';

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

  // Fixed period edges, not a window measured from today, so two people comparing a week see the
  // same days.
  const [periodKey, setPeriodKey] = useState<PeriodKey>('week');
  const [anchor, setAnchor] = useState(() => new Date());

  const { today, todayDate } = useToday();

  const atLatest = isLatestPeriod(periodKey, anchor, todayDate);
  const atEarliest = isEarliestPeriod(periodKey, anchor, todayDate);

  // The period cut off at today: this page records what happened. Future days live on the dashboard
  // under Coming up.
  const range = useMemo(() => {
    const period = periodRange(periodKey, anchor);
    return { from: period.from, to: period.to > today ? today : period.to };
  }, [periodKey, anchor, today]);

  const { entries: ledger, totals, isLoading, isError, refetch } = useLedger(range, today);
  const { refresh, refreshing } = useRefreshAll();
  const { sources } = usePaymentSources();

  // Which plan each recorded charge came from, so a past row opens its bill or subscription. A
  // recorded occurrence carries only the charge id; the ledger reads the same query (no extra
  // fetch).
  const charges = useCharges();
  const owners = useMemo(() => chargeOwners(charges.data ?? []), [charges.data]);

  /** The row's handler, or undefined when the row opens nothing. */
  const openEntry = (entry: LedgerEntry) => {
    const href = ledgerHref(entry, owners);
    return href ? () => router.push(href) : undefined;
  };

  const activeCount = countActiveFilters(filters);

  const sourceOptions = useMemo(
    () => sources.map((source) => ({ value: source.id, label: source.label })),
    [sources],
  );
  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const buckets = useMemo(() => periodBuckets(periodKey, anchor), [periodKey, anchor]);

  const matching = useMemo(() => {
    return ledger.filter((entry) => {
      if (!matchesSearch(entry.label, query)) return false;
      if (filters.date && entry.date !== filters.date) return false;
      if (filters.sourceIds.length > 0 && !filters.sourceIds.includes(entry.sourceId)) return false;
      if (filters.kinds.length > 0 && !filters.kinds.includes(entry.kind)) return false;
      return true;
    });
  }, [ledger, query, filters]);

  // Newest first, empty buckets dropped. `periodBuckets` is oldest-first, so buckets are reversed
  // and rows within a bucket sorted descending; same-day rows tiebreak on id.
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
    <Screen title="Transactions" avoidKeyboard onRefresh={refresh} refreshing={refreshing}>
      <View className="mt-5 w-full">
        <ChoiceChips
          options={PERIODS}
          value={periodKey}
          onChange={(key) => {
            setPeriodKey(key);
            // Stepped periods keep your place; "all" always ends now, so it resets the anchor.
            if (key === 'all') setAnchor(new Date());
          }}
        />
      </View>

      <View className="mt-4 w-full flex-row items-center justify-between rounded-[16px] border border-line bg-card px-2 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Earlier"
          accessibilityState={{ disabled: atEarliest }}
          disabled={atEarliest}
          onPress={() => setAnchor((current) => stepPeriod(periodKey, current, -1))}
          hitSlop={8}
          className={
            atEarliest
              ? 'h-10 w-10 items-center justify-center rounded-full opacity-30'
              : 'h-10 w-10 items-center justify-center rounded-full active:bg-ink/5'
          }
        >
          <ChevronLeft size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>

        <Text
          className="flex-1 text-center font-app-semibold text-[15px] text-ink"
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
          hitSlop={8}
          className={
            atLatest
              ? 'h-10 w-10 items-center justify-center rounded-full opacity-30'
              : 'h-10 w-10 items-center justify-center rounded-full active:bg-ink/5'
          }
        >
          <ChevronRight size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>

      {!isLoading && !isError ? (
        <View className="mt-4 w-full">
          <LedgerSummary totals={totals} />
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
          className="h-11 w-11 items-center justify-center rounded-full bg-ink/5 active:bg-ink/10"
        >
          <SlidersHorizontal size={20} color={colors.ink} strokeWidth={1.8} />
          {activeCount > 0 ? (
            <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1">
              <Text
                allowFontScaling={false}
                className="font-app-medium text-[11px] text-on-control"
              >
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
          title={FAILURE_MESSAGE}
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
                    className="font-app-medium text-[13px] uppercase tracking-wide text-muted"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {group.label}
                  </Text>
                  <Text
                    className="font-app text-[13px] text-muted"
                    style={{ color: moneyColor(group.total) }}
                    maxFontSizeMultiplier={1.3}
                  >
                    {formatCurrency(group.total)}
                  </Text>
                </View>
              )}

              {group.entries.map((entry) => (
                <LedgerRow
                  key={entry.id}
                  entry={entry}
                  sourceLabel={sourceLabels.get(entry.sourceId) ?? ''}
                  kindLabel={KIND_LABELS[entry.kind] ?? entry.kind}
                  onPress={openEntry(entry)}
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
