import { ChevronDown, Plus } from 'lucide-react-native';
import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { HabitIcon } from '@/components/habits/habit-icon';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { type HabitPreset, type HabitPresetId } from '@/data/habit-presets';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { withTap } from '@/lib/press';
import { useColors } from '@/providers/theme-provider';

type PresetGridProps = {
  presets: readonly HabitPreset[];
  /** How many are on the page before More is pressed. */
  shownBefore: number;
  moreShown: boolean;
  /** Pressed in this visit: the revealed tiles fade in and VoiceOver moves to the first of them. */
  justRevealed: boolean;
  selectedId: HabitPresetId | null;
  /** Presets already on an active habit. Still pickable: a second coffee habit is allowed. */
  trackingIds: ReadonlySet<string>;
  /** Each preset's price in the account's currency. */
  priceOf: (preset: HabitPreset) => number;
  onPick: (preset: HabitPreset) => void;
  onMore: () => void;
  onOwn: () => void;
};

/**
 * Step 1's ready-made habits, two-up, each a tap that answers; then More and Add my own. Names
 * share one size and so do subtitles, as the category grid's do: when either would have to go
 * under its default size the grid goes to one column, so no word is cut.
 */
export function HabitPresetGrid({
  presets,
  shownBefore,
  moreShown,
  justRevealed,
  selectedId,
  trackingIds,
  priceOf,
  onPick,
  onMore,
  onOwn,
}: PresetGridProps) {
  const colors = useColors();
  const names = useFitGroup({ mode: 'shrink' });
  const subtitles = useFitGroup({ mode: 'shrink' });
  const buttons = useFitGroup({ mode: 'switch' });
  const twoUp = names.fits && subtitles.fits;
  const firstRevealed = useRef<ComponentRef<typeof Pressable>>(null);

  const shown = moreShown ? presets : presets.slice(0, shownBefore);

  useEffect(() => {
    if (justRevealed && firstRevealed.current) {
      AccessibilityInfo.sendAccessibilityEvent(firstRevealed.current, 'focus');
    }
  }, [justRevealed]);

  return (
    <View className="w-full">
      <FitGroup group={names} className="w-full" testID="habit-presets">
        <FitGroup
          group={subtitles}
          className="w-full flex-row flex-wrap justify-between gap-3"
          testID="habit-presets-grid"
        >
          {shown.map((preset, index) => {
            const selected = preset.id === selectedId;
            const name = t(preset.name);
            const subtitle = trackingIds.has(preset.id)
              ? t('habitFlow.pick.tracking')
              : t(preset.subtitle);
            const revealed = index >= shownBefore;

            return (
              <Animated.View
                key={preset.id}
                entering={revealed && justRevealed ? FadeIn.duration(220) : undefined}
                style={{ width: twoUp ? '47.5%' : '100%' }}
              >
                <Pressable
                  ref={revealed && index === shownBefore ? firstRevealed : undefined}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={t('habitFlow.pick.spoken', {
                    name,
                    subtitle,
                    price: formatCurrency(priceOf(preset)),
                  })}
                  onPress={withTap(() => onPick(preset))}
                  className={cn(
                    'w-full items-center rounded-[16px] bg-card active:opacity-80',
                    // One point of padding gives way to the thicker border, so nothing moves.
                    selected ? 'border-2 border-control p-[13px]' : 'border border-line p-3.5',
                  )}
                >
                  <HabitIcon iconId={preset.icon} color={preset.color} size={44} />

                  <FitText
                    group={names}
                    id={`${preset.id}-name`}
                    role="control"
                    size={15}
                    lineHeight={20}
                    className="text-center font-app-semibold text-ink"
                    slotClassName="mt-3 w-full"
                  >
                    {name}
                  </FitText>
                  <FitText
                    group={subtitles}
                    id={`${preset.id}-subtitle`}
                    role="control"
                    size={12}
                    lineHeight={16}
                    className="text-center font-app text-muted"
                    slotClassName="mt-0.5 w-full"
                  >
                    {subtitle}
                  </FitText>
                </Pressable>
              </Animated.View>
            );
          })}
        </FitGroup>
      </FitGroup>

      <FitGroup
        group={buttons}
        className={cn('mt-5 w-full gap-3', buttons.fits && !moreShown && 'flex-row')}
        testID="habit-preset-actions"
      >
        {moreShown ? null : (
          <View className={buttons.fits ? 'min-w-0 flex-1' : 'w-full'}>
            <PillButton
              id="more"
              label={t('habitFlow.pick.more')}
              hint={t('habitFlow.pick.moreHint')}
              icon={<ChevronDown size={ICON} color={colors.onControl} strokeWidth={2.2} />}
              onPress={onMore}
            />
          </View>
        )}
        <View className={buttons.fits && !moreShown ? 'min-w-0 flex-1' : 'w-full'}>
          <PillButton
            id="own"
            label={t('habitFlow.pick.own')}
            icon={<Plus size={ICON} color={colors.onControl} strokeWidth={2.2} />}
            onPress={onOwn}
          />
        </View>
      </FitGroup>
    </View>
  );
}

const ICON = 18;
/** The icon and the 8pt between it and the label. */
const ICON_ROOM = ICON + 8;

/**
 * A filled pill, smaller than the page's primary button so two sit side by side on a 375pt phone
 * in every language. Its label is measured whole, so the pair stacks rather than wrap a label.
 */
function PillButton({
  id,
  label,
  hint,
  icon,
  onPress,
}: {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={withTap(onPress)}
      className="min-h-12 w-full items-center justify-center rounded-full bg-control px-3.5 py-2.5 active:bg-control-pressed"
    >
      <FitText
        id={id}
        whole
        role="row"
        size={15}
        className="text-center font-app-semibold text-on-control"
        slotClassName="w-full flex-row items-center justify-center"
        before={<View className="mr-2">{icon}</View>}
        reserve={ICON_ROOM}
      >
        {label}
      </FitText>
    </Pressable>
  );
}
