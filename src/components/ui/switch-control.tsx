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
 * The app's switch: a press target that owns the tap, with the platform switch
 * drawn inside it and never touched directly.
 *
 * Why it is not a bare `Switch`. Settings shipped switches that could be turned
 * on with a tap and not turned off again — the same on two different stores,
 * and a horizontal swipe did work. The JavaScript is not where that happens:
 * `settings-row.test.tsx` shows one change event producing exactly one call
 * carrying `false`, and the value following it. What is left is the platform
 * control. A `UISwitch` owns its own gestures — a tap on the track, a drag on
 * the thumb — and only reports once it has decided which one finished; a touch
 * it takes for the start of a drag and then loses ends with the switch
 * unchanged and no `onValueChange` at all. On a switch that is on, the thumb is
 * exactly where a finger aiming at the middle lands.
 *
 * So the touch is taken one level up, where it is a plain press, and the
 * switch becomes a picture of the value: `pointerEvents="none"` means it never
 * sees a finger, and the only way its value can change is the `value` prop
 * coming back down. One press in, one `onValueChange(!value)` out, and what is
 * drawn is always what the app believes — a refused change (an app lock that
 * failed its scan) simply never moves, instead of flicking over and snapping
 * back.
 *
 * That makes the behaviour ours, and testable, whichever gesture recogniser was
 * really at fault. The trade is the thumb drag, which iOS supports and this
 * does not: a tap is the gesture people use, and a tap is the one that broke.
 *
 * Accessibility is on the press target for the same reason: one element with
 * the `switch` role and a checked state, rather than two. VoiceOver's
 * double-tap runs `onPress`, so it toggles like any other row.
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
        // A switch is a press too, and a firmer one: it changed something
        // rather than opening something.
        toggleFeedback();
        onValueChange(!value);
      }}
    >
      {/* Never a touch target and never an accessibility element: the press
          target above is both, so VoiceOver finds one switch, not two. */}
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
