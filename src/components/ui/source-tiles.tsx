import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import type { PaymentSourceRow as PaymentSource } from '@/api/queries';

type SourceTilesProps = {
  sources: readonly PaymentSource[];
  value: string;
  onChange: (id: string) => void;
};

/**
 * Pick-one pills for cards and bank accounts.
 *
 * Each carries a swatch of its own card colour, so the choice is recognisable
 * without reading the digits. The swatch stays its own colour when selected —
 * the pill fill says "chosen", the swatch says "which one", and letting the
 * selection repaint the swatch would take away the thing being chosen.
 */
export function SourceTiles({ sources, value, onChange }: SourceTilesProps) {
  return (
    <View accessibilityRole="radiogroup" className="w-full flex-row flex-wrap gap-2">
      {sources.map((source) => {
        const selected = source.id === value;

        return (
          <Pressable
            key={source.id}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={source.label}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              selection();
              onChange(source.id);
            }}
            className={cn(
              'min-h-10 max-w-full flex-row items-center gap-2.5 rounded-full pl-2.5 pr-4',
              selected ? 'bg-control' : 'bg-ink/5 active:bg-ink/10',
            )}
          >
            <View
              style={{ backgroundColor: source.color }}
              className="h-6 w-6 rounded-full border border-ink/10"
            />

            <Text
              className={cn(
                'shrink text-[14px]',
                selected ? 'font-poppins-medium text-on-control' : 'font-poppins text-body',
              )}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {source.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
