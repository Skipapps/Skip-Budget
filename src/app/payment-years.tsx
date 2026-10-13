import { router, useLocalSearchParams } from 'expo-router';
import { Share } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { usePayments } from '@/api/payment-ledger';
import { PlumCard } from '@/components/payments/plum-card';
import { ProFooter } from '@/components/payments/pro-footer';
import { useExport } from '@/components/payments/use-export';
import { YearCard, paymentsCountText } from '@/components/payments/year-card';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { ofKind, parseKind } from '@/lib/payment-entries';
import { pickPayment } from '@/lib/payment-pick';
import { yearsList } from '@/lib/payment-years';
import { useNavigateOnce } from '@/lib/use-navigate-once';
import { useToday } from '@/lib/use-today';
import { PRO_HISTORY_YEARS } from '@/lib/wall';
import { useArtwork } from '@/theme/artwork';

/**
 * All years (`?kind=…[&owner=…]`): what went out each year of the seven, newest first, under what
 * went out since the oldest. Every figure is whole on free too; a year whose rows only Pro lists
 * carries the Pro badge.
 *
 * Reached from Choose year it has the history's id: a year is handed back to that history and the
 * page goes back to it. Reached any other way, a year opens its own history.
 */
export default function PaymentYearsScreen() {
  const params = useLocalSearchParams<{ kind?: string; owner?: string }>();
  const { today } = useToday();
  const data = usePayments(today);
  const artwork = useArtwork();
  const exporter = useExport();
  const once = useNavigateOnce();
  const kind = parseKind(params.kind, 'all');
  const owner = typeof params.owner === 'string' ? params.owner : '';

  const list = useMemo(
    () => yearsList(ofKind(data.payments, kind), today, data.listFloor),
    [data.payments, kind, today, data.listFloor],
  );

  const open = (year: number) =>
    once(() => {
      if (owner) {
        pickPayment({ owner, type: 'year', year });
        goBack();
      } else {
        router.push({ pathname: '/payment-history', params: { kind, year: String(year) } });
      }
    });

  const label = t('payments.years.paidSince', { year: list.first });
  const figure = formatCurrency(list.total);
  const count = paymentsCountText(list.count);
  const years = t('payments.years.count', { count: list.years.length });

  return (
    <Screen
      title={t('payments.years.title')}
      showBack
      onRefresh={data.refetch}
      headerActions={[
        {
          icon: Share,
          label: t('payments.history.exportA11y'),
          onPress: () => exporter.open({ kind, year: 'all' }),
        },
      ]}
    >
      {data.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={data.refetch}
        />
      ) : data.isLoading ? (
        <View testID="years-loading" className="w-full">
          <Skeleton className="mt-3 h-[112px] w-full rounded-[22px]" />
          <View className="mt-4 w-full">
            <SkeletonList rows={4} />
          </View>
        </View>
      ) : (
        <View className="mb-4 w-full">
          <View className="mt-3 w-full">
            <PlumCard
              testID="years-card"
              label={label}
              figure={figure}
              caption={`${count} · ${years}`}
              accessibilityLabel={`${label}, ${figure}. ${count}, ${years}.`}
            />
          </View>
          {list.years.map((row) => (
            <YearCard key={row.year} className="mt-3" summary={row} onOpen={() => open(row.year)} />
          ))}
          {data.free ? (
            <ProFooter
              className="mt-6"
              label={t('payments.pro.years', { count: PRO_HISTORY_YEARS })}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
