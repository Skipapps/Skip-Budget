import { toCents } from '@/lib/money';

/**
 * Formats a number as USD.
 *
 * Hand-rolled rather than Intl/toLocaleString: Hermes ships Intl on some
 * platforms and not others, and a currency that silently changes shape between
 * iOS and Android is worse than a few lines of grouping logic.
 *
 * Cents are rounded the way src/lib/money.ts posts them, so a figure shown is
 * the figure stored. Exact to the cent up to $9,999,999,999.99, the 12
 * significant digits toCents decides the half on.
 */
export function formatCurrency(amount: number, options?: { cents?: boolean }): string {
  const showCents = options?.cents ?? true;

  // A figure that is not a number has no honest rendering. Without this the
  // string concatenation below produces "$NaN.undefined", which looks like a
  // corrupted balance rather than a calculation that went wrong.
  if (!Number.isFinite(amount)) return '—';

  // Rounded to the cent by money.ts (half away from zero), then built from
  // whole cents. toFixed(2) rounds the binary value instead, so 10.075 (stored
  // as 10.07499…) showed as $10.07 where every other figure says $10.08.
  const cents = Math.abs(toCents(amount));
  const whole = String(Math.floor(cents / 100));
  const fraction = String(cents % 100).padStart(2, '0');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // The sign is decided after rounding, not before. Minus a third of a cent is
  // shown as $0.00, and prefixing that with a minus reads as a debt that is not
  // there — and would have it drawn in the colour for money going out.
  const shown = showCents ? Number(whole) + Number(fraction) : Number(whole);
  const isNegative = amount < 0 && shown > 0;

  return `${isNegative ? '-' : ''}$${grouped}${showCents ? `.${fraction}` : ''}`;
}
