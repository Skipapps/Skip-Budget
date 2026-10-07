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
  /** `field` is the bordered box matching a TextField; `pill` is the tonal round-ended one used in the stepped add flows. */
  variant?: 'field' | 'pill';
  className?: string;
};

/** Looks like a TextField but opens a picker instead of the keyboard. */
export function SelectField({
  label,
  value,
  placeholder,
  onPress,
  icon: Icon,
  onIconPress,
  iconAccessibilityLabel,
  variant = 'field',
  className,
}: SelectFieldProps) {
  const colors = useColors();
  const pill = variant === 'pill';

  return (
    <View className={cn('w-full', className)}>
      <FieldLabel className="mb-2">{label}</FieldLabel>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${value || placeholder || 'Not set'}`}
        onPress={onPress}
        className={cn(
          'min-h-14 w-full flex-row items-center justify-between px-5',
          pill
            ? 'rounded-full bg-ink/5 active:bg-ink/10'
            : 'rounded-[12px] border border-line active:bg-ink/5',
        )}
      >
        <Text
          className={cn('flex-1 py-4 font-app text-[16px]', value ? 'text-ink' : 'text-muted')}
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
              className={cn(
                '-mr-1 h-10 w-10 items-center justify-center active:bg-ink/10',
                pill ? 'rounded-full' : 'rounded-[12px]',
              )}
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
