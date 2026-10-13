import { router } from 'expo-router';

import { CARD, IconWell, StandRow } from '@/components/insights/rows';
import { Section, type SectionState } from '@/components/insights/section';
import { FitRows } from '@/components/ui/fit-group';
import { percent, t } from '@/i18n';
import { useGradientIcons } from '@/theme/gradient-icons';

export type SavingsInsight = {
  /** What reached savings this month (`movedThisMonth`). */
  moved: number;
  /** The Savings page's headline (`summary.readyToUse`). */
  total: number;
  /** moved as a whole percent of this month's income; null hides the line. */
  incomeShare: number | null;
  /** Something moved, yet the share rounds to 0%: the line says less than 1%. */
  belowOnePercent: boolean;
};

/**
 * Savings: what moved into savings this month and what is in savings now, the same figure the
 * Savings page and the Cards tile show. The share of this month's income sits under the amount it
 * is a share of.
 */
export function SavingsSection({
  state,
  savings,
}: {
  state: SectionState;
  savings: SavingsInsight;
}) {
  const { savings: PigIcon } = useGradientIcons();
  const shown: SectionState =
    state.kind === 'ready' && savings.moved === 0 && savings.total === 0
      ? {
          kind: 'empty',
          line: t('insights.savings.empty'),
          actionLabel: t('insights.savings.open'),
          onAction: () => router.push('/savings'),
        }
      : state;

  return (
    <Section
      id="savings"
      title={t('insights.savings.heading')}
      subtitle={t('insights.savings.subtitle')}
      seeAll="/savings"
      state={shown}
    >
      <FitRows className={`${CARD} gap-[12px]`} testID="insights-savings">
        <StandRow
          id="savings-moved"
          mark={<IconWell icon={PigIcon} />}
          label={t('insights.savings.moved')}
          value={savings.moved}
          plain
          caption={
            // Nothing moved is no share of anything.
            savings.incomeShare === null || savings.moved === 0
              ? null
              : savings.belowOnePercent
                ? t('insights.savings.shareUnder', { percent: percent(1, 0) })
                : t('insights.savings.share', { percent: percent(savings.incomeShare, 0) })
          }
        />
        <StandRow
          id="savings-total"
          mark={<IconWell icon={PigIcon} />}
          label={t('insights.savings.total')}
          value={savings.total}
          plain
        />
      </FitRows>
    </Section>
  );
}
