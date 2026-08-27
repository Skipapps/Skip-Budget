import { Calendar, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { SelectField } from '@/components/ui/select-field';
import { FieldLabel } from '@/components/ui/typography';
import { formatFullDate } from '@/lib/date';
import { colors } from '@/theme/colors';

export type ReceiptFilters = {
  /** ISO yyyy-mm-dd, or null for any date. */
  date: string | null;
  sourceIds: string[];
};

export const EMPTY_RECEIPT_FILTERS: ReceiptFilters = { date: null, sourceIds: [] };

export function countActiveReceiptFilters(filters: ReceiptFilters): number {
  return (filters.date ? 1 : 0) + (filters.sourceIds.length > 0 ? 1 : 0);
}

type ReceiptFilterSheetProps = {
  filters: ReceiptFilters;
  sourceOptions: readonly { value: string; label: string }[];
  onCancel: () => void;
  onApply: (filters: ReceiptFilters) => void;
};

/** Draft filters live here and only reach the list on Apply. */
export function ReceiptFilterSheet({
  filters,
  sourceOptions,
  onCancel,
  onApply,
}: ReceiptFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ReceiptFilters>(filters);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            hitSlop={8}
            onPress={onCancel}
            className="h-11 w-11 items-center justify-center rounded-[10px] active:bg-black/5"
          >
            <X size={22} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 pr-11 text-center font-poppins-semibold text-[18px] text-ink"
            maxFontSizeMultiplier={1.2}
          >
            Filter receipts
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
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
            <FieldLabel className="mb-2">Paid with</FieldLabel>
            <MultiChoiceChips
              options={sourceOptions}
              values={draft.sourceIds}
              onChange={(sourceIds) => setDraft((current) => ({ ...current, sourceIds }))}
              emptyHint="Showing every card and account."
            />
          </View>
        </ScrollView>

        <View className="w-full flex-row gap-3 px-5 pt-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft(EMPTY_RECEIPT_FILTERS)}
            className="min-h-16 flex-1 items-center justify-center rounded-[10px] border border-control active:bg-black/5"
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
