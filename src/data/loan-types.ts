import type { MessageKey } from '@/i18n';

/** What a loan is for, in the order the save page offers them. */
export const LOAN_TYPES = [
  'personal',
  'car',
  'student',
  'home',
  'business',
  'medical',
  'credit-card',
  'other',
] as const;

export type LoanType = (typeof LOAN_TYPES)[number];

/**
 * A loan is filed as a bill, and the bill's free-text `icon_id` carries the type, so no column is
 * needed. The prefix keeps these apart from the bill picker's glyph ids.
 */
const PREFIX = 'loan-';

export function loanTypeIconId(type: LoanType): string {
  return `${PREFIX}${type}`;
}

/** The loan type a bill's icon id names, or null for any other icon. */
export function loanTypeOf(iconId: string | null | undefined): LoanType | null {
  if (!iconId?.startsWith(PREFIX)) return null;
  const type = iconId.slice(PREFIX.length);
  return LOAN_TYPES.find((known) => known === type) ?? null;
}

const LABEL_KEYS: Record<LoanType, MessageKey> = {
  personal: 'loan.type.personal',
  car: 'loan.type.car',
  student: 'loan.type.student',
  home: 'loan.type.home',
  business: 'loan.type.business',
  medical: 'loan.type.medical',
  'credit-card': 'loan.type.creditCard',
  other: 'loan.type.other',
};

export function loanTypeLabelKey(type: LoanType): MessageKey {
  return LABEL_KEYS[type];
}
