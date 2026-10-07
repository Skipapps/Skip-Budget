import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';
import { ActionPill } from '@/components/ui/action-pill';
import { AmountTile } from '@/components/ui/amount-tile';
import { PageState } from '@/components/ui/page-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Screen } from '@/components/ui/screen';
import { SectionHeading } from '@/components/ui/typography';
import {
  savedFor,
  useBankAccounts,
  useCards,
  useSalarySources,
  useMonthlySavings,
  useSourceBalances,
} from '@/api/queries';
import { usePro } from '@/api/pro';
import { useRefreshAll } from '@/api/refresh';
import { useToday } from '@/lib/use-today';
import { moneyBuckets } from '@/data/money-mock';
import { t, type MessageKey } from '@/i18n';
import { failureText } from '@/lib/failure';

type SectionHeaderProps = {
  title: string;
  actionLabel: string;
  onAction: () => void;
};

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="w-full flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1">
        <SectionHeading>{title}</SectionHeading>
      </View>

      <ActionPill icon={Plus} label={actionLabel} onPress={onAction} className="shrink-0" />
    </View>
  );
}

/** Salary sources arrive on different cycles; normalise before summing. */
const PER_MONTH = { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1 } as const;

/** The tiles' words by bucket id; the bucket list itself holds only the English. */
const BUCKET_LABELS: Record<string, MessageKey> = {
  salary: 'cards.list.salary',
  savings: 'cards.list.savings',
};

/** Stands in for an empty list only; a failed read is answered by the whole page. */
function ListNote({ text }: { text: string }) {
  return (
    <View className="w-full items-center rounded-[16px] border border-line bg-card p-5">
      <Text className="text-center font-app text-[14px] text-muted" maxFontSizeMultiplier={1.4}>
        {text}
      </Text>
    </View>
  );
}

export default function CardsScreen() {
  const artwork = useArtwork();
  // State, not `new Date()`: a backgrounded tab does not re-render, so a plain date would stay on
  // yesterday after an overnight resume.
  const { today } = useToday();

  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();
  const savings = useMonthlySavings();
  const { balances, isError: balancesError, refetch: refetchBalances } = useSourceBalances(today);
  const { refresh, refreshing } = useRefreshAll();
  const { pro } = usePro();

  const monthlySalary = (salary.data ?? []).reduce(
    (sum, source) => sum + source.amount * PER_MONTH[source.frequency],
    0,
  );
  // Finished months added up; an overspent month takes from it. `savedFor` is the same figure the
  // Savings screen shows (a corrected month counts its correction, a left-out month nothing).
  const savingsTotal = (savings.data ?? []).reduce((sum, month) => sum + savedFor(month), 0);

  const moneyAmounts: Record<string, number> = {
    salary: monthlySalary,
    savings: savingsTotal,
  };

  // A stale balance is worse than none: if any of the seven reads behind `balances` fails, the
  // faces would fall back to the balance typed when the card was added. After all hooks, so hook
  // order holds.
  if (balancesError) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => refetchBalances()}
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View className="mt-2 w-full">
        <SectionHeader
          title={t('cards.list.creditCards')}
          actionLabel={t('cards.list.newCard')}
          onAction={() =>
            // The second of anything is where Pro begins (the database refuses it too).
            !pro && (cards.data?.length ?? 0) >= 1
              ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
              : router.push('/add-card')
          }
        />
      </View>

      <View className="mt-5 w-full gap-4">
        {(cards.data ?? []).map((card, index) => (
          // Wrapped rather than given an onPress: PaymentCard is also used in the add-card preview,
          // where tapping it means nothing.
          <Pressable
            key={card.id}
            accessibilityRole="button"
            accessibilityLabel={
              !pro && index > 0
                ? t('cards.list.cardLocked', { name: card.holder })
                : t('cards.list.viewTransactions', { name: card.holder })
            }
            onPress={() =>
              // Locked, not lost: extras beyond the free allowance survive a downgrade; the oldest
              // stays fully usable.
              !pro && index > 0
                ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
                : router.push(`/source/${card.id}`)
            }
            className="active:opacity-80"
            style={!pro && index > 0 ? { opacity: 0.45 } : undefined}
          >
            <PaymentCard
              card={{
                id: card.id,
                holder: card.holder,
                // The stored balance is only the starting point; receipts and bills have moved it.
                balance: balances.get(card.id) ?? card.balance,
                last4: card.last4 ?? '',
                network: card.network,
                color: card.color,
              }}
            />
          </Pressable>
        ))}
        {cards.isPending ? <Skeleton className="h-44 w-full rounded-[16px]" /> : null}
        {!cards.isPending && (cards.data?.length ?? 0) === 0 ? (
          <ListNote text={t('cards.list.noCards')} />
        ) : null}
      </View>

      <View className="mt-10 w-full">
        <SectionHeader
          title={t('cards.list.bankAccounts')}
          actionLabel={t('cards.list.addAccount')}
          onAction={() =>
            !pro && (accounts.data?.length ?? 0) >= 1
              ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
              : router.push('/add-account')
          }
        />
      </View>

      <View className="mt-5 w-full gap-4">
        {(accounts.data ?? []).map((account, index) => (
          <Pressable
            key={account.id}
            accessibilityRole="button"
            accessibilityLabel={
              !pro && index > 0
                ? t('cards.list.accountLocked', { name: account.nickname || account.bank_name })
                : t('cards.list.viewTransactions', { name: account.nickname || account.bank_name })
            }
            onPress={() =>
              !pro && index > 0
                ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
                : router.push(`/source/${account.id}`)
            }
            className="active:opacity-80"
            style={!pro && index > 0 ? { opacity: 0.45 } : undefined}
          >
            <AccountCard
              account={{
                id: account.id,
                bankName: account.bank_name,
                nickname: account.nickname ?? '',
                accountType: account.account_type === 'savings' ? 'Savings' : 'Checking',
                balance: balances.get(account.id) ?? account.balance,
                last4: account.last4 ?? '',
                color: account.color,
              }}
            />
          </Pressable>
        ))}
        {accounts.isPending ? <Skeleton className="h-36 w-full rounded-[16px]" /> : null}
        {!accounts.isPending && (accounts.data?.length ?? 0) === 0 ? (
          <ListNote text={t('cards.list.noAccounts')} />
        ) : null}
      </View>

      <View className="mt-10 w-full">
        <SectionHeading>{t('cards.list.money')}</SectionHeading>
      </View>

      {/* Tiles flex, not a fixed width, so they stay side by side on a narrow phone. */}
      <View className="mt-5 w-full flex-row gap-3 pb-8">
        {moneyBuckets.map((bucket) => (
          <View key={bucket.id} className="flex-1">
            <AmountTile
              label={BUCKET_LABELS[bucket.id] ? t(BUCKET_LABELS[bucket.id]) : bucket.label}
              amount={moneyAmounts[bucket.id] ?? 0}
              artwork={artwork[bucket.artwork]}
              onPress={
                bucket.id === 'salary'
                  ? () => router.push('/salary')
                  : bucket.id === 'savings'
                    ? () => router.push('/savings')
                    : undefined
              }
            />
          </View>
        ))}
      </View>
    </Screen>
  );
}
