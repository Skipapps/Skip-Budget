import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { withTap } from '@/lib/press';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'outline';

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  accessibilityHint?: string;
  /** Refuses the press and dims the pill, for work in flight: a second tap on "Send" is a second email. */
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

/** Full-width pill action. Minimum height, not fixed, so it grows with large text sizes instead of clipping. */
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
        'min-h-16 w-full flex-row items-center justify-center rounded-full px-5 py-4',
        container[variant],
        disabled && 'opacity-50',
        className,
      )}
    >
      {icon ? <View className="mr-3 shrink-0">{icon}</View> : null}
      {/* One line, always: two buttons side by side would differ in height if one wrapped, so the type shrinks. */}
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
