import { memo } from 'react';
import { Text, View } from 'react-native';

import { sentenceText, VOICE_EXAMPLES } from '@/data/voice-examples';
import { cn } from '@/lib/cn';

/**
 * Three things to say, as quiet text above the mic, the way chat apps show starter prompts: not
 * tappable, no cards or quotes. Ink at 40% (20% is the empty speech area's "Listening…", which
 * only marks a place).
 *
 * The sentences come from src/data/voice-examples.ts, which the parser's catalog test reads too,
 * so every hint is one Skip is proven to read back.
 *
 * Hidden by fading out, not by leaving: the mic sits right under them, and a stack that collapsed
 * the moment a thumb went down would pull the button out from under it.
 */
export const VoiceHints = memo(function VoiceHints({ hidden }: { hidden: boolean }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      className={cn('w-full items-center gap-2.5', hidden && 'opacity-0')}
    >
      {VOICE_EXAMPLES.map((example) => {
        const said = sentenceText(example.parts);
        return (
          <Text
            key={said}
            className="text-center font-app text-[15px] leading-6 text-ink/40"
            maxFontSizeMultiplier={1.3}
          >
            {said}
          </Text>
        );
      })}
    </View>
  );
});
