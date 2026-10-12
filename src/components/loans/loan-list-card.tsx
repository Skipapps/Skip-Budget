import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { LoanTypeIcon } from '@/components/calculators/loan-type-icon';
import { loanAmountText, loanRateText, loanTermText } from '@/components/calculators/schedule-card';
import { dayMonth } from '@/components/loans/day-month';
import { FACT_DOTS, FactRow, FactRows, LoanBar } from '@/components/loans/loan-facts';
import { loanTermShortText, localDate, startedMonthText } from '@/components/loans/loan-words';
import { Button } from '@/components/ui/button';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { loanTypeOf } from '@/data/loan-types';
import { percent, t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

/** One saved loan as the Loans page draws it. */
export type LoanCardData = {
  /** The loan's bill: its page (/loan/[id]) is opened by this id. */
  billId: string;
  name: string;
  /** The bill's icon id: `loan-<type>` for a loan saved with a type. */
  iconId: string | null;
  /** The amount borrowed. */
  principal: number;
  annualRate: number;
  termMonths: number;
  /** yyyy-mm-dd the money was lent; its month is when the loan "started". */
  startedOn: string;
  /** The regular payment. */
  monthly: number;
  paymentsLeft: number;
  /** Every payment the schedule holds, which changes can make fewer than the term. */
  paymentCount: number;
  /** yyyy-mm-dd of the next payment; null once the last has gone. */
  nextOn: string | null;
  /** Principal still owed after the payments made. */
  left: number;
  /** Whole percent of the amount borrowed paid back. */
  paidPercent: number;
  /**
   * Null while it is being paid. 'paid' once the schedule's last payment has come; 'stopped' when
   * its bill stopped running with money still owed.
   */
  ending: 'paid' | 'stopped' | null;
  /** yyyy-mm-dd it ended: the last payment's, or the bill's end date (null when it has none). */
  endedOn: string | null;
};

/**
 * The loan's icon, name and "4 yrs · started Dec 2024", with the next payment's date on the right
 * while the name's widest word fits beside it, else under the line.
 */
function Header({ loan, nextOn }: { loan: LoanCardData; nextOn: string | null }) {
  const group = useFitGroup({ mode: 'switch' });
  const next = nextOn ? dayMonth(localDate(nextOn)) : null;

  return (
    <FitGroup
      group={group}
      className="w-full flex-row items-center gap-[12px]"
      testID={`loan-head-${loan.billId}`}
    >
      <View
        className="h-[40px] w-[40px] items-center justify-center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {/* A loan saved before loan types existed is drawn as Other. */}
        <LoanTypeIcon type={loanTypeOf(loan.iconId) ?? 'other'} size={38} />
      </View>
      <View className="min-w-0 flex-1">
        <FitText
          id={`${loan.billId}-name`}
          role="row"
          size={17}
          className="font-app-semibold text-ink"
          slotClassName="w-full"
        >
          {loan.name}
        </FitText>
        <Text
          className="mt-[2px] font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('loan.list.started', {
            term: loanTermShortText(loan.termMonths),
            date: startedMonthText(loan.startedOn),
          })}
        </Text>
        {next && !group.fits ? (
          <Text
            className="mt-[4px] font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('loan.list.next')}{' '}
            <Text className="font-app-semibold text-[15px] text-ink">{next}</Text>
          </Text>
        ) : null}
      </View>
      {next && group.fits ? (
        <View className="shrink-0 items-end">
          <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
            {t('loan.list.next')}
          </Text>
          <Text
            className="mt-[2px] font-app-semibold text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {next}
          </Text>
        </View>
      ) : null}
    </FitGroup>
  );
}

/** "$10,673.63 left" and "$424.80/mo" on one line, the monthly under the other once they cannot share it. */
function Figures({ loan }: { loan: LoanCardData }) {
  const group = useFitGroup({ mode: 'switch' });
  const [wordWidth, setWordWidth] = useState(0);
  const beside = group.fits;

  return (
    <FitGroup
      group={group}
      className={
        beside
          ? 'mt-[14px] w-full flex-row items-baseline justify-between gap-3'
          : 'mt-[14px] w-full items-start'
      }
      testID={`loan-figures-${loan.billId}`}
    >
      <FitText
        id={`${loan.billId}-left`}
        role="figure"
        size={24}
        whole
        className="font-app-bold text-ink"
        slotClassName={
          beside
            ? 'min-w-0 flex-1 flex-row items-baseline'
            : 'w-full flex-row flex-wrap items-baseline'
        }
        reserve={wordWidth}
        after={
          <Text
            testID={`loan-left-word-${loan.billId}`}
            onLayout={(event) => setWordWidth(Math.ceil(event.nativeEvent.layout.width))}
            className="shrink-0 pl-[6px] font-app text-[15px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('loan.list.leftWord')}
          </Text>
        }
      >
        {formatCurrency(loan.left)}
      </FitText>
      <FitText
        id={`${loan.billId}-monthly`}
        hug
        role="figure"
        size={15}
        className="font-app-semibold text-ink"
        slotClassName={beside ? 'shrink-0' : 'mt-[4px]'}
      >
        {t('loan.list.perMonth', { amount: formatCurrency(loan.monthly) })}
      </FitText>
    </FitGroup>
  );
}

/**
 * The card's words are read out as one summary; View details is its only control, so the card is
 * not a second way into the same page.
 */
function Card({
  loan,
  spoken,
  onOpen,
  children,
}: {
  loan: LoanCardData;
  spoken: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <View
      testID={`loan-card-${loan.billId}`}
      className="w-full rounded-[20px] border border-line bg-card p-[20px]"
    >
      <View accessible accessibilityLabel={spoken}>
        {children}
      </View>
      <Button
        className="mt-[16px]"
        size="compact"
        label={t('loan.list.viewDetails')}
        accessibilityLabel={t('loan.list.viewDetailsA11y', { name: loan.name })}
        accessibilityHint={t('loan.list.openHint')}
        onPress={onOpen}
      />
    </View>
  );
}

function startedSpoken(loan: LoanCardData): string {
  return t('loan.list.startedA11y', {
    term: loanTermText(loan.termMonths),
    date: startedMonthText(loan.startedOn),
  });
}

/** A loan still being paid: what is left, what it costs a month, how far along it is. */
export function LoanListCard({ loan, onOpen }: { loan: LoanCardData; onOpen: () => void }) {
  const paid = percent(loan.paidPercent, 0);
  const spoken = [
    t('loan.list.cardA11y', {
      name: loan.name,
      left: formatCurrency(loan.left),
      monthly: formatCurrency(loan.monthly),
      percent: paid,
      base: loanAmountText(loan.principal),
      rate: loanRateText(loan.annualRate),
    }),
    startedSpoken(loan),
    t('loan.list.paymentsA11y', { left: loan.paymentsLeft, count: loan.paymentCount }),
    loan.nextOn ? t('loan.list.nextA11y', { date: formatFullDate(localDate(loan.nextOn)) }) : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Card loan={loan} spoken={spoken} onOpen={onOpen}>
      <Header loan={loan} nextOn={loan.nextOn} />
      <Figures loan={loan} />
      <LoanBar
        percent={loan.paidPercent}
        className="mt-[14px]"
        testID={`loan-progress-${loan.billId}`}
      />
      <Text
        className="mt-[8px] font-app text-[12px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {t('loan.list.paidPercent', { percent: paid })}
      </Text>
      <FactRows className="mt-[14px]" testID={`loan-facts-${loan.billId}`}>
        <FactRow
          id="base"
          dot={FACT_DOTS.first}
          label={t('loan.list.base')}
          value={loanAmountText(loan.principal)}
        />
        <FactRow
          id="rate"
          dot={FACT_DOTS.second}
          label={t('loan.rate')}
          value={loanRateText(loan.annualRate)}
        />
        <FactRow
          id="left"
          dot={FACT_DOTS.third}
          label={t('loan.list.left')}
          value={t('loan.list.paymentsOf', { left: loan.paymentsLeft, count: loan.paymentCount })}
        />
      </FactRows>
    </Card>
  );
}

/**
 * A finished loan: paid off, or stopped with money still owed, which says so and keeps the amount
 * in sight. Listed below the open loans and out of the totals.
 */
export function FinishedCard({ loan, onOpen }: { loan: LoanCardData; onOpen: () => void }) {
  const date = loan.endedOn ? formatFullDate(localDate(loan.endedOn)) : null;
  const amount = formatCurrency(loan.left);
  const name = loan.name;

  const [line, said] =
    loan.ending === 'paid'
      ? [
          t('loan.list.paidOffOn', { date: date ?? '—' }),
          t('loan.list.paidOffA11y', { name, date: date ?? '—' }),
        ]
      : date
        ? [
            t('loan.list.stoppedOn', { date, amount }),
            t('loan.list.stoppedA11y', { name, date, amount }),
          ]
        : [t('loan.list.stopped', { amount }), t('loan.list.stoppedNoDateA11y', { name, amount })];

  return (
    <Card loan={loan} spoken={`${said} ${startedSpoken(loan)}`} onOpen={onOpen}>
      <Header loan={loan} nextOn={null} />
      <Text
        className="mt-[14px] font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {line}
      </Text>
    </Card>
  );
}
