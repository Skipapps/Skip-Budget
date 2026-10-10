import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LoanTypeIcon } from '@/components/calculators/loan-type-icon';
import { loanAmountText, loanRateText, loanTermText } from '@/components/calculators/schedule-card';
import { SummaryGrid } from '@/components/calculators/summary-grid';
import { dayMonth } from '@/components/loans/day-month';
import { loanTypeOf } from '@/data/loan-types';
import { percent, t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** One saved loan as the Loans page draws it. */
export type LoanCardData = {
  /** The loan's bill, which its card opens. */
  billId: string;
  name: string;
  /** The bill's icon id: `loan-<type>` for a loan saved with a type. */
  iconId: string | null;
  principal: number;
  annualRate: number;
  termMonths: number;
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

const asDate = (iso: string) => new Date(`${iso}T00:00:00`);

function Header({ loan }: { loan: LoanCardData }) {
  const colors = useColors();
  return (
    <View className="w-full flex-row items-center gap-[12px]">
      <View
        className="h-[40px] w-[40px] items-center justify-center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {/* A loan saved before loan types existed is drawn as Other. */}
        <LoanTypeIcon type={loanTypeOf(loan.iconId) ?? 'other'} size={36} />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="font-app-semibold text-[16px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {loan.name}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('loan.list.facts', {
            amount: loanAmountText(loan.principal),
            rate: loanRateText(loan.annualRate),
            term: loanTermText(loan.termMonths),
          })}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </View>
  );
}

function Card({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('loan.list.openHint')}
      onPress={onPress}
      className="w-full rounded-[20px] border border-line bg-card p-[18px] active:bg-ink/5"
    >
      {children}
    </Pressable>
  );
}

/** A loan still being paid: what it costs a month, how far along it is, what is left. */
export function LoanListCard({ loan, onPress }: { loan: LoanCardData; onPress: () => void }) {
  const paid = percent(loan.paidPercent, 0);
  const left = formatCurrency(loan.left);
  const next = loan.nextOn ? dayMonth(asDate(loan.nextOn)) : '—';

  return (
    <Card
      onPress={onPress}
      label={t('loan.list.cardA11y', {
        name: loan.name,
        monthly: formatCurrency(loan.monthly),
        left: loan.paymentsLeft,
        count: loan.paymentCount,
        date: loan.nextOn ? formatFullDate(asDate(loan.nextOn)) : '—',
        percent: paid,
        amount: left,
      })}
    >
      <Header loan={loan} />
      <View className="mt-[16px] w-full">
        <SummaryGrid
          columns={3}
          testID={`loan-figures-${loan.billId}`}
          items={[
            { id: 'monthly', label: t('loan.list.monthly'), value: formatCurrency(loan.monthly) },
            {
              id: 'left',
              label: t('loan.list.paymentsLeft'),
              value: t('loan.list.leftOf', { left: loan.paymentsLeft, count: loan.paymentCount }),
            },
            { id: 'next', label: t('loan.list.next'), value: next },
          ]}
        />
      </View>
      <View
        className="mt-[14px] h-[6px] w-full overflow-hidden rounded-full bg-ink/10"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View
          testID={`loan-progress-${loan.billId}`}
          style={{ width: `${Math.min(100, Math.max(0, loan.paidPercent))}%` }}
          className="h-full rounded-full bg-accent"
        />
      </View>
      <Text className="mt-2 font-app text-[11px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
        {t('loan.list.progress', { percent: paid, amount: left })}
      </Text>
    </Card>
  );
}

/**
 * A finished loan: paid off, or stopped with money still owed, which says so and keeps the amount
 * in sight. Listed below the open loans and out of the totals.
 */
export function FinishedCard({ loan, onPress }: { loan: LoanCardData; onPress: () => void }) {
  const date = loan.endedOn ? formatFullDate(asDate(loan.endedOn)) : null;
  const amount = formatCurrency(loan.left);
  const name = loan.name;

  const [line, spoken] =
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
    <Card onPress={onPress} label={spoken}>
      <Header loan={loan} />
      <Text
        className="mt-[12px] font-app text-[12px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {line}
      </Text>
    </Card>
  );
}
