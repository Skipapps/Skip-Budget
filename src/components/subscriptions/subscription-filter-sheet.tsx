import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterActions } from '@/components/ui/filter-actions';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { FieldLabel } from '@/components/ui/typography';
import { cycleLabel } from '@/components/subscriptions/subscription-row';
import { BILLING_CYCLES } from '@/data/billing-cycles';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type SubscriptionFilters = {
  cycles: string[];
  sourceIds: string[];
};

export const EMPTY_SUBSCRIPTION_FILTERS: SubscriptionFilters = { cycles: [], sourceIds: [] };

export function countActiveSubscriptionFilters(filters: SubscriptionFilters): number {
  return (filters.cycles.length > 0 ? 1 : 0) + (filters.sourceIds.length > 0 ? 1 : 0);
}

type SubscriptionFilterSheetProps = {
  filters: SubscriptionFilters;
  sourceOptions: readonly { value: string; label: string }[];
  onCancel: () => void;
  onApply: (filters: SubscriptionFilters) => void;
};

/** Draft filters live here and only reach the list on Apply. */
export function SubscriptionFilterSheet({
  filters,
  sourceOptions,
  onCancel,
  onApply,
}: SubscriptionFilterSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<SubscriptionFilters>(filters);

  const cycleOptions = BILLING_CYCLES.map((cycle) => ({
    value: cycle.value as string,
    label: cycleLabel(cycle.value),
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
            accessibilityLabel={t('subscriptions.filter.close')}
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
            {t('subscriptions.filter.title')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <View className="mt-4 w-full">
            <FieldLabel className="mb-2">{t('subscriptions.field.billingCycle')}</FieldLabel>
            <MultiChoiceChips
              options={cycleOptions}
              values={draft.cycles}
              onChange={(cycles) => setDraft((current) => ({ ...current, cycles }))}
              emptyHint={t('subscriptions.filter.everyCycle')}
            />
          </View>

          <View className="mt-6 w-full">
            <FieldLabel className="mb-2">{t('subscriptions.field.chargedTo')}</FieldLabel>
            <MultiChoiceChips
              options={sourceOptions}
              values={draft.sourceIds}
              onChange={(sourceIds) => setDraft((current) => ({ ...current, sourceIds }))}
              emptyHint={t('subscriptions.filter.everySource')}
            />
          </View>
        </ScrollView>

        <View className="w-full px-5 pt-2">
          <FilterActions
            resetLabel={t('subscriptions.filter.reset')}
            applyLabel={t('subscriptions.filter.apply')}
            onReset={() => setDraft(EMPTY_SUBSCRIPTION_FILTERS)}
            onApply={() => onApply(draft)}
          />
        </View>
      </View>
    </Modal>
  );
}
