import { Text, View } from 'react-native';

import { formatRelativeDay } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useMoneyColor } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type DateGroupHeaderProps = {
  /** yyyy-mm-dd, or '' for the undated group. */
  date: string;
  today: string;
  /** Signed; omitted when a group total would not mean anything. */
  total?: number;
};

/**
 * The day heading above a run of rows. Muted so it does not compete with them. When the day and its
 * total do not fit on one line the total moves under the day, so neither is cut.
 */
export function DateGroupHeader({ date, today, total }: DateGroupHeaderProps) {
  const moneyColor = useMoneyColor();
  return (
    <View className="w-full flex-row flex-wrap items-center justify-between gap-x-3 bg-surface pb-1.5 pt-4">
      <Text
        className="shrink font-app-medium text-[13px] uppercase tracking-wide text-muted"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {formatRelativeDay(date, today)}
      </Text>

      {total === undefined ? null : (
        <Text
          className="font-app text-[13px] text-muted"
          style={{ color: moneyColor(total) }}
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {formatCurrency(total)}
        </Text>
      )}
    </View>
  );
}
