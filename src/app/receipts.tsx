import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePaymentSources, useReceipts } from '@/api/queries';
import {
  EMPTY_RECEIPT_FILTERS,
  ReceiptFilterSheet,
  countActiveReceiptFilters,
  type ReceiptFilters,
} from '@/components/receipts/receipt-filter-sheet';
import { ReceiptRow } from '@/components/receipts/receipt-row';
import { ActionPill } from '@/components/ui/action-pill';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonList } from '@/components/ui/skeleton';
import { Title } from '@/components/ui/typography';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';

import EmptyArt from '@/assets/illustrations/state-empty-receipts.svg';
import ErrorArt from '@/assets/illustrations/state-error.svg';
import NoResultsArt from '@/assets/illustrations/state-no-results.svg';

export default function ReceiptsScreen() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ReceiptFilters>(EMPTY_RECEIPT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: receipts = [], isLoading, isError, refetch } = useReceipts();
  const { sources } = usePaymentSources();

  const activeCount = countActiveReceiptFilters(filters);
  const sourceOptions = useMemo(
    () => sources.map((source) => ({ value: source.id, label: source.label })),
    [sources],
  );
  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return receipts.filter((receipt) => {
      if (needle && !receipt.merchant.toLowerCase().includes(needle)) return false;
      if (filters.date && receipt.purchased_on !== filters.date) return false;
      if (filters.sourceIds.length > 0) {
        const sourceId = receipt.card_id ?? receipt.bank_account_id;
        if (!sourceId || !filters.sourceIds.includes(sourceId)) return false;
      }
      return true;
    });
  }, [receipts, query, filters]);

  // Reflects what is on screen, so it always agrees with the rows below it.
  const total = visible.reduce((sum, receipt) => sum - Math.abs(receipt.amount), 0);

  const narrowed = query.trim().length > 0 || activeCount > 0;
  // A list that has never had anything needs a different answer from one that
  // has simply been filtered down to nothing.
  const showEmpty = !isLoading && !isError && receipts.length === 0;
  const showNoMatches = !isLoading && !isError && receipts.length > 0 && visible.length === 0;

  return (
    <Screen showBack avoidKeyboard>
      <View className="mt-2 w-full flex-row items-center justify-between gap-3">
        <Title align="left" className="flex-1">
          Receipts
        </Title>
        <ActionPill label="Add receipt" onPress={() => router.push('/add-receipt')} />
      </View>

      {/* The search and filter controls are pointless before anything exists,
          and their presence makes an empty list look like a failed search. */}
      {showEmpty || isError ? null : (
        <>
          <View className="mt-5 w-full flex-row items-center gap-3">
            <SearchField value={query} onChangeText={setQuery} placeholder="Search receipts" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                activeCount > 0 ? `Filters, ${activeCount} active` : 'Filter receipts'
              }
              onPress={() => setFilterOpen(true)}
              className="min-h-12 w-12 items-center justify-center rounded-[10px] border border-line active:bg-black/5"
            >
              <SlidersHorizontal size={20} color={colors.ink} strokeWidth={2} />
              {activeCount > 0 ? (
                <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1">
                  <Text
                    allowFontScaling={false}
                    className="font-poppins-medium text-[11px] text-ink"
                  >
                    {activeCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <View className="mt-5 w-full flex-row items-center justify-between">
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              {isLoading
                ? 'Loading'
                : narrowed
                  ? `${visible.length} of ${receipts.length} receipts`
                  : `${receipts.length} ${receipts.length === 1 ? 'receipt' : 'receipts'}`}
            </Text>
            <Text
              className="font-poppins-semibold text-[15px] text-ink"
              maxFontSizeMultiplier={1.3}
            >
              {isLoading ? '' : formatCurrency(total)}
            </Text>
          </View>

          <View className="mt-1 h-px w-full bg-line" />
        </>
      )}

      {isLoading ? <SkeletonList rows={6} /> : null}

      {isError ? (
        <PageState
          art={ErrorArt}
          title="Could not load your receipts"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : null}

      {showEmpty ? (
        <PageState
          art={EmptyArt}
          title="No receipts yet"
          message="Add your first one by hand, or scan a paper receipt and let Skip read it for you."
          actionLabel="Add a receipt"
          onAction={() => router.push('/add-receipt')}
        />
      ) : null}

      {showNoMatches ? (
        <PageState
          art={NoResultsArt}
          title="Nothing matches"
          message="No receipt fits that search and those filters. Try a different store or clear what you have set."
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setFilters(EMPTY_RECEIPT_FILTERS);
          }}
        />
      ) : null}

      {!isLoading && !isError && visible.length > 0 ? (
        <View className="w-full pb-10">
          {visible.map((receipt) => (
            <ReceiptRow
              key={receipt.id}
              merchant={receipt.merchant}
              amount={receipt.amount}
              date={receipt.purchased_on}
              domain={receipt.brands?.domain}
              sourceLabel={sourceLabels.get(receipt.card_id ?? receipt.bank_account_id ?? '') ?? ''}
              onPress={() => router.push(`/add-receipt?id=${receipt.id}`)}
            />
          ))}
        </View>
      ) : null}

      {filterOpen ? (
        <ReceiptFilterSheet
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
