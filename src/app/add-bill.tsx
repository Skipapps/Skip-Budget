import { router, useLocalSearchParams } from 'expo-router';
import { Calculator, Calendar, ChevronLeft, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useCreateBill, useDeleteBill, useUpdateBill, type BillValues } from '@/api/mutations';
import { useBill, usePaymentSources } from '@/api/queries';
import { CategoryPicker } from '@/components/bills/category-picker';
import { IconPicker } from '@/components/bills/icon-picker';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
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
import { colors } from '@/theme/colors';

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
    // Leaving the period option would otherwise save dates the user cannot see.
    if (next !== PERIOD) {
      setStartDate(null);
      setEndDate(null);
    }
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

      if (editing && id) {
        await updateBill.mutateAsync({ id, values });
      } else {
        await createBill.mutateAsync(values);
      }
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
        className="-ml-2 mt-1 h-11 w-11 items-center justify-center rounded-[10px] active:bg-black/5"
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
            <SelectField
              label="From"
              value={startDate ? formatFullDate(startDate) : ''}
              placeholder="First due date"
              icon={Calendar}
              onPress={() => setDatePicker('start')}
            />

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
            className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] active:bg-black/5"
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
