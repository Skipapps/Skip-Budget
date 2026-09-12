import { useRef, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';

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
  /** Enables pull-to-refresh. Omit on screens with nothing to re-fetch. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /**
   * Opens the page at the bottom instead of the top, once.
   *
   * Dated lists run oldest-first, so the newest rows — the ones somebody came
   * to see — sit below the fold. Pass `true` only when the real content is on
   * screen (not while a skeleton is up), and the page jumps to the end on the
   * first layout that follows. It happens at most once per mount, so filtering,
   * refreshing or loading more never yanks the page out from under a thumb.
   */
  startAtEnd?: boolean;
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
  onRefresh,
  refreshing = false,
  startAtEnd = false,
}: ScreenProps) {
  const colors = useColors();
  const column = (
    <View className={cn('w-full max-w-[520px] flex-1 px-6', className)}>{children}</View>
  );

  // Held as a callback ref because the two scroll views have different ref
  // types; both expose the ScrollView methods, and only one is ever mounted.
  const scroller = useRef<ScrollView | null>(null);
  const jumped = useRef(false);

  const scrollProps = {
    contentContainerStyle: { flexGrow: 1, alignItems: 'center' as const, paddingBottom: 16 },
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    // Scrolling a page with the keyboard up should put it away.
    keyboardDismissMode: 'on-drag' as const,
    // Only a screen that says how to refresh gets the gesture; the rest keep
    // the plain bounce rather than a spinner that would resolve into nothing.
    refreshControl: onRefresh ? (
      // Muted from the live theme, not a fixed grey: the hardcoded one
      // disappeared into the dark surface it was spinning on.
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.muted} />
    ) : undefined,
    // Fires after the content has been measured, which is the only moment the
    // end is a real offset. Unanimated: a page that scrolls itself on open
    // looks like a gesture nobody made.
    onContentSizeChange: (_width: number, height: number) => {
      if (!startAtEnd || jumped.current || height <= 0) return;
      // `KeyboardAwareScrollView` hands back a stand-in with only its own
      // method until the inner ScrollView has mounted, so the jump is spent
      // only once there is something that can actually perform it.
      const node = scroller.current;
      if (typeof node?.scrollToEnd !== 'function') return;
      jumped.current = true;
      node.scrollToEnd({ animated: false });
    },
  };

  // KeyboardAwareScrollView scrolls the focused input clear of the keyboard,
  // which plain padding-based avoidance cannot do for fields low on the page.
  const body = avoidKeyboard ? (
    <KeyboardAwareScrollView
      {...scrollProps}
      bottomOffset={72}
      ref={(node) => {
        scroller.current = node;
      }}
    >
      {column}
    </KeyboardAwareScrollView>
  ) : scrollable ? (
    <ScrollView
      {...scrollProps}
      ref={(node) => {
        scroller.current = node;
      }}
    >
      {column}
    </ScrollView>
  ) : (
    <View className="flex-1 items-center">{column}</View>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
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
