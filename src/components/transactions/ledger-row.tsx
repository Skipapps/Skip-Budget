import { FileText, Landmark, ReceiptText, Repeat, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { LedgerEntry, TransactionKind } from '@/data/transactions-mock';
import { formatCurrency } from '@/lib/format';
import { colors } from '@/theme/colors';

const KIND_ICONS: Record<TransactionKind, LucideIcon> = {
  bill: FileText,
  receipt: ReceiptText,
  subscription: Repeat,
  loan: Landmark,
};

type LedgerRowProps = {
  entry: LedgerEntry;
  /** Human label for the card or account it came from. */
  sourceLabel: string;
  kindLabel: string;
  onPress?: () => void;
};

export function LedgerRow({ entry, sourceLabel, kindLabel, onPress }: LedgerRowProps) {
  const Icon = KIND_ICONS[entry.kind];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.label}, ${kindLabel}, ${sourceLabel}, ${formatCurrency(entry.amount)}`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 py-3 active:opacity-60"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-black/5">
        <Icon size={18} color={colors.body} strokeWidth={1.8} />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {entry.label}
        </Text>
        <Text
          className="mt-0.5 font-poppins text-[12px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {kindLabel} · {sourceLabel}
        </Text>
      </View>

      <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.4}>
        {formatCurrency(entry.amount)}
      </Text>
    </Pressable>
  );
}
