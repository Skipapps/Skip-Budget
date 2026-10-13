import { router } from 'expo-router';

import { IconWell, Row } from '@/components/insights/rows';
import { HIDDEN, Section, type SectionState } from '@/components/insights/section';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import type { SubscriptionCost } from '@/lib/insights-sections';
import { useHomeIcons } from '@/theme/home-icons';

/** Whether Coming up is drawn once ready: with no subscription running it is left off. */
export const hasRunning = (cost: SubscriptionCost) => cost.count > 0;

/**
 * Coming up: what the running subscriptions cost a month and over a year, each counted by its own
 * billing cycle. Left off with none running.
 */
export function ComingUpSection({ state, cost }: { state: SectionState; cost: SubscriptionCost }) {
  const icons = useHomeIcons();
  const shown = state.kind === 'ready' && !hasRunning(cost) ? HIDDEN : state;

  return (
    <Section
      id="coming"
      title={t('insights.coming.heading')}
      subtitle={t('insights.coming.subtitle')}
      seeAll="/subscriptions"
      state={shown}
    >
      <Row
        mark={<IconWell icon={icons.subscription} />}
        label={t('insights.out.subscriptions')}
        value={t('insights.coming.perMonth', { amount: formatCurrency(cost.perMonth) })}
        hint={t('insights.coming.overYear', { amount: formatCurrency(cost.perYear) })}
        onPress={() => router.push('/subscriptions')}
      />
    </Section>
  );
}
