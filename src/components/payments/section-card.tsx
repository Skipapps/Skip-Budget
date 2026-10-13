import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Text, View, type AccessibilityRole } from 'react-native';

import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

type SectionCardProps = {
  /** The name over the card: "Coming up", "October 2026", "Filters". */
  title?: string;
  /** On the title's line, at the right: a count or a total. */
  caption?: string;
  /** The title line as VoiceOver reads it, when the caption needs words to make sense. */
  titleA11y?: string;
  /**
   * `heading` introduces a part of the page; `label` is the small muted name over a group of
   * controls (Recent, Filters).
   */
  titleTone?: 'heading' | 'label';
  /** The card's own role, such as `radiogroup` for a list of choices. */
  accessibilityRole?: AccessibilityRole;
  /** One row each, with a hairline drawn between them. */
  children: ReactNode;
  /** Where the card itself starts below the title, for a page that scrolls a row into view. */
  onCardLayout?: (y: number) => void;
  className?: string;
  testID?: string;
};

/**
 * A white card of rows under an optional title. The card has no sides of its own: each row brings
 * its 16pt, so a pressed row lights the card's full width while the hairlines stay inset.
 */
export function SectionCard({
  title,
  caption,
  titleA11y,
  titleTone = 'heading',
  accessibilityRole,
  children,
  onCardLayout,
  className,
  testID,
}: SectionCardProps) {
  const rows = Children.toArray(children);

  return (
    <View className={cn('w-full', className)} testID={testID}>
      {title ? (
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={titleA11y ?? (caption ? `${title}, ${caption}` : title)}
          className="w-full flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-[4px]"
        >
          <Text
            className={cn(
              'shrink',
              titleTone === 'heading'
                ? 'font-app-semibold text-[17px] text-ink'
                : 'font-app-medium text-[13px] text-muted',
            )}
            maxFontSizeMultiplier={TEXT_CAP.heading}
          >
            {title}
          </Text>
          {caption ? (
            <Text
              className="shrink font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.heading}
            >
              {caption}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        accessibilityRole={accessibilityRole}
        testID={testID ? `${testID}-card` : undefined}
        onLayout={onCardLayout ? (event) => onCardLayout(event.nativeEvent.layout.y) : undefined}
        className={cn(
          'w-full overflow-hidden rounded-[20px] border border-line bg-card',
          title && (titleTone === 'heading' ? 'mt-[10px]' : 'mt-[8px]'),
        )}
      >
        {rows.map((row, index) => (
          <Fragment key={isValidElement(row) && row.key !== null ? row.key : index}>
            {index > 0 ? (
              <View testID="section-card-rule" className="mx-[16px] h-px bg-line" />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}
