import { randomUUID } from 'expo-crypto';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import {
  AlignLeft,
  Calculator,
  CalendarDays,
  CreditCard,
  Repeat,
  Trash2,
  Tag,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  choiceToLead,
  useApplyReminder,
  useReminderChoice,
  type ReminderChoice,
} from '@/api/reminders';
import { buildBillValues, withSavedSource } from '@/api/entry-values';
import { useCreateBill, useDeleteBill, useStopBill } from '@/api/mutations';
import { usePastCharges, useUpdatePlanAndCharges, type PastRead } from '@/api/past-charges';
import { usePaymentLabels } from '@/api/payment-labels';
import { useBill, useLoanForBill, usePaymentSources } from '@/api/queries';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { billCategoryLabel, recurrenceLabel } from '@/components/bills/bill-row';
import { BillIconWell } from '@/components/bills/bill-icon';
import { BillMark } from '@/components/bills/bill-mark';
import { CategoryPicker } from '@/components/bills/category-picker';
import { DateBox } from '@/components/entry/date-box';
import { AmountEditPage, FieldPage, NoteEditPage } from '@/components/entry/edit-pages';
import {
  EntryReview,
  GlyphWell,
  SegmentedChips,
  type EntryRowSpec,
} from '@/components/entry/entry-review';
import { AmountFigure } from '@/components/flow/amount-figure';
import { AmountStep } from '@/components/flow/amount-step';
import { FlowHeader, StepFlow } from '@/components/flow/step-flow';
import { ActionPill } from '@/components/ui/action-pill';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { ReminderField } from '@/components/ui/reminder-field';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceTiles } from '@/components/ui/source-tiles';
import { FieldLabel, Title } from '@/components/ui/typography';
import { useToast } from '@/providers/toast-context';
import {
  RECURRENCES,
  billIconOf,
  getBillCategory,
  type BillCategory,
  type Recurrence,
} from '@/data/bill-categories';
import { t } from '@/i18n';
import { keptFrom, keptFromDate } from '@/lib/allowance';
import { toIsoDate } from '@/lib/date';
import { amountForDisplay, formatEntryDay } from '@/lib/entry-day';
import { formatCurrency } from '@/lib/format';
import { useToday } from '@/lib/use-today';
import { TEXT_CAP } from '@/theme/text-scale';
import { success, warn } from '@/lib/haptics';
import { failureMessage, failureText } from '@/lib/failure';
import { logoColumns, selectionLogo } from '@/lib/logo-columns';
import { logoDomainOf } from '@/lib/logo-domain';
import { billPageHref } from '@/lib/ledger-link';
import { billStopped } from '@/lib/plan-stop';
import {
  cameFromVoice,
  clearVoiceDraft,
  readBillPrefill,
  type BillPrefill,
} from '@/lib/voice-draft';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

/** The open-ended schedules, plus one that runs only between two dates. */
const PERIOD = 'period';

type RecurrenceChoice = Recurrence | typeof PERIOD;

/**
 * The Name box's placeholder per category, naming real companies so people know what counts.
 * Company names are the same in every language, so only the hints with words go through messages.
 */
function nameHint(categoryId: string): string {
  switch (categoryId) {
    case 'housing':
      return t('bills.add.issuer.housing');
    case 'energy':
      return 'AEP, Duke Energy, National Grid';
    case 'water':
      return t('bills.add.issuer.water');
    case 'internet':
      return 'Xfinity, Spectrum, Verizon';
    case 'mobile':
      return 'T-Mobile, AT&T, Verizon';
    case 'insurance':
      return 'Geico, State Farm, Progressive';
    case 'loans':
      return 'Chase, Discover, SoFi';
    case 'transport':
      return t('bills.add.issuer.transport');
    case 'health':
      return t('bills.add.issuer.health');
    case 'education':
      return t('bills.add.issuer.education');
    default:
      return t('bills.add.issuer.other');
  }
}

/**
 * The pages of one bill: the category chooser it starts on, the keypad, the final page, and the
 * fields too big to set on it.
 */
type Page = 'category' | 'amount' | 'review' | 'amountEdit' | 'categoryEdit' | 'note';

const asDate = (value?: string | null) => (value ? new Date(`${value}T00:00:00`) : null);

/**
 * An edit with no record in hand never becomes a blank form: `id` makes Save an update, so a form
 * mounted without the row would write empty fields over a real bill. Loading, unreadable and gone
 * are separate answers. A stopped bill (or finished loan) is final, so a link to change one opens
 * its page instead.
 */
export default function AddBillScreen() {
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const { id } = params;
  const artwork = useArtwork();
  const { today } = useToday();
  const bill = useBill(id);
  const existing = bill.data ?? null;
  // Decided on the first read only: Delete's "Keep past charges" stops the bill from this page,
  // and leaving is that flow's own step.
  const [stoppedPage, setStoppedPage] = useState<Href | false | null>(null);
  if (existing && stoppedPage === null) {
    setStoppedPage(
      billStopped(existing, today) ? billPageHref(existing.id, existing.category_id) : false,
    );
  }
  if (stoppedPage) return <Redirect href={stoppedPage} />;

  if (id && !existing) {
    // Retry, never a fall back to creating: the row is still there, this screen cannot see it.
    if (bill.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title={failureText()}
            actionLabel={t('common.tryAgain')}
            onAction={() => {
              void bill.refetch();
            }}
            secondaryLabel={t('bills.goBack')}
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    // Skeletons, never a $0 figure for a bill whose amount has not arrived.
    if (!bill.isFetched) {
      return (
        <StepFlow
          title={t('bills.add.titleEdit')}
          closePrompt={t('bills.add.closeEdit')}
          steps={1}
          current={0}
          onBack={() => router.back()}
          primaryLabel={t('common.continue')}
          primaryDisabled
          onPrimary={() => {}}
        >
          <View className="w-full gap-6">
            <Skeleton className="h-14 w-full rounded-[12px]" />
            <Skeleton className="h-14 w-full rounded-[12px]" />
            <Skeleton className="h-10 w-2/3 rounded-full" />
          </View>
        </StepFlow>
      );
    }

    // The read landed but there is no row (deleted elsewhere, or a stale link). An update on an id
    // that matches nothing reports success and writes nothing.
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('bills.goBack')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  // Only a new bill can arrive pre-filled from the voice review page.
  const prefill = id ? null : readBillPrefill(params);

  return (
    <BillForm
      key={existing?.id ?? 'new'}
      id={id}
      existing={existing}
      prefill={prefill}
      // An edit, or what the voice review page heard, opens on the final page; a blank bill starts
      // by asking what it is for.
      initialView={existing || prefill ? 'review' : 'category'}
      fromVoice={!id && cameFromVoice(params)}
    />
  );
}

/** A bill's category as read: Loans & Credit and the categories folded into others included. */
function categoryName(categoryId: string | null | undefined): string {
  const data = categoryId ? getBillCategory(categoryId) : undefined;
  return billCategoryLabel(data?.id ?? categoryId, data?.label ?? '');
}

/**
 * What the Name box opens with: the company on record, the bill's own name as one typed, or what
 * the voice review page heard. A saved name carries no logo choice, so saving leaves the row's logo.
 */
function startingName(
  existing: ReturnType<typeof useBill>['data'] | null,
  prefill: BillPrefill | null,
): BrandSelection | null {
  if (existing) {
    if (!existing.name) return null;
    return {
      brandId: existing.brand_id ?? null,
      name: existing.name,
      domain: logoDomainOf(existing),
      categoryId: existing.category_id,
    };
  }
  if (prefill?.issuer) return { ...prefill.issuer, name: prefill.name || prefill.issuer.name };
  // Only words that were heard or typed: a category alone leaves the name for the person to give.
  const heard = prefill?.name?.trim();
  return heard
    ? { brandId: null, name: heard, domain: null, categoryId: prefill?.categoryId ?? 'other' }
    : null;
}

function BillForm({
  id,
  existing,
  prefill = null,
  initialView,
  fromVoice = false,
}: {
  id?: string;
  existing: ReturnType<typeof useBill>['data'] | null;
  initialView: 'category' | 'review';
  /** What the voice review page heard, for a new bill. */
  prefill?: BillPrefill | null;
  /** Saved from a voice hand-off: back to Home, never onto the review page again. */
  fromVoice?: boolean;
}) {
  const colors = useColors();
  const editing = Boolean(id);
  // Pages over one piece of state, never routes, so Back keeps everything filled in. The final
  // page is `review`; each line of it opens a page for that one thing and returns here.
  const [view, setView] = useState<Page>(initialView);
  // Outlives the review page while a row's own page is open, so coming back lands where it was.
  const [reviewY, setReviewY] = useState(0);
  const { today, todayDate } = useToday();

  const [categoryId, setCategoryId] = useState<string>(
    existing?.category_id ?? prefill?.categoryId ?? '',
  );
  // The Name box: a company from the list (its brand and logo come with it) or the person's words.
  const [issuer, setIssuer] = useState<BrandSelection | null>(() =>
    startingName(existing, prefill),
  );
  const [issuerChanged, setIssuerChanged] = useState(false);
  // Typed but not picked from the list: it names the bill all the same.
  const [typedName, setTypedName] = useState('');
  const name = issuer?.name ?? typedName.trim();
  // Kept as saved; a new bill wears its category's.
  const iconId = existing?.icon_id ?? 'other';
  const [amount, setAmount] = useState(
    existing ? String(existing.amount) : (prefill?.amount ?? ''),
  );
  const [startDate, setStartDate] = useState<Date | null>(
    // A repeating bill shows when it is next due; its start is bookkeeping (see floorAfterCharges)
    // and can sit after the last charge. A period bill shows the period's first day.
    asDate(
      existing?.recurrence === 'period'
        ? (existing.starts_on ?? existing.next_due_on)
        : (existing?.next_due_on ?? existing?.starts_on),
    ) ??
      prefill?.startDate ??
      null,
  );
  const [endDate, setEndDate] = useState<Date | null>(asDate(existing?.ends_on));
  const [recurrence, setRecurrence] = useState<RecurrenceChoice>(
    (existing?.recurrence as RecurrenceChoice) ?? prefill?.recurrence ?? 'monthly',
  );
  // '' is Skip, picked on purpose; null is not answered yet. A saved bill has answered.
  const [sourceId, setSourceId] = useState<string | null>(
    existing ? (existing.card_id ?? existing.bank_account_id ?? '') : prefill?.sourceId || null,
  );
  const [note, setNote] = useState(existing?.note ?? prefill?.note ?? '');

  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const categoryLabel = categoryName(categoryId);

  const hasPeriod = recurrence === PERIOD;

  const handleRecurrenceChange = (next: RecurrenceChoice) => {
    setError(null);
    setRecurrence(next);
    // The end date belongs to a period bill alone; the first due date stays, every bill needs one.
    if (next !== PERIOD) setEndDate(null);
  };

  const applyCategory = (category: BillCategory) => setCategoryId(category.id);

  const [error, setError] = useState<string | null>(null);

  // New spending takes only what the plan offers; an edit also shows, and keeps, the card or
  // account the bill is paid from, though the plan has locked it since.
  const { sources: offered } = usePaymentSources();
  const { sources: every } = usePaymentLabels();
  const sources = useMemo(
    () => withSavedSource(offered, every, existing),
    [offered, every, existing],
  );
  // A loan behind the bill keeps its type icon through an edit (`buildBillValues`).
  const { data: loan } = useLoanForBill(id);
  const createBill = useCreateBill();
  const updatePlan = useUpdatePlanAndCharges('bill');
  const pastCharges = usePastCharges('bill', id);
  // While the charges are read before a save or a delete: the buttons wait.
  const [readingPast, setReadingPast] = useState(false);
  // A new bill's row id for this visit, so a Save repeated after a lost answer finds the row the
  // first may have filed instead of filing a second (`insertOnce`).
  const [newBillId] = useState(() => randomUUID());
  // The bill's id once it is written (filed, or changed with its past charges in the same write): a
  // Save pressed again after the reminder failed writes the reminder alone, never a second bill or a
  // second change.
  const [written, setWritten] = useState<string | null>(null);
  // Held from the press until the page is left, the reminder write included: a second tap in that
  // time would toast and navigate twice. The ref answers within the same frame.
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const deleteBill = useDeleteBill();
  const stopBill = useStopBill();
  const toast = useToast();

  /** The charges, read first when they have not been; null (the line said) when the read fails. */
  const readPast = async (): Promise<PastRead | null> => {
    setReadingPast(true);
    try {
      return await pastCharges.load();
    } catch (thrown) {
      warn();
      setError(failureMessage(thrown));
      return null;
    } finally {
      setReadingPast(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !existing) return;
    setError(null);
    // The question counts the charges, so it waits for them as Save does.
    const past = await readPast();
    if (!past) return;
    const choice = await pastCharges.chooseDelete(
      existing.name || categoryName(existing.category_id),
      { stopped: billStopped(existing, today) },
      past,
    );
    if (choice === null) return;

    try {
      if (choice === 'keep') {
        await stopBill.mutateAsync({ bill: existing, today });
        success();
        toast('toast.bill.stopped');
      } else {
        await deleteBill.mutateAsync(id);
        toast('toast.bill.deleted', 'deleted');
      }
      router.back();
    } catch (thrown) {
      warn();
      setError(failureMessage(thrown));
    }
  };

  // A draft over what is stored, so a reminder that loads late does not overwrite the choice.
  const savedReminder = useReminderChoice('bill', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  // A new bill has no answer until one is picked; "No reminder" is an answer.
  const reminder: ReminderChoice | null = reminderDraft ?? (editing ? savedReminder.choice : null);
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  const value = Number(amount);
  const amountReady = Number.isFinite(value) && value > 0;
  const dateLabel = hasPeriod ? t('bills.field.starts') : t('bills.field.paymentOn');

  const fail = (message: string) => {
    warn();
    setError(message);
    setView('review');
  };

  const leave = () => {
    if (!fromVoice) {
      router.back();
      return;
    }
    router.dismissTo('/home');
    // Saved, so the person's words do not stay in memory for the next session.
    clearVoiceDraft();
  };

  const leaveSaved = () => {
    success();
    toast(editing ? 'toast.bill.updated' : 'toast.bill.added');
    leave();
  };

  const saveFailed = (thrown: unknown) => {
    inFlight.current = false;
    setSaving(false);
    warn();
    setError(failureMessage(thrown));
  };

  /** What follows the bill's own write, and all a Save again has left to do once it is written. */
  const finishSave = async (billId: string) => {
    setSaving(true);
    try {
      // After the bill exists, because a reminder points at a row. Untouched while the saved one is
      // unknown: the form's 'off' is then a guess, and writing it deletes the reminder.
      if (!savedReminder.unknown && reminder !== null) {
        await applyReminder('bill', billId, choiceToLead(reminder), remindAt);
      }
      leaveSaved();
    } catch (thrown) {
      saveFailed(thrown);
    }
  };

  const handleSave = async () => {
    if (inFlight.current) return;
    setError(null);
    // The bill stands as written: nothing on the page is checked or asked about again.
    if (written) {
      inFlight.current = true;
      await finishSave(written);
      return;
    }
    const missing = [
      !amountReady && t('receipts.field.amount'),
      !name && t('bills.field.name'),
      !categoryId && t('bills.field.category'),
      !startDate && dateLabel,
      // A set period runs monthly up to its last day, so it cannot be saved without one.
      hasPeriod && !endDate && t('bills.field.to'),
      sourceId === null && t('bills.field.paidWith'),
      reminder === null && t('ui.reminder.label'),
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0 || sourceId === null || reminder === null) {
      fail(t('bills.add.missing', { fields: missing.join(', ') }));
      return;
    }
    // A day heard by voice arrives without the calendar. Only a new bill: a saved period bill can
    // have started before the first kept day.
    if (!editing && startDate && toIsoDate(startDate) < keptFrom(today)) {
      fail(t('receipts.add.dateTooOld'));
      return;
    }
    inFlight.current = true;
    // Read before anything is built or asked: starts_on counts on from the newest charge, and the
    // question counts them.
    const past = await readPast();
    if (!past) {
      inFlight.current = false;
      return;
    }
    // Checks, icon rule and starts_on floor live in the shared builder, which the voice review page
    // saves through too.
    const built = buildBillValues(
      {
        name,
        amount,
        issuer,
        categoryId,
        iconId,
        recurrence,
        startDate,
        endDate,
        sourceId,
        note,
      },
      {
        sources: offered,
        saved: existing,
        lastChargedOn: past.lastChargedOn,
        hasLoan: Boolean(loan),
      },
    );
    if (!built.ok) {
      inFlight.current = false;
      fail(built.message);
      return;
    }
    // A company taken off takes its logo with it; one left alone keeps the row's own choice.
    const values = {
      ...built.values,
      ...logoColumns(
        issuer ?? (issuerChanged ? { logoDomain: null, logoHidden: false } : null),
        existing,
      ),
    };

    try {
      // What a recorded charge copies from the bill.
      const carried = {
        label: values.name || 'Bill',
        amount: values.amount,
        card_id: values.card_id,
        bank_account_id: values.bank_account_id,
      };
      const changed =
        editing &&
        Boolean(existing) &&
        (carried.label !== (existing?.name || 'Bill') ||
          carried.amount !== Number(existing?.amount) ||
          carried.card_id !== (existing?.card_id ?? null) ||
          carried.bank_account_id !== (existing?.bank_account_id ?? null));

      // Asked before anything is written, so backing out leaves the bill as it was.
      const scope = await pastCharges.choose(carried.label, changed, past);
      if (scope === null) {
        inFlight.current = false;
        return;
      }

      const billId =
        editing && id
          ? (await updatePlan.mutateAsync({ id, values, past: scope }), id)
          : (await createBill.mutateAsync({ ...values, id: newBillId })).id;
      setWritten(billId);
      await finishSave(billId);
    } catch (thrown) {
      saveFailed(thrown);
    }
  };

  const busy = saving || createBill.isPending || updatePlan.isPending;
  const deleting = deleteBill.isPending || stopBill.isPending;
  // The page this form opened on. Anywhere else the edge swipe is off, and Back steps back.
  const isRoot = view === initialView;

  const title = editing ? t('bills.add.titleEdit') : t('bills.addABill');
  const closePrompt = editing ? t('bills.add.closeEdit') : t('bills.add.closeNew');
  const toReview = () => setView('review');
  // A line that came from Save names what was wrong with the page as it was: once something there
  // is kept, it no longer applies.
  const settle = () => {
    setError(null);
    toReview();
  };

  if (view === 'category') {
    return (
      <Screen
        header={<FlowHeader title={title} onBack={() => router.back()} closePrompt={closePrompt} />}
      >
        <Title align="left" header className="mt-2">
          {t('bills.add.categoryQuestion')}
        </Title>
        <Text
          className="mt-1 w-full font-app text-[14px] leading-5 text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('bills.add.categorySubtitle')}
        </Text>

        <View className="mt-5 w-full pb-10">
          <CategoryPicker
            onSelect={(category) => {
              applyCategory(category);
              setView('amount');
            }}
            selectedId={categoryId}
          />
        </View>
      </Screen>
    );
  }

  if (view === 'amount') {
    return (
      <StepFlow
        title={title}
        closePrompt={closePrompt}
        steps={1}
        // Never the first page: the chooser comes before it.
        current={isRoot ? 0 : 1}
        onBack={() => setView('category')}
        question={t('bills.add.amountQuestion')}
        headerSlot={
          <View className="w-full flex-row justify-center">
            <ActionPill
              icon={Calculator}
              label={t('bills.add.calculator')}
              onPress={() => setCalculatorOpen(true)}
            />
          </View>
        }
        primaryLabel={t('common.continue')}
        primaryDisabled={!amountReady}
        onPrimary={() => {
          settle();
        }}
        error={error}
      >
        <AmountStep value={amount} onChange={setAmount} />

        {calculatorOpen ? (
          <CalculatorPad
            title={t('bills.add.calculator')}
            value={amount}
            onCancel={() => setCalculatorOpen(false)}
            onConfirm={(next) => {
              setAmount(next);
              setCalculatorOpen(false);
            }}
          />
        ) : null}
      </StepFlow>
    );
  }

  if (view === 'amountEdit') {
    return (
      <AmountEditPage
        title={t('receipts.field.amount')}
        question={t('bills.add.amountQuestion')}
        value={amount}
        calculator={t('bills.add.calculator')}
        onBack={toReview}
        onDone={(next) => {
          setAmount(next);
          settle();
        }}
      />
    );
  }

  if (view === 'categoryEdit') {
    return (
      <FieldPage
        title={t('bills.field.category')}
        question={t('bills.add.categoryQuestion')}
        onBack={toReview}
      >
        {/* A tap is the answer, so there is no Done. */}
        <View className="w-full pb-10">
          <CategoryPicker
            onSelect={(next) => {
              applyCategory(next);
              settle();
            }}
            selectedId={categoryId}
          />
        </View>
      </FieldPage>
    );
  }

  if (view === 'note') {
    return (
      <NoteEditPage
        title={t('bills.field.note')}
        label={t('bills.field.note')}
        placeholder={t('bills.add.notePlaceholder')}
        value={note}
        onBack={toReview}
        onDone={(next) => {
          setNote(next);
          settle();
        }}
      />
    );
  }

  const recurrenceChoices: { value: RecurrenceChoice; label: string }[] = [
    ...RECURRENCES.map((option) => ({ value: option.value, label: recurrenceLabel(option.value) })),
    { value: PERIOD, label: t('bills.add.specificPeriod') },
  ];
  // A loan's bill shows its loan's type; any other category its own icon, whatever icon id it holds.
  const categoryIcon = categoryId
    ? billIconOf({ categoryId, iconId: categoryId === 'loans' ? existing?.icon_id : null })
    : null;

  const chooseName = (next: BrandSelection | null) => {
    setError(null);
    if (next !== issuer) setIssuerChanged(true);
    setIssuer(next);
  };

  const pickStart = (day: Date) => {
    setError(null);
    setStartDate(day);
    // An end before the start is meaningless; drop it.
    if (endDate && day > endDate) setEndDate(null);
  };

  const pickSource = (next: string) => {
    setError(null);
    setSourceId(next);
  };

  const reminderRow: EntryRowSpec = {
    key: 'reminder',
    field: (
      <ReminderField
        kind="bill"
        value={reminder}
        onChange={(choice) => {
          setError(null);
          setReminderDraft(choice);
        }}
        time={remindAt}
        onTimeChange={(at) => {
          setError(null);
          setTimeDraft(at);
        }}
        offLabel={t('bills.add.noReminder')}
      />
    ),
  };

  const rows: EntryRowSpec[] = [
    {
      key: 'name',
      field: (
        <BrandField
          label={t('bills.field.name')}
          value={issuer}
          onChange={chooseName}
          // The box is drawn afresh after another page; what was typed comes back with it.
          initialQuery={typedName}
          onQueryChange={(typed) => {
            setError(null);
            setTypedName(typed);
          }}
          placeholder={nameHint(categoryId)}
          category={categoryId}
          noLogo="icon"
          changeLabel={(current) => t('bills.add.changeName', { name: current })}
          addLabel={(typed) => t('bills.add.useName', { name: typed })}
        />
      ),
    },
    {
      key: 'category',
      label: t('bills.field.category'),
      value: categoryId ? categoryLabel : null,
      required: true,
      leading: categoryIcon ? <BillIconWell choice={categoryIcon} /> : <GlyphWell icon={Tag} />,
      onPress: () => setView('categoryEdit'),
    },
    {
      key: 'due',
      field: (
        <DateBox
          label={dateLabel}
          value={startDate}
          today={todayDate}
          placeholder={t('bills.add.pickDay')}
          minDate={keptFromDate(today)}
          onChange={pickStart}
        />
      ),
    },
    {
      key: 'recurrence',
      label: t('bills.field.recurring'),
      value: recurrenceChoices.find((option) => option.value === recurrence)?.label ?? null,
      leading: <GlyphWell icon={Repeat} />,
      below: (
        <SegmentedChips
          variant="pills"
          options={recurrenceChoices.map((option) => ({
            key: option.value,
            label: option.label,
            selected: option.value === recurrence,
            onPress: () => handleRecurrenceChange(option.value),
          }))}
        />
      ),
    },
    ...(hasPeriod
      ? [
          {
            key: 'end',
            field: (
              <DateBox
                label={t('bills.field.to')}
                value={endDate}
                today={todayDate}
                placeholder={t('bills.add.pickDay')}
                // Days before the start are not offered.
                minDate={startDate}
                onChange={(day) => {
                  setError(null);
                  setEndDate(day);
                }}
              />
            ),
          },
        ]
      : []),
    {
      key: 'paidWith',
      field: (
        <View className="w-full">
          <FieldLabel className="mb-2">{t('bills.field.paidWith')}</FieldLabel>
          <SourceTiles
            sources={sources}
            value={sourceId ?? ''}
            onChange={pickSource}
            skip={{
              label: t('bills.add.skipSource'),
              selected: sourceId === '',
              onPress: () => pickSource(''),
            }}
          />
        </View>
      ),
    },
    reminderRow,
    {
      key: 'note',
      label: t('bills.field.note'),
      value: note.trim() || null,
      placeholder: t('entry.addNote'),
      leading: <GlyphWell icon={AlignLeft} />,
      onPress: () => setView('note'),
    },
  ];

  // Once the bill is written, Save again writes the reminder alone: any other line changed here
  // would be dropped while the toast says the bill was saved, so only the reminder stays open.
  const writtenRows: EntryRowSpec[] = [
    {
      key: 'name',
      label: t('bills.field.name'),
      value: name || null,
      leading: (
        <BillMark
          categoryId={categoryId}
          iconId={categoryId === 'loans' ? existing?.icon_id : null}
          domain={issuer ? selectionLogo(issuer) : null}
          name={name}
        />
      ),
    },
    {
      key: 'category',
      label: t('bills.field.category'),
      value: categoryLabel,
      leading: categoryIcon ? <BillIconWell choice={categoryIcon} /> : <GlyphWell icon={Tag} />,
    },
    {
      key: 'due',
      label: dateLabel,
      value: startDate ? formatEntryDay(startDate, todayDate) : null,
      leading: <GlyphWell icon={CalendarDays} />,
    },
    {
      key: 'recurrence',
      label: t('bills.field.recurring'),
      value: recurrenceChoices.find((option) => option.value === recurrence)?.label ?? null,
      leading: <GlyphWell icon={Repeat} />,
    },
    ...(hasPeriod
      ? [
          {
            key: 'end',
            label: t('bills.field.to'),
            value: endDate ? formatEntryDay(endDate, todayDate) : t('bills.add.noEndDate'),
            leading: <GlyphWell icon={CalendarDays} />,
          },
        ]
      : []),
    {
      key: 'paidWith',
      label: t('bills.field.paidWith'),
      value: sources.find((source) => source.id === sourceId)?.label ?? t('bills.noPaymentMethod'),
      leading: <GlyphWell icon={CreditCard} />,
    },
    reminderRow,
    {
      key: 'note',
      label: t('bills.field.note'),
      value: note.trim() || null,
      leading: <GlyphWell icon={AlignLeft} />,
    },
  ];
  const writtenAmount = amountForDisplay(amount);

  return (
    <EntryReview
      scrollPlace={{ y: reviewY, keep: setReviewY }}
      title={title}
      // Once the bill is written there is nothing here to throw away: no close (an empty prompt
      // draws none), no edge swipe, and Back leaves the way a save does.
      closePrompt={written ? '' : closePrompt}
      root={isRoot && !written}
      onBack={() => {
        if (written) {
          // A Save still writing the reminder leaves by itself.
          if (!inFlight.current) leaveSaved();
          return;
        }
        if (isRoot) {
          router.back();
          return;
        }
        // A failed save's line belongs to the final page, not the keypad it steps back to.
        setError(null);
        setView('amount');
      }}
      amountLabel={t('receipts.field.amount')}
      amount={amount}
      onEditAmount={() => setView('amountEdit')}
      amountSlot={
        written ? (
          <View
            accessible
            accessibilityLabel={t('entry.row.spoken', {
              label: t('receipts.field.amount'),
              value: formatCurrency(Number(writtenAmount)),
            })}
            className="mt-6 w-full items-center py-2"
          >
            <Text
              className="font-app text-[14px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {t('receipts.field.amount')}
            </Text>
            <AmountFigure value={writtenAmount ?? amount} />
          </View>
        ) : undefined
      }
      rows={written ? writtenRows : rows}
      primaryLabel={
        busy
          ? t('bills.add.saving')
          : editing
            ? t('bills.add.saveChanges')
            : t('bills.add.saveBill')
      }
      // Never greyed out for a gap: Save says what is still missing.
      primaryDisabled={busy || readingPast}
      onPrimary={() => void handleSave()}
      error={error}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bills.add.deleteA11y')}
            accessibilityState={{ disabled: deleting || readingPast }}
            disabled={deleting || readingPast}
            onPress={() => void handleDelete()}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-app-medium text-[15px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {deleting ? t('bills.add.deleting') : t('bills.add.deleteBill')}
            </Text>
          </Pressable>
        ) : null
      }
    />
  );
}
