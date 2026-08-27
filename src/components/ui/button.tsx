import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

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
};

const container: Record<ButtonVariant, string> = {
  primary: 'bg-control active:bg-control-pressed',
  outline: 'border border-control bg-transparent active:bg-black/5',
};

const label: Record<ButtonVariant, string> = {
  primary: 'text-white',
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
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labelText}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className={cn(
        'min-h-16 w-full flex-row items-center justify-center rounded-[10px] px-5 py-4',
        container[variant],
        className,
      )}
    >
      {icon ? <View className="mr-3 shrink-0">{icon}</View> : null}
      <Text
        className={cn('shrink text-center font-poppins-medium text-[17px]', label[variant])}
        maxFontSizeMultiplier={1.5}
      >
        {labelText}
      </Text>
    </Pressable>
  );
}
