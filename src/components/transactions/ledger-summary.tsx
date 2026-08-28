import { Text, View } from 'react-native';

import type { LedgerTotals } from '@/api/queries';
import { formatCurrency } from '@/lib/format';

/**
 * The three numbers a window is actually about.
 *
 * The whole point of bounding the list to a week or a month is to be able to
 * answer "what did that cost me" without adding it up by hand, so the totals
 * lead and the rows follow.
 */
export function LedgerSummary({ totals }: { totals: LedgerTotals }) {
  const short = totals.net < 0;

  return (
    <View className="w-full rounded-[10px] border border-line px-4 py-3">
      <View className="w-full flex-row items-center justify-between">
        <Cell label="In" value={formatCurrency(totals.in)} tone="in" />
        <Cell label="Out" value={formatCurrency(-totals.out)} tone="out" />
        <Cell
          label={short ? 'Short by' : 'Left over'}
          value={formatCurrency(Math.abs(totals.net))}
          tone="net"
        />
      </View>

      <Text className="mt-2 w-full font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
        {totals.count === 0
          ? 'Nothing in this window'
          : `${totals.count} ${totals.count === 1 ? 'transaction' : 'transactions'}`}
      </Text>
    </View>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'in' | 'out' | 'net';
}) {
  // Amounts wear their own colour only for in and out, where it repeats what
  // the sign already says. The net stays ink so it reads as the answer.
  const color = tone === 'in' ? '#0B6B3A' : tone === 'out' ? '#E4714E' : undefined;

  return (
    <View className="flex-1">
      <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <Text
        className="mt-0.5 font-poppins-semibold text-[15px] text-ink"
        style={color ? { color } : undefined}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </View>
  );
}
