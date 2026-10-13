import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { dayMonth } from '@/components/loans/day-month';
import { localDate } from '@/components/loans/loan-words';
import { CARD, IconWell, MARK, Rule, StandRow } from '@/components/insights/rows';
import { HIDDEN, Section, type SectionState } from '@/components/insights/section';
import { FitRows } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import type { NextDue } from '@/lib/insights-sections';
import { useHomeIcons } from '@/theme/home-icons';
import { TEXT_CAP } from '@/theme/text-scale';

/** One kind's month, as its own page shows it (`usePlanMonth(...).view`). */
export type PlanKindMonth = {
  /** Plans with a date in the month. */
  count: number;
  /** Every date due in the month. */
  total: number;
};

export type PlansInsight = {
  bills: PlanKindMonth;
  subscriptions: PlanKindMonth;
  /** The next dues after today, soonest first (`nextDue`). */
  next: readonly NextDue[];
};

/** A row that opens a page: the whole row is the button, read as its words and figure. */
function OpenRow({
  href,
  label,
  amount,
  testID,
  children,
}: {
  href: Href;
  label: string;
  amount: number;
  testID: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatCurrency(amount)}`}
      onPress={() => router.push(href)}
      testID={testID}
      className="w-full rounded-[12px] active:bg-ink/5"
    >
      {children}
    </Pressable>
  );
}

/**
 * Bills & subscriptions: what each kind is due this month and how many plans that is, the same
 * figures the Monthly bills and Subscriptions pages show, then the next two dues with their marks.
 */
export function PlansSection({ state, plans }: { state: SectionState; plans: PlansInsight }) {
  const icons = useHomeIcons();
  const none =
    plans.bills.count === 0 && plans.subscriptions.count === 0 && plans.next.length === 0;
  const shown = state.kind === 'ready' && none ? HIDDEN : state;
  const billsLabel = t('insights.plans.bills', { count: plans.bills.count });
  const subscriptionsLabel = t('insights.plans.subscriptions', {
    count: plans.subscriptions.count,
  });

  return (
    <Section
      id="plans"
      title={t('insights.plans.heading')}
      subtitle={t('insights.plans.subtitle')}
      seeAll="/bills"
      state={shown}
    >
      <FitRows className={`${CARD} gap-[12px]`} testID="insights-plans">
        <OpenRow
          href="/bills"
          label={billsLabel}
          amount={plans.bills.total}
          testID="insights-plans-bills"
        >
          <StandRow
            id="plans-bills"
            mark={<IconWell icon={icons.bill} />}
            label={billsLabel}
            value={plans.bills.total}
            plain
          />
        </OpenRow>
        <OpenRow
          href="/subscriptions"
          label={subscriptionsLabel}
          amount={plans.subscriptions.total}
          testID="insights-plans-subscriptions"
        >
          <StandRow
            id="plans-subscriptions"
            mark={<IconWell icon={icons.subscription} />}
            label={subscriptionsLabel}
            value={plans.subscriptions.total}
            plain
          />
        </OpenRow>

        {plans.next.length > 0 ? (
          <View className="w-full">
            <Rule className="mb-[12px]" />
            <Text
              accessibilityRole="header"
              className="font-app-medium text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {t('insights.plans.nextDue')}
            </Text>
          </View>
        ) : null}

        {plans.next.map((due) => {
          const label = t('insights.plans.dueOn', {
            name: due.name,
            date: dayMonth(localDate(due.date)),
          });
          return (
            <OpenRow
              key={`${due.kind}-${due.planId}`}
              href={due.href}
              label={label}
              amount={due.amount}
              testID={`insights-due-${due.planId}`}
            >
              <StandRow
                id={`due-${due.planId}`}
                mark={
                  due.kind === 'bill' ? (
                    <BillMark
                      categoryId={due.categoryId}
                      iconId={due.iconId}
                      domain={due.domain}
                      name={due.name}
                      size={MARK}
                    />
                  ) : (
                    <BrandMark
                      name={due.name}
                      domain={due.domain}
                      hidden={due.logoHidden && !due.domain}
                      size={MARK}
                    />
                  )
                }
                label={label}
                value={due.amount}
                plain
              />
            </OpenRow>
          );
        })}
      </FitRows>
    </Section>
  );
}
