import { Text, View } from 'react-native';

import { monthShort } from '@/i18n/calendar';
import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

/** The tallest bar, in points. */
export const BAR_HEIGHT = 64;
/** A month with nothing paid, or still to come: a flat line along the floor. */
export const FLAT_BAR = 3;
/** The least a month with a payment is drawn, so a small one never reads as none. */
const LEAST_BAR = 6;

/**
 * Each month's bar height: its share of the year's biggest month, never under the least for a month
 * with a payment. Months still to come, and months with nothing, lie flat.
 */
export function barHeights(bars: readonly number[], highlight: number | null): number[] {
  const most = Math.max(0, ...bars.map((amount) => Math.abs(amount)));
  return bars.map((amount, index) => {
    const ahead = highlight !== null && index > highlight;
    if (ahead || amount === 0 || most === 0) return FLAT_BAR;
    return Math.max(LEAST_BAR, Math.round((Math.abs(amount) / most) * BAR_HEIGHT));
  });
}

/** A month's initial under its bar: J F M … in English, E F M … in Spanish. */
export function monthInitial(index: number): string {
  return monthShort(index).charAt(0).toUpperCase();
}

/**
 * January to December on the plum card: this month solid white, the rest a third of white, months
 * to come flat. Drawn only: the card reads every month's amount aloud in its own label.
 */
export function MonthBars({
  bars,
  highlight,
  testID = 'month-bars',
}: {
  /** Twelve month totals. */
  bars: readonly number[];
  /** This month's index on this year's card; null on a year gone by. */
  highlight: number | null;
  testID?: string;
}) {
  const heights = barHeights(bars, highlight);

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="mt-[18px] w-full flex-row"
    >
      {heights.map((height, index) => {
        const now = index === highlight;
        return (
          <View key={index} className="flex-1 items-center">
            <View style={{ height: BAR_HEIGHT }} className="w-full items-center justify-end">
              <View
                testID={`${testID}-${index}`}
                style={{ height }}
                className={cn(
                  'w-[14px] max-w-[70%] rounded-[4px]',
                  now ? 'bg-on-control' : 'bg-on-control/35',
                )}
              />
            </View>
            <Text
              className={cn(
                'mt-[6px] text-[11px]',
                now ? 'font-app-bold text-on-control' : 'font-app text-on-control/90',
              )}
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {monthInitial(index)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
