import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { withTap } from '@/lib/press';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * What Pro would add to the page, with Learn more. Drawn on free only, by the page. The whole strip
 * is the button; at large text "Learn more" moves under the line instead of squeezing it.
 */
export function ProFooter({
  label,
  onPress,
  className,
  testID = 'pro-footer',
}: {
  /** "See up to 7 years with Pro", "See older months with Pro". */
  label: string;
  /** Where Learn more goes; the history explainer when left out. */
  onPress?: () => void;
  className?: string;
  testID?: string;
}) {
  const learnMore = t('payments.learnMore');
  const open =
    onPress ?? (() => router.push({ pathname: '/pro-feature', params: { id: 'history' } }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={learnMore}
      onPress={withTap(open)}
      testID={testID}
      className={cn(
        'min-h-[48px] w-full flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[16px] border border-line bg-card px-[16px] py-[12px] active:bg-ink/5',
        className,
      )}
    >
      <Text className="shrink font-app text-[14px] text-ink" maxFontSizeMultiplier={TEXT_CAP.row}>
        {label}
      </Text>
      {/* tint-ink, not accent-ink: accent-ink is tuned for the page and falls to 3.96:1 on a
          dark card. */}
      <Text
        className="shrink font-app-semibold text-[14px] text-tint-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {learnMore}
      </Text>
    </Pressable>
  );
}
