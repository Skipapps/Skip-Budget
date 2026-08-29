import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, Plus } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useCreatePayment, useDeletePayment } from '@/api/mutations';
import { useSourceLedger } from '@/api/queries';
import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';
import { AmountPad } from '@/components/ui/amount-pad';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { useConfirm } from '@/providers/dialog-provider';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { Title } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useColors } from '@/providers/theme-provider';

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
  // Read once per render rather than inside the hook, so the ledger stays a
  // pure function of its inputs and cannot shift mid-render.
  const today = toIsoDate(new Date());

  const { source, kind, card, account, ledger, isLoading, isError } = useSourceLedger(id, today);
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const confirm = useConfirm();

  const [padOpen, setPadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          title="Could not open this one"
          message="It may have been deleted. Go back and pick another."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const isCard = kind === 'card';
  const name = isCard ? card!.holder : account!.nickname || account!.bank_name;

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
      setError((thrown as Error).message ?? 'Could not record that payment.');
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
      showBack
      floating={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isCard ? 'Make a payment' : 'Add a deposit'}
          onPress={() => setPadOpen(true)}
          className="h-14 flex-row items-center gap-2 rounded-full bg-control px-5 active:opacity-80"
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2.2} />
          <Text
            className="font-poppins-medium text-[15px] text-on-control"
            maxFontSizeMultiplier={1.3}
          >
            {isCard ? 'Make a payment' : 'Add money'}
          </Text>
        </Pressable>
      }
    >
      <View className="mt-2 w-full flex-row items-center justify-between gap-3">
        <Title align="left" className="flex-1">
          {name}
        </Title>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${name}`}
          hitSlop={8}
          onPress={() =>
            router.push(isCard ? `/add-card?id=${source.id}` : `/add-account?id=${source.id}`)
          }
          className="h-11 w-11 items-center justify-center rounded-full border border-line active:bg-ink/5"
        >
          <Pencil size={18} color={colors.ink} strokeWidth={1.9} />
        </Pressable>
      </View>

      <View className="mt-6 w-full">
        {isCard ? (
          <PaymentCard
            card={{
              id: card!.id,
              holder: card!.holder,
              // The face shows what the card is at now, not the figure typed
              // weeks ago — that is the whole point of the ledger.
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

      {/* The arithmetic, spelled out. A balance that moved without explanation
          is the fastest way to lose someone's trust in a money app. */}
      <View className="mt-6 w-full rounded-[10px] border border-line px-4 py-3">
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
          className="mt-4 w-full text-center font-poppins text-[13px] text-red-600"
          maxFontSizeMultiplier={1.4}
        >
          {error}
        </Text>
      ) : null}

      <Text
        className="mt-8 w-full font-poppins-semibold text-[17px] text-ink"
        maxFontSizeMultiplier={1.3}
      >
        Transactions
      </Text>

      {ledger.entries.length === 0 ? (
        <PageState
          art={artwork.emptyWallet}
          title="Nothing on this one yet"
          message={
            isCard
              ? 'Receipts, bills and subscriptions paid with this card land here as their dates arrive.'
              : 'Anything paid from this account lands here as its date arrives.'
          }
        />
      ) : (
        <View className="mt-1 w-full pb-28">
          {ledger.entries.map((entry, index) => (
            <Fragment key={entry.id}>
              {index > 0 ? <View className="ml-13 h-px bg-line/60" /> : null}
              <TransactionRow
                label={entry.label}
                amount={entry.amount}
                kindLabel={`${KIND_LABELS[entry.kind]} · ${formatFullDate(new Date(`${entry.date}T00:00:00`))}`}
                domain={entry.domain}
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
