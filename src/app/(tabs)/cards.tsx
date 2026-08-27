import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';
import { AmountTile } from '@/components/ui/amount-tile';
import { Screen } from '@/components/ui/screen';
import { useBankAccounts, useCards, useSalarySources, useSavingsPots } from '@/api/queries';
import { moneyBuckets } from '@/data/money-mock';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';

type SectionHeaderProps = {
  title: string;
  actionLabel: string;
  onAction: () => void;
};

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
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
        className="flex-row items-center gap-1.5 rounded-full border border-line bg-white py-2.5 pl-3 pr-4 active:bg-black/5"
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
  const cards = useCards();
  const accounts = useBankAccounts();
  const salary = useSalarySources();
  const savings = useSavingsPots();

  const monthlySalary = (salary.data ?? []).reduce(
    (sum, source) => sum + source.amount * PER_MONTH[source.frequency],
    0,
  );
  const savingsTotal = (savings.data ?? []).reduce((sum, pot) => sum + pot.amount, 0);

  const moneyAmounts: Record<string, number> = {
    salary: monthlySalary,
    savings: savingsTotal,
  };

  return (
    <Screen>
      <View className="mt-2 w-full">
        <SectionHeader
          title="Select Card"
          actionLabel="New card"
          onAction={() => router.push('/add-card')}
        />
      </View>

      <View className="mt-5 w-full gap-4">
        {(cards.data ?? []).map((card) => (
          <PaymentCard
            key={card.id}
            card={{
              id: card.id,
              holder: card.holder,
              balance: card.balance,
              last4: card.last4 ?? '',
              network: card.network,
              color: card.color,
            }}
          />
        ))}
        {cards.data?.length === 0 ? <EmptyNote text="No cards yet." /> : null}
      </View>

      <View className="mt-10 w-full">
        <SectionHeader
          title="Bank accounts"
          actionLabel="Add account"
          onAction={() => router.push('/add-account')}
        />
      </View>

      <View className="mt-5 w-full gap-4">
        {(accounts.data ?? []).map((account) => (
          <AccountCard
            key={account.id}
            account={{
              id: account.id,
              bankName: account.bank_name,
              nickname: account.nickname ?? '',
              accountType: account.account_type === 'savings' ? 'Savings' : 'Checking',
              balance: account.balance,
              last4: account.last4 ?? '',
              color: account.color,
            }}
          />
        ))}
        {accounts.data?.length === 0 ? <EmptyNote text="No bank accounts yet." /> : null}
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
              artwork={bucket.artwork}
              onPress={bucket.id === 'salary' ? () => router.push('/salary') : undefined}
            />
          </View>
        ))}
      </View>
    </Screen>
  );
}
