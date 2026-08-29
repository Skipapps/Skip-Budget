import { Text, View } from 'react-native';

import type { LedgerTotals } from '@/api/queries';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

/**
 * What a window of time came to.
 *
 * Three figures in a bordered row read like a statement — a thing issued to
 * you, to be checked. The point of choosing a week or a month is softer than
 * that: it is "did this stretch pay for itself". So the answer leads at full
 * size, the bar shows the shape of it at a glance, and the two figures behind
 * it sit underneath as the working rather than the headline.
 */
export function LedgerSummary({ totals }: { totals: LedgerTotals }) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  const short = totals.net < 0;
  const moved = totals.in + totals.out;
  // Both sides are magnitudes, so the split is simply their share of the pair.
  const inShare = moved > 0 ? totals.in / moved : 0;

  return (
    <View className="w-full rounded-[16px] bg-ink/[0.035] px-4 py-4">
      <View className="w-full flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
            {short ? 'Short by' : 'Left over'}
          </Text>
          <Text
            className="mt-0.5 font-poppins-bold text-[26px]"
            style={{ color: moneyColor(totals.net) }}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.2}
          >
            {formatCurrency(Math.abs(totals.net))}
          </Text>
        </View>

        <Text
          className="mt-1 font-poppins text-[12px] text-muted"
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {totals.count === 0
            ? 'Nothing yet'
            : `${totals.count} ${totals.count === 1 ? 'transaction' : 'transactions'}`}
        </Text>
      </View>

      {moved === 0 ? null : (
        <>
          <View className="mt-4 h-2.5 w-full flex-row overflow-hidden rounded-full bg-ink/5">
            <View style={{ flex: inShare, backgroundColor: colors.moneyIn }} />
            <View style={{ flex: 1 - inShare, backgroundColor: colors.moneyOut }} />
          </View>

          <View className="mt-3 w-full flex-row items-center justify-between gap-3">
            <Leg label="In" amount={totals.in} color={colors.moneyIn} />
            <Leg label="Out" amount={-totals.out} color={colors.moneyOut} />
          </View>
        </>
      )}
    </View>
  );
}

function Leg({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-2">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
      <Text
        className="min-w-0 flex-1 font-poppins-medium text-[13px]"
        style={{ color }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}
