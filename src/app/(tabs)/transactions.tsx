import { SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  EMPTY_FILTERS,
  FilterSheet,
  countActiveFilters,
  type LedgerFilters,
} from '@/components/transactions/filter-sheet';
import { LedgerRow } from '@/components/transactions/ledger-row';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { Title } from '@/components/ui/typography';
import { accounts } from '@/data/accounts-mock';
import { cards } from '@/data/cards-mock';
import { TRANSACTION_KINDS, ledger, type LedgerEntry } from '@/data/transactions-mock';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';

/** One lookup for both payment sources, so a row can name where it came from. */
const SOURCE_LABELS: Record<string, string> = {
  ...Object.fromEntries(cards.map((card) => [card.id, `${card.network} ••${card.last4}`])),
  ...Object.fromEntries(
    accounts.map((account) => [account.id, `${account.bankName} ••${account.last4}`]),
  ),
};

const SOURCE_OPTIONS = [
  ...cards.map((card) => ({ value: card.id, label: `${card.network} ••${card.last4}` })),
  ...accounts.map((account) => ({
    value: account.id,
    label: `${account.bankName} ••${account.last4}`,
  })),
];

const KIND_LABELS = Object.fromEntries(
  TRANSACTION_KINDS.map((kind) => [kind.value, kind.label]),
) as Record<string, string>;

export default function TransactionsScreen() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const activeCount = countActiveFilters(filters);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matching = ledger.filter((entry) => {
      if (needle && !entry.label.toLowerCase().includes(needle)) return false;
      if (filters.date && entry.date !== filters.date) return false;
      if (filters.sourceIds.length > 0 && !filters.sourceIds.includes(entry.sourceId)) return false;
      if (filters.kinds.length > 0 && !filters.kinds.includes(entry.kind)) return false;
      return true;
    });

    // Group by day, newest first, preserving that order in the output.
    const byDate = new Map<string, LedgerEntry[]>();
    for (const entry of matching) {
      const bucket = byDate.get(entry.date);
      if (bucket) bucket.push(entry);
      else byDate.set(entry.date, [entry]);
    }

    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({
        date,
        entries,
        total: entries.reduce((sum, entry) => sum + entry.amount, 0),
      }));
  }, [query, filters]);

  return (
    <Screen avoidKeyboard>
      <Title className="mt-2">Transactions</Title>

      <View className="mt-5 w-full flex-row items-center gap-3">
        <SearchField value={query} onChangeText={setQuery} placeholder="Search transactions" />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activeCount > 0 ? `Filters, ${activeCount} active` : 'Filter transactions'
          }
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

      {groups.length === 0 ? (
        <View className="mt-16 w-full items-center">
          <Text className="font-poppins text-[15px] text-muted" maxFontSizeMultiplier={1.4}>
            No transactions match.
          </Text>
        </View>
      ) : (
        <View className="mt-2 w-full pb-24">
          {groups.map((group) => (
            <View key={group.date} className="w-full">
              <View className="mt-5 w-full flex-row items-center justify-between">
                <Text
                  className="font-poppins-medium text-[13px] text-muted"
                  maxFontSizeMultiplier={1.3}
                >
                  {formatFullDate(new Date(`${group.date}T00:00:00`))}
                </Text>
                <Text
                  className="font-poppins-medium text-[13px] text-muted"
                  maxFontSizeMultiplier={1.3}
                >
                  {formatCurrency(group.total)}
                </Text>
              </View>

              <View className="mt-1 h-px w-full bg-line" />

              {group.entries.map((entry) => (
                <LedgerRow
                  key={entry.id}
                  entry={entry}
                  sourceLabel={SOURCE_LABELS[entry.sourceId] ?? 'Unknown'}
                  kindLabel={KIND_LABELS[entry.kind] ?? entry.kind}
                />
              ))}
            </View>
          ))}
        </View>
      )}

      {filterOpen ? (
        <FilterSheet
          filters={filters}
          sourceOptions={SOURCE_OPTIONS}
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
