import { router, useLocalSearchParams } from 'expo-router';
import { Calculator, Calendar, Trash2 } from 'lucide-react-native';
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
import { billCategoryLabel, recurrenceLabel } from '@/components/bills/bill-row';
import { CategoryPicker } from '@/components/bills/category-picker';
import { IconPicker } from '@/components/bills/icon-picker';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { FlowHeader, StepFlow } from '@/components/flow/step-flow';
import { ActionPill } from '@/components/ui/action-pill';
import { ReminderField } from '@/components/ui/reminder-field';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DatePicker } from '@/components/ui/date-picker';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/providers/dialog-provider';
import { SelectField } from '@/components/ui/select-field';
import { SourceTiles } from '@/components/ui/source-tiles';
import { TextField } from '@/components/ui/text-field';
import { FieldLabel, Title } from '@/components/ui/typography';
import {
  BILL_CATEGORIES,
  RECURRENCES,
  type BillCategory,
  type Recurrence,
} from '@/data/bills-mock';
import { t } from '@/i18n';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { success, warn } from '@/lib/haptics';
import { failureMessage, failureText } from '@/lib/failure';
import { logoColumns } from '@/lib/logo-columns';
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

/** The category chooser is its own screen before the dots: it pre-fills the name, so runs first. */
type Step = 'category' | 'amount' | 'details' | 'when';

const DOTS: readonly Step[] = ['amount', 'details', 'when'];

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
          steps={3}
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
  fromVoice = false,
}: {
  id?: string;
  existing: ReturnType<typeof useBill>['data'] | null;
  /** What the voice review page heard, for a new bill. */
  prefill?: BillPrefill | null;
  /** Saved from a voice hand-off: back to Home, never onto the review page again. */
  fromVoice?: boolean;
}) {
  const colors = useColors();
  const editing = Boolean(id);
  // The category chooser is skipped when editing, or when a pre-filled bill has a category already.
  const [step, setStep] = useState<Step>(editing || prefill?.categoryId ? 'amount' : 'category');
  const dot = Math.max(DOTS.indexOf(step), 0);

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
  const [note, setNote] = useState(existing?.note ?? '');

  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Only a self-named bill needs its own icon; the rest inherit the category's.
  const isCustom = categoryId === 'other';

  // Exactly what pre-fills the name, so a name still equal to it was never typed.
  const categoryLabel = categoryName(categoryId);

  // Picking a company names the bill unless it has a real name: the default category label (named
  // by the app, not the person) counts as unnamed; anything typed is left alone.
  const handleIssuer = (next: BrandSelection | null) => {
    setIssuer(next);
    setIssuerChanged(true);
    if (!next) return;

    const current = name.trim();
    const untouched = !current || current === categoryLabel || current === issuer?.name;
    if (untouched) setName(next.name);
  };
  const hasPeriod = recurrence === PERIOD;

  const handleRecurrenceChange = (next: RecurrenceChoice) => {
    setRecurrence(next);
    // The end date belongs to a period bill alone; the first due date stays, every bill needs one.
    if (next !== PERIOD) setEndDate(null);
  };

  const handleSelectCategory = (category: BillCategory) => {
    setCategoryId(category.id);
    // Pre-fill the name so common bills are one tap from done, unless it is already a real name
    // (the company's, or typed on the voice review page): "Comcast" must not become "Internet".
    const current = name.trim();
    const real = Boolean(current) && (current === issuer?.name || current === prefill?.name);
    if (!real) setName(category.id === 'other' ? '' : categoryName(category.id));
    setStep('amount');
  };

  const [error, setError] = useState<{ message: string; step: Step } | null>(null);

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
      setError({ message: failureMessage(thrown), step });
    }
  };

  // A draft over what is stored, so a reminder that loads late does not overwrite the choice.
  const savedReminder = useReminderChoice('bill', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  const fail = (message: string, atStep: Step) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
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
      fail(built.message, built.field);
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
        setError({ message: failureText(), step: 'when' });
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
      setError({ message: failureMessage(thrown), step: 'when' });
    }
  };

  if (step === 'category') {
    return (
      <Screen
        header={
          <FlowHeader
            title={t('bills.addABill')}
            onBack={() => router.back()}
            closePrompt={t('bills.add.closeNew')}
          />
        }
      >
        <Title className="mt-2">{t('bills.add.categoryQuestion')}</Title>

        <View className="mt-6 w-full pb-10">
          <CategoryPicker onSelect={handleSelectCategory} selectedId={categoryId} />
        </View>
      </Screen>
    );
  }

  const busy = createBill.isPending || updateBill.isPending || pastCharges.saving;
  const value = Number(amount);
  const amountReady = Number.isFinite(value) && value > 0;
  const stepValid =
    step === 'amount' ? amountReady : step === 'details' ? Boolean(name.trim()) : !busy;

  const question =
    step === 'amount'
      ? t('bills.add.amountQuestion')
      : step === 'when'
        ? hasPeriod
          ? t('bills.add.startQuestion')
          : t('bills.add.dueQuestion')
        : undefined;

  const primaryLabel =
    step !== 'when'
      ? t('common.continue')
      : busy
        ? t('bills.add.saving')
        : editing
          ? t('bills.add.saveChanges')
          : t('bills.add.saveBill');

  const categoryOptions = BILL_CATEGORIES.map((category) => ({
    value: category.id,
    label: billCategoryLabel(category.id, category.label),
  }));
  const recurrenceChoices: { value: RecurrenceChoice; label: string }[] = [
    ...RECURRENCES.map((option) => ({ value: option.value, label: recurrenceLabel(option.value) })),
    { value: PERIOD, label: t('bills.add.specificPeriod') },
  ];

  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? t('bills.add.titleEdit') : t('bills.addABill')}
      closePrompt={editing ? t('bills.add.closeEdit') : t('bills.add.closeNew')}
      steps={3}
      current={dot}
      onBack={() => {
        setError(null);
        if (step === 'amount') {
          // Back to the chooser when it was used; straight out when editing or when the voice page
          // already named the category.
          if (editing || (fromVoice && prefill?.categoryId)) router.back();
          else setStep('category');
        } else if (step === 'details') setStep('amount');
        else setStep('details');
      }}
      question={question}
      headerSlot={
        step === 'amount' ? (
          <View className="w-full flex-row justify-center">
            <ActionPill
              icon={Calculator}
              label={t('bills.add.calculator')}
              onPress={() => setCalculatorOpen(true)}
            />
          </View>
        ) : null
      }
      primaryLabel={primaryLabel}
      primaryDisabled={!stepValid}
      onPrimary={() => {
        if (step === 'amount') {
          setError(null);
          setStep('details');
          return;
        }
        if (step === 'details') {
          setError(null);
          setStep('when');
          return;
        }
        void handleSave();
      }}
      error={step === 'details' ? null : stepError}
      avoidKeyboard={step === 'details'}
      footerSlot={
        editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bills.add.deleteA11y')}
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text className="font-app-medium text-[15px] text-danger" maxFontSizeMultiplier={1.4}>
              {deleteBill.isPending ? t('bills.add.deleting') : t('bills.add.deleteBill')}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 'amount' ? <AmountStep value={amount} onChange={setAmount} /> : null}

      {step === 'details' ? (
        <View className="w-full gap-5">
          <BrandField
            label={t('bills.field.company')}
            value={issuer}
            onChange={handleIssuer}
            placeholder={issuerHint(categoryId)}
            category={categoryId}
            noLogo="icon"
          />

          <TextField
            label={t('bills.field.name')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
          />

          {/* The icon only shows when there is no logo, so offering it beside one does nothing. */}
          {isCustom && !issuer ? (
            <View className="w-full">
              <FieldLabel className="mb-2">{t('bills.field.icon')}</FieldLabel>
              <IconPicker value={iconId} onChange={setIconId} />
            </View>
          ) : null}

          <View className="w-full">
            <FieldLabel className="mb-2">{t('bills.field.category')}</FieldLabel>
            <ChoiceChips
              options={categoryOptions}
              value={categoryId}
              onChange={(next) => setCategoryId(next)}
            />
          </View>

          <View className="w-full">
            <FieldLabel className="mb-2">{t('bills.field.paidWith')}</FieldLabel>
            <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
          </View>

          {schedule.length > 0 && loan ? (
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
          ) : null}

          <TextField
            label={t('bills.field.note')}
            optional
            value={note}
            onChangeText={setNote}
            placeholder={t('bills.add.notePlaceholder')}
            multiline
            maxLength={200}
            autoCapitalize="sentences"
          />

          {stepError ? (
            <Text className="w-full font-app text-[13px] text-danger" maxFontSizeMultiplier={1.4}>
              {stepError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 'when' ? (
        <View className="w-full gap-6">
          <InlineCalendar
            value={startDate}
            onChange={(date) => {
              setStartDate(date);
              // An end before the start is meaningless; drop it.
              if (endDate && date > endDate) setEndDate(null);
            }}
          />

          <View className="w-full">
            <FieldLabel className="mb-2">{t('bills.field.recurring')}</FieldLabel>
            <ChoiceChips
              options={recurrenceChoices}
              value={recurrence}
              onChange={handleRecurrenceChange}
            />
          </View>

          {/* Stacked: two date fields in one row truncate a full date on a narrow phone. */}
          {hasPeriod ? (
            <View className="w-full">
              <SelectField
                label={t('bills.field.to')}
                variant="pill"
                value={endDate ? formatFullDate(endDate) : ''}
                placeholder={t('bills.add.noEndDate')}
                icon={Calendar}
                onPress={() => setDatePicker('end')}
              />
              {endDate ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('bills.add.clearEndA11y')}
                  onPress={() => setEndDate(null)}
                  className="mt-1.5 self-start rounded-full px-1 py-1 active:opacity-60"
                >
                  <Text className="ml-4 font-app text-[13px] text-muted">
                    {t('bills.add.clearEnd')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ReminderField
            kind="bill"
            value={reminder}
            onChange={setReminderDraft}
            time={remindAt}
            onTimeChange={setTimeDraft}
          />
        </View>
      ) : null}

      {datePicker ? (
        <DatePicker
          value={(datePicker === 'start' ? startDate : endDate) ?? startDate ?? new Date()}
          // Days before the start are not offered; the check below backstops a start moved later.
          minDate={datePicker === 'end' ? startDate : null}
          onCancel={() => setDatePicker(null)}
          onConfirm={(date) => {
            if (datePicker === 'start') {
              setStartDate(date);
              if (endDate && date > endDate) setEndDate(null);
            } else if (startDate && toIsoDate(date) < toIsoDate(startDate)) {
              // A period that finishes before it begins is refused, not quietly kept. Compared as
              // ISO days: exact, no clock.
              setDatePicker(null);
              fail(t('api.entry.endBeforeStart'), 'when');
              return;
            } else {
              setError(null);
              setEndDate(date);
            }
            setDatePicker(null);
          }}
        />
      ) : null}

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
