import {
  moneyBook,
  type BookIncome,
  type BookPayment,
  type BookSource,
  type BookSpend,
} from '@/lib/money-book';

const CHECKING: BookSource = {
  id: 'checking',
  kind: 'account',
  name: 'Chase Checking ••7730',
  balance: 1000,
  asOf: '2026-10-01',
};
const SAVINGS: BookSource = {
  id: 'savings',
  kind: 'account',
  name: 'Savings',
  balance: 500,
  asOf: '2026-10-01',
};
const VISA: BookSource = {
  id: 'visa',
  kind: 'card',
  name: 'Visa ••4821',
  balance: 200,
  asOf: '2026-10-01',
};

const spent = (
  date: string,
  amount: number,
  sourceId = '',
  id = `r-${date}-${amount}`,
): BookSpend => ({
  id,
  label: 'Store',
  date,
  amount,
  kind: 'receipt',
  sourceId,
});

const paid = (
  date: string,
  amount: number,
  toId: string,
  fromAccountId: string | null = null,
  id = `p-${date}-${amount}-${toId}`,
): BookPayment => ({ id, amount, date, toId, fromAccountId });

const earned = (date: string, amount: number, accountId: string | null = null): BookIncome => ({
  id: `income-salary@${date}`,
  label: 'Salary',
  date,
  amount,
  accountId,
});

const book = (input: {
  today?: string;
  sources?: BookSource[];
  spending?: BookSpend[];
  payments?: BookPayment[];
  income?: BookIncome[];
}) =>
  moneyBook({
    today: input.today ?? '2026-10-20',
    sources: input.sources ?? [],
    spending: input.spending ?? [],
    payments: input.payments ?? [],
    income: input.income ?? [],
  });

describe('moneyBook — Current balance', () => {
  it('is the typed balances plus pay since, less spending since, each counted once', () => {
    const result = book({
      sources: [CHECKING, VISA],
      spending: [
        spent('2026-10-03', 50, 'visa'),
        spent('2026-10-04', 30, 'checking'),
        spent('2026-10-05', 20),
      ],
      income: [earned('2026-10-15', 2000, 'checking')],
    });

    expect(result.current).toEqual({ balance: 2700, income: 2000, expenses: 100 });
  });

  it('adds to the cent, not in floating point', () => {
    const result = book({
      sources: [{ ...CHECKING, balance: 0.1 }],
      spending: [spent('2026-10-02', 0.1, 'checking'), spent('2026-10-03', 0.2, 'checking')],
      income: [earned('2026-10-10', 0.3, 'checking')],
    });

    expect(result.current).toEqual({ balance: 0.1, income: 0.3, expenses: 0.3 });
    expect(result.sources.get('checking')?.balance).toBe(0.1);
  });

  it('counts nothing that has not happened yet', () => {
    const result = book({
      today: '2026-10-14',
      sources: [CHECKING],
      spending: [spent('2026-10-15', 900, 'checking')],
      payments: [paid('2026-10-15', 100, 'checking')],
      income: [earned('2026-10-01', 1000, 'checking'), earned('2026-10-15', 1000, 'checking')],
    });

    expect(result.current).toEqual({ balance: 2000, income: 1000, expenses: 0 });
  });

  it('adds a twice-a-month pay on the 15th and again on the last day, and keeps both', () => {
    const at = (today: string) =>
      book({
        today,
        income: [
          earned('2026-09-15', 1000),
          earned('2026-09-30', 1000),
          earned('2026-10-15', 1000),
        ],
      }).current.income;

    expect(at('2026-09-15')).toBe(1000);
    expect(at('2026-09-29')).toBe(1000);
    expect(at('2026-09-30')).toBe(2000);
    expect(at('2026-10-14')).toBe(2000);
    expect(at('2026-10-15')).toBe(3000);
  });
});

describe('moneyBook — a card payment moves money, it does not make it', () => {
  it('takes the money out of the account it came from and clears the card', () => {
    const result = book({
      sources: [CHECKING, VISA],
      spending: [spent('2026-10-03', 50, 'visa')],
      payments: [paid('2026-10-10', 250, 'visa', 'checking')],
    });

    expect(result.sources.get('checking')?.balance).toBe(750);
    expect(result.sources.get('visa')?.balance).toBe(0);
    // 1,000 − 200 − 50 before; the payment changes nothing.
    expect(result.current).toEqual({ balance: 750, income: 0, expenses: 50 });
  });

  it('shows the payment on both sides, each naming the other', () => {
    const result = book({
      sources: [CHECKING, VISA],
      payments: [paid('2026-10-10', 250, 'visa', 'checking', 'pay-1')],
    });

    expect(result.sources.get('visa')?.entries).toEqual([
      expect.objectContaining({
        id: 'payment-pay-1',
        amount: 250,
        kind: 'payment',
        counterpart: 'Chase Checking ••7730',
      }),
    ]);
    expect(result.sources.get('checking')?.entries).toEqual([
      expect.objectContaining({
        id: 'payment-pay-1:out',
        amount: -250,
        kind: 'payment',
        counterpart: 'Visa ••4821',
      }),
    ]);
  });

  it('raises the total when the card is paid from somewhere the app does not track', () => {
    const result = book({
      sources: [CHECKING, VISA],
      payments: [paid('2026-10-10', 150, 'visa')],
    });

    expect(result.sources.get('visa')?.balance).toBe(50);
    expect(result.current).toEqual({ balance: 950, income: 150, expenses: 0 });
  });

  it('treats a payment from an account since removed as money from outside', () => {
    const result = book({
      sources: [VISA],
      payments: [paid('2026-10-10', 100, 'visa', 'closed-account')],
    });

    expect(result.sources.get('visa')?.entries[0]?.counterpart).toBeNull();
    expect(result.current.balance).toBe(-100);
    expect(result.current.income).toBe(100);
  });
});

describe('moneyBook — money added to an account', () => {
  it('moves money between two of the person’s accounts without changing the total', () => {
    const result = book({
      sources: [CHECKING, SAVINGS],
      payments: [paid('2026-10-10', 100, 'savings', 'checking')],
    });

    expect(result.sources.get('checking')?.balance).toBe(900);
    expect(result.sources.get('savings')?.balance).toBe(600);
    expect(result.current).toEqual({ balance: 1500, income: 0, expenses: 0 });
  });

  it('raises the account and the total when it is new money', () => {
    const result = book({
      sources: [CHECKING],
      payments: [paid('2026-10-10', 75.25, 'checking')],
    });

    expect(result.sources.get('checking')?.balance).toBe(1075.25);
    expect(result.current).toEqual({ balance: 1075.25, income: 75.25, expenses: 0 });
  });

  it('counts only the side inside its account’s window when the other was restated later', () => {
    const result = book({
      sources: [CHECKING, { ...SAVINGS, balance: 600, asOf: '2026-10-12' }],
      // Moved on the 10th; Savings was restated on the 12th with the $100 already in it.
      payments: [paid('2026-10-10', 100, 'savings', 'checking')],
    });

    expect(result.sources.get('checking')?.balance).toBe(900);
    expect(result.sources.get('savings')?.balance).toBe(600);
    expect(result.current).toEqual({ balance: 1500, income: 0, expenses: 100 });
  });
});

describe('moneyBook — pay lands in its account', () => {
  it('adds each payday to the account it is paid into, from that account’s typed day', () => {
    const result = book({
      sources: [{ ...CHECKING, balance: 3000, asOf: '2026-10-08' }],
      // The pay on the 1st is already in the $3,000 typed on the 8th.
      income: [earned('2026-10-01', 1500, 'checking'), earned('2026-10-15', 1500, 'checking')],
    });

    expect(result.sources.get('checking')?.balance).toBe(4500);
    expect(result.sources.get('checking')?.entries).toEqual([
      expect.objectContaining({
        id: 'income-salary@2026-10-15',
        kind: 'income',
        label: 'Salary',
        amount: 1500,
      }),
    ]);
    expect(result.current.income).toBe(1500);
  });

  it('treats pay into a card or a removed account as pay into no account', () => {
    const result = book({
      sources: [CHECKING, VISA],
      income: [earned('2026-10-05', 800, 'visa'), earned('2026-10-06', 50, 'gone')],
    });

    expect(result.sources.get('checking')?.balance).toBe(1000);
    expect(result.sources.get('visa')?.balance).toBe(200);
    expect(result.current).toEqual({ balance: 1650, income: 850, expenses: 0 });
  });

  it('moves the total but no balance when paid into no account, counted from when tracking began', () => {
    const result = book({
      sources: [CHECKING],
      income: [earned('2026-09-15', 800), earned('2026-10-15', 800)],
    });

    expect(result.sources.get('checking')?.balance).toBe(1000);
    expect(result.current).toEqual({ balance: 1800, income: 800, expenses: 0 });
  });
});

describe('moneyBook — one card or account', () => {
  it('runs a card as debt: spending raises it, a payment clears it', () => {
    const ledger = book({
      sources: [VISA],
      spending: [spent('2026-10-03', 40, 'visa')],
      payments: [paid('2026-10-04', 100, 'visa')],
    }).sources.get('visa');

    expect(ledger).toMatchObject({ charged: 40, paid: 100, balance: 140 });
  });

  it('runs an account the other way: spending lowers it, money in raises it', () => {
    const ledger = book({
      sources: [CHECKING],
      spending: [spent('2026-10-03', 40, 'checking')],
      payments: [paid('2026-10-04', 100, 'checking')],
    }).sources.get('checking');

    expect(ledger).toMatchObject({ charged: 40, paid: 100, balance: 1060 });
  });

  it('counts a card’s spending from the day of its typed balance, that day included', () => {
    const result = book({
      sources: [{ ...VISA, balance: 100, asOf: '2026-10-10' }],
      spending: [
        spent('2026-10-09', 40, 'visa'),
        spent('2026-10-10', 15, 'visa'),
        spent('2026-10-11', 5, 'visa'),
      ],
    });

    expect(result.sources.get('visa')?.balance).toBe(120);
    expect(result.current).toEqual({ balance: -120, income: 0, expenses: 20 });
  });

  it('counts every expense on a card with no typed day', () => {
    const result = book({
      sources: [CHECKING, { ...VISA, balance: 0, asOf: null }],
      spending: [spent('2026-09-15', 25, 'visa')],
    });

    expect(result.sources.get('visa')?.balance).toBe(25);
    expect(result.current.balance).toBe(975);
  });

  it('counts spending on no card, or on a card since removed, from when tracking began', () => {
    const result = book({
      sources: [CHECKING, { ...SAVINGS, balance: 0, asOf: '2026-10-12' }],
      spending: [spent('2026-09-30', 70), spent('2026-10-01', 10), spent('2026-10-05', 5, 'gone')],
    });

    expect(result.current.expenses).toBe(15);
    expect(result.current.balance).toBe(985);
  });

  it('lists newest first, and the same day by id', () => {
    const ledger = book({
      sources: [CHECKING],
      spending: [
        spent('2026-10-02', 1, 'checking', 'b'),
        spent('2026-10-05', 1, 'checking', 'c'),
        spent('2026-10-02', 1, 'checking', 'a'),
      ],
    }).sources.get('checking');

    expect(ledger?.entries.map((entry) => entry.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('moneyBook — the total always agrees with the balances', () => {
  it('is the accounts less what the cards owe, plus what belongs to no account', () => {
    const result = book({
      sources: [CHECKING, SAVINGS, VISA],
      spending: [
        spent('2026-10-03', 12.34, 'visa'),
        spent('2026-10-04', 5.66, 'checking'),
        spent('2026-10-06', 3.33),
      ],
      payments: [
        paid('2026-10-07', 100, 'visa', 'checking'),
        paid('2026-10-08', 40, 'savings', 'checking'),
        paid('2026-10-09', 9.99, 'savings'),
      ],
      income: [earned('2026-10-15', 1234.56, 'savings'), earned('2026-10-16', 10)],
    });

    const balance = (id: string) => result.sources.get(id)!.balance;
    const fromBalances = balance('checking') + balance('savings') - balance('visa') + 10 - 3.33;
    expect(result.current.balance).toBeCloseTo(fromBalances, 10);
    // And the same figure from what came in and went out.
    expect(result.current.balance).toBeCloseTo(
      1000 + 500 - 200 + result.current.income - result.current.expenses,
      10,
    );
  });
});
