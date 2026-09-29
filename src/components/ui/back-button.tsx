import { router } from 'expo-router';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';

type BackButtonProps = {
  /** Defaults to popping the navigation stack. */
  onPress?: () => void;
};

/**
 * Pops the stack — unless there is no stack. A screen opened cold from a
 * deep link is the first and only entry, and back() from there is a dead
 * button (and a red box in development). Home is where every such link's
 * screen hangs off, so that is where its chevron leads.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

/** Top-left chevron. Sized to a 44pt touch target per Apple's minimum. */
export function BackButton({ onPress }: BackButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      onPress={withTap(onPress ?? goBack)}
      className="-ml-2 h-11 w-11 items-center justify-center rounded-[12px] active:bg-ink/5"
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
