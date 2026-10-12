import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useLoanDetail, type LoanDetail } from '@/api/loans';
import { useDeleteBill, useSaveLoan, useUpdateLoan } from '@/api/mutations';
import { usePaymentSources, type PaymentSourceRow } from '@/api/queries';
import { useApplyReminder, useReminderChoice } from '@/api/reminders';
import { LoanDetailsView } from '@/components/loans/add/loan-details-view';
import {
  TERM_YEARS_MAX,
  emptyLoanForm,
  loanFormFromCalculator,
  loanFormFromSaved,
  loanName,
  missingFields,
  reviewFieldsOf,
  termMonthsOf,
  withSourceKept,
  type LoanForm,
} from '@/components/loans/add/loan-form';
import { LoanKeypadView } from '@/components/loans/add/loan-keypad-view';
import { loanReminderOn } from '@/components/loans/add/loan-reminder';
import { LoanReviewView } from '@/components/loans/add/loan-review-view';
import { localDate } from '@/components/loans/loan-words';
import { goBack } from '@/components/ui/back-button';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { loanTypeIconId } from '@/data/loan-types';
import { percent, t } from '@/i18n';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { success, warn } from '@/lib/haptics';
import { paymentDates, readStoredPayoffs, type LoanPayoff } from '@/lib/loan';
import { refusedLoanSave } from '@/lib/loan-refusal';
import { loanReview, type LoanReviewRefusal } from '@/lib/loan-review';
import { SAVABLE_RATE_MAX, readLoanRoute, type LoanRouteParams } from '@/lib/loan-route';
import { finishFlowOn } from '@/lib/nav';
import { formatFullDate } from '@/lib/date';
import { billReminderCaption, type LeadDays } from '@/lib/reminder-words';
import { useToday } from '@/lib/use-today';
import { useConfirm } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { useArtwork } from '@/theme/artwork';

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
 * A saved loan being changed: its bill, where it is paid from now, its reminder as stored, and the
 * payoffs already made on it.
 */
type Editing = {
  billId: string;
  /** Kept through the edit: without them Save would end the bill where the loan as lent ends. */
  payoffs: readonly LoanPayoff[] | undefined;
  source: PaymentSourceRow | null;
  reminder: ReturnType<typeof useReminderChoice>;
};

/**
 * Opens on the keypad from the Loans page, or on the details from the calculator's Save
 * (`view=details` with its loan as params), filled in. With `id` (the loan's bill) it changes that
 * loan, opening on its details.
 */
export default function AddLoanScreen() {
  const params = useLocalSearchParams<LoanRouteParams & { view?: string; id?: string }>();
  return params.id ? <EditLoanScreen billId={params.id} /> : <NewLoanScreen params={params} />;
}

function NewLoanScreen({ params }: { params: LoanRouteParams & { view?: string } }) {
  // Read once: the pages change the form, never the link.
  const [opening] = useState(() =>
    params.view === 'details'
      ? { view: 'details' as const, form: loanFormFromCalculator(readLoanRoute(params)) }
      : { view: 'amount' as const, form: emptyLoanForm() },
  );
  return <AddLoanFlow initialView={opening.view} initialForm={opening.form} />;
}

/**
 * Changing a saved loan only runs on the loan as read: loading, unreadable and gone are separate
 * answers, never a blank form whose Save would write over it.
 */
function EditLoanScreen({ billId }: { billId: string }) {
  const artwork = useArtwork();
  const focused = useIsFocused();
  const detail = useLoanDetail(billId);
  const reminder = useReminderChoice('bill', billId);
  const read = detail.data;

  // The loan as last read: Delete reloads the loans before this page leaves, and the form stays
  // drawn until it does rather than flash a skeleton.
  const [kept, setKept] = useState<LoanDetail | null>(null);
  const fresh = read?.kind === 'loan' ? read.loan : null;
  if (fresh && fresh !== kept) setKept(fresh);
  const loan = fresh ?? kept;
  // The page's starting figures, from the first read: a reload while editing never resets them.
  const [opening, setOpening] = useState<{
    form: LoanForm;
    inSpending: boolean;
    payoffs: readonly LoanPayoff[] | undefined;
  } | null>(null);
  if (loan && !opening) {
    setOpening({
      form: loanFormFromSaved(loan),
      inSpending: loan.bill.in_spending,
      payoffs: readStoredPayoffs(loan.payoffs),
    });
  }

  // Not a loan to change (gone on another phone, or a bill with none behind it): leave quietly.
  const missing = !kept && (read?.kind === 'gone' || read?.kind === 'bill');
  useEffect(() => {
    if (missing && focused) goBack();
  }, [missing, focused]);

  if (loan && opening) {
    return (
      <AddLoanFlow
        initialView="details"
        initialForm={opening.form}
        initialInSpending={opening.inSpending}
        editing={{
          billId,
          payoffs: opening.payoffs,
          source: loan.source,
          reminder,
        }}
      />
    );
  }

  return (
    <Screen title={t('loanFlow.edit.title')} showBack>
      {detail.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void detail.refetch()}
        />
      ) : (
        <SkeletonList rows={4} />
      )}
    </Screen>
  );
}

function AddLoanFlow({
  initialView,
  initialForm,
  initialInSpending = true,
  editing,
}: {
  initialView: 'amount' | 'details';
  initialForm: LoanForm;
  initialInSpending?: boolean;
  editing?: Editing;
}) {
  const [view, setView] = useState<LoanView>(initialView);
  const [form, setForm] = useState<LoanForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [inSpending, setInSpending] = useState(initialInSpending);
  // The saved reminder until the person touches it; a new loan starts on, three days ahead.
  const stored = editing?.reminder;
  const [onDraft, setOnDraft] = useState<boolean | null>(null);
  const [leadDraft, setLeadDraft] = useState<LeadDays | null>(null);
  const reminderOn = onDraft ?? (stored ? stored.choice !== 'off' : true);
  const lead: LeadDays =
    leadDraft ??
    (stored && stored.choice !== 'off' ? (Number(stored.choice) as LeadDays) : DEFAULT_LEAD);
  // Outlives the details page while a keypad page is open, so coming back lands where it was.
  const [detailsY, setDetailsY] = useState(0);
  // The loan's bill once it is written (filed, or changed): a Save pressed again after a failed
  // reminder writes the reminder alone, never a second loan or a second change.
  const [writtenId, setWrittenId] = useState<string | null>(null);
  // Held from the press until the page is left, the reminder write included: a second tap in that
  // time would toast and navigate twice. The ref answers within the same frame.
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [deleting, setDeleting] = useState(false);

  const { today, todayDate } = useToday();
  const { sources: offered } = usePaymentSources();
  const sources = useMemo(
    () => withSourceKept(offered, editing?.source ?? null),
    [offered, editing?.source],
  );
  const saveLoan = useSaveLoan();
  const updateLoan = useUpdateLoan();
  const deleteBill = useDeleteBill();
  const applyReminder = useApplyReminder();
  const confirm = useConfirm();
  const toast = useToast();

  // Priced only on the page that shows it; the details page asks on Continue.
  const review = useMemo(
    () => (view === 'review' ? loanReview(fieldsWith(form, editing?.payoffs), today) : null),
    [view, form, today, editing?.payoffs],
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
      case 'start-after-payoff':
        return t('loanFlow.edit.startAfterPayoff', {
          amount: formatCurrency(refusal.amount),
          date: formatFullDate(localDate(refusal.on)),
        });
    }
  };

  const handleContinue = () => {
    const fields = fieldsWith(form, editing?.payoffs);
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

  const leave = () => {
    success();
    if (editing) {
      toast('toast.loan.updated');
      // Back to the loan's page, which this flow sits on.
      router.back();
      return;
    }
    toast('toast.loan.saved');
    finishFlowOn('/loans');
  };

  const sourceIds = (): { cardId: string | null; bankAccountId: string | null } => {
    const chosen = sources.find((source) => source.id === form.sourceId);
    if (!chosen) return { cardId: null, bankAccountId: null };
    return chosen.kind === 'card'
      ? { cardId: chosen.id, bankAccountId: null }
      : { cardId: null, bankAccountId: chosen.id };
  };

  const writeLoan = async (
    type: NonNullable<LoanForm['type']>,
    priced: NonNullable<typeof figures>,
  ): Promise<string> => {
    const values = {
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
      ...sourceIds(),
      paymentOverrides: priced.save.paymentOverrides,
      lastPaymentOn: priced.save.lastPaymentOn,
      paymentDay: priced.save.paymentDay,
      inSpending,
    };
    if (editing) {
      await updateLoan.mutateAsync({ billId: editing.billId, ...values, today });
      return editing.billId;
    }
    // Payments made before today happened before the loan was added: not this app's spending.
    const saved = await saveLoan.mutateAsync({ ...values, countsFrom: today });
    return saved.id;
  };

  const writeReminder = async (billId: string) => {
    if (!editing) {
      if (reminderLive) await applyReminder('bill', billId, lead);
      return;
    }
    // Untouched while the saved one is unknown: the page's 'off' is then a guess, and writing it
    // deletes the reminder.
    if (!editing.reminder.unknown) {
      await applyReminder('bill', billId, reminderLive ? lead : null, editing.reminder.remindAt);
    }
  };

  const handleSave = async () => {
    if (!figures || !form.type || form.sourceId === null || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const billId = writtenId ?? (await writeLoan(form.type, figures));
      setWrittenId(billId);
      await writeReminder(billId);
      leave();
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

  const handleDelete = async () => {
    if (!editing || deleting) return;
    const ok = await confirm({
      title: t('loanFlow.edit.deleteTitle'),
      message: t('loanFlow.edit.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBill.mutateAsync(editing.billId);
      toast('toast.loan.deleted', 'deleted');
      // The loan's page and this flow go with it, so Back cannot reach either.
      finishFlowOn('/loans');
    } catch (thrown) {
      setDeleting(false);
      warn();
      setError(failureMessage(thrown));
    }
  };

  const isRoot = view === initialView;
  const closePrompt = editing ? t('loanFlow.edit.close') : t('loanFlow.close');

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
        saveLabel={editing ? t('loanFlow.edit.save') : undefined}
        name={loanName(form).trim()}
        type={form.type}
        figures={figures}
        inSpending={inSpending}
        onInSpending={setInSpending}
        reminder={{
          on: reminderLive,
          onToggle: setOnDraft,
          lead,
          onLead: setLeadDraft,
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
        inSpendingLocked={writtenId !== null}
        error={error}
        root={isRoot}
        // Once the loan is written there is nothing here to edit or throw away: leaving goes to it.
        onBack={writtenId ? leave : toDetails}
        onBackToEdit={writtenId ? undefined : toDetails}
        closePrompt={writtenId ? undefined : closePrompt}
      />
    );
  }

  // The details page, and where Review falls back to should it have nothing to price.
  return (
    <LoanDetailsView
      title={editing ? t('loanFlow.edit.title') : undefined}
      closePrompt={closePrompt}
      onDelete={editing ? { onPress: () => void handleDelete(), busy: deleting } : undefined}
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

/** The form as Review prices it, with the payoffs a saved loan already has. */
function fieldsWith(form: LoanForm, payoffs: readonly LoanPayoff[] | undefined) {
  return { ...reviewFieldsOf(form), payoffs };
}

function fieldsOf(refusal: LoanReviewRefusal) {
  return refusal.reason === 'fields' ? refusal.fields : [];
}
