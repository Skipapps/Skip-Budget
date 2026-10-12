import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useGoals } from '@/api/goals';
import { useSavingsCore } from '@/api/savings';
import { QuietAction } from '@/components/savings/quiet-action';
import {
  SentGoalsCard,
  SentHero,
  StillInSavingsCard,
  type SentLine,
} from '@/components/savings/sent-parts';
import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { fromCents, toCents } from '@/lib/money';
import { finishFlowOn } from '@/lib/nav';

type Sent = { goalId: string; amount: number; after: number };

/** "goalId:amount:after,…" as the Send page writes the send's answer, in its own order. */
function readSent(raw: string | undefined): Sent[] {
  if (!raw) return [];
  return raw.split(',').flatMap((part) => {
    const [goalId, amount, after] = part.split(':');
    const sent = { goalId, amount: Number(amount), after: Number(after) };
    return goalId && Number.isFinite(sent.amount) && Number.isFinite(sent.after) ? [sent] : [];
  });
}

/** Whole percent of the target, rounded down, so never 100 while short. */
function percentOf(saved: number, target: number): number {
  const whole = toCents(target);
  return whole > 0 ? Math.min(100, Math.floor((toCents(saved) * 100) / whole)) : 0;
}

/**
 * After a send: what each goal got and where it stands now, in the Send page's order, and what
 * stayed in savings. From the send's own answer, so a late reload never shows "$0 moved"; without
 * one (opened again later), from the batch's moves. It took the Send page's place, so Done returns
 * to wherever the send began.
 */
export default function GoalsSentScreen() {
  const params = useLocalSearchParams<{ batch?: string; sent?: string; stays?: string }>();
  const goals = useGoals();
  const savings = useSavingsCore();

  const lines = useMemo<SentLine[]>(() => {
    const views = [...goals.summary.active, ...goals.summary.done];
    let sent = readSent(params.sent);
    if (sent.length === 0 && params.batch) {
      const byGoal = new Map<string, number>();
      for (const move of goals.moves) {
        if (move.batch_id !== params.batch) continue;
        byGoal.set(move.goal_id, (byGoal.get(move.goal_id) ?? 0) + toCents(move.amount));
      }
      sent = [...byGoal.entries()].flatMap(([goalId, cents]) => {
        const view = views.find((goal) => goal.id === goalId);
        return view ? [{ goalId, amount: fromCents(cents), after: view.saved }] : [];
      });
    }
    return sent.flatMap((line) => {
      const goal = views.find((view) => view.id === line.goalId);
      if (!goal || toCents(line.amount) <= 0) return [];
      return [
        {
          id: goal.id,
          name: goal.name,
          iconId: goal.icon_id,
          added: line.amount,
          saved: line.after,
          target: goal.target,
          percent: percentOf(line.after, goal.target),
        },
      ];
    });
  }, [goals.summary, goals.moves, params.sent, params.batch]);

  const total = fromCents(lines.reduce((sum, line) => sum + toCents(line.added), 0));
  const stays = Number(params.stays);
  const still = params.stays && Number.isFinite(stays) ? stays : savings.summary.readyToUse;
  const loading = goals.isPending || savings.isPending;

  return (
    <Screen
      footer={
        <View className="w-full items-center gap-1">
          <Button label={t('common.done')} onPress={goBack} />
          <QuietAction label={t('savings.sent.viewGoals')} onPress={() => finishFlowOn('/goals')} />
        </View>
      }
    >
      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          <SentHero total={total} />
          {lines.length > 0 ? <SentGoalsCard lines={lines} /> : null}
          <StillInSavingsCard amount={still} />
        </>
      )}
    </Screen>
  );
}
