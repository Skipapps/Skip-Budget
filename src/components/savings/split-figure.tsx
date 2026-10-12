import { useState } from 'react';
import { Text, View } from 'react-native';

import { FitGroup, FitText, useFitGroup } from '@/components/ui/fit-group';
import { splitMoney } from '@/components/savings/savings-words';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * A hero amount with its cents drawn smaller and lighter: "$850" then ".00". The whole part is a
 * group of one, smaller only when its line is too narrow, never under 11pt; the cents keep their
 * size and the room they need, so the figure is always whole. Read aloud as one amount.
 */
export function SplitFigure({
  id,
  amount,
  size,
  centsSize,
}: {
  /** Names the fit slot; unique on the page. */
  id: string;
  amount: number;
  /** Points at the default text setting. */
  size: number;
  centsSize: number;
}) {
  const group = useFitGroup({ mode: 'shrink' });
  const [centsWidth, setCentsWidth] = useState(0);
  const { whole, cents } = splitMoney(amount);

  return (
    <View accessible accessibilityLabel={formatCurrency(amount)} className="w-full">
      <FitGroup group={group} className="w-full" testID={`fit-figure-${id}`}>
        <FitText
          id={id}
          role="figure"
          size={size}
          className="font-app-bold text-ink"
          slotClassName="w-full flex-row items-baseline"
          reserve={cents ? centsWidth : 0}
          scrollWhenTooWide
          after={
            cents ? (
              <Text
                testID={`${id}-cents`}
                onLayout={(event) => setCentsWidth(Math.ceil(event.nativeEvent.layout.width))}
                className="shrink-0 font-app-bold text-muted"
                style={{ fontSize: centsSize }}
                maxFontSizeMultiplier={TEXT_CAP.figure}
              >
                {cents}
              </Text>
            ) : undefined
          }
        >
          {whole}
        </FitText>
      </FitGroup>
    </View>
  );
}
