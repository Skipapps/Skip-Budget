import type { LucideIcon } from 'lucide-react-native';
import { useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

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
/** The line's least height (min-h-[52px]), which a one-line name sits centred in. */
const ROW_HEIGHT = 52;
/**
 * How far a subtitle tucks up into the room under a one-line name, so the two read as one block
 * rather than two lines a row apart.
 */
const SUBTITLE_TUCK = 10;

/**
 * Every page's top line: back on the left, the name in the centre, actions on the right.
 *
 * Both sides take the width of the wider one, so the name sits on the true centre of the screen.
 * A long name wraps between words and the line grows; only a single word too wide for the room
 * steps the size down.
 */
export function PageHeader({
  title,
  subtitle,
  left,
  actions = [],
  right,
  titleRef,
}: {
  title?: string;
  /** A muted line centred under the name. */
  subtitle?: string;
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
  const name = useFitGroup({ mode: 'shrink' });
  // A name that wraps fills the line, leaving no room under it to tuck into.
  const [tall, setTall] = useState(false);

  const line = (
    <FitGroup group={name} className="min-h-[52px] w-full flex-row items-center">
      <View style={{ width: side }} className="flex-row items-center justify-start">
        {left}
      </View>

      <FitText
        id="page-title"
        role="heading"
        size={20}
        className="text-center font-app-bold text-ink"
        slotClassName="mx-2 min-w-0 flex-1"
        accessibilityRole="header"
        textRef={titleRef}
      >
        {title ?? ''}
      </FitText>

      <View style={{ width: side, gap: ACTION_GAP }} className="flex-row items-center justify-end">
        {right ?? actions.map((action) => <HeaderAction key={action.label} {...action} />)}
      </View>
    </FitGroup>
  );
  if (!subtitle) return line;

  return (
    <View className="w-full">
      <View
        testID="page-header-line"
        onLayout={(event) => setTall(event.nativeEvent.layout.height > ROW_HEIGHT + 0.5)}
      >
        {line}
      </View>
      <Text
        className="w-full text-center font-app text-[14px] leading-[20px] text-muted"
        style={{ marginTop: tall ? 0 : -SUBTITLE_TUCK }}
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function HeaderAction({
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
      className="items-center justify-center rounded-full bg-tint active:opacity-70"
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.tintInk} />
      ) : (
        <Icon size={20} color={colors.tintInk} strokeWidth={1.9} />
      )}
    </Pressable>
  );
}
