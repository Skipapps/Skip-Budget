import { toCents } from '@/lib/money';

/**
 * Formats a number as USD. Hand-rolled because Hermes ships Intl inconsistently across platforms.
 *
 * Cents are rounded the way src/lib/money.ts posts them, so a figure shown is the figure stored.
 * Exact to the cent up to $9,999,999,999.99, the 12 significant digits toCents decides the half on.
 */
export function formatCurrency(amount: number, options?: { cents?: boolean }): string {
  const showCents = options?.cents ?? true;

  // Without this the concatenation below yields "$NaN.undefined", which reads as a corrupted balance.
  if (!Number.isFinite(amount)) return '—';

  // Built from whole cents rounded by money.ts (half away from zero). toFixed(2) would round the
  // binary value, so 10.075 (stored as 10.07499…) would show $10.07 where every other figure says $10.08.
  const cents = Math.abs(toCents(amount));
  const whole = String(Math.floor(cents / 100));
  const fraction = String(cents % 100).padStart(2, '0');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // The sign is decided after rounding: minus a third of a cent is $0.00, and a minus there
  // would read as a debt and be drawn in the money-out colour.
  const shown = showCents ? Number(whole) + Number(fraction) : Number(whole);
  const isNegative = amount < 0 && shown > 0;

  return `${isNegative ? '-' : ''}$${grouped}${showCents ? `.${fraction}` : ''}`;
}
