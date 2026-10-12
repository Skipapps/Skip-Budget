import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo } from 'react';

import { useSavings } from '@/api/savings';
import { MonthSoFarCard } from '@/components/savings/month-so-far-card';
import { ByMonthSection } from '@/components/savings/pot-row';
import { byYear } from '@/components/savings/pot-words';
import { ReadyCard } from '@/components/savings/ready-card';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { useArtwork } from '@/theme/artwork';

/**
 * Savings: what is ready to send to goals, the month still running, and every month (and amount
 * added) that moved here, by year.
 */
export default function SavingsScreen() {
  const artwork = useArtwork();
  const { pots, summary, soFar, isPending, isError, refetch } = useSavings();
  const years = useMemo(() => byYear(summary.pots), [summary.pots]);
  // Only when nothing could be read: a failed reload behind the page keeps the page.
  const unread = isError && pots.length === 0;
  // Removed months count: an account that has closed one has had its first wrap-up.
  const firstWrapUpOn =
    soFar && !pots.some((pot) => pot.kind === 'month') ? soFar.movesOn : undefined;

  return (
    <Screen
      title={t('savings.list.title')}
      showBack
      headerActions={[
        { icon: Plus, label: t('savings.add'), onPress: () => router.push('/savings-entry') },
      ]}
      onRefresh={refetch}
    >
      {isPending ? <SkeletonList rows={3} /> : null}

      {unread ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}

      {!isPending && !unread ? (
        <>
          <ReadyCard
            amount={summary.readyToUse}
            onSend={() => router.push('/send-to-goals')}
            firstWrapUpOn={firstWrapUpOn}
          />
          {soFar ? (
            <MonthSoFarCard
              month={`${soFar.month}-01`}
              earned={soFar.earned}
              spent={soFar.spent}
              leftOver={soFar.leftOver}
              movesOn={soFar.movesOn}
            />
          ) : null}
          {years.length > 0 ? (
            <ByMonthSection
              years={years}
              onOpen={(id) => router.push({ pathname: '/savings-pot/[id]', params: { id } })}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
