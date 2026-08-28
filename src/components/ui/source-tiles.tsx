import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { isLightColor } from '@/lib/color';
import type { PaymentSourceRow as PaymentSource } from '@/api/queries';
import { colors } from '@/theme/colors';

type SourceTilesProps = {
  sources: readonly PaymentSource[];
  value: string;
  onChange: (id: string) => void;
};

/**
 * Pick-one tiles for cards and bank accounts.
 *
 * Each carries a swatch of its own card colour, so the choice is recognisable
 * without reading the digits.
 */
export function SourceTiles({ sources, value, onChange }: SourceTilesProps) {
  return (
    <View className="w-full flex-row flex-wrap gap-3">
      {sources.map((source) => {
        const selected = source.id === value;

        return (
          <Pressable
            key={source.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={source.label}
            onPress={() => onChange(source.id)}
            style={{ width: '47.5%' }}
            className={cn(
              'flex-row items-center gap-2.5 rounded-[10px] border px-3 py-3',
              selected
                ? 'border-control bg-black/[0.03]'
                : 'border-line bg-white active:bg-black/5',
            )}
          >
            <View
              style={{ backgroundColor: source.color }}
              className="h-7 w-10 items-center justify-center rounded-[5px] border border-black/10"
            >
              {selected ? (
                <Check
                  size={14}
                  color={isLightColor(source.color) ? colors.ink : '#FFFFFF'}
                  strokeWidth={3}
                />
              ) : null}
            </View>

            <Text
              className={cn(
                'flex-1 text-[13px]',
                selected ? 'font-poppins-medium text-ink' : 'font-poppins text-body',
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
