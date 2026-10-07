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
import { FitRows, FitText, useGroupFits } from '@/components/ui/fit-group';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { useConfirm } from '@/providers/dialog-provider';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { SectionHeading } from '@/components/ui/typography';
import { t, type MessageKey } from '@/i18n';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { sortByDateAscending } from '@/lib/group';
import { formatCurrency } from '@/lib/format';
import { matchesSearch } from '@/lib/search';
import { useColors } from '@/providers/theme-provider';
import { failureMessage, failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

const KIND_KEYS: Record<string, MessageKey> = {
  receipt: 'accounts.source.kind.receipt',
  bill: 'accounts.source.kind.bill',
  subscription: 'accounts.source.kind.subscription',
  payment: 'accounts.source.kind.payment',
};

function kindLabel(kind: string): string {
  return KIND_KEYS[kind] ? t(KIND_KEYS[kind]) : kind;
}

/** The ledger names a payment with no note "Payment" in English; that name is drawn translated. */
const UNNAMED_PAYMENT = 'Payment';

function entryLabel(entry: { kind: string; label: string }): string {
  return entry.kind === 'payment' && entry.label === UNNAMED_PAYMENT
    ? t('accounts.source.kind.payment')
    : entry.label;
}

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
          title={failureText()}
          actionLabel={t('cards.form.goBack')}
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
      matchesSearch(entryLabel(entry), query) &&
      (!filters.date || entry.date === filters.date) &&
      (filters.kinds.length === 0 || filters.kinds.includes(entry.kind)),
  );
  const activeCount = countActiveFilters(filters);
  const narrowed = query.trim().length > 0 || activeCount > 0;

  const kindOptions = [
    { value: 'receipt', label: t('transactions.kind.receipt') },
    { value: 'bill', label: t('transactions.kind.bill') },
    { value: 'subscription', label: t('transactions.kind.subscription') },
    {
      value: 'payment',
      label: isCard ? t('accounts.source.payments') : t('accounts.source.moneyIn'),
    },
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
      title:
        label === UNNAMED_PAYMENT
          ? t('accounts.source.removePaymentTitle')
          : t('accounts.source.removeNamedTitle', { label: label.toLowerCase() }),
      message: t('accounts.source.removeMessage'),
      confirmLabel: t('common.remove'),
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
          label: t('accounts.source.editLabel', { name }),
          onPress: () =>
            router.push(isCard ? `/add-card?id=${source.id}` : `/add-account?id=${source.id}`),
        },
      ]}
      floating={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isCard ? t('accounts.source.makePayment') : t('accounts.source.addDeposit')
          }
          onPress={() => setPadOpen(true)}
          className="min-h-14 flex-row items-center gap-2 rounded-full bg-control px-5 py-3 active:opacity-80"
        >
          <Plus size={20} color={colors.onControl} strokeWidth={2} />
          <Text
            className="shrink font-app-medium text-[15px] text-on-control"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {isCard ? t('accounts.source.makePayment') : t('accounts.source.addMoney')}
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

      <FitRows
        className="mt-6 w-full rounded-[16px] border border-line px-4 py-3"
        testID="source-sums"
      >
        <SummaryLine
          id="start"
          label={
            source.balance_as_of
              ? t('accounts.source.balanceOn', {
                  date: formatFullDate(new Date(`${source.balance_as_of}T00:00:00`)),
                })
              : t('accounts.source.startingBalance')
          }
          value={formatCurrency(source.balance)}
        />
        <SummaryLine
          id="charged"
          label={isCard ? t('accounts.source.chargedSince') : t('accounts.source.spentSince')}
          value={formatCurrency(-ledger.charged)}
        />
        <SummaryLine
          id="paid"
          label={isCard ? t('accounts.source.payments') : t('accounts.source.moneyIn')}
          value={formatCurrency(ledger.paid)}
        />
        <View className="my-2 h-px w-full bg-line" />
        <SummaryLine
          id="now"
          label={isCard ? t('accounts.source.owedNow') : t('accounts.source.balanceNow')}
          value={formatCurrency(ledger.balance)}
          strong
        />
      </FitRows>

      {error ? (
        <Text
          className="mt-4 w-full text-center font-app text-[13px] text-danger"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {error}
        </Text>
      ) : null}

      <View className="mt-8 w-full">
        <SectionHeading>{t('transactions.title')}</SectionHeading>
      </View>

      {entries.length > 0 ? (
        <View className="mt-3 w-full flex-row items-center gap-3">
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('transactions.search')}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              activeCount > 0
                ? t('transactions.filtersActive', { count: activeCount })
                : t('transactions.filterButton')
            }
            onPress={() => setFilterOpen(true)}
            className="h-11 w-11 items-center justify-center rounded-full bg-ink/5 active:bg-ink/10"
          >
            <SlidersHorizontal size={20} color={colors.ink} strokeWidth={1.8} />
            {activeCount > 0 ? (
              <View className="absolute -right-1.5 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1">
                <Text
                  allowFontScaling={false}
                  className="font-app-medium text-[11px] text-on-control"
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
          title={t('accounts.source.emptyTitle')}
          message={isCard ? t('accounts.source.emptyCard') : t('accounts.source.emptyAccount')}
        />
      ) : visible.length === 0 && narrowed ? (
        <PageState
          art={artwork.noResults}
          title={t('transactions.noMatchTitle')}
          message={t('accounts.source.noMatch')}
          actionLabel={t('accounts.source.clearSearch')}
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
                label={entryLabel(entry)}
                amount={entry.amount}
                kindLabel={`${kindLabel(entry.kind)} · ${formatFullDate(new Date(`${entry.date}T00:00:00`))}`}
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
          title={isCard ? t('accounts.source.kind.payment') : t('accounts.source.moneyIn')}
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

/**
 * A label and its figure. Every line in the card keeps its figure beside its label, or every line
 * puts it underneath.
 */
function SummaryLine({
  id,
  label,
  value,
  strong,
}: {
  /** Names the fit slots; unique in its card. */
  id: string;
  label: string;
  value: string;
  strong?: boolean;
}) {
  const stacked = !useGroupFits();
  return (
    <View
      className={
        stacked
          ? 'w-full items-start py-1.5'
          : 'w-full flex-row items-center justify-between gap-3 py-1.5'
      }
    >
      <FitText
        id={`${id}-label`}
        role="row"
        size={14}
        className={strong ? 'font-app-medium text-ink' : 'font-app text-muted'}
        slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
      >
        {label}
      </FitText>
      <FitText
        id={`${id}-value`}
        hug
        role="row"
        size={strong ? 16 : 14}
        className={strong ? 'font-app-semibold text-ink' : 'font-app text-body'}
        slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
      >
        {value}
      </FitText>
    </View>
  );
}
