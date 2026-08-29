import { Text, View } from 'react-native';

import { formatRelativeDay } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useMoneyColor } from '@/providers/theme-provider';

type DateGroupHeaderProps = {
  /** yyyy-mm-dd, or '' for the undated group. */
  date: string;
  today: string;
  /** Signed; omitted when a group total would not mean anything. */
  total?: number;
};

/**
 * The sticky-looking day heading above a run of rows.
 *
 * Quiet on purpose — it orients the eye without competing with the rows it
 * introduces, which is why it is muted, small, and carries the day's total on
 * the right where the row amounts already are.
 */
export function DateGroupHeader({ date, today, total }: DateGroupHeaderProps) {
  const moneyColor = useMoneyColor();
  return (
    <View className="w-full flex-row items-center justify-between gap-3 bg-surface pb-1.5 pt-4">
      <Text
        className="font-poppins-medium text-[13px] uppercase tracking-wide text-muted"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {formatRelativeDay(date, today)}
      </Text>

      {total === undefined ? null : (
        <Text
          className="font-poppins text-[13px] text-muted"
          style={{ color: moneyColor(total) }}
          maxFontSizeMultiplier={1.3}
        >
          {formatCurrency(total)}
        </Text>
      )}
    </View>
  );
}
