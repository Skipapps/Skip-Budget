import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { TextLink } from '@/components/ui/text-link';
import { Subtitle, Title } from '@/components/ui/typography';
import { t } from '@/i18n';
import { failureText } from '@/lib/failure';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type SetupCollectionProps = {
  title: string;
  subtitle: string;
  /** What the dashed box says before the first one is added. */
  emptyText: string;
  /** The button before the first one is added ("Add a bill"). */
  addLabel: string;
  /** The button once there are some ("Add another bill"). */
  addAnotherLabel: string;
  addHref: string;
  count: number;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  children: ReactNode;
};

/**
 * A setup step that collects several of something. Every one saved lands back here, listed, with
 * "Add another" beside "Done"; only Done returns to the checklist.
 */
export function SetupCollection({
  title,
  subtitle,
  emptyText,
  addLabel,
  addAnotherLabel,
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
              label={addAnotherLabel}
              variant="outline"
              icon={<Plus size={18} color={colors.ink} strokeWidth={2} />}
              onPress={add}
            />
            <Button label={t('common.done')} onPress={done} />
          </View>
        ) : (
          <View className="w-full gap-2">
            <Button label={addLabel} onPress={add} />
            <TextLink label={t('onboarding.skipForNow')} variant="subtle" onPress={done} />
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
              className="text-center font-app text-[14px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {failureText()}
            </Text>
            <TextLink label={t('common.tryAgain')} variant="subtle" onPress={onRetry} />
          </View>
        ) : hasAny ? (
          <View className="w-full rounded-[16px] border border-line bg-card px-4 py-1">
            {children}
          </View>
        ) : (
          <View className="w-full items-center rounded-[16px] border border-dashed border-line px-6 py-8">
            <Text
              className="text-center font-app text-[14px] leading-5 text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {emptyText}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
