import type { FC } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { shadows } from '@/theme/shadows';

type AmountTileProps = {
  label: string;
  /** Omitted for tiles that open a tool rather than report spending. */
  amount?: number;
  artwork: FC<SvgProps>;
  onPress?: () => void;
  className?: string;
};

/**
 * Square tile: artwork, label, amount.
 *
 * Fills whatever width its parent gives it, so the same tile works in the
 * dashboard's fixed-width carousel and in a flexible two-up row.
 */
export function AmountTile({
  label,
  amount,
  artwork: Artwork,
  onPress,
  className,
}: AmountTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={amount === undefined ? label : `${label}, ${formatCurrency(amount)}`}
      onPress={onPress}
      style={shadows.card}
      className={cn(
        'aspect-square w-full justify-between rounded-[10px] border border-line bg-white p-3 active:opacity-80',
        className,
      )}
    >
      <View className="h-[84px] w-[84px]">
        <Artwork width="100%" height="100%" />
      </View>

      <View>
        <Text
          className="font-poppins-medium text-[13px] leading-[18px] text-body"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
        {/* A calculator tile has no figure; the row keeps its height so the
            tiles stay square and aligned beside the ones that do. */}
        <Text
          className={cn(
            'mt-1 font-poppins-semibold text-[16px]',
            amount === undefined ? 'text-muted' : 'text-ink',
          )}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.3}
        >
          {amount === undefined ? 'Open' : formatCurrency(amount)}
        </Text>
      </View>
    </Pressable>
  );
}
