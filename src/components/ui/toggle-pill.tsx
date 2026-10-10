import { Pressable, Text, View } from 'react-native';

import { selection } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

type ToggleOption<T extends string> = {
  value: T;
  label: string;
};

type TogglePillProps<T extends string> = {
  options: readonly ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `fill` lights the chosen half in the control colour; `segment` lifts it as a card on a tint. */
  tone?: 'fill' | 'segment';
};

/**
 * "One of exactly two" as one joined track, e.g. AM/PM. Longer or open-ended option sets belong in
 * `ChoiceChips`.
 *
 * No fit group: the labels are short enough that both halves hold them at the control ceiling (the
 * widest, Spanish "p. m.", needs 45pt of the 68pt a half of the time picker's track gives it), so
 * the two already share one size. A longer label wraps inside its half rather than being cut.
 */
export function TogglePill<T extends string>({
  options,
  value,
  onChange,
  tone = 'fill',
}: TogglePillProps<T>) {
  const segment = tone === 'segment';
  return (
    <View
      accessibilityRole="radiogroup"
      className={cn(
        'w-full flex-row bg-ink/5',
        segment ? 'gap-[4px] rounded-[12px] p-[4px]' : 'rounded-full',
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, checked: selected }}
            // 40pt plus the track's own 4pt each side clears the 44pt target floor.
            hitSlop={segment ? { top: 4, bottom: 4 } : undefined}
            onPress={() => {
              selection();
              onChange(option.value);
            }}
            className={cn(
              'flex-1 items-center justify-center px-3 py-1.5',
              segment ? 'min-h-10 rounded-[9px] border' : 'min-h-11 rounded-full',
              segment
                ? // The border stays on both halves, so choosing one never shifts the labels.
                  selected
                  ? 'border-line bg-card'
                  : 'border-transparent active:bg-ink/5'
                : selected
                  ? 'bg-control'
                  : 'active:bg-ink/5',
            )}
          >
            <Text
              className={cn(
                'text-center text-[14px]',
                selected
                  ? segment
                    ? 'font-app-semibold text-ink'
                    : 'font-app-medium text-on-control'
                  : segment
                    ? 'font-app text-muted'
                    : 'font-app text-body',
              )}
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
