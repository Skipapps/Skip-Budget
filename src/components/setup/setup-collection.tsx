import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { TextLink } from '@/components/ui/text-link';
import { Subtitle, Title } from '@/components/ui/typography';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { useColors } from '@/providers/theme-provider';

type SetupCollectionProps = {
  title: string;
  subtitle: string;
  /** What the dashed box says before the first one is added. */
  emptyText: string;
  /** "bill", "subscription" — the buttons read "Add a …" and "Add another …". */
  noun: string;
  /** The real add form, the same one the rest of the app uses. */
  addHref: string;
  count: number;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  /** The rows added so far. */
  children: ReactNode;
};

/**
 * A setup step that collects several of something: bills, subscriptions.
 *
 * Nobody has one bill. Opened straight from the checklist, the add form
 * dropped people back on the checklist after the first, and the second had no
 * way in but to leave setup. So the step is this page instead: every one saved
 * lands back here, listed, with "Add another" beside "Done" — and Done is the
 * only thing that returns to the checklist.
 *
 * Only setup opens these pages. The form is still the one the rest of the app
 * uses; this just holds the loop around it.
 */
export function SetupCollection({
  title,
  subtitle,
  emptyText,
  noun,
  addHref,
  count,
  isPending,
  isError,
  onRetry,
  children,
}: SetupCollectionProps) {
  const colors = useColors();
  const hasAny = count > 0;
  const add = () => router.push(addHref as never);
  // The checklist is right beneath this page; replacing would stack a second.
  const done = () => (router.canGoBack() ? router.back() : router.replace('/setup'));

  return (
    <Screen
      showBack
      footer={
        hasAny ? (
          <View className="w-full gap-3">
            <Button
              label={`Add another ${noun}`}
              variant="outline"
              icon={<Plus size={18} color={colors.ink} strokeWidth={2} />}
              onPress={add}
            />
            <Button label="Done" onPress={done} />
          </View>
        ) : (
          <View className="w-full gap-2">
            <Button label={`Add a ${noun}`} onPress={add} />
            <TextLink label="Skip for now" variant="subtle" onPress={done} />
          </View>
        )
      }
    >
      <Title>{title}</Title>
      <Subtitle className="mt-2">{subtitle}</Subtitle>

      <View className="mt-8 w-full">
        {isPending ? (
          <SkeletonList rows={2} />
        ) : isError ? (
          <View className="w-full items-center gap-1">
            <Text
              className="text-center font-poppins text-[14px] text-muted"
              maxFontSizeMultiplier={1.4}
            >
              {FAILURE_MESSAGE}
            </Text>
            <TextLink label="Try again" variant="subtle" onPress={onRetry} />
          </View>
        ) : hasAny ? (
          <View className="w-full rounded-[16px] border border-line bg-card px-4 py-1">
            {children}
          </View>
        ) : (
          <View className="w-full items-center rounded-[16px] border border-dashed border-line px-6 py-8">
            <Text
              className="text-center font-poppins text-[14px] leading-5 text-muted"
              maxFontSizeMultiplier={1.4}
            >
              {emptyText}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
