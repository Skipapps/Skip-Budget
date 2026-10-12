import { fromCents, toCents } from '@/lib/money';

/**
 * Savings: what is left of each finished month, plus money the person adds, less what has gone to
 * goals. Pure and cent-exact: every sum is in integer cents, and dates stay yyyy-mm-dd text compared
 * as text, so no timezone can move a day into another month.
 */

export type PotKind = 'month' | 'added';

export type PotRow = {
  id: string;
  kind: PotKind;
  /** yyyy-mm-01; month pots only. */
  month: string | null;
  /** Added pots only. */
  label: string | null;
  /** Frozen when the month closed; month pots only. */
  earned: number | null;
  spent: number | null;
  /** What sits in savings from this pot, before any of it went to goals. */
  amount: number;
  /** yyyy-mm-dd */
  added_on: string;
  note: string | null;
  wrap_up_seen_at: string | null;
  removed_at: string | null;
  created_at: string;
};

export type MoveRow = {
  id: string;
  goal_id: string;
  /** Positive: from savings to the goal. Negative: from the goal back to savings. */
  amount: number;
  /**
   * The pot the money left (positive) or went back to (negative). Null only for a move no pot
   * claims; it still holds money out of savings.
   */
  pot_id: string | null;
  batch_id: string | null;
  created_at: string;
};

export type PotStatus = 'ready' | 'partly' | 'sent' | 'overspent';

export type PotView = PotRow & {
  status: PotStatus;
  /** Still in savings from this pot. */
  left: number;
  /** In goals from this pot, by the pot each move names. */
  sentFromIt: number;
  /** earned − spent; may be < 0. Zero for added pots, which have neither. */
  leftOver: number;
  /** yyyy-mm-dd the money reached savings: the 1st after a month, or the day it was added. */
  movedOn: string;
};

/** One pay or one spend: yyyy-mm-dd and its amount (spending may be signed). */
export type MoneyFlow = { readonly date: string; readonly amount: number };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

const isDay = (value: unknown): value is string => typeof value === 'string' && DAY.test(value);

/** Numeric columns can arrive as text; anything unreadable is no money rather than NaN. */
const cents = (value: number | string | null | undefined): number => toCents(Number(value ?? 0));

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

/** yyyy-mm of a month given as yyyy-mm or as any day in it. */
const monthOf = (value: string): string => value.slice(0, 7);

function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split('-').map(Number);
  const index = year * 12 + (number - 1) + by;
  const shiftedYear = Math.floor(index / 12);
  return `${pad(shiftedYear, 4)}-${pad(index - shiftedYear * 12 + 1)}`;
}

function lastDayOf(month: string): string {
  const [year, number] = month.split('-').map(Number);
  // Day 0 of the next month is the last of this one; UTC so no daylight-saving hour moves it.
  return `${month}-${pad(new Date(Date.UTC(year, number, 0)).getUTCDate())}`;
}

/** The day a month's left over moves to savings: the 1st of the month after it ("1 Nov"). */
export function movesToSavingsOn(month: string): string {
  return `${shiftMonth(monthOf(month), 1)}-01`;
}

/**
 * The person's own calendar day of a database timestamp (profiles.created_at, a move's created_at).
 * A bare yyyy-mm-dd is returned as is: `new Date('2026-10-01')` is UTC midnight, which is still
 * 30 Sep west of Greenwich.
 */
export function localDayOf(timestamp: string): string {
  if (DAY.test(timestamp)) return timestamp;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp.slice(0, 10);
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/** A row as the money book lists it. Only `kind`, `date` and `amount` are read. */
export type FlowEntry = { readonly kind: string; readonly date: string; readonly amount: number };

const SPENDING_KINDS = new Set(['receipt', 'bill', 'subscription']);

/**
 * Splits money-book rows into what a month counts. Earned is pay; spent is receipts and bill and
 * subscription charges. Any other kind (a card payment, a move between the person's accounts, money
 * added to an account) moves money the person already had, so it is left out even if passed in.
 */
export function savingsFlows(entries: readonly FlowEntry[]): {
  pay: MoneyFlow[];
  spending: MoneyFlow[];
} {
  const pay: MoneyFlow[] = [];
  const spending: MoneyFlow[] = [];
  for (const entry of entries) {
    if (entry.kind === 'income' && entry.amount > 0) {
      pay.push({ date: entry.date, amount: entry.amount });
    } else if (SPENDING_KINDS.has(entry.kind)) {
      spending.push({ date: entry.date, amount: entry.amount });
    }
  }
  return { pay, spending };
}

/**
 * Earned, spent and left over for one month: pay and spending dated in it, up to today.
 *
 * Nothing dated before the account was created counts, and the account's first month counts from
 * that day. The pay recorder back-fills every payday from the salary's typed last payday, which can
 * be before the account; that money is already inside the balances the person typed, not part of a
 * month Skip watched.
 *
 * Spending amounts may come signed as the ledger lists them (negative): magnitudes are summed.
 * An unreadable month, today or account day counts nothing, so a month is never closed on a guess.
 */
export function monthTotals(args: {
  /** yyyy-mm (a yyyy-mm-dd is read as its month). */
  month: string;
  today: string;
  accountCreatedOn: string;
  pay: readonly MoneyFlow[];
  spending: readonly MoneyFlow[];
}): { earned: number; spent: number; leftOver: number } {
  const month = monthOf(args.month);
  if (!MONTH.test(month) || !isDay(args.today) || !isDay(args.accountCreatedOn)) {
    return { earned: 0, spent: 0, leftOver: 0 };
  }

  const first = `${month}-01`;
  const last = lastDayOf(month);
  const from = args.accountCreatedOn > first ? args.accountCreatedOn : first;
  const to = args.today < last ? args.today : last;

  const total = (rows: readonly MoneyFlow[]) => {
    let sum = 0;
    for (const row of rows) {
      const day = String(row.date).slice(0, 10);
      if (day >= from && day <= to) sum += Math.abs(cents(row.amount));
    }
    return sum;
  };

  const earned = total(args.pay);
  const spent = total(args.spending);
  return {
    earned: fromCents(earned),
    spent: fromCents(spent),
    leftOver: fromCents(earned - spent),
  };
}

/** How many finished months are filled in at most. */
const MAX_MONTHS_BACK = 12;

/**
 * Finished months still to close, oldest first: within the last 12 finished months, none before
 * the account's month, none already closed (a removed month counts as closed, so removing it is
 * final). The window is the last 12 months, not 12 of whatever is open, so a long absence never
 * reaches further back than a first fill would.
 */
export function monthsToClose(args: {
  today: string;
  accountCreatedOn: string;
  /** yyyy-mm or yyyy-mm-01, removed months included. */
  closedMonths: readonly string[];
}): string[] {
  if (!isDay(args.today) || !isDay(args.accountCreatedOn)) return [];

  const current = monthOf(args.today);
  const born = monthOf(args.accountCreatedOn);
  const closed = new Set(args.closedMonths.map(monthOf));

  const open: string[] = [];
  for (let back = MAX_MONTHS_BACK; back >= 1; back -= 1) {
    const month = shiftMonth(current, -back);
    if (month >= born && !closed.has(month)) open.push(month);
  }
  return open;
}

/** When the pot's money reached savings. */
function movedOnOf(pot: PotRow): string {
  return pot.kind === 'month' && pot.month ? movesToSavingsOn(pot.month) : pot.added_on;
}

/**
 * Oldest money first, by the day it reached savings: a month on the 1st after it, so a month never
 * sorts before money added while it was still running. On the same day a month pot is the older:
 * it is the earlier month's money.
 */
function oldestFirst(a: PotRow, b: PotRow): number {
  const byDay = movedOnOf(a).localeCompare(movedOnOf(b));
  if (byDay !== 0) return byDay;
  if (a.kind !== b.kind) return a.kind === 'month' ? -1 : 1;
  const byCreated = a.created_at.localeCompare(b.created_at);
  return byCreated !== 0 ? byCreated : a.id.localeCompare(b.id);
}

const newestFirst = (a: PotRow, b: PotRow) => oldestFirst(b, a);

/**
 * Cents each live pot has in goals, and the cents in goals no live pot claims. Every goal's net
 * from a pot is floored at zero first: a goal cannot hand a pot back more than it took, nor offset
 * another goal's send.
 */
function moneyInGoals(
  pots: readonly PotRow[],
  moves: readonly MoveRow[],
): { byPot: Map<string, number>; unclaimed: number } {
  const live = new Set(pots.filter((pot) => !pot.removed_at).map((pot) => pot.id));
  const perGoalAndPot = new Map<string, { potId: string | null; net: number }>();
  for (const move of moves) {
    // A pot that is gone, or a move without one, still holds its money out of savings.
    const potId = move.pot_id && live.has(move.pot_id) ? move.pot_id : null;
    const key = `${move.goal_id} ${potId ?? ''}`;
    const entry = perGoalAndPot.get(key) ?? { potId, net: 0 };
    entry.net += cents(move.amount);
    perGoalAndPot.set(key, entry);
  }

  const byPot = new Map<string, number>();
  let unclaimed = 0;
  for (const { potId, net } of perGoalAndPot.values()) {
    if (net <= 0) continue;
    if (potId) byPot.set(potId, (byPot.get(potId) ?? 0) + net);
    else unclaimed += net;
  }
  return { byPot, unclaimed };
}

/** Live pots, newest first, each with what it has in goals and what is left in savings. */
function viewPots(
  pots: readonly PotRow[],
  moves: readonly MoveRow[],
): { views: PotView[]; held: number; inGoals: number; unclaimed: number } {
  const { byPot, unclaimed } = moneyInGoals(pots, moves);
  let held = 0;
  let inGoals = unclaimed;
  const views = pots
    .filter((pot) => !pot.removed_at)
    .sort(newestFirst)
    .map((pot): PotView => {
      const amount = Math.max(0, cents(pot.amount));
      const out = byPot.get(pot.id) ?? 0;
      const sent = Math.min(amount, out);
      held += amount;
      inGoals += out;

      const leftOver = pot.kind === 'month' ? cents(pot.earned) - cents(pot.spent) : 0;
      // An overspent month holds nothing; once the person gives it an amount it is a pot like any.
      const status: PotStatus =
        pot.kind === 'month' && amount === 0 && leftOver <= 0
          ? 'overspent'
          : sent === 0
            ? 'ready'
            : sent === amount
              ? 'sent'
              : 'partly';

      return {
        ...pot,
        status,
        left: fromCents(amount - sent),
        sentFromIt: fromCents(sent),
        leftOver: fromCents(leftOver),
        movedOn: movedOnOf(pot),
      };
    });
  return { views, held, inGoals, unclaimed };
}

/**
 * Ready to use = Σ live pots − money in goals that came from savings, never below zero. Which pot a
 * send came from is stored on the move, so each pot's status follows the pots the person actually
 * sent from.
 */
export function savingsSummary(args: { pots: readonly PotRow[]; moves: readonly MoveRow[] }): {
  readyToUse: number;
  inGoals: number;
  /** Live (not removed), newest first. */
  pots: PotView[];
  /** Live pots with money left, newest first: "September $640 · July $210". */
  withMoneyLeft: PotView[];
} {
  const { views, held, inGoals } = viewPots(args.pots, args.moves);
  return {
    readyToUse: fromCents(Math.max(0, held - inGoals)),
    inGoals: fromCents(inGoals),
    pots: views,
    withMoneyLeft: views.filter((view) => view.left > 0),
  };
}

/** One goal's share of a send, from one pot: one goal_moves row. */
export type SendDraw = { goal_id: string; pot_id: string; amount: number };

/**
 * Which pots a send to several goals is drawn from: the pot the person is sending from first (a
 * month's page, "Send to my goals"), then the newest pot first. Goals draw in the order given, each
 * from what the goals before it left, so one batch never spends a cent twice. One goal drawing on
 * two pots gets two rows. Never more than the pots hold: a goal asking for more gets what is left.
 */
export function allocateBatch(args: {
  pots: readonly PotRow[];
  moves: readonly MoveRow[];
  items: readonly { goal_id: string; amount: number }[];
  preferPotId?: string | null;
}): SendDraw[] {
  const { views } = viewPots(args.pots, args.moves);
  const preferred = views.filter((view) => view.id === args.preferPotId);
  const order = [...preferred, ...views.filter((view) => view.id !== args.preferPotId)];
  const room = new Map(order.map((view) => [view.id, cents(view.left)]));

  const draws: SendDraw[] = [];
  for (const item of args.items) {
    let wanted = Math.max(0, cents(item.amount));
    for (const pot of order) {
      if (wanted === 0) break;
      const has = room.get(pot.id) ?? 0;
      if (has === 0) continue;
      const take = Math.min(wanted, has);
      room.set(pot.id, has - take);
      wanted -= take;
      draws.push({ goal_id: item.goal_id, pot_id: pot.id, amount: fromCents(take) });
    }
  }
  return draws;
}

/** `allocateBatch` for one goal. */
export function allocateSend(args: {
  pots: readonly PotRow[];
  moves: readonly MoveRow[];
  amount: number;
  preferPotId?: string | null;
}): { pot_id: string; amount: number }[] {
  return allocateBatch({
    pots: args.pots,
    moves: args.moves,
    items: [{ goal_id: '', amount: args.amount }],
    preferPotId: args.preferPotId,
  }).map(({ pot_id, amount }) => ({ pot_id, amount }));
}

/**
 * Which pots money taken out of a goal goes back to: the pots of the goal's most recent sends
 * first, never more than the goal's net from a pot, so the total is at most what the goal has from
 * savings. When one send drew on two pots, the older pot is refilled first: drawn newest first, it
 * was the last one drawn. Money no pot claims goes back last, with pot_id null. `pots` only settles
 * that tie; without it the pot id does.
 */
export function allocateTakeBack(args: {
  goalId: string;
  moves: readonly MoveRow[];
  amount: number;
  pots?: readonly PotRow[];
}): { pot_id: string | null; amount: number }[] {
  const byId = new Map((args.pots ?? []).map((pot) => [pot.id, pot]));
  const fromPot = new Map<string, { potId: string | null; net: number; lastSent: string }>();
  for (const move of args.moves) {
    if (move.goal_id !== args.goalId) continue;
    const potId = move.pot_id ?? null;
    const key = potId ?? '';
    const entry = fromPot.get(key) ?? { potId, net: 0, lastSent: '' };
    const amount = cents(move.amount);
    entry.net += amount;
    if (amount > 0 && move.created_at > entry.lastSent) entry.lastSent = move.created_at;
    fromPot.set(key, entry);
  }

  const order = [...fromPot.values()]
    .filter((entry) => entry.net > 0)
    .sort((a, b) => {
      if (!a.potId || !b.potId) return a.potId ? -1 : b.potId ? 1 : 0;
      if (a.lastSent !== b.lastSent) return b.lastSent.localeCompare(a.lastSent);
      const potA = byId.get(a.potId);
      const potB = byId.get(b.potId);
      if (potA && potB) return oldestFirst(potA, potB);
      return a.potId.localeCompare(b.potId);
    });

  let wanted = Math.max(0, cents(args.amount));
  const back: { pot_id: string | null; amount: number }[] = [];
  for (const entry of order) {
    if (wanted === 0) break;
    const take = Math.min(wanted, entry.net);
    wanted -= take;
    back.push({ pot_id: entry.potId, amount: fromCents(take) });
  }
  return back;
}

/** Why a pot cannot be changed: its money is in goals, or a month would be kept at $0. */
export type PotRefusal = 'in-goals' | 'zero';

/**
 * Whether a pot may be edited to `newAmount` (≥ 0) or removed (null).
 * - 'in-goals': lowering or removing it below what this pot has in goals. `inGoals` is that
 *   ("$X of this is already in your goals") and `short` the least that must come out of goals first.
 *   Raising is always allowed.
 * - 'zero': $0 for a pot that is not an overspent month; removing it says so honestly.
 */
export function canChangePot(args: {
  pots: readonly PotRow[];
  moves: readonly MoveRow[];
  potId: string;
  /** Null removes the pot. */
  newAmount: number | null;
}): { ok: true } | { ok: false; reason: PotRefusal; inGoals: number; short: number } {
  const pot = args.pots.find((row) => row.id === args.potId && !row.removed_at);
  if (!pot) return { ok: true };

  const inGoals = moneyInGoals(args.pots, args.moves).byPot.get(pot.id) ?? 0;
  const before = Math.max(0, cents(pot.amount));
  const next = args.newAmount === null ? 0 : cents(args.newAmount);
  const lowering = args.newAmount === null || next < before;
  if (lowering && next < inGoals) {
    return {
      ok: false,
      reason: 'in-goals',
      inGoals: fromCents(inGoals),
      short: fromCents(inGoals - next),
    };
  }

  const overspentMonth = pot.kind === 'month' && cents(pot.earned) - cents(pot.spent) <= 0;
  if (args.newAmount !== null && next === 0 && !overspentMonth) {
    return { ok: false, reason: 'zero', inGoals: fromCents(inGoals), short: 0 };
  }
  return { ok: true };
}

/**
 * What a closed month would become if worked out again today, when something dated in it changed
 * after it closed (a receipt typed late, one deleted, a late charge). Offered, never applied on its
 * own: the stored figures stay frozen until the person accepts. `now` is `monthTotals` for the month
 * today, from the same flows that closed it.
 *
 * Null for anything but a live month pot, or when earned and spent still match to the cent. The new
 * amount is the left over (never below $0) but never below what this pot already has in goals,
 * since that money has gone; `capped` says it was held there.
 */
export function monthUpdate(args: {
  pot: PotRow;
  moves: readonly MoveRow[];
  now: { earned: number; spent: number };
}): null | {
  earned: number;
  spent: number;
  earnedChange: number;
  spentChange: number;
  amount: number;
  inGoals: number;
  capped: boolean;
} {
  const { pot } = args;
  if (pot.kind !== 'month' || pot.removed_at) return null;

  const earned = cents(args.now.earned);
  const spent = cents(args.now.spent);
  const earnedChange = earned - cents(pot.earned);
  const spentChange = spent - cents(pot.spent);
  if (earnedChange === 0 && spentChange === 0) return null;

  const inGoals = moneyInGoals([pot], args.moves).byPot.get(pot.id) ?? 0;
  const leftOver = Math.max(0, earned - spent);
  const capped = leftOver < inGoals;
  return {
    earned: fromCents(earned),
    spent: fromCents(spent),
    earnedChange: fromCents(earnedChange),
    spentChange: fromCents(spentChange),
    amount: fromCents(capped ? inGoals : leftOver),
    inGoals: fromCents(inGoals),
    capped,
  };
}
