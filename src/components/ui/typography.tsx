import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type TextProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Type scale. Sizes step up at the `compact`/`phone` breakpoints so headings
 * stay on a sensible number of lines from a 320pt phone up to a tablet, and
 * every style caps Dynamic Type growth so accessibility sizes never overflow.
 */

/**
 * Screen heading — the one big bold line at the top of a page.
 *
 * Alignment is a prop, not a class: NativeWind will not let a passed
 * `text-left` beat the built-in `text-center`, so that override silently did
 * nothing on pages wanting a left-aligned heading.
 *
 * The gap under the safe area is the component's too, for the same reason: it
 * had drifted to mt-1, mt-2, mt-4, mt-6 and mt-10 across the app, so the first
 * line of every page landed somewhere slightly different. `flush` drops it for
 * the headings that are not the top of a page — one sitting in a row beside an
 * action, or inside a block that sets its own spacing.
 */
export function Title({
  children,
  className,
  align = 'center',
  flush = false,
}: TextProps & { align?: 'center' | 'left'; flush?: boolean }) {
  return (
    <Text
      className={cn(
        'font-poppins-bold text-[24px] leading-8 text-ink compact:text-[26px] phone:text-[28px] phone:leading-9',
        align === 'left' ? 'text-left' : 'text-center',
        flush ? undefined : 'mt-2',
        className,
      )}
      maxFontSizeMultiplier={1.4}
    >
      {children}
    </Text>
  );
}

/**
 * The one section heading in the app.
 *
 * Every list, group and block on every screen is introduced by this and
 * nothing else: the same element was 15, 16, 17, 19, 20 and 21px across the
 * tabs, so swiping between Home, Cards and Insights changed the weight of the
 * page for no reason. One size settles that.
 *
 * The optional caption sits on the same baseline at the far right — the range
 * a list covers, or the window its figures are measured over. It is part of
 * the heading rather than a line of its own, because it only ever qualifies
 * the words next to it.
 */
export function SectionHeading({ children, caption, className }: TextProps & { caption?: string }) {
  return (
    <View className={cn('w-full flex-row items-baseline justify-between gap-3', className)}>
      <Text
        className="shrink font-poppins-semibold text-[17px] text-ink"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {children}
      </Text>
      {caption ? (
        <Text
          className="shrink-0 font-poppins text-[13px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/** Supporting line directly under a Title. */
export function Subtitle({ children, className }: TextProps) {
  return (
    <Text
      className={cn(
        'text-center font-poppins text-[15px] leading-6 text-body phone:text-base',
        className,
      )}
      maxFontSizeMultiplier={1.6}
    >
      {children}
    </Text>
  );
}

/** Paragraph copy. */
export function Body({ children, className }: TextProps) {
  return (
    <Text
      className={cn(
        'font-poppins text-[14px] leading-5 text-body phone:text-[15px] phone:leading-6',
        className,
      )}
      maxFontSizeMultiplier={1.6}
    >
      {children}
    </Text>
  );
}

/** Pull quote — italic, muted, used on the message screen. */
export function Quote({ children, className }: TextProps) {
  return (
    <Text
      className={cn(
        'font-poppins text-[14px] italic leading-5 text-muted phone:text-[15px] phone:leading-6',
        className,
      )}
      maxFontSizeMultiplier={1.6}
    >
      {children}
    </Text>
  );
}

/** Small label sitting above a form control. */
export function FieldLabel({ children, className }: TextProps) {
  return (
    <Text
      className={cn('font-poppins-medium text-[13px] text-body', className)}
      maxFontSizeMultiplier={1.4}
    >
      {children}
    </Text>
  );
}

/** Inline emphasis inside Body/Subtitle copy. */
export function Strong({ children, className }: TextProps) {
  return <Text className={cn('font-poppins-semibold text-ink', className)}>{children}</Text>;
}
