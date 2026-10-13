import { router, useLocalSearchParams } from 'expo-router';
import { Share } from 'lucide-react-native';
import { useEffect, useId, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePayments } from '@/api/payment-ledger';
import { useRefreshAll } from '@/api/refresh';
import { ChipButton } from '@/components/payments/chip-button';
import { HistoryCard } from '@/components/payments/history-card';
import { HistoryList } from '@/components/payments/history-list';
import { KindTabs, type KindTab } from '@/components/payments/kind-tabs';
import { SearchButton } from '@/components/payments/search-button';
import { useExport } from '@/components/payments/use-export';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { ofKind, parseKind, parseYear } from '@/lib/payment-entries';
import { onPaymentPicked } from '@/lib/payment-pick';
import { paymentFloor, yearSummary } from '@/lib/payment-years';
import { withTap } from '@/lib/press';
import { useToday } from '@/lib/use-today';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Payment history (`?kind=all|bill|subscription&year=YYYY`): one year of what went out, as the
 * "Paid in {year}" card and the year's payments by month. The figures are the whole year's; on free
 * the rows stop 90 days back, and a year wholly older shows its figures over the history notice.
 *
 * A year picked on Choose year or All years comes back by this page's id. Without a year the page
 * shows this year, so on New Year's Day it moves on by itself.
 */
export default function PaymentHistoryScreen() {
  const params = useLocalSearchParams<{ kind?: string; year?: string }>();
  const { today } = useToday();
  const data = usePayments(today);
  // The app's own refresh rather than a re-read: it runs the sweep, which records a due the app
  // left open across midnight still owes.
  const { refresh, refreshing } = useRefreshAll();
  const artwork = useArtwork();
  const exporter = useExport();
  const owner = useId();
  const [kind, setKind] = useState<KindTab>(() => parseKind(params.kind, 'all'));
  const [picked, setPicked] = useState<number | null>(null);
  // Held to the seven years, so a year kept from before New Year cannot outlive its window.
  const year = parseYear(picked ?? params.year, today, paymentFloor(today));
  const thisYear = Number(today.slice(0, 4));

  useEffect(() => onPaymentPicked(owner, 'year', (pick) => setPicked(pick.year)), [owner]);

  const shown = useMemo(() => ofKind(data.payments, kind), [data.payments, kind]);
  const summary = useMemo(() => yearSummary(shown, year, today), [shown, year, today]);
  const yearRows = useMemo(
    () => shown.filter((payment) => payment.date.startsWith(`${year}-`)),
    [shown, year],
  );

  const exportView = () => exporter.open({ kind, year });
  const chooseYear = () =>
    router.push({ pathname: '/payment-year', params: { kind, owner, selected: String(year) } });
  const openSearch = () => router.push({ pathname: '/payment-search', params: { kind } });

  return (
    <Screen
      title={t('payments.history.title')}
      showBack
      onRefresh={() => void refresh()}
      refreshing={refreshing}
      headerActions={[
        { icon: Share, label: t('payments.history.exportA11y'), onPress: exportView },
      ]}
    >
      {data.isError ? (
        // History that could not be read is never shown as a year with nothing paid.
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={data.refetch}
        />
      ) : (
        <View className="mb-6 w-full">
          <View className="mt-3 w-full flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <ChipButton
              testID="year-chip"
              label={year === thisYear ? t('payments.history.thisYear') : String(year)}
              accessibilityLabel={t('payments.history.yearChipA11y', { year })}
              onPress={chooseYear}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('payments.history.export')}
              onPress={withTap(exportView)}
              // A 13pt line made 44pt to the finger.
              hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
              testID="export-link"
              className="shrink active:opacity-60"
            >
              <Text
                className="font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {t('payments.history.export')}
              </Text>
            </Pressable>
          </View>

          <KindTabs className="mt-3" value={kind} onChange={setKind} />
          <SearchButton className="mt-3" onPress={openSearch} />

          {data.isLoading ? (
            <View testID="history-loading" className="w-full">
              <Skeleton className="mt-4 h-[230px] w-full rounded-[22px]" />
              <View className="mt-6 w-full">
                <SkeletonList rows={5} />
              </View>
            </View>
          ) : (
            <>
              <View className="mt-4 w-full">
                <HistoryCard summary={summary} />
              </View>
              <RefreshNote show={data.refreshFailed} />
              <HistoryList
                year={year}
                today={today}
                rows={yearRows}
                listFloor={data.listFloor}
                labelOf={data.labelOf}
              />
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
