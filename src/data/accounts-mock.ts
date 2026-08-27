/**
 * Placeholder bank accounts. Sample data only — replaced once accounts come
 * from the database.
 */
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

export const accounts: BankAccount[] = [
  {
    id: 'acct-1',
    bankName: 'Chase',
    nickname: 'Everyday',
    accountType: 'Checking',
    balance: 8420,
    last4: '7731',
    color: '#7BC4F5',
  },
  {
    id: 'acct-2',
    bankName: 'Ally',
    nickname: 'Rainy day',
    accountType: 'Savings',
    balance: 19600,
    last4: '4408',
    color: '#2E6E5B',
  },
];
