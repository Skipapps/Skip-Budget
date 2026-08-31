import { router } from 'expo-router';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useGettingStarted } from '@/api/onboarding';
import { useColors } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

/**
 * Five steps between an empty app and a useful one.
 *
 * A card, not a wizard: Skip works from the first second — you can scan a
 * receipt before setting anything up — and a forced setup flow would stand in
 * front of exactly that moment. This sits on Home, ticks itself as the data
 * appears, and leaves for good once everything is done or somebody says so.
 */
export function GettingStartedCard() {
  const colors = useColors();
  const { steps, doneCount, visible, dismiss, askForReminders } = useGettingStarted();

  if (!visible) return null;

  const next = steps.find((step) => !step.done);

  return (
    <View
      style={shadows.card}
      className="mt-6 w-full rounded-[14px] border border-line bg-card p-5"
    >
      <View className="w-full flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-poppins-semibold text-[17px] text-ink" maxFontSizeMultiplier={1.3}>
            Getting started
          </Text>
          <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            {doneCount} of {steps.length} done
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hide the getting started card"
          onPress={dismiss}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-ink/5"
        >
          <X size={17} color={colors.muted} strokeWidth={2} />
        </Pressable>
      </View>

      {/* One bar, not five dots: progress here is an amount, not a sequence
          of states, and a filling bar says "nearly there" at a glance. */}
      <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
        <View
          className="h-full rounded-full bg-accent"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </View>

      <View className="mt-2 w-full">
        {steps.map((step) => {
          const isNext = step.id === next?.id;
          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityState={{ disabled: step.done }}
              accessibilityLabel={
                step.done ? `${step.title}. Done.` : `${step.title}. ${step.detail}`
              }
              disabled={step.done}
              onPress={() => {
                if (step.href) router.push(step.href as never);
                else void askForReminders();
              }}
              className="w-full flex-row items-center gap-3 py-2.5 active:opacity-70"
            >
              <View
                className={
                  step.done
                    ? 'h-6 w-6 items-center justify-center rounded-full bg-accent'
                    : 'border-line-strong h-6 w-6 items-center justify-center rounded-full border'
                }
              >
                {step.done ? <Check size={14} color={colors.onControl} strokeWidth={3} /> : null}
              </View>

              <View className="min-w-0 flex-1">
                <Text
                  className={
                    step.done
                      ? 'font-poppins text-[14px] text-muted line-through'
                      : 'font-poppins-medium text-[14px] text-ink'
                  }
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {step.title}
                </Text>
                {/* Only the next step explains itself. Five explanations at
                    once is a wall; one is an invitation. */}
                {isNext ? (
                  <Text
                    className="mt-0.5 font-poppins text-[12px] leading-[17px] text-muted"
                    maxFontSizeMultiplier={1.3}
                  >
                    {step.detail}
                  </Text>
                ) : null}
              </View>

              {!step.done ? <ChevronRight size={16} color={colors.muted} strokeWidth={2} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
