export const ACCOUNT_TYPES = ['Checking', 'Savings'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type BankAccount = {
  id: string;
  bankName: string;
  /** User's nickname for the account. */
  nickname: string;
  accountType: AccountType;
  balance: number;
  /** Last four digits; the rest is never stored or shown. */
  last4: string;
  color: string;
};
