import { Text, View } from 'react-native';

import { t } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useMoneyColor } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** "October 2026", as Payment history names its months. `month` is yyyy-mm. */
export function sourceMonthText(month: string): string {
  return t('ui.calendar.monthYear', {
    month: monthLong(Number(month.slice(5, 7)) - 1),
    year: Number(month.slice(0, 4)),
  });
}

/**
 * The heading over one month of a card's or account's rows, muted so it sits under the page's
 * Transactions heading. The figure is signed and coloured as the rows' own amounts are, since a
 * month here can be money in as well as out. When the two do not fit on one line the figure moves
 * under the month, so neither is cut.
 */
export function SourceMonthHeader({
  month,
  net,
  className,
  testID,
}: {
  /** yyyy-mm */
  month: string;
  /**
   * The whole month's matching rows summed, signed, including the ones the free window leaves out
   * of the list: negative is more out than in.
   */
  net: number;
  className?: string;
  testID?: string;
}) {
  const moneyColor = useMoneyColor();
  const name = sourceMonthText(month);
  const amount = formatCurrency(net);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={t('accounts.source.monthA11y', { month: name, amount })}
      testID={testID}
      className={cn(
        'w-full flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5',
        className,
      )}
    >
      <Text
        className="shrink font-app-medium text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {name}
      </Text>
      <Text
        className="shrink font-app text-[13px]"
        style={{ color: moneyColor(net) }}
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {amount}
      </Text>
    </View>
  );
}
