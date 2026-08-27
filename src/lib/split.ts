/**
 * Splitting a shared bill and working out who settles up with whom.
 *
 * All arithmetic runs in integer cents. Dividing dollars as floats and rounding
 * each share loses money: $500 across 6 people rounds to $83.33 each, which is
 * $499.98 — two cents unaccounted for. Cents plus an explicit remainder means
 * the shares always sum back to the exact total.
 */

export type Participant = {
  id: string;
  name: string;
  /** What this person actually put in. */
  paid: number;
};

export type Balance = Participant & {
  /** This person's exact share — may be a cent more than someone else's. */
  share: number;
  /** Positive: owed money. Negative: owes money. */
  balance: number;
};

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

export type SplitResult = {
  /** Equal when the total divides evenly; a cent apart when it does not. */
  shareMin: number;
  shareMax: number;
  /** How many people carry the extra cent. */
  roundedUpCount: number;
  balances: Balance[];
  settlements: Settlement[];
  paidTotal: number;
};

const toCents = (value: number) => Math.round(value * 100);
const toDollars = (cents: number) => cents / 100;

export function splitBill(participants: Participant[], total: number): SplitResult {
  const count = Math.max(participants.length, 1);
  const totalCents = Math.max(0, toCents(total));

  // Everyone pays the base; the leftover cents go one each to the first few, so
  // nothing is lost and no one is ever more than a cent out.
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;

  const balances: Balance[] = participants.map((person, index) => {
    const shareCents = baseCents + (index < remainder ? 1 : 0);
    const paidCents = toCents(person.paid);
    return {
      ...person,
      share: toDollars(shareCents),
      balance: toDollars(paidCents - shareCents),
    };
  });

  const ledger = balances.map((person) => ({
    name: person.name,
    cents: toCents(person.paid) - toCents(person.share),
  }));

  const debtors = ledger.filter((entry) => entry.cents < 0).sort((a, b) => a.cents - b.cents);
  const creditors = ledger.filter((entry) => entry.cents > 0).sort((a, b) => b.cents - a.cents);

  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const cents = Math.min(-debtor.cents, creditor.cents);

    if (cents > 0) {
      settlements.push({ from: debtor.name, to: creditor.name, amount: toDollars(cents) });
      debtor.cents += cents;
      creditor.cents -= cents;
    }

    if (debtor.cents === 0) debtorIndex += 1;
    if (creditor.cents === 0) creditorIndex += 1;
  }

  return {
    shareMin: toDollars(baseCents),
    shareMax: toDollars(baseCents + (remainder > 0 ? 1 : 0)),
    roundedUpCount: remainder,
    balances,
    settlements,
    paidTotal: toDollars(participants.reduce((sum, person) => sum + toCents(person.paid), 0)),
  };
}
