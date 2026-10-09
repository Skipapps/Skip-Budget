import { Stack, useFocusEffect } from 'expo-router';
import { X } from 'lucide-react-native';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, BackHandler, Pressable, Text, View } from 'react-native';

import { BackButton, goBack } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useConfirm } from '@/providers/dialog-provider';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type StepFlowProps = {
  title: string;
  /**
   * What the close button asks before it throws the flow away, e.g. "Cancel adding this bill?".
   * Without one there is no close button: a page that is one field of a larger form has nothing to
   * throw away that Back does not.
   */
  closePrompt?: string;
  /** One step or fewer draws no dots: a page on its own is not "step 1 of 1". */
  steps: number;
  /** Zero-based. */
  current: number;
  /** Step 0 goes back out of the flow; any other step goes back one step. */
  onBack: () => void;
  /**
   * The page the flow opened on: the edge swipe and hardware back leave the route only here.
   * Defaults to step 0; a second page within step 0 (a name, then an icon) passes false.
   */
  root?: boolean;
  /** The muted line the step opens with, e.g. "How much did you spend?". */
  question?: string;
  /** Sits between the dots and the question (the receipt scan pills). */
  headerSlot?: ReactNode;
  /** Omitted on a page where a tap is the answer (a category grid): there is no button. */
  primaryLabel?: string;
  primaryDisabled?: boolean;
  onPrimary?: () => void;
  error?: string | null;
  /** Extra action under the primary button, e.g. the Delete row when editing. */
  footerSlot?: ReactNode;
  /**
   * On by default, including the keypad step: the question line scales with type size, and on a 4.7"
   * screen at the largest type a non-scrolling step clips the Continue button off the bottom.
   */
  scrollable?: boolean;
  avoidKeyboard?: boolean;
  children: ReactNode;
};

/**
 * The shell every stepped add flow wears. Chrome only: no form state, no mutation. Steps are views
 * over one piece of state held by the screen, never separate routes, so Back keeps everything typed.
 */
export function StepFlow({
  title,
  closePrompt,
  steps,
  current,
  onBack,
  root = current === 0,
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

  // On a step change VoiceOver would keep focus on the replaced Continue button. Move it to the
  // question, or the title on steps without one.
  // `sendAccessibilityEvent`, not `setAccessibilityFocus`: the latter is deprecated and routes through
  // the pre-Fabric renderer, so with the New Architecture on it moves nothing.
  useEffect(() => {
    const target = questionRef.current ?? titleRef.current;
    if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
  }, [current, question]);

  // Leaving the route throws away everything typed, so past the first page the edge swipe is off
  // and hardware back steps back instead, matching the chevron.
  const screenOptions = useMemo(() => ({ gestureEnabled: root }), [root]);

  // Read through a ref so an inline `onBack` does not resubscribe the listener on every keystroke.
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (root) return false;
        onBackRef.current();
        return true;
      });
      return () => subscription.remove();
    }, [root]),
  );

  return (
    <Screen
      scrollable={scrollable}
      avoidKeyboard={avoidKeyboard}
      // Pinned: back, close and progress stay put while a long step scrolls.
      header={
        <View className="w-full pb-2">
          <FlowHeader title={title} onBack={onBack} closePrompt={closePrompt} titleRef={titleRef} />
          {steps > 1 ? <StepIndicator steps={steps} current={current} /> : null}
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
            'w-full text-center font-app text-[20px] text-muted',
            headerSlot ? 'mt-8' : 'mt-6',
          )}
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {question}
        </Text>
      ) : null}

      <View className={cn('w-full flex-1', question ? 'mt-6' : 'mt-4')}>{children}</View>

      <View className="mt-8 w-full gap-3 pb-2">
        {error ? (
          <Text
            className="w-full text-center font-app text-[13px] text-danger"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {error}
          </Text>
        ) : null}

        {primaryLabel && onPrimary ? (
          <Button label={primaryLabel} onPress={onPrimary} disabled={primaryDisabled} />
        ) : null}
        {footerSlot}
      </View>
    </Screen>
  );
}

/**
 * Back on the left, close on the right, the flow's name between them. Close leaves the whole flow
 * from any step, after asking. Exported for screens that open a flow before its steps begin and for
 * the voice pages (separate routes wearing the same chrome).
 */
export function FlowHeader({
  title,
  onBack,
  closePrompt,
  onClose,
  titleRef,
}: {
  title: string;
  onBack: () => void;
  /** What close asks before it throws the flow away. Without one there is no close button. */
  closePrompt?: string;
  /** Where close goes once confirmed. Defaults to popping this screen. */
  onClose?: () => void;
  titleRef?: RefObject<ComponentRef<typeof Text> | null>;
}) {
  const colors = useColors();
  const confirm = useConfirm();

  const close = async () => {
    if (!closePrompt) return;
    const ok = await confirm({
      title: closePrompt,
      message: t('ui.flow.discardMessage'),
      confirmLabel: t('common.yes'),
      cancelLabel: t('ui.flow.stay'),
      destructive: true,
    });
    if (ok) (onClose ?? goBack)();
  };

  return (
    <PageHeader
      title={title}
      titleRef={titleRef}
      left={<BackButton accessibilityLabel={t('common.back')} onPress={onBack} />}
      right={
        closePrompt ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            accessibilityHint={closePrompt}
            onPress={() => void close()}
            hitSlop={8}
            // Pulled 8pt right so the cross, not its touch box, lines up with the page edge.
            className="-mr-2 h-[44px] w-[44px] items-center justify-center rounded-full active:bg-ink/5"
          >
            <X size={22} color={colors.ink} strokeWidth={2} />
          </Pressable>
        ) : null
      }
    />
  );
}

/** Where you are, as one wide pill among dots. Completed and upcoming steps look the same on purpose. */
export function StepIndicator({ steps, current }: { steps: number; current: number }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t('ui.flow.stepOf', { step: current + 1, steps })}
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
