import { type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { PageHeader, type HeaderActionProps } from '@/components/ui/page-header';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

type ScreenProps = {
  children: ReactNode;
  /** Extra classes for the inner content column. */
  className?: string;
  /**
   * Scrolls when content is taller than the viewport. On by default: onboarding copy overflows short
   * screens, and large Dynamic Type can overflow any of them.
   */
  scrollable?: boolean;
  /** Shows a back chevron pinned above the content. Off on entry screens. */
  showBack?: boolean;
  /**
   * The page's name, centred on the back chevron's line. Pages give it here, not as a heading in
   * their content, so every page's top row is the same height.
   */
  title?: string;
  headerActions?: HeaderActionProps[];
  /**
   * A header of the screen's own, pinned in the back chevron's place (the add flows' back, title,
   * close and step dots). Takes the chevron's place when both are given.
   */
  header?: ReactNode;
  /** Scrolls the focused input clear of the keyboard. Turn on for screens with inputs. */
  avoidKeyboard?: boolean;
  /** Overlay pinned bottom-right, above the scroll area (e.g. a FAB). */
  floating?: ReactNode;
  /**
   * Pinned below the scroll area, always on screen, for the one action a page exists to offer:
   * overflowing content scrolls above it instead of hiding it below the fold.
   */
  footer?: ReactNode;
  /** Enables pull-to-refresh. Omit on screens with nothing to re-fetch. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

/**
 * Page shell: background, safe-area insets, consistent gutter, and a max-width column so content
 * stays readable on a tablet. Every screen renders inside one.
 */
export function Screen({
  children,
  className,
  scrollable = true,
  showBack = false,
  title,
  headerActions,
  header,
  avoidKeyboard = false,
  floating,
  footer,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const colors = useColors();
  const column = (
    <View className={cn('w-full max-w-[520px] flex-1 px-6', className)}>{children}</View>
  );

  const scrollProps = {
    contentContainerStyle: { flexGrow: 1, alignItems: 'center' as const, paddingBottom: 16 },
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
    // Only a screen with onRefresh gets the gesture, not a spinner that would resolve into nothing.
    refreshControl: onRefresh ? (
      // Muted from the live theme: a fixed grey disappears on the dark surface.
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.muted} />
    ) : undefined,
  };

  // Plain padding-based avoidance cannot clear fields low on the page; this scrolls the focused input clear.
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
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      {header || title || showBack ? (
        // Outside the scroll view so it stays put while content scrolls under it.
        <View className="w-full items-center">
          <View className="w-full max-w-[520px] px-6 pt-1">
            {/* The same row with or without a name, so the chevron never moves between loading and loaded. */}
            {header ?? (
              <PageHeader
                title={title}
                left={showBack ? <BackButton /> : null}
                actions={headerActions}
              />
            )}
          </View>
        </View>
      ) : null}

      {body}

      {footer ? (
        // Below the scroll view, not over it, so nothing renders underneath the action; same column as the content.
        <View className="w-full items-center">
          <View className="w-full max-w-[520px] px-6 pb-2 pt-3">{footer}</View>
        </View>
      ) : null}

      {floating ? (
        // Clear of the home indicator rather than flush with the safe-area edge.
        <View className="absolute bottom-10 right-5" pointerEvents="box-none">
          {floating}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
