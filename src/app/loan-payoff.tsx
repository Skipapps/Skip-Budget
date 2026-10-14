import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useLoanDetail, type LoanDetail } from '@/api/loans';
import { useRecordPayoff } from '@/api/mutations';
import { usePaymentSources } from '@/api/queries';
import { withSourceKept } from '@/components/loans/add/loan-form';
import { loanEnding } from '@/components/loans/loan-ending';
import { localDate } from '@/components/loans/loan-words';
import { PayoffAmountView } from '@/components/loans/payoff/payoff-amount-view';
import {
  checkPayoff,
  dayCanFix,
  payoffDays,
  quoteOn,
  type PayoffDays,
} from '@/components/loans/payoff/payoff-preview';
import { PayoffReviewView } from '@/components/loans/payoff/payoff-review-view';
import { clearsLine, payoffLine } from '@/components/loans/payoff/payoff-words';
import { pageDate, spokenDate } from '@/components/loans/view/loan-view-data';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { loanTypeOf } from '@/data/loan-types';
import { t } from '@/i18n';
import { loanPricingDay } from '@/lib/active-loans';
import { toIsoDate } from '@/lib/date';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import type { LoanTerms } from '@/lib/loan';
import { paidOffOn } from '@/lib/loan-payoff';
import { loanTermsForBill } from '@/lib/loan-start';
import { loanStatus } from '@/lib/loan-status';
import { wholeCents } from '@/lib/money';
import { draftFromAmount } from '@/lib/typed-amount';
import { useToday } from '@/lib/use-today';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';

/**
 * Paying a loan off, all of it or part of it (`?id=` its bill): the amount on the keypad, then the
 * day it was paid and where it came from. Saved, it goes back to the loan's page.
 */
export default function LoanPayoffScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const artwork = useArtwork();
  const focused = useIsFocused();
  const detail = useLoanDetail(id || undefined);

  // Read again on opening, however fresh the cache says it is: a payoff or an edit made since (on
  // another phone, or a moment ago) moves the quote and the end a partial payoff is saved with.
  const askedAgain = useRef(false);
  const { refetch } = detail;
  useEffect(() => {
    if (!id || askedAgain.current) return;
    askedAgain.current = true;
    void refetch();
  }, [id, refetch]);
  const fresh = detail.isFetchedAfterMount && !detail.isFetching && !detail.isError;
  const read = fresh ? detail.data : undefined;

  // Priced on the loan as read on opening. Saving reloads it, and a page re-priced under its own Pay
  // off would read the loan it has just paid off.
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  if (!loan && read?.kind === 'loan') setLoan(read.loan);

  // Gone on another phone, or a bill with no loan behind it: nothing to pay off here.
  const missing = !loan && (read?.kind === 'gone' || read?.kind === 'bill');
  useEffect(() => {
    if (missing && focused) goBack();
  }, [missing, focused]);

  // Its payoffs come with it, so what clears it counts every one already made.
  const terms = useMemo(() => (loan ? loanTermsForBill(loan, loan.bill) : null), [loan]);

  if (loan && terms) {
    return <PayoffOpening loan={loan} terms={terms} refreshFailed={detail.refreshFailed} />;
  }

  return (
    <Screen title={t('loanFlow.payoff.action')} showBack>
      {/* A loan read with no schedule to price cannot be paid off here either. */}
      {(detail.isError && !detail.isFetching) || loan ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void detail.refetch()}
        />
      ) : (
        <SkeletonList rows={3} />
      )}
    </Screen>
  );
}

/**
 * Only a loan still being paid can be paid off: one finished (paid off, or its bill stopped) or not
 * started yet says so instead. Asked once, on the loan as opened.
 */
function PayoffOpening({
  loan,
  terms,
  refreshFailed,
}: {
  loan: LoanDetail;
  terms: LoanTerms;
  /** A reload of the loan failed while it is priced as opened (RefreshNote). */
  refreshFailed: boolean;
}) {
  const { today } = useToday();
  const artwork = useArtwork();
  const [opening] = useState(() => {
    const status = loanStatus(terms, loanPricingDay(loan.bill, today, paidOffOn(terms)));
    const finished = loanEnding(loan.bill, status, today).ending !== null;
    return { finished, startedOn: status.startedOn, days: payoffDays(terms, today) };
  });
  const title = t('loanFlow.payoff.title', { name: loan.bill.name });

  if (!opening.finished && opening.days) {
    return (
      <PayoffFlow
        loan={loan}
        terms={terms}
        days={opening.days}
        title={title}
        refreshFailed={refreshFailed}
      />
    );
  }
  return (
    <Screen title={title} showBack>
      <PageState
        art={artwork.emptyBills}
        title={
          opening.finished
            ? t('loanFlow.payoff.finished')
            : t('loanFlow.payoff.notStarted', { date: pageDate(opening.startedOn, today) })
        }
        actionLabel={t('common.back')}
        onAction={goBack}
      />
    </Screen>
  );
}

/** A typed draft as an amount of whole cents above nothing; null for anything else. */
function amountOf(draft: string): number | null {
  const amount = Number(draft);
  const cents = draft === '' ? null : wholeCents(amount);
  return cents !== null && cents > 0 ? amount : null;
}

function PayoffFlow({
  loan,
  terms,
  days,
  title,
  refreshFailed,
}: {
  loan: LoanDetail;
  terms: LoanTerms;
  days: PayoffDays;
  title: string;
  refreshFailed: boolean;
}) {
  const { today, todayDate } = useToday();
  const toast = useToast();
  const recordPayoff = useRecordPayoff();
  const name = loan.bill.name;

  const [view, setView] = useState<'amount' | 'review'>('amount');
  const [typed, setTyped] = useState('');
  // "Pay it all" follows the day: the amount is whatever clears the loan on the day chosen.
  const [payAll, setPayAll] = useState(false);
  const [day, setDay] = useState(today);
  const [sourceId, setSourceId] = useState(loan.source?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  // Held from the press until the page is left: a second tap would record the payoff twice.
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const { sources: offered } = usePaymentSources();
  const sources = useMemo(() => withSourceKept(offered, loan.source), [offered, loan.source]);

  const quote = useMemo(() => quoteOn(terms, day), [terms, day]);
  const draft = payAll ? draftFromAmount(String(quote.payoff)) : typed;
  const amount = amountOf(draft);
  const check = useMemo(
    () => (amount === null ? null : checkPayoff(terms, { on: day, amount }, today)),
    [terms, amount, day, today],
  );
  const line = payoffLine(check, quote, name, today);

  const typeKey = (next: string) => {
    setError(null);
    setPayAll(false);
    setTyped(next);
  };

  const payItAll = () => {
    setError(null);
    setPayAll(true);
  };

  const refuse = () => {
    warn();
    AccessibilityInfo.announceForAccessibility(line.spoken);
  };

  const handleContinue = () => {
    if (amount === null) return;
    // A day that will not do is changed on the next page, where the day is; an amount, here.
    if (check && !check.ok && !dayCanFix(check.refusal, today)) {
      refuse();
      return;
    }
    setError(null);
    setView('review');
  };

  const sourceIds = () => {
    const chosen = sources.find((source) => source.id === sourceId);
    if (!chosen) return { cardId: null, bankAccountId: null };
    return chosen.kind === 'card'
      ? { cardId: chosen.id, bankAccountId: null }
      : { cardId: null, bankAccountId: chosen.id };
  };

  const handlePay = async () => {
    if (amount === null || !check || inFlight.current) return;
    if (!check.ok) {
      refuse();
      setError(line.shown);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await recordPayoff.mutateAsync({
        billId: loan.bill.id,
        paidOn: day,
        amount,
        kind: check.kind,
        ...sourceIds(),
        lastPaymentOn: check.endsOn,
        today,
      });
      success();
      toast(check.kind === 'full' ? 'toast.loan.paidOff' : 'toast.loan.paymentRecorded');
      // Back to the loan's page, which this page sits on.
      router.back();
    } catch (thrown) {
      inFlight.current = false;
      setSaving(false);
      warn();
      setError(failureMessage(thrown));
    }
  };

  if (view === 'review' && amount !== null) {
    const full = check?.ok && check.kind === 'full';
    const tooMuch = check && !check.ok && check.refusal.reason === 'more-than-owed';
    // Paid in full, the calendar starts on the last payment made, which posts first that day.
    const earliest = payAll && days.earliestFull <= today ? days.earliestFull : days.earliest;
    return (
      <PayoffReviewView
        title={title}
        name={name}
        type={loanTypeOf(loan.bill.icon_id) ?? 'other'}
        amount={amount}
        line={line}
        note={
          full && quote.interest > 0
            ? {
                shown: t('loanFlow.payoff.interestSince', {
                  amount: formatCurrency(quote.interest),
                  date: pageDate(quote.since, today),
                }),
                spoken: t('loanFlow.payoff.interestSince', {
                  amount: formatCurrency(quote.interest),
                  date: spokenDate(quote.since),
                }),
              }
            : null
        }
        offer={
          tooMuch
            ? {
                label: t('loanFlow.payoff.useAll', { amount: formatCurrency(quote.payoff) }),
                onPress: payItAll,
              }
            : null
        }
        day={localDate(day)}
        onDay={(picked) => {
          setError(null);
          setDay(toIsoDate(picked));
        }}
        todayDate={todayDate}
        earliest={localDate(earliest)}
        sources={sources}
        sourceId={sourceId}
        onSource={(id) => {
          setError(null);
          setSourceId(id);
        }}
        busy={saving}
        error={error}
        refreshFailed={refreshFailed}
        onBack={() => setView('amount')}
        onPay={() => void handlePay()}
        onChangeAmount={() => setView('amount')}
      />
    );
  }

  return (
    <PayoffAmountView
      title={title}
      draft={draft}
      onDraft={typeKey}
      line={line}
      payAll={{
        selected: payAll,
        hint: clearsLine(quote, today).spoken,
        onPress: payItAll,
      }}
      ready={amount !== null}
      refreshFailed={refreshFailed}
      onBack={() => router.back()}
      onContinue={handleContinue}
    />
  );
}
