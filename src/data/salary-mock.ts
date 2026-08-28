/**
 * Placeholder salary sources. Sample data only — replaced once income comes
 * from the database.
 */
import type { PayFrequency } from '@/lib/date';

export type SalarySource = {
  id: string;
  /** Employer or income name. */
  name: string;
  amount: number;
  frequency: PayFrequency;
  /** yyyy-mm-dd of the most recent payday; every future one counts from it. */
  lastPayday: string | null;
  /** Accounts this income is paid into — a source can split across several. */
  accountIds: string[];
};

export const salarySources: SalarySource[] = [
  {
    id: 'salary-1',
    name: 'Acme Corp',
    amount: 5600,
    frequency: 'monthly',
    lastPayday: null,
    accountIds: ['acct-1'],
  },
];
