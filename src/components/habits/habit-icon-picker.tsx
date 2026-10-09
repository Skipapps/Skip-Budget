import { createElement, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { HABIT_ICON_CATEGORIES, type HabitIconId } from '@/data/habit-icons';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { useTheme } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

const CIRCLE = 48;
/** The ring's 2pt plus the 2pt of page between it and the circle, on each side. */
const RING = CIRCLE + 8;
const ART = Math.round(CIRCLE * 0.6);
/** Each cell's inset on either side, so neighbouring labels never touch. */
const CELL_INSET = 2;
const COLUMN_STEPS = [4, 3, 2] as const;

/** Breaks a line may take; a no-break space keeps its words together. */
const BREAKABLE_SPACE = /[^\S   ]+/;

/**
 * The most columns whose cells still hold the widest word of any label, so a word is never cut and
 * every section keeps the same columns. Two at the least: a label wraps between its words there.
 */
export function iconColumns(box: number, widestWord: number): number {
  if (!(box > 0) || !(widestWord > 0)) return COLUMN_STEPS[0];
  const fits = COLUMN_STEPS.find((columns) => box / columns - CELL_INSET * 2 >= widestWord + 1);
  return fits ?? COLUMN_STEPS[COLUMN_STEPS.length - 1];
}

/** The width a host view was laid out at, where the renderer can say before the first frame. */
function laidOutWidth(node: unknown): number | undefined {
  const host = node as { getBoundingClientRect?: () => { width: number } } | null;
  return typeof host?.getBoundingClientRect === 'function'
    ? host.getBoundingClientRect().width
    : undefined;
}

/**
 * Every habit icon, grouped under its category's heading, each on its own circle in the category's
 * tint. The labels wrap freely; the number of columns comes from the widest word among them at the
 * text size in use, measured from an unseen copy, so it changes with the language and text size.
 */
export function HabitIconPicker({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (id: HabitIconId) => void;
}) {
  const { scheme } = useTheme();
  const { fontScale, width: windowWidth } = useWindowDimensions();
  const box = useRef<View>(null);
  const copy = useRef<Text>(null);
  const [widths, setWidths] = useState({ box: 0, word: 0 });

  const sections = HABIT_ICON_CATEGORIES.map((category) => ({
    ...category,
    heading: t(category.label),
    icons: category.icons.map((icon) => ({ ...icon, name: t(icon.label) })),
  }));
  const words = sections
    .flatMap((section) => section.icons.flatMap((icon) => icon.name.trim().split(BREAKABLE_SPACE)))
    .join('\n');

  // Read before the first frame where the renderer allows, so large text does not open on four
  // columns and then jump.
  useLayoutEffect(() => {
    const boxWidth = laidOutWidth(box.current);
    const wordWidth = laidOutWidth(copy.current);
    if (boxWidth === undefined || wordWidth === undefined) return;
    setWidths((held) =>
      held.box === boxWidth && held.word === wordWidth ? held : { box: boxWidth, word: wordWidth },
    );
  }, [words, fontScale, windowWidth]);

  const columns = iconColumns(widths.box, widths.word);

  return (
    <View
      ref={box}
      testID="habit-icon-picker"
      className="w-full gap-4"
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setWidths((held) => (held.box === width ? held : { ...held, box: width }));
      }}
    >
      <View
        style={{ position: 'absolute', left: 0, top: 0, width: 4000, opacity: 0 }}
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          ref={copy}
          testID="habit-icon-picker-words"
          className="self-start font-app text-[11px]"
          maxFontSizeMultiplier={TEXT_CAP.control}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            setWidths((held) => (held.word === width ? held : { ...held, word: width }));
          }}
        >
          {words}
        </Text>
      </View>

      {sections.map((section) => (
        <View key={section.id} className="w-full">
          <Text
            accessibilityRole="header"
            className="mb-2 font-app-semibold text-[13px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {section.heading}
          </Text>

          <View className="w-full flex-row flex-wrap" testID={`habit-icon-grid-${section.id}`}>
            {section.icons.map((icon) => {
              const selected = icon.id === value;
              return (
                <Pressable
                  key={icon.id}
                  accessibilityRole="button"
                  accessibilityLabel={icon.name}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    selection();
                    onPick(icon.id);
                  }}
                  style={{ width: `${100 / columns}%`, paddingHorizontal: CELL_INSET }}
                  className="min-h-[76px] items-center rounded-[14px] pb-2 pt-1 active:opacity-70"
                >
                  <View
                    style={{ width: RING, height: RING }}
                    className={cn(
                      'items-center justify-center rounded-full border-2',
                      selected ? 'border-ink' : 'border-transparent',
                    )}
                  >
                    <View
                      style={{
                        width: CIRCLE,
                        height: CIRCLE,
                        backgroundColor: section.tint[scheme],
                      }}
                      className="items-center justify-center rounded-full"
                    >
                      {createElement(icon.Svg, { width: ART, height: ART })}
                    </View>
                  </View>
                  <Text
                    className="mt-1 w-full text-center font-app text-[11px] text-body"
                    maxFontSizeMultiplier={TEXT_CAP.control}
                  >
                    {icon.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
