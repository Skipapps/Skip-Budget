import { Pressable, Text, View } from 'react-native';

import type { LoanEnding } from '@/components/loans/loan-ending';
import {
  PaidLine,
  PlanMark,
  fullDateText,
  planRecurrence,
} from '@/components/payments/plan-month-row';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import type { StoppedPlanRow } from '@/lib/bill-month';
import { formatCurrency } from '@/lib/format';
import { isLoanBill } from '@/lib/ledger-link';
import { withTap } from '@/lib/press';
import { TEXT_CAP } from '@/theme/text-scale';

/** How a finished loan ended, by the Loans page's rule (`endingOfTerms`). */
export type LoanEndingInfo = { ending: LoanEnding; endedOn: string | null };

/**
 * What a plan that no longer runs says in place of how often and from where, and how VoiceOver reads
 * it: a loan paid off says so; any other bill says when it stopped; a subscription when it last
 * charged. A stopped loan takes the loan's own words: Spanish and French agree "stopped" with it.
 */
export function stoppedWords(
  row: Pick<StoppedPlanRow, 'kind' | 'categoryId' | 'stoppedOn' | 'lastCharged'>,
  loan?: LoanEndingInfo | null,
): { shown: string; spoken: string } {
  const same = (words: string) => ({ shown: words, spoken: words });
  if (row.kind === 'subscription') {
    if (!row.lastCharged) return same(t('subscriptions.cancelled'));
    const date = fullDateText(row.lastCharged);
    return {
      shown: t('subscriptions.cancelledLastCharged', { date }),
      spoken: t('subscriptions.cancelledLastChargedA11y', { date }),
    };
  }
  if (loan?.ending === 'paid') {
    return same(
      loan.endedOn
        ? t('payments.stopped.paidOffOn', { date: fullDateText(loan.endedOn) })
        : t('payments.status.paidOff'),
    );
  }
  const loanBill = isLoanBill(row.categoryId);
  if (!row.stoppedOn) return same(t(loanBill ? 'bills.loanStopped' : 'bills.stopped'));
  return same(
    t(loanBill ? 'bills.loanStoppedOn' : 'bills.stoppedOn', { date: fullDateText(row.stoppedOn) }),
  );
}

type StoppedRowProps = {
  row: StoppedPlanRow;
  sourceLabel: string | null;
  /** Set for a loan's bill once the loans are read. */
  loan?: LoanEndingInfo | null;
  onOpen: () => void;
};

/**
 * A stopped bill or cancelled subscription, under the running ones. Charged in the month before it
 * stopped, it shows that month's amount as paid, which the card counted; otherwise one payment, with
 * nothing to pay. Its page is read-only, so there is no "Add a card".
 */
export function StoppedRow({ row, sourceLabel, loan, onOpen }: StoppedRowProps) {
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const amount = formatCurrency(row.amount);
  const paid = row.occurrences.length > 0;
  const status = stoppedWords(row, loan);

  const figure = (
    <FitText
      id="amount"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      slotClassName={stacked ? 'mt-0.5' : undefined}
    >
      {amount}
    </FitText>
  );

  return (
    <FitGroup group={words} className="w-full">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('payments.planRow.a11y', {
          name: row.name,
          amount,
          recurrence: planRecurrence(row.kind, row.recurrence),
          source: sourceLabel ?? t('payments.cardNotSet'),
          status: paid ? `${status.spoken}, ${t('payments.status.paid')}` : status.spoken,
        })}
        onPress={withTap(onOpen)}
        testID={`stopped-row-${row.planId}`}
        className="w-full flex-row items-center gap-3 px-[16px] py-[14px] active:bg-ink/5"
      >
        <PlanMark {...row} />

        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="name"
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName="w-full"
          >
            {row.name}
          </FitText>
          {stacked ? figure : null}
          <Text
            className="mt-0.5 font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {status.shown}
          </Text>
          {stacked && paid ? <PaidLine /> : null}
        </View>

        {stacked ? null : (
          <View className="shrink-0 items-end">
            {figure}
            {paid ? <PaidLine /> : null}
          </View>
        )}
      </Pressable>
    </FitGroup>
  );
}
