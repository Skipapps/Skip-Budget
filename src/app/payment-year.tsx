import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { usePayments } from '@/api/payment-ledger';
import { ChoiceList, type ChoiceItem } from '@/components/payments/choice-list';
import { ProFooter } from '@/components/payments/pro-footer';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { ofKind, parseKind, parseYear } from '@/lib/payment-entries';
import { pickPayment } from '@/lib/payment-pick';
import { paymentFloor, yearsList } from '@/lib/payment-years';
import { useNavigateOnce } from '@/lib/use-navigate-once';
import { useToday } from '@/lib/use-today';
import { PRO_HISTORY_YEARS } from '@/lib/wall';
import { useArtwork } from '@/theme/artwork';

const ALL_YEARS = 'all';

type YearChoice = number | typeof ALL_YEARS;

/**
 * Choose year (`?kind=…&owner=…&selected=YYYY`), for Payment history. This year first, then every
 * earlier year with a payment of the kind shown (the Pro badge on a year only Pro lists in full),
 * then All years. A year is only how history looks, so it is handed back to the page that opened
 * this one; All years takes this page's place, so going back from it lands on that history again.
 */
export default function PaymentYearScreen() {
  const params = useLocalSearchParams<{ kind?: string; owner?: string; selected?: string }>();
  const { today } = useToday();
  const data = usePayments(today);
  const artwork = useArtwork();
  const once = useNavigateOnce();
  const kind = parseKind(params.kind, 'all');
  const owner = typeof params.owner === 'string' ? params.owner : '';
  const thisYear = Number(today.slice(0, 4));
  const selected = parseYear(params.selected, today, paymentFloor(today));

  const list = useMemo(
    () => yearsList(ofKind(data.payments, kind), today, data.listFloor),
    [data.payments, kind, today, data.listFloor],
  );

  const items: ChoiceItem<YearChoice>[] = [
    { value: thisYear, label: t('payments.year.thisYear'), caption: String(thisYear) },
    ...list.years
      .filter((row) => row.year !== thisYear)
      .map((row) => ({
        value: row.year,
        label: String(row.year),
        pro: row.proOnly,
        accessibilityLabel: row.proOnly
          ? t('payments.pro.yearA11y', { year: row.year })
          : undefined,
      })),
    {
      value: ALL_YEARS,
      label: t('payments.year.allYears'),
      caption:
        list.first < thisYear
          ? t('payments.year.span', { first: list.first, last: thisYear })
          : String(thisYear),
      link: true,
    },
  ];

  const choose = (choice: YearChoice) =>
    once(() => {
      if (choice === ALL_YEARS) {
        router.replace({
          pathname: '/payment-years',
          params: owner ? { kind, owner } : { kind },
        });
        return;
      }
      if (owner) pickPayment({ owner, type: 'year', year: choice });
      goBack();
    });

  return (
    <Screen title={t('payments.year.title')} showBack>
      {data.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={data.refetch}
        />
      ) : data.isLoading ? (
        <View testID="year-loading" className="mt-3 w-full">
          <SkeletonList rows={4} />
        </View>
      ) : (
        <View className="mb-4 w-full">
          <ChoiceList
            testID="years"
            className="mt-3"
            items={items}
            value={selected}
            onChoose={choose}
          />
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
