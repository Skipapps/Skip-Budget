import { router } from 'expo-router';
import { View } from 'react-native';

import { BarRow, CARD, IconWell, MARK, Rule } from '@/components/insights/rows';
import { Section, type SectionState } from '@/components/insights/section';
import { GoalIcon } from '@/components/savings/goal-icon';
import { shortMoney } from '@/components/savings/savings-words';
import { FitRows } from '@/components/ui/fit-group';
import { percent, t } from '@/i18n';
import type { GoalView } from '@/lib/goals';
import { useGradientIcons } from '@/theme/gradient-icons';

/** How many active goals the card lists; See all has the rest. */
export const GOAL_ROWS = 3;

/** The Goals page's headline over the active goals (`useGoals().summary`). */
export type GoalsInsight = {
  saved: number;
  target: number;
  /** Active goals, in the order made. */
  active: readonly Pick<GoalView, 'id' | 'name' | 'icon_id' | 'saved' | 'target' | 'percent'>[];
  /** Goals already reached: with none active, the card says there is no active goal, not none. */
  reached: number;
};

/**
 * Goals: what is saved toward the active goals against what they ask for, then the first few goals
 * with how far along each is.
 */
export function GoalsSection({ state, goals }: { state: SectionState; goals: GoalsInsight }) {
  const { goals: TargetIcon } = useGradientIcons();
  const shown: SectionState =
    state.kind === 'ready' && goals.active.length === 0
      ? {
          kind: 'empty',
          line: t(goals.reached > 0 ? 'insights.goals.noneActive' : 'insights.goals.empty'),
          actionLabel: t('insights.goals.add'),
          onAction: () => router.push('/save-goal'),
        }
      : state;

  return (
    <Section
      id="goals"
      title={t('insights.goals.heading')}
      subtitle={t('insights.goals.subtitle')}
      seeAll="/goals"
      state={shown}
    >
      <View className={CARD} testID="insights-goals">
        <FitRows className="w-full" testID="insights-goals-total">
          <BarRow
            id="goals-saved"
            first
            mark={<IconWell icon={TargetIcon} />}
            label={t('insights.goals.saved')}
            amount={goals.saved}
            share={goals.target > 0 ? goals.saved / goals.target : 0}
            note={t('insights.goals.ofActive', {
              target: shortMoney(goals.target),
              count: goals.active.length,
            })}
          />
        </FitRows>
        <Rule className="my-[14px]" />
        <FitRows className="w-full" testID="insights-goal-rows">
          {goals.active.slice(0, GOAL_ROWS).map((goal, index) => (
            <BarRow
              key={goal.id}
              id={`goal-${goal.id}`}
              first={index === 0}
              mark={
                <View
                  style={{ width: MARK, height: MARK }}
                  className="items-center justify-center rounded-full border border-line bg-ink/5"
                >
                  <GoalIcon iconId={goal.icon_id} size={Math.round(MARK * 0.6)} />
                </View>
              }
              label={goal.name}
              amount={goal.saved}
              figure={percent(goal.percent, 0)}
              share={goal.percent / 100}
              note={t('insights.goals.goalOf', {
                saved: shortMoney(goal.saved),
                target: shortMoney(goal.target),
              })}
            />
          ))}
        </FitRows>
      </View>
    </Section>
  );
}
