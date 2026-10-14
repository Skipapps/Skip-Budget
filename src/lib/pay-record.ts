import { historyFloor } from '@/lib/allowance';
import type { PayFrequency } from '@/lib/date';
import { landingAccount, unrecordedPaydays } from '@/lib/pay';

/**
 * Which paydays the pay writer still has to write down, and how many a salary has in history. Pure:
 * the reads and the writes are in src/api/pay.ts.
 */

/** A salary as the pay writer reads it. Numeric columns can arrive as text. */
export type SalaryToRecord = {
  id: string;
  name: string | null;
  amount: number | string;
  frequency: PayFrequency;
  last_payday: string | null;
  /** The accounts it is paid into, in any order. */
  account_ids: readonly string[];
};

/** A pay on the record, as far as the writer needs it. */
export type RecordedDay = { salary_source_id: string | null; paid_on: string };

/** One payday to write down, copied from its salary as it is today. */
export type DuePay = {
  salary_source_id: string;
  label: string;
  amount: number;
  paid_on: string;
  bank_account_id: string | null;
};

function newestBySalary(recorded: readonly RecordedDay[]): Map<string, string> {
  const newest = new Map<string, string>();
  for (const row of recorded) {
    const id = row.salary_source_id;
    if (id && (!newest.has(id) || row.paid_on > newest.get(id)!)) newest.set(id, row.paid_on);
  }
  return newest;
}

/** The same floor the ledger walks from, so what is written down is what the screens showed. */
const keptFrom = (today: string) => historyFloor(true, new Date(`${today}T00:00:00`));

/**
 * Every payday due by today that the record does not hold yet, oldest first within each salary. A
 * salary worth nothing a payday writes nothing.
 */
export function duePay({
  today,
  salaries,
  recorded,
  accountOrder,
}: {
  /** yyyy-mm-dd */
  today: string;
  salaries: readonly SalaryToRecord[];
  recorded: readonly RecordedDay[];
  /** Bank account ids oldest first: a pay lands in the first of its accounts in this order. */
  accountOrder: readonly string[];
}): DuePay[] {
  const newest = newestBySalary(recorded);
  const floor = keptFrom(today);

  const rows: DuePay[] = [];
  for (const salary of salaries) {
    const amount = Number(salary.amount);
    if (!(amount > 0)) continue;
    const into = landingAccount(salary.account_ids, accountOrder);
    for (const day of unrecordedPaydays(
      { frequency: salary.frequency, lastPayday: salary.last_payday },
      newest.get(salary.id) ?? null,
      floor,
      today,
    )) {
      rows.push({
        salary_source_id: salary.id,
        label: salary.name ?? '',
        amount,
        paid_on: day,
        bank_account_id: into,
      });
    }
  }
  return rows;
}

/**
 * How many paydays one salary has in history today: the ones on the record, and the ones due that
 * the sweep has not written down yet, which the ledger already shows and "keep past" writes first.
 * Null `salary`: removed already, so only what is on the record is left.
 */
export function paydaysInHistory({
  today,
  salary,
  recorded,
}: {
  today: string;
  salary: SalaryToRecord | null;
  /** This salary's pays on the record. */
  recorded: readonly RecordedDay[];
}): number {
  if (!salary) return recorded.length;
  const own = recorded.filter((row) => row.salary_source_id === salary.id);
  return own.length + duePay({ today, salaries: [salary], recorded: own, accountOrder: [] }).length;
}
