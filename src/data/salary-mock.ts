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
  /** Fixed: `amount` is typed in. Hourly: worked out from the fields below. */
  payType?: 'fixed' | 'hourly';
  hourlyRate?: number;
  /** Kept as typed, so "37." survives while someone is mid-way through "37.5". */
  hoursPerWeek?: string;
  overtime?: boolean;
  overtimeHours?: string;
  overtimeMultiplier?: number;
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
