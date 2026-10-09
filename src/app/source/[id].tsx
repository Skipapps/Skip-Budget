import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, Plus, SlidersHorizontal } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useCharges } from '@/api/charges';
import { useDeletePayment } from '@/api/mutations';
import { useHistoryFloor } from '@/api/history';
import { useReceipts, useSourceLedger } from '@/api/queries';
import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';
import {
  EMPTY_FILTERS,
  FilterSheet,
  countActiveFilters,
  type LedgerFilters,
} from '@/components/transactions/filter-sheet';
import { FitRows, FitText, useGroupFits } from '@/components/ui/fit-group';
import { HistoryNotice } from '@/components/pro/history-notice';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SearchField } from '@/components/ui/search-field';
import { useConfirm } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { SectionHeading } from '@/components/ui/typography';
import { t, type MessageKey } from '@/i18n';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { chargeOwners, ledgerHref } from '@/lib/ledger-link';
import { newestFirst } from '@/lib/ledger-order';
import { lastUpdated } from '@/lib/source-updated';
import { matchesSearch } from '@/lib/search';
import { useColors } from '@/providers/theme-provider';
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

const KIND_KEYS: Record<string, MessageKey> = {
  receipt: 'accounts.source.kind.receipt',
  bill: 'accounts.source.kind.bill',
  subscription: 'accounts.source.kind.subscription',
  payment: 'accounts.source.kind.payment',
  income: 'accounts.source.kind.income',
};

function kindLabel(kind: string): string {
  return KIND_KEYS[kind] ? t(KIND_KEYS[kind]) : kind;
}

/** The ledger names a payment with no note "Payment" in English; that name is drawn translated. */
const UNNAMED_PAYMENT = 'Payment';

/** A payment's own note if it has one; else, for a move, the other side it came from or went to. */
function entryLabel(entry: {
  kind: string;
  label: string;
  amount: number;
  counterpart?: string | null;
}): string {
  if (entry.kind !== 'payment' || entry.label !== UNNAMED_PAYMENT) return entry.label;
  if (entry.counterpart) {
    return entry.amount < 0
      ? t('accounts.source.toSource', { name: entry.counterpart })
      : t('accounts.source.fromSource', { name: entry.counterpart });
  }
  return t('accounts.source.kind.payment');
}

/** What VoiceOver adds to a row that opens a page; payments open none. */
const OPEN_HINTS: Record<string, MessageKey> = {
  receipt: 'receipts.row.hint',
  bill: 'accounts.source.billHint',
  subscription: 'subscriptions.row.hint',
  income: 'accounts.source.payHint',
};

/** Money sent out of an account is a payment row too, but it is not money in, so it filters apart. */
function filterKind(entry: { kind: string; amount: number }): string {
  return entry.kind === 'payment' && entry.amount < 0 ? 'sent' : entry.kind;
}

export default function SourceDetailScreen() {
  const artwork = useArtwork();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Read here, not inside the hook, so the ledger is a pure function of its inputs.
  const today = toIsoDate(new Date());

  const { source, kind, card, account, ledger, isLoading, isError } = useSourceLedger(id, today);
  const deletePayment = useDeletePayment();
  const confirm = useConfirm();
  const toast = useToast();

  // Above the loading guards so the hook order never changes.
  const { floor, free } = useHistoryFloor();
  // A charge's row names the charge, not its bill or subscription; this finds the plan to open.
  const charges = useCharges();
  const owners = useMemo(() => chargeOwners(charges.data ?? []), [charges.data]);
  // Within a day, receipts go latest-created first, as on the receipts list.
  const receipts = useReceipts();
  const createdAt = useMemo(
    () =>
      new Map(
        (receipts.data ?? []).flatMap((row) =>
          row.created_at ? [[`receipt-${row.id}`, row.created_at] as const] : [],
        ),
      ),
    [receipts.data],
  );
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

  // Only the list stops at the plan's window (90 days on free); the balance above walked every
  // entry.
  const entries = newestFirst(
    ledger.entries.filter((entry) => entry.date >= floor),
    createdAt,
  );
  const hiddenOlder = free && ledger.entries.some((entry) => entry.date < floor);

  const visible = entries.filter(
    (entry) =>
      matchesSearch(entryLabel(entry), query) &&
      (!filters.date || entry.date === filters.date) &&
      (filters.kinds.length === 0 || filters.kinds.includes(filterKind(entry))),
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
    ...(isCard
      ? []
      : [
          { value: 'sent', label: t('accounts.source.moneySent') },
          { value: 'income', label: t('accounts.source.kind.income') },
        ]),
  ];

  /** Only payments can be removed here; a charge is edited where it lives. */
  const handleRemovePayment = async (entryId: string, label: string, amount: number) => {
    // Money that came into an account leaves it again; anything else removed (a card payment, money
    // sent out of an account) puts the balance back up.
    const lowers = !isCard && amount > 0;
    const ok = await confirm({
      title:
        label === UNNAMED_PAYMENT
          ? t('accounts.source.removePaymentTitle')
          : t('accounts.source.removeNamedTitle', { label: label.toLowerCase() }),
      message: lowers ? t('accounts.source.removeMessageDown') : t('accounts.source.removeMessage'),
      confirmLabel: t('common.remove'),
      destructive: true,
    });
    // Either side of a move is the same payment row.
    if (!ok) return;
    deletePayment.mutate(entryId.replace(/^payment-/, '').replace(/:out$/, ''), {
      onSuccess: () => toast('toast.payment.deleted', 'deleted'),
    });
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
          onPress={() => router.push({ pathname: '/source-payment', params: { id: source.id } })}
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
              creditLimit: card!.credit_limit,
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
            updatedOn={lastUpdated(account!.balance_as_of, ledger, today)}
            today={today}
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
          // An account's money out is spending and money it sent to a card or another account.
          label={isCard ? t('accounts.source.chargedSince') : t('accounts.source.moneyOut')}
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

      {entries.length === 0 && hiddenOlder ? (
        <HistoryNotice className="mb-28 mt-3" />
      ) : entries.length === 0 ? (
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
          {visible.map((entry, index) => {
            // A payment has no page of its own; pressing it offers to remove it, as before.
            const href =
              entry.kind === 'payment' ? null : ledgerHref({ ...entry, kind: entry.kind }, owners);
            return (
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
                  habit={entry.habit}
                  hint={href && OPEN_HINTS[entry.kind] ? t(OPEN_HINTS[entry.kind]) : undefined}
                  onPress={
                    entry.kind === 'payment'
                      ? () => handleRemovePayment(entry.id, entry.label, entry.amount)
                      : href
                        ? () => router.push(href)
                        : undefined
                  }
                />
              </Fragment>
            );
          })}
          {/* Newest first, so the older rows a free plan keeps out of view would come last. */}
          {hiddenOlder ? <HistoryNotice className="mt-3" /> : null}
        </View>
      )}

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
