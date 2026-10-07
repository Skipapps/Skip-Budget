import { router } from 'expo-router';
import { Plus, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  BillFilterSheet,
  EMPTY_BILL_FILTERS,
  countActiveBillFilters,
  type BillFilters,
} from '@/components/bills/bill-filter-sheet';
import { useArtwork } from '@/theme/artwork';
import { BillRow, billCategoryLabel } from '@/components/bills/bill-row';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { PageState } from '@/components/ui/page-state';
import { SkeletonList } from '@/components/ui/skeleton';

import { usePaymentSources, useBills } from '@/api/queries';
import { getBillCategory } from '@/data/bills-mock';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { t } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { groupByDate } from '@/lib/group';
import { logoDomainOf } from '@/lib/logo-domain';
import { formatCurrency } from '@/lib/format';
import { matchesSearch } from '@/lib/search';
import { useColors } from '@/providers/theme-provider';
import { failureText } from '@/lib/failure';

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
        // Next due, not this month's date: this page is the schedule itself.
        dueDate: row.next_due_on ?? '',
        domain: logoDomainOf(row),
        recurrence: row.recurrence,
        categoryId: row.category_id,
        iconId: row.icon_id ?? undefined,
        sourceId: row.card_id ?? row.bank_account_id ?? '',
      })),
    [query.data],
  );

  const visible = useMemo(() => {
    return bills.filter((bill) => {
      // The name read on screen is the one searched for.
      const category = billCategoryLabel(
        bill.categoryId,
        getBillCategory(bill.categoryId)?.label ?? '',
      );
      if (!matchesSearch(`${bill.name} ${category}`, queryText)) return false;
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
    <Screen
      title={t('bills.plans.title')}
      showBack
      avoidKeyboard
      headerActions={[
        { icon: Plus, label: t('bills.addBill'), onPress: () => router.push('/add-bill') },
      ]}
    >
      {showEmpty || query.isError ? null : (
        <>
          <View className="mt-5 w-full flex-row items-center gap-3">
            <SearchField
              value={queryText}
              onChangeText={setQuery}
              placeholder={t('bills.plans.search')}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                activeCount > 0
                  ? t('bills.plans.filtersActive', { count: activeCount })
                  : t('bills.filter.title')
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

          <View className="mt-5 w-full flex-row items-center justify-between">
            <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              {query.isPending
                ? t('bills.plans.loading')
                : narrowed
                  ? t('bills.plans.countOf', { shown: visible.length, count: bills.length })
                  : t('bills.plans.count', { count: bills.length })}
            </Text>
            <Text className="font-app-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
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
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => query.refetch()}
        />
      ) : null}

      {showEmpty ? (
        <PageState
          art={artwork.emptyBills}
          title={t('bills.noBillsYet')}
          message={t('bills.plans.emptyMessage')}
          actionLabel={t('bills.addABill')}
          onAction={() => router.push('/add-bill')}
        />
      ) : null}

      {showNoMatches ? (
        <PageState
          art={artwork.noResults}
          title={t('bills.plans.noMatchTitle')}
          message={t('bills.plans.noMatchMessage')}
          actionLabel={t('bills.plans.clearFilters')}
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
                  onPress={() => router.push(`/bill/${bill.id}`)}
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
