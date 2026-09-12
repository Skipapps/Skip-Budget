import { Plus, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { withTap } from '@/lib/press';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type ActionPillProps = {
  label: string;
  onPress: () => void;
  /** Defaults to a plus, which is what almost every one of these does. */
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
};

/**
 * The "+ New card" / "+ Add bill" header action, shared across list pages.
 *
 * Tonal fill, no border — the same anatomy as a chip, so "act" and "choose"
 * differ by weight and position rather than by shape.
 */
export function ActionPill({
  label,
  onPress,
  icon: Icon = Plus,
  disabled,
  className,
}: ActionPillProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={withTap(onPress)}
      disabled={disabled}
      style={disabled ? { opacity: 0.5 } : undefined}
      // The pill is 40pt tall by design; the touch target is the 44pt floor.
      hitSlop={{ top: 4, bottom: 4 }}
      className={cn(
        'min-h-10 flex-row items-center gap-1.5 rounded-full bg-ink/5 pl-3.5 pr-4 active:bg-ink/10',
        className,
      )}
    >
      <Icon size={18} color={colors.ink} strokeWidth={1.8} />
      <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}
