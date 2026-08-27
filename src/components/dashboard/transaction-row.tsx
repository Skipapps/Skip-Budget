import { Pressable, Text, View } from 'react-native';

import type { Transaction } from '@/data/dashboard-mock';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';

type TransactionRowProps = {
  transaction: Transaction;
  onPress?: () => void;
};

/** One line in the day's transaction list. */
export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const { label, amount, icon: Icon } = transaction;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatCurrency(amount)}`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3 active:opacity-60"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-black/5">
        <Icon size={18} color={colors.body} strokeWidth={1.8} />
      </View>

      <Text
        className="flex-1 font-poppins text-[15px] text-ink"
        numberOfLines={1}
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>

      <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.4}>
        {formatCurrency(amount)}
      </Text>
    </Pressable>
  );
}
