import { BarRow, CARD, MARK } from '@/components/insights/rows';
import { HIDDEN, Section, type SectionState } from '@/components/insights/section';
import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { FitRows } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import type { MerchantTotal } from '@/lib/insights';

/**
 * Where you spend most: the places paid in the period, by amount, with how many times. A bill
 * wears its category's mark; anything else its brand's logo, or letters when every payment to it
 * chose letters and none knows its website.
 */
export function MerchantsSection({
  state,
  rows,
}: {
  state: SectionState;
  rows: readonly MerchantTotal[];
}) {
  const shown = state.kind === 'ready' && rows.length === 0 ? HIDDEN : state;
  const biggest = rows[0]?.amount ?? 0;

  return (
    <Section
      id="most"
      title={t('insights.most.heading')}
      subtitle={t('insights.most.subtitle')}
      seeAll="/transactions"
      state={shown}
    >
      <FitRows className={CARD} testID="insights-merchants">
        {rows.map((merchant, index) => (
          <BarRow
            key={merchant.name}
            id={`merchant-${index}`}
            first={index === 0}
            mark={
              merchant.kind === 'bill' ? (
                <BillMark
                  categoryId={merchant.categoryId}
                  iconId={merchant.iconId}
                  domain={merchant.domain}
                  name={merchant.name}
                  size={MARK}
                />
              ) : (
                <BrandMark
                  name={merchant.name}
                  domain={merchant.domain}
                  // Letters only when no row in the group has a logo to show.
                  hidden={merchant.logoHidden && !merchant.domain}
                  size={MARK}
                />
              )
            }
            label={merchant.name}
            amount={merchant.amount}
            share={biggest > 0 ? merchant.amount / biggest : 0}
            note={t('insights.most.times', { count: merchant.count })}
          />
        ))}
      </FitRows>
    </Section>
  );
}
