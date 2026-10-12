import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { useSaveLoan } from '@/api/mutations';
import { usePaymentSources } from '@/api/queries';
import { useApplyReminder } from '@/api/reminders';
import { LoanDetailsView } from '@/components/loans/add/loan-details-view';
import {
  TERM_YEARS_MAX,
  emptyLoanForm,
  loanFormFromCalculator,
  loanName,
  missingFields,
  reviewFieldsOf,
  termMonthsOf,
  type LoanForm,
} from '@/components/loans/add/loan-form';
import { LoanKeypadView } from '@/components/loans/add/loan-keypad-view';
import { loanReminderOn } from '@/components/loans/add/loan-reminder';
import { LoanReviewView } from '@/components/loans/add/loan-review-view';
import { loanTypeIconId } from '@/data/loan-types';
import { percent, t } from '@/i18n';
import { failureMessage } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { paymentDates } from '@/lib/loan';
import { refusedLoanSave } from '@/lib/loan-refusal';
import { loanReview, type LoanReviewRefusal } from '@/lib/loan-review';
import { SAVABLE_RATE_MAX, readLoanRoute, type LoanRouteParams } from '@/lib/loan-route';
import { finishFlowOn } from '@/lib/nav';
import { billReminderCaption, type LeadDays } from '@/lib/reminder-words';
import { useToday } from '@/lib/use-today';
import { useToast } from '@/providers/toast-context';

/**
 * The pages of one loan: the keypad it starts on, its details, the review it is saved from, and
 * the keypad again for a figure the details page sends back to change.
 */
type LoanView = 'amount' | 'details' | 'review' | 'paymentEdit' | 'principalEdit';

/** New cards and accounts remind three days ahead; a loan does too. */
const DEFAULT_LEAD: LeadDays = 3;

const rateRange = () =>
  t('loan.save.rateOutOfRange', { min: percent(0, 0), max: percent(SAVABLE_RATE_MAX, 0) });

/**
 * Opens on the keypad from the Loans page, or on the details from the calculator's Save
 * (`view=details` with its loan as params), filled in.
 */
export default function AddLoanScreen() {
  const params = useLocalSearchParams<LoanRouteParams & { view?: string }>();
  // Read once: the pages change the form, never the link.
  const [opening] = useState(() =>
    params.view === 'details'
      ? { view: 'details' as const, form: loanFormFromCalculator(readLoanRoute(params)) }
      : { view: 'amount' as const, form: emptyLoanForm() },
  );
  return <AddLoanFlow initialView={opening.view} initialForm={opening.form} />;
}

function AddLoanFlow({
  initialView,
  initialForm,
}: {
  initialView: 'amount' | 'details';
  initialForm: LoanForm;
}) {
  const [view, setView] = useState<LoanView>(initialView);
  const [form, setForm] = useState<LoanForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [inSpending, setInSpending] = useState(true);
  const [reminderOn, setReminderOn] = useState(true);
  const [lead, setLead] = useState<LeadDays>(DEFAULT_LEAD);
  // Outlives the details page while a keypad page is open, so coming back lands where it was.
  const [detailsY, setDetailsY] = useState(0);
  // The loan's bill once save_loan has filed it: a Save pressed again after a failed reminder
  // writes the reminder alone, never a second loan.
  const [savedId, setSavedId] = useState<string | null>(null);
  // Held from the press until the page is left, the reminder write included: a second tap in that
  // time would toast and navigate twice. The ref answers within the same frame.
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const { today, todayDate } = useToday();
  const { sources } = usePaymentSources();
  const saveLoan = useSaveLoan();
  const applyReminder = useApplyReminder();
  const toast = useToast();

  // Priced only on the page that shows it; the details page asks on Continue.
  const review = useMemo(
    () => (view === 'review' ? loanReview(reviewFieldsOf(form), today) : null),
    [view, form, today],
  );
  const figures = review?.ok ? review : null;

  const change = (patch: Partial<LoanForm>) => {
    setError(null);
    setForm((current) => ({ ...current, ...patch }));
  };

  const toDetails = () => {
    setError(null);
    setView('details');
  };

  const refusalLine = (refusal: LoanReviewRefusal): string => {
    switch (refusal.reason) {
      case 'fields':
        return t('loanFlow.details.missing', {
          fields: missingFields(form, refusal.fields).join(', '),
        });
      case 'rate':
        return rateRange();
      case 'payment':
        return t('loanFlow.details.paymentTooLow', {
          minimum: formatCurrency(refusal.problem.minimum ?? 0),
        });
    }
  };

  const handleContinue = () => {
    const fields = reviewFieldsOf(form);
    const tooLong = termMonthsOf(form) > TERM_YEARS_MAX * 12;
    // A slip like 999 years is never priced, only asked what else is missing.
    const checked = loanReview(tooLong ? { ...fields, termMonths: 1 } : fields, today);
    const missing = missingFields(form, checked.ok ? [] : fieldsOf(checked.refusal));
    let problem: string | null = null;
    if (missing.length > 0) {
      problem = t('loanFlow.details.missing', { fields: missing.join(', ') });
    } else if (tooLong) {
      problem = t('loanFlow.term.tooLong', { years: TERM_YEARS_MAX });
    } else if (!checked.ok) {
      problem = refusalLine(checked.refusal);
    }
    if (problem) {
      warn();
      setError(problem);
      return;
    }
    setError(null);
    setView('review');
  };

  const dueDates = figures
    ? paymentDates(figures.terms.firstPaymentOn, figures.paymentCount, figures.terms.paymentDay)
    : [];
  const remindOn = figures ? loanReminderOn(dueDates, lead, today) : null;
  const reminderLive = reminderOn && remindOn !== null;

  const leaveSaved = () => {
    success();
    toast('toast.loan.saved');
    finishFlowOn('/loans');
  };

  const fileLoan = async (
    type: NonNullable<LoanForm['type']>,
    priced: NonNullable<typeof figures>,
  ): Promise<string> => {
    const chosen = sources.find((source) => source.id === form.sourceId);
    const saved = await saveLoan.mutateAsync({
      name: loanName(form).trim(),
      iconId: loanTypeIconId(type),
      principal: priced.save.principal,
      annualRate: priced.save.annualRate,
      termMonths: priced.save.termMonths,
      monthlyPayment: priced.save.monthlyPayment,
      totalInterest: priced.save.totalInterest,
      firstPaymentOn: priced.save.firstPaymentOn,
      fundedOn: priced.save.fundedOn,
      dayCountBasis: priced.save.dayCountBasis,
      cardId: chosen?.kind === 'card' ? chosen.id : null,
      bankAccountId: chosen?.kind === 'account' ? chosen.id : null,
      paymentOverrides: priced.save.paymentOverrides,
      lastPaymentOn: priced.save.lastPaymentOn,
      paymentDay: priced.save.paymentDay,
      inSpending,
      // Payments made before today happened before the loan was added: not this app's spending.
      countsFrom: today,
    });
    return saved.id;
  };

  const handleSave = async () => {
    if (!figures || !form.type || form.sourceId === null || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const billId = savedId ?? (await fileLoan(form.type, figures));
      setSavedId(billId);
      if (reminderLive) await applyReminder('bill', billId, lead);
      leaveSaved();
    } catch (thrown) {
      inFlight.current = false;
      setSaving(false);
      warn();
      switch (refusedLoanSave(thrown)) {
        case 'payments':
          setError(t('loan.save.refusedPayments'));
          break;
        case 'lastPayment':
          setError(t('loan.save.refusedLastPayment'));
          break;
        case 'rate':
          setError(rateRange());
          break;
        default:
          setError(failureMessage(thrown));
      }
    }
  };

  const isRoot = view === initialView;
  const closePrompt = t('loanFlow.close');

  if (view === 'amount') {
    return (
      <LoanKeypadView
        title={t('loan.list.add')}
        question={t('loanFlow.monthly.question')}
        helper={t('loanFlow.monthly.helper')}
        value={form.monthly}
        root={isRoot}
        onBack={() => router.back()}
        closePrompt={closePrompt}
        primaryLabel={t('common.continue')}
        onDone={(monthly) => {
          change({ monthly });
          setView('details');
        }}
      />
    );
  }

  if (view === 'paymentEdit' || view === 'principalEdit') {
    const monthly = view === 'paymentEdit';
    return (
      <LoanKeypadView
        key={view}
        title={monthly ? t('loan.monthlyPayment') : t('loanFlow.field.borrowed')}
        question={monthly ? t('loanFlow.monthly.question') : t('loanFlow.borrowed.question')}
        helper={monthly ? t('loanFlow.monthly.helper') : t('loanFlow.borrowed.helper')}
        value={monthly ? form.monthly : form.principal}
        root={false}
        onBack={toDetails}
        primaryLabel={t('common.done')}
        onDone={(draft) => {
          change(monthly ? { monthly: draft } : { principal: draft });
          setView('details');
        }}
      />
    );
  }

  if (view === 'review' && figures && form.type) {
    return (
      <LoanReviewView
        name={loanName(form).trim()}
        type={form.type}
        figures={figures}
        inSpending={inSpending}
        onInSpending={setInSpending}
        reminder={{
          on: reminderLive,
          onToggle: setReminderOn,
          lead,
          onLead: setLead,
          caption: remindOn ? billReminderCaption(lead, remindOn) : t('cards.add.remindOff'),
          unavailable: remindOn ? null : t('loanFlow.review.noPaymentsLeft'),
        }}
        onOpenSchedule={() =>
          router.push({
            pathname: '/loan-schedule',
            params: { ...figures.scheduleParams, name: loanName(form).trim() },
          })
        }
        onSave={() => void handleSave()}
        busy={saving}
        inSpendingLocked={savedId !== null}
        error={error}
        root={isRoot}
        // Once the loan is saved there is nothing here to edit or throw away: leaving goes to it.
        onBack={savedId ? leaveSaved : toDetails}
        onBackToEdit={savedId ? undefined : toDetails}
        closePrompt={savedId ? undefined : closePrompt}
      />
    );
  }

  // The details page, and where Review falls back to should it have nothing to price.
  return (
    <LoanDetailsView
      form={form}
      onChange={change}
      sources={sources}
      todayDate={todayDate}
      root={isRoot}
      onBack={() => {
        if (initialView === 'details') {
          router.back();
          return;
        }
        setError(null);
        setView('amount');
      }}
      onEditMonthly={() => setView('paymentEdit')}
      onEditPrincipal={() => setView('principalEdit')}
      onContinue={handleContinue}
      error={error}
      scrollPlace={{ y: detailsY, keep: setDetailsY }}
    />
  );
}

function fieldsOf(refusal: LoanReviewRefusal) {
  return refusal.reason === 'fields' ? refusal.fields : [];
}
