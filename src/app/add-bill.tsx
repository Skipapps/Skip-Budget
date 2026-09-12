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
import { useCreateBill, useDeleteBill, useUpdateBill, type BillValues } from '@/api/mutations';
import { useBill, useLoanForBill, usePaymentSources } from '@/api/queries';
import { ScheduleCard } from '@/components/calculators/schedule-card';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { CategoryPicker } from '@/components/bills/category-picker';
import { IconPicker } from '@/components/bills/icon-picker';
import { AmountStep } from '@/components/flow/amount-step';
import { InlineCalendar } from '@/components/flow/inline-calendar';
import { StepFlow } from '@/components/flow/step-flow';
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
import { FieldLabel, Subtitle, Title } from '@/components/ui/typography';
import {
  BILL_CATEGORIES,
  RECURRENCES,
  type BillCategory,
  type Recurrence,
} from '@/data/bills-mock';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { success, warn } from '@/lib/haptics';
import { amortise, termsFromStored } from '@/lib/loan';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

const CATEGORY_OPTIONS = BILL_CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
}));

/** The open-ended schedules, plus one that runs only between two dates. */
const PERIOD = 'period';
const RECURRENCE_CHOICES = [...RECURRENCES, { value: PERIOD, label: 'Specific period' }] as const;

type RecurrenceChoice = Recurrence | typeof PERIOD;

/**
 * What to search for, in the words of the category already chosen.
 *
 * A blank "search for a company" leaves people guessing whether their electric
 * utility counts. Naming three real ones answers that before it is asked.
 */
const ISSUER_HINT: Record<string, string> = {
  housing: 'Letting agent or management company',
  energy: 'AEP, Duke Energy, National Grid',
  water: 'Your water company',
  internet: 'Xfinity, Spectrum, Verizon',
  mobile: 'T-Mobile, AT&T, Verizon',
  insurance: 'Geico, State Farm, Progressive',
  loans: 'Chase, Discover, SoFi',
  transport: 'Transit, tolls or parking',
  family: 'Nursery, school or clinic',
  other: 'Search for a company',
};

/**
 * The category chooser stays a screen of its own, before the dots.
 *
 * It is what pre-fills the bill's name, so it has to run first — and folding it
 * into the indicator would make bills the one four-dot flow in the app.
 */
type Step = 'category' | 'amount' | 'details' | 'when';

const DOTS: readonly Step[] = ['amount', 'details', 'when'];

const asDate = (value?: string | null) => (value ? new Date(`${value}T00:00:00`) : null);

/**
 * Loads the bill being edited, then seeds the form by remount.
 *
 * An edit with no record in hand never becomes a blank form. `id` is what
 * makes Save an update, so a form mounted without the row would write its empty
 * fields over a real bill the moment somebody pressed Save — a read that failed
 * would cost the amount, the date and the source. Still loading, could not be
 * read and no longer there are three different answers, and each is said out
 * loud rather than collapsing into an innocent-looking "Add a bill".
 */
export default function AddBillScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artwork = useArtwork();
  const bill = useBill(id);
  const existing = bill.data ?? null;

  if (id && !existing) {
    // A failed read, offered the retry rather than a form. Never a fall back to
    // creating: the row is still there, it is this screen that cannot see it.
    if (bill.isError) {
      return (
        <Screen showBack>
          <PageState
            art={artwork.error}
            title="Could not open this bill"
            message="Check your connection and try again. Nothing about the bill has changed."
            actionLabel="Try again"
            onAction={() => {
              void bill.refetch();
            }}
            secondaryLabel="Go back"
            onSecondary={() => router.back()}
          />
        </Screen>
      );
    }

    // Skeletons in the shell rather than a spinner on a blank page — and never a
    // $0 figure for a bill whose amount has not arrived yet.
    if (!bill.isFetched) {
      return (
        <StepFlow
          title="Edit bill"
          steps={3}
          current={1}
          onBack={() => router.back()}
          primaryLabel="Continue"
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

    // The read landed and there is no row: deleted from another screen, or a
    // stale link. An update filtered on an id that matches nothing reports
    // success and writes nothing, so an edit here would quietly lose the lot.
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title="That bill is not here"
          message="It may have been deleted. Nothing has been changed."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return <BillForm key={existing?.id ?? 'new'} id={id} existing={existing} />;
}

function BillForm({
  id,
  existing,
}: {
  id?: string;
  existing: ReturnType<typeof useBill>['data'] | null;
}) {
  const colors = useColors();
  const editing = Boolean(id);
  // Editing starts on the details step: the category is already chosen, and
  // making someone re-pick it to fix an amount would be busywork.
  const [step, setStep] = useState<Step>(editing ? 'details' : 'category');
  const dot = Math.max(DOTS.indexOf(step), 0);

  const [categoryId, setCategoryId] = useState<string>(existing?.category_id ?? '');
  // Who issues the bill. Optional, and stays that way: a large share of bills
  // — rent, HOA fees, a loan from a relative — have no company behind them.
  const [issuer, setIssuer] = useState<BrandSelection | null>(
    existing?.brand_id
      ? {
          brandId: existing.brand_id,
          name: existing.name,
          domain: existing.brands?.domain ?? null,
          // Bills carry their own category vocabulary, chosen a step earlier.
          // The brand is never allowed to answer that question.
          categoryId: existing.category_id,
        }
      : null,
  );
  const [name, setName] = useState(existing?.name ?? '');
  const [iconId, setIconId] = useState(existing?.icon_id ?? 'other');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [startDate, setStartDate] = useState<Date | null>(
    asDate(existing?.starts_on ?? existing?.next_due_on),
  );
  const [endDate, setEndDate] = useState<Date | null>(asDate(existing?.ends_on));
  const [recurrence, setRecurrence] = useState<RecurrenceChoice>(
    (existing?.recurrence as RecurrenceChoice) ?? 'monthly',
  );
  const [sourceId, setSourceId] = useState(existing?.card_id ?? existing?.bank_account_id ?? '');
  const [note, setNote] = useState(existing?.note ?? '');

  // Which date the picker is editing, or null when it is closed.
  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Only a self-named bill needs its own icon; the rest inherit the category's.
  const isCustom = categoryId === 'other';

  /**
   * Picking a company names the bill, unless it has been given a real name.
   *
   * "Not named yet" is broader than "empty", because choosing a category
   * already fills the field with its label — so a bill sitting on the default
   * "Mobile Phone" has been named by the app, not by the person, and T-Mobile
   * is the better answer. Anything they typed themselves is left alone, as is
   * "Flat — electric".
   */
  const categoryLabel = BILL_CATEGORIES.find((option) => option.id === categoryId)?.label ?? '';

  const handleIssuer = (next: BrandSelection | null) => {
    setIssuer(next);
    if (!next) return;

    const current = name.trim();
    const untouched = !current || current === categoryLabel || current === issuer?.name;
    if (untouched) setName(next.name);
  };
  // The date range is only meaningful for a bill that runs between two dates.
  const hasPeriod = recurrence === PERIOD;

  const handleRecurrenceChange = (next: RecurrenceChoice) => {
    setRecurrence(next);
    // The end date belongs to a period bill alone, so it goes when the period
    // does. The first due date stays: every bill needs one, whatever its cycle.
    if (next !== PERIOD) setEndDate(null);
  };

  const handleSelectCategory = (category: BillCategory) => {
    setCategoryId(category.id);
    // Pre-fill the name so common bills are one tap from done.
    setName(category.id === 'other' ? '' : category.label);
    setStep('amount');
  };

  // Saving waits on the data layer; this only closes the screen.
  const [error, setError] = useState<{ message: string; step: Step } | null>(null);

  const { sources } = usePaymentSources();
  // Present only when this bill came from the loan calculator, which is what
  // decides whether there is a schedule worth offering.
  const { data: loan } = useLoanForBill(id);
  const terms = loan ? termsFromStored(loan, existing?.next_due_on ?? undefined) : null;
  const schedule = terms ? amortise(terms).rows : [];
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const confirm = useConfirm();

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete this bill?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteBill.mutateAsync(id);
      router.back();
    } catch (thrown) {
      setError({ message: (thrown as Error).message ?? 'Could not delete that bill.', step });
    }
  };

  // Held as a draft over whatever is stored, so a reminder that loads a moment
  // after the form does not overwrite what is already being chosen.
  const savedReminder = useReminderChoice('bill', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const reminder = reminderDraft ?? savedReminder.choice;
  const remindAt = timeDraft ?? savedReminder.remindAt;
  const applyReminder = useApplyReminder();

  /** A check for a field on an earlier step sends you back to that step. */
  const fail = (message: string, atStep: Step) => {
    warn();
    setError({ message, step: atStep });
    setStep(atStep);
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      fail('Give the bill a name.', 'details');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      fail('Enter how much it costs.', 'amount');
      return;
    }
    // A bill with no date cannot be scheduled, so it would save and then never
    // appear anywhere. Better to ask for it than to lose it silently.
    if (!startDate) {
      fail(hasPeriod ? 'Pick the date it starts.' : 'Pick the first due date.', 'when');
      return;
    }
    // Last line of defence, and the only one that sees an edited bill whose
    // stored dates were already the wrong way round. Compared as ISO days: no
    // clock, no timezone, exact.
    if (hasPeriod && endDate && toIsoDate(endDate) < toIsoDate(startDate)) {
      fail('The end date cannot be before the start date.', 'when');
      return;
    }

    const chosen = sources.find((source) => source.id === sourceId);
    // "Specific period" is a recurrence in the UI but a date range in the
    // database, where the recurrence column carries 'period'.
    const isPeriod = recurrence === PERIOD;

    try {
      const values: BillValues = {
        name: name.trim(),
        amount: value,
        brand_id: issuer?.brandId ?? null,
        category_id: categoryId,
        icon_id: iconId || null,
        recurrence: isPeriod
          ? 'period'
          : (recurrence as 'weekly' | 'monthly' | 'quarterly' | 'yearly'),
        next_due_on: startDate ? toIsoDate(startDate) : null,
        starts_on: startDate ? toIsoDate(startDate) : null,
        ends_on: endDate ? toIsoDate(endDate) : null,
        card_id: chosen?.kind === 'card' ? chosen.id : null,
        bank_account_id: chosen?.kind === 'account' ? chosen.id : null,
        note: note.trim() || null,
      };

      const billId =
        editing && id
          ? (await updateBill.mutateAsync({ id, values }), id)
          : (await createBill.mutateAsync(values)).id;

      // After the bill exists, because a reminder points at a row.
      await applyReminder('bill', billId, choiceToLead(reminder), remindAt);

      success();
      router.back();
    } catch (thrown) {
      warn();
      setError({ message: (thrown as Error).message ?? 'Could not save that bill.', step: 'when' });
    }
  };

  if (step === 'category') {
    return (
      <Screen showBack>
        <Title className="mt-2">What is this bill for?</Title>
        <Subtitle className="mt-3">
          Pick what this bill is for. You can rename it on the next step.
        </Subtitle>

        <View className="mt-7 w-full pb-10">
          <CategoryPicker onSelect={handleSelectCategory} selectedId={categoryId} />
        </View>
      </Screen>
    );
  }

  const busy = createBill.isPending || updateBill.isPending;
  const value = Number(amount);
  const amountReady = Number.isFinite(value) && value > 0;
  const stepValid =
    step === 'amount' ? amountReady : step === 'details' ? Boolean(name.trim()) : !busy;

  const question =
    step === 'amount'
      ? 'How much is the bill?'
      : step === 'when'
        ? hasPeriod
          ? 'When does it start?'
          : 'When is it due?'
        : undefined;

  const primaryLabel =
    step !== 'when' ? 'Continue' : busy ? 'Saving…' : editing ? 'Save changes' : 'Save bill';

  const stepError = error && error.step === step ? error.message : null;

  return (
    <StepFlow
      title={editing ? 'Edit bill' : 'Add a bill'}
      steps={3}
      current={dot}
      onBack={() => {
        setError(null);
        if (step === 'amount') {
          // Back out to the chooser when it was used; straight out when editing.
          if (editing) router.back();
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
              label="Calculator"
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
            accessibilityLabel="Delete this bill"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-full active:bg-ink/5"
          >
            <Trash2 size={17} color={colors.danger} strokeWidth={1.8} />
            <Text
              className="font-poppins-medium text-[15px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
              {deleteBill.isPending ? 'Deleting…' : 'Delete bill'}
            </Text>
          </Pressable>
        ) : null
      }
    >
      {step === 'amount' ? <AmountStep value={amount} onChange={setAmount} /> : null}

      {step === 'details' ? (
        <View className="w-full gap-5">
          {/* Above the name, because it is the question people can answer
              first: the company is what they recognise, the name is what they
              want to call it. */}
          <BrandField
            label="Company"
            value={issuer}
            onChange={handleIssuer}
            placeholder={ISSUER_HINT[categoryId] ?? ISSUER_HINT.other}
          />

          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
          />

          {/* The icon is only ever seen when there is no logo to show instead,
              so offering it beside one is a control that changes nothing. */}
          {isCustom && !issuer ? (
            <View className="w-full">
              <FieldLabel className="mb-2">Icon</FieldLabel>
              <IconPicker value={iconId} onChange={setIconId} />
            </View>
          ) : null}

          <View className="w-full">
            <FieldLabel className="mb-2">Category</FieldLabel>
            <ChoiceChips
              options={CATEGORY_OPTIONS}
              value={categoryId}
              onChange={(next) => setCategoryId(next)}
            />
          </View>

          <View className="w-full">
            <FieldLabel className="mb-2">Paid with</FieldLabel>
            <SourceTiles sources={sources} value={sourceId} onChange={setSourceId} />
          </View>

          {schedule.length > 0 && loan ? (
            <ScheduleCard
              rows={schedule}
              onPress={() =>
                router.push({
                  pathname: '/loan-schedule',
                  params: {
                    // The stored convention and the stored contract payment,
                    // not re-derived ones: the card above this button is built
                    // from the saved row, and the full schedule has to be the
                    // same loan to the cent rather than a fresh solve of it.
                    amount: String(loan.principal),
                    rate: String(loan.annual_rate),
                    months: String(loan.term_months),
                    start: loan.first_payment_on ?? '',
                    funded: loan.funded_on ?? '',
                    basis: loan.day_count_basis,
                    payment: String(loan.monthly_payment),
                    name: name || 'Payment schedule',
                  },
                })
              }
            />
          ) : null}

          <TextField
            label="Note"
            optional
            value={note}
            onChangeText={setNote}
            placeholder="Anything worth remembering"
            multiline
            maxLength={200}
            autoCapitalize="sentences"
          />

          {stepError ? (
            <Text
              className="w-full font-poppins text-[13px] text-danger"
              maxFontSizeMultiplier={1.4}
            >
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
              // An end before the start is meaningless — drop it, exactly as
              // the modal picker did when it owned this date.
              if (endDate && date > endDate) setEndDate(null);
            }}
          />

          <View className="w-full">
            <FieldLabel className="mb-2">Recurring</FieldLabel>
            <ChoiceChips
              options={RECURRENCE_CHOICES}
              value={recurrence}
              onChange={handleRecurrenceChange}
            />
          </View>

          {/* Stacked, not side by side: two date fields in one row truncate a
              full date on a narrow phone. */}
          {hasPeriod ? (
            <View className="w-full">
              <SelectField
                label="To"
                variant="pill"
                value={endDate ? formatFullDate(endDate) : ''}
                placeholder="Ongoing — no end date"
                icon={Calendar}
                onPress={() => setDatePicker('end')}
              />
              {endDate ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear end date"
                  onPress={() => setEndDate(null)}
                  className="mt-1.5 self-start rounded-full px-1 py-1 active:opacity-60"
                >
                  <Text className="ml-4 font-poppins text-[13px] text-muted">
                    Clear — make it ongoing
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
          // The end of a period cannot precede its start, so those days are
          // never offered. The check below stays as the backstop for the one
          // path that skips the grid: a start date moved after the fact.
          minDate={datePicker === 'end' ? startDate : null}
          onCancel={() => setDatePicker(null)}
          onConfirm={(date) => {
            if (datePicker === 'start') {
              setStartDate(date);
              // An end before the start is meaningless — drop it.
              if (endDate && date > endDate) setEndDate(null);
            } else if (startDate && toIsoDate(date) < toIsoDate(startDate)) {
              // The other half of the same rule: a period that finishes before
              // it begins is not a period. Refused rather than quietly kept,
              // so the field does not sit there reading like a valid date.
              // Compared as ISO days, which is exact and has no clock in it.
              setDatePicker(null);
              fail('The end date cannot be before the start date.', 'when');
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
          title="Calculator"
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
