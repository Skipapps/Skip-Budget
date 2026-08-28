/**
 * Formats a number as USD.
 *
 * Hand-rolled rather than Intl/toLocaleString: Hermes ships Intl on some
 * platforms and not others, and a currency that silently changes shape between
 * iOS and Android is worse than a few lines of grouping logic.
 */
export function formatCurrency(amount: number, options?: { cents?: boolean }): string {
  const showCents = options?.cents ?? true;

  // A figure that is not a number has no honest rendering. Without this the
  // string concatenation below produces "$NaN.undefined", which looks like a
  // corrupted balance rather than a calculation that went wrong.
  if (!Number.isFinite(amount)) return '—';

  const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // The sign is decided after rounding, not before. Minus a third of a cent is
  // shown as $0.00, and prefixing that with a minus reads as a debt that is not
  // there — and would have it drawn in the colour for money going out.
  const shown = showCents ? Number(whole) + Number(fraction) : Number(whole);
  const isNegative = amount < 0 && shown > 0;

  return `${isNegative ? '-' : ''}$${grouped}${showCents ? `.${fraction}` : ''}`;
}
