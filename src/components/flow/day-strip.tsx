import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { TEXT_CAP } from '@/theme/text-scale';

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const CHIP = 44;
const GAP = 8;

type DayStripProps = {
  /** 1–31, or null when no day is chosen. */
  value: number | null;
  /** Null when the chosen day is pressed again, unless the day is `required`. */
  onChange: (day: number | null) => void;
  /** A day must stay chosen: pressing the chosen one keeps it. */
  required?: boolean;
  /**
   * The edges the strip runs to: the screen's (past the page's gutter) or, inside a card, the
   * card's (past its 16pt padding; give the card overflow-hidden).
   */
  bleed?: 'page' | 'card';
};

/**
 * The days of a month in one scrolling row, running to the screen's (or its card's) edges. The
 * chosen day is brought into view when the strip appears and whenever it changes.
 */
export function DayStrip({ value, onChange, required = false, bleed = 'page' }: DayStripProps) {
  const scroll = useRef<ScrollView>(null);
  const [column, setColumn] = useState(0);
  const [width, setWidth] = useState(0);
  const placed = useRef(false);
  // The strip runs past the padding around it (the page's or the card's) to that edge; padding it
  // back by the same amount lines the first day up with the fields above.
  const gutter = width && column ? (width - column) / 2 : 0;

  useEffect(() => {
    if (!value || !width || !column) return;
    const centre = gutter + (value - 1) * (CHIP + GAP) + CHIP / 2;
    scroll.current?.scrollTo({ x: Math.max(0, centre - width / 2), animated: placed.current });
    placed.current = true;
  }, [value, width, column, gutter]);

  return (
    <View
      className="w-full"
      testID="day-strip"
      onLayout={(event) => setColumn(event.nativeEvent.layout.width)}
    >
      <View
        className={bleed === 'card' ? '-mx-4' : '-mx-6'}
        testID="day-strip-bleed"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        // Drawn once the padding is known, so the days never jump sideways into place.
        style={{ opacity: width && column ? 1 : 0 }}
      >
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          contentContainerStyle={{ paddingHorizontal: gutter, gap: GAP }}
        >
          {DAYS.map((day) => {
            const selected = day === value;
            return (
              <Pressable
                key={day}
                accessibilityRole="radio"
                accessibilityLabel={t('cards.add.dayLabel', { day })}
                accessibilityHint={selected && !required ? t('cards.add.dayClearHint') : undefined}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => {
                  selection();
                  onChange(selected && !required ? null : day);
                }}
                style={{ minWidth: CHIP }}
                className={cn(
                  'min-h-[56px] items-center justify-center rounded-[12px] border px-1',
                  selected ? 'border-control bg-control' : 'border-line bg-card active:bg-ink/5',
                )}
              >
                <Text
                  className={cn(
                    'font-app-semibold text-[16px]',
                    selected ? 'text-on-control' : 'text-ink',
                  )}
                  maxFontSizeMultiplier={TEXT_CAP.control}
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
