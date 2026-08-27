import { router } from 'expo-router';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/colors';

type BackButtonProps = {
  /** Defaults to popping the navigation stack. */
  onPress?: () => void;
};

/** Top-left chevron. Sized to a 44pt touch target per Apple's minimum. */
export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      onPress={onPress ?? (() => router.back())}
      className="-ml-2 h-11 w-11 items-center justify-center rounded-[10px] active:bg-black/5"
    >
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 19L8 12l7-7"
          stroke={colors.ink}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}
