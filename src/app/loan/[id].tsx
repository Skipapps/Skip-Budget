import { Redirect, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { useLoanDetail } from '@/api/loans';
import { LoanViewCard } from '@/components/loans/view/loan-view-card';
import { loanViewOf } from '@/components/loans/view/loan-view-data';
import { LoanViewFooter } from '@/components/loans/view/loan-view-footer';
import { HistoryCard, UpcomingCard } from '@/components/loans/view/loan-view-lists';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { useToday } from '@/lib/use-today';
import { useArtwork } from '@/theme/artwork';

/**
 * One saved loan: what is left to pay and how far along it is, the next payments, the payments
 * made, and the way to change it. Every loan opens here, wherever it is listed; `id` is its bill's.
 */
export default function LoanScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { today } = useToday();
  const artwork = useArtwork();
  const detail = useLoanDetail(id || undefined);
  const read = detail.data;
  const loan = read?.kind === 'loan' ? read.loan : null;

  const view = useMemo(() => (loan ? loanViewOf(loan, today) : null), [loan, today]);
  const refetch = () => void detail.refetch();

  // Deleted from its edit page or on another phone. Only while this page is on top: under the edit
  // page, that page makes the one navigation its Delete calls for.
  const focused = useIsFocused();
  const gone = read?.kind === 'gone';
  useEffect(() => {
    if (gone && focused) goBack();
  }, [gone, focused]);

  // A Loans bill with no loan behind it, added by hand before loans were saved. The bill page goes
  // on to here on the same read finding a loan, so the two never pass one between them.
  if (read?.kind === 'bill') {
    return <Redirect href={{ pathname: '/bill/[id]', params: { id } }} />;
  }

  const openEdit = () => router.push({ pathname: '/add-loan', params: { id } });

  if (!view) {
    return (
      <Screen showBack>
        {/* A failed reload behind a page already drawn keeps the page; here there is none. A loan
            with no schedule to read cannot be drawn either. */}
        {detail.isError || read?.kind === 'loan' ? (
          <PageState
            art={artwork.error}
            title={failureText()}
            actionLabel={t('common.tryAgain')}
            onAction={refetch}
          />
        ) : (
          <SkeletonList rows={4} />
        )}
      </Screen>
    );
  }

  const scheduleParams = view.scheduleParams;

  return (
    <Screen
      title={view.name}
      showBack
      onRefresh={refetch}
      headerActions={[
        {
          icon: Pencil,
          label: t('loanFlow.view.editA11y', { name: view.name }),
          onPress: openEdit,
        },
      ]}
      footer={<LoanViewFooter onEdit={openEdit} />}
    >
      <LoanViewCard view={view} today={today} />
      <UpcomingCard
        payments={view.upcoming}
        onSeeAll={
          scheduleParams
            ? () =>
                router.push({
                  pathname: '/loan-schedule',
                  params: { ...scheduleParams, name: view.name },
                })
            : undefined
        }
      />
      <HistoryCard history={view.history} paidFrom={view.paidFrom} today={today} />
      <View className="mb-4 w-full" />
    </Screen>
  );
}
