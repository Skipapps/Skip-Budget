import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { planTurn, type Turn } from '@/lib/odometer';

/** Weighty rather than quick — a wheel with something behind it. */
const DURATION_MS = 700;
/** The ones wheel leads and the rest follow, as on a real odometer. */
const STAGGER_MS = 45;
const MAX_STAGGER_MS = 180;

type WheelProps = {
  digit: number;
  /** The whole figure, so every wheel turns the same way the number moved. */
  value: number;
  lineHeight: number;
  fontSize?: number;
  delay: number;
  textClassName?: string;
};

/**
 * One digit wheel.
 *
 * At rest it is a single piece of text — no strip, no transform, nothing
 * animating. A strip only exists while the wheel is actually turning, and only
 * carries the faces that turn crosses. That is what keeps a screenful of
 * figures cheap: the resting state, which is nearly all of the time, costs the
 * same as printing the number.
 *
 * It also means the settled digit is simply rendered rather than arrived at.
 * An animation cut short cannot leave the wheel showing the wrong number.
 */
function Wheel({ digit, value, lineHeight, fontSize, delay, textClassName }: WheelProps) {
  const reduced = useReducedMotion();
  const [turn, setTurn] = useState<Turn | null>(null);
  const offset = useSharedValue(0);

  const lastDigit = useRef(digit);
  const lastValue = useRef(value);

  useEffect(() => {
    const from = lastDigit.current;
    const forwards = value >= lastValue.current;
    lastDigit.current = digit;
    lastValue.current = value;

    // A wheel whose digit did not change does not move at all — that is what
    // keeps a refresh which found nothing new completely still.
    if (from === digit || reduced) return;

    setTurn(planTurn(from, digit, forwards, lineHeight));
  }, [digit, value, lineHeight, reduced]);

  useEffect(() => {
    if (!turn) return;

    offset.value = turn.startOffset;
    offset.value = withDelay(
      delay,
      withTiming(
        turn.endOffset,
        { duration: DURATION_MS, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          'worklet';
          // Drop back to plain text once it lands, so nothing is left mounted
          // that only existed to move.
          if (finished) runOnJS(setTurn)(null);
        },
      ),
    );
  }, [turn, delay, offset]);

  const style = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ translateY: offset.value }] };
  });

  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }}>
      {turn ? (
        <Animated.View style={style}>
          {turn.faces.map((face, index) => (
            <Text
              key={index}
              className={textClassName}
              style={{ lineHeight, fontSize, textAlign: 'center' }}
              allowFontScaling={false}
            >
              {face}
            </Text>
          ))}
        </Animated.View>
      ) : (
        <Text
          className={textClassName}
          style={{ lineHeight, fontSize, textAlign: 'center' }}
          allowFontScaling={false}
        >
          {digit}
        </Text>
      )}
    </View>
  );
}

type RollingNumberProps = {
  value: number;
  /** Must be explicit: the wheel maths is a multiple of one line's height. */
  lineHeight: number;
  /**
   * Overrides the size set in `textClassName`.
   *
   * Wheels cannot shrink to fit the way a plain Text can, so a caller holding
   * a figure of unknown length has to choose the size up front rather than
   * letting the layout discover the overflow too late.
   */
  fontSize?: number;
  /** Carries font family, size and colour — everything but the line height. */
  textClassName?: string;
  className?: string;
  cents?: boolean;
};

/**
 * A currency figure whose digits turn like an odometer.
 *
 * Only the digits that actually changed move, and only by the distance between
 * the old digit and the new one. A figure that came back identical does not
 * move at all — the animation is there to say "this changed", so spinning it
 * on every refresh would say that when it was not true.
 *
 * Separators hold still. Wheels are keyed by their distance from the right, so
 * the cents stay on the same wheel when a figure grows a digit.
 */
export function RollingNumber({
  value,
  lineHeight,
  fontSize,
  textClassName,
  className,
  cents = true,
}: RollingNumberProps) {
  const characters = formatCurrency(value, { cents }).split('');

  // Walked right to left so each digit knows its place from the end, which is
  // what keeps the cents on the same wheel when a figure grows a digit — and
  // what lets the ones wheel lead the stagger. Built before the render rather
  // than counted inside it, so nothing is reassigned mid-tree.
  const faces: { character: string; isDigit: boolean; fromRight: number; delay: number }[] = [];
  let digitsSeen = 0;
  for (let fromRight = 0; fromRight < characters.length; fromRight += 1) {
    const character = characters[characters.length - 1 - fromRight];
    const isDigit = character >= '0' && character <= '9';
    faces.unshift({
      character,
      isDigit,
      fromRight,
      delay: isDigit ? Math.min(digitsSeen * STAGGER_MS, MAX_STAGGER_MS) : 0,
    });
    if (isDigit) digitsSeen += 1;
  }

  return (
    <View className={cn('flex-row items-center justify-center', className)}>
      {faces.map(({ character, isDigit, fromRight, delay }) =>
        isDigit ? (
          <Wheel
            key={`d${fromRight}`}
            digit={Number(character)}
            value={value}
            lineHeight={lineHeight}
            fontSize={fontSize}
            delay={delay}
            textClassName={textClassName}
          />
        ) : (
          <Text
            key={`s${fromRight}-${character}`}
            className={textClassName}
            style={{ lineHeight, fontSize }}
            allowFontScaling={false}
          >
            {character}
          </Text>
        ),
      )}
    </View>
  );
}
