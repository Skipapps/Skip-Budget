import { createElement } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useColors } from '@/providers/theme-provider';
import { useSavingsIcons } from '@/theme/goal-icons';
import { useGradientIcons } from '@/theme/gradient-icons';
import { TEXT_CAP } from '@/theme/text-scale';

/** The art's box, the soft circle in it and the medal badge on the circle's edge, as drawn. */
const ART = { width: 290, height: 206 };
const CIRCLE = { x: 145, y: 109, size: 156 };
const PIG = 104;
const BADGE = { x: 203, y: 161, size: 52, medal: 38 };

/** The confetti's pastels, as drawn; the one dark sparkle is the accent. */
const PLUM = '#C99AB9';
const BLUE = '#A9C7EC';
const PEACH = '#F3B79A';

type Bit =
  | { kind: 'dot'; x: number; y: number; r: number; color: string }
  | { kind: 'dash'; x: number; y: number; angle: number; color: string }
  | { kind: 'sparkle'; x: number; y: number; r: number; color: string | 'accent' };

const CONFETTI: Bit[] = [
  { kind: 'sparkle', x: 50, y: 27, r: 7, color: PLUM },
  { kind: 'dot', x: 70, y: 19, r: 2.5, color: BLUE },
  { kind: 'dot', x: 23, y: 52, r: 3.5, color: PLUM },
  { kind: 'dash', x: 41, y: 92, angle: -30, color: PEACH },
  { kind: 'sparkle', x: 15, y: 118, r: 4.5, color: BLUE },
  { kind: 'dot', x: 49, y: 139, r: 2.5, color: PEACH },
  { kind: 'dot', x: 17, y: 162, r: 3, color: BLUE },
  { kind: 'dash', x: 55, y: 191, angle: -20, color: PLUM },
  { kind: 'dot', x: 220, y: 23, r: 2.5, color: PLUM },
  { kind: 'dot', x: 253, y: 48, r: 3, color: PEACH },
  { kind: 'dash', x: 273, y: 83, angle: 30, color: BLUE },
  { kind: 'sparkle', x: 244, y: 111, r: 5.5, color: 'accent' },
  { kind: 'dot', x: 268, y: 115, r: 2.5, color: PLUM },
  { kind: 'dot', x: 249, y: 182, r: 3, color: BLUE },
  { kind: 'dash', x: 234, y: 201, angle: 30, color: PEACH },
];

/** A four-pointed sparkle with curved sides. */
function sparklePath(x: number, y: number, r: number): string {
  return `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
}

function Confetti() {
  const colors = useColors();
  return (
    <Svg
      testID="wrap-up-confetti"
      width={ART.width}
      height={ART.height}
      viewBox={`0 0 ${ART.width} ${ART.height}`}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {CONFETTI.map((bit, index) => {
        const color = bit.kind === 'sparkle' && bit.color === 'accent' ? colors.accent : bit.color;
        if (bit.kind === 'dot') {
          return <Circle key={index} cx={bit.x} cy={bit.y} r={bit.r} fill={color} />;
        }
        if (bit.kind === 'dash') {
          return (
            <Rect
              key={index}
              x={bit.x - 5}
              y={bit.y - 2}
              width={10}
              height={4}
              rx={2}
              fill={color}
              transform={`rotate(${bit.angle} ${bit.x} ${bit.y})`}
            />
          );
        }
        return <Path key={index} d={sparklePath(bit.x, bit.y, bit.r)} fill={color} />;
      })}
    </Svg>
  );
}

/**
 * The top of the month wrap-up: the pig in a soft circle, and when the month saved something,
 * confetti and a medal. Then the month's name, the headline and a line under it. The art is
 * decoration; the words say it all.
 */
export function WrapUpHero({
  celebrate,
  kicker,
  title,
  subtitle,
}: {
  /** A month that moved money to savings; an overspent one gets the pig alone. */
  celebrate: boolean;
  /** "September wrap-up", drawn in capitals. */
  kicker: string;
  title: string;
  subtitle: string;
}) {
  const { savings: Pig } = useGradientIcons();
  const { medal } = useSavingsIcons();

  return (
    <View testID="wrap-up-hero" className="w-full items-center">
      <View
        style={{ width: ART.width, height: ART.height }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {celebrate ? <Confetti /> : null}
        <View
          className="items-center justify-center rounded-full bg-tint"
          style={{
            position: 'absolute',
            left: CIRCLE.x - CIRCLE.size / 2,
            top: CIRCLE.y - CIRCLE.size / 2,
            width: CIRCLE.size,
            height: CIRCLE.size,
          }}
        >
          <Pig width={PIG} height={PIG} />
        </View>
        {celebrate ? (
          <View
            testID="wrap-up-medal"
            className="items-center justify-center rounded-full border border-line bg-card"
            style={{
              position: 'absolute',
              left: BADGE.x - BADGE.size / 2,
              top: BADGE.y - BADGE.size / 2,
              width: BADGE.size,
              height: BADGE.size,
            }}
          >
            {createElement(medal, { width: BADGE.medal, height: BADGE.medal })}
          </View>
        ) : null}
      </View>

      <Text
        className="mt-[18px] text-center font-app-semibold text-[13px] uppercase tracking-[1.5px] text-accent-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {kicker}
      </Text>
      <Text
        accessibilityRole="header"
        className="mt-[8px] text-center font-app-bold text-[26px] leading-[34px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {title}
      </Text>
      <Text
        className="mt-[8px] text-center font-app text-[15px] leading-[22px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {subtitle}
      </Text>
    </View>
  );
}
