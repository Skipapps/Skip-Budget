import { Pressable, View } from 'react-native';

import { t, type MessageKey } from '@/i18n';
import { selection } from '@/lib/haptics';
import { contrast } from '@/lib/tone';
import { FACE_COLORS } from '@/theme/card-colors';
import { useColors, useTheme } from '@/providers/theme-provider';

/** The swatch's name as read aloud; the stored value is the hex. */
const COLOR_NAME: Record<(typeof FACE_COLORS)[number]['id'], MessageKey> = {
  blue: 'ui.color.blue',
  violet: 'ui.color.violet',
  plum: 'ui.color.plum',
  teal: 'ui.color.teal',
  slate: 'ui.color.slate',
  sand: 'ui.color.sand',
  rose: 'ui.color.rose',
  black: 'ui.color.black',
};

type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  /**
   * The colour the card or account was saved with. One from before this palette is offered first,
   * so it shows as chosen and can be chosen again after another is tried.
   */
  saved?: string | null;
};

/**
 * A card face colour, one row of swatches. The cells share the row, so it never wraps; each is
 * 44pt tall, the touch floor, whatever the swatch's size.
 */
export function ColorPicker({ value, onChange, saved }: ColorPickerProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  const ring = scheme === 'dark' ? colors.ink : colors.control;
  const legacy =
    saved && !FACE_COLORS.some((option) => option.value.toUpperCase() === saved.toUpperCase())
      ? saved
      : null;
  const options = [...(legacy ? [{ id: 'current' as const, value: legacy }] : []), ...FACE_COLORS];

  return (
    <View accessibilityRole="radiogroup" className="w-full flex-row">
      {options.map((option) => {
        // Read out before the style: Reanimated's Babel plugin takes `x.value` in a style for a
        // shared value.
        const hex: string = option.value;
        const selected = hex.toUpperCase() === value.toUpperCase();
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={t(
              option.id === 'current' ? 'ui.color.current' : COLOR_NAME[option.id],
            )}
            onPress={() => {
              selection();
              onChange(hex);
            }}
            className="h-[44px] min-w-0 flex-1 items-center justify-center active:opacity-80"
          >
            <View
              style={{ borderColor: selected ? ring : 'transparent' }}
              className="h-[34px] w-[34px] items-center justify-center rounded-full border-2"
            >
              <View
                style={{
                  backgroundColor: hex,
                  // A swatch the colour of the page (black in dark mode) keeps an edge.
                  borderWidth: contrast(hex, colors.surface) < 1.5 ? 1 : 0,
                  borderColor: colors.line,
                }}
                className="h-[28px] w-[28px] rounded-full"
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
