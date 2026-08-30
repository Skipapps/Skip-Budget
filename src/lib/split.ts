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

  const settlements = simplifyDebts(
    balances.map((person) => ({
      id: person.name,
      balance: toDollars(toCents(person.paid) - toCents(person.share)),
    })),
  );

  return {
    shareMin: toDollars(baseCents),
    shareMax: toDollars(baseCents + (remainder > 0 ? 1 : 0)),
    roundedUpCount: remainder,
    balances,
    settlements,
    paidTotal: toDollars(participants.reduce((sum, person) => sum + toCents(person.paid), 0)),
  };
}

// --- Working out who pays whom ------------------------------------------------

export type NetBalance = {
  /** Whatever identifies the person to the caller — a name, or a member id. */
  id: string;
  /** Positive: owed money. Negative: owes it. */
  balance: number;
};

/**
 * The shortest set of payments that clears every balance.
 *
 * Largest debtor pays the largest creditor, repeatedly. It is greedy, and
 * greedy is not always the theoretical minimum — finding that is NP-hard, and
 * the optimum saves at most a payment or two on group sizes anyone actually
 * has. What it does guarantee is at most n−1 payments, and that everybody ends
 * on zero, which is what people are asking for when they say "simplify".
 *
 * A consequence worth knowing before turning it on: it will tell you to pay
 * somebody you never ate with. That is the trade for fewer transfers, and it
 * is why the group carries it as a preference rather than always doing it.
 *
 * Runs in integer cents, so no chain of payments can leak one.
 */
export function simplifyDebts(balances: NetBalance[]): Settlement[] {
  const ledger = balances
    .map((entry) => ({ id: entry.id, cents: toCents(entry.balance) }))
    .filter((entry) => entry.cents !== 0);

  // Biggest first on both sides: it clears whole people out of the list
  // fastest, which is what keeps the payment count down.
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

// --- Turning a bill into shares to store --------------------------------------

export type MemberShare = {
  memberId: string;
  share: number;
};

/**
 * An equal split that adds up.
 *
 * The remainder goes one cent each to the first few rather than being rounded
 * away, so the shares sum to the total exactly — which is not a nicety here,
 * because the database refuses an expense whose shares do not.
 *
 * Rotating who carries the extra cent across expenses would be fairer over
 * time, and is deliberately not done: the order has to be stable so that
 * editing an expense does not silently move a cent between two people.
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
