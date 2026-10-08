import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterActions } from '@/components/ui/filter-actions';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { FieldLabel } from '@/components/ui/typography';
import { billCategoryLabel, recurrenceLabel } from '@/components/bills/bill-row';
import { BILL_CATEGORIES, RECURRENCES } from '@/data/bill-categories';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<BillFilters>(filters);

  const categoryOptions = BILL_CATEGORIES.map((category) => ({
    value: category.id,
    label: billCategoryLabel(category.id, category.label),
  }));
  const recurrenceOptions = RECURRENCES.map((option) => ({
    value: option.value as string,
    label: recurrenceLabel(option.value),
  }));

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View
        className="flex-1 bg-card"
        style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bills.filter.close')}
            hitSlop={8}
            onPress={onCancel}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
          >
            <X size={22} color={colors.ink} strokeWidth={2} />
          </Pressable>
          <Text
            className="flex-1 pr-11 text-center font-app-semibold text-[18px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {t('bills.filter.title')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <View className="mt-4 w-full">
            <FieldLabel className="mb-2">{t('bills.field.category')}</FieldLabel>
            <MultiChoiceChips
              options={categoryOptions}
              values={draft.categoryIds}
              onChange={(categoryIds) => setDraft((current) => ({ ...current, categoryIds }))}
              emptyHint={t('bills.filter.everyCategory')}
            />
          </View>

          <View className="mt-6 w-full">
            <FieldLabel className="mb-2">{t('bills.field.paidWith')}</FieldLabel>
            <MultiChoiceChips
              options={sourceOptions}
              values={draft.sourceIds}
              onChange={(sourceIds) => setDraft((current) => ({ ...current, sourceIds }))}
              emptyHint={t('bills.filter.everySource')}
            />
          </View>

          <View className="mt-6 w-full">
            <FieldLabel className="mb-2">{t('bills.filter.howOften')}</FieldLabel>
            <MultiChoiceChips
              options={recurrenceOptions}
              values={draft.recurrences}
              onChange={(recurrences) => setDraft((current) => ({ ...current, recurrences }))}
              emptyHint={t('bills.filter.everySchedule')}
            />
          </View>
        </ScrollView>

        <View className="w-full px-5 pt-2">
          <FilterActions
            resetLabel={t('bills.filter.reset')}
            applyLabel={t('bills.filter.apply')}
            onReset={() => setDraft(EMPTY_BILL_FILTERS)}
            onApply={() => onApply(draft)}
          />
        </View>
      </View>
    </Modal>
  );
}
