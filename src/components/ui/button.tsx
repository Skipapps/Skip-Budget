import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FitText } from '@/components/ui/fit-group';
import { withTap } from '@/lib/press';
import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

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
  /**
   * Joins the surrounding FitGroup with the label measured on one line, so the owner of a pair can
   * stack it rather than let the label wrap. Unique within the group.
   */
  fitId?: string;
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
  fitId,
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
      {fitId ? (
        <FitText
          id={fitId}
          whole
          role="row"
          size={17}
          className={cn('text-center font-app-medium', label[variant])}
          slotClassName="min-w-0 flex-1"
        >
          {labelText}
        </FitText>
      ) : (
        // Wraps between words and the pill grows, rather than shrinking one label away from the rest.
        <Text
          className={cn('shrink text-center font-app-medium text-[17px]', label[variant])}
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {labelText}
        </Text>
      )}
    </Pressable>
  );
}
