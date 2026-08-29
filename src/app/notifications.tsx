import { Fragment, useMemo } from 'react';
import { Text, View } from 'react-native';

import { useCharges } from '@/api/charges';
import { usePaymentSources } from '@/api/queries';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Subtitle, Title } from '@/components/ui/typography';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { groupByDate } from '@/lib/group';
import { moneyColor } from '@/theme/colors';

import EmptyArt from '@/assets/illustrations/state-empty-wallet.svg';
import ErrorArt from '@/assets/illustrations/state-error.svg';

/**
 * What the app has done on your behalf.
 *
 * Every row here is a charge it recorded without being asked — a bill coming
 * due, a subscription renewing. That is exactly what the pushes will announce,
 * so this is the same list read after the fact rather than a second idea of it:
 * miss the notification and nothing is lost, it is still here.
 *
 * It only shows what has already happened. Reminders about what is coming are
 * on the dashboard under Coming up, where there is room to act on them.
 */
export default function NotificationsScreen() {
  const today = toIsoDate(new Date());
  const charges = useCharges();
  const { sources } = usePaymentSources();

  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const groups = useMemo(
    () =>
      groupByDate(charges.data ?? [], (charge) => charge.charged_on, {
        amountOf: (charge) => -Math.abs(charge.amount),
      }),
    [charges.data],
  );

  return (
    <Screen showBack onRefresh={() => charges.refetch()}>
      <Title align="left" className="mt-1 w-full">
        Notifications
      </Title>
      <Subtitle className="mt-2 w-full text-left">
        Every bill and subscription the app has put through, newest first.
      </Subtitle>

      {charges.isPending ? <SkeletonList rows={5} /> : null}

      {charges.isError ? (
        <PageState
          art={ErrorArt}
          title="Could not load these"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={() => charges.refetch()}
        />
      ) : null}

      {!charges.isPending && !charges.isError && (charges.data ?? []).length === 0 ? (
        <PageState
          art={EmptyArt}
          title="Nothing has gone out yet"
          message="When a bill falls due or a subscription renews, the app records it and tells you here."
        />
      ) : null}

      {!charges.isPending && !charges.isError && (charges.data ?? []).length > 0 ? (
        <View className="mt-2 w-full pb-10">
          {groups.map((group) => (
            <View key={group.date} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((charge, index) => {
                const source = sourceLabels.get(charge.card_id ?? charge.bank_account_id ?? '');
                return (
                  <Fragment key={charge.id}>
                    {index > 0 ? <View className="h-px bg-line/60" /> : null}
                    <View className="w-full flex-row items-center gap-3 py-3.5">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="font-poppins-medium text-[15px] text-ink"
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.4}
                        >
                          {charge.label}
                        </Text>
                        <Text
                          className="mt-0.5 font-poppins text-[12px] text-muted"
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.3}
                        >
                          {source ? `Deducted from ${source}` : 'No payment method set'}
                        </Text>
                      </View>

                      <Text
                        className="font-poppins-semibold text-[15px]"
                        style={{ color: moneyColor(-Math.abs(charge.amount)) }}
                        maxFontSizeMultiplier={1.4}
                      >
                        {formatCurrency(-Math.abs(charge.amount))}
                      </Text>
                    </View>
                  </Fragment>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
