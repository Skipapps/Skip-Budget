import { Text, View } from 'react-native';

import { compactMoney, t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

/** The tallest bar, in points. */
export const BAR_ROOM = 100;
/** Over the tallest bar, for its figure at the largest text the label grows to. */
const LABEL_ROOM = 22;
/** The least a bar with money is drawn, so a small amount never reads as none. */
const LEAST_BAR = 4;

export type SpendBar = {
  key: string;
  /** Under the bar: "1–3", "O". */
  label: string;
  /** The bar as VoiceOver names it: "1–3", "October". */
  spoken: string;
  amount: number;
  /** Year mode's picked or current month, drawn dark. */
  highlight: boolean;
};

/**
 * Each bar's height: its share of the biggest, never under the least for a bar with money. A bar
 * with nothing is 0, drawn as a flat line.
 */
export function spendBarHeights(amounts: readonly number[]): number[] {
  const most = Math.max(0, ...amounts.map((amount) => Math.abs(amount)));
  return amounts.map((amount) =>
    amount === 0 || most === 0
      ? 0
      : Math.max(LEAST_BAR, Math.round((Math.abs(amount) / most) * BAR_ROOM)),
  );
}

/**
 * Spending per part of the period. Month: a bar per week of the month, every bar with money
 * carrying its figure. Year: a bar per month, the highlighted month dark and the only one with a
 * figure, the rest light. The chart is read aloud as one stop, every bar to the cent.
 */
export function SpendChart({
  bars,
  mode,
  testID = 'insights-chart',
}: {
  bars: readonly SpendBar[];
  mode: 'month' | 'year';
  testID?: string;
}) {
  const heights = spendBarHeights(bars.map((bar) => bar.amount));
  const spoken = bars
    .map((bar) => t('insights.out.bar', { label: bar.spoken, amount: formatCurrency(bar.amount) }))
    .join(', ');

  return (
    <View testID={testID} accessible accessibilityLabel={spoken} className="w-full">
      <View className="w-full flex-row" style={{ height: BAR_ROOM + LABEL_ROOM }}>
        {bars.map((bar, index) => {
          const height = heights[index];
          const labelled = height > 0 && (mode === 'month' || bar.highlight);
          const dark = mode === 'month' || bar.highlight;
          return (
            <View key={bar.key} className="flex-1 items-center justify-end">
              {labelled ? (
                // Wider than a year's slot on purpose: the figure overhangs its neighbours, which
                // carry none, rather than wrapping between its digits.
                <View className="mb-[4px] w-[72px] items-center">
                  <Text
                    testID={`${testID}-figure-${index}`}
                    className="text-center font-app-semibold text-[11px] text-body"
                    maxFontSizeMultiplier={TEXT_CAP.control}
                  >
                    {compactMoney(bar.amount)}
                  </Text>
                </View>
              ) : null}
              {height > 0 ? (
                <View
                  testID={`${testID}-bar-${index}`}
                  style={{ height }}
                  className={cn(
                    mode === 'month'
                      ? 'w-[72%] rounded-t-[5px]'
                      : 'w-[16px] max-w-[72%] rounded-[5px]',
                    dark ? 'bg-accent' : 'bg-accent/30',
                  )}
                />
              ) : (
                <View
                  testID={`${testID}-flat-${index}`}
                  className={cn(
                    'h-[2px] rounded-full bg-line',
                    mode === 'month' ? 'w-[80%]' : 'w-[16px] max-w-[72%]',
                  )}
                />
              )}
            </View>
          );
        })}
      </View>

      <View className="mt-[8px] w-full flex-row">
        {bars.map((bar) => (
          <View key={bar.key} className="flex-1 items-center">
            <Text
              className="text-center font-app text-[11px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {bar.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
