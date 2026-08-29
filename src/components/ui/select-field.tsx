import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { FieldLabel } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type SelectFieldProps = {
  label: string;
  /** Formatted value, or empty to show the placeholder. */
  value: string;
  placeholder?: string;
  onPress: () => void;
  icon?: LucideIcon;
  /** When set, the icon becomes its own control instead of part of the row. */
  onIconPress?: () => void;
  iconAccessibilityLabel?: string;
  className?: string;
};

/**
 * Looks like a TextField but opens a picker instead of the keyboard. Used where
 * free typing is worse than choosing — dates and money.
 */
export function SelectField({
  label,
  value,
  placeholder,
  onPress,
  icon: Icon,
  onIconPress,
  iconAccessibilityLabel,
  className,
}: SelectFieldProps) {
  const colors = useColors();
  return (
    <View className={cn('w-full', className)}>
      <FieldLabel className="mb-2">{label}</FieldLabel>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${value || placeholder || 'Not set'}`}
        onPress={onPress}
        className="min-h-14 w-full flex-row items-center justify-between rounded-[10px] border border-line px-5 active:bg-ink/5"
      >
        <Text
          className={cn('flex-1 py-4 font-poppins text-[16px]', value ? 'text-ink' : 'text-muted')}
          numberOfLines={1}
          maxFontSizeMultiplier={1.5}
        >
          {value || placeholder}
        </Text>
        {Icon ? (
          onIconPress ? (
            // Nested Pressable: the icon opens its own tool rather than the row's.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={iconAccessibilityLabel ?? label}
              hitSlop={10}
              onPress={onIconPress}
              className="-mr-1 h-10 w-10 items-center justify-center rounded-[8px] active:bg-ink/10"
            >
              <Icon size={20} color={colors.ink} strokeWidth={1.8} />
            </Pressable>
          ) : (
            <Icon size={20} color={colors.muted} strokeWidth={1.8} />
          )
        ) : null}
      </Pressable>
    </View>
  );
}
