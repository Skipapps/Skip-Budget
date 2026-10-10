import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';
import type { OverrideProblem } from '@/lib/loan-overrides';

const minimumOf = (problem: OverrideProblem) => formatCurrency(problem.minimum ?? 0);

/** Why a payment typed on the payment page is not taken. */
export function refusalText(problem: OverrideProblem): string {
  switch (problem.reason) {
    case 'not-an-amount':
      return t('loan.refusal.notAnAmount');
    case 'zero':
      return t('loan.refusal.zero');
    case 'below-interest':
      return problem.payment === 'monthly'
        ? t('loan.refusal.belowInterestMonthly', { minimum: minimumOf(problem) })
        : t('loan.refusal.belowInterest', { minimum: minimumOf(problem) });
    case 'no-such-payment':
      return t('loan.refusal.noSuchPayment');
    case 'last-payment':
      return t('loan.refusal.lastPayment');
  }
}

/**
 * A change that stopped fitting after the loan itself changed (a smaller amount, a shorter term),
 * as the calculator and the schedule say it.
 */
export function problemNote(problem: OverrideProblem): string {
  if (problem.payment === 'monthly') {
    return t('loan.calculator.problemMonthly', { minimum: minimumOf(problem) });
  }
  switch (problem.reason) {
    case 'below-interest':
      return t('loan.calculator.problemPayment', {
        number: problem.payment,
        minimum: minimumOf(problem),
      });
    case 'last-payment':
      return t('loan.calculator.problemLast', { number: problem.payment });
    default:
      return t('loan.calculator.problemOther', { number: problem.payment });
  }
}

/** "To save this loan, fix: the monthly payment, payment 12." */
export function fixLine(problems: readonly OverrideProblem[]): string {
  const items = problems.map((problem) =>
    problem.payment === 'monthly'
      ? t('loan.save.fixMonthly')
      : t('loan.save.fixPayment', { number: problem.payment }),
  );
  return t('loan.save.fix', { items: items.join(', ') });
}

/** Changes the loan never reaches, which are not saved. */
export function unusedNote(unused: readonly number[]): string | null {
  if (unused.length === 0) return null;
  return t('loan.calculator.unused', { count: unused.length, numbers: unused.join(', ') });
}
