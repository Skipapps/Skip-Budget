import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  EMPTY_FILTERS,
  FilterSheet,
  countActiveFilters,
  ledgerKindLabel,
  type LedgerFilters,
} from '@/components/transactions/filter-sheet';
import { useArtwork } from '@/theme/artwork';
import { LedgerRow } from '@/components/transactions/ledger-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { usePaymentSources, useLedger, type LedgerEntry } from '@/api/queries';
import { hidOlder } from '@/lib/allowance';
import { useCharges } from '@/api/charges';
import { useHistoryFloor } from '@/api/history';
import { HistoryNotice } from '@/components/pro/history-notice';
import { useRefreshAll } from '@/api/refresh';
import { PageState } from '@/components/ui/page-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { LedgerSummary } from '@/components/transactions/ledger-summary';
import { t } from '@/i18n';
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
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

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
  // Free lists 90 days back, Pro seven years; stepping stops where the plan's list does.
  const { floor } = useHistoryFloor();

  const atLatest = isLatestPeriod(periodKey, anchor, todayDate);
  const atEarliest = isEarliestPeriod(periodKey, anchor, todayDate, floor);

  // The period cut off at today: this page records what happened. Future days live on the dashboard
  // under Coming up.
  const range = useMemo(() => {
    const period = periodRange(periodKey, anchor);
    return { from: period.from, to: period.to > today ? today : period.to };
  }, [periodKey, anchor, today]);

  const {
    entries: ledger,
    allEntries,
    totals,
    hidden,
    isLoading,
    isError,
    refetch,
  } = useLedger(range, today);
  const hiddenOlder = hidOlder(hidden);
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

  const keeps = useCallback(
    (entry: LedgerEntry) => {
      if (!matchesSearch(entry.label, query)) return false;
      if (filters.date && entry.date !== filters.date) return false;
      if (filters.sourceIds.length > 0 && !filters.sourceIds.includes(entry.sourceId)) return false;
      if (filters.kinds.length > 0 && !filters.kinds.includes(entry.kind)) return false;
      return true;
    },
    [query, filters],
  );
  const matching = useMemo(() => ledger.filter(keeps), [ledger, keeps]);
  // A group's total is the whole group's, as Pro sees it, even where a free list starts mid-group.
  const matchingAll = useMemo(() => allEntries.filter(keeps), [allEntries, keeps]);

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
            total: matchingAll
              .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
              .reduce((sum, entry) => sum + entry.amount, 0),
          };
        })
        .filter((bucket) => bucket.entries.length > 0)
        .reverse(),
    [buckets, matching, matchingAll],
  );

  return (
    <Screen
      title={t('transactions.title')}
      avoidKeyboard
      onRefresh={refresh}
      refreshing={refreshing}
    >
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
          accessibilityLabel={t('transactions.earlier')}
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
          className="min-w-0 flex-1 text-center font-app-semibold text-[15px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {periodLabel(periodKey, anchor)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('transactions.later')}
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
        <SearchField value={query} onChangeText={setQuery} placeholder={t('transactions.search')} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activeCount > 0
              ? t('transactions.filtersActive', { count: activeCount })
              : t('transactions.filterButton')
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
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && ledger.length === 0 && !hiddenOlder ? (
        <PageState
          art={artwork.emptyWallet}
          title={t('transactions.emptyTitle')}
          message={t('transactions.emptyMessage')}
          actionLabel={t('transactions.addReceipt')}
          onAction={() => router.push('/add-receipt')}
        />
      ) : null}

      {!isLoading && !isError && ledger.length > 0 && groups.length === 0 ? (
        <PageState
          art={artwork.noResults}
          title={t('transactions.noMatchTitle')}
          message={t('transactions.noMatchMessage')}
          actionLabel={t('transactions.clearFilters')}
          onAction={() => {
            setQuery('');
            setFilters(EMPTY_FILTERS);
          }}
        />
      ) : null}

      {!isLoading && !isError && ledger.length === 0 && hiddenOlder ? (
        <View className="mt-5 w-full pb-24">
          <HistoryNotice />
        </View>
      ) : null}

      {!isLoading && !isError && groups.length > 0 ? (
        <View className="mt-2 w-full pb-24">
          {groups.map((group) => (
            <View key={group.key} className="w-full">
              {group.from === group.to ? (
                <DateGroupHeader date={group.from} today={today} total={group.total} />
              ) : (
                // As DateGroupHeader: the total moves under the name when both do not fit.
                <View className="w-full flex-row flex-wrap items-center justify-between gap-x-3 bg-surface pb-1.5 pt-4">
                  <Text
                    className="shrink font-app-medium text-[13px] uppercase tracking-wide text-muted"
                    maxFontSizeMultiplier={TEXT_CAP.heading}
                  >
                    {group.label}
                  </Text>
                  <Text
                    className="font-app text-[13px] text-muted"
                    style={{ color: moneyColor(group.total) }}
                    maxFontSizeMultiplier={TEXT_CAP.heading}
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
                  kindLabel={ledgerKindLabel(entry.kind)}
                  onPress={openEntry(entry)}
                />
              ))}
            </View>
          ))}
          {/* Newest first, so the list ends where the plan's window does. */}
          {hiddenOlder ? <HistoryNotice className="mt-5" /> : null}
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
