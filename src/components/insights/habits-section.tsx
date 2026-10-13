import { router } from 'expo-router';

import { CARD, MARK, Rule, StandRow } from '@/components/insights/rows';
import { EmptyCard, Section, type SectionState } from '@/components/insights/section';
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
 * Habits: each running habit's skipped days this week and what they saved, by the habit cards' own
 * rules (finished days with no receipt, times the price), then Saved so far across every habit,
 * stopped ones included. With no running habit it is the empty line, under Saved so far while the
 * stopped ones have saved something, so stopping the last habit never hides that money.
 */
export function HabitsSection({
  state,
  summary,
}: {
  state: SectionState;
  summary: HabitsSummary<InsightHabit>;
}) {
  const none = state.kind === 'ready' && summary.count === 0;
  const empty = {
    line: t('insights.habits.empty'),
    actionLabel: t('insights.habits.add'),
    onAction: () => router.push('/habit-new'),
  };
  const shown: SectionState = none && summary.savedSoFar <= 0 ? { kind: 'empty', ...empty } : state;

  const savedRow = (
    <StandRow
      id="habits-saved"
      label={t('insights.habits.savedSoFar')}
      value={summary.savedSoFar}
      muted
      plain
    />
  );

  return (
    <Section
      id="habits"
      title={t('insights.habits.heading')}
      subtitle={t('insights.habits.subtitle')}
      seeAll="/habits"
      state={shown}
    >
      {none ? (
        <>
          <FitRows className={CARD} testID="insights-habits">
            {savedRow}
          </FitRows>
          <EmptyCard {...empty} className="mt-[12px]" testID="insights-section-habits-empty" />
        </>
      ) : (
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
          {savedRow}
        </FitRows>
      )}
    </Section>
  );
}
