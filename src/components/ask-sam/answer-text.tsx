import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import { t } from '@/i18n';
import { parseAnswer, type Block, type Span } from '@/lib/ask-sam';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

type AnswerTextProps = {
  text: string;
  /** Type for a dark bubble (the person's own messages). */
  inverse?: boolean;
  /** Write the answer out word by word, the way a reply being typed reads. */
  reveal?: boolean;
  /** Set the opening line in bold, as an answer's headline. */
  lead?: boolean;
  onRevealed?: () => void;
};

/** Longer than this, an opening paragraph is the answer itself, not a headline over it. */
const LEAD_MAX = 140;

export function AnswerText({
  text,
  inverse = false,
  reveal = false,
  lead = false,
  onRevealed,
}: AnswerTextProps) {
  const blocks = useMemo(() => parseAnswer(text), [text]);
  const total = useMemo(() => countWords(blocks), [blocks]);
  const shown = useReveal(total, reveal, onRevealed);
  const visible = shown >= total ? blocks : limit(blocks, shown);

  const color = inverse ? 'text-on-control' : 'text-body';
  const strong = inverse ? 'text-on-control' : 'text-ink';
  const paragraph = `font-app text-[15px] leading-[22px] ${color}`;
  const first = blocks[0];
  const headline =
    lead &&
    blocks.length > 1 &&
    first?.type === 'paragraph' &&
    first.spans.reduce((sum, span) => sum + span.text.length, 0) <= LEAD_MAX;

  const spans = (list: Span[]) =>
    list.map((span, index) =>
      span.bold ? (
        <Text key={index} className={`font-app-semibold ${strong}`}>
          {span.text}
        </Text>
      ) : (
        span.text
      ),
    );

  return (
    <View className="gap-2.5">
      {visible.map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <Text
              key={index}
              className={
                headline && index === 0
                  ? `font-app-bold text-[16px] leading-[23px] ${strong}`
                  : paragraph
              }
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {spans(block.spans)}
            </Text>
          );
        }
        return (
          <View key={index} className="gap-1.5">
            {block.items.map((item, itemIndex) => (
              <View key={itemIndex} className="flex-row gap-2">
                <Text
                  className={`${paragraph} min-w-[16px]`}
                  maxFontSizeMultiplier={TEXT_CAP.reading}
                >
                  {block.type === 'steps' ? `${itemIndex + 1}.` : '•'}
                </Text>
                <Text
                  className={`${paragraph} min-w-0 flex-1`}
                  maxFontSizeMultiplier={TEXT_CAP.reading}
                >
                  {spans(item)}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function useReveal(total: number, enabled: boolean, onDone?: () => void): number {
  const [shown, setShown] = useState(enabled ? 0 : total);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (!enabled) {
      done.current?.();
      return;
    }
    // About three-quarters of a second for any answer, so a long one isn't a long wait.
    const step = Math.max(2, Math.round(total / 45));
    let count = 0;
    const timer = setInterval(() => {
      count = Math.min(total, count + step);
      setShown(count);
      if (count >= total) {
        clearInterval(timer);
        done.current?.();
      }
    }, 16);
    return () => clearInterval(timer);
  }, [enabled, total]);

  return shown;
}

function words(text: string): string[] {
  return text.split(/(\s+)/).filter(Boolean);
}

function countWords(blocks: Block[]): number {
  const inSpans = (list: Span[]) =>
    list.reduce(
      (sum, span) => sum + words(span.text).filter((part) => !/^\s+$/.test(part)).length,
      0,
    );
  return blocks.reduce(
    (sum, block) =>
      sum +
      (block.type === 'paragraph'
        ? inSpans(block.spans)
        : block.items.reduce((s, item) => s + inSpans(item), 0)),
    0,
  );
}

function limit(blocks: Block[], max: number): Block[] {
  let left = max;
  const cut = (list: Span[]): Span[] => {
    const out: Span[] = [];
    for (const span of list) {
      if (left <= 0) break;
      let text = '';
      for (const part of words(span.text)) {
        if (/^\s+$/.test(part)) {
          text += part;
          continue;
        }
        if (left <= 0) break;
        text += part;
        left -= 1;
      }
      out.push({ text, bold: span.bold });
    }
    return out;
  };

  const out: Block[] = [];
  for (const block of blocks) {
    if (left <= 0) break;
    if (block.type === 'paragraph') {
      out.push({ type: 'paragraph', spans: cut(block.spans) });
    } else {
      const items: Span[][] = [];
      for (const item of block.items) {
        if (left <= 0) break;
        items.push(cut(item));
      }
      out.push({ type: block.type, items });
    }
  }
  return out;
}

/** Three dots that rise in turn while Sam "types". */
export function TypingDots() {
  const colors = useColors();
  const [phases] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));

  useEffect(() => {
    const loops = phases.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - index) * 150),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [phases]);

  return (
    <View
      className="h-[22px] flex-row items-center gap-1.5"
      accessibilityLabel={t('askSam.typing')}
    >
      {phases.map((value, index) => (
        <Animated.View
          key={index}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.muted,
            opacity: value,
            transform: [
              { translateY: value.interpolate({ inputRange: [0.3, 1], outputRange: [0, -3] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
