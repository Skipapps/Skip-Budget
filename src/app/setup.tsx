import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

import { useGettingStarted, type SetupStep } from '@/api/onboarding';
import { resetTo } from '@/lib/nav';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { Title } from '@/components/ui/typography';
import { useColors } from '@/providers/theme-provider';

/** Where a step opens from the walk-in, when that is not its everyday screen. */
const SETUP_ROUTES: Partial<Record<SetupStep['id'], string>> = {
  wallet: '/add-card?from=setup',
  bill: '/setup-bills',
  subscription: '/setup-subscriptions',
};

/**
 * The walk-in: five steps between signing up and a working app.
 *
 * Every arrival after login lands here, and the screen decides — once, on
 * arrival — whether this is a new account. Only an account with nothing in it
 * yet gets the walk-in. Anyone who has saved anything at all is a returning
 * user and passes straight through to Home without seeing a frame of this
 * (Founder, 2026-10-03: a returning account with no subscription was being
 * walked through setup again on every login). Home's Getting Started card
 * still lists what is left for them. The decision is taken once and held,
 * because it flips mid-flow: save the pay step and the account is no longer
 * empty, and a live gate would yank the screen away before the rest had their
 * say.
 *
 * A hub, not a wizard: each step opens the real screen — the same salary,
 * card, account and bill forms the rest of the app uses — and saving there
 * lands back here with the row struck through. No duplicated forms, no
 * second way to add a bill that drifts from the first.
 */
export default function SetupScreen() {
  const colors = useColors();
  const { steps, doneCount, requiredDone, settled, dismissed } = useGettingStarted();

  // The arrival decision, taken exactly once when the rows are in: new
  // accounts walk in, returning ones go home.
  // State set during render, React's pattern for a value taken from props
  // once: unlike a ref, reading it here is allowed.
  const [decided, setDecided] = useState<'flow' | 'home' | null>(null);
  if (decided === null && settled) {
    setDecided(dismissed || doneCount > 0 ? 'home' : 'flow');
  }

  if (decided === null) return <></>;
  if (decided === 'home') return <Redirect href="/home" />;

  // Three steps go somewhere of their own from here. The wallet carries its
  // origin, so the card form hands over to the account offer, then returns;
  // bills and subscriptions open a page that takes as many as somebody has,
  // rather than the form, which would drop them back here after the first.
  const openStep = (step: SetupStep) => router.push((SETUP_ROUTES[step.id] ?? step.href) as never);

  const next = steps.find((step) => !step.done);
  const receipt = steps[steps.length - 1];
  const allDone = steps.every((step) => step.done);

  // Required steps first, then the receipt gets one clear moment: add it or
  // walk in. Never a dead end, never a forced purchase.
  const primary = allDone
    ? { label: 'All set — open Skip', act: () => resetTo('/home') }
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
              onPress={() => resetTo('/home')}
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
