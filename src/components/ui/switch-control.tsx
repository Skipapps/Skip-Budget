import { Pressable, Switch, View } from 'react-native';

import { toggle as toggleFeedback } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';

type SwitchControlProps = {
  value: boolean;
  /** Called with the value the switch should take. Never with the current one. */
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  /** What the switch is for, said as a thing rather than as an action. */
  accessibilityLabel?: string;
};

/**
 * The app's switch: a press target that owns the tap, with the platform switch drawn inside it and
 * never touched directly.
 *
 * A bare `Switch` could be turned on by a tap but not off again: a `UISwitch` owns its own gestures
 * (tap on the track, drag on the thumb), and a touch it takes for the start of a drag and then loses
 * ends with no `onValueChange` at all. On a switch that is on, the thumb is where a finger aiming at
 * the middle lands. So the platform switch gets `pointerEvents="none"` and is only a picture of the
 * `value` prop: one press in, one `onValueChange(!value)` out, and a refused change (an app lock that
 * failed its scan) never moves. The trade is the thumb drag, which this does not support.
 *
 * Accessibility lives on the press target: one `switch` element, not two. VoiceOver's double-tap
 * runs `onPress`.
 */
export function SwitchControl({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: SwitchControlProps) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      // The control is 51×31; the press target is the 44pt Apple asks for.
      hitSlop={{ top: 7, bottom: 7, left: 8, right: 8 }}
      onPress={() => {
        toggleFeedback();
        onValueChange(!value);
      }}
    >
      {/* Neither a touch target nor an accessibility element: the press target above is both. */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Switch
          value={value}
          disabled={disabled}
          trackColor={{ false: colors.line, true: colors.control }}
          // The iOS platform thumb, white in both light and dark mode.
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.line}
        />
      </View>
    </Pressable>
  );
}
