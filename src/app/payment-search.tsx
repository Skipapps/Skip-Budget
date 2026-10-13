import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useId, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { usePayments, type PaymentsData } from '@/api/payment-ledger';
import { useRecentSearches } from '@/api/payment-searches';
import { amountFilterHref } from '@/components/payments/amount-filter';
import { dateRangeFilterHref } from '@/components/payments/date-range-filter';
import { FilterRows, type FilterKind } from '@/components/payments/filter-rows';
import { KindTabs, type KindTab } from '@/components/payments/kind-tabs';
import { paidFromFilterHref } from '@/components/payments/paid-from-filter';
import { RecentSearches } from '@/components/payments/recent-searches';
import { SearchInput } from '@/components/payments/search-input';
import { SearchResults } from '@/components/payments/search-results';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { parseKind, paymentHref, type PaymentEntry } from '@/lib/payment-entries';
import { onPaymentPicked } from '@/lib/payment-pick';
import { NO_FILTERS, isSearching, searchPayments, type PaymentFilters } from '@/lib/payment-search';
import { useToday } from '@/lib/use-today';
import { FREE_HISTORY_DAYS, PRO_HISTORY_YEARS } from '@/lib/wall';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/** What the page reads of `usePayments`. */
export type SearchData = Pick<
  PaymentsData,
  | 'payments'
  | 'listFloor'
  | 'free'
  | 'labelOf'
  | 'isLoading'
  | 'isError'
  | 'refreshFailed'
  | 'refetch'
>;

/** Search payments (`?kind=all|bill|subscription`): the page reads every payment once, here. */
export default function PaymentSearchScreen() {
  const { today } = useToday();
  const data = usePayments(today);
  return <PaymentSearchPage today={today} data={data} />;
}

/**
 * Search across every payment kept: a word, the All / Bills / Subscriptions tabs and three filters.
 * With nothing asked, the recent searches and the filters; with a word or a filter, the results.
 * A search is kept on the phone when the keyboard's Search is pressed or a result is opened, never
 * per letter. A filter is picked on a page of its own and comes back here by this page's id.
 */
export function PaymentSearchPage({ today, data }: { today: string; data: SearchData }) {
  const params = useLocalSearchParams<{ kind?: string }>();
  const artwork = useArtwork();
  const owner = useId();
  const recent = useRecentSearches();
  const [kind, setKind] = useState<KindTab>(() => parseKind(params.kind, 'all'));
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<PaymentFilters>(NO_FILTERS);

  useEffect(
    () =>
      onPaymentPicked(owner, 'filters', (pick) =>
        setFilters((current) => ({ ...current, ...pick.filter })),
      ),
    [owner],
  );

  const searching = isSearching(query, filters);
  const { payments } = data;
  const matches = useMemo(
    () => (searching ? searchPayments(payments, { query, kind, filters, today }) : []),
    [searching, payments, query, kind, filters, today],
  );

  const openFilter = (filter: FilterKind) =>
    router.push(
      filter === 'date'
        ? dateRangeFilterHref(owner, filters.range)
        : filter === 'amount'
          ? amountFilterHref(owner, filters)
          : paidFromFilterHref(owner, filters.source),
    );

  const openResult = (payment: PaymentEntry) => {
    const href = paymentHref(payment);
    if (!href) return;
    recent.remember(query);
    router.push(href);
  };

  const footer = data.free
    ? t('payments.search.footerFree', { days: FREE_HISTORY_DAYS, years: PRO_HISTORY_YEARS })
    : t('payments.search.footerPro', { count: PRO_HISTORY_YEARS });

  return (
    <Screen
      avoidKeyboard
      header={
        <View className="w-full pb-1">
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onSubmit={() => recent.remember(query)}
            onCancel={goBack}
          />
          <KindTabs className="mt-2" value={kind} onChange={setKind} />
        </View>
      }
    >
      {/* No figure card here: the note sits under the field, over whatever the page shows. */}
      <RefreshNote show={data.refreshFailed && !(searching && data.isError)} />
      {!searching ? (
        <View testID="search-start" className="w-full">
          <RecentSearches recent={recent.recent} onPick={setQuery} onForget={recent.forget} />
          <FilterRows filters={filters} labelOf={data.labelOf} onOpen={openFilter} />
          <Text
            className="mt-4 w-full px-[8px] text-center font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {footer}
          </Text>
        </View>
      ) : data.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={data.refetch}
        />
      ) : data.isLoading ? (
        <View testID="search-loading" className="mt-4 w-full">
          <SkeletonList rows={4} />
        </View>
      ) : (
        <SearchResults
          // A new search opens with its older years folded again.
          key={`${kind}|${query}|${JSON.stringify(filters)}`}
          matches={matches}
          query={query}
          listFloor={data.listFloor}
          labelOf={data.labelOf}
          filters={filters}
          onOpen={openResult}
          onFilter={openFilter}
          onClearFilters={() => setFilters(NO_FILTERS)}
        />
      )}
    </Screen>
  );
}
