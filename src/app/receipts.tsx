import { router } from 'expo-router';
import { Plus, ScanLine, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useCaptureAllowance } from '@/api/capture-allowance';
import { useHistoryFloor } from '@/api/history';
import { usePaymentLabels } from '@/api/payment-labels';
import { useReceipts } from '@/api/queries';
import { useReceiptBookDefault, useReceiptBooks } from '@/api/receipt-books';
import { useRefreshAll } from '@/api/refresh';
import { draftToParams, useReceiptScan } from '@/api/scan';
import {
  EMPTY_RECEIPT_FILTERS,
  ReceiptFilterSheet,
  countActiveReceiptFilters,
  type ReceiptFilters,
} from '@/components/receipts/receipt-filter-sheet';
import { HistoryNotice } from '@/components/pro/history-notice';
import { ReceiptRow } from '@/components/receipts/receipt-row';
import { BookEmpty, BookInfo } from '@/components/receipts/book-parts';
import { BookPills } from '@/components/receipts/book-pills';
import { GENERAL_BOOK } from '@/data/receipt-books';
import { bookTipSeen, markBookTipSeen, useBookOnReturn } from '@/lib/book-choice';
import { bookOfReceipt, defaultBookOf } from '@/lib/receipt-books';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonList } from '@/components/ui/skeleton';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { t } from '@/i18n';
import { historyFloor } from '@/lib/allowance';
import { toIsoDate } from '@/lib/date';
import { groupByDate } from '@/lib/group';
import { logoDomainOf } from '@/lib/logo-domain';
import { RangeDropdown } from '@/components/ui/range-dropdown';
import { rangeFor, type RangeKey } from '@/lib/range';
import { formatCurrency } from '@/lib/format';
import { matchesSearch } from '@/lib/search';
import { useColors } from '@/providers/theme-provider';
import { failureMessage, failureText } from '@/lib/failure';
import { anyRefreshFailed, failedEmpty } from '@/lib/query-state';

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
  const receiptsQuery = useReceipts();
  const { data: receipts = [] } = receiptsQuery;
  const booksQuery = useReceiptBooks();
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const storedDefault = useReceiptBookDefault();
  // Books are read before the list is drawn: a receipt in a book must never show under General.
  const isLoading = receiptsQuery.isLoading || booksQuery.isLoading || storedDefault.isLoading;
  const isError = failedEmpty(receiptsQuery) || failedEmpty(booksQuery);
  // The default book picks which book's figures show, so its reload counts too.
  const refreshNote =
    !isLoading && !isError && anyRefreshFailed([receiptsQuery, booksQuery, storedDefault]);
  const refetch = () => {
    void receiptsQuery.refetch();
    void booksQuery.refetch();
  };

  // The page opens on the default book; a tap, or a book just made, changes it.
  const [picked, setPicked] = useState<string | null>(null);
  const defaultBook = defaultBookOf(storedDefault.data, books);
  const known = (book: string | null) =>
    book !== null && (book === GENERAL_BOOK || books.some((row) => row.id === book));
  const current = known(picked) ? picked! : known(defaultBook) ? defaultBook! : GENERAL_BOOK;
  const currentBook = books.find((row) => row.id === current) ?? null;
  const generalName = t('receipts.books.general');
  const pills = useMemo(
    () => [
      { key: GENERAL_BOOK, name: generalName, iconId: 'general' },
      ...books.map((book) => ({ key: book.id, name: book.name, iconId: book.icon_id })),
    ],
    [books, generalName],
  );

  useBookOnReturn(setPicked);

  // "Tap to start" stays on Add book until it, or the tip, is tapped once on this phone.
  const [tipSeen, setTipSeen] = useState(true);
  useEffect(() => {
    let live = true;
    void bookTipSeen().then((seen) => {
      if (live) setTipSeen(seen);
    });
    return () => {
      live = false;
    };
  }, []);
  const addBook = () => {
    if (!tipSeen) {
      setTipSeen(true);
      markBookTipSeen();
    }
    router.push('/receipt-book');
  };
  // A new receipt starts in the book the person opened. The page as it opens names none, so the
  // form starts in the default book, or asks.
  const bookParams: { book?: string } = known(picked) ? { book: picked! } : {};
  const addReceipt = () =>
    router.push(
      bookParams.book ? { pathname: '/add-receipt', params: bookParams } : '/add-receipt',
    );
  // Free lists 90 days back, Pro seven years. Older receipts stay stored and say so.
  const { floor, free } = useHistoryFloor();
  // Seven years back is as far as the app keeps anything, on any plan.
  const kept = useMemo(() => historyFloor(true, new Date()), []);
  // Every card and account, a locked one too: its receipts are named and can be filtered on any plan.
  const labels = usePaymentLabels();

  const { scan, scanning, available: canScan } = useReceiptScan();
  const allowance = useCaptureAllowance();
  const { refresh, refreshing } = useRefreshAll();

  /** A scan lands on the pre-filled form, never filed directly, so a misread total gets checked. */
  const handleScan = async () => {
    // Until the allowance is known a tap does nothing, so nobody with scans left (or Pro) is ever
    // sent to the explainer.
    if (!allowance.ready) return;
    setScanError(null);
    // Free scans 15 receipts a month; typing one stays free and uncounted.
    if (!allowance.scan.allowed) {
      router.push({ pathname: '/pro-feature', params: { id: 'scan' } });
      return;
    }
    try {
      const draft = await scan();
      if (!draft) return;
      router.push({
        pathname: '/add-receipt',
        params: { ...draftToParams(draft), ...bookParams },
      });
    } catch (thrown) {
      setScanError(failureMessage(thrown));
    }
  };

  const activeCount = countActiveReceiptFilters(filters);
  const sourceOptions = useMemo(
    () => labels.sources.map((source) => ({ value: source.id, label: source.label })),
    [labels.sources],
  );

  // The book on screen, before any window or search: whether it has anything at all.
  const inBook = useMemo(
    () => receipts.filter((receipt) => bookOfReceipt(receipt.book_id, books) === current),
    [receipts, books, current],
  );

  // Everything the window, search and filters match, as Pro sees it: the heading counts and sums
  // these. Only the list stops at the plan's window.
  const matching = useMemo(() => {
    return inBook.filter((receipt) => {
      if (receipt.purchased_on < range.from || receipt.purchased_on > range.to) return false;
      if (receipt.purchased_on < kept) return false;
      if (!matchesSearch(receipt.merchant, query)) return false;
      if (filters.date && receipt.purchased_on !== filters.date) return false;
      if (filters.sourceIds.length > 0) {
        const sourceId = receipt.card_id ?? receipt.bank_account_id;
        if (!sourceId || !filters.sourceIds.includes(sourceId)) return false;
      }
      return true;
    });
  }, [inBook, query, filters, range, kept]);

  const visible = useMemo(
    () => matching.filter((receipt) => receipt.purchased_on >= floor),
    [matching, floor],
  );
  const hiddenOlder = free && visible.length < matching.length;

  const total = matching.reduce((sum, receipt) => sum - Math.abs(receipt.amount), 0);

  // Newest day first, so today's shops are at the top.
  const groups = useMemo(
    () =>
      groupByDate(visible, (receipt) => receipt.purchased_on, {
        amountOf: (receipt) => -Math.abs(receipt.amount),
      }),
    [visible],
  );

  const showEmpty = !isLoading && !isError && inBook.length === 0;
  const showNoMatches =
    !isLoading && !isError && inBook.length > 0 && visible.length === 0 && !hiddenOlder;

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
        { icon: Plus, label: t('receipts.list.add'), onPress: addReceipt },
      ]}
    >
      {scanError ? (
        <Text className="mt-3 w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
          {scanError}
        </Text>
      ) : null}

      {isLoading || isError ? null : (
        <>
          <BookPills
            books={pills}
            selected={current}
            onSelect={setPicked}
            onAdd={addBook}
            tip={!tipSeen && books.length === 0}
          />
          {currentBook ? (
            <BookInfo
              book={currentBook}
              sources={labels.sources}
              isDefault={defaultBook === currentBook.id}
              onEdit={() =>
                router.push({ pathname: '/receipt-book', params: { id: currentBook.id } })
              }
            />
          ) : null}
        </>
      )}

      {showEmpty || isError || isLoading ? null : (
        <>
          <View className="mt-4 w-full flex-row items-center gap-3">
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={
                currentBook
                  ? t('receipts.books.searchIn', { name: currentBook.name })
                  : t('receipts.list.search')
              }
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
                  : t('receipts.list.count', { count: matching.length })}
              </Text>
            </View>
            <Text className="font-app-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
              {isLoading ? '' : formatCurrency(total)}
            </Text>
          </View>
        </>
      )}
      {/* Under the count and total; with an empty book, under the book pills. */}
      <RefreshNote show={refreshNote} />

      {isLoading ? <SkeletonList rows={6} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => refetch()}
        />
      ) : null}

      {showEmpty && currentBook ? <BookEmpty book={currentBook} onAdd={addReceipt} /> : null}

      {showEmpty && !currentBook ? (
        // Adding, not scanning: the first receipt should never begin with a paywall.
        <PageState
          art={artwork.emptyReceipts}
          title={t('receipts.list.emptyTitle')}
          message={t('receipts.list.emptyMessage')}
          actionLabel={t('receipts.list.add')}
          onAction={addReceipt}
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

      {!isLoading && !isError && visible.length === 0 && hiddenOlder ? (
        <HistoryNotice className="mt-5" />
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
                  habit={receipt.habit}
                  sourceLabel={
                    labels.labelOf(receipt.card_id ?? receipt.bank_account_id ?? '') ?? ''
                  }
                  onPress={() => router.push(`/receipt/${receipt.id}`)}
                />
              ))}
            </View>
          ))}
          {/* Below the oldest day shown, where the plan's window ends. */}
          {hiddenOlder ? <HistoryNotice className="mt-5" /> : null}
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
