import { Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BookIcon } from '@/components/receipts/book-icon';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type BookPill = { key: string; name: string; iconId: string };

/** The tip's line and its arrow, kept clear above the pills. */
const TIP_ROOM = 44;
/** The page's own gutter (Screen's px-6). */
const GUTTER = 24;
/** How much of the pill before the chosen one stays in view, so the row reads as scrollable. */
const LEAD = 24;

/**
 * The receipt books, one pill each with its icon and name, then Add book, in one row that scrolls
 * sideways. The chosen book is filled in ink. `tip` points "Tap to start" at Add book, for someone
 * with no book yet.
 */
export function BookPills({
  books,
  selected,
  onSelect,
  onAdd,
  tip = false,
}: {
  books: readonly BookPill[];
  selected: string;
  onSelect: (key: string) => void;
  onAdd: () => void;
  tip?: boolean;
}) {
  const colors = useColors();
  const scroller = useRef<ScrollView>(null);
  const places = useRef(new Map<string, number>());
  const [add, setAdd] = useState<{ x: number; width: number } | null>(null);
  const [tipWidth, setTipWidth] = useState(0);

  // A book chosen off-screen (a new one lands at the end) is scrolled into view.
  useEffect(() => {
    const x = places.current.get(selected);
    if (x !== undefined) scroller.current?.scrollTo({ x: Math.max(0, x - LEAD), animated: true });
  }, [selected, books.length]);

  const tipLeft = add ? Math.max(0, add.x + add.width / 2 - tipWidth / 2) : 0;

  return (
    // Bleeds to the screen's edges, so a pill scrolls out under them rather than at the gutter.
    <View className="mt-4 w-full">
      <View className="-mx-6">
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel={t('receipts.books.row')}
          contentContainerStyle={{ paddingHorizontal: GUTTER }}
        >
          <View style={tip ? { paddingTop: TIP_ROOM } : undefined}>
            {tip ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('receipts.books.tapToStart')}
                onPress={onAdd}
                onLayout={(event) => setTipWidth(event.nativeEvent.layout.width)}
                style={{ position: 'absolute', top: 0, left: tipLeft, opacity: add ? 1 : 0 }}
                className="items-center"
              >
                <View className="rounded-[8px] bg-ink px-3 py-1.5">
                  <Text
                    className="font-app-semibold text-[13px] text-surface"
                    maxFontSizeMultiplier={TEXT_CAP.control}
                  >
                    {t('receipts.books.tapToStart')}
                  </Text>
                </View>
                <View
                  className="-mt-[5px] h-[10px] w-[10px] bg-ink"
                  style={{ transform: [{ rotate: '45deg' }] }}
                />
              </Pressable>
            ) : null}

            <View accessibilityRole="tablist" className="flex-row items-center gap-2">
              {books.map((book) => {
                const chosen = book.key === selected;
                return (
                  <Pressable
                    key={book.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: chosen }}
                    accessibilityLabel={book.name}
                    accessibilityHint={t('receipts.books.showing', { name: book.name })}
                    onLayout={(event) => places.current.set(book.key, event.nativeEvent.layout.x)}
                    onPress={() => {
                      if (chosen) return;
                      selection();
                      onSelect(book.key);
                    }}
                    className={cn(
                      'min-h-[38px] flex-row items-center gap-1.5 rounded-full border py-1 pl-1 pr-3.5',
                      chosen ? 'border-ink bg-ink' : 'border-line bg-card active:bg-ink/5',
                    )}
                  >
                    {/* On a well of card colour, so the gradient reads on the ink pill too. */}
                    <View className="h-[28px] w-[28px] items-center justify-center rounded-full bg-card">
                      <BookIcon iconId={book.iconId} size={20} />
                    </View>
                    <Text
                      className={cn(
                        'font-app-medium text-[13px]',
                        chosen ? 'text-surface' : 'text-ink',
                      )}
                      maxFontSizeMultiplier={TEXT_CAP.control}
                    >
                      {book.name}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('receipts.books.add')}
                onPress={onAdd}
                onLayout={(event) =>
                  setAdd({ x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width })
                }
                className="min-h-[38px] flex-row items-center gap-1 rounded-full border border-dashed border-ink/60 px-3.5 py-1 active:bg-ink/5"
              >
                <Plus size={15} color={colors.ink} strokeWidth={2.2} />
                <Text
                  className="font-app-medium text-[13px] text-ink"
                  maxFontSizeMultiplier={TEXT_CAP.control}
                >
                  {t('receipts.books.add')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
