import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import type { PaymentSourceRow as PaymentSource } from '@/api/queries';
import { TEXT_CAP } from '@/theme/text-scale';

type SourceTilesProps = {
  sources: readonly PaymentSource[];
  value: string;
  onChange: (id: string) => void;
  /** A last pill for none of them, picked on purpose rather than left blank. */
  skip?: { label: string; selected: boolean; onPress: () => void };
};

/**
 * Pick-one pills for cards and bank accounts, each with a swatch of its card colour. The swatch is
 * never repainted on selection: the pill fill says "chosen", the swatch says "which one". The pills
 * wrap onto more lines, and a name wider than the row wraps inside its pill rather than being cut.
 */
export function SourceTiles({ sources, value, onChange, skip }: SourceTilesProps) {
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
              'min-h-10 max-w-full flex-row items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4',
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
                selected ? 'font-app-medium text-on-control' : 'font-app text-body',
              )}
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {source.label}
            </Text>
          </Pressable>
        );
      })}

      {skip ? (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: skip.selected, checked: skip.selected }}
          accessibilityLabel={skip.label}
          hitSlop={{ top: 4, bottom: 4 }}
          onPress={() => {
            selection();
            skip.onPress();
          }}
          className={cn(
            'min-h-10 max-w-full flex-row items-center rounded-full px-4 py-2',
            skip.selected ? 'bg-control' : 'bg-ink/5 active:bg-ink/10',
          )}
        >
          <Text
            className={cn(
              'shrink text-[14px]',
              skip.selected ? 'font-app-medium text-on-control' : 'font-app text-body',
            )}
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {skip.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
