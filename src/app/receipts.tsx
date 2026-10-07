import { router } from 'expo-router';
import { Plus, ScanLine, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { usePaymentSources, useReceipts } from '@/api/queries';
import { usePro } from '@/api/pro';
import { useRefreshAll } from '@/api/refresh';
import { draftToParams, useReceiptScan } from '@/api/scan';
import {
  EMPTY_RECEIPT_FILTERS,
  ReceiptFilterSheet,
  countActiveReceiptFilters,
  type ReceiptFilters,
} from '@/components/receipts/receipt-filter-sheet';
import { ReceiptRow } from '@/components/receipts/receipt-row';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonList } from '@/components/ui/skeleton';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { t } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { groupByDate } from '@/lib/group';
import { logoDomainOf } from '@/lib/logo-domain';
import { RangeDropdown } from '@/components/ui/range-dropdown';
import { rangeFor, type RangeKey } from '@/lib/range';
import { formatCurrency } from '@/lib/format';
import { matchesSearch } from '@/lib/search';
import { useColors } from '@/providers/theme-provider';
import { failureMessage, failureText } from '@/lib/failure';

export default function ReceiptsScreen() {
  const artwork = useArtwork();
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ReceiptFilters>(EMPTY_RECEIPT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const today = toIsoDate(new Date());
  const [rangeKey, setRangeKey] = useState<RangeKey>('month');
  const range = useMemo(() => rangeFor(rangeKey, new Date()), [rangeKey]);
  const { data: receipts = [], isLoading, isError, refetch } = useReceipts();
  const { sources } = usePaymentSources();

  const { scan, scanning, available: canScan } = useReceiptScan();
  const { pro, ready } = usePro();
  const { refresh, refreshing } = useRefreshAll();

  /** A scan lands on the pre-filled form, never filed directly, so a misread total gets checked. */
  const handleScan = async () => {
    // Until Pro is known a tap does nothing, so someone who paid is never sent to the explainer.
    if (!ready) return;
    setScanError(null);
    // Scanning is Pro; typing a receipt stays free.
    if (!pro) {
      router.push({ pathname: '/pro-feature', params: { id: 'scan' } });
      return;
    }
    try {
      const draft = await scan();
      if (!draft) return;
      router.push({ pathname: '/add-receipt', params: draftToParams(draft) });
    } catch (thrown) {
      setScanError(failureMessage(thrown));
    }
  };

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
    return receipts.filter((receipt) => {
      if (receipt.purchased_on < range.from || receipt.purchased_on > range.to) return false;
      if (!matchesSearch(receipt.merchant, query)) return false;
      if (filters.date && receipt.purchased_on !== filters.date) return false;
      if (filters.sourceIds.length > 0) {
        const sourceId = receipt.card_id ?? receipt.bank_account_id;
        if (!sourceId || !filters.sourceIds.includes(sourceId)) return false;
      }
      return true;
    });
  }, [receipts, query, filters, range]);

  const total = visible.reduce((sum, receipt) => sum - Math.abs(receipt.amount), 0);

  // Oldest day first, today last: the page opens at the bottom, on the latest shop.
  const groups = useMemo(
    () =>
      groupByDate(visible, (receipt) => receipt.purchased_on, {
        amountOf: (receipt) => -Math.abs(receipt.amount),
        direction: 'asc',
      }),
    [visible],
  );

  const showEmpty = !isLoading && !isError && receipts.length === 0;
  const showNoMatches = !isLoading && !isError && receipts.length > 0 && visible.length === 0;

  return (
    <Screen
      title={t('receipts.list.title')}
      showBack
      avoidKeyboard
      onRefresh={refresh}
      refreshing={refreshing}
      headerActions={[
        ...(canScan
          ? [
              {
                icon: ScanLine,
                label: scanning ? t('receipts.list.reading') : t('receipts.list.scan'),
                onPress: handleScan,
                busy: scanning,
              },
            ]
          : []),
        { icon: Plus, label: t('receipts.list.add'), onPress: () => router.push('/add-receipt') },
      ]}
    >
      {scanError ? (
        <Text className="mt-3 w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
          {scanError}
        </Text>
      ) : null}

      {showEmpty || isError ? null : (
        <>
          <View className="mt-5 w-full flex-row items-center gap-3">
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('receipts.list.search')}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                activeCount > 0
                  ? t('receipts.list.filtersActive', { count: activeCount })
                  : t('receipts.filter.title')
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
            <View className="flex-row items-center gap-3">
              <RangeDropdown value={rangeKey} onChange={setRangeKey} />
              <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
                {isLoading
                  ? t('receipts.list.loading')
                  : t('receipts.list.count', { count: visible.length })}
              </Text>
            </View>
            <Text className="font-app-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
              {isLoading ? '' : formatCurrency(total)}
            </Text>
          </View>
        </>
      )}

      {isLoading ? <SkeletonList rows={6} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => refetch()}
        />
      ) : null}

      {showEmpty ? (
        // Adding, not scanning: the first receipt should never begin with a paywall.
        <PageState
          art={artwork.emptyReceipts}
          title={t('receipts.list.emptyTitle')}
          message={t('receipts.list.emptyMessage')}
          actionLabel={t('receipts.list.add')}
          onAction={() => router.push('/add-receipt')}
        />
      ) : null}

      {showNoMatches ? (
        <PageState
          art={artwork.noResults}
          title={t('receipts.list.noMatchTitle')}
          message={t('receipts.list.noMatchMessage')}
          actionLabel={t('receipts.list.clearFilters')}
          onAction={() => {
            setQuery('');
            setFilters(EMPTY_RECEIPT_FILTERS);
          }}
        />
      ) : null}

      {!isLoading && !isError && visible.length > 0 ? (
        <View className="w-full pb-10">
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((receipt) => (
                <ReceiptRow
                  key={receipt.id}
                  merchant={receipt.merchant}
                  amount={receipt.amount}
                  date={receipt.purchased_on}
                  domain={logoDomainOf(receipt)}
                  logoHidden={receipt.logo_hidden}
                  sourceLabel={
                    sourceLabels.get(receipt.card_id ?? receipt.bank_account_id ?? '') ?? ''
                  }
                  onPress={() => router.push(`/receipt/${receipt.id}`)}
                />
              ))}
            </View>
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
