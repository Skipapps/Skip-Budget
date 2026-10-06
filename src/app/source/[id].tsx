import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, Plus, SlidersHorizontal } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useCreatePayment, useDeletePayment } from '@/api/mutations';
import { useSourceLedger } from '@/api/queries';
import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';
import {
  EMPTY_FILTERS,
  FilterSheet,
  countActiveFilters,
  type LedgerFilters,
} from '@/components/transactions/filter-sheet';
import { AmountPad } from '@/components/ui/amount-pad';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { useConfirm } from '@/providers/dialog-provider';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { SectionHeading } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { sortByDateAscending } from '@/lib/group';
import { formatCurrency } from '@/lib/format';
import { matchesSearch } from '@/lib/search';
import { useColors } from '@/providers/theme-provider';
import { FAILURE_MESSAGE, failureMessage } from '@/lib/failure';

const KIND_LABELS: Record<string, string> = {
  receipt: 'Receipt',
  bill: 'Bill',
  subscription: 'Subscription',
  payment: 'Payment',
};

export default function SourceDetailScreen() {
  const artwork = useArtwork();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Read here, not inside the hook, so the ledger is a pure function of its inputs.
  const today = toIsoDate(new Date());

  const { source, kind, card, account, ledger, isLoading, isError } = useSourceLedger(id, today);
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const confirm = useConfirm();

  const [padOpen, setPadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Above the loading guards so the hook order never changes.
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  if (isLoading && !source) {
    return (
      <Screen showBack>
        <View className="mt-24 w-full items-center">
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      </Screen>
    );
  }

  if (isError || !source || !ledger) {
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={FAILURE_MESSAGE}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const isCard = kind === 'card';
  const name = isCard ? card!.holder : account!.nickname || account!.bank_name;

  // Oldest day first. `ledgerForSource` sorts newest-first for its balance arithmetic, so the
  // display order is set here.
  const entries = sortByDateAscending(
    ledger.entries,
    (entry) => entry.date,
    (entry) => entry.id,
  );

  const visible = entries.filter(
    (entry) =>
      matchesSearch(entry.label, query) &&
      (!filters.date || entry.date === filters.date) &&
      (filters.kinds.length === 0 || filters.kinds.includes(entry.kind)),
  );
  const activeCount = countActiveFilters(filters);
  const narrowed = query.trim().length > 0 || activeCount > 0;

  const kindOptions = [
    { value: 'receipt', label: 'Receipts' },
    { value: 'bill', label: 'Monthly Bills' },
    { value: 'subscription', label: 'Subscriptions' },
    { value: 'payment', label: isCard ? 'Payments' : 'Money in' },
  ];

  const handlePay = async (amount: string) => {
    const value = Number(amount);
    setPadOpen(false);
    if (!Number.isFinite(value) || value <= 0) return;

    setError(null);
    try {
      await createPayment.mutateAsync({
        card_id: isCard ? source.id : null,
        bank_account_id: isCard ? null : source.id,
        amount: value,
        paid_on: today,
        note: null,
      });
    } catch (thrown) {
      setError(failureMessage(thrown));
    }
  };

  /** Only payments can be removed here; a charge is edited where it lives. */
  const handleRemovePayment = async (entryId: string, label: string) => {
    const ok = await confirm({
      title: `Remove ${label.toLowerCase()}?`,
      message: 'The balance goes back up by that amount.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) deletePayment.mutate(entryId.replace(/^payment-/, ''));
  };

  return (
    <Screen
      title={name}
      showBack
      avoidKeyboard
      headerActions={[
        {
          icon: Pencil,
          label: `Edit ${name}`,
          onPress: () =>
            router.push(isCard ? `/add-card?id=${source.id}` : `/add-account?id=${source.id}`),
        },
      ]}
      floating={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isCard ? 'Make a payment' : 'Add a deposit'}
          onPress={() => setPadOpen(true)}
          className="h-14 flex-row items-center gap-2 rounded-full bg-control px-5 active:opacity-80"
        >
          <Plus size={20} color={colors.onControl} strokeWidth={2} />
          <Text
            className="font-poppins-medium text-[15px] text-on-control"
            maxFontSizeMultiplier={1.3}
          >
            {isCard ? 'Make a payment' : 'Add money'}
          </Text>
        </Pressable>
      }
    >
      <View className="mt-2 w-full">
        {isCard ? (
          <PaymentCard
            card={{
              id: card!.id,
              holder: card!.holder,
              // The ledger balance, not the figure typed when the card was added.
              balance: ledger.balance,
              last4: card!.last4 ?? '',
              network: card!.network,
              color: card!.color,
            }}
          />
        ) : (
          <AccountCard
            account={{
              id: account!.id,
              bankName: account!.bank_name,
              nickname: account!.nickname ?? '',
              accountType: account!.account_type === 'savings' ? 'Savings' : 'Checking',
              balance: ledger.balance,
              last4: account!.last4 ?? '',
              color: account!.color,
            }}
          />
        )}
      </View>

      <View className="mt-6 w-full rounded-[16px] border border-line px-4 py-3">
        <SummaryLine
          label={
            source.balance_as_of
              ? `Balance on ${formatFullDate(new Date(`${source.balance_as_of}T00:00:00`))}`
              : 'Starting balance'
          }
          value={formatCurrency(source.balance)}
        />
        <SummaryLine
          label={isCard ? 'Charged since' : 'Spent since'}
          value={formatCurrency(-ledger.charged)}
        />
        <SummaryLine label={isCard ? 'Payments' : 'Money in'} value={formatCurrency(ledger.paid)} />
        <View className="my-2 h-px w-full bg-line" />
        <SummaryLine
          label={isCard ? 'Owed now' : 'Balance now'}
          value={formatCurrency(ledger.balance)}
          strong
        />
      </View>

      {error ? (
        <Text
          className="mt-4 w-full text-center font-poppins text-[13px] text-danger"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-8 w-full">
        <SectionHeading>Transactions</SectionHeading>
      </View>

      {entries.length > 0 ? (
        <View className="mt-3 w-full flex-row items-center gap-3">
          <SearchField value={query} onChangeText={setQuery} placeholder="Search transactions" />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              activeCount > 0 ? `Filters, ${activeCount} active` : 'Filter transactions'
            }
            onPress={() => setFilterOpen(true)}
            className="h-11 w-11 items-center justify-center rounded-full bg-ink/5 active:bg-ink/10"
          >
            <SlidersHorizontal size={20} color={colors.ink} strokeWidth={1.8} />
            {activeCount > 0 ? (
              <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1">
                <Text
                  allowFontScaling={false}
                  className="font-poppins-medium text-[11px] text-on-control"
                >
                  {activeCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      {entries.length === 0 ? (
        <PageState
          art={artwork.emptyWallet}
          title="Nothing on this one yet"
          message={
            isCard
              ? 'Receipts, bills and subscriptions paid with this card land here as their dates arrive.'
              : 'Anything paid from this account lands here as its date arrives.'
          }
        />
      ) : visible.length === 0 && narrowed ? (
        <PageState
          art={artwork.noResults}
          title="Nothing matches"
          message="No transaction on this one fits that search and those filters."
          actionLabel="Clear search"
          onAction={() => {
            setQuery('');
            setFilters(EMPTY_FILTERS);
          }}
        />
      ) : (
        <View className="mt-1 w-full pb-28">
          {visible.map((entry, index) => (
            <Fragment key={entry.id}>
              {index > 0 ? <View className="ml-[52px] h-px bg-line/60" /> : null}
              <TransactionRow
                label={entry.label}
                amount={entry.amount}
                kindLabel={`${KIND_LABELS[entry.kind]} · ${formatFullDate(new Date(`${entry.date}T00:00:00`))}`}
                domain={entry.domain}
                logoHidden={entry.logoHidden}
                kind={entry.kind}
                categoryId={entry.categoryId}
                iconId={entry.iconId}
                onPress={
                  entry.kind === 'payment'
                    ? () => handleRemovePayment(entry.id, entry.label)
                    : undefined
                }
              />
            </Fragment>
          ))}
        </View>
      )}

      {padOpen ? (
        <AmountPad
          title={isCard ? 'Payment' : 'Money in'}
          caption={name}
          value=""
          onCancel={() => setPadOpen(false)}
          onConfirm={handlePay}
        />
      ) : null}

      {filterOpen ? (
        <FilterSheet
          filters={filters}
          // This page is one source already, so no source section.
          sourceOptions={[]}
          kindOptions={kindOptions}
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

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="w-full flex-row items-center justify-between py-1.5">
      <Text
        className={
          strong
            ? 'font-poppins-medium text-[14px] text-ink'
            : 'font-poppins text-[14px] text-muted'
        }
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      <Text
        className={
          strong
            ? 'font-poppins-semibold text-[16px] text-ink'
            : 'font-poppins text-[14px] text-body'
        }
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </View>
  );
}
