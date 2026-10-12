import { Stack, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { AccessibilityInfo, BackHandler, Text, View } from 'react-native';

import { FlowHeader } from '@/components/flow/step-flow';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { TEXT_CAP } from '@/theme/text-scale';

type TextRef = RefObject<ComponentRef<typeof Text> | null>;

/**
 * One page of the Add loan flow. The pages are views over one form in one route, so Back steps
 * between them and keeps everything typed. Only the page the flow opened on lets the edge swipe and
 * hardware back leave the route; anywhere else they step back, matching the chevron.
 */
export function LoanFlowPage({
  title,
  onBack,
  closePrompt,
  root,
  focusRef,
  footer,
  avoidKeyboard = false,
  scrollPlace,
  children,
}: {
  title: string;
  onBack: () => void;
  /** What close asks before leaving the flow; without one there is no close (a one-field page). */
  closePrompt?: string;
  root: boolean;
  /** Where VoiceOver lands when the page opens; the title when left out. */
  focusRef?: TextRef;
  footer: ReactNode;
  avoidKeyboard?: boolean;
  scrollPlace?: { y: number; keep: (y: number) => void };
  children: ReactNode;
}) {
  const titleRef = useRef<ComponentRef<typeof Text>>(null);

  // A new page replaces the old one's controls, and VoiceOver would stay on a button that is gone.
  useEffect(() => {
    const target = focusRef?.current ?? titleRef.current;
    if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
  }, [focusRef]);

  const screenOptions = useMemo(() => ({ gestureEnabled: root }), [root]);
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
      avoidKeyboard={avoidKeyboard}
      scrollPlace={scrollPlace}
      header={
        <View className="w-full pb-2">
          <FlowHeader title={title} onBack={onBack} closePrompt={closePrompt} titleRef={titleRef} />
        </View>
      }
      footer={footer}
    >
      <Stack.Screen options={screenOptions} />
      {children}
    </Screen>
  );
}

/** The pinned action: what stopped it, when something did, then the button and any way back. */
export function LoanFlowFooter({
  error,
  label,
  onPress,
  disabled = false,
  hint,
  secondary,
}: {
  error?: string | null;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
  secondary?: { label: string; onPress: () => void };
}) {
  return (
    <View className="w-full">
      {/* Above the button, so it is seen wherever the page is scrolled to. */}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="mb-3 w-full text-center font-app text-[13px] text-danger"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {error}
        </Text>
      ) : null}
      <Button label={label} onPress={onPress} disabled={disabled} accessibilityHint={hint} />
      {secondary ? (
        <TextLink
          label={secondary.label}
          variant="subtle"
          onPress={secondary.onPress}
          className="mt-1"
        />
      ) : null}
    </View>
  );
}

/** A view's own question under the header, and the line that explains it. */
export function LoanQuestion({
  question,
  helper,
  questionRef,
}: {
  question: string;
  helper?: string;
  questionRef?: TextRef;
}) {
  return (
    <View className="mt-4 w-full">
      <Text
        ref={questionRef}
        accessibilityRole="header"
        className="w-full text-center font-app-semibold text-[20px] leading-[26px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {question}
      </Text>
      {helper ? (
        <Text
          className="mt-1.5 w-full text-center font-app text-[14px] leading-5 text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
