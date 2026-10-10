import { Pressable, Text, View } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import type { ScheduleRow } from '@/lib/loan';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * One payment of the schedule: its number, date and split, then the amount and what is left. The
 * figures sit in a column of their own width and the words beside them wrap, so no figure is cut.
 */
export function PaymentRow({
  row,
  first = false,
  onPress,
}: {
  row: ScheduleRow;
  /** No rule above it. */
  first?: boolean;
  /** Opens the page to change this one payment; without it the row is read, not pressed. */
  onPress?: (row: ScheduleRow) => void;
}) {
  const date = formatFullDate(new Date(`${row.date}T00:00:00`));
  const figures = {
    number: row.number,
    date,
    count: row.days,
    payment: formatCurrency(row.payment),
    interest: formatCurrency(row.interest),
    principal: formatCurrency(row.principal),
    balance: formatCurrency(row.balance),
  };
  const said =
    row.extra > 0
      ? t('loan.schedule.rowA11yExtra', { ...figures, extra: formatCurrency(row.extra) })
      : t('loan.schedule.rowA11y', figures);
  const spoken = row.overridden ? `${said} ${t('loan.schedule.changedA11y')}` : said;
  const className = cn(
    'w-full flex-row items-center gap-[12px] px-[16px] py-[12px]',
    first ? undefined : 'border-t border-line',
  );

  const content = (
    <>
      <View className="min-h-[24px] min-w-[24px] items-center justify-center rounded-full bg-accent/10 px-1">
        <Text
          className="font-app-semibold text-[11px] text-accent-ink"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {row.number}
        </Text>
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
          <Text
            className="font-app-semibold text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {date}
          </Text>
          {row.overridden ? (
            <View className="rounded-full bg-accent/10 px-2 py-0.5" testID="payment-changed">
              <Text
                className="font-app-semibold text-[11px] text-accent-ink"
                maxFontSizeMultiplier={TEXT_CAP.control}
              >
                {t('loan.schedule.changed')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          className="mt-0.5 font-app text-[11px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {row.extra > 0
            ? t('loan.schedule.rowSplitExtra', {
                principal: figures.principal,
                interest: figures.interest,
                extra: formatCurrency(row.extra),
              })
            : t('loan.schedule.rowSplit', {
                principal: figures.principal,
                interest: figures.interest,
              })}
        </Text>
      </View>

      <View className="shrink-0 items-end">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {figures.payment}
        </Text>
        <Text
          className="mt-0.5 font-app text-[11px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {t('loan.schedule.left', { amount: figures.balance })}
        </Text>
      </View>
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={t('loan.schedule.rowHint')}
      onPress={() => onPress(row)}
      className={cn(className, 'active:bg-ink/5')}
    >
      {content}
    </Pressable>
  ) : (
    <View className={className} accessible accessibilityLabel={spoken}>
      {content}
    </View>
  );
}
