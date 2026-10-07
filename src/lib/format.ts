import { money } from '@/i18n';

/**
 * An amount in the person's currency and language ("$1,234.56", "£1,234.56", "1 234,56 $").
 * Never converts: the number is the number, only its writing changes. The cent rules live in
 * src/i18n/number.ts.
 */
export function formatCurrency(amount: number, options?: { cents?: boolean }): string {
  return money(amount, options);
}
