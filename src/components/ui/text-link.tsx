import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';

type TextLinkVariant = 'default' | 'subtle';

type TextLinkProps = {
  label: string;
  onPress: () => void;
  /** `subtle` is smaller and muted, for secondary links like "Forgot password?". */
  variant?: TextLinkVariant;
  className?: string;
};

const text: Record<TextLinkVariant, string> = {
  default: 'font-poppins-medium text-[17px] text-ink',
  subtle: 'font-poppins text-[14px] text-muted',
};

/** Low-emphasis action rendered as plain tappable text. */
export function TextLink({ label, onPress, variant = 'default', className }: TextLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn('items-center py-3 active:opacity-60', className)}
    >
      <Text className={text[variant]} maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
    </Pressable>
  );
}
