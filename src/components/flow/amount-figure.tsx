import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';

type AmountFigureProps = {
  /** The raw draft string, exactly as typed. Never formatted money. */
  value: string;
  /** `percent` swaps the leading $ for a trailing %. */
  unit?: 'currency' | 'percent';
  className?: string;
};

/** Groups the whole part in threes. A trailing "." survives, so 12. does not jump back to 12 mid-typing. */
export function displayAmount(raw: string): string {
  if (!raw) return '0';
  const [whole, fraction] = raw.split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export type AmountFigureBand = {
  size: number;
  /** Fixed per band, so the figure never reflows the page. */
  lineHeight: number;
  /** Font size of the $ or %, kept in proportion to the number. */
  affixSize: number;
  /** Top inset that levels the cap of the affix with the cap of the digits. */
  affixTop: number;
};

/**
 * Figure size comes from the glyph count, not `adjustsFontSizeToFit`: on iOS that measures against the
 * first layout pass, so a remount with an amount already entered shrank to the floor and never grew back.
 *
 * Bands use measured advances of the app font's bold (widest digit "4" = 0.689em) so the widest
 * string in each still fits an iPhone SE (327pt inside the Screen's px-6). 14 glyphs is everything
 * the keypad can produce ($999,999,999.99); the last band is only for saved figures longer than
 * that, shown in full because an ellipsised money figure is a wrong one.
 */
const BANDS: (AmountFigureBand & { maxGlyphs: number })[] = [
  { maxGlyphs: 7, size: 64, lineHeight: 76, affixSize: 28, affixTop: 9.5 },
  { maxGlyphs: 10, size: 48, lineHeight: 58, affixSize: 21, affixTop: 7 },
  { maxGlyphs: 14, size: 36, lineHeight: 44, affixSize: 16, affixTop: 5.5 },
  { maxGlyphs: Infinity, size: 28, lineHeight: 34, affixSize: 12, affixTop: 4.5 },
];

/**
 * The band a display string lands in.
 *
 * `affixTop` = 0.268 x (size - affixSize), to the half point: the app font's cap line sits 0.268em
 * below its line top (ascender 0.968em less cap height 0.700em), and RN applies no baseline shift
 * because none of these line heights is taller than the font's own (1.219em).
 */
export function amountFigureBand(display: string): AmountFigureBand {
  const band = BANDS.find((candidate) => display.length <= candidate.maxGlyphs) ?? BANDS[0];
  return {
    size: band.size,
    lineHeight: band.lineHeight,
    affixSize: band.affixSize,
    affixTop: band.affixTop,
  };
}

/**
 * The big figure being typed. Not run through `formatCurrency` on screen: "$0.00" after a single 0
 * would state a precision nobody entered. The screen reader does get the money reading.
 */
export function AmountFigure({ value, unit = 'currency', className }: AmountFigureProps) {
  const empty = value === '' || Number(value) === 0;
  const spoken = Number.isFinite(Number(value)) ? Number(value) : 0;
  const display = displayAmount(value);
  const band = amountFigureBand(display);

  return (
    <View
      accessible
      accessibilityLabel={
        unit === 'percent' ? `Rate, ${spoken} percent` : `Amount, ${formatCurrency(spoken)}`
      }
      accessibilityLiveRegion="polite"
      // Nothing in the row shrinks: every band already fits the narrowest screen.
      className={cn('w-full flex-row items-start justify-center', className)}
    >
      {unit === 'currency' ? (
        <Text
          allowFontScaling={false}
          style={{ fontSize: band.affixSize, marginTop: band.affixTop }}
          className={cn('font-app-bold', empty ? 'text-muted' : 'text-body')}
        >
          $
        </Text>
      ) : null}

      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{ fontSize: band.size, lineHeight: band.lineHeight }}
        className={cn('font-app-bold', empty ? 'text-muted' : 'text-ink')}
      >
        {display}
      </Text>

      {unit === 'percent' ? (
        <Text
          allowFontScaling={false}
          style={{ fontSize: band.affixSize, marginTop: band.affixTop }}
          className={cn('font-app-bold', empty ? 'text-muted' : 'text-body')}
        >
          %
        </Text>
      ) : null}
    </View>
  );
}
