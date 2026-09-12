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

  return (
    <View
      accessible
      accessibilityLabel={
        unit === 'percent' ? `Rate, ${spoken} percent` : `Amount, ${formatCurrency(spoken)}`
      }
      accessibilityLiveRegion="polite"
      className={cn('w-full flex-row items-start justify-center', className)}
    >
      {unit === 'currency' ? (
        <Text
          allowFontScaling={false}
          className={cn('mt-3 font-poppins-bold text-[28px]', empty ? 'text-muted' : 'text-body')}
        >
          $
        </Text>
      ) : null}

      <Text
        allowFontScaling={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        // Low enough that the longest figure the keypad allows —
        // 999,999,999.99, fourteen glyphs — still shrinks to fit a 320pt
        // screen instead of hitting the floor and ellipsising. An ellipsised
        // money figure is a wrong money figure.
        minimumFontScale={0.5}
        className={cn(
          'shrink font-poppins-bold text-[64px] leading-[76px]',
          empty ? 'text-muted' : 'text-ink',
        )}
      >
        {displayAmount(value)}
      </Text>

      {unit === 'percent' ? (
        <Text
          allowFontScaling={false}
          className={cn('mt-3 font-poppins-bold text-[28px]', empty ? 'text-muted' : 'text-body')}
        >
          %
        </Text>
      ) : null}
    </View>
  );
}
