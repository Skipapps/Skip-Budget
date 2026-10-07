import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useLedger, usePaymentSources, useSubscriptions } from '@/api/queries';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { PageState } from '@/components/ui/page-state';
import { RangeDropdown } from '@/components/ui/range-dropdown';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { groupByDate } from '@/lib/group';
import { rangeFor, type RangeKey } from '@/lib/range';
import { useMoneyColor } from '@/providers/theme-provider';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * What the subscriptions have actually cost over a window: the renewals charged, so a cancelled
 * plan still shows the months it ran. A renewal opens its subscription's own page.
 */
export default function SubscriptionsScreen() {
  const artwork = useArtwork();
  const moneyColor = useMoneyColor();
  const [rangeKey, setRangeKey] = useState<RangeKey>('month');
  const today = toIsoDate(new Date());
  const range = useMemo(() => rangeFor(rangeKey, new Date()), [rangeKey]);

  const plans = useSubscriptions();
  const { entries, isLoading, isError, refetch } = useLedger(range, today);
  const { sources } = usePaymentSources();

  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const charges = useMemo(
    () => entries.filter((entry) => entry.kind === 'subscription'),
    [entries],
  );
  const total = charges.reduce((sum, entry) => sum + entry.amount, 0);

  // Oldest day first, today last.
  const groups = useMemo(
    () =>
      groupByDate(charges, (entry) => entry.date, {
        amountOf: (e) => e.amount,
        direction: 'asc',
      }),
    [charges],
  );

  const planCount = plans.data?.length ?? 0;

  return (
    <Screen
      title="Subscriptions"
      showBack
      onRefresh={refetch}
      headerActions={[
        { icon: Plus, label: 'Add subscription', onPress: () => router.push('/add-subscription') },
      ]}
    >
      <View className="mt-3 w-full rounded-[16px] bg-ink/[0.035] px-4 py-4">
        <View className="w-full flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-app text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              Renewals charged
            </Text>
            <Text
              className="mt-0.5 font-app-bold text-[26px] text-ink"
              style={{ color: moneyColor(total) }}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
            >
              {formatCurrency(total)}
            </Text>
          </View>
          <RangeDropdown value={rangeKey} onChange={setRangeKey} />
        </View>

        <Text className="mt-2 font-app text-[12px] text-muted" maxFontSizeMultiplier={1.2}>
          {charges.length === 0
            ? 'Nothing in this window'
            : `${charges.length} ${charges.length === 1 ? 'charge' : 'charges'}`}
        </Text>
      </View>

      {isLoading ? <SkeletonList rows={5} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={FAILURE_MESSAGE}
          actionLabel="Try again"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && charges.length === 0 ? (
        <PageState
          art={artwork.emptySubscriptions}
          title={planCount === 0 ? 'No subscriptions yet' : 'Nothing in this window'}
          message={
            planCount === 0
              ? 'Add the ones you pay for and every renewal shows up here as it happens.'
              : 'Nothing renewed in this stretch of time. Try a wider window.'
          }
          actionLabel={planCount === 0 ? 'Add a subscription' : undefined}
          onAction={planCount === 0 ? () => router.push('/add-subscription') : undefined}
        />
      ) : null}

      {!isLoading && !isError && charges.length > 0 ? (
        <View className="w-full pb-10">
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((entry, index) => (
                <Fragment key={entry.id}>
                  {index > 0 ? <View className="ml-[52px] h-px bg-line/60" /> : null}
                  <TransactionRow
                    label={entry.label}
                    amount={entry.amount}
                    kindLabel={sourceLabels.get(entry.sourceId) ?? 'No payment method'}
                    kind="subscription"
                    domain={entry.domain}
                    logoHidden={entry.logoHidden}
                    onPress={
                      entry.planId ? () => router.push(`/subscription/${entry.planId}`) : undefined
                    }
                  />
                </Fragment>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
