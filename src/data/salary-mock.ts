import type { PayFrequency } from '@/lib/date';

export type SalarySource = {
  id: string;
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
