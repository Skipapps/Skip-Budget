import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { withTap } from '@/lib/press';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'outline';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Optional leading icon, rendered to the left of the label. */
  icon?: ReactNode;
  /** `primary` is the filled dark pill; `outline` is bordered with no fill. */
  variant?: ButtonVariant;
  className?: string;
  accessibilityHint?: string;
  /**
   * Refuses the press and dims the pill. For work already in flight — a second
   * tap on "Send" is a second email, and a label that says "Sending…" while
   * still accepting presses invites exactly that.
   */
  disabled?: boolean;
};

const container: Record<ButtonVariant, string> = {
  primary: 'bg-control active:bg-control-pressed',
  outline: 'border border-control bg-transparent active:bg-ink/5',
};

const label: Record<ButtonVariant, string> = {
  primary: 'text-on-control',
  outline: 'text-ink',
};

/**
 * Full-width pill action.
 *
 * Uses a minimum height rather than a fixed one, so the button grows instead of
 * clipping when the label wraps at large text sizes or on a narrow screen.
 */
export function Button({
  label: labelText,
  onPress,
  icon,
  variant = 'primary',
  className,
  accessibilityHint,
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labelText}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={withTap(onPress)}
      className={cn(
        'min-h-16 w-full flex-row items-center justify-center rounded-[10px] px-5 py-4',
        container[variant],
        disabled && 'opacity-50',
        className,
      )}
    >
      {icon ? <View className="mr-3 shrink-0">{icon}</View> : null}
      {/* One line, always. Two of these sit side by side on a group screen,
          and a label that wraps there makes the pair different heights on a
          narrow phone. Shrinking the type is the better trade. */}
      <Text
        className={cn('shrink text-center font-poppins-medium text-[17px]', label[variant])}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.5}
      >
        {labelText}
      </Text>
    </Pressable>
  );
}
