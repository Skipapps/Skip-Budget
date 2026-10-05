/**
 * Splitting a shared bill and working out who settles up with whom. All arithmetic runs in integer
 * cents plus an explicit remainder (rounding $500 / 6 to $83.33 each loses two cents), so shares
 * always sum to the exact total, which the database enforces.
 */

import { fromCents as toDollars, toCents } from '@/lib/money';

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

export type NetBalance = {
  /** Whatever identifies the person to the caller: a name, or a member id. */
  id: string;
  /** Positive: owed money. Negative: owes it. */
  balance: number;
};

/**
 * Largest debtor pays the largest creditor, repeatedly. Greedy, so not always the theoretical
 * minimum (NP-hard), but at most n-1 payments and everybody ends on zero. It can tell you to pay
 * someone you never ate with, which is why groups carry it as a preference. Integer cents, so no
 * chain of payments leaks one.
 */
export function simplifyDebts(balances: NetBalance[]): Settlement[] {
  const ledger = balances
    .map((entry) => ({ id: entry.id, cents: toCents(entry.balance) }))
    .filter((entry) => entry.cents !== 0);

  // Biggest first on both sides: clears people fastest, which keeps the payment count down.
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
      settlements.push({ from: debtor.id, to: creditor.id, amount: toDollars(cents) });
      debtor.cents += cents;
      creditor.cents -= cents;
    }

    if (debtor.cents === 0) debtorIndex += 1;
    if (creditor.cents === 0) creditorIndex += 1;
  }

  return settlements;
}

export type MemberShare = {
  memberId: string;
  share: number;
};

/**
 * An equal split that adds up: the remainder goes one cent each to the first few members. The order
 * is deliberately stable, so editing an expense never moves a cent between two people.
 */
export function equalShares(memberIds: string[], total: number): MemberShare[] {
  const count = memberIds.length;
  if (count === 0) return [];

  const totalCents = Math.max(0, toCents(total));
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;

  return memberIds.map((memberId, index) => ({
    memberId,
    share: toDollars(baseCents + (index < remainder ? 1 : 0)),
  }));
}

/** What is still unaccounted for when shares are typed in by hand. */
export function exactRemainder(shares: MemberShare[], total: number): number {
  const assigned = shares.reduce((sum, entry) => sum + toCents(entry.share), 0);
  return toDollars(toCents(total) - assigned);
}
