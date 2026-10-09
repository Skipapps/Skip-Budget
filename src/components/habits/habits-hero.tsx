import { PiggyBank } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { FitFigure, FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type HabitsHeroProps = {
  /** "Spent this week" or "Spent that week". */
  label: string;
  /** Already formatted. */
  spent: string;
  saved: string;
};

/**
 * The accent card on top of the habits: what the week shown cost, and beside it what skipping has
 * saved since each habit began. All type is white: 5.6:1 on the accent, 4.57:1 on the tile.
 *
 * Side by side while the spent figure fits whole beside the tile; otherwise the tile goes full width
 * underneath and each figure fits its own line. The owner keys this on both figures, so a new pair
 * is judged side by side again.
 */
export function HabitsHero({ label, spent, saved }: HabitsHeroProps) {
  const colors = useColors();
  const pair = useFitGroup({ mode: 'switch' });
  const side = pair.fits;

  return (
    <View
      accessible
      accessibilityLabel={t('habits.hero.spoken', { label, spent, saved })}
      className="mt-3 w-full rounded-[20px] bg-accent p-5"
    >
      <FitGroup
        group={pair}
        className={side ? 'w-full flex-row items-center gap-4' : 'w-full'}
        testID="habits-hero"
      >
        <View className={side ? 'min-w-0 flex-1' : 'w-full'}>
          <Text
            className="font-app text-[14px] text-on-control"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {label}
          </Text>
          {side ? (
            <FitText
              id="hero-spent"
              role="figure"
              size={40}
              className="font-app-bold text-on-control"
              slotClassName="mt-1 w-full"
            >
              {spent}
            </FitText>
          ) : (
            <FitFigure
              id="hero-spent"
              size={40}
              className="font-app-bold text-on-control"
              boxClassName="mt-1"
            >
              {spent}
            </FitFigure>
          )}
        </View>

        <View
          className={cn(
            'rounded-[14px] bg-on-control/10 px-4 py-3',
            side ? 'shrink-0' : 'mt-4 w-full',
          )}
        >
          <View className="flex-row items-center gap-1.5">
            <PiggyBank size={16} color={colors.onControl} strokeWidth={1.8} />
            <Text
              className="shrink font-app text-[13px] text-on-control"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {t('habits.hero.saved')}
            </Text>
          </View>
          {side ? (
            <FitText
              id="hero-saved"
              hug
              role="figure"
              size={22}
              className="font-app-bold text-on-control"
              slotClassName="mt-1"
            >
              {saved}
            </FitText>
          ) : (
            <FitFigure
              id="hero-saved"
              size={22}
              className="font-app-bold text-on-control"
              boxClassName="mt-1"
            >
              {saved}
            </FitFigure>
          )}
        </View>
      </FitGroup>
    </View>
  );
}
