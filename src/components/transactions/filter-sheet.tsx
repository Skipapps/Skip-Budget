import { Calendar, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { SelectField } from '@/components/ui/select-field';
import { FieldLabel } from '@/components/ui/typography';
import { TRANSACTION_KINDS, type TransactionKind } from '@/data/transactions-mock';
import { formatFullDate } from '@/lib/date';
import { useColors } from '@/providers/theme-provider';

export type LedgerFilters = {
  /** ISO yyyy-mm-dd, or null for any date. */
  date: string | null;
  sourceIds: string[];
  kinds: TransactionKind[];
};

export const EMPTY_FILTERS: LedgerFilters = { date: null, sourceIds: [], kinds: [] };

export function countActiveFilters(filters: LedgerFilters): number {
  return (
    (filters.date ? 1 : 0) +
    (filters.sourceIds.length > 0 ? 1 : 0) +
    (filters.kinds.length > 0 ? 1 : 0)
  );
}

type FilterSheetProps = {
  filters: LedgerFilters;
  sourceOptions: readonly { value: string; label: string }[];
  onCancel: () => void;
  onApply: (filters: LedgerFilters) => void;
};

const KIND_OPTIONS = TRANSACTION_KINDS.map((kind) => ({ value: kind.value, label: kind.label }));

/** Draft filters live here and only reach the list on Apply. */
export function FilterSheet({ filters, sourceOptions, onCancel, onApply }: FilterSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<LedgerFilters>(filters);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-card"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            hitSlop={8}
            onPress={onCancel}
            className="h-11 w-11 items-center justify-center rounded-[10px] active:bg-ink/5"
          >
            <X size={22} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 pr-11 text-center font-poppins-semibold text-[18px] text-ink"
            maxFontSizeMultiplier={1.2}
          >
            Filter
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mt-4 w-full">
            <SelectField
              label="Date"
              value={draft.date ? formatFullDate(new Date(`${draft.date}T00:00:00`)) : ''}
              placeholder="Any date"
              icon={Calendar}
              onPress={() => setDatePickerOpen(true)}
            />
            {draft.date ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setDraft((current) => ({ ...current, date: null }))}
                className="mt-2 self-start rounded-[8px] px-1 py-1 active:opacity-60"
              >
                <Text className="font-poppins text-[13px] text-muted">Clear date</Text>
              </Pressable>
            ) : null}
          </View>

          <View className="mt-6 w-full">
            <FieldLabel className="mb-2">Card or bank account</FieldLabel>
            <MultiChoiceChips
              options={sourceOptions}
              values={draft.sourceIds}
              onChange={(sourceIds) => setDraft((current) => ({ ...current, sourceIds }))}
              emptyHint="Showing every card and account."
            />
          </View>

          <View className="mt-6 w-full">
            <FieldLabel className="mb-2">Type of transaction</FieldLabel>
            <MultiChoiceChips
              options={KIND_OPTIONS}
              values={draft.kinds}
              onChange={(kinds) => setDraft((current) => ({ ...current, kinds }))}
              emptyHint="Showing every type."
            />
          </View>
        </ScrollView>

        <View className="w-full flex-row gap-3 px-5 pt-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft(EMPTY_FILTERS)}
            className="min-h-16 flex-1 items-center justify-center rounded-[10px] border border-control active:bg-ink/5"
          >
            <Text className="font-poppins-medium text-[17px] text-ink">Reset</Text>
          </Pressable>
          <View className="flex-[2]">
            <Button label="Apply" onPress={() => onApply(draft)} />
          </View>
        </View>

        {datePickerOpen ? (
          <DatePicker
            value={draft.date ? new Date(`${draft.date}T00:00:00`) : new Date()}
            onCancel={() => setDatePickerOpen(false)}
            onConfirm={(date) => {
              const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              setDraft((current) => ({ ...current, date: iso }));
              setDatePickerOpen(false);
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
