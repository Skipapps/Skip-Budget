import { Stack } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { Fragment, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextLink } from '@/components/ui/text-link';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type AddedRow = { label: string; value: string };

type AddedPageProps = {
  title: string;
  message: string;
  /** The card or account face, as it now is. */
  face: ReactNode;
  rows: AddedRow[];
  onDone: () => void;
  anotherLabel: string;
  onAnother: () => void;
};

/**
 * The last page of an add flow: what was added and what happens next. It is the confirmation, so no
 * toast goes over it. It takes the flow's place: Done, close and the edge swipe all leave, and
 * nothing goes back into the finished steps.
 */
export function AddedPage({
  title,
  message,
  face,
  rows,
  onDone,
  anotherLabel,
  onAnother,
}: AddedPageProps) {
  const colors = useColors();

  return (
    <Screen
      header={
        <View className="w-full flex-row justify-end pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onDone}
            hitSlop={2}
            className="h-[40px] w-[40px] items-center justify-center rounded-full border border-line bg-card active:bg-ink/5"
          >
            <X size={18} color={colors.ink} strokeWidth={2} />
          </Pressable>
        </View>
      }
      footer={
        <View className="w-full items-center gap-3">
          <Button label={t('common.done')} onPress={onDone} />
          <TextLink label={anotherLabel} onPress={onAnother} />
        </View>
      }
    >
      {/* The flow's steps turned the swipe off; leaving from here is fine. */}
      <Stack.Screen options={{ gestureEnabled: true }} />

      <View className="mt-4 h-[64px] w-[64px] items-center justify-center self-center rounded-full bg-accent/10">
        <Check size={26} color={colors.accentInk} strokeWidth={2.2} />
      </View>
      <Text
        accessibilityRole="header"
        className="mt-[18px] w-full text-center font-app-bold text-[26px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {title}
      </Text>
      <Text
        className="mt-[8px] w-full text-center font-app text-[13px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {message}
      </Text>

      <View className="mt-[16px] w-full">{face}</View>

      {rows.length > 0 ? (
        <View className="mt-[16px] w-full rounded-[14px] border border-line bg-card">
          {rows.map((row, index) => (
            <Fragment key={row.label}>
              {index > 0 ? <View className="h-px w-full bg-line" /> : null}
              <View
                accessible
                className="min-h-[41px] w-full flex-row flex-wrap items-center justify-between gap-x-3 px-[16px] py-[10px]"
              >
                <Text
                  className="font-app text-[13px] text-muted"
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {row.label}
                </Text>
                <Text
                  className="shrink text-right font-app-semibold text-[13px] text-ink"
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {row.value}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
