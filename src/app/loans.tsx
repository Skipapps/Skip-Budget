import { router } from 'expo-router';
import { useMemo } from 'react';

import { loanTermsOf, useLoans, type LoanListRow } from '@/api/loans';
import type { LoanCardData } from '@/components/loans/loan-list-card';
import { LoansBody } from '@/components/loans/loans-body';
import type { LoansSummaryData } from '@/components/loans/loans-summary-card';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { loanFinished } from '@/lib/active-loans';
import { failureText } from '@/lib/failure';
import { loanStatus, loansSummary, type LoanStatus } from '@/lib/loan-status';
import { useToday } from '@/lib/use-today';
import { useArtwork } from '@/theme/artwork';

type PricedLoan = { row: LoanListRow; status: LoanStatus; ending: LoanCardData['ending'] };

/**
 * Where each saved loan stands today, from its own schedule. Finished is the rule the Cards tab
 * counts by (`loanFinished`); a finished loan the schedule has not paid off was stopped with money
 * still owed.
 */
function priceLoans(rows: readonly LoanListRow[], today: string): PricedLoan[] {
  const priced: PricedLoan[] = [];
  for (const row of rows) {
    const terms = loanTermsOf(row);
    if (!terms) continue;
    const status = loanStatus(terms, today);
    const ending = loanFinished(row.bill, today, status.lastPaymentOn)
      ? status.paidOff
        ? 'paid'
        : 'stopped'
      : null;
    priced.push({ row, status, ending });
  }
  return priced;
}

function cardOf({ row, status, ending }: PricedLoan): LoanCardData {
  return {
    billId: row.bill.id,
    name: row.bill.name,
    iconId: row.bill.icon_id,
    principal: status.borrowed,
    annualRate: status.annualRate,
    termMonths: row.term_months,
    startedOn: status.startedOn,
    monthly: status.monthlyPayment,
    paymentsLeft: status.paymentsLeft,
    paymentCount: status.paymentCount,
    nextOn: status.nextPayment?.date ?? null,
    left: status.amountLeft,
    paidPercent: status.percentPaid,
    ending,
    endedOn: ending === 'stopped' ? row.bill.ends_on : status.lastPaymentOn,
  };
}

/** Every loan saved from the calculator: what is owed, what goes out a month, how far along each is. */
export default function LoansScreen() {
  const { today } = useToday();
  const artwork = useArtwork();
  const { loans, isPending, isError, refetch } = useLoans(today);

  const priced = useMemo(() => priceLoans(loans, today), [loans, today]);
  const cards = useMemo(() => priced.map(cardOf), [priced]);
  const summary = useMemo((): LoansSummaryData => {
    // Every finished loan leaves the sums, the stopped ones as well as the paid off.
    const totals = loansSummary(
      priced.map((loan) => ({
        ...loan,
        status: { ...loan.status, paidOff: loan.ending !== null },
      })),
    );
    return {
      owed: totals.totalOwed,
      monthly: totals.monthlyPayments,
      borrowed: totals.totalBorrowed,
      paid: totals.totalPaid,
      percentPaid: totals.percentPaid,
      rateRange: totals.rateRange,
      count: totals.openCount,
    };
  }, [priced]);

  const openCalculator = () => router.push('/loan-calculator');

  return (
    <Screen
      title={t('loan.list.title')}
      subtitle={t('loan.list.subtitle')}
      showBack
      onRefresh={refetch}
    >
      {isPending ? <SkeletonList rows={3} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}

      {!isPending && !isError ? (
        <LoansBody
          loans={cards}
          summary={summary}
          onOpen={(billId) => router.push(`/bill/${billId}`)}
          onCalculator={openCalculator}
          // Saving a loan starts in the calculator until it has a form of its own.
          onAdd={openCalculator}
        />
      ) : null}
    </Screen>
  );
}
