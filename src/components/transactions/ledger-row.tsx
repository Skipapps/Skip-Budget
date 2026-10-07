import { ArrowDownLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import type { LedgerEntry } from '@/api/queries';
import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useColors, useMoneyColor } from '@/providers/theme-provider';

type LedgerRowProps = {
  entry: LedgerEntry;
  /** Human label for the card or account it came from. */
  sourceLabel: string;
  kindLabel: string;
  /**
   * Opens the record behind the row. Undefined leaves it inert: not a button, no dimming, not
   * announced by VoiceOver as pressable.
   */
  onPress?: () => void;
};

/**
 * One line of the ledger. The name wraps between words; a word too wide to sit beside the amount puts
 * the amount under the name instead.
 */
export function LedgerRow({ entry, sourceLabel, kindLabel, onPress }: LedgerRowProps) {
  const colors = useColors();
  const moneyColor = useMoneyColor();
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  // Income is the one kind with nothing to draw: a paycheque has no merchant, and a monogram of the
  // employer's name reads as a mistake next to real logos.
  const isIncome = entry.kind === 'income';
  // A bill is not a brand either — it carries the category icon instead.
  const isBill = entry.kind === 'bill';

  const label = [entry.label, kindLabel, sourceLabel, formatCurrency(entry.amount)]
    .filter(Boolean)
    .join(', ');

  const figure = (
    <FitText
      id="amount"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      style={{ color: moneyColor(entry.amount) }}
      slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
    >
      {formatCurrency(entry.amount)}
    </FitText>
  );

  return (
    <FitGroup group={words} className="w-full">
      <Pressable
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={label}
        onPress={onPress}
        disabled={!onPress}
        className={cn(
          'w-full flex-row items-center gap-3 py-3',
          onPress ? 'active:opacity-60' : undefined,
        )}
      >
        {isIncome ? (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-ink/5">
            <ArrowDownLeft size={18} color={colors.body} strokeWidth={1.8} />
          </View>
        ) : isBill ? (
          <BillMark
            categoryId={entry.categoryId}
            iconId={entry.iconId}
            domain={entry.domain}
            name={entry.label}
            size={40}
          />
        ) : (
          <BrandMark name={entry.label} domain={entry.domain} hidden={entry.logoHidden} size={40} />
        )}

        {/* Stacked, the amount follows the name, in the order VoiceOver reads the row. */}
        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="label"
            role="row"
            size={15}
            className="font-app text-ink"
            slotClassName="w-full"
          >
            {entry.label}
          </FitText>
          {stacked ? figure : null}
          <FitText
            id="detail"
            role="row"
            size={12}
            className="font-app text-muted"
            slotClassName="mt-0.5 w-full"
          >
            {sourceLabel ? `${kindLabel} · ${sourceLabel}` : kindLabel}
          </FitText>
        </View>

        {stacked ? null : figure}
      </Pressable>
    </FitGroup>
  );
}
