import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useLedger, usePaymentSources, useSubscriptions } from '@/api/queries';
import { hidOlder } from '@/lib/allowance';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { FitFigure } from '@/components/ui/fit-group';
import { HistoryNotice } from '@/components/pro/history-notice';
import { PageState } from '@/components/ui/page-state';
import { RangeDropdown } from '@/components/ui/range-dropdown';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { groupByDate } from '@/lib/group';
import { rangeFor, type RangeKey } from '@/lib/range';
import { useMoneyColor } from '@/providers/theme-provider';
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

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
  const { entries, allEntries, hidden, isLoading, isError, refetch } = useLedger(range, today);
  // Free lists 90 days back: say the older charges are kept rather than look like none.
  const hiddenOlder = hidOlder(hidden, 'subscription');
  const { sources } = usePaymentSources();

  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const charges = useMemo(
    () => entries.filter((entry) => entry.kind === 'subscription'),
    [entries],
  );
  // The heading sums the whole window, as Pro sees it; only the list stops at the plan's window.
  const inWindow = useMemo(
    () => allEntries.filter((entry) => entry.kind === 'subscription'),
    [allEntries],
  );
  const total = inWindow.reduce((sum, entry) => sum + entry.amount, 0);

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
      title={t('subscriptions.renewals.title')}
      showBack
      onRefresh={refetch}
      headerActions={[
        {
          icon: Plus,
          label: t('subscriptions.addSubscription'),
          onPress: () => router.push('/add-subscription'),
        },
      ]}
    >
      <View className="mt-3 w-full rounded-[16px] bg-ink/[0.035] px-4 py-4">
        <View className="w-full flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className="font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {t('subscriptions.renewals.label')}
            </Text>
            <FitFigure
              id="total"
              size={26}
              className="font-app-bold text-ink"
              style={{ color: moneyColor(total) }}
              boxClassName="mt-0.5"
            >
              {formatCurrency(total)}
            </FitFigure>
          </View>
          <RangeDropdown value={rangeKey} onChange={setRangeKey} />
        </View>

        <Text
          className="mt-2 font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {inWindow.length === 0
            ? t('subscriptions.renewals.nothing')
            : t('subscriptions.renewals.count', { count: inWindow.length })}
        </Text>
      </View>

      {isLoading ? <SkeletonList rows={5} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && charges.length === 0 && hiddenOlder ? (
        <HistoryNotice className="mt-5" />
      ) : null}

      {!isLoading && !isError && charges.length === 0 && !hiddenOlder ? (
        <PageState
          art={artwork.emptySubscriptions}
          title={
            planCount === 0
              ? t('subscriptions.noSubscriptionsYet')
              : t('subscriptions.renewals.nothing')
          }
          message={
            planCount === 0
              ? t('subscriptions.renewals.emptyMessage')
              : t('subscriptions.renewals.windowMessage')
          }
          actionLabel={planCount === 0 ? t('subscriptions.addASubscription') : undefined}
          onAction={planCount === 0 ? () => router.push('/add-subscription') : undefined}
        />
      ) : null}

      {!isLoading && !isError && charges.length > 0 ? (
        <View className="w-full pb-10">
          {/* Oldest first, so the list starts where the plan's window does. */}
          {hiddenOlder ? <HistoryNotice className="mt-5" /> : null}
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((entry, index) => (
                <Fragment key={entry.id}>
                  {index > 0 ? <View className="ml-[52px] h-px bg-line/60" /> : null}
                  <TransactionRow
                    label={entry.label}
                    amount={entry.amount}
                    kindLabel={
                      sourceLabels.get(entry.sourceId) ?? t('subscriptions.noPaymentMethod')
                    }
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
