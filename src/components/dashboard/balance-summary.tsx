import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { StatTile } from '@/components/dashboard/stat-tile';
import { formatCurrency } from '@/lib/format';

type BalanceSummaryProps = {
  /** Payday minus expenses. Cash flow, not an account balance. */
  leftThisMonth: number;
  payday: number;
  expenses: number;
  loading?: boolean;
};

/** What is left this month, with the income and outgoings behind it. */
export function BalanceSummary({
  leftThisMonth,
  payday,
  expenses,
  loading = false,
}: BalanceSummaryProps) {
  return (
    <View className="w-full">
      <Text className="font-poppins-semibold text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
        Left this month
      </Text>

      <Text
        className="mt-5 text-center font-poppins-bold text-[38px] text-ink phone:text-[42px]"
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.2}
      >
        {loading ? '—' : formatCurrency(leftThisMonth)}
      </Text>

      <View className="mt-5 w-full flex-row gap-3">
        <StatTile label="Payday" amount={payday} icon={ArrowDownLeft} tone="positive" />
        {/* Stored as a positive magnitude; shown as money going out. */}
        <StatTile label="Expenses" amount={-expenses} icon={ArrowUpRight} tone="negative" />
      </View>
    </View>
  );
}
