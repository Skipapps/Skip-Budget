import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';

type TextLinkVariant = 'default' | 'subtle';

type TextLinkProps = {
  label: string;
  onPress: () => void;
  /** `subtle` is smaller and muted, for secondary links like "Forgot password?". */
  variant?: TextLinkVariant;
  /**
   * Draws the rule under the label. Off by default, since most links sit alone where position says
   * they are tappable. On where a link must read as one among other muted type, e.g. a paywall's
   * Terms and Privacy (App Store review looks for them).
   */
  underline?: boolean;
  className?: string;
  /** What VoiceOver adds after the label, for a link whose words alone do not say where it goes. */
  accessibilityHint?: string;
};

const text: Record<TextLinkVariant, string> = {
  default: 'font-app-medium text-[17px] text-ink',
  subtle: 'font-app text-[14px] text-muted',
};

export function TextLink({
  label,
  onPress,
  variant = 'default',
  underline = false,
  className,
  accessibilityHint,
}: TextLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className={cn('items-center py-3 active:opacity-60', className)}
    >
      <Text className={cn(text[variant], underline && 'underline')} maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
    </Pressable>
  );
}
