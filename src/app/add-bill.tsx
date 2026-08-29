import { router, useLocalSearchParams } from 'expo-router';
import { Calculator, Calendar, ChevronLeft, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  choiceToLead,
  useApplyReminder,
  useReminderChoice,
  type ReminderChoice,
} from '@/api/reminders';
import { useCreateBill, useDeleteBill, useUpdateBill, type BillValues } from '@/api/mutations';
import { useBill, useLoanForBill, usePaymentSources } from '@/api/queries';
import { ScheduleCard } from '@/components/calculators/schedule-card';
import { CategoryPicker } from '@/components/bills/category-picker';
import { IconPicker } from '@/components/bills/icon-picker';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { ReminderField } from '@/components/ui/reminder-field';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
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
import { formatCurrency } from '@/lib/format';
import { amortisationSchedule } from '@/lib/loan';
import { useColors } from '@/providers/theme-provider';

const CATEGORY_OPTIONS = BILL_CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
}));

/** The open-ended schedules, plus one that runs only between two dates. */
const PERIOD = 'period';
const RECURRENCE_CHOICES = [...RECURRENCES, { value: PERIOD, label: 'Specific period' }] as const;

type RecurrenceChoice = Recurrence | typeof PERIOD;

type Step = 'category' | 'details';

const asDate = (value?: string | null) => (value ? new Date(`${value}T00:00:00`) : null);

/** Loads the bill being edited, then seeds the form by remount. */
export default function AddBillScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: existing, isLoading } = useBill(id);

  if (id && isLoading && !existing) {
    return (
      <Screen showBack>
        <Title className="mt-2">Edit bill</Title>
        <View className="mt-16 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  return <BillForm key={existing?.id ?? 'new'} id={id} existing={existing ?? null} />;
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

  const [categoryId, setCategoryId] = useState<string>(existing?.category_id ?? '');
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
  const [padOpen, setPadOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Only a self-named bill needs its own icon; the rest inherit the category's.
  const isCustom = categoryId === 'other';
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
    setStep('details');
  };

  // Saving waits on the data layer; this only closes the screen.
  const [error, setError] = useState<string | null>(null);

  const { sources } = usePaymentSources();
  // Present only when this bill came from the loan calculator, which is what
  // decides whether there is a schedule worth offering.
  const { data: loan } = useLoanForBill(id);
  const schedule = loan
    ? amortisationSchedule(
        loan.principal,
        loan.annual_rate,
        loan.term_months,
        new Date(`${loan.first_payment_on ?? existing?.next_due_on}T00:00:00`),
      )
    : [];
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
      setError((thrown as Error).message ?? 'Could not delete that bill.');
    }
  };

  // Held as a draft over whatever is stored, so a reminder that loads a moment
  // after the form does not overwrite what is already being chosen.
  const savedReminder = useReminderChoice('bill', id);
  const [reminderDraft, setReminderDraft] = useState<ReminderChoice | null>(null);
  const reminder = reminderDraft ?? savedReminder;
  const applyReminder = useApplyReminder();

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Give the bill a name.');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter how much it costs.');
      return;
    }
    // A bill with no date cannot be scheduled, so it would save and then never
    // appear anywhere. Better to ask for it than to lose it silently.
    if (!startDate) {
      setError(hasPeriod ? 'Pick the date it starts.' : 'Pick the first due date.');
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
      await applyReminder('bill', billId, choiceToLead(reminder));

      router.back();
    } catch (thrown) {
      setError((thrown as Error).message ?? 'Could not save that bill.');
    }
  };

  if (step === 'category') {
    return (
      <Screen showBack>
        <Title className="mt-2">Add a bill</Title>
        <Subtitle className="mt-3">
          Pick what this bill is for. You can rename it on the next step.
        </Subtitle>

        <View className="mt-7 w-full pb-10">
          <CategoryPicker onSelect={handleSelectCategory} selectedId={categoryId} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen avoidKeyboard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to categories"
        onPress={() => setStep('category')}
        className="-ml-2 mt-1 h-11 w-11 items-center justify-center rounded-[10px] active:bg-ink/5"
      >
        <ChevronLeft size={26} color={colors.ink} strokeWidth={2} />
      </Pressable>

      <Title className="mt-1">Bill details</Title>

      <View className="mt-7 w-full gap-5">
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
        />

        {isCustom ? (
          <View className="w-full">
            <FieldLabel className="mb-2">Icon</FieldLabel>
            <IconPicker value={iconId} onChange={setIconId} />
          </View>
        ) : null}

        <SelectField
          label="Amount"
          value={amount ? formatCurrency(Number(amount)) : ''}
          placeholder="Enter an amount"
          icon={Calculator}
          onPress={() => setPadOpen(true)}
          onIconPress={() => setCalculatorOpen(true)}
          iconAccessibilityLabel="Open calculator"
        />

        {/* Directly under the amount, and shown for every recurrence — this is
            the date the schedule counts from, so a monthly bill is as dated as
            a one-off. Without it nothing knows when the bill lands. */}
        <SelectField
          label={hasPeriod ? 'From' : 'First due date'}
          value={startDate ? formatFullDate(startDate) : ''}
          placeholder={hasPeriod ? 'Pick a start date' : 'Pick a date'}
          icon={Calendar}
          onPress={() => setDatePicker('start')}
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
          <>
            <View className="w-full">
              <SelectField
                label="To"
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
                  className="mt-1.5 self-start rounded-[8px] px-1 py-1 active:opacity-60"
                >
                  <Text className="ml-4 font-poppins text-[13px] text-muted">
                    Clear — make it ongoing
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
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
                  amount: String(loan.principal),
                  rate: String(loan.annual_rate),
                  months: String(loan.term_months),
                  start: loan.first_payment_on ?? '',
                  name: name || 'Payment schedule',
                },
              })
            }
          />
        ) : null}

        <ReminderField kind="bill" value={reminder} onChange={setReminderDraft} />

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
      </View>

      {error ? (
        <Text
          className="mt-6 w-full text-center font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-auto w-full gap-3 pt-10">
        <Button
          label={
            createBill.isPending || updateBill.isPending
              ? 'Saving…'
              : editing
                ? 'Save changes'
                : 'Save bill'
          }
          onPress={handleSave}
        />
        {editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this bill"
            onPress={handleDelete}
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] active:bg-ink/5"
          >
            <Trash2 size={17} color="#DC2626" strokeWidth={1.9} />
            <Text
              className="font-poppins-medium text-[15px] text-red-600"
              maxFontSizeMultiplier={1.4}
            >
              {deleteBill.isPending ? 'Deleting…' : 'Delete bill'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {datePicker ? (
        <DatePicker
          value={(datePicker === 'start' ? startDate : endDate) ?? startDate ?? new Date()}
          onCancel={() => setDatePicker(null)}
          onConfirm={(date) => {
            if (datePicker === 'start') {
              setStartDate(date);
              // An end before the start is meaningless — drop it.
              if (endDate && date > endDate) setEndDate(null);
            } else {
              setEndDate(date);
            }
            setDatePicker(null);
          }}
        />
      ) : null}

      {padOpen ? (
        <AmountPad
          title="Bill amount"
          caption={
            RECURRENCE_CHOICES.find((option) => option.value === recurrence)?.label ?? 'Each time'
          }
          value={amount}
          onCancel={() => setPadOpen(false)}
          onConfirm={(next) => {
            setAmount(next);
            setPadOpen(false);
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
    </Screen>
  );
}
