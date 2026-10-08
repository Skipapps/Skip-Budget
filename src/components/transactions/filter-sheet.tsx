import { Calendar, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePicker } from '@/components/ui/date-picker';
import { FilterActions } from '@/components/ui/filter-actions';
import { MultiChoiceChips } from '@/components/ui/multi-choice-chips';
import { SelectField } from '@/components/ui/select-field';
import { FieldLabel } from '@/components/ui/typography';
import { TRANSACTION_KINDS, type TransactionKind } from '@/data/transaction-kinds';
import { t, type MessageKey } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type LedgerFilters = {
  /** ISO yyyy-mm-dd, or null for any date. */
  date: string | null;
  sourceIds: string[];
  /** Kind values as the hosting screen names them (a card's page also filters payments). */
  kinds: string[];
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
  /** The kinds this screen's rows can be. Defaults to the shared ledger set. */
  kindOptions?: readonly { value: string; label: string }[];
  onCancel: () => void;
  onApply: (filters: LedgerFilters) => void;
};

const KIND_KEYS: Record<TransactionKind, MessageKey> = {
  income: 'transactions.kind.income',
  bill: 'transactions.kind.bill',
  receipt: 'transactions.kind.receipt',
  subscription: 'transactions.kind.subscription',
};

/** What a ledger kind is called on screen; the value itself is what rows and filters compare. */
export function ledgerKindLabel(kind: string): string {
  const key = KIND_KEYS[kind as TransactionKind];
  return key ? t(key) : kind;
}

/** Draft filters live here and only reach the list on Apply. */
export function FilterSheet({
  filters,
  sourceOptions,
  kindOptions,
  onCancel,
  onApply,
}: FilterSheetProps) {
  const kinds =
    kindOptions ??
    TRANSACTION_KINDS.map((kind) => ({ value: kind.value, label: ledgerKindLabel(kind.value) }));
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
            accessibilityLabel={t('transactions.filter.close')}
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
            {t('transactions.filter.title')}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mt-4 w-full">
            <SelectField
              label={t('transactions.filter.date')}
              value={draft.date ? formatFullDate(new Date(`${draft.date}T00:00:00`)) : ''}
              placeholder={t('transactions.filter.anyDate')}
              icon={Calendar}
              onPress={() => setDatePickerOpen(true)}
            />
            {draft.date ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setDraft((current) => ({ ...current, date: null }))}
                // 24pt tall by design; the target is the 44pt floor.
                hitSlop={10}
                className="mt-2 self-start rounded-full px-1 py-1 active:opacity-60"
              >
                <Text
                  className="font-app text-[13px] text-muted"
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {t('transactions.filter.clearDate')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Absent on a screen that is already one source (the card's own page passes no options):
              a choice of one thing would only restate the title. */}
          {sourceOptions.length > 0 ? (
            <View className="mt-6 w-full">
              <FieldLabel className="mb-2">{t('transactions.filter.source')}</FieldLabel>
              <MultiChoiceChips
                options={sourceOptions}
                values={draft.sourceIds}
                onChange={(sourceIds) => setDraft((current) => ({ ...current, sourceIds }))}
                emptyHint={t('transactions.filter.everySource')}
              />
            </View>
          ) : null}

          <View className="mt-6 w-full">
            <FieldLabel className="mb-2">{t('transactions.filter.kind')}</FieldLabel>
            <MultiChoiceChips
              options={kinds}
              values={draft.kinds}
              onChange={(next) => setDraft((current) => ({ ...current, kinds: next }))}
              emptyHint={t('transactions.filter.everyKind')}
            />
          </View>
        </ScrollView>

        <View className="w-full px-5 pt-2">
          <FilterActions
            resetLabel={t('transactions.filter.reset')}
            applyLabel={t('transactions.filter.apply')}
            onReset={() => setDraft(EMPTY_FILTERS)}
            onApply={() => onApply(draft)}
          />
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
