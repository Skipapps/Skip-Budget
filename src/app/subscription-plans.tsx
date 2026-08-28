import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePaymentSources, useSubscriptions } from '@/api/queries';
import {
  EMPTY_SUBSCRIPTION_FILTERS,
  SubscriptionFilterSheet,
  countActiveSubscriptionFilters,
  type SubscriptionFilters,
} from '@/components/subscriptions/subscription-filter-sheet';
import { SubscriptionRow } from '@/components/subscriptions/subscription-row';
import { ActionPill } from '@/components/ui/action-pill';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonList } from '@/components/ui/skeleton';
import { Title } from '@/components/ui/typography';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { toIsoDate } from '@/lib/date';
import { groupByDate } from '@/lib/group';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';

import EmptyArt from '@/assets/illustrations/state-empty-subscriptions.svg';
import ErrorArt from '@/assets/illustrations/state-error.svg';
import NoResultsArt from '@/assets/illustrations/state-no-results.svg';

/** Normalised to a month so a yearly plan does not look cheap beside a monthly one. */
const PER_MONTH: Record<string, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export default function SubscriptionPlansScreen() {
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
    const needle = query.trim().toLowerCase();

    return subscriptions.filter((subscription) => {
      if (needle && !subscription.name.toLowerCase().includes(needle)) return false;
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

  // By renewal date, soonest first — the next charge is the useful one.
  // Cancelled plans still show, but contribute nothing to a group total.
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
    <Screen showBack avoidKeyboard>
      <View className="mt-2 w-full flex-row items-center justify-between gap-3">
        <Title align="left" className="flex-1">
          Your subscriptions
        </Title>
        <ActionPill label="Add" onPress={() => router.push('/add-subscription')} />
      </View>

      {showEmpty || isError ? null : (
        <>
          <View className="mt-5 w-full flex-row items-center gap-3">
            <SearchField value={query} onChangeText={setQuery} placeholder="Search subscriptions" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                activeCount > 0 ? `Filters, ${activeCount} active` : 'Filter subscriptions'
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
                  ? `${visible.length} of ${subscriptions.length} subscriptions`
                  : `${subscriptions.length} ${subscriptions.length === 1 ? 'subscription' : 'subscriptions'}`}
            </Text>
            {isLoading ? null : (
              <Text
                className="font-poppins-semibold text-[15px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                {formatCurrency(monthlyTotal)}
                <Text className="font-poppins text-[13px] text-muted"> / mo</Text>
              </Text>
            )}
          </View>

          <View className="mt-1 h-px w-full bg-line" />
        </>
      )}

      {isLoading ? <SkeletonList rows={6} /> : null}

      {isError ? (
        <PageState
          art={ErrorArt}
          title="Could not load your subscriptions"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : null}

      {showEmpty ? (
        <PageState
          art={EmptyArt}
          title="No subscriptions yet"
          message="Add the ones you pay for and Skip will show what they cost you each month."
          actionLabel="Add a subscription"
          onAction={() => router.push('/add-subscription')}
        />
      ) : null}

      {showNoMatches ? (
        <PageState
          art={NoResultsArt}
          title="Nothing matches"
          message="No subscription fits that search and those filters. Try a different name or clear what you have set."
          actionLabel="Clear filters"
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
                  domain={subscription.brands?.domain}
                  active={subscription.active}
                  sourceLabel={
                    sourceLabels.get(subscription.card_id ?? subscription.bank_account_id ?? '') ??
                    ''
                  }
                  onPress={() => router.push(`/add-subscription?id=${subscription.id}`)}
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
