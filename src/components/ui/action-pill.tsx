import { Plus, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { withTap } from '@/lib/press';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type ActionPillProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
};

/** The "+ New card" / "+ Add bill" header action, shared across list pages. */
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
        'min-h-10 max-w-full flex-row items-center gap-1.5 rounded-full bg-ink/5 py-2 pl-3.5 pr-4 active:bg-ink/10',
        className,
      )}
    >
      <Icon size={18} color={colors.ink} strokeWidth={1.8} />
      <Text
        className="shrink font-app-medium text-[14px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {label}
      </Text>
    </Pressable>
  );
}
