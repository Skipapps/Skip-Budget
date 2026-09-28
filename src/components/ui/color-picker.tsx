import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { isLightColor } from '@/lib/color';
import { CARD_COLORS } from '@/theme/card-colors';
import { useColors } from '@/providers/theme-provider';

type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Swatch grid for choosing a card face colour.
 *
 * Four to a row: quarter-width cells rather than a wrapped row with gaps, so
 * the grid stays four-up and evenly spaced at every screen width instead of
 * breaking seven-and-one wherever the row happens to run out.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const colors = useColors();
  return (
    <View className="w-full flex-row flex-wrap gap-y-4">
      {CARD_COLORS.map((option) => {
        const selected = option.value === value;
        return (
          <View key={option.id} className="w-1/4 items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={{
                backgroundColor: option.value,
                // Ring sits outside the swatch so it reads on light colours too.
                borderColor: selected ? colors.ink : colors.line,
                borderWidth: selected ? 2 : 1,
              }}
              className="h-12 w-12 items-center justify-center rounded-full active:opacity-80"
            >
              {selected ? (
                <Check
                  size={18}
                  color={isLightColor(option.value) ? colors.ink : '#FFFFFF'}
                  strokeWidth={3}
                />
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
