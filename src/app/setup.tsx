import { Redirect, router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

import { useGettingStarted, type SetupStep } from '@/api/onboarding';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';
import { useColors } from '@/providers/theme-provider';

/**
 * The walk-in: five steps between signing in and a working app.
 *
 * Every arrival after login lands here, and the screen decides — once, on
 * arrival — whether there is anything to do. Somebody whose required steps
 * are done, or who waved the guide away, passes straight through to Home
 * without seeing a frame of this. The decision is taken once and held,
 * because it flips mid-flow: finish the bills and "required done" turns true,
 * and a live gate would yank the screen away before the receipt step had its
 * say.
 *
 * A hub, not a wizard: each step opens the real screen — the same salary,
 * card, account and bill forms the rest of the app uses — and saving there
 * lands back here with the row struck through. No duplicated forms, no
 * second way to add a bill that drifts from the first.
 */
export default function SetupScreen() {
  const colors = useColors();
  const { steps, requiredDone, settled, dismissed } = useGettingStarted();

  // The arrival decision, taken exactly once when the rows are in.
  const decided = useRef<'flow' | 'home' | null>(null);
  if (decided.current === null && settled) {
    decided.current = dismissed || requiredDone ? 'home' : 'flow';
  }

  if (decided.current === null) return <></>;
  if (decided.current === 'home') return <Redirect href="/home" />;

  // The wallet step carries its origin: arriving from here, the card form
  // hands over to the Cards tab to offer the account, then returns.
  const openStep = (step: SetupStep) =>
    router.push((step.id === 'wallet' ? `${step.href}?from=setup` : step.href) as never);

  const next = steps.find((step) => !step.done);
  const receipt = steps[steps.length - 1];
  const allDone = steps.every((step) => step.done);

  // Required steps first, then the receipt gets one clear moment: add it or
  // walk in. Never a dead end, never a forced purchase.
  const primary = allDone
    ? { label: 'All set — open Skip', act: () => router.replace('/home') }
    : requiredDone
      ? { label: 'Add a receipt', act: () => openStep(receipt) }
      : { label: 'Continue', act: () => openStep(next!) };

  return (
    <Screen
      footer={
        <View className="w-full gap-2">
          <Button label={primary.label} onPress={primary.act} />
          {!allDone ? (
            <TextLink
              label={requiredDone ? 'Skip the receipt — open Skip' : 'Set up later'}
              variant="subtle"
              onPress={() => router.replace('/home')}
            />
          ) : null}
        </View>
      }
    >
      <Title>Let’s set up Skip</Title>

      <View className="mt-7 w-full gap-3">
        {steps.map((step, index) => {
          const isNext = step.id === next?.id;
          return (
            <Pressable
              key={step.id}
              accessibilityRole="button"
              accessibilityState={{ disabled: step.done }}
              accessibilityLabel={
                step.done
                  ? `Step ${index + 1}, ${step.title}. Done.`
                  : `${step.title}. ${step.detail}`
              }
              disabled={step.done}
              onPress={() => openStep(step)}
              className={
                isNext
                  ? 'w-full flex-row items-center gap-4 rounded-[16px] border border-accent bg-card p-4 active:bg-ink/5'
                  : 'w-full flex-row items-center gap-4 rounded-[16px] border border-line bg-card p-4 active:bg-ink/5'
              }
            >
              {/* The number is the sequence; it becomes a tick when the data
                  exists, same derivation the Home card uses. */}
              <View
                className={
                  step.done
                    ? 'h-8 w-8 items-center justify-center rounded-full bg-accent'
                    : 'h-8 w-8 items-center justify-center rounded-full border border-line'
                }
              >
                {step.done ? (
                  <Check size={16} color={colors.onControl} strokeWidth={2} />
                ) : (
                  <Text
                    className="font-poppins-semibold text-[14px] text-ink"
                    maxFontSizeMultiplier={1.2}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>

              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={
                      step.done
                        ? 'shrink font-poppins text-[15px] text-muted line-through'
                        : 'shrink font-poppins-semibold text-[15px] text-ink'
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

              {!step.done ? <ChevronRight size={18} color={colors.muted} strokeWidth={2} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
