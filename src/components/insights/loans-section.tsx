import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { dayMonth } from '@/components/loans/day-month';
import { localDate } from '@/components/loans/loan-words';
import { CARD, IconWell, Rule, ShareBar, StandRow } from '@/components/insights/rows';
import { Section, type SectionState } from '@/components/insights/section';
import { FitFigure, FitRows } from '@/components/ui/fit-group';
import { loanTypeOf } from '@/data/loan-types';
import { percent, t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useGradientIcons } from '@/theme/gradient-icons';
import { useLoanTypeIcons } from '@/theme/loan-icons';
import { TEXT_CAP } from '@/theme/text-scale';

/** How many open loans the card lists; See all has the rest. */
export const LOAN_ROWS = 3;

/** An open loan's row. */
export type LoanInsightRow = {
  billId: string;
  name: string;
  /** `loan-<type>` for a loan saved with a type. */
  iconId: string | null;
  /** yyyy-mm-dd of the next payment; null with none to come. */
  nextOn: string | null;
  /** Its monthly payment. */
  payment: number;
};

/** The Loans page's summary, as `loansPageSummary` gives it. */
export type LoansInsight = {
  owed: number;
  /** Open loans. */
  count: number;
  /** Loans paid off or stopped: with none open, the card says no open loans, not none. */
  finished: number;
  /** Whole percent of what was borrowed that has been repaid. */
  percentPaid: number;
  monthly: number;
  /** Open loans, in the Loans page's order. */
  rows: readonly LoanInsightRow[];
};

function LoanMark({ iconId }: { iconId: string | null }) {
  const icons = useLoanTypeIcons();
  return <IconWell icon={icons[loanTypeOf(iconId) ?? 'other']} />;
}

/**
 * Loans: what is owed across the open loans, how much of what was borrowed is repaid, each loan's
 * next payment, and what they take a month. The figures are the Loans page's own, to the cent.
 */
export function LoansSection({ state, loans }: { state: SectionState; loans: LoansInsight }) {
  const { loans: LoansIcon } = useGradientIcons();
  const shown: SectionState =
    state.kind === 'ready' && loans.count === 0
      ? {
          kind: 'empty',
          line: t(loans.finished > 0 ? 'insights.loans.noneOpen' : 'insights.loans.empty'),
          actionLabel: t('insights.loans.add'),
          onAction: () => router.push('/add-loan'),
        }
      : state;
  const owed = formatCurrency(loans.owed);
  const countLine = t('insights.loans.count', { count: loans.count });
  const paidLine = t('insights.loans.paidOff', { percent: percent(loans.percentPaid, 0) });

  return (
    <Section
      id="loans"
      title={t('insights.loans.heading')}
      subtitle={t('insights.loans.subtitle')}
      seeAll="/loans"
      state={shown}
    >
      <View className={CARD} testID="insights-loans">
        <View
          accessible
          accessibilityLabel={t('insights.loans.totalA11y', {
            amount: owed,
            loans: countLine,
            paid: paidLine,
          })}
          className="w-full"
        >
          <View className="w-full flex-row items-center gap-[14px]">
            <View
              className="h-[44px] w-[44px]"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <LoansIcon width="100%" height="100%" />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.control}
              >
                {t('insights.loans.total')}
              </Text>
              <FitFigure id="loans-owed" size={26} className="font-app-bold text-ink">
                {owed}
              </FitFigure>
              <Text
                className="font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {countLine}
              </Text>
            </View>
          </View>
          <ShareBar share={loans.percentPaid / 100} className="mt-[14px]" />
          <Text
            className="mt-[6px] font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {paidLine}
          </Text>
        </View>

        <Rule className="mt-[14px]" />

        <FitRows className="mt-[14px] w-full gap-[12px]" testID="insights-loan-rows">
          {loans.rows.slice(0, LOAN_ROWS).map((loan) => {
            const label = loan.nextOn
              ? t('insights.loans.next', {
                  name: loan.name,
                  date: dayMonth(localDate(loan.nextOn)),
                })
              : loan.name;
            const payment = formatCurrency(loan.payment);
            return (
              <Pressable
                key={loan.billId}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${payment}`}
                onPress={() => router.push({ pathname: '/loan/[id]', params: { id: loan.billId } })}
                testID={`insights-loan-${loan.billId}`}
                className="w-full rounded-[12px] active:bg-ink/5"
              >
                <StandRow
                  id={`loan-${loan.billId}`}
                  mark={<LoanMark iconId={loan.iconId} />}
                  label={label}
                  value={loan.payment}
                  plain
                />
              </Pressable>
            );
          })}
          <StandRow
            id="loans-monthly"
            label={t('insights.loans.monthly')}
            value={loans.monthly}
            muted
            plain
          />
        </FitRows>
      </View>
    </Section>
  );
}
