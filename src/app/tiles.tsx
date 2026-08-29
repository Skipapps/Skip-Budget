import { router } from 'expo-router';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useUpdateProfile } from '@/api/mutations';
import { useProfile } from '@/api/queries';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Subtitle, Title } from '@/components/ui/typography';
import { spendingCategories } from '@/data/dashboard-mock';
import { cn } from '@/lib/cn';
import { tap, warn } from '@/lib/haptics';
import { moveBy, orderByIds } from '@/lib/order';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

/**
 * Arranging the five tiles under "Where it goes".
 *
 * Which one you want first is personal — somebody carrying one large loan and
 * no subscriptions wants the opposite arrangement to somebody living off
 * streaming services — and the dashboard shows them in a row you scroll, so
 * the order decides what is visible without scrolling at all.
 *
 * Moved a step at a time rather than dragged. Five rows is short enough that
 * two taps beats a long press and a hold, it works for anyone who cannot hold
 * a precise drag, and the arrows say plainly which moves are available: the
 * first row cannot go up and the last cannot go down.
 */
export default function TilesScreen() {
  const colors = useColors();
  const artwork = useArtwork();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const saved = useMemo(
    () => orderByIds(spendingCategories, profile.data?.tile_order),
    [profile.data?.tile_order],
  );

  // Null until something is moved, so a profile that loads a moment after the
  // screen does not overwrite an arrangement already in progress.
  const [draft, setDraft] = useState<typeof saved | null>(null);
  const tiles = draft ?? saved;

  const dirty =
    draft !== null && draft.map((tile) => tile.id).join() !== saved.map((tile) => tile.id).join();

  const move = (index: number, delta: number) => {
    const next = moveBy(tiles, index, delta);
    // At either end there is nothing to move to, and a tap that changes
    // nothing should not feel the same as one that does.
    if (next.map((tile) => tile.id).join() === tiles.map((tile) => tile.id).join()) {
      warn();
      return;
    }
    tap();
    setDraft(next);
  };

  const save = () => {
    updateProfile.mutate(
      { tile_order: tiles.map((tile) => tile.id) },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <Screen showBack>
      <Title align="left" className="mt-1 w-full">
        Dashboard tiles
      </Title>
      <Subtitle className="mt-2 w-full text-left">
        The order they appear in under “Where it goes”. The first two are the ones you see without
        scrolling.
      </Subtitle>

      <View className="mt-6 w-full">
        {tiles.map((tile, index) => (
          <View
            key={tile.id}
            className="mb-2.5 w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-3.5 py-3"
          >
            <View className="h-11 w-11 opacity-55">
              {(() => {
                const Art = artwork[tile.artwork];
                return <Art width="100%" height="100%" />;
              })()}
            </View>

            <Text
              className="flex-1 font-poppins-medium text-[15px] text-ink"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {tile.label}
            </Text>

            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.2}>
              {index + 1}
            </Text>

            <Step
              direction="up"
              disabled={index === 0}
              label={`Move ${tile.label} up`}
              onPress={() => move(index, -1)}
            />
            <Step
              direction="down"
              disabled={index === tiles.length - 1}
              label={`Move ${tile.label} down`}
              onPress={() => move(index, 1)}
            />
          </View>
        ))}
      </View>

      {/* Only worth offering once it differs from what ships. */}
      {tiles.map((tile) => tile.id).join() !== spendingCategories.map((tile) => tile.id).join() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset to the original order"
          onPress={() => {
            tap();
            setDraft([...spendingCategories]);
          }}
          className="mt-1 flex-row items-center gap-2 self-start rounded-full border border-line px-3.5 py-2 active:bg-ink/5"
        >
          <RotateCcw size={14} color={colors.muted} strokeWidth={2} />
          <Text className="font-poppins-medium text-[13px] text-body" maxFontSizeMultiplier={1.2}>
            Original order
          </Text>
        </Pressable>
      ) : null}

      {dirty ? (
        <View className="mt-auto w-full pt-8">
          <Button label={updateProfile.isPending ? 'Saving…' : 'Save order'} onPress={save} />
        </View>
      ) : null}

      <View className="h-10 w-full" />
    </Screen>
  );
}

type StepProps = {
  direction: 'up' | 'down';
  disabled: boolean;
  label: string;
  onPress: () => void;
};

function Step({ direction, disabled, label, onPress }: StepProps) {
  const colors = useColors();
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      className={cn(
        'h-9 w-9 items-center justify-center rounded-[10px] border border-line',
        disabled ? 'opacity-30' : 'active:bg-ink/5',
      )}
    >
      <Icon size={18} color={colors.body} strokeWidth={2} />
    </Pressable>
  );
}
