import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type TextProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Type scale. Sizes step up at the `compact`/`phone` breakpoints, and every style caps Dynamic Type
 * growth (`maxFontSizeMultiplier`) so accessibility sizes never overflow.
 */

/**
 * Screen heading: the one big bold line at the top of a page.
 *
 * Alignment is a prop, not a class: NativeWind will not let a passed `text-left` beat the built-in
 * `text-center`. The gap under the safe area belongs to the component so every page's first line
 * lands in the same place; `flush` drops it for headings that are not the top of a page.
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
        'font-app-bold text-[24px] leading-8 text-ink compact:text-[26px] phone:text-[28px] phone:leading-9',
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
 * The one section heading in the app: every list, group and block is introduced by this, at one size.
 * The optional caption sits on the same baseline at the far right (the range a list covers) and only
 * qualifies the words next to it.
 */
export function SectionHeading({ children, caption, className }: TextProps & { caption?: string }) {
  return (
    <View className={cn('w-full flex-row items-baseline justify-between gap-3', className)}>
      <Text
        className="shrink font-app-semibold text-[17px] text-ink"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {children}
      </Text>
      {caption ? (
        <Text
          className="shrink-0 font-app text-[13px] text-muted"
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Supporting line directly under a Title. Alignment is a prop, as on Title, because `cn` joins
 * classes rather than merging them: a passed `text-left` sits beside `text-center`, and the centre wins.
 */
export function Subtitle({
  children,
  className,
  align = 'center',
}: TextProps & { align?: 'center' | 'left' }) {
  return (
    <Text
      className={cn(
        'font-app text-[15px] leading-6 text-body phone:text-base',
        align === 'left' ? 'text-left' : 'text-center',
        className,
      )}
      maxFontSizeMultiplier={1.6}
    >
      {children}
    </Text>
  );
}

export function Body({ children, className }: TextProps) {
  return (
    <Text
      className={cn(
        'font-app text-[14px] leading-5 text-body phone:text-[15px] phone:leading-6',
        className,
      )}
      maxFontSizeMultiplier={1.6}
    >
      {children}
    </Text>
  );
}

export function FieldLabel({ children, className }: TextProps) {
  return (
    <Text
      className={cn('font-app-medium text-[13px] text-body', className)}
      maxFontSizeMultiplier={1.4}
    >
      {children}
    </Text>
  );
}

export function Strong({ children, className }: TextProps) {
  return <Text className={cn('font-app-semibold text-ink', className)}>{children}</Text>;
}
