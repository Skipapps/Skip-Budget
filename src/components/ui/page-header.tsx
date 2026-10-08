import type { LucideIcon } from 'lucide-react-native';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { ActivityIndicator, Pressable, View, type Text } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
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
 * A long name wraps between words and the line grows; only a single word too wide for the room
 * steps the size down.
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
  const name = useFitGroup({ mode: 'shrink' });

  return (
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
