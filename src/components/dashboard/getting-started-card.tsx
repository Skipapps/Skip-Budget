import { router } from 'expo-router';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { SectionHeading } from '@/components/ui/typography';
import { useGettingStarted } from '@/api/onboarding';
import { useColors } from '@/providers/theme-provider';

/**
 * The five steps the walk-in flow (/setup) runs, read from the same definition. A card, not a
 * wizard: it ticks itself as data appears and leaves once everything is done or dismissed.
 */
export function GettingStartedCard() {
  const colors = useColors();
  const { steps, doneCount, visible, dismiss } = useGettingStarted();

  if (!visible) return null;

  return (
    <View className="mt-6 w-full rounded-[16px] border border-line bg-card p-5">
      <View className="w-full flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <SectionHeading>Getting started</SectionHeading>
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

      <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
        <View
          className="h-full rounded-full bg-accent"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </View>

      <View className="mt-2 w-full">
        {steps.map((step) => {
          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityState={{ disabled: step.done }}
              accessibilityLabel={step.done ? `${step.title}. Done.` : step.title}
              // Not drawn (titles only) but still said, so VoiceOver keeps the why behind each
              // step.
              accessibilityHint={step.done ? undefined : step.detail}
              disabled={step.done}
              onPress={() => router.push(step.href as never)}
              className="w-full flex-row items-center gap-3 py-2.5 active:opacity-70"
            >
              <View
                className={
                  step.done
                    ? 'h-6 w-6 items-center justify-center rounded-full bg-accent'
                    : 'h-6 w-6 items-center justify-center rounded-full border border-line'
                }
              >
                {step.done ? <Check size={14} color={colors.onControl} strokeWidth={1.8} /> : null}
              </View>

              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={
                      step.done
                        ? 'shrink font-poppins text-[14px] text-muted line-through'
                        : 'shrink font-poppins-medium text-[14px] text-ink'
                    }
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.3}
                  >
                    {step.title}
                  </Text>
                  {step.optional && !step.done ? (
                    <Text
                      className="font-poppins text-[11px] text-muted"
                      maxFontSizeMultiplier={1.2}
                    >
                      Optional
                    </Text>
                  ) : null}
                </View>
              </View>

              {!step.done ? <ChevronRight size={16} color={colors.muted} strokeWidth={2} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
