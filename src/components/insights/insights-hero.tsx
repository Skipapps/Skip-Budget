import { PlumCard } from '@/components/payments/plum-card';
import { percent, t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import type { HeroFigures } from '@/lib/insights';

/**
 * The plum card over the page: what is left of this calendar month's pay after what has gone out
 * so far, whatever period is picked further down. More out than in says "over" with the amount
 * unsigned; with no pay this month the share line is left off.
 */
export function InsightsHero({ figures }: { figures: HeroFigures }) {
  const label = t(figures.over ? 'insights.hero.over' : 'insights.hero.left');
  const amount = formatCurrency(Math.abs(figures.left));
  const income = formatCurrency(figures.in);
  const out = formatCurrency(figures.out);
  // Under half a percent rounds to 0%, which would say nothing was spent: it says less than 1%.
  const share =
    figures.spentPercent === null
      ? null
      : figures.belowOnePercent
        ? t('insights.hero.spentShareUnder', { percent: percent(1, 0) })
        : t('insights.hero.spentShare', { percent: percent(figures.spentPercent, 0) });

  return (
    <PlumCard
      testID="insights-hero"
      label={label}
      figure={amount}
      caption={t('insights.hero.inOut', { in: income, out })}
      footer={share}
      accessibilityLabel={[t('insights.hero.a11y', { label, amount, in: income, out }), share]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
