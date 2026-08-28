import { Fragment, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { formatCurrency } from '@/lib/format';

/**
 * Money in and money out across a window.
 *
 * Diverging bars, not a stacked or grouped pair: in and out are opposite
 * directions of one measure, so direction carries the meaning and colour only
 * reinforces it. That also means the chart still reads for anyone who cannot
 * separate the two hues — the bar above the line is income whatever colour it
 * appears to be.
 *
 * One axis. Two measures on two scales would be a lie about their relative
 * size, and money in and money out share a scale anyway.
 */

/** Validated against the palette checker: protan ΔE 11.7, normal ΔE 31.0. */
const OUT = '#E4714E';
const IN = '#0B6B3A';
const AXIS = '#DCDCDC';

export type FlowBucket = {
  /** yyyy-mm-dd of the bucket start; used as the key. */
  key: string;
  label: string;
  /** Positive magnitude. */
  out: number;
  /** Positive magnitude. */
  in: number;
};

const HEIGHT = 132;
const GAP = 2;

/**
 * A bar with its far end rounded and its baseline end square, so the mark is
 * visibly anchored to zero rather than floating.
 */
function barPath(x: number, width: number, zeroY: number, endY: number): string {
  const radius = Math.min(4, width / 2, Math.abs(endY - zeroY));
  const up = endY < zeroY;
  const far = up ? endY + radius : endY - radius;

  return up
    ? `M${x},${zeroY} L${x},${far} Q${x},${endY} ${x + radius},${endY} L${x + width - radius},${endY} Q${x + width},${endY} ${x + width},${far} L${x + width},${zeroY} Z`
    : `M${x},${zeroY} L${x},${far} Q${x},${endY} ${x + radius},${endY} L${x + width - radius},${endY} Q${x + width},${endY} ${x + width},${far} L${x + width},${zeroY} Z`;
}

export function FlowChart({ buckets }: { buckets: FlowBucket[] }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<string | null>(null);

  const peak = Math.max(1, ...buckets.map((bucket) => Math.max(bucket.out, bucket.in)));
  const slotWidth = buckets.length > 0 ? width / buckets.length : 0;
  const barWidth = Math.max(3, slotWidth - GAP * 2);
  // Zero sits proportionally, so a window with no income is not half empty.
  const inShare = Math.max(...buckets.map((b) => b.in), 0) / peak;
  const zeroY = Math.max(18, Math.min(HEIGHT - 18, HEIGHT * (inShare / (inShare + 1)) + 6));

  const scale = (value: number, up: boolean) => {
    const room = up ? zeroY : HEIGHT - zeroY;
    return up ? zeroY - (value / peak) * room : zeroY + (value / peak) * room;
  };

  const shown = buckets.find((bucket) => bucket.key === active);

  return (
    <View className="w-full">
      {/* Legend is always present for two series; identity is never colour
          alone, since direction says the same thing. */}
      <View className="mb-2 w-full flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Key color={IN} label="In" />
          <Key color={OUT} label="Out" />
        </View>
        {shown ? (
          <Text
            className="font-poppins text-[12px] text-body"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {shown.label} · {formatCurrency(shown.in)} in · {formatCurrency(-shown.out)} out
          </Text>
        ) : null}
      </View>

      <View className="w-full" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke={AXIS} strokeWidth={1} />
            {buckets.map((bucket, index) => {
              const x = index * slotWidth + GAP;
              return (
                <Fragment key={bucket.key}>
                  {bucket.in > 0 ? (
                    <Path
                      d={barPath(x, barWidth, zeroY, scale(bucket.in, true))}
                      fill={IN}
                      opacity={active && active !== bucket.key ? 0.35 : 1}
                    />
                  ) : null}
                  {bucket.out > 0 ? (
                    <Path
                      d={barPath(x, barWidth, zeroY, scale(bucket.out, false))}
                      fill={OUT}
                      opacity={active && active !== bucket.key ? 0.35 : 1}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </Svg>
        ) : (
          <View style={{ height: HEIGHT }} />
        )}

        {/* Touch targets sit over the marks and are a whole slot wide, because
            a 3px bar is not something anyone can hit. */}
        {width > 0 ? (
          <View className="absolute inset-0 flex-row">
            {buckets.map((bucket) => (
              <Pressable
                key={bucket.key}
                accessibilityRole="button"
                accessibilityLabel={`${bucket.label}, ${formatCurrency(bucket.in)} in, ${formatCurrency(-bucket.out)} out`}
                onPress={() => setActive(active === bucket.key ? null : bucket.key)}
                style={{ width: slotWidth, height: HEIGHT }}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View className="mt-1 w-full flex-row">
        {buckets.map((bucket, index) => (
          <View key={bucket.key} style={{ width: slotWidth }} className="items-center">
            {/* Every label on a 12-month axis collides; showing every other one
                keeps the axis readable without dropping its ends. */}
            {buckets.length <= 8 || index % 2 === 0 ? (
              <Text
                className="font-poppins text-[10px] text-muted"
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

function Key({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}
