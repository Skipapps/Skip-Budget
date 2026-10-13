import { router } from 'expo-router';

import { CARD, IconWell, Prompt, StandRow } from '@/components/insights/rows';
import { Section, type SectionState } from '@/components/insights/section';
import { FitRows } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useGradientIcons } from '@/theme/gradient-icons';

/** What comes in, as the Salary page counts it. */
export type IncomeFigures = {
  /** The schedules' every-month figure (`scheduledPerMonth`). */
  monthly: number;
  /** Schedules counted in it. */
  schedules: number;
  /** One-off pays that landed this calendar month (`oneOffsInMonth`). */
  onceTotal: number;
  onceCount: number;
};

/**
 * What comes in: the pay schedules' every-month figure, with what one-off pays added this month
 * under it; only this month's one-offs when there is no schedule. With neither, the page asks for
 * pay rather than leaving a gap.
 */
export function IncomeSection({ state, figures }: { state: SectionState; figures: IncomeFigures }) {
  const { salary } = useGradientIcons();
  const { monthly, schedules, onceTotal, onceCount } = figures;
  const scheduled = monthly > 0;
  const any = scheduled || onceTotal > 0;

  return (
    <Section
      id="in"
      first
      title={t('insights.in.heading')}
      subtitle={t('insights.in.subtitle')}
      seeAll="/salary"
      state={state}
    >
      {any ? (
        <FitRows className={CARD} testID="insights-income">
          <StandRow
            id="salary"
            mark={<IconWell icon={salary} />}
            label={t('insights.in.salary')}
            value={scheduled ? monthly : onceTotal}
            plain
            caption={
              scheduled
                ? [
                    t('insights.in.everyMonthSources', { count: schedules }),
                    ...(onceTotal > 0
                      ? [t('insights.in.onceThisMonth', { amount: formatCurrency(onceTotal) })]
                      : []),
                  ]
                : t('insights.in.thisMonthOnce', { count: onceCount })
            }
          />
        </FitRows>
      ) : (
        <Prompt
          title={t('insights.in.emptyTitle')}
          message={t('insights.in.emptyMessage')}
          actionLabel={t('insights.in.setUp')}
          onPress={() => router.push('/salary')}
        />
      )}
    </Section>
  );
}
