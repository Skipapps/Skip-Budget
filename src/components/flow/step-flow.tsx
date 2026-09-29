import { Stack, useFocusEffect } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, BackHandler, Pressable, Text, View } from 'react-native';

import { goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { cn } from '@/lib/cn';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';

type StepFlowProps = {
  title: string;
  /**
   * What the close button asks before it throws the flow away — "Cancel
   * adding this bill?", "Cancel editing this receipt?".
   */
  closePrompt: string;
  /** How many dots. One per step. */
  steps: number;
  /** Zero-based. */
  current: number;
  /** Step 0 goes back out of the flow; any other step goes back one step. */
  onBack: () => void;
  /** The muted line the step opens with, e.g. "How much did you spend?". */
  question?: string;
  /** Sits between the dots and the question — the receipt scan pills live here. */
  headerSlot?: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  /** Save failures and the like, above the button. */
  error?: string | null;
  /** Extra action under the primary button — the Delete row when editing. */
  footerSlot?: ReactNode;
  /**
   * On by default, including the keypad step. The pad's own type never scales,
   * so the step normally fits exactly and does not scroll — but the question
   * line above it does scale, and on a 4.7" screen at the largest type that is
   * the difference between a Continue button you can reach and one clipped off
   * the bottom. A page that bounces is a smaller price than a page that hides
   * its only action.
   */
  scrollable?: boolean;
  avoidKeyboard?: boolean;
  children: ReactNode;
};

/**
 * The shell every stepped add flow wears.
 *
 * Chrome only: it holds no form state, knows no mutation and takes the current
 * step as a prop. The steps are views over one piece of state held by the
 * screen, never separate routes — which is what lets Back keep everything
 * typed so far instead of unwinding it.
 */
export function StepFlow({
  title,
  closePrompt,
  steps,
  current,
  onBack,
  question,
  headerSlot,
  primaryLabel,
  primaryDisabled = false,
  onPrimary,
  error,
  footerSlot,
  scrollable = true,
  avoidKeyboard = false,
  children,
}: StepFlowProps) {
  const questionRef = useRef<ComponentRef<typeof Text>>(null);
  const titleRef = useRef<ComponentRef<typeof Text>>(null);

  // On a step change VoiceOver would otherwise keep focus where the Continue
  // button used to be — on a control that has just been replaced. Moving it to
  // the question means the step announces what it is asking for; a step with
  // no question line (the details steps, which have the most to announce)
  // falls back to the title so focus still leaves the old button.
  //
  // `sendAccessibilityEvent`, not `setAccessibilityFocus`: the latter is
  // deprecated and routes through the pre-Fabric renderer, so with the New
  // Architecture on it moves nothing at all.
  useEffect(() => {
    const target = questionRef.current ?? titleRef.current;
    if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
  }, [current, question]);

  // The steps are views over one piece of state, so leaving the route throws
  // away everything typed so far. On any step but the first the edge swipe is
  // turned off and the hardware back steps back instead — both of them then
  // mean what the chevron beside them means.
  const screenOptions = useMemo(() => ({ gestureEnabled: current === 0 }), [current]);

  // Read through a ref so a screen passing an inline arrow — all of them do —
  // does not resubscribe the listener on every keystroke.
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (current === 0) return false;
        onBackRef.current();
        return true;
      });
      return () => subscription.remove();
    }, [current]),
  );

  return (
    <Screen
      scrollable={scrollable}
      avoidKeyboard={avoidKeyboard}
      // Pinned: back, close and where you are stay put while a long step
      // scrolls under them, instead of leaving with the first swipe.
      header={
        <View className="w-full pb-2">
          <FlowHeader title={title} onBack={onBack} closePrompt={closePrompt} titleRef={titleRef} />
          <StepIndicator steps={steps} current={current} />
        </View>
      }
    >
      <Stack.Screen options={screenOptions} />

      {headerSlot ? <View className="mt-4 w-full">{headerSlot}</View> : null}

      {question ? (
        <Text
          ref={questionRef}
          accessibilityRole="header"
          className={cn(
            'w-full text-center font-poppins text-[20px] text-muted',
            headerSlot ? 'mt-8' : 'mt-6',
          )}
          numberOfLines={2}
          maxFontSizeMultiplier={1.3}
        >
          {question}
        </Text>
      ) : null}

      <View className={cn('w-full flex-1', question ? 'mt-6' : 'mt-4')}>{children}</View>

      <View className="mt-8 w-full gap-3 pb-2">
        {error ? (
          <Text
            className="w-full text-center font-poppins text-[13px] text-danger"
            maxFontSizeMultiplier={1.4}
          >
            {error}
          </Text>
        ) : null}

        <Button label={primaryLabel} onPress={onPrimary} disabled={primaryDisabled} />
        {footerSlot}
      </View>
    </Screen>
  );
}

/**
 * Back on the left, close on the right, the flow's name between them.
 *
 * Back steps back; close leaves the whole flow, from any step, after asking —
 * everything typed so far is thrown away, and a stray tap in the corner should
 * not be able to do that. Exported for the screens that open a flow before
 * its steps begin, like the bill category chooser.
 */
export function FlowHeader({
  title,
  onBack,
  closePrompt,
  titleRef,
}: {
  title: string;
  onBack: () => void;
  closePrompt: string;
  titleRef?: RefObject<ComponentRef<typeof Text> | null>;
}) {
  const colors = useColors();
  const confirm = useConfirm();

  const close = async () => {
    const ok = await confirm({
      title: closePrompt,
      message: 'Nothing you have entered here will be saved.',
      confirmLabel: 'Yes',
      cancelLabel: 'Go back',
      destructive: true,
    });
    if (ok) goBack();
  };

  return (
    <View className="h-11 w-full justify-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        hitSlop={8}
        className="absolute left-0 z-10 h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
      >
        <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
      </Pressable>

      {/* The title is laid out over the whole header row, so without this
          it sits on top of the buttons and swallows every tap on them: a
          plain Text is still a hit target, and the buttons are its siblings
          rather than its children, so the tap reaches nothing. */}
      <Text
        ref={titleRef}
        pointerEvents="none"
        className="px-12 text-center font-poppins-semibold text-[17px] text-ink"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        accessibilityHint={closePrompt}
        onPress={() => void close()}
        hitSlop={8}
        className="absolute right-0 z-10 h-11 w-11 items-center justify-center rounded-full active:bg-ink/5"
      >
        <X size={22} color={colors.ink} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

/**
 * Where you are, as one wide pill among dots.
 *
 * Completed and upcoming steps look the same on purpose: the pill alone says
 * where you are, and two different inactive treatments is a code nobody reads.
 */
function StepIndicator({ steps, current }: { steps: number; current: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${steps}`}
      accessibilityValue={{ min: 1, max: steps, now: current + 1 }}
      className="mt-4 w-full flex-row items-center justify-center gap-2"
    >
      {Array.from({ length: steps }).map((_, index) => (
        <View
          key={index}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className={cn(
            'h-2.5 rounded-full',
            index === current ? 'w-10 bg-ink' : 'w-2.5 bg-ink/20',
          )}
        />
      ))}
    </View>
  );
}
