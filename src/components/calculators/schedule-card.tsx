import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import ScheduleArt from '@/assets/illustrations/loan-schedule.svg';
import { formatCurrency } from '@/lib/format';
import type { AmortisationRow } from '@/lib/loan';
import { colors } from '@/theme/colors';

type ScheduleCardProps = {
  rows: AmortisationRow[];
  onPress: () => void;
};

/**
 * The way into the payment-by-payment breakdown.
 *
 * It leads with the first payment's split rather than a label, because that is
 * the number people do not expect: on a normal loan most of the first payment
 * is interest, and seeing it once explains the whole schedule.
 */
export function ScheduleCard({ rows, onPress }: ScheduleCardProps) {
  const first = rows[0];
  if (!first) return null;

  const interestShare = first.payment > 0 ? first.interest / first.payment : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Where each payment goes. First payment: ${formatCurrency(first.interest)} interest, ${formatCurrency(first.principal)} off the balance. Opens the full schedule.`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 rounded-[10px] border border-line px-4 py-4 active:bg-black/5"
    >
      <View className="h-[72px] w-[72px]">
        <ScheduleArt width="100%" height="100%" />
      </View>

      <View className="min-w-0 flex-1">
        <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          Where each payment goes
        </Text>
        <Text
          className="mt-1 font-poppins text-[12px] leading-[17px] text-muted"
          maxFontSizeMultiplier={1.3}
        >
          {Math.round(interestShare * 100)}% of your first payment is interest — see all{' '}
          {rows.length} payments
        </Text>

        {/* The same two colours as the summary bar above it, so the split reads
            as the same idea seen closer up rather than a new one. */}
        <View className="mt-2.5 h-2 w-full flex-row overflow-hidden rounded-full bg-black/5">
          <View style={{ flex: Math.max(first.principal, 0) }} className="bg-control" />
          <View style={{ flex: Math.max(first.interest, 0) }} className="bg-accent" />
        </View>
      </View>

      <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}
