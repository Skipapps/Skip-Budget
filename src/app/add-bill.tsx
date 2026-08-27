import { router } from 'expo-router';
import { Calculator, Calendar, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CategoryPicker } from '@/components/bills/category-picker';
import { IconPicker } from '@/components/bills/icon-picker';
import { AmountPad } from '@/components/ui/amount-pad';
import { Button } from '@/components/ui/button';
import { CalculatorPad } from '@/components/ui/calculator-pad';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
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
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { PAYMENT_SOURCES } from '@/lib/sources';
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

export default function AddBillScreen() {
  const [step, setStep] = useState<Step>('category');

  const [categoryId, setCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [iconId, setIconId] = useState('other');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceChoice>('monthly');
  const [sourceId, setSourceId] = useState('');
  const [note, setNote] = useState('');

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
  const handleSave = () => router.back();

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
          <SourceTiles sources={PAYMENT_SOURCES} value={sourceId} onChange={setSourceId} />
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

      <View className="mt-auto w-full pt-10">
        <Button label="Save bill" onPress={handleSave} />
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
