import { Fragment, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme/colors';

/**
 * What each slice of the period cost.
 *
 * Spending only. Income is in the list below and in the totals above, but it
 * is not a bar here: one measure per chart means every bar is comparable to
 * every other at a glance, where mixing two directions asks the reader to
 * work out which is which before they can read the shape at all.
 *
 * Every bar carries its own figure. A chart you have to tap to interrogate is
 * a chart that has not answered the question yet.
 */

const BAR = colors.control;
const AXIS = '#DCDCDC';

export type FlowBucket = {
  /** Identity for the slice; also its React key. */
  key: string;
  /** Axis label. Short — a phone fits about six characters per bar. */
  label: string;
  /** Positive magnitude of what went out. */
  spent: number;
};

const HEIGHT = 132;
/** Room above the tallest bar for its figure to sit without clipping. */
const LABEL_ROOM = 18;
const GAP = 2;
/** So a real but tiny amount is still a visible mark rather than nothing. */
const MIN_MARK = 3;

/**
 * Money short enough to sit on a bar.
 *
 * Twelve months across a phone leaves under thirty points per bar, which is
 * not enough for "$1,234.56" at any readable size. Thousands collapse and
 * cents go: on a bar the figure is for comparing, and the exact number is a
 * row away in the list underneath.
 */
function compact(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `$${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

/** A bar with its top corners rounded, anchored square to the baseline. */
function barPath(x: number, width: number, baseY: number, topY: number): string {
  const radius = Math.min(4, width / 2, baseY - topY);
  return (
    `M${x},${baseY} L${x},${topY + radius} Q${x},${topY} ${x + radius},${topY} ` +
    `L${x + width - radius},${topY} Q${x + width},${topY} ${x + width},${topY + radius} ` +
    `L${x + width},${baseY} Z`
  );
}

export function FlowChart({ buckets }: { buckets: FlowBucket[] }) {
  const [width, setWidth] = useState(0);

  const peak = Math.max(1, ...buckets.map((bucket) => bucket.spent));
  const slotWidth = buckets.length > 0 ? width / buckets.length : 0;
  const barWidth = Math.max(3, slotWidth - GAP * 2);
  const baseY = HEIGHT;

  const topOf = (value: number) => {
    if (value <= 0) return baseY;
    const room = HEIGHT - LABEL_ROOM;
    return baseY - Math.max(MIN_MARK, (value / peak) * room);
  };

  return (
    <View className="w-full">
      <View className="w-full" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Line x1={0} y1={baseY} x2={width} y2={baseY} stroke={AXIS} strokeWidth={1} />
            {buckets.map((bucket, index) => {
              const x = index * slotWidth + GAP;
              const topY = topOf(bucket.spent);

              return (
                <Fragment key={bucket.key}>
                  {bucket.spent > 0 ? (
                    <>
                      <Path d={barPath(x, barWidth, baseY, topY)} fill={BAR} />
                      {/* Nothing to say about a slice where nothing went out,
                          so a zero bar carries no figure either. */}
                      <SvgText
                        x={x + barWidth / 2}
                        y={topY - 6}
                        fill={colors.body}
                        fontSize={10}
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {compact(bucket.spent)}
                      </SvgText>
                    </>
                  ) : null}
                </Fragment>
              );
            })}
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} />
        )}
      </View>

      <View className="mt-1.5 w-full flex-row">
        {buckets.map((bucket) => (
          <View key={bucket.key} style={{ width: slotWidth }} className="items-center">
            {slotWidth > 22 ? (
              <Text
                className="font-poppins text-[11px] text-muted"
                numberOfLines={1}
                allowFontScaling={false}
              >
                {bucket.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
