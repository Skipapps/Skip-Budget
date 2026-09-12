import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';

type AmountFigureProps = {
  /** The raw draft string, exactly as typed. Never formatted money. */
  value: string;
  /** `percent` swaps the leading $ for a trailing % — same figure otherwise. */
  unit?: 'currency' | 'percent';
  className?: string;
};

/**
 * Groups the whole part so long figures stay readable while typing.
 *
 * A trailing "." survives, so 12. renders as 12. rather than jumping back to
 * 12 under the finger that just pressed the point.
 */
export function displayAmount(raw: string): string {
  if (!raw) return '0';
  const [whole, fraction] = raw.split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export type AmountFigureBand = {
  /** Font size of the number itself. */
  size: number;
  /** Line height of the number. Fixed, so the figure never reflows the page. */
  lineHeight: number;
  /** Font size of the $ or %, held at the same proportion of the number. */
  affixSize: number;
  /** Top inset that levels the cap of the affix with the cap of the digits. */
  affixTop: number;
};

/**
 * How big the figure is, decided from the string alone.
 *
 * This used to be `adjustsFontSizeToFit` with `minimumFontScale={0.5}`, and on
 * iOS that measures against the first layout pass. Coming back to step 1 with
 * an amount already entered, the text exists before the row has settled its
 * width, so it shrank to the floor and never grew back: the "$" stayed at
 * 28px while "3,000" rendered at half size and fell away from it. Nothing in
 * the component knew, because the shrinking happens inside UIKit.
 *
 * So the size is chosen here instead, from the number of glyphs on screen, and
 * it is the same on the first render and the thousandth. The bands were picked
 * against measured Poppins Bold advances (unitsPerEm 1000, widest digit "4" at
 * 0.677em, comma 0.287em, point 0.282em, "$" 0.658em) so that the widest
 * string each band can hold still fits the narrowest screen the app supports —
 * an iPhone SE at 375pt, less the Screen's px-6, is 327pt:
 *
 *   7 glyphs  "444,444"          4.349em x 64 + $ 18.4 = 297pt
 *   10 glyphs "44,444,444"       5.990em x 48 + $ 13.8 = 301pt
 *   14 glyphs "444,444,444.44"   8.303em x 36 + $ 10.5 = 309pt
 *   18 glyphs "444,444,444,444.44" 10.621em x 28 + $ 7.9 = 305pt
 *
 * Fourteen glyphs is everything the keypad can produce ($999,999,999.99). The
 * last band is only ever reached by a figure loaded from a record, which the
 * keypad is forbidden from truncating — it is there so money somebody already
 * saved is shown in full rather than ellipsised, and an ellipsised money
 * figure is a wrong money figure.
 */
const BANDS: (AmountFigureBand & { maxGlyphs: number })[] = [
  { maxGlyphs: 7, size: 64, lineHeight: 76, affixSize: 28, affixTop: 12 },
  { maxGlyphs: 10, size: 48, lineHeight: 58, affixSize: 21, affixTop: 9.5 },
  { maxGlyphs: 14, size: 36, lineHeight: 44, affixSize: 16, affixTop: 7 },
  { maxGlyphs: Infinity, size: 28, lineHeight: 34, affixSize: 12, affixTop: 5.5 },
];

/**
 * The band a display string lands in.
 *
 * `affixTop` is not guesswork either. Poppins puts its ascender at 1.05em and
 * its cap at 0.705em, so the top of a digit sits 0.345 x fontSize below the
 * top of its line — and RN applies no baseline shift here, because it only
 * centres glyphs in the line box when the line height asked for is *taller*
 * than the font's own, which none of these bands are. Aligning the affix's cap
 * with the number's is therefore 0.345 x (size - affixSize), which at 64/28
 * comes out at 12.4 — the `mt-3` the figure has carried all along. Every other
 * band is the same relationship at its own size, rather than one margin that
 * only ever aligned at full size.
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
 * The big figure being typed.
 *
 * Deliberately not run through `formatCurrency` while typing: that is for
 * money that has been committed, and showing "$0.00" under a finger that has
 * typed a single 0 states a precision nobody entered. The screen reader does
 * get the money reading, because "dollar, one, two, point, five, zero" is not
 * how anyone hears an amount.
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
      // Centred as a group, and nothing in the row shrinks: every band above
      // already fits the narrowest screen, so there is nothing left for a
      // shrink to rescue and no width for the figure to be measured against.
      className={cn('w-full flex-row items-start justify-center', className)}
    >
      {unit === 'currency' ? (
        <Text
          allowFontScaling={false}
          style={{ fontSize: band.affixSize, marginTop: band.affixTop }}
          className={cn('font-poppins-bold', empty ? 'text-muted' : 'text-body')}
        >
          $
        </Text>
      ) : null}

      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{ fontSize: band.size, lineHeight: band.lineHeight }}
        className={cn('font-poppins-bold', empty ? 'text-muted' : 'text-ink')}
      >
        {display}
      </Text>

      {unit === 'percent' ? (
        <Text
          allowFontScaling={false}
          style={{ fontSize: band.affixSize, marginTop: band.affixTop }}
          className={cn('font-poppins-bold', empty ? 'text-muted' : 'text-body')}
        >
          %
        </Text>
      ) : null}
    </View>
  );
}
