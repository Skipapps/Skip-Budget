/**
 * Formats a number as USD.
 *
 * Hand-rolled rather than Intl/toLocaleString: Hermes ships Intl on some
 * platforms and not others, and a currency that silently changes shape between
 * iOS and Android is worse than a few lines of grouping logic.
 */
export function formatCurrency(amount: number, options?: { cents?: boolean }): string {
  const showCents = options?.cents ?? true;
  const isNegative = amount < 0;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${isNegative ? '-' : ''}$${grouped}${showCents ? `.${fraction}` : ''}`;
}
