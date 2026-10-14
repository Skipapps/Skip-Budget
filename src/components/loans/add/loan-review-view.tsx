import { Text, View } from 'react-native';

import { LoanSummaryLine } from '@/components/calculators/loan-result-card';
import { LoanTypeIcon } from '@/components/calculators/loan-type-icon';
import { unusedNote } from '@/components/calculators/override-words';
import {
  ScheduleLink,
  loanAmountText,
  loanRateText,
  loanTermText,
} from '@/components/calculators/schedule-card';
import { RemindMeCard } from '@/components/flow/remind-me-card';
import { LoanFlowFooter, LoanFlowPage } from '@/components/loans/add/loan-flow-page';
import { localDate } from '@/components/loans/loan-words';
import { FitFigure, FitRows } from '@/components/ui/fit-group';
import { SwitchControl } from '@/components/ui/switch-control';
import type { LoanType } from '@/data/loan-types';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import type { AccrualBasis } from '@/lib/loan';
import type { LoanReviewFigures } from '@/lib/loan-review';
import type { LeadDays } from '@/lib/reminder-words';
import { TEXT_CAP } from '@/theme/text-scale';

/** Said only for a convention other than the app's daily one, which needs no note. */
function basisLine(basis: AccrualBasis): string | null {
  switch (basis) {
    case 'actual/365':
      return null;
    case 'actual/360':
      return t('loan.calculator.interestLine.actual360');
    case 'monthly':
      return t('loan.calculator.interestLine.monthly');
    case '30/360':
      return t('loan.calculator.interestLine.thirty360');
  }
}

/** "First payment …" before any is made, then the next one, then the last once all are behind. */
function whenLine(figures: LoanReviewFigures): string {
  if (figures.paymentsMade === 0) {
    return t('loanFlow.firstPayment', {
      date: formatFullDate(localDate(figures.firstPaymentOn)),
    });
  }
  if (figures.nextPayment) {
    return t('loanFlow.review.nextPayment', {
      date: formatFullDate(localDate(figures.nextPayment.date)),
    });
  }
  return t('loanFlow.review.lastPayment', { date: formatFullDate(localDate(figures.payoffOn)) });
}

export type ReviewReminder = {
  on: boolean;
  onToggle: (on: boolean) => void;
  lead: LeadDays;
  onLead: (lead: LeadDays) => void;
  caption: string;
  /** Why there is nothing to remind about; the switch is then off and cannot be turned on. */
  unavailable: string | null;
};

/**
 * The loan as it will be saved, every figure from the same schedule the Loans page reads back, then
 * the two choices that go with it and the way into its schedule. Save is pinned.
 */
export function LoanReviewView({
  title = t('loanFlow.review.title'),
  saveLabel = t('loanFlow.review.save'),
  name,
  type,
  figures,
  inSpending,
  onInSpending,
  inSpendingLocked = false,
  reminder,
  onOpenSchedule,
  onSave,
  busy,
  error,
  root,
  onBack,
  onBackToEdit,
  closePrompt,
}: {
  title?: string;
  saveLabel?: string;
  name: string;
  type: LoanType;
  figures: LoanReviewFigures;
  inSpending: boolean;
  onInSpending: (on: boolean) => void;
  /** Once the loan is filed the choice is saved with it, and Save again would not write a change. */
  inSpendingLocked?: boolean;
  reminder: ReviewReminder;
  onOpenSchedule: () => void;
  onSave: () => void;
  busy: boolean;
  error: string | null;
  root: boolean;
  onBack: () => void;
  /** Left out once the loan is saved: there is nothing left to edit here. */
  onBackToEdit?: () => void;
  closePrompt?: string;
}) {
  const borrowed = loanAmountText(figures.save.principal);
  const when = whenLine(figures);
  const rows = [
    { id: 'monthly', label: t('loan.list.monthly'), value: formatCurrency(figures.monthlyPayment) },
    { id: 'rate', label: t('loan.interestRate'), value: loanRateText(figures.save.annualRate) },
    {
      id: 'term',
      label: t('loan.termLabel'),
      value: t('loanFlow.review.termCount', {
        term: loanTermText(figures.termMonths),
        count: figures.paymentCount,
      }),
      spoken: t('loanFlow.review.termCountA11y', {
        term: loanTermText(figures.termMonths),
        count: figures.paymentCount,
      }),
    },
    {
      id: 'interest',
      label: t('loan.totalInterest'),
      value: formatCurrency(figures.totalInterest),
    },
    {
      id: 'total',
      label: t('loanFlow.review.totalPaid'),
      value: formatCurrency(figures.totalPaid),
    },
  ];
  const balloon = figures.balloon
    ? t('loan.calculator.balloon', { amount: formatCurrency(figures.finalPayment) })
    : null;
  const spoken = [
    name,
    when,
    t('entry.row.spoken', { label: t('loanFlow.field.borrowed'), value: borrowed }),
    ...rows.map((row) =>
      t('entry.row.spoken', { label: row.label, value: row.spoken ?? row.value }),
    ),
    balloon,
  ]
    .filter(Boolean)
    .join('. ');

  const dropped = figures.dropped
    .map((problem) => problem.payment)
    .filter((payment): payment is number => typeof payment === 'number');
  const notes = [
    dropped.length > 0
      ? t('loanFlow.review.dropped', { count: dropped.length, numbers: dropped.join(', ') })
      : null,
    unusedNote(figures.unused),
    basisLine(figures.save.dayCountBasis),
  ].filter((note): note is string => Boolean(note));

  return (
    <LoanFlowPage
      title={title}
      onBack={onBack}
      closePrompt={closePrompt}
      root={root}
      footer={
        <LoanFlowFooter
          error={error}
          label={busy ? t('loan.save.saving') : saveLabel}
          onPress={onSave}
          disabled={busy}
          secondary={
            onBackToEdit
              ? { label: t('loanFlow.review.backToEdit'), onPress: onBackToEdit }
              : undefined
          }
        />
      }
    >
      <View
        className="mt-2 w-full rounded-[20px] border border-line bg-card p-[20px]"
        testID="loan-review-card"
      >
        <View accessible accessibilityLabel={spoken}>
          <View className="w-full flex-row items-center gap-[12px]">
            <View
              className="h-[40px] w-[40px] items-center justify-center"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <LoanTypeIcon type={type} size={38} />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="font-app-semibold text-[17px] text-ink"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {name}
              </Text>
              <Text
                className="mt-[2px] font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {when}
              </Text>
            </View>
          </View>

          <FitFigure
            id="loan-review-borrowed"
            size={36}
            lineHeight={44}
            className="font-app-bold text-ink"
            boxClassName="mt-[18px]"
          >
            {borrowed}
          </FitFigure>
          <Text
            className="mt-[2px] font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('loanFlow.field.borrowed')}
          </Text>

          <View className="my-[16px] h-px w-full bg-line" />

          <FitRows className="w-full gap-[14px]" testID="loan-review-rows">
            {rows.map((row) => (
              <LoanSummaryLine key={row.id} id={row.id} label={row.label} value={row.value} />
            ))}
          </FitRows>

          {balloon ? (
            <Text
              className="mt-4 font-app-medium text-[13px] leading-[18px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {balloon}
            </Text>
          ) : null}
        </View>
      </View>

      {notes.map((note) => (
        <Text
          key={note}
          className="mt-3 w-full px-1 font-app text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {note}
        </Text>
      ))}

      <View className="mt-4 w-full rounded-[16px] border border-line bg-card p-[14px]">
        <View className="w-full flex-row items-center gap-[12px]">
          <View className="min-w-0 flex-1">
            <Text
              className="font-app-semibold text-[15px] text-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {t('loanFlow.review.inBills')}
            </Text>
            <Text
              className="mt-0.5 font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {inSpending ? t('loanFlow.review.inBillsOn') : t('loanFlow.review.inBillsOff')}
            </Text>
          </View>
          <SwitchControl
            value={inSpending}
            onValueChange={onInSpending}
            disabled={inSpendingLocked}
            accessibilityLabel={t('loanFlow.review.inBills')}
          />
        </View>
      </View>

      <View className="mt-4 w-full">
        <RemindMeCard
          on={reminder.on}
          onToggle={reminder.onToggle}
          lead={reminder.lead}
          onLead={reminder.onLead}
          caption={reminder.caption}
          unavailable={reminder.unavailable}
        />
      </View>

      <View className="mb-4 mt-4 w-full">
        <ScheduleLink count={figures.paymentCount} onPress={onOpenSchedule} />
      </View>
    </LoanFlowPage>
  );
}
