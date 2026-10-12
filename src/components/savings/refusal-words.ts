import type { SavingsRefusal } from '@/api/savings';
import { t } from '@/i18n';
import { formatCurrency } from '@/lib/format';

/**
 * The plain sentence for a savings rule that refused a write, as a form hint says it; null for
 * any other failure, which says the one failure message. `goalName` names the goal a send or a
 * take-back was refused for, when the page knows it.
 */
export function refusalLine(refusal: SavingsRefusal | null, goalName?: string): string | null {
  if (!refusal) return null;
  const amount = formatCurrency(refusal.amount ?? 0);
  switch (refusal.kind) {
    case 'inGoals':
      return t('savings.entry.inGoals', { amount });
    case 'zero':
      return t('savings.entry.zero', { amount: formatCurrency(0) });
    case 'short':
      return t('savings.sendPage.room', { amount });
    case 'goalFull':
      return goalName ? t('savings.sendPage.needs', { name: goalName, amount }) : null;
    case 'tooMuchBack':
      return t('goals.takeOut.tooMuch', { amount });
    case 'notFinished':
      return t('savings.refusal.notFinished');
    case 'gone':
      return t('savings.refusal.gone');
  }
}
