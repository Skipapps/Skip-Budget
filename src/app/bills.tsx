import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  BillFilterSheet,
  EMPTY_BILL_FILTERS,
  countActiveBillFilters,
  type BillFilters,
} from '@/components/bills/bill-filter-sheet';
import { BillRow } from '@/components/bills/bill-row';
import { ActionPill } from '@/components/ui/action-pill';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Title } from '@/components/ui/typography';
import { useBills } from '@/api/queries';
import { getBillCategory } from '@/data/bills-mock';
import { formatCurrency } from '@/lib/format';
import { PAYMENT_SOURCE_OPTIONS, getSourceLabel } from '@/lib/sources';
import { colors } from '@/theme/colors';

export default function BillsScreen() {
  const [queryText, setQuery] = useState('');
  const [filters, setFilters] = useState<BillFilters>(EMPTY_BILL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeCount = countActiveBillFilters(filters);
  const query = useBills();

  // The DB stores positive magnitudes; the UI shows outgoings as negative.
  const bills = useMemo(
    () =>
      (query.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        amount: -row.amount,
        dueDate: row.next_due_on ?? '',
        recurrence: row.recurrence,
        categoryId: row.category_id,
        iconId: row.icon_id ?? undefined,
        sourceId: row.card_id ?? row.bank_account_id ?? '',
      })),
    [query.data],
  );

  const visible = useMemo(() => {
    const needle = queryText.trim().toLowerCase();

    return bills.filter((bill) => {
      if (needle) {
        const category = getBillCategory(bill.categoryId)?.label ?? '';
        const haystack = `${bill.name} ${category}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(bill.categoryId)) {
        return false;
      }
      if (filters.sourceIds.length > 0 && !filters.sourceIds.includes(bill.sourceId)) return false;
      if (filters.recurrences.length > 0 && !filters.recurrences.includes(bill.recurrence)) {
        return false;
      }
      return true;
    });
  }, [bills, queryText, filters]);

  // Reflects what is on screen, so it always agrees with the rows below it.
  const total = visible.reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <Screen showBack avoidKeyboard>
      <View className="mt-2 w-full flex-row items-center justify-between gap-3">
        <Title align="left" className="flex-1">
          Monthly bills
        </Title>

        <ActionPill label="Add bill" onPress={() => router.push('/add-bill')} />
      </View>

      <View className="mt-5 w-full flex-row items-center gap-3">
        <SearchField value={queryText} onChangeText={setQuery} placeholder="Search bills" />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filter bills'}
          onPress={() => setFilterOpen(true)}
          className="min-h-12 w-12 items-center justify-center rounded-[10px] border border-line active:bg-black/5"
        >
          <SlidersHorizontal size={20} color={colors.ink} strokeWidth={2} />
          {activeCount > 0 ? (
            <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1">
              <Text allowFontScaling={false} className="font-poppins-medium text-[11px] text-ink">
                {activeCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View className="mt-5 w-full flex-row items-center justify-between">
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          {query.isPending
            ? 'Loading…'
            : visible.length === bills.length
              ? `${bills.length} bills`
              : `${visible.length} of ${bills.length} bills`}
        </Text>
        <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {formatCurrency(total)}
        </Text>
      </View>

      <View className="mt-1 h-px w-full bg-line" />

      {visible.length === 0 ? (
        <View className="mt-16 w-full items-center">
          <Text className="font-poppins text-[15px] text-muted" maxFontSizeMultiplier={1.4}>
            {bills.length === 0 ? 'No bills yet.' : 'No bills match.'}
          </Text>
        </View>
      ) : (
        <View className="w-full pb-10">
          {visible.map((bill) => (
            <BillRow key={bill.id} bill={bill} sourceLabel={getSourceLabel(bill.sourceId)} />
          ))}
        </View>
      )}

      {filterOpen ? (
        <BillFilterSheet
          filters={filters}
          sourceOptions={PAYMENT_SOURCE_OPTIONS}
          onCancel={() => setFilterOpen(false)}
          onApply={(next) => {
            setFilters(next);
            setFilterOpen(false);
          }}
        />
      ) : null}
    </Screen>
  );
}
