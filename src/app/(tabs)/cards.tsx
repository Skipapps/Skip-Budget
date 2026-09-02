import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';
import { AmountTile } from '@/components/ui/amount-tile';
import { Skeleton } from '@/components/ui/skeleton';
import { Screen } from '@/components/ui/screen';
import {
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
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

type SectionHeaderProps = {
  title: string;
  actionLabel: string;
  onAction: () => void;
};

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const colors = useColors();
  return (
    <View className="w-full flex-row items-center justify-between gap-3">
      <Text
        className="flex-1 font-poppins-semibold text-[20px] text-ink"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        style={shadows.card}
        className="flex-row items-center gap-1.5 rounded-full border border-line bg-card py-2.5 pl-3 pr-4 active:bg-ink/5"
      >
        <Plus size={18} color={colors.ink} strokeWidth={2.2} />
        <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.2}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/** Salary sources arrive on different cycles; normalise before summing. */
const PER_MONTH = { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1 } as const;

function EmptyNote({ text }: { text: string }) {
  return (
    <View className="w-full rounded-[10px] border border-dashed border-line p-5">
      <Text className="text-center font-poppins text-[14px] text-muted" maxFontSizeMultiplier={1.4}>
        {text}
      </Text>
    </View>
  );
}

export default function CardsScreen() {
  const artwork = useArtwork();
  // Read once per render, so every face on the screen is worked out against
  // the same day rather than drifting apart across a midnight boundary.
  // As state, not a render-time read: a backgrounded tab does not re-render,
  // so a plain new Date() here stays on yesterday after an overnight resume.
  const { today } = useToday();

  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();
  const savings = useMonthlySavings();
  const { balances } = useSourceBalances(today);
  const { refresh, refreshing } = useRefreshAll();
  const { pro } = usePro();

  const monthlySalary = (salary.data ?? []).reduce(
    (sum, source) => sum + source.amount * PER_MONTH[source.frequency],
    0,
  );
  // What the finished months added up to. A month that was overspent takes
  // from it, so this can fall as well as rise.
  const savingsTotal = (savings.data ?? []).reduce((sum, month) => sum + Number(month.saved), 0);

  const moneyAmounts: Record<string, number> = {
    salary: monthlySalary,
    savings: savingsTotal,
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View className="mt-2 w-full">
        <SectionHeader
          title="Select Card"
          actionLabel="New card"
          onAction={() =>
            // The second of anything is where Pro begins. The database refuses
            // it too; this door just explains itself first.
            !pro && (cards.data?.length ?? 0) >= 1
              ? router.push({ pathname: '/pro-feature', params: { id: 'unlimited' } })
              : router.push('/add-card')
          }
        />
      </View>

      <View className="mt-5 w-full gap-4">
        {(cards.data ?? []).map((card, index) => (
          // Wrapped rather than given an onPress: PaymentCard stays purely
          // presentational, and the same face is reused in the add-card preview
          // where tapping it would mean nothing.
          <Pressable
            key={card.id}
            accessibilityRole="button"
            accessibilityLabel={
              !pro && index > 0
                ? `${card.holder}, locked on the free plan. Opens Skip Pro.`
                : `${card.holder}, view transactions`
            }
            onPress={() =>
              // Locked, not lost: extras beyond the free allowance survive a
              // downgrade untouched and open the way back in. The oldest one
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
                // What the card is at now. The stored figure is only the
                // starting point; receipts and bills have moved it since.
                balance: balances.get(card.id) ?? card.balance,
                last4: card.last4 ?? '',
                network: card.network,
                color: card.color,
              }}
            />
          </Pressable>
        ))}
        {cards.isPending ? <Skeleton className="h-44 w-full rounded-[16px]" /> : null}
        {!cards.isPending && cards.data?.length === 0 ? (
          <EmptyNote text="No cards yet. Add one to track what you spend on it." />
        ) : null}
      </View>

      <View className="mt-10 w-full">
        <SectionHeader
          title="Bank accounts"
          actionLabel="Add account"
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
                ? `${account.nickname || account.bank_name}, locked on the free plan. Opens Skip Pro.`
                : `${account.nickname || account.bank_name}, view transactions`
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
        {!accounts.isPending && accounts.data?.length === 0 ? (
          <EmptyNote text="No bank accounts yet. Add one to see money coming in and out." />
        ) : null}
      </View>

      <Text
        className="mt-10 w-full font-poppins-semibold text-[20px] text-ink"
        maxFontSizeMultiplier={1.3}
      >
        Money
      </Text>

      {/* Two-up: tiles flex rather than sit at a fixed width, so they stay
          side by side on a narrow phone instead of overflowing. */}
      <View className="mt-5 w-full flex-row gap-3 pb-8">
        {moneyBuckets.map((bucket) => (
          <View key={bucket.id} className="flex-1">
            <AmountTile
              label={bucket.label}
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
