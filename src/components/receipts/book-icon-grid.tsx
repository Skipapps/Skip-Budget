import { ChevronUp, Ellipsis } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import {
  BOOK_ICONS,
  BOOK_ICONS_SHOWN,
  bookIconLabelKey,
  type BookIconId,
} from '@/data/receipt-books';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { useBookIcons } from '@/theme/book-icons';

type Tile = { kind: 'icon'; id: BookIconId } | { kind: 'toggle'; open: boolean };

/**
 * Pick a book's icon, four to a row: the first eleven and More, which opens the rest. A chosen icon
 * from the rest keeps them open. The names shrink together, never below their design size; when a
 * word still cannot fit its tile, the grid goes to two wider columns instead.
 */
export function BookIconGrid({
  value,
  onChange,
}: {
  value: BookIconId;
  onChange: (id: BookIconId) => void;
}) {
  const icons = useBookIcons();
  const colors = useColors();
  const names = useFitGroup({ mode: 'shrink' });
  const columns = names.fits ? 4 : 2;
  const chosenLater = BOOK_ICONS.indexOf(value as (typeof BOOK_ICONS)[number]) >= BOOK_ICONS_SHOWN;
  const [open, setOpen] = useState(chosenLater);

  const shown = open ? BOOK_ICONS : BOOK_ICONS.slice(0, BOOK_ICONS_SHOWN);
  const tiles: Tile[] = [
    ...shown.map((id) => ({ kind: 'icon' as const, id })),
    { kind: 'toggle', open },
  ];
  const rows: Tile[][] = [];
  for (let at = 0; at < tiles.length; at += columns) rows.push(tiles.slice(at, at + columns));

  const cell = (
    key: string,
    label: string,
    art: ReactNode,
    selected: boolean,
    onPress: () => void,
    radio: boolean,
  ) => (
    <Pressable
      key={key}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityState={radio ? { selected, checked: selected } : undefined}
      accessibilityLabel={label}
      onPress={() => {
        selection();
        onPress();
      }}
      className={cn(
        'min-w-0 flex-1 items-center rounded-[14px]',
        // The thicker chosen border takes its extra point from the padding, so nothing moves.
        selected
          ? 'border-2 border-ink bg-card px-[5px] pb-[9px] pt-[11px]'
          : 'border border-transparent bg-ink/5 px-[6px] pb-[10px] pt-[12px] active:bg-ink/10',
      )}
    >
      <View
        className="h-[34px] w-[34px] items-center justify-center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {art}
      </View>
      <FitText
        id={`book-icon-${key}`}
        role="control"
        size={12}
        className={cn('text-center font-app-medium', selected ? 'text-ink' : 'text-body')}
        slotClassName="mt-[6px] w-full"
      >
        {label}
      </FitText>
    </Pressable>
  );

  return (
    <FitGroup group={names} className="w-full" testID="book-icon-grid">
      <View accessibilityRole="radiogroup" className="w-full gap-[8px]">
        {rows.map((row, index) => (
          <View key={index} className="w-full flex-row gap-[8px]">
            {row.map((tile) => {
              if (tile.kind === 'toggle') {
                return cell(
                  'toggle',
                  t(tile.open ? 'receipts.books.icon.less' : 'receipts.books.icon.more'),
                  <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-ink/10">
                    {tile.open ? (
                      <ChevronUp size={18} color={colors.ink} strokeWidth={2} />
                    ) : (
                      <Ellipsis size={18} color={colors.ink} strokeWidth={2} />
                    )}
                  </View>,
                  false,
                  () => setOpen(!tile.open),
                  false,
                );
              }
              const Icon = icons[tile.id];
              return cell(
                tile.id,
                t(bookIconLabelKey(tile.id)),
                <Icon width="100%" height="100%" />,
                tile.id === value,
                () => onChange(tile.id),
                true,
              );
            })}
            {/* An odd last row keeps its columns' widths, so the grid still reads as one. */}
            {Array.from({ length: columns - row.length }).map((_, gap) => (
              <View key={`gap-${gap}`} className="flex-1" />
            ))}
          </View>
        ))}
      </View>
    </FitGroup>
  );
}
