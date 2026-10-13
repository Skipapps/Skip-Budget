import { BarRow, CARD, MARK } from '@/components/insights/rows';
import { HIDDEN, Section, type SectionState } from '@/components/insights/section';
import { BillMark } from '@/components/bills/bill-mark';
import { FitRows } from '@/components/ui/fit-group';
import { LISTED_BILL_CATEGORIES } from '@/data/bill-categories';
import { t, type MessageKey } from '@/i18n';
import { MESSAGES } from '@/i18n/messages';
import type { CategoryTotal } from '@/lib/insights';

/**
 * A category's name by its stored id. An id the app has no words for (added to the database
 * later) keeps the label it was stored with.
 */
function categoryName(
  prefix: 'receipts.category' | 'insights.billCategory',
  id: string,
  stored: string,
): string {
  const key = `${prefix}.${id}`;
  return key in MESSAGES ? t(key as MessageKey) : stored;
}

/**
 * Every category's name in the language on screen: the bill categories, then the spending ones
 * (`useSpendCategories`), which win where an id is both. Build it while rendering.
 */
export function categoryLabels(
  spendCategories: readonly { id: string; label: string }[],
): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();
  for (const category of LISTED_BILL_CATEGORIES) {
    labels.set(category.id, categoryName('insights.billCategory', category.id, category.label));
  }
  for (const category of spendCategories) {
    labels.set(category.id, categoryName('receipts.category', category.id, category.label));
  }
  return labels;
}

/** Where it goes: spending by category in the period, biggest first, each against the biggest. */
export function CategoriesSection({
  state,
  rows,
  labels,
}: {
  state: SectionState;
  rows: readonly CategoryTotal[];
  labels: ReadonlyMap<string, string>;
}) {
  const shown = state.kind === 'ready' && rows.length === 0 ? HIDDEN : state;
  const biggest = rows[0]?.amount ?? 0;

  return (
    <Section
      id="goes"
      title={t('insights.goes.heading')}
      subtitle={t('insights.goes.subtitle')}
      seeAll="/transactions"
      state={shown}
    >
      <FitRows className={CARD} testID="insights-categories">
        {rows.map((category, index) => (
          <BarRow
            key={category.id}
            id={`category-${index}`}
            first={index === 0}
            mark={<BillMark categoryId={category.id} size={MARK} />}
            label={labels.get(category.id) ?? t('receipts.category.other')}
            amount={category.amount}
            share={biggest > 0 ? category.amount / biggest : 0}
          />
        ))}
      </FitRows>
    </Section>
  );
}
