import { Text } from 'react-native';

import { cn } from '@/lib/cn';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The line under a payoff's amount: what clears the loan before anything is typed, then what the
 * amount does, or why it cannot be paid.
 */
export type PayoffLineWords = {
  shown: string;
  /** Dates said in full, as VoiceOver should read them. */
  spoken: string;
  tone: 'hint' | 'outcome' | 'refusal';
} | null;

const TONE = {
  hint: 'text-muted',
  outcome: 'text-ink',
  refusal: 'text-danger',
} as const;

export function PayoffLine({
  words,
  className,
  testID,
}: {
  words: PayoffLineWords;
  className?: string;
  testID?: string;
}) {
  if (!words) return null;
  return (
    <Text
      accessibilityLabel={words.spoken}
      accessibilityLiveRegion="polite"
      testID={testID}
      className={cn('w-full font-app text-[14px] leading-5', TONE[words.tone], className)}
      maxFontSizeMultiplier={TEXT_CAP.reading}
    >
      {words.shown}
    </Text>
  );
}
