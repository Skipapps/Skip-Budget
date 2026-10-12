import { PiggyBank } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { FitFigure } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type HabitsHeroProps = {
  /** "Spent this week", "Spent that week" or "Spent so far". */
  label: string;
  /** Already formatted. */
  spent: string;
  saved: string;
  /** Drawn above the label, such as one habit's icon and price. */
  top?: ReactNode;
  /** What VoiceOver reads for `top`: the hero is one stop, so nothing inside it is read alone. */
  topLabel?: string;
};

/**
 * The accent card on top of the habits: what the week shown cost, then the full-width tile with what
 * skipping has saved since each habit began. Each figure fits its own line. All type is white:
 * 5.6:1 on the accent, 4.57:1 on the tile.
 */
export function HabitsHero({ label, spent, saved, top, topLabel }: HabitsHeroProps) {
  const colors = useColors();
  const spoken = topLabel
    ? t('habits.hero.spokenTop', { top: topLabel, label, spent, saved })
    : t('habits.hero.spoken', { label, spent, saved });

  return (
    <View
      accessible
      accessibilityLabel={spoken}
      className="mt-[18px] w-full rounded-[22px] bg-accent p-[22px]"
      testID="habits-hero"
    >
      {top ? <View className="mb-[16px] w-full">{top}</View> : null}
      <Text
        className="font-app text-[15px] text-on-control"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {label}
      </Text>
      <FitFigure
        id="hero-spent"
        size={38}
        className="font-app-bold text-on-control"
        boxClassName="mt-[2px]"
      >
        {spent}
      </FitFigure>

      {/* A tenth of white, not more: the tile's white type needs its 4.5:1. */}
      <View className="mt-[14px] w-full rounded-[14px] bg-on-control/10 px-[16px] py-[12px]">
        <View className="flex-row items-center gap-[6px]">
          <PiggyBank size={17} color={colors.onControl} strokeWidth={1.8} />
          <Text
            className="shrink font-app text-[14px] text-on-control"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {t('habits.hero.saved')}
          </Text>
        </View>
        <FitFigure
          id="hero-saved"
          size={22}
          className="font-app-bold text-on-control"
          boxClassName="mt-[2px]"
        >
          {saved}
        </FitFigure>
      </View>
    </View>
  );
}
