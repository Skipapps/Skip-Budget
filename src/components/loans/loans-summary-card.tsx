import { Image, Text, View } from 'react-native';

import { loanAmountText } from '@/components/calculators/schedule-card';
import {
  FACT_DOTS,
  FactRow,
  FactRows,
  LoanBar,
  type FactTone,
} from '@/components/loans/loan-facts';
import { rateRangeSpoken, rateRangeText, type RateRange } from '@/components/loans/loan-words';
import { FitFigure, FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { percent, t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import { useTheme } from '@/providers/theme-provider';
import type { Scheme, Tokens } from '@/theme/palette';
import { YOUR_LOANS_IMAGE } from '@/theme/loan-icons';
import { shadows } from '@/theme/shadows';
import { TEXT_CAP } from '@/theme/text-scale';

/** The open loans' totals. Finished loans are in none of them. */
export type LoansSummaryData = {
  /** Σ still owed. */
  owed: number;
  /** Σ regular payments. */
  monthly: number;
  /** Σ amounts borrowed. */
  borrowed: number;
  /** Σ repaid: borrowed less owed. */
  paid: number;
  /** Whole percent of what was borrowed that has been repaid. */
  percentPaid: number;
  /** Lowest and highest rate; null with no open loan. */
  rateRange: RateRange | null;
  /** Open loans. */
  count: number;
};

export type SummaryTone = FactTone & {
  card: string;
  border: string;
  fill: string;
  track: string;
};

/**
 * The card is navy in both modes, as drawn: pale blue with navy type in light, navy with the page's
 * off-white in dark. Every text pair clears 4.5:1.
 */
export function summaryTone(scheme: Scheme, colors: Tokens): SummaryTone {
  return scheme === 'dark'
    ? {
        card: '#16213F',
        border: '#242E4B',
        ink: colors.ink,
        muted: '#A9B4D0',
        line: '#29334E',
        fill: '#8EA2E8',
        track: colors.card,
      }
    : {
        card: '#EFF7FF',
        border: '#E6EAF2',
        ink: '#10245A',
        muted: '#5B6478',
        line: '#ECE8E4',
        fill: '#062554',
        track: colors.card,
      };
}

/** What every open loan comes to: owed, a month, repaid so far, the rates and how many. */
export function LoansSummaryCard({ summary }: { summary: LoansSummaryData }) {
  const { scheme, colors } = useTheme();
  const tone = summaryTone(scheme, colors);
  const paid = percent(summary.percentPaid, 0);
  // With only finished loans there is nothing a month and nothing to be paid off: the card keeps
  // its $0.00 and says nothing more, rather than "0% paid off · $0.00 of $0".
  const anyOpen = summary.count > 0;
  const spoken = [
    t('loan.list.summaryA11y', { total: formatCurrency(summary.owed), count: summary.count }),
    anyOpen
      ? t('loan.list.summaryPaidA11y', {
          monthly: formatCurrency(summary.monthly),
          percent: paid,
          paid: formatCurrency(summary.paid),
          base: loanAmountText(summary.borrowed),
        })
      : null,
    summary.rateRange ? rateRangeSpoken(summary.rateRange) : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View
      testID="loans-summary"
      accessible
      accessibilityLabel={spoken}
      className="mt-[16px] w-full rounded-[20px] border p-[20px]"
      style={[
        { backgroundColor: tone.card, borderColor: tone.border },
        scheme === 'light' ? shadows.card : null,
      ]}
    >
      <View className="w-full flex-row items-center gap-[12px]">
        <Image
          testID="loans-summary-icon"
          source={YOUR_LOANS_IMAGE}
          style={{ width: 40, height: 40 }}
          accessibilityIgnoresInvertColors
        />
        <Text
          className="shrink font-app-semibold text-[17px]"
          style={{ color: tone.ink }}
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {t('loan.list.yours')}
        </Text>
      </View>

      <FitFigure
        id="loans-owed"
        size={36}
        className="font-app-bold"
        style={{ color: tone.ink }}
        boxClassName="mt-[12px]"
      >
        {formatCurrency(summary.owed)}
      </FitFigure>
      <Text
        className="mt-[2px] font-app text-[13px]"
        style={{ color: tone.muted }}
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {t('loan.list.across', { count: summary.count })}
      </Text>

      {anyOpen ? (
        <>
          <View className="my-[16px] h-px w-full" style={{ backgroundColor: tone.line }} />

          <MonthlyLine amount={summary.monthly} tone={tone} />
          <LoanBar
            percent={summary.percentPaid}
            fill={tone.fill}
            track={tone.track}
            className="mt-[12px]"
            testID="loans-summary-progress"
          />
          <Text
            className="mt-[8px] font-app text-[12px]"
            style={{ color: tone.muted }}
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('loan.list.paidOfBase', {
              percent: paid,
              paid: formatCurrency(summary.paid),
              base: loanAmountText(summary.borrowed),
            })}
          </Text>

          <FactRows className="mt-[14px]" testID="loans-summary-facts">
            <FactRow
              id="base"
              dot={FACT_DOTS.first}
              label={t('loan.list.base')}
              value={loanAmountText(summary.borrowed)}
              tone={tone}
            />
            <FactRow
              id="rate"
              dot={FACT_DOTS.second}
              label={t('loan.rate')}
              value={summary.rateRange ? rateRangeText(summary.rateRange) : '—'}
              tone={tone}
            />
            <FactRow
              id="active"
              dot={FACT_DOTS.third}
              label={t('loan.list.active')}
              value={t('loan.list.loans', { count: summary.count })}
              tone={tone}
            />
          </FactRows>
        </>
      ) : null}
    </View>
  );
}

/** "Monthly" and the open loans' payments a month, the figure under the word once they cannot share a line. */
function MonthlyLine({ amount, tone }: { amount: number; tone: SummaryTone }) {
  const group = useFitGroup({ mode: 'switch' });
  const stacked = !group.fits;
  return (
    <FitGroup
      group={group}
      className={
        stacked ? 'w-full items-start' : 'w-full flex-row items-center justify-between gap-3'
      }
      testID="loans-summary-monthly"
    >
      <FitText
        id="monthly-label"
        role="row"
        size={15}
        className="font-app-semibold"
        style={{ color: tone.ink }}
        slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
      >
        {t('loan.list.monthly')}
      </FitText>
      <FitText
        id="monthly-value"
        hug
        role="row"
        size={15}
        className="font-app-semibold"
        style={{ color: tone.ink }}
        slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
      >
        {formatCurrency(amount)}
      </FitText>
    </FitGroup>
  );
}
