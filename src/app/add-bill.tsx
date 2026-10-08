import { router, useLocalSearchParams } from 'expo-router';
import {
  AlignLeft,
  Bell,
  CalendarDays,
  CreditCard,
  Calculator,
  Repeat,
  Trash2,
  Tag,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  choiceToLead,
  useApplyReminder,
  useReminderChoice,
  type ReminderChoice,
} from '@/api/reminders';
import { buildBillValues, defaultBillName } from '@/api/entry-values';
import { useCreateBill, useDeleteBill, useUpdateBill } from '@/api/mutations';
import { usePastCharges } from '@/api/past-charges';
import { useBill, useLoanForBill, usePaymentSources } from '@/api/queries';
import { ScheduleCard } from '@/components/calculators/schedule-card';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { BillMark } from '@/components/bills/bill-mark';
import { billCategoryLabel, recurrenceLabel } from '@/components/bills/bill-row';
import { CategoryPicker } from '@/components/bills/category-picker';
import { IconPicker } from '@/components/bills/icon-picker';
import {
  AmountEditPage,
  DateEditPage,
  FieldPage,
  NoteEditPage,
  PaidWithEditPage,
  ReminderEditPage,
} from '@/components/entry/edit-pages';
import {
  EntryReview,
  GlyphWell,
  SegmentedChips,
  type EntryRowSpec,
} from '@/components/entry/entry-review';
import { AmountStep } from '@/components/flow/amount-step';
import { FlowHeader, StepFlow } from '@/components/flow/step-flow';
import { ActionPill } from '@/components/ui/action-pill';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { FieldLabel, Title } from '@/components/ui/typography';
import { useConfirm } from '@/providers/dialog-provider';
import {
  BILL_CATEGORIES,
  RECURRENCES,
  type BillCategory,
  type Recurrence,
} from '@/data/bills-mock';
import { t } from '@/i18n';
import { formatEntryDay } from '@/lib/entry-day';
import { reminderSummary } from '@/lib/entry-reminder';
import { useToday } from '@/lib/use-today';
import { TEXT_CAP } from '@/theme/text-scale';
import { success, warn } from '@/lib/haptics';
import { failureMessage, failureText } from '@/lib/failure';
import { logoColumns, selectionLogo } from '@/lib/logo-columns';
import { logoDomainOf } from '@/lib/logo-domain';
import { amortise, termsFromStored } from '@/lib/loan';
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
 * Placeholder per category, naming real companies so people know what counts. Company names are
 * the same in every language, so only the hints with words go through messages.
 */
function issuerHint(categoryId: string): string {
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
    case 'family':
      return t('bills.add.issuer.family');
    default:
      return t('bills.add.issuer.other');
  }
}

/**
 * The pages of one bill: the category chooser it starts on (it pre-fills the name, so it runs
 * first), the keypad, the final page, and one per field.
 */
type Page =
  | 'category'
  | 'amount'
  | 'review'
  | 'amountEdit'
  | 'name'
  | 'categoryEdit'
  | 'paidWith'
  | 'note'
  | 'due'
  | 'endDate'
  | 'reminder';

const asDate = (value?: string | null) => (value ? new Date(`${value}T00:00:00`) : null);

/**
 * An edit with no record in hand never becomes a blank form: `id` makes Save an update, so a form
 * mounted without the row would write empty fields over a real bill. Loading, unreadable and gone
 * are separate answers.
 */
export default function AddBillScreen() {
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  const { id } = params;
  const artwork = useArtwork();
  const bill = useBill(id);
  const existing = bill.data ?? null;

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

/**
 * What a new bill is pre-named after: its category in the language on screen. Once in the Name
 * field it is the person's own text, so a saved bill keeps it whatever the language later becomes.
 */
function categoryName(categoryId: string | null | undefined): string {
  const data = BILL_CATEGORIES.find((option) => option.id === categoryId);
  return billCategoryLabel(categoryId, data?.label ?? '');
}

/** The name a pre-filled bill opens with: the one typed, the company, else the category's. */
function prefillName(prefill: BillPrefill | null): string {
  if (!prefill) return '';
  if (prefill.name) return prefill.name;
  return defaultBillName(
    prefill.categoryId ?? '',
    categoryName(prefill.categoryId),
    prefill.issuer,
  );
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
  const { todayDate } = useToday();

  const [categoryId, setCategoryId] = useState<string>(
    existing?.category_id ?? prefill?.categoryId ?? '',
  );
  // Optional: many bills (rent, HOA fees, a loan from a relative) have no company behind them.
  // No logo choice is carried over, so saving the edit leaves the row's own logo alone.
  const [issuer, setIssuer] = useState<BrandSelection | null>(
    existing?.brand_id
      ? {
          brandId: existing.brand_id,
          name: existing.name,
          domain: logoDomainOf(existing),
          // Bills carry their own category, chosen a step earlier; the brand never answers it.
          categoryId: existing.category_id,
        }
      : existing
        ? null
        : (prefill?.issuer ?? null),
  );
  const [issuerChanged, setIssuerChanged] = useState(false);
  // The name a company gave the bill: replacing the company renames it, a name typed since stays.
  const [companyNamed, setCompanyNamed] = useState<string | null>(null);
  const [name, setName] = useState(existing?.name ?? prefillName(prefill));
  const [iconId, setIconId] = useState(existing?.icon_id ?? 'other');
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
  const [sourceId, setSourceId] = useState(
    existing?.card_id ?? existing?.bank_account_id ?? prefill?.sourceId ?? '',
  );
  const [note, setNote] = useState(existing?.note ?? prefill?.note ?? '');

  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Only a self-named bill needs its own icon; the rest inherit the category's.
  const isCustom = categoryId === 'other';

  // Exactly what pre-fills the name, so a name still equal to it was never typed.
  const categoryLabel = categoryName(categoryId);

  const hasPeriod = recurrence === PERIOD;

  const handleRecurrenceChange = (next: RecurrenceChoice) => {
    setError(null);
    setRecurrence(next);
    // The end date belongs to a period bill alone; the first due date stays, every bill needs one.
    if (next !== PERIOD) setEndDate(null);
  };

  const applyCategory = (category: BillCategory) => {
    // The name follows the category only while it is empty or still the old category's own default:
    // what the person typed, or the company's name ("Comcast" must not become "Internet"), stays.
    const current = name.trim();
    const unnamed = !current || current === categoryLabel;
    setCategoryId(category.id);
    if (unnamed) setName(category.id === 'other' ? '' : categoryName(category.id));
  };

  const [error, setError] = useState<string | null>(null);

  const { sources } = usePaymentSources();
  // Present only when this bill came from the loan calculator.
  const { data: loan } = useLoanForBill(id);
  const terms = loan ? termsFromStored(loan, existing?.next_due_on ?? undefined) : null;
  const schedule = terms ? amortise(terms).rows : [];
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const pastCharges = usePastCharges('bill', id);
  const deleteBill = useDeleteBill();
  const confirm = useConfirm();

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: t('bills.add.deleteTitle'),
      message: t('bills.add.deleteMessage'),
      confirmLabel: t('common.delete'),
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteBill.mutateAsync(id);
      router.back();
    } catch (thrown) {
      setError(failureMessage(thrown));
    }
  };

  // A draft over what is stored, so a reminder that loads late does not overwrite the choice.
  const savedReminder = useReminderChoice('bill', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

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

  const handleSave = async () => {
    setError(null);
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
      { sources, lastChargedOn: pastCharges.lastChargedOn },
    );
    if (!built.ok) {
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
      if (!pastCharges.ready) {
        pastCharges.retry();
        warn();
        setError(failureText());
        return;
      }

      const scope = await pastCharges.choose(carried.label, changed);
      if (scope === null) return;

      const billId =
        editing && id
          ? (await updateBill.mutateAsync({ id, values }), id)
          : (await createBill.mutateAsync(values)).id;

      if (scope === 'all') await pastCharges.apply(carried);

      // After the bill exists, because a reminder points at a row.
      await applyReminder('bill', billId, choiceToLead(reminder), remindAt);

      success();
      leave();
    } catch (thrown) {
      warn();
      setError(failureMessage(thrown));
    }
  };

  const busy = createBill.isPending || updateBill.isPending || pastCharges.saving;
  const value = Number(amount);
  const amountReady = Number.isFinite(value) && value > 0;
  const sourceLabel = sources.find((source) => source.id === sourceId)?.label ?? null;
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
        <Title className="mt-2">{t('bills.add.categoryQuestion')}</Title>

        <View className="mt-6 w-full pb-10">
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

  if (view === 'name') {
    return (
      <NameEditPage
        name={name}
        iconId={iconId}
        showIcon={isCustom && !issuer}
        onBack={toReview}
        onDone={(next) => {
          setName(next.name);
          setIconId(next.iconId);
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

  if (view === 'paidWith') {
    return (
      <PaidWithEditPage
        title={t('bills.field.paidWith')}
        sources={sources}
        value={sourceId}
        onBack={toReview}
        onDone={(next) => {
          setSourceId(next);
          settle();
        }}
      />
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

  if (view === 'due') {
    return (
      <DateEditPage
        title={hasPeriod ? t('bills.field.starts') : t('bills.field.due')}
        question={hasPeriod ? t('bills.add.startQuestion') : t('bills.add.dueQuestion')}
        value={startDate}
        onBack={toReview}
        onDone={(day) => {
          if (day) {
            setStartDate(day);
            // An end before the start is meaningless; drop it.
            if (endDate && day > endDate) setEndDate(null);
          }
          settle();
        }}
      />
    );
  }

  if (view === 'endDate') {
    return (
      <DateEditPage
        title={t('bills.field.to')}
        value={endDate}
        // Days before the start are not offered.
        minDate={startDate}
        footerExtra={(clear) => (
          <TextLink
            label={t('bills.add.clearEnd')}
            variant="subtle"
            onPress={clear}
            className="mt-2 self-start"
          />
        )}
        onBack={toReview}
        onDone={(day) => {
          setEndDate(day);
          settle();
        }}
      />
    );
  }

  if (view === 'reminder') {
    return (
      <ReminderEditPage
        title={t('ui.reminder.label')}
        kind="bill"
        value={reminder}
        time={remindAt}
        onBack={toReview}
        onDone={(choice, at) => {
          setReminderDraft(choice);
          setTimeDraft(at);
          settle();
        }}
      />
    );
  }

  const recurrenceChoices: { value: RecurrenceChoice; label: string }[] = [
    ...RECURRENCES.map((option) => ({ value: option.value, label: recurrenceLabel(option.value) })),
    { value: PERIOD, label: t('bills.add.specificPeriod') },
  ];
  const chosenCategory = BILL_CATEGORIES.find((option) => option.id === categoryId);

  // Picking a company names the bill unless it already has a real name of its own.
  const chooseCompany = (next: BrandSelection | null) => {
    setError(null);
    if (next !== issuer) setIssuerChanged(true);
    if (next) {
      const current = name.trim();
      if (!current || current === categoryLabel || current === companyNamed) {
        setName(next.name);
        setCompanyNamed(next.name);
      }
    }
    setIssuer(next);
  };

  const rows: EntryRowSpec[] = [
    {
      key: 'company',
      field: (
        <BrandField
          label={t('entry.row.optional', { label: t('bills.field.company') })}
          value={issuer}
          onChange={chooseCompany}
          placeholder={issuerHint(categoryId)}
          category={categoryId}
          noLogo="icon"
          changeLabel={(name) => t('bills.add.changeCompany', { name })}
          addLabel={(name) => t('bills.add.addCompanyAs', { name })}
        />
      ),
    },
    {
      key: 'name',
      label: t('bills.field.name'),
      value: name.trim() || null,
      required: true,
      // The company's logo when it has one, else the category's icon, as a saved bill draws it.
      leading: (
        <BillMark
          categoryId={categoryId}
          iconId={iconId}
          domain={issuer ? selectionLogo(issuer) : null}
          name={name}
          size={40}
        />
      ),
      onPress: () => setView('name'),
    },
    {
      key: 'category',
      label: t('bills.field.category'),
      value: categoryId ? categoryLabel : null,
      required: true,
      leading: <GlyphWell icon={chosenCategory?.icon ?? Tag} />,
      onPress: () => setView('categoryEdit'),
    },
    {
      key: 'due',
      label: hasPeriod ? t('bills.field.starts') : t('bills.field.due'),
      value: startDate ? formatEntryDay(startDate, todayDate) : null,
      required: true,
      leading: <GlyphWell icon={CalendarDays} />,
      onPress: () => setView('due'),
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
            label: t('bills.field.to'),
            value: endDate ? formatEntryDay(endDate, todayDate) : null,
            placeholder: t('bills.add.noEndDate'),
            leading: <GlyphWell icon={CalendarDays} />,
            onPress: () => setView('endDate'),
          },
        ]
      : []),
    // Without a card or account there is nothing to choose between, as before.
    ...(sources.length > 0
      ? [
          {
            key: 'paidWith',
            label: t('bills.field.paidWith'),
            value: sourceLabel,
            leading: <GlyphWell icon={CreditCard} />,
            onPress: () => setView('paidWith'),
          },
        ]
      : []),
    {
      key: 'reminder',
      label: t('ui.reminder.label'),
      value: reminderSummary(reminder, remindAt),
      placeholder: t('api.reminders.off'),
      leading: <GlyphWell icon={Bell} />,
      onPress: () => setView('reminder'),
    },
    {
      key: 'note',
      label: t('bills.field.note'),
      value: note.trim() || null,
      placeholder: t('entry.addNote'),
      leading: <GlyphWell icon={AlignLeft} />,
      onPress: () => setView('note'),
    },
  ];

  return (
    <EntryReview
      scrollPlace={{ y: reviewY, keep: setReviewY }}
      title={title}
      closePrompt={closePrompt}
      root={isRoot}
      onBack={() => {
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
      rows={rows}
      bottomSlot={
        schedule.length > 0 && loan ? (
          <ScheduleCard
            rows={schedule}
            onPress={() =>
              router.push({
                pathname: '/loan-schedule',
                params: {
                  // The stored convention and contract payment, not re-derived: the full schedule
                  // must be the same loan to the cent as the card above.
                  amount: String(loan.principal),
                  rate: String(loan.annual_rate),
                  months: String(loan.term_months),
                  start: loan.first_payment_on ?? '',
                  funded: loan.funded_on ?? '',
                  basis: loan.day_count_basis,
                  payment: String(loan.monthly_payment),
                  name: name || t('bills.add.paymentSchedule'),
                },
              })
            }
          />
        ) : null
      }
      primaryLabel={
        busy
          ? t('bills.add.saving')
          : editing
            ? t('bills.add.saveChanges')
            : t('bills.add.saveBill')
      }
      primaryDisabled={!amountReady || !name.trim() || !categoryId || !startDate || busy}
      onPrimary={() => void handleSave()}
      error={error}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bills.add.deleteA11y')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-app-medium text-[15px] text-danger"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {deleteBill.isPending ? t('bills.add.deleting') : t('bills.add.deleteBill')}
            </Text>
          </Pressable>
        ) : null
      }
    />
  );
}

/** A bill's name and, for a bill with no company, its icon. The company is chosen on the page. */
function NameEditPage({
  name,
  iconId,
  showIcon,
  onBack,
  onDone,
}: {
  name: string;
  iconId: string;
  /** The icon only shows when there is no logo, so offering it beside one does nothing. */
  showIcon: boolean;
  onBack: () => void;
  onDone: (next: { name: string; iconId: string }) => void;
}) {
  const [nameDraft, setNameDraft] = useState(name);
  const [iconDraft, setIconDraft] = useState(iconId);

  return (
    <FieldPage
      title={t('bills.field.name')}
      onBack={onBack}
      onDone={() => onDone({ name: nameDraft, iconId: iconDraft })}
      doneDisabled={!nameDraft.trim()}
      avoidKeyboard
    >
      <View className="mt-2 w-full gap-5">
        <TextField
          label={t('bills.field.name')}
          value={nameDraft}
          onChangeText={setNameDraft}
          autoCapitalize="words"
          returnKeyType="done"
        />

        {showIcon ? (
          <View className="w-full">
            <FieldLabel className="mb-2">{t('bills.field.icon')}</FieldLabel>
            <IconPicker value={iconDraft} onChange={setIconDraft} />
          </View>
        ) : null}
      </View>
    </FieldPage>
  );
}
