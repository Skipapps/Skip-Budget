import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { cn } from '@/lib/cn';

type ScreenProps = {
  children: ReactNode;
  /** Extra classes for the inner content column. */
  className?: string;
  /**
   * Scrolls when content is taller than the viewport. On by default: onboarding
   * copy overflows short screens, and large Dynamic Type can overflow any of them.
   */
  scrollable?: boolean;
  /** Shows a back chevron pinned above the content. Off on entry screens. */
  showBack?: boolean;
  /** Scrolls the focused input clear of the keyboard. Turn on for screens with inputs. */
  avoidKeyboard?: boolean;
  /** Overlay pinned bottom-right, above the scroll area (e.g. a FAB). */
  floating?: ReactNode;
};

/**
 * Page shell: white background, safe-area insets, consistent gutter, and a
 * max-width column so content stays readable instead of stretching across a
 * tablet. Every screen renders inside one so layout never drifts per page.
 */
export function Screen({
  children,
  className,
  scrollable = true,
  showBack = false,
  avoidKeyboard = false,
  floating,
}: ScreenProps) {
  const column = (
    <View className={cn('w-full max-w-[520px] flex-1 px-6', className)}>{children}</View>
  );

  const scrollProps = {
    contentContainerStyle: { flexGrow: 1, alignItems: 'center' as const, paddingBottom: 16 },
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    // Scrolling a page with the keyboard up should put it away.
    keyboardDismissMode: 'on-drag' as const,
  };

  // KeyboardAwareScrollView scrolls the focused input clear of the keyboard,
  // which plain padding-based avoidance cannot do for fields low on the page.
  const body = avoidKeyboard ? (
    <KeyboardAwareScrollView {...scrollProps} bottomOffset={72}>
      {column}
    </KeyboardAwareScrollView>
  ) : scrollable ? (
    <ScrollView {...scrollProps}>{column}</ScrollView>
  ) : (
    <View className="flex-1 items-center">{column}</View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {showBack ? (
        // Outside the scroll view so it stays put while content scrolls under it.
        <View className="w-full items-center">
          <View className="w-full max-w-[520px] px-6 pt-1">
            <BackButton />
          </View>
        </View>
      ) : null}

      {body}

      {floating ? (
        <View className="absolute bottom-5 right-5" pointerEvents="box-none">
          {floating}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
