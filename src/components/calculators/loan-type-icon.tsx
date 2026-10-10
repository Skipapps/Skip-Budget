import type { LoanType } from '@/data/loan-types';
import { useLoanTypeIcons } from '@/theme/loan-icons';

/** A loan type's gradient drawing, for the mode in force. Decorative: the row says what it is. */
export function LoanTypeIcon({ type, size }: { type: LoanType; size: number }) {
  const Icon = useLoanTypeIcons()[type];
  return <Icon width={size} height={size} />;
}
