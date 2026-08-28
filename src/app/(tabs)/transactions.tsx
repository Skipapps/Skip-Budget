import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  EMPTY_FILTERS,
  FilterSheet,
  countActiveFilters,
  type LedgerFilters,
} from '@/components/transactions/filter-sheet';
import { LedgerRow } from '@/components/transactions/ledger-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Title } from '@/components/ui/typography';
import { usePaymentSources, useLedger, type LedgerEntry } from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { PageState } from '@/components/ui/page-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FlowChart, type FlowBucket } from '@/components/transactions/flow-chart';
import { LedgerSummary } from '@/components/transactions/ledger-summary';
import { TRANSACTION_KINDS } from '@/data/transactions-mock';
import { RANGES, bucketFor, bucketKey, bucketsIn, rangeFor, type RangeKey } from '@/lib/range';

import EmptyArt from '@/assets/illustrations/state-empty-wallet.svg';
import ErrorArt from '@/assets/illustrations/state-error.svg';
import NoResultsArt from '@/assets/illustrations/state-no-results.svg';
import { MONTHS_SHORT, toIsoDate } from '@/lib/date';
import { colors } from '@/theme/colors';

const KIND_LABELS = Object.fromEntries(
  TRANSACTION_KINDS.map((kind) => [kind.value, kind.label]),
) as Record<string, string>;

export default function TransactionsScreen() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // Today by default: opening the app should answer "what is happening now",
  // not hand over a year of rows to scroll.
  const [rangeKey, setRangeKey] = useState<RangeKey>('today');
  const today = toIsoDate(new Date());

  const activeCount = countActiveFilters(filters);
  const range = useMemo(() => rangeFor(rangeKey, new Date()), [rangeKey]);

  const { entries: ledger, totals, isLoading, isError, refetch } = useLedger(range);
  const { refresh, refreshing } = useRefreshAll();
  const { sources } = usePaymentSources();

  const sourceOptions = useMemo(
    () => sources.map((source) => ({ value: source.id, label: source.label })),
    [sources],
  );
  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const buckets = useMemo<FlowBucket[]>(() => {
    const size = bucketFor(rangeKey);
    const keys = bucketsIn(range, size);
    const empty = new Map(keys.map((key) => [key, { out: 0, in: 0 }]));

    for (const entry of ledger) {
      const slot = empty.get(bucketKey(entry.date, size));
      if (!slot) continue;
      if (entry.amount < 0) slot.out += Math.abs(entry.amount);
      else slot.in += entry.amount;
    }

    return keys.map((key) => {
      const [, month, day] = key.split('-');
      return {
        key,
        // Months get their number, days get theirs — enough to orient without
        // crowding a twelve-slot axis.
        label: size === 'month' ? MONTHS_SHORT[Number(month) - 1] : String(Number(day)),
        out: empty.get(key)!.out,
        in: empty.get(key)!.in,
      };
    });
  }, [ledger, range, rangeKey]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matching = ledger.filter((entry) => {
      if (needle && !entry.label.toLowerCase().includes(needle)) return false;
      if (filters.date && entry.date !== filters.date) return false;
      if (filters.sourceIds.length > 0 && !filters.sourceIds.includes(entry.sourceId)) return false;
      if (filters.kinds.length > 0 && !filters.kinds.includes(entry.kind)) return false;
      return true;
    });

    // Group by day, newest first, preserving that order in the output.
    const byDate = new Map<string, LedgerEntry[]>();
    for (const entry of matching) {
      const bucket = byDate.get(entry.date);
      if (bucket) bucket.push(entry);
      else byDate.set(entry.date, [entry]);
    }

    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({
        date,
        entries,
        total: entries.reduce((sum, entry) => sum + entry.amount, 0),
      }));
  }, [ledger, query, filters]);

  return (
    <Screen avoidKeyboard onRefresh={refresh} refreshing={refreshing}>
      <Title className="mt-2">Transactions</Title>

      <View className="mt-5 w-full">
        <ChoiceChips options={RANGES} value={rangeKey} onChange={setRangeKey} />
      </View>

      {!isLoading && !isError ? (
        <View className="mt-4 w-full gap-4">
          <LedgerSummary totals={totals} />
          {/* The chart earns its space only once there is more than one slot to
              compare; a single day is a number, not a shape. */}
          {buckets.length > 1 ? <FlowChart buckets={buckets} /> : null}
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
          className="min-h-12 w-12 items-center justify-center rounded-[10px] border border-line active:bg-black/5"
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
          art={ErrorArt}
          title="Could not load your transactions"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && ledger.length === 0 ? (
        <PageState
          art={EmptyArt}
          title="Nothing here yet"
          message="Receipts, bills and subscriptions all show up here together once you add a few."
          actionLabel="Add a receipt"
          onAction={() => router.push('/add-receipt')}
        />
      ) : null}

      {!isLoading && !isError && ledger.length > 0 && groups.length === 0 ? (
        <PageState
          art={NoResultsArt}
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
            <View key={group.date} className="w-full">
              {/* The same heading the receipts, bills and subscriptions lists
                  use, so a day reads identically wherever it appears. */}
              <DateGroupHeader date={group.date} today={today} total={group.total} />

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
