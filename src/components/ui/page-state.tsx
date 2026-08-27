import type { FC } from 'react';
import { Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { Illustration } from '@/components/ui/illustration';
import { TextLink } from '@/components/ui/text-link';
import { cn } from '@/lib/cn';

type PageStateProps = {
  art: FC<SvgProps>;
  title: string;
  /** One or two sentences. Says what to do next, not what went wrong twice. */
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Quieter second option — "Try again" under a primary action. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
};

/**
 * The screen shown when a list has nothing to show — empty, errored, or
 * filtered down to nothing.
 *
 * One component for all three because they are the same layout with different
 * words, and because a page that renders a spinner for loading, raw text for
 * errors and a custom block for empty ends up feeling like three apps.
 *
 * Artwork is capped well below the tile art elsewhere: this sits inside a list
 * that already has a header and a search field, and a full-size illustration
 * pushes the action button off a small screen.
 */
export function PageState({
  art,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
}: PageStateProps) {
  return (
    <View className={cn('w-full flex-1 items-center justify-center px-2 py-10', className)}>
      <Illustration source={art} widthRatio={0.58} maxWidth={220} />

      <Text
        className="mt-7 text-center font-poppins-semibold text-[19px] leading-6 text-ink"
        maxFontSizeMultiplier={1.4}
      >
        {title}
      </Text>

      <Text
        className="mt-2.5 max-w-[320px] text-center font-poppins text-[14px] leading-5 text-muted"
        maxFontSizeMultiplier={1.4}
      >
        {message}
      </Text>

      {actionLabel && onAction ? (
        <View className="mt-7 w-full max-w-[280px]">
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}

      {secondaryLabel && onSecondary ? (
        <TextLink label={secondaryLabel} variant="subtle" onPress={onSecondary} className="mt-4" />
      ) : null}
    </View>
  );
}
