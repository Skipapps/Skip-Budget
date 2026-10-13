import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { useGoals } from '@/api/goals';
import {
  CompletedGoalCard,
  GoalCard,
  GoalInviteCard,
  GoalsSummaryCard,
  NewGoalButton,
} from '@/components/savings/goal-cards';
import { paceOf } from '@/components/savings/goal-words';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { localDayOf } from '@/lib/savings';
import { useArtwork } from '@/theme/artwork';

/** Every goal: what has been saved toward them, the ones still going, and the ones reached. */
export default function GoalsScreen() {
  const artwork = useArtwork();
  const { summary, isPending, isError, refreshFailed, refetch } = useGoals();
  const { active, done } = summary;
  // Only when a read has nothing to show: a goal counted without its moves would say a wrong figure.
  const unread = isError && !refreshFailed;
  const newGoal = () => router.push('/goal-calculator');
  const open = (id: string) => router.push({ pathname: '/goal/[id]', params: { id } });

  return (
    <Screen
      title={t('goals.title')}
      showBack
      headerActions={[{ icon: Plus, label: t('goals.new'), onPress: newGoal }]}
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
        <View className="w-full">
          {active.length + done.length === 0 ? (
            <GoalInviteCard on="goals" />
          ) : (
            <GoalsSummaryCard
              saved={summary.saved}
              target={summary.target}
              active={active.length}
              done={done.length}
            />
          )}
          <RefreshNote show={refreshFailed} />

          {active.length > 0 ? (
            <>
              <SectionHeading className="mb-3 mt-7 px-1" caption={String(active.length)}>
                {t('goals.active')}
              </SectionHeading>
              <View className="w-full gap-3">
                {active.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    id={goal.id}
                    name={goal.name}
                    iconId={goal.icon_id}
                    targetDate={goal.target_date}
                    saved={goal.saved}
                    target={goal.target}
                    percent={goal.percent}
                    pace={paceOf(goal)}
                    onPress={() => open(goal.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {done.length > 0 ? (
            <>
              <SectionHeading className="mb-3 mt-7 px-1" caption={String(done.length)}>
                {t('goals.completed')}
              </SectionHeading>
              <View className="w-full gap-3">
                {done.map((goal) => (
                  <CompletedGoalCard
                    key={goal.id}
                    id={goal.id}
                    name={goal.name}
                    saved={goal.saved}
                    reachedOn={goal.reachedOn ?? localDayOf(goal.created_at)}
                    onPress={() => open(goal.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          <NewGoalButton onPress={newGoal} />
        </View>
      ) : null}
    </Screen>
  );
}
