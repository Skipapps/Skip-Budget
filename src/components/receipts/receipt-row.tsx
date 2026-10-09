import { Pressable, View } from 'react-native';

import { BrandMark } from '@/components/brands/brand-mark';
import { HabitIcon } from '@/components/habits/habit-icon';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import type { HabitColor } from '@/data/habit-colors';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { useMoneyColor } from '@/providers/theme-provider';

type ReceiptRowProps = {
  merchant: string;
  /** Stored positive; money out is a presentation decision, made here. */
  amount: number;
  /** yyyy-mm-dd */
  date: string;
  sourceLabel: string;
  /** The receipt's own logo (logoDomainOf); skips the lookup. */
  domain?: string | null;
  /** The owner chose letters for this receipt. */
  logoHidden?: boolean | null;
  /** Filed from a spending habit: drawn with the habit's icon, not a logo. */
  habit?: { icon_id: string; color: HabitColor } | null;
  onPress?: () => void;
};

/**
 * One receipt in a list. The store's name wraps between words; a word too wide to sit beside the
 * amount and date puts them under the name instead.
 */
export function ReceiptRow({
  merchant,
  amount,
  date,
  sourceLabel,
  domain,
  logoHidden,
  habit,
  onPress,
}: ReceiptRowProps) {
  const moneyColor = useMoneyColor();
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const spent = -Math.abs(amount);
  const figure = formatCurrency(spent);

  const shownAmount = (
    <FitText
      id="amount"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      style={{ color: moneyColor(spent) }}
      slotClassName={stacked ? 'mt-0.5' : undefined}
    >
      {figure}
    </FitText>
  );
  const shownDate = (
    <FitText
      id="date"
      hug
      role="row"
      size={12}
      className="font-app text-muted"
      slotClassName="mt-0.5"
    >
      {formatFullDate(new Date(`${date}T00:00:00`))}
    </FitText>
  );

  return (
    <FitGroup group={words} className="w-full">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          sourceLabel
            ? t('receipts.row.paidWith', { merchant, amount: figure, source: sourceLabel })
            : `${merchant}, ${figure}`
        }
        accessibilityHint={t('receipts.row.hint')}
        onPress={onPress}
        className="w-full flex-row items-center gap-3 py-3.5 active:opacity-60"
      >
        {habit ? (
          <HabitIcon iconId={habit.icon_id} color={habit.color} size={40} />
        ) : (
          <BrandMark name={merchant} domain={domain} hidden={logoHidden} size={40} />
        )}

        {/* Stacked, the amount follows the name and the date follows the card it was paid with. */}
        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="name"
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName="w-full"
          >
            {merchant}
          </FitText>
          {stacked ? shownAmount : null}
          {sourceLabel ? (
            <FitText
              id="detail"
              role="row"
              size={12}
              className="font-app text-muted"
              slotClassName="mt-0.5 w-full"
            >
              {sourceLabel}
            </FitText>
          ) : null}
          {stacked ? shownDate : null}
        </View>

        {stacked ? null : (
          <View className="shrink-0 items-end">
            {shownAmount}
            {shownDate}
          </View>
        )}
      </Pressable>
    </FitGroup>
  );
}
