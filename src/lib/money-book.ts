import type { Ledger, LedgerEntry, SourceKind } from '@/lib/card-ledger';
import { fromCents, toCents } from '@/lib/money';

/**
 * Where every dollar sits: in one of the person's bank accounts, owed on one of their cards, or in
 * no account the app knows. Each card's and account's running balance and Home's Current balance
 * are read off this one book, so the Money tab and Home can never disagree.
 *
 * A typed balance is true at the start of its `asOf` day and already holds everything before it,
 * so whatever touches a card or account counts only from that day; whatever touches no account
 * counts from the earliest typed day, when tracking began. Nothing after today counts.
 *
 * Money moves, it is not made: pay lands in the account it is paid into; spending leaves the card
 * or account it was paid with; a card payment leaves the account it came from and clears the card;
 * money added to an account from another of the person's accounts leaves that one. Only money from
 * outside (pay, or a payment with no account behind it) raises the total.
 */

export type BookSource = {
  id: string;
  kind: SourceKind;
  /** How the other side of a move names it ("To Visa", "From Savings"). */
  name: string;
  /** As typed. An account's is what it holds; a card's is what is owed on it. */
  balance: number;
  /** yyyy-mm-dd the typed balance was true; null when none was typed, so everything counts. */
  asOf: string | null;
};

/** A receipt, or one bill or subscription charge, as the ledger lists it. */
export type BookSpend = Omit<LedgerEntry, 'kind' | 'counterpart'> & {
  kind: 'receipt' | 'bill' | 'subscription';
  /** The card or account it was paid with; '' when none. */
  sourceId: string;
};

export type BookPayment = {
  id: string;
  /** Positive. */
  amount: number;
  /** yyyy-mm-dd */
  date: string;
  note?: string | null;
  /** The card it clears or the account it adds to. */
  toId: string;
  /** The account the money came out of; null for money from outside. */
  fromAccountId: string | null;
};

/** One payday: on the record as it landed, or still worked out from its salary's schedule. */
export type BookIncome = {
  id: string;
  label: string;
  /** yyyy-mm-dd */
  date: string;
  /** Positive. */
  amount: number;
  /** The account it landed in; null when it was paid into no account. */
  accountId: string | null;
};

export type CurrentBalance = {
  balance: number;
  /** Money that came in from outside: pay, and payments with no account of the person's behind them. */
  income: number;
  /** Money that went out to the world: receipts, bill and subscription charges. */
  expenses: number;
};

export type MoneyBook = {
  /** Every card and account, by id. */
  sources: Map<string, Ledger>;
  current: CurrentBalance;
};

const newestFirst = (a: LedgerEntry, b: LedgerEntry) =>
  a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date);

export function moneyBook({
  today,
  sources,
  spending,
  payments,
  income,
}: {
  /** yyyy-mm-dd */
  today: string;
  sources: readonly BookSource[];
  spending: readonly BookSpend[];
  payments: readonly BookPayment[];
  income: readonly BookIncome[];
}): MoneyBook {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const typedDays = sources.flatMap((source) => (source.asOf ? [source.asOf] : []));
  const began = typedDays.reduce<string | null>(
    (min, day) => (min === null || day < min ? day : min),
    null,
  );

  /** Whether a day counts against a source, or against no account when the source is unknown. */
  const counts = (date: string, sourceId: string | null): boolean => {
    if (date > today) return false;
    const source = sourceId ? byId.get(sourceId) : undefined;
    const from = source ? source.asOf : began;
    return !from || date >= from;
  };

  const entries = new Map<string, LedgerEntry[]>(sources.map((source) => [source.id, []]));
  const post = (sourceId: string, entry: LedgerEntry) => entries.get(sourceId)?.push(entry);

  let incomeCents = 0;
  let expenseCents = 0;
  // Pay and spending that belong to no account: they move the total without moving a balance.
  let looseCents = 0;

  for (const spend of spending) {
    const sourceId = byId.has(spend.sourceId) ? spend.sourceId : '';
    if (!counts(spend.date, sourceId || null)) continue;
    const cents = toCents(Math.abs(spend.amount));
    expenseCents += cents;
    const { sourceId: _ignored, ...shown } = spend;
    if (sourceId) post(sourceId, { ...shown, amount: -fromCents(cents) });
    else looseCents -= cents;
  }

  for (const payment of payments) {
    const target = byId.get(payment.toId);
    const from = payment.fromAccountId ? byId.get(payment.fromAccountId) : undefined;
    const lands = Boolean(target) && counts(payment.date, payment.toId);
    const leaves = Boolean(from) && counts(payment.date, from!.id);
    const cents = toCents(Math.abs(payment.amount));

    if (lands) {
      post(target!.id, {
        id: `payment-${payment.id}`,
        label: payment.note?.trim() || 'Payment',
        date: payment.date,
        amount: fromCents(cents),
        kind: 'payment',
        counterpart: from?.name ?? null,
      });
    }
    if (leaves) {
      post(from!.id, {
        id: `payment-${payment.id}:out`,
        label: payment.note?.trim() || 'Payment',
        date: payment.date,
        amount: -fromCents(cents),
        kind: 'payment',
        counterpart: target?.name ?? null,
      });
    }
    // A move counted on both sides changes no total. Counted on one side only (the other is
    // inside a typed balance, or not the person's), it is money arriving or leaving.
    if (lands && !leaves) incomeCents += cents;
    if (leaves && !lands) expenseCents += cents;
  }

  for (const pay of income) {
    // Pay lands in an account, never on a card; anything else is pay into no account.
    const into =
      pay.accountId && byId.get(pay.accountId)?.kind === 'account' ? pay.accountId : null;
    if (!counts(pay.date, into)) continue;
    const cents = toCents(Math.abs(pay.amount));
    incomeCents += cents;
    if (into) {
      post(into, {
        id: pay.id,
        label: pay.label,
        date: pay.date,
        amount: fromCents(cents),
        kind: 'income',
      });
    } else {
      looseCents += cents;
    }
  }

  const ledgers = new Map<string, Ledger>();
  let netCents = looseCents;
  for (const source of sources) {
    const list = (entries.get(source.id) ?? []).sort(newestFirst);
    let outCents = 0;
    let inCents = 0;
    for (const entry of list) {
      const cents = toCents(entry.amount);
      if (cents < 0) outCents -= cents;
      else inCents += cents;
    }
    const typed = toCents(source.balance);
    // An account holds money, so money in raises it; a card is owed, so money in clears it.
    const balanceCents =
      source.kind === 'account' ? typed + inCents - outCents : typed + outCents - inCents;
    netCents += source.kind === 'account' ? balanceCents : -balanceCents;
    ledgers.set(source.id, {
      entries: list,
      charged: fromCents(outCents),
      paid: fromCents(inCents),
      balance: fromCents(balanceCents),
    });
  }

  return {
    sources: ledgers,
    current: {
      balance: fromCents(netCents),
      income: fromCents(incomeCents),
      expenses: fromCents(expenseCents),
    },
  };
}
