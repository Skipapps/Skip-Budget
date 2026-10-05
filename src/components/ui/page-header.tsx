import type { LucideIcon } from 'lucide-react-native';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';

export type HeaderActionProps = {
  icon: LucideIcon;
  /** Read aloud, since the button is only a glyph: "Add bill", "Scan". */
  label: string;
  onPress: () => void;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
};

const ACTION_SIZE = 40;
const ACTION_GAP = 8;
/** The 44pt floor every tappable thing in the app is held to. */
const MIN_SIDE = 44;

/**
 * Every page's top line: back on the left, the name in the centre, actions on the right.
 *
 * Both sides take the width of the wider one, so the name sits on the true centre of the screen.
 * The name is one line; a long one steps its size down rather than wrapping.
 */
export function PageHeader({
  title,
  left,
  actions = [],
  right,
  titleRef,
}: {
  title?: string;
  /** Usually the back chevron; empty on a tab. */
  left?: ReactNode;
  actions?: HeaderActionProps[];
  /** A control of a page's own in place of `actions`, 44pt wide. */
  right?: ReactNode;
  titleRef?: RefObject<ComponentRef<typeof Text> | null>;
}) {
  const side = Math.max(
    MIN_SIDE,
    actions.length * ACTION_SIZE + Math.max(0, actions.length - 1) * ACTION_GAP,
  );

  return (
    <View className="h-[52px] w-full flex-row items-center">
      <View style={{ width: side }} className="flex-row items-center justify-start">
        {left}
      </View>

      <Text
        ref={titleRef}
        accessibilityRole="header"
        className="flex-1 px-2 text-center font-poppins-bold text-[20px] text-ink"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
      >
        {title}
      </Text>

      <View style={{ width: side, gap: ACTION_GAP }} className="flex-row items-center justify-end">
        {right ?? actions.map((action) => <HeaderAction key={action.label} {...action} />)}
      </View>
    </View>
  );
}

export function HeaderAction({
  icon: Icon,
  label,
  onPress,
  hint,
  disabled = false,
  busy = false,
}: HeaderActionProps) {
  const colors = useColors();
  const inert = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inert, busy }}
      onPress={withTap(onPress)}
      disabled={inert}
      // 40pt drawn, 44pt to the finger.
      hitSlop={2}
      style={{
        width: ACTION_SIZE,
        height: ACTION_SIZE,
        opacity: disabled && !busy ? 0.5 : 1,
      }}
      className="items-center justify-center rounded-full bg-accent/10 active:bg-accent/20"
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.accentInk} />
      ) : (
        <Icon size={20} color={colors.accentInk} strokeWidth={1.9} />
      )}
    </Pressable>
  );
}
