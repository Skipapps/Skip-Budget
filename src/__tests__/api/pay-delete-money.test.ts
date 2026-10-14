import type { ChargeRow } from '@/api/charges';
import type { PayRow } from '@/api/pay';
import {
  bookFlows,
  ledgerEntries,
  type BillRow,
  type LedgerInput,
  type ReceiptRow,
} from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { moneyBook } from '@/lib/money-book';
import { duePay, paydaysInHistory, type SalaryToRecord } from '@/lib/pay-record';
import { monthTotals, monthUpdate, savingsFlows, type PotRow } from '@/lib/savings';

/**
 * Deleting a pay that has paid, on one fixture account: "keep past" moves no balance and no
 * savings month by a cent, and nothing of it is projected after today; "remove everything" moves
 * Current balance, the account it was paid into and every month it paid in by exactly its paydays.
 *
 * The removals are applied as the database does them: keep writes the paydays due by today
 * (`duePay`, what useDeletePay writes) and deletes the salary, which sets its paydays' salary to
 * null (on delete set null); everything deletes the salary and its paydays (delete_salary_and_pay).
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-13';
const ACCOUNT_DAY = '2026-06-01';
const CHECKING = 'checking';
const CARD = 'card';

/** Paid every other Friday, with a raise from July; 9 paydays on the record, 9 Oct not yet. */
const ACME: SalaryToRecord = {
  id: 'acme',
  name: 'Acme Payroll',
  amount: 1834.62,
  frequency: 'biweekly',
  last_payday: '2026-06-05',
  account_ids: [CHECKING],
};

/** Stays throughout: paid on the 15th, every month on the record. */
const CAFE: SalaryToRecord = {
  id: 'cafe',
  name: 'Corner Cafe',
  amount: 412.37,
  frequency: 'monthly',
  last_payday: '2026-06-15',
  account_ids: [CHECKING],
};

/** A pay just this time, on the record. */
const BONUS: SalaryToRecord = {
  id: 'bonus',
  name: 'Bonus',
  amount: 250,
  frequency: 'once',
  last_payday: '2026-08-22',
  account_ids: [CHECKING],
};

const pay = (salary: SalaryToRecord, paid_on: string, amount = Number(salary.amount)): PayRow => ({
  id: `${salary.id}-${paid_on}`,
  salary_source_id: salary.id,
  label: salary.name ?? '',
  amount,
  paid_on,
  bank_account_id: CHECKING,
});

const ACME_RECORDED = [
  pay(ACME, '2026-06-05', 1790),
  pay(ACME, '2026-06-19', 1790),
  ...['07-03', '07-17', '07-31', '08-14', '08-28', '09-11', '09-25'].map((day) =>
    pay(ACME, `2026-${day}`),
  ),
];

const PAY: PayRow[] = [
  ...ACME_RECORDED,
  ...['06-15', '07-15', '08-15', '09-15'].map((day) => pay(CAFE, `2026-${day}`)),
  pay(BONUS, '2026-08-22'),
];

const RENT: BillRow = {
  id: 'rent',
  name: 'Rent',
  amount: 1450,
  category_id: 'housing',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-11-01',
  starts_on: '2026-07-01',
  ends_on: null,
  card_id: null,
  bank_account_id: CHECKING,
  created_at: '2026-06-01T12:00:00Z',
};

const CHARGES: ChargeRow[] = ['07-01', '08-01', '09-01', '10-01'].map((day) => ({
  id: `rent-2026-${day}`,
  bill_id: 'rent',
  subscription_id: null,
  label: 'Rent',
  amount: 1450,
  charged_on: `2026-${day}`,
  card_id: null,
  bank_account_id: CHECKING,
}));

const receipt = (id: string, on: string, amount: number, source: string): ReceiptRow => ({
  id,
  brand_id: null,
  merchant: id,
  amount,
  purchased_on: on,
  category_id: 'groceries',
  card_id: source === CARD ? CARD : null,
  bank_account_id: source === CHECKING ? CHECKING : null,
  note: null,
  source: 'manual',
  image_path: null,
  brands: null,
});

const RECEIPTS = [
  receipt('grocer-jun', '2026-06-20', 143.87, CARD),
  receipt('pharmacy-jul', '2026-07-09', 27.45, CHECKING),
  receipt('grocer-aug', '2026-08-18', 211.06, CARD),
  receipt('fuel-sep', '2026-09-30', 61.2, CARD),
  receipt('grocer-oct', '2026-10-04', 96.13, CARD),
];

type World = { salaries: SalaryToRecord[]; pay: PayRow[] };

const BEFORE: World = { salaries: [ACME, CAFE, BONUS], pay: PAY };

function input(world: World): Omit<LedgerInput, 'from' | 'to'> {
  return {
    receipts: RECEIPTS,
    subscriptions: [],
    bills: [RENT],
    salaries: world.salaries.map((salary) => ({
      ...salary,
      name: salary.name ?? '',
      amount: Number(salary.amount),
      account_ids: [...salary.account_ids],
    })),
    charges: CHARGES,
    pay: world.pay,
    accountOrder: [CHECKING],
    today: TODAY,
  };
}

/** What useMoneyBook reads: every kept day up to today. */
function book(world: World) {
  const entries = ledgerEntries({
    ...input(world),
    from: historyFloor(true, new Date(`${TODAY}T00:00:00`)),
    to: TODAY,
  });
  const flows = bookFlows({ entries, subscriptions: [], bills: [RENT], charges: CHARGES });
  const money = moneyBook({
    today: TODAY,
    sources: [
      { id: CHECKING, kind: 'account', name: 'Checking', balance: 2418.06, asOf: ACCOUNT_DAY },
      { id: CARD, kind: 'card', name: 'Visa', balance: 312.44, asOf: ACCOUNT_DAY },
    ],
    spending: flows.spending,
    payments: [],
    income: flows.income,
  });
  return { flows, money };
}

const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

/** Each month's earned, spent and left over, as the close step and "so far" work them out. */
function months(world: World) {
  const { flows } = book(world);
  const { pay: earned, spending } = savingsFlows([
    ...flows.spending,
    ...flows.income.map((row) => ({ kind: 'income', date: row.date, amount: row.amount })),
  ]);
  return MONTHS.map((month) =>
    monthTotals({ month, today: TODAY, accountCreatedOn: ACCOUNT_DAY, pay: earned, spending }),
  );
}

/** The months closed before the removal, frozen as savings pots. */
const POTS: PotRow[] = months(BEFORE)
  .slice(0, 4)
  .map((totals, index) => ({
    id: `pot-${MONTHS[index]}`,
    kind: 'month',
    month: `${MONTHS[index]}-01`,
    label: null,
    earned: totals.earned,
    spent: totals.spent,
    amount: Math.max(0, totals.leftOver),
    added_on: `${MONTHS[index + 1]}-01`,
    note: null,
    wrap_up_seen_at: null,
    removed_at: null,
    created_at: `${MONTHS[index + 1]}-01T09:00:00Z`,
  }));

/** "Keep past": the paydays due by today written down, then the salary deleted. */
function keepPast(world: World, salary: SalaryToRecord): World {
  const written = duePay({
    today: TODAY,
    salaries: [salary],
    recorded: world.pay,
    accountOrder: [CHECKING],
  }).map((row) => ({ ...row, id: `written-${row.paid_on}` }));
  return {
    salaries: world.salaries.filter((row) => row.id !== salary.id),
    pay: [...world.pay, ...written].map((row) =>
      row.salary_source_id === salary.id ? { ...row, salary_source_id: null } : row,
    ),
  };
}

/** "Remove everything": the salary and its paydays. */
function removeEverything(world: World, salary: SalaryToRecord): World {
  return {
    salaries: world.salaries.filter((row) => row.id !== salary.id),
    pay: world.pay.filter((row) => row.salary_source_id !== salary.id),
  };
}

const toCents = (amount: number) => Math.round(amount * 100);

describe('the question’s count', () => {
  it('counts the 9 paydays on the record and the 1 due today but not written down', () => {
    expect(
      paydaysInHistory({
        today: TODAY,
        salary: ACME,
        recorded: PAY.filter((row) => row.salary_source_id === ACME.id),
      }),
    ).toBe(10);
  });

  it('is what Acme shows in the money book', () => {
    const shown = book(BEFORE).flows.income.filter((row) => row.label === 'Acme Payroll');
    expect(shown).toHaveLength(10);
  });
});

describe('keep past', () => {
  const after = keepPast(BEFORE, ACME);

  it('writes down only 9 October, as Acme pays it today', () => {
    expect(after.pay.filter((row) => row.id.startsWith('written-'))).toEqual([
      {
        id: 'written-2026-10-09',
        salary_source_id: null,
        label: 'Acme Payroll',
        amount: 1834.62,
        paid_on: '2026-10-09',
        bank_account_id: CHECKING,
      },
    ]);
  });

  it('leaves Current balance and Checking to the cent', () => {
    const before = book(BEFORE).money;
    const kept = book(after).money;
    expect(kept.current).toEqual(before.current);
    expect(kept.sources.get(CHECKING)!.balance).toBe(before.sources.get(CHECKING)!.balance);
    expect(kept.sources.get(CARD)!.balance).toBe(before.sources.get(CARD)!.balance);
  });

  it('leaves every month, closed or so far, to the cent, so no closed month offers an update', () => {
    expect(months(after)).toEqual(months(BEFORE));
    for (const [index, pot] of POTS.entries()) {
      expect(monthUpdate({ pot, moves: [], now: months(after)[index] })).toBeNull();
    }
  });

  it('projects nothing of Acme after today, and the next sweep writes nothing for it', () => {
    const ahead = ledgerEntries({ ...input(after), from: '2026-10-14', to: '2027-12-31' });
    expect(ahead.filter((entry) => entry.label === 'Acme Payroll')).toEqual([]);
    expect(
      duePay({
        today: '2027-03-01',
        salaries: after.salaries,
        recorded: after.pay,
        accountOrder: [],
      })
        .map((row) => row.salary_source_id)
        .filter((id) => id === ACME.id),
    ).toEqual([]);
  });

  it('needs 9 October written first: deleting Acme alone takes it off Current balance', () => {
    const deletedOnly: World = {
      salaries: BEFORE.salaries.filter((row) => row.id !== ACME.id),
      pay: BEFORE.pay.map((row) =>
        row.salary_source_id === ACME.id ? { ...row, salary_source_id: null } : row,
      ),
    };
    expect(
      toCents(book(BEFORE).money.current.balance) -
        toCents(book(deletedOnly).money.current.balance),
    ).toBe(toCents(1834.62));
  });

  it('keeps the other pays running', () => {
    const ahead = ledgerEntries({ ...input(after), from: '2026-10-14', to: '2026-11-30' });
    expect(ahead.filter((entry) => entry.kind === 'income').map((entry) => entry.date)).toEqual([
      '2026-11-15',
      '2026-10-15',
    ]);
  });
});

describe('remove everything', () => {
  const after = removeEverything(BEFORE, ACME);
  // 2 × 1,790.00 before the raise, 8 × 1,834.62 after it (9 October included).
  const ACME_PAID = 3580 + 14676.96;

  it('takes exactly Acme’s ten paydays off Current balance and Checking', () => {
    const before = book(BEFORE).money;
    const removed = book(after).money;
    expect(toCents(before.current.balance) - toCents(removed.current.balance)).toBe(
      toCents(ACME_PAID),
    );
    expect(toCents(before.current.income) - toCents(removed.current.income)).toBe(
      toCents(ACME_PAID),
    );
    expect(removed.current.expenses).toBe(before.current.expenses);
    expect(
      toCents(before.sources.get(CHECKING)!.balance) -
        toCents(removed.sources.get(CHECKING)!.balance),
    ).toBe(toCents(ACME_PAID));
    expect(removed.sources.get(CARD)!.balance).toBe(before.sources.get(CARD)!.balance);
  });

  it('takes each month’s Acme pay off that month, and spending stays', () => {
    const was = months(BEFORE);
    const now = months(after);
    expect(now.map((month, index) => toCents(was[index].earned) - toCents(month.earned))).toEqual([
      toCents(3580),
      toCents(3 * 1834.62),
      toCents(2 * 1834.62),
      toCents(2 * 1834.62),
      toCents(1834.62),
    ]);
    expect(now.map((month) => month.spent)).toEqual(was.map((month) => month.spent));
  });

  it('offers each closed month its update, by exactly what Acme paid in it', () => {
    const now = months(after);
    expect(
      POTS.map((pot, index) => monthUpdate({ pot, moves: [], now: now[index] })?.earnedChange),
    ).toEqual([-3580, -5503.86, -3669.24, -3669.24]);
  });
});

describe('the fixture itself', () => {
  it('has what a month earned and spent by hand', () => {
    expect(months(BEFORE)).toEqual([
      // June: 2 × 1,790.00 + 412.37; the grocer on the card.
      { earned: 3992.37, spent: 143.87, leftOver: 3848.5 },
      // July: 3 × 1,834.62 + 412.37; rent and the pharmacy.
      { earned: 5916.23, spent: 1477.45, leftOver: 4438.78 },
      // August: 2 × 1,834.62 + 412.37 + 250.00 bonus; rent and the grocer.
      { earned: 4331.61, spent: 1661.06, leftOver: 2670.55 },
      // September: 2 × 1,834.62 + 412.37; rent and fuel.
      { earned: 4081.61, spent: 1511.2, leftOver: 2570.41 },
      // October so far: 9 October; rent and the grocer.
      { earned: 1834.62, spent: 1546.13, leftOver: 288.49 },
    ]);
  });
});
