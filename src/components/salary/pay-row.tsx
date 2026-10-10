import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type PayRowProps = {
  label: string;
  /** A small line under the label, such as the next payday. */
  note?: string;
  /** What is chosen, in words; VoiceOver reads it as the row's value. */
  value: string;
  /** Muted, for a row with nothing chosen yet. */
  empty?: boolean;
  /** Drawn before the value, such as an account's colour. */
  leading?: ReactNode;
  icon: LucideIcon;
  onPress: () => void;
  hint?: string;
  /** Set for a row that opens its control under itself, so VoiceOver says whether it is open. */
  expanded?: boolean;
  /** The last row of the card draws no line under itself. */
  last?: boolean;
  /** The row's own control while it is open, or a line about it. */
  children?: ReactNode;
};

/**
 * One line of a salary source: a label on the left and what is chosen on the right. The two share
 * the line while they fit; at a larger text size the value wraps under the label, whole, rather than
 * squeezing either. Anything the row opens sits inside its line, above the divider.
 */
export function PayRow({
  label,
  note,
  value,
  empty = false,
  leading,
  icon: Icon,
  onPress,
  hint,
  expanded,
  last = false,
  children,
}: PayRowProps) {
  const colors = useColors();
  return (
    <View className={cn('w-full', !last && 'border-b border-line')}>
      <Pressable
        accessibilityRole="button"
        // The note is read with the label: VoiceOver reads a button as one element, not its parts.
        accessibilityLabel={note ? `${label}, ${note}` : label}
        accessibilityValue={{ text: value }}
        accessibilityHint={hint}
        accessibilityState={expanded === undefined ? undefined : { expanded }}
        onPress={onPress}
        className="min-h-[56px] w-full flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 active:opacity-70"
      >
        <View className="max-w-full shrink">
          <Text className="font-app text-[14px] text-body" maxFontSizeMultiplier={TEXT_CAP.row}>
            {label}
          </Text>
          {note ? (
            <Text
              className="mt-0.5 font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {note}
            </Text>
          ) : null}
        </View>

        <View className="max-w-full shrink flex-row items-center gap-2">
          {leading}
          <Text
            className={cn(
              'shrink text-[15px]',
              empty ? 'font-app text-muted' : 'font-app-semibold text-ink',
            )}
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {value}
          </Text>
          <Icon size={16} color={colors.muted} strokeWidth={2} />
        </View>
      </Pressable>
      {children}
    </View>
  );
}
