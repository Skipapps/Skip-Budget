import type { ReactNode } from 'react';
import { Text } from 'react-native';

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
 */
export function Title({
  children,
  className,
  align = 'center',
}: TextProps & { align?: 'center' | 'left' }) {
  return (
    <Text
      className={cn(
        'font-poppins-bold text-[24px] leading-8 text-ink compact:text-[26px] phone:text-[28px] phone:leading-9',
        align === 'left' ? 'text-left' : 'text-center',
        className,
      )}
      maxFontSizeMultiplier={1.4}
    >
      {children}
    </Text>
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
