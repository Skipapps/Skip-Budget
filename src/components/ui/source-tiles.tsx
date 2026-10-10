import { Check } from 'lucide-react-native';
import { Pressable, View, useWindowDimensions } from 'react-native';

import type { PaymentSourceRow as PaymentSource } from '@/api/queries';
import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { contrast } from '@/lib/tone';
import { useColors } from '@/providers/theme-provider';
import { mix } from '@/theme/palette';
import { TEXT_CAP } from '@/theme/text-scale';

type SourceTilesProps = {
  sources: readonly PaymentSource[];
  value: string;
  onChange: (id: string) => void;
  /** A last tile for none of them, picked on purpose rather than left blank. */
  skip?: { label: string; selected: boolean; onPress: () => void };
};

type Tile = {
  id: string;
  label: string;
  name: string;
  last4: string | null;
  /** Null for the Skip tile, which has no card behind it. */
  color: string | null;
  selected: boolean;
  onPress: () => void;
};

/** From the text size where the tiles' type stops growing (xxxL and up), one tile per row. */
const STACK_FROM = TEXT_CAP.control;

/**
 * A swatch this close to what is behind it (white or sand on a light tile, black on a dark one)
 * would vanish into it. Sand #E9CF9B is 1.51:1 on white, so the line sits above it.
 */
const OUTLINE_BELOW = 1.6;

/** The chosen tile's plum over the card: the same share as its `bg-accent/10` class. */
const CHOSEN_TINT = 0.1;

/**
 * Pick-one tiles for cards and bank accounts, two to a row: the card's own colour, its name, its
 * last four, and a radio that fills when chosen. The swatch is never repainted on selection: the
 * border and the check say "chosen", the swatch says "which one". The tiles go one to a row at large
 * text, or when a word of any name would not fit beside the swatch and the radio, so a name wraps
 * between its words and is never cut.
 */
export function SourceTiles({ sources, value, onChange, skip }: SourceTilesProps) {
  const { fontScale } = useWindowDimensions();
  const group = useFitGroup({ mode: 'switch' });
  const columns = fontScale < STACK_FROM && group.fits ? 2 : 1;

  const tiles: Tile[] = sources.map((source) => {
    // A blank name ('' is a bank's default) would draw an empty line.
    const name = source.name || source.label;
    const last4 = source.last4 || null;
    return {
      id: source.id,
      // Spoken in words: VoiceOver reads "••" as bullets.
      label: last4 ? t('ui.source.endingIn', { name, last4 }) : name,
      name,
      last4,
      color: source.color,
      selected: source.id === value,
      onPress: () => onChange(source.id),
    };
  });
  if (skip) {
    tiles.push({
      id: 'skip',
      label: skip.label,
      name: skip.label,
      last4: null,
      color: null,
      selected: skip.selected,
      onPress: skip.onPress,
    });
  }

  const rows: Tile[][] = [];
  for (let i = 0; i < tiles.length; i += columns) rows.push(tiles.slice(i, i + columns));

  return (
    <FitGroup group={group} className="w-full" testID="source-tiles">
      <View accessibilityRole="radiogroup" className="w-full gap-[12px]">
        {rows.map((row, index) => (
          // No items-* on the row: the two tiles stretch to the taller one.
          <View key={index} className="w-full flex-row gap-[12px]" testID="source-tiles-row">
            {row.map((tile) => (
              <SourceTile key={tile.id} tile={tile} />
            ))}
            {/* An odd last tile keeps its column's width, so the grid still reads as one. */}
            {row.length < columns ? <View className="flex-1" /> : null}
          </View>
        ))}
      </View>
    </FitGroup>
  );
}

function SourceTile({ tile }: { tile: Tile }) {
  const colors = useColors();
  const behind = tile.selected ? mix(colors.card, colors.accent, CHOSEN_TINT) : colors.card;
  const outlined = tile.color !== null && contrast(tile.color, behind) < OUTLINE_BELOW;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: tile.selected, checked: tile.selected }}
      accessibilityLabel={tile.label}
      onPress={() => {
        selection();
        tile.onPress();
      }}
      // The border is as wide either way, so choosing a tile moves nothing inside it.
      className={cn(
        'min-h-[54px] min-w-0 flex-1 flex-row items-center overflow-hidden rounded-[16px] border-[1.5px] bg-card px-[12px] py-[10px]',
        // The legible plum: the fill plum is only 2.6:1 against the dark card.
        tile.selected ? 'border-accent-ink' : 'border-line active:bg-ink/5',
      )}
    >
      {tile.selected ? (
        // Over the card rather than the page, so the soft plum is the same on every screen.
        <View testID="source-tile-tint" className="absolute inset-0 bg-accent/10" />
      ) : null}

      {tile.color === null ? (
        <View
          testID="source-tile-swatch-skip"
          className="mr-[10px] h-[18px] w-[28px] rounded-[4px] border-[1.5px] border-dashed border-muted"
        />
      ) : (
        <View
          testID="source-tile-swatch"
          style={[
            { backgroundColor: tile.color },
            outlined && { borderWidth: 1, borderColor: colors.muted },
          ]}
          className="mr-[10px] h-[18px] w-[28px] rounded-[4px]"
        />
      )}

      <View className="min-w-0 flex-1">
        <FitText
          id={`${tile.id}-name`}
          role="control"
          size={14}
          lineHeight={18}
          className="font-app-semibold text-ink"
          slotClassName="w-full"
        >
          {tile.name}
        </FitText>
        {tile.last4 ? (
          <FitText
            id={`${tile.id}-last4`}
            role="control"
            size={12}
            lineHeight={16}
            className="font-app text-muted"
            slotClassName="w-full"
          >
            {`••${tile.last4}`}
          </FitText>
        ) : null}
      </View>

      <View
        testID={tile.selected ? 'source-tile-check' : 'source-tile-radio'}
        className={cn(
          'ml-[6px] h-[20px] w-[20px] items-center justify-center rounded-full',
          tile.selected ? 'bg-control' : 'border-[1.5px] border-muted/40',
        )}
      >
        {tile.selected ? <Check size={12} color={colors.onControl} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}
