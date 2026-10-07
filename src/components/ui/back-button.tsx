import { router } from 'expo-router';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { t } from '@/i18n';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';

type BackButtonProps = {
  onPress?: () => void;
  /** The stepped flows say "Back": there it steps back, not out. */
  accessibilityLabel?: string;
};

/**
 * Pops the stack, unless there is none: a screen opened cold from a deep link is the only entry, and
 * back() there is a dead button (and a red box in development). Falls back to home.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

/** Top-left chevron, a 44pt touch target (Apple's minimum). */
export function BackButton({ onPress, accessibilityLabel }: BackButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t('ui.goBack')}
      hitSlop={8}
      onPress={withTap(onPress ?? goBack)}
      // Pulled 8pt left so the chevron's stroke, not its touch box, lines up with the page edge.
      className="-ml-2 h-[44px] w-[44px] items-center justify-center rounded-full active:bg-ink/5"
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
