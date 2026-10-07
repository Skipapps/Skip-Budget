import { router } from 'expo-router';
import { Plus, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { usePaymentSources, useSubscriptions } from '@/api/queries';
import {
  EMPTY_SUBSCRIPTION_FILTERS,
  SubscriptionFilterSheet,
  countActiveSubscriptionFilters,
  type SubscriptionFilters,
} from '@/components/subscriptions/subscription-filter-sheet';
import { SubscriptionRow } from '@/components/subscriptions/subscription-row';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonList } from '@/components/ui/skeleton';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { t } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { groupByDate } from '@/lib/group';
import { logoDomainOf } from '@/lib/logo-domain';
import { formatCurrency } from '@/lib/format';
import { matchesSearch } from '@/lib/search';
import { useColors } from '@/providers/theme-provider';
import { failureText } from '@/lib/failure';

/** Normalised to a month so a yearly plan does not look cheap beside a monthly one. */
const PER_MONTH: Record<string, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export default function SubscriptionPlansScreen() {
  const artwork = useArtwork();
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SubscriptionFilters>(EMPTY_SUBSCRIPTION_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const today = toIsoDate(new Date());

  const { data: subscriptions = [], isLoading, isError, refetch } = useSubscriptions();
  const { sources } = usePaymentSources();

  const activeCount = countActiveSubscriptionFilters(filters);
  const sourceOptions = useMemo(
    () => sources.map((source) => ({ value: source.id, label: source.label })),
    [sources],
  );
  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const visible = useMemo(() => {
    return subscriptions.filter((subscription) => {
      if (!matchesSearch(subscription.name, query)) return false;
      if (filters.cycles.length > 0 && !filters.cycles.includes(subscription.cycle)) return false;
      if (filters.sourceIds.length > 0) {
        const sourceId = subscription.card_id ?? subscription.bank_account_id;
        if (!sourceId || !filters.sourceIds.includes(sourceId)) return false;
      }
      return true;
    });
  }, [subscriptions, query, filters]);

  // Cancelled plans are shown but cost nothing, so they stay out of the total.
  const monthlyTotal = visible.reduce(
    (sum, subscription) =>
      subscription.active ? sum + subscription.amount * (PER_MONTH[subscription.cycle] ?? 1) : sum,
    0,
  );

  // Soonest renewal first. Cancelled plans still show but add nothing to a group total.
  const groups = useMemo(
    () =>
      groupByDate(visible, (subscription) => subscription.next_renewal_on, {
        amountOf: (subscription) => (subscription.active ? -Math.abs(subscription.amount) : 0),
        direction: 'asc',
      }),
    [visible],
  );

  const narrowed = query.trim().length > 0 || activeCount > 0;
  const showEmpty = !isLoading && !isError && subscriptions.length === 0;
  const showNoMatches = !isLoading && !isError && subscriptions.length > 0 && visible.length === 0;

  return (
    <Screen
      title={t('subscriptions.plans.title')}
      showBack
      avoidKeyboard
      headerActions={[
        {
          icon: Plus,
          label: t('subscriptions.addSubscription'),
          onPress: () => router.push('/add-subscription'),
        },
      ]}
    >
      {showEmpty || isError ? null : (
        <>
          <View className="mt-5 w-full flex-row items-center gap-3">
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('subscriptions.plans.search')}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                activeCount > 0
                  ? t('subscriptions.plans.filtersActive', { count: activeCount })
                  : t('subscriptions.filter.title')
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
              {isLoading
                ? t('subscriptions.plans.loading')
                : narrowed
                  ? t('subscriptions.plans.countOf', {
                      shown: visible.length,
                      count: subscriptions.length,
                    })
                  : t('subscriptions.plans.count', { count: subscriptions.length })}
            </Text>
            {isLoading ? null : (
              <Text className="font-app-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
                {formatCurrency(monthlyTotal)}
                <Text className="font-app text-[13px] text-muted">
                  {` ${t('subscriptions.plans.perMonth')}`}
                </Text>
              </Text>
            )}
          </View>

          <View className="mt-1 h-px w-full bg-line" />
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
        <PageState
          art={artwork.emptySubscriptions}
          title={t('subscriptions.noSubscriptionsYet')}
          message={t('subscriptions.plans.emptyMessage')}
          actionLabel={t('subscriptions.addASubscription')}
          onAction={() => router.push('/add-subscription')}
        />
      ) : null}

      {showNoMatches ? (
        <PageState
          art={artwork.noResults}
          title={t('subscriptions.plans.noMatchTitle')}
          message={t('subscriptions.plans.noMatchMessage')}
          actionLabel={t('subscriptions.plans.clearFilters')}
          onAction={() => {
            setQuery('');
            setFilters(EMPTY_SUBSCRIPTION_FILTERS);
          }}
        />
      ) : null}

      {!isLoading && !isError && visible.length > 0 ? (
        <View className="w-full pb-10">
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((subscription) => (
                <SubscriptionRow
                  key={subscription.id}
                  name={subscription.name}
                  amount={subscription.amount}
                  cycle={subscription.cycle}
                  renewsOn={subscription.next_renewal_on}
                  domain={logoDomainOf(subscription)}
                  logoHidden={subscription.logo_hidden}
                  active={subscription.active}
                  sourceLabel={
                    sourceLabels.get(subscription.card_id ?? subscription.bank_account_id ?? '') ??
                    ''
                  }
                  onPress={() => router.push(`/subscription/${subscription.id}`)}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {filterOpen ? (
        <SubscriptionFilterSheet
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
