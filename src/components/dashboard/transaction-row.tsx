import { ArrowDownLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { HabitIcon } from '@/components/habits/habit-icon';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import type { HabitMark } from '@/lib/card-ledger';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

type TransactionRowProps = {
  label: string;
  /** Negative is money out. */
  amount: number;
  /** What it came from, so the row says more than a name and a number. */
  kindLabel?: string;
  domain?: string | null;
  /** The owner chose letters for the receipt or subscription behind this row. */
  logoHidden?: boolean | null;
  /** Bills draw their category icon rather than a brand logo. */
  kind?: 'receipt' | 'bill' | 'subscription' | 'payment' | 'income';
  categoryId?: string | null;
  iconId?: string | null;
  /** A receipt filed from a spending habit draws the habit's icon, not a logo. */
  habit?: HabitMark | null;
  /** Opens whatever is behind the row. Undefined leaves it inert: no dimming, not a button. */
  onPress?: () => void;
  /** What VoiceOver adds after the label when the row opens a page: "Opens this receipt". */
  hint?: string;
};

/**
 * One line in the day's transaction list, with the same brand mark as the other lists. The name wraps
 * between words; a word too wide to sit beside the amount puts the amount under the name instead.
 */
export function TransactionRow({
  label,
  amount,
  kindLabel,
  domain,
  logoHidden,
  kind,
  categoryId,
  iconId,
  habit,
  onPress,
  hint,
}: TransactionRowProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;

  const figure = (
    <FitText
      id="amount"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      style={{ color: moneyColor(amount) }}
      slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
    >
      {formatCurrency(amount)}
    </FitText>
  );

  return (
    <FitGroup group={words} className="w-full">
      <Pressable
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={`${label}, ${formatCurrency(amount)}${kindLabel ? `, ${kindLabel}` : ''}`}
        accessibilityHint={onPress ? hint : undefined}
        onPress={onPress}
        disabled={!onPress}
        className={cn(
          'w-full flex-row items-center gap-3 py-3.5',
          onPress ? 'active:opacity-60' : undefined,
        )}
      >
        {habit ? (
          <HabitIcon iconId={habit.iconId} color={habit.color} size={40} />
        ) : kind === 'bill' ? (
          <BillMark
            categoryId={categoryId}
            iconId={iconId}
            domain={domain}
            name={label}
            size={40}
          />
        ) : kind === 'payment' || kind === 'income' ? (
          // Neither is a purchase from anyone, so neither has a logo: a monogram of "Payment" reads
          // as a failed logo, an arrow says money came in.
          <View className="h-10 w-10 items-center justify-center rounded-full bg-ink/5">
            <ArrowDownLeft size={18} color={colors.body} strokeWidth={1.8} />
          </View>
        ) : (
          <BrandMark name={label} domain={domain} hidden={logoHidden} size={40} />
        )}

        {/* Stacked, the amount follows the name, in the order VoiceOver reads the row. */}
        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="label"
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName="w-full"
          >
            {label}
          </FitText>
          {stacked ? figure : null}
          {kindLabel ? (
            <FitText
              id="kind"
              role="row"
              size={12}
              className="font-app text-muted"
              slotClassName="mt-0.5 w-full"
            >
              {kindLabel}
            </FitText>
          ) : null}
        </View>

        {stacked ? null : figure}
      </Pressable>
    </FitGroup>
  );
}
