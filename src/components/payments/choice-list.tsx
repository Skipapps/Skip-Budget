import { Check } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ProBadge } from '@/components/payments/pro-badge';
import { SectionCard } from '@/components/payments/section-card';
import { cn } from '@/lib/cn';
import { selection } from '@/lib/haptics';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

export type ChoiceItem<T extends string | number> = {
  value: T;
  label: string;
  /** A muted second line: "2026", "2020 – 2026". */
  caption?: string;
  /** Draws the Pro badge after the label. */
  pro?: boolean;
  /** Read in place of the label and caption, e.g. "2024, older history with Pro". */
  accessibilityLabel?: string;
  /**
   * A row that opens another page instead of being a choice (All years): read as a link, never
   * ticked, so VoiceOver does not call it an unselected option.
   */
  link?: boolean;
};

/**
 * Pick one from a white card of rows, the chosen one ticked in the accent: a month, a year, a date
 * range, an account. The label and its badge wrap onto more lines at large text; the tick stays on
 * the right.
 */
export function ChoiceList<T extends string | number>({
  items,
  value,
  onChoose,
  title,
  onTickedLayout,
  className,
  testID = 'choice-list',
}: {
  items: readonly ChoiceItem<T>[];
  /** Null ticks nothing. Never what the choices' type is read from, so a literal cannot narrow it. */
  value: NoInfer<T> | null;
  onChoose: (value: T) => void;
  /** A small label over the card. */
  title?: string;
  /** Where the ticked row sits in the list (its top from the list's top) and how tall it is. */
  onTickedLayout?: (top: number, height: number) => void;
  className?: string;
  testID?: string;
}) {
  const colors = useColors();
  // The row is laid out inside the card, and the card under the title; both are needed.
  const place = useRef<{ card?: number; row?: { y: number; height: number } }>({});
  const report = () => {
    const { card, row } = place.current;
    if (card !== undefined && row) onTickedLayout?.(card + row.y, row.height);
  };

  return (
    <SectionCard
      title={title}
      titleTone="label"
      accessibilityRole="radiogroup"
      onCardLayout={
        onTickedLayout
          ? (y) => {
              place.current.card = y;
              report();
            }
          : undefined
      }
      className={className}
      testID={testID}
    >
      {items.map((item) => {
        const link = item.link === true;
        const selected = !link && item.value === value;
        const spoken =
          item.accessibilityLabel ?? (item.caption ? `${item.label}, ${item.caption}` : item.label);
        return (
          <Pressable
            key={String(item.value)}
            accessibilityRole={link ? 'link' : 'radio'}
            accessibilityLabel={spoken}
            accessibilityState={link ? undefined : { selected, checked: selected }}
            onPress={() => {
              selection();
              onChoose(item.value);
            }}
            testID={`${testID}-${String(item.value)}`}
            onLayout={
              selected && onTickedLayout
                ? (event) => {
                    const { y, height } = event.nativeEvent.layout;
                    place.current.row = { y, height };
                    report();
                  }
                : undefined
            }
            className="min-h-[52px] w-full flex-row items-center gap-3 px-[16px] py-[12px] active:bg-ink/5"
          >
            <View className="min-w-0 flex-1">
              <View className="w-full flex-row flex-wrap items-center gap-x-[8px] gap-y-[2px]">
                <Text
                  className={cn(
                    'shrink text-[15px]',
                    selected ? 'font-app-semibold text-ink' : 'font-app text-body',
                  )}
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {item.label}
                </Text>
                {item.pro ? <ProBadge /> : null}
              </View>
              {item.caption ? (
                <Text
                  className="mt-[2px] font-app text-[12px] text-muted"
                  maxFontSizeMultiplier={TEXT_CAP.row}
                >
                  {item.caption}
                </Text>
              ) : null}
            </View>
            {selected ? <Check size={20} color={colors.accentInk} strokeWidth={2.2} /> : null}
          </Pressable>
        );
      })}
    </SectionCard>
  );
}
