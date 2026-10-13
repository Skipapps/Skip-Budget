import { randomUUID } from 'expo-crypto';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useGoal } from '@/api/goals';
import { savingsRefusal, useSavingsCore, useTakeFromGoal } from '@/api/savings';
import { GoalHeroCard, GoalMovesCard } from '@/components/savings/goal-detail-parts';
import { goalMoveLines, paceOf } from '@/components/savings/goal-words';
import { QuietAction } from '@/components/savings/quiet-action';
import { refusalLine } from '@/components/savings/refusal-words';
import { AmountPad } from '@/components/ui/amount-pad';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { toCents } from '@/lib/money';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * One goal: how far along it is, what it asks a week, and every send and take-back. Money comes
 * from savings here, and goes back to savings, never more than came from it. The pencil edits or
 * deletes the goal.
 */
export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artwork = useArtwork();
  const toast = useToast();
  const { goal: read, moves, isPending, isError, refreshFailed, refetch } = useGoal(id);
  // A read with nothing cached shows no figure: a goal counted without its moves would show less
  // saved, and Take money out less to take.
  const goal = isError && !refreshFailed ? null : read;
  const savings = useSavingsCore();
  const take = useTakeFromGoal();
  const [taking, setTaking] = useState(false);
  // Kept for a retry of the same amount after a lost answer, which is then answered, not moved
  // twice; any other amount is a new take-out with an id of its own.
  const [batch, setBatch] = useState<{ id: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Deleted from its edit page or on another phone. Only while this page is on top: under the edit
  // page, that page does the one navigation its Delete calls for.
  const focused = useIsFocused();
  const gone = !isPending && !isError && goal === null;
  useEffect(() => {
    if (gone && focused) goBack();
  }, [gone, focused]);

  const canTake = goal !== null && toCents(goal.fromSavings) > 0;
  // Hidden, not dimmed, while savings hold nothing to send.
  const canAdd = goal !== null && !goal.done && toCents(savings.summary.readyToUse) > 0;

  const takeOut = async (amount: number) => {
    if (!goal) return;
    setError(null);
    const batchId = batch && toCents(batch.amount) === toCents(amount) ? batch.id : randomUUID();
    setBatch({ id: batchId, amount });
    try {
      await take.mutateAsync({ goalId: goal.id, amount, batchId });
      setBatch(null);
      success();
      toast('toast.goal.takenOut');
    } catch (thrown) {
      const refusal = savingsRefusal(thrown);
      // Deleted or closed on another phone: nothing is wrong. Read again and this page goes back.
      if (refusal?.kind === 'gone') {
        refetch();
        return;
      }
      warn();
      setError(refusalLine(refusal, goal.name) ?? failureMessage(thrown));
    }
  };

  return (
    <Screen
      title={goal?.name}
      showBack
      headerActions={
        goal
          ? [
              {
                icon: Pencil,
                label: t('goals.detail.edit'),
                onPress: () => router.push({ pathname: '/save-goal', params: { id: goal.id } }),
              },
            ]
          : undefined
      }
      onRefresh={refetch}
      footer={
        goal && (canAdd || canTake || error) ? (
          <View className="w-full items-center gap-1">
            {error ? (
              <Text
                testID="goal-page-error"
                className="mb-2 text-center font-app text-[13px] text-danger"
                maxFontSizeMultiplier={TEXT_CAP.reading}
              >
                {error}
              </Text>
            ) : null}
            {canAdd ? (
              <Button
                label={t('goals.detail.addFromSavings')}
                onPress={() =>
                  router.push({ pathname: '/send-to-goals', params: { goal: goal.id } })
                }
              />
            ) : null}
            {canTake ? (
              <QuietAction
                label={t('goals.detail.takeOut')}
                onPress={() => setTaking(true)}
                disabled={take.isPending}
              />
            ) : null}
          </View>
        ) : undefined
      }
    >
      {isPending ? <SkeletonList rows={3} /> : null}

      {/* A failed reload behind a page already drawn keeps the page, unless the goal is not in it. */}
      {isError && !goal ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}

      {goal ? (
        <>
          <GoalHeroCard
            name={goal.name}
            iconId={goal.icon_id}
            targetDate={goal.target_date}
            saved={goal.saved}
            target={goal.target}
            percent={goal.percent}
            pace={paceOf(goal)}
            reachedOn={goal.done ? goal.reachedOn : null}
          />
          {/* Savings decide whether Add from savings is offered. */}
          <RefreshNote show={refreshFailed || savings.refreshFailed} />
          <View className="mb-4 w-full">
            <GoalMovesCard lines={goalMoveLines(goal, moves)} />
          </View>
        </>
      ) : null}

      {goal && taking ? (
        <AmountPad
          title={t('goals.takeOut.title')}
          caption={t('goals.takeOut.hint', { amount: formatCurrency(goal.fromSavings) })}
          value=""
          onCancel={() => setTaking(false)}
          check={(draft) => {
            const cents = toCents(Number(draft) || 0);
            if (cents <= 0)
              return t('goals.takeOut.hint', { amount: formatCurrency(goal.fromSavings) });
            return cents > toCents(goal.fromSavings)
              ? t('goals.takeOut.tooMuch', { amount: formatCurrency(goal.fromSavings) })
              : null;
          }}
          onConfirm={(draft) => {
            setTaking(false);
            void takeOut(Number(draft) || 0);
          }}
        />
      ) : null}
    </Screen>
  );
}
