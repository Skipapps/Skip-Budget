import { router } from 'expo-router';
import { useMemo } from 'react';

import { useLoans } from '@/api/loans';
import { LoansBody } from '@/components/loans/loans-body';
import { cardOf, loansPageSummary, priceLoans } from '@/components/loans/priced-loans';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { useToday } from '@/lib/use-today';
import { useArtwork } from '@/theme/artwork';

/** Every loan saved from the calculator: what is owed, what goes out a month, how far along each is. */
export default function LoansScreen() {
  const { today } = useToday();
  const artwork = useArtwork();
  const { loans, isPending, isError, refreshFailed, refetch } = useLoans(today);

  const priced = useMemo(() => priceLoans(loans, today), [loans, today]);
  const cards = useMemo(() => priced.map(cardOf), [priced]);
  const summary = useMemo(() => loansPageSummary(priced), [priced]);

  const openCalculator = () => router.push('/loan-calculator');

  return (
    <Screen
      title={t('loan.list.title')}
      subtitle={t('loan.list.subtitle')}
      showBack
      onRefresh={refetch}
    >
      {isPending ? <SkeletonList rows={3} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}

      {!isPending && !isError ? (
        <LoansBody
          loans={cards}
          summary={summary}
          refreshFailed={refreshFailed}
          onOpen={(billId) => router.push({ pathname: '/loan/[id]', params: { id: billId } })}
          onCalculator={openCalculator}
          onAdd={() => router.push('/add-loan')}
        />
      ) : null}
    </Screen>
  );
}
