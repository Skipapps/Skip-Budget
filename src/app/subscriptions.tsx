import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  EMPTY_SUBSCRIPTION_FILTERS,
  SubscriptionFilterSheet,
  countActiveSubscriptionFilters,
  type SubscriptionFilters,
} from '@/components/subscriptions/subscription-filter-sheet';
import { SubscriptionRow } from '@/components/subscriptions/subscription-row';
import { ActionPill } from '@/components/ui/action-pill';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Title } from '@/components/ui/typography';
import { subscriptions } from '@/data/subscriptions-mock';
import { formatCurrency } from '@/lib/format';
import { PAYMENT_SOURCE_OPTIONS, getSourceLabel } from '@/lib/sources';
import { colors } from '@/theme/colors';

export default function SubscriptionsScreen() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SubscriptionFilters>(EMPTY_SUBSCRIPTION_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeCount = countActiveSubscriptionFilters(filters);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return subscriptions.filter((subscription) => {
      if (needle && !subscription.name.toLowerCase().includes(needle)) return false;
      if (filters.cycles.length > 0 && !filters.cycles.includes(subscription.cycle)) return false;
      if (filters.sourceIds.length > 0 && !filters.sourceIds.includes(subscription.sourceId)) {
        return false;
      }
      return true;
    });
  }, [query, filters]);

  // Normalised to a month so yearly plans do not look cheap beside monthly ones.
  const monthlyTotal = visible.reduce(
    (sum, subscription) =>
      sum + (subscription.cycle === 'yearly' ? subscription.amount / 12 : subscription.amount),
    0,
  );

  return (
    <Screen showBack avoidKeyboard>
      <View className="mt-2 w-full flex-row items-center justify-between gap-3">
        <Title align="left" className="flex-1">
          Subscriptions
        </Title>

        {/* Inert until the add-subscription form is designed. */}
        <ActionPill label="Add" onPress={() => router.push('/add-subscription')} />
      </View>

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
              <Text allowFontScaling={false} className="font-poppins-medium text-[11px] text-ink">
                {activeCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View className="mt-5 w-full flex-row items-center justify-between">
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          {visible.length === subscriptions.length
            ? `${subscriptions.length} subscriptions`
            : `${visible.length} of ${subscriptions.length} subscriptions`}
        </Text>
        <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {formatCurrency(monthlyTotal)}
          <Text className="font-poppins text-[13px] text-muted"> / mo</Text>
        </Text>
      </View>

      <View className="mt-1 h-px w-full bg-line" />

      {visible.length === 0 ? (
        <View className="mt-16 w-full items-center">
          <Text className="font-poppins text-[15px] text-muted" maxFontSizeMultiplier={1.4}>
            No subscriptions match.
          </Text>
        </View>
      ) : (
        <View className="w-full pb-10">
          {visible.map((subscription) => (
            <SubscriptionRow
              key={subscription.id}
              subscription={subscription}
              sourceLabel={getSourceLabel(subscription.sourceId)}
            />
          ))}
        </View>
      )}

      {filterOpen ? (
        <SubscriptionFilterSheet
          filters={filters}
          sourceOptions={PAYMENT_SOURCE_OPTIONS}
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
