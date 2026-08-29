import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  BillFilterSheet,
  EMPTY_BILL_FILTERS,
  countActiveBillFilters,
  type BillFilters,
} from '@/components/bills/bill-filter-sheet';
import { useArtwork } from '@/theme/artwork';
import { BillRow } from '@/components/bills/bill-row';
import { ActionPill } from '@/components/ui/action-pill';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { PageState } from '@/components/ui/page-state';
import { SkeletonList } from '@/components/ui/skeleton';
import { Title } from '@/components/ui/typography';

import { usePaymentSources, useBills } from '@/api/queries';
import { getBillCategory } from '@/data/bills-mock';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { toIsoDate } from '@/lib/date';
import { groupByDate } from '@/lib/group';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';

export default function BillPlansScreen() {
  const artwork = useArtwork();
  const colors = useColors();
  const [queryText, setQuery] = useState('');
  const [filters, setFilters] = useState<BillFilters>(EMPTY_BILL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeCount = countActiveBillFilters(filters);
  const today = toIsoDate(new Date());
  const query = useBills();
  const { sources } = usePaymentSources();

  const sourceOptions = useMemo(
    () => sources.map((source) => ({ value: source.id, label: source.label })),
    [sources],
  );
  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  // The DB stores positive magnitudes; the UI shows outgoings as negative.
  const bills = useMemo(
    () =>
      (query.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        amount: -row.amount,
        // Next due, not this month's date: this page is the schedule itself,
        // and what it has to answer is "when does this land again".
        dueDate: row.next_due_on ?? '',
        recurrence: row.recurrence,
        categoryId: row.category_id,
        iconId: row.icon_id ?? undefined,
        sourceId: row.card_id ?? row.bank_account_id ?? '',
      })),
    [query.data],
  );

  const visible = useMemo(() => {
    const needle = queryText.trim().toLowerCase();

    return bills.filter((bill) => {
      if (needle) {
        const category = getBillCategory(bill.categoryId)?.label ?? '';
        const haystack = `${bill.name} ${category}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(bill.categoryId)) {
        return false;
      }
      if (filters.sourceIds.length > 0 && !filters.sourceIds.includes(bill.sourceId)) return false;
      if (filters.recurrences.length > 0 && !filters.recurrences.includes(bill.recurrence)) {
        return false;
      }
      return true;
    });
  }, [bills, queryText, filters]);

  // Reflects what is on screen, so it always agrees with the rows below it.
  const total = visible.reduce((sum, bill) => sum + bill.amount, 0);

  // Soonest first: a bill list is about what is coming, not what has gone.
  const groups = useMemo(
    () =>
      groupByDate(visible, (bill) => bill.dueDate, {
        amountOf: (bill) => bill.amount,
        direction: 'asc',
      }),
    [visible],
  );

  const narrowed = queryText.trim().length > 0 || activeCount > 0;
  const showEmpty = !query.isPending && !query.isError && bills.length === 0;
  const showNoMatches =
    !query.isPending && !query.isError && bills.length > 0 && visible.length === 0;

  return (
    <Screen showBack avoidKeyboard>
      <View className="mt-2 w-full flex-row items-center justify-between gap-3">
        <Title align="left" className="flex-1">
          Your bills
        </Title>

        <ActionPill label="Add bill" onPress={() => router.push('/add-bill')} />
      </View>

      {showEmpty || query.isError ? null : (
        <>
          <View className="mt-5 w-full flex-row items-center gap-3">
            <SearchField value={queryText} onChangeText={setQuery} placeholder="Search bills" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                activeCount > 0 ? `Filters, ${activeCount} active` : 'Filter bills'
              }
              onPress={() => setFilterOpen(true)}
              className="min-h-12 w-12 items-center justify-center rounded-[10px] border border-line active:bg-ink/5"
            >
              <SlidersHorizontal size={20} color={colors.ink} strokeWidth={2} />
              {activeCount > 0 ? (
                <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1">
                  <Text
                    allowFontScaling={false}
                    className="font-poppins-medium text-[11px] text-on-control"
                  >
                    {activeCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <View className="mt-5 w-full flex-row items-center justify-between">
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              {query.isPending
                ? 'Loading'
                : narrowed
                  ? `${visible.length} of ${bills.length} bills`
                  : `${bills.length} ${bills.length === 1 ? 'bill' : 'bills'}`}
            </Text>
            <Text
              className="font-poppins-semibold text-[15px] text-ink"
              maxFontSizeMultiplier={1.3}
            >
              {formatCurrency(total)}
            </Text>
          </View>

          <View className="mt-1 h-px w-full bg-line" />
        </>
      )}

      {query.isPending ? <SkeletonList rows={6} /> : null}

      {query.isError ? (
        <PageState
          art={artwork.error}
          title="Could not load your bills"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      ) : null}

      {showEmpty ? (
        <PageState
          art={artwork.emptyBills}
          title="No bills yet"
          message="Add the ones that repeat — rent, power, phone — and Skip will keep track of what is due."
          actionLabel="Add a bill"
          onAction={() => router.push('/add-bill')}
        />
      ) : null}

      {showNoMatches ? (
        <PageState
          art={artwork.noResults}
          title="Nothing matches"
          message="No bill fits that search and those filters. Try a different name or clear what you have set."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setFilters(EMPTY_BILL_FILTERS);
          }}
        />
      ) : null}

      {!query.isPending && !query.isError && visible.length > 0 ? (
        <View className="w-full pb-10">
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  sourceLabel={sourceLabels.get(bill.sourceId) ?? ''}
                  onPress={() => router.push(`/add-bill?id=${bill.id}`)}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {filterOpen ? (
        <BillFilterSheet
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
