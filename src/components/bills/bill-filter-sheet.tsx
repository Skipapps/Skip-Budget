import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { FieldLabel } from '@/components/ui/typography';
import { BILL_CATEGORIES, RECURRENCES } from '@/data/bills-mock';
import { colors } from '@/theme/colors';

export type BillFilters = {
  categoryIds: string[];
  sourceIds: string[];
  recurrences: string[];
};

export const EMPTY_BILL_FILTERS: BillFilters = {
  categoryIds: [],
  sourceIds: [],
  recurrences: [],
};

export function countActiveBillFilters(filters: BillFilters): number {
  return (
    (filters.categoryIds.length > 0 ? 1 : 0) +
    (filters.sourceIds.length > 0 ? 1 : 0) +
    (filters.recurrences.length > 0 ? 1 : 0)
  );
}

const CATEGORY_OPTIONS = BILL_CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
}));

const RECURRENCE_OPTIONS = RECURRENCES.map((option) => ({
  value: option.value as string,
  label: option.label,
}));

type BillFilterSheetProps = {
  filters: BillFilters;
  sourceOptions: readonly { value: string; label: string }[];
  onCancel: () => void;
  onApply: (filters: BillFilters) => void;
};

/** Draft filters live here and only reach the list on Apply. */
export function BillFilterSheet({
  filters,
  sourceOptions,
  onCancel,
  onApply,
}: BillFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<BillFilters>(filters);

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
            Filter bills
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <View className="mt-4 w-full">
            <FieldLabel className="mb-2">Category</FieldLabel>
            <MultiChoiceChips
              options={CATEGORY_OPTIONS}
              values={draft.categoryIds}
              onChange={(categoryIds) => setDraft((current) => ({ ...current, categoryIds }))}
              emptyHint="Showing every category."
            />
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

          <View className="mt-6 w-full">
            <FieldLabel className="mb-2">How often</FieldLabel>
            <MultiChoiceChips
              options={RECURRENCE_OPTIONS}
              values={draft.recurrences}
              onChange={(recurrences) => setDraft((current) => ({ ...current, recurrences }))}
              emptyHint="Showing every schedule."
            />
          </View>
        </ScrollView>

        <View className="w-full flex-row gap-3 px-5 pt-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft(EMPTY_BILL_FILTERS)}
            className="min-h-16 flex-1 items-center justify-center rounded-[10px] border border-control active:bg-black/5"
          >
            <Text className="font-poppins-medium text-[17px] text-ink">Reset</Text>
          </Pressable>
          <View className="flex-[2]">
            <Button label="Apply" onPress={() => onApply(draft)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
