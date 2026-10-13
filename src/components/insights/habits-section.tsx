import { router } from 'expo-router';

import { CARD, MARK, Rule, StandRow } from '@/components/insights/rows';
import { Section, type SectionState } from '@/components/insights/section';
import { HabitIcon } from '@/components/habits/habit-icon';
import { FitRows } from '@/components/ui/fit-group';
import type { HabitRow } from '@/api/habits';
import { t } from '@/i18n';
import type { HabitsSummary } from '@/lib/insights-sections';

/** What a habit's row shows of it. */
export type InsightHabit = Pick<
  HabitRow,
  'id' | 'name' | 'icon_id' | 'color' | 'price' | 'started_on' | 'saved_from'
>;

/**
 * Habits: each habit's skipped days this week and what they saved, by the habit cards' own rules
 * (finished days with no receipt, times the price), then Saved so far across every habit.
 */
export function HabitsSection({
  state,
  summary,
}: {
  state: SectionState;
  summary: HabitsSummary<InsightHabit>;
}) {
  const shown: SectionState =
    state.kind === 'ready' && summary.count === 0
      ? {
          kind: 'empty',
          line: t('insights.habits.empty'),
          actionLabel: t('insights.habits.add'),
          onAction: () => router.push('/habit-new'),
        }
      : state;

  return (
    <Section
      id="habits"
      title={t('insights.habits.heading')}
      subtitle={t('insights.habits.subtitle')}
      seeAll="/habits"
      state={shown}
    >
      <FitRows className={`${CARD} gap-[12px]`} testID="insights-habits">
        {summary.rows.map(({ habit, skipped, saved }) => (
          <StandRow
            key={habit.id}
            id={`habit-${habit.id}`}
            mark={<HabitIcon iconId={habit.icon_id} color={habit.color} size={MARK} />}
            label={habit.name}
            caption={t('insights.habits.skipped', { count: skipped })}
            value={saved}
            plain
          />
        ))}
        <Rule />
        <StandRow
          id="habits-saved"
          label={t('insights.habits.savedSoFar')}
          value={summary.savedSoFar}
          muted
          plain
        />
      </FitRows>
    </Section>
  );
}
