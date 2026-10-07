import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { t, type MessageKey } from '@/i18n';
import { isLightColor } from '@/lib/color';
import { CARD_COLORS } from '@/theme/card-colors';
import { useColors } from '@/providers/theme-provider';

/** The swatch's name as read aloud; the stored value is the hex. */
const COLOR_NAME: Record<(typeof CARD_COLORS)[number]['id'], MessageKey> = {
  coral: 'ui.color.coral',
  ink: 'ui.color.ink',
  snow: 'ui.color.snow',
  lime: 'ui.color.lime',
  sky: 'ui.color.sky',
  violet: 'ui.color.violet',
  sand: 'ui.color.sand',
  forest: 'ui.color.forest',
};

type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Swatch grid for a card face colour. Quarter-width cells, so it stays four-up at every screen width. */
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
              accessibilityLabel={t(COLOR_NAME[option.id])}
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
