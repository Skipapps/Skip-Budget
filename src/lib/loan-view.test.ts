import {
  DAY_31_2024,
  DAY_31_2025,
  START_28_DEC_DAY_2,
  WIREFRAME,
  WIREFRAME_DAY_22,
  type AddLoanReference,
} from '@/lib/__fixtures__/add-loan-reference';
import { referenceSchedule } from '@/lib/__fixtures__/loan-reference';
import { amortise, termsFromStored, type LoanTerms, type StoredLoan } from '@/lib/loan';
import { scheduleWithOverrides } from '@/lib/loan-overrides';
import { readLoanRoute, termsFromRoute } from '@/lib/loan-route';
import { loanStatus } from '@/lib/loan-status';
import {
  loanHistory,
  loanScheduleParams,
  upcomingPayments,
  type LoanHistory,
  type LoanPayment,
} from '@/lib/loan-view';
import { toCents } from '@/lib/money';

const TODAY = '2026-10-12';

/**
 * A loan as `save_loan` files it from the Add Loan flow: the start date as funded_on, and the
 * payment day only when the first payment was clamped (loan-review's `save.paymentDay`).
 */
function storedOf(loan: AddLoanReference, more: Partial<StoredLoan> = {}): StoredLoan {
  const clamped = Number(loan.firstPayment.slice(8)) !== loan.paymentDay;
  return {
    principal: loan.principal,
    annual_rate: loan.annualRate,
    term_months: loan.months,
    monthly_payment: loan.paymentCents / 100,
    first_payment_on: loan.firstPayment,
    funded_on: loan.start,
    day_count_basis: 'actual/365',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    payment_day: clamped ? loan.paymentDay : null,
    ...more,
  };
}

const termsOf = (row: StoredLoan): LoanTerms => {
  const terms = termsFromStored(row);
  if (!terms) throw new Error('no schedule');
  return terms;
};

/** The independent Python reference's rows, as the page's rows. */
const referenceRows = (loan: AddLoanReference): LoanPayment[] =>
  loan.rows.map(([date, , interest, paid], index) => ({
    number: index + 1,
    date,
    payment: paid / 100,
    principal: (paid - interest) / 100,
    interest: interest / 100,
  }));

/** The schedule's own rows in the page's shape. */
const scheduleRows = (terms: LoanTerms): LoanPayment[] =>
  amortise(terms).rows.map(({ number, date, payment, principal, interest }) => ({
    number,
    date,
    payment,
    principal,
    interest,
  }));

/** History (oldest first) then the payments to come: the whole schedule, seen on `today`. */
function joined(history: LoanHistory, upcoming: LoanPayment[]): LoanPayment[] {
  const made = history.entries.map(({ kind: _kind, ...payment }) => payment).reverse();
  return [...made, ...upcoming];
}

const bothCards = (terms: LoanTerms, today: string) =>
  joined(loanHistory(terms, today), upcomingPayments(terms, today, Infinity));

const WIREFRAME_LOAN = termsOf(storedOf(WIREFRAME));

describe('the wireframe car loan on 12 Oct 2026 (daily interest, actual/365)', () => {
  it('lists the next four payments, each split as the schedule posts it', () => {
    expect(upcomingPayments(WIREFRAME_LOAN, TODAY, 4)).toEqual([
      // 10,673.67 × 6.25% × 30 / 365 = 54.83.
      { number: 22, date: '2026-10-27', payment: 424.8, principal: 369.97, interest: 54.83 },
      { number: 23, date: '2026-11-27', payment: 424.8, principal: 370.11, interest: 54.69 },
      { number: 24, date: '2026-12-27', payment: 424.8, principal: 373.77, interest: 51.03 },
      { number: 25, date: '2027-01-27', payment: 424.8, principal: 374.05, interest: 50.75 },
    ]);
  });

  it('lists the last three of 21 payments made, newest first', () => {
    expect(loanHistory(WIREFRAME_LOAN, TODAY, 3)).toEqual({
      entries: [
        {
          kind: 'payment',
          number: 21,
          date: '2026-09-27',
          payment: 424.8,
          principal: 366.2,
          interest: 58.6,
        },
        {
          kind: 'payment',
          number: 20,
          date: '2026-08-27',
          payment: 424.8,
          principal: 364.26,
          interest: 60.54,
        },
        {
          kind: 'payment',
          number: 19,
          date: '2026-07-27',
          payment: 424.8,
          principal: 364.35,
          interest: 60.45,
        },
      ],
      total: 21,
      firstPaymentOn: '2025-01-27',
    });
  });

  it('is the independent reference’s schedule, all 48 rows, across the two cards', () => {
    expect(bothCards(WIREFRAME_LOAN, TODAY)).toEqual(referenceRows(WIREFRAME));
  });

  it('agrees with the Loans page: 21 made, next 27 Oct, 27 of 48 left', () => {
    const status = loanStatus(WIREFRAME_LOAN, TODAY);
    const [next] = upcomingPayments(WIREFRAME_LOAN, TODAY, 1);
    expect(status).toMatchObject({ paymentsMade: 21, paymentsLeft: 27, amountLeft: 10_673.67 });
    expect(loanHistory(WIREFRAME_LOAN, TODAY).total).toBe(status.paymentsMade);
    expect(status.nextPayment).toEqual({
      number: next.number,
      date: next.date,
      amount: next.payment,
    });
  });

  it('reads the same with no funding date saved, a month before the first payment', () => {
    const implied = termsOf(storedOf(WIREFRAME, { funded_on: null }));
    expect(upcomingPayments(implied, TODAY, 4)).toEqual(upcomingPayments(WIREFRAME_LOAN, TODAY, 4));
    expect(loanHistory(implied, TODAY)).toEqual(loanHistory(WIREFRAME_LOAN, TODAY));
  });
});

describe('the wireframe’s own figures, which are monthly rests', () => {
  const MONTHLY = termsOf(storedOf(WIREFRAME, { day_count_basis: 'monthly' }));

  it('is “27 Oct · $369.21 principal · $55.59 interest · $424.80”', () => {
    // 10,673.63 × 6.25% ÷ 12 = 55.59.
    expect(upcomingPayments(MONTHLY, TODAY, 1)).toEqual([
      { number: 22, date: '2026-10-27', payment: 424.8, principal: 369.21, interest: 55.59 },
    ]);
  });

  it('matches the exact-integer amortiser on every row', () => {
    const reference = referenceSchedule({
      principalCents: 1_800_000,
      rateUnits: 6250,
      unitsPerPercent: 1000,
      months: 48,
      fundedOn: new Date(2024, 11, 27),
      firstPaymentOn: new Date(2025, 0, 27),
      basis: 'monthly',
      paymentCents: 42_480,
    });
    expect(
      bothCards(MONTHLY, TODAY).map((row) => [
        row.number,
        toCents(row.interest),
        toCents(row.payment),
      ]),
    ).toEqual(reference.map((row) => [row.number, row.interest, row.paid]));
  });
});

describe('a loan paid on the 31st', () => {
  const DAY_31 = termsOf(storedOf(DAY_31_2025));

  it('is due on each month’s last day after a first payment clamped to 28 Feb', () => {
    expect(DAY_31.paymentDay).toBe(31);
    expect(upcomingPayments(DAY_31, '2025-05-15', 4)).toEqual([
      { number: 4, date: '2025-05-31', payment: 867.33, principal: 819.14, interest: 48.19 },
      { number: 5, date: '2025-06-30', payment: 867.33, principal: 825.74, interest: 41.59 },
      { number: 6, date: '2025-07-31', payment: 867.33, principal: 829.61, interest: 37.72 },
      { number: 7, date: '2025-08-31', payment: 867.33, principal: 834.9, interest: 32.43 },
    ]);
    expect(loanHistory(DAY_31, '2025-05-15')).toEqual({
      entries: [
        {
          kind: 'payment',
          number: 3,
          date: '2025-04-30',
          payment: 867.33,
          principal: 815.66,
          interest: 51.67,
        },
        {
          kind: 'payment',
          number: 2,
          date: '2025-03-31',
          payment: 867.33,
          principal: 808.79,
          interest: 58.54,
        },
        {
          kind: 'payment',
          number: 1,
          date: '2025-02-28',
          payment: 867.33,
          principal: 809.8,
          interest: 57.53,
        },
      ],
      total: 3,
      firstPaymentOn: '2025-02-28',
    });
  });

  it('follows the saved payment day: without it every payment would fall on the 28th', () => {
    const unanchored = termsOf(storedOf(DAY_31_2025, { payment_day: null }));
    expect(upcomingPayments(unanchored, '2025-05-15', 1)[0].date).toBe('2025-05-28');
  });

  it('counts the 31 May payment as made on 31 May', () => {
    expect(loanHistory(DAY_31, '2025-05-30').total).toBe(3);
    expect(loanHistory(DAY_31, '2025-05-31', 1)).toMatchObject({
      entries: [{ number: 4, date: '2025-05-31' }],
      total: 4,
    });
    expect(upcomingPayments(DAY_31, '2025-05-31', 1)[0].date).toBe('2025-06-30');
  });

  it('is the independent reference’s schedule, 2025 and leap-year 2024', () => {
    expect(bothCards(DAY_31, '2025-05-15')).toEqual(referenceRows(DAY_31_2025));
    const leap = termsOf(storedOf(DAY_31_2024));
    expect(loanHistory(leap, '2024-03-01', 3).entries.map((entry) => entry.date)).toEqual([
      '2024-02-29',
    ]);
    expect(upcomingPayments(leap, '2024-03-01', 1)[0].date).toBe('2024-03-31');
    expect(bothCards(leap, '2024-03-01')).toEqual(referenceRows(DAY_31_2024));
  });
});

describe('a loan with changed payments', () => {
  // $1,500 as payment 10 (made) and $3,000 as payment 22 (next), as the jsonb holds them.
  const CHANGED = termsOf(storedOf(WIREFRAME, { payment_overrides: { '10': 1500, '22': 3000 } }));

  it('shows the changed payment made, and the changed one next, each split to the cent', () => {
    const history = loanHistory(CHANGED, TODAY);
    expect(history.total).toBe(21);
    expect(history.entries.find((entry) => entry.number === 10)).toEqual({
      kind: 'payment',
      number: 10,
      date: '2025-10-27',
      payment: 1500,
      principal: 1423.16,
      interest: 76.84,
    });
    expect(upcomingPayments(CHANGED, TODAY, 2)).toEqual([
      { number: 22, date: '2026-10-27', payment: 3000, principal: 2951.02, interest: 48.98 },
      { number: 23, date: '2026-11-27', payment: 424.8, principal: 389.85, interest: 34.95 },
    ]);
  });

  it('matches the exact-integer amortiser with the same changes, all 39 payments', () => {
    const reference = referenceSchedule({
      principalCents: 1_800_000,
      rateUnits: 6250,
      unitsPerPercent: 1000,
      months: 48,
      fundedOn: new Date(2024, 11, 27),
      firstPaymentOn: new Date(2025, 0, 27),
      basis: 'actual/365',
      paymentCents: 42_480,
      changes: { 10: 150_000, 22: 300_000 },
    });
    expect(reference).toHaveLength(39);
    expect(
      bothCards(CHANGED, TODAY).map((row) => [
        row.number,
        toCents(row.interest),
        toCents(row.payment),
      ]),
    ).toEqual(reference.map((row) => [row.number, row.interest, row.paid]));
  });

  it('ends at a change above what is owed: the payoff is the last payment', () => {
    const early = termsOf(storedOf(WIREFRAME, { payment_overrides: { '22': 20_000 } }));
    // 10,673.67 owed after payment 21, plus 54.83 of interest.
    const last = {
      number: 22,
      date: '2026-10-27',
      payment: 10_728.5,
      principal: 10_673.67,
      interest: 54.83,
    };
    expect(upcomingPayments(early, TODAY, 4)).toEqual([last]);
    expect(upcomingPayments(early, '2026-10-27', 4)).toEqual([]);
    expect(loanHistory(early, '2026-10-27', 1)).toEqual({
      entries: [{ kind: 'payment', ...last }],
      total: 22,
      firstPaymentOn: '2025-01-27',
    });
  });
});

describe('a loan with no payment made yet', () => {
  it('has no history and says when the first payment is', () => {
    for (const today of ['2024-12-27', '2025-01-26']) {
      expect(loanHistory(WIREFRAME_LOAN, today, 3)).toEqual({
        entries: [],
        total: 0,
        firstPaymentOn: '2025-01-27',
      });
      // 18,000 × 6.25% × 31 / 365 = 95.55.
      expect(upcomingPayments(WIREFRAME_LOAN, today, 1)).toEqual([
        { number: 1, date: '2025-01-27', payment: 424.8, principal: 329.25, interest: 95.55 },
      ]);
    }
    expect(loanHistory(WIREFRAME_LOAN, '2025-01-27').total).toBe(1);
  });

  it('dates a first payment the month after next, with its longer opening period', () => {
    // Start 28 Dec, paid on the 2nd: first due 2 Feb, 36 days of interest.
    const terms = termsOf(storedOf(START_28_DEC_DAY_2));
    expect(loanHistory(terms, '2026-01-15')).toEqual({
      entries: [],
      total: 0,
      firstPaymentOn: '2026-02-02',
    });
    expect(upcomingPayments(terms, '2026-01-15', 1)).toEqual([
      { number: 1, date: '2026-02-02', payment: 230.96, principal: 181.69, interest: 49.27 },
    ]);
  });
});

describe('a finished loan', () => {
  it('has nothing to come, and its history ends with the last payment', () => {
    for (const today of ['2028-12-27', '2031-01-01']) {
      expect(upcomingPayments(WIREFRAME_LOAN, today, 4)).toEqual([]);
      const history = loanHistory(WIREFRAME_LOAN, today, 3);
      expect(history.total).toBe(48);
      expect(history.entries.map((entry) => entry.number)).toEqual([48, 47, 46]);
      // The last payment takes up the difference: 422.33 + 2.17.
      expect(history.entries[0]).toEqual({
        kind: 'payment',
        number: 48,
        date: '2028-12-27',
        payment: 424.5,
        principal: 422.33,
        interest: 2.17,
      });
    }
  });
});

describe('every row, on every day that matters', () => {
  const LENDER = termsOf({
    principal: 31_394.33,
    annual_rate: 8.14,
    term_months: 72,
    monthly_payment: 554.34,
    first_payment_on: '2026-01-14',
    funded_on: '2025-11-30',
    day_count_basis: 'actual/365',
    statement_on: '2026-08-14',
    statement_principal: 28_698.15,
  });
  const cases: [string, LoanTerms][] = [
    ['wireframe, actual/365', WIREFRAME_LOAN],
    ['wireframe, monthly rests', termsOf(storedOf(WIREFRAME, { day_count_basis: 'monthly' }))],
    ['wireframe, actual/360', termsOf(storedOf(WIREFRAME, { day_count_basis: 'actual/360' }))],
    ['wireframe, 30/360', termsOf(storedOf(WIREFRAME, { day_count_basis: '30/360' }))],
    ['day 22, a larger last payment', termsOf(storedOf(WIREFRAME_DAY_22))],
    ['day 31, 2025', termsOf(storedOf(DAY_31_2025))],
    ['day 31, leap 2024', termsOf(storedOf(DAY_31_2024))],
    ['28 Dec, day 2', termsOf(storedOf(START_28_DEC_DAY_2))],
    [
      'changed payments',
      termsOf(storedOf(WIREFRAME, { payment_overrides: { '10': 1500, '22': 3000 } })),
    ],
    ['paid off by a change', termsOf(storedOf(WIREFRAME, { payment_overrides: { '22': 20_000 } }))],
    ['pinned to a real lender’s statement', LENDER],
    ['0%', termsOf(storedOf(WIREFRAME, { annual_rate: 0, principal: 1200, monthly_payment: 25 }))],
    // Never saved, but the split must still add up when an overpayment is in the payment.
    [
      'a calculator overpayment',
      {
        ...WIREFRAME_LOAN,
        extra: { monthly: 50, lumpSums: [{ on: new Date(2026, 2, 3), amount: 2000 }] },
      },
    ],
  ];

  const shift = (date: string, days: number) => {
    const moved = new Date(`${date}T00:00:00`);
    moved.setDate(moved.getDate() + days);
    return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, '0')}-${String(moved.getDate()).padStart(2, '0')}`;
  };

  it.each(cases)('%s', (_name, terms) => {
    const rows = scheduleRows(terms);
    const days = [
      shift(rows[0].date, -40),
      ...rows.flatMap((row) => [shift(row.date, -1), row.date, shift(row.date, 1)]),
      shift(rows[rows.length - 1].date, 40),
    ];

    for (const row of rows) {
      expect(toCents(row.principal) + toCents(row.interest)).toBe(toCents(row.payment));
    }

    for (const today of days) {
      const history = loanHistory(terms, today);
      const upcoming = upcomingPayments(terms, today, Infinity);
      const status = loanStatus(terms, today);

      expect(joined(history, upcoming)).toEqual(rows);
      expect(history.entries.every((entry) => entry.date <= today)).toBe(true);
      expect(upcoming.every((payment) => payment.date > today)).toBe(true);
      expect(history.total).toBe(status.paymentsMade);
      expect(history.firstPaymentOn).toBe(rows[0].date);
      expect(loanHistory(terms, today, 3)).toEqual({
        ...history,
        entries: history.entries.slice(0, 3),
      });
      expect(upcomingPayments(terms, today, 4)).toEqual(upcoming.slice(0, 4));
      expect(upcoming[0] ?? null).toEqual(
        status.nextPayment
          ? expect.objectContaining({
              number: status.nextPayment.number,
              date: status.nextPayment.date,
              payment: status.nextPayment.amount,
            })
          : null,
      );
    }
  });
});

describe('how many rows a count gives', () => {
  it('gives none for zero, a negative or a garbled count, and whole rows for a fraction', () => {
    for (const count of [0, -1, -4, Number.NaN]) {
      expect(upcomingPayments(WIREFRAME_LOAN, TODAY, count)).toEqual([]);
      expect(loanHistory(WIREFRAME_LOAN, TODAY, count)).toMatchObject({ entries: [], total: 21 });
      // Before the first payment a negative end would count back from the schedule's end.
      expect(upcomingPayments(WIREFRAME_LOAN, '2025-01-01', count)).toEqual([]);
      expect(loanHistory(WIREFRAME_LOAN, '2031-01-01', count)).toMatchObject({
        entries: [],
        total: 48,
      });
    }
    expect(upcomingPayments(WIREFRAME_LOAN, TODAY, 2.9)).toHaveLength(2);
    expect(loanHistory(WIREFRAME_LOAN, TODAY, 2.9).entries).toHaveLength(2);
  });

  it('gives what there is when more are asked for', () => {
    expect(upcomingPayments(WIREFRAME_LOAN, '2028-10-30', 4).map((p) => p.number)).toEqual([
      47, 48,
    ]);
    expect(loanHistory(WIREFRAME_LOAN, '2025-02-27', 3).entries.map((e) => e.number)).toEqual([
      2, 1,
    ]);
    expect(loanHistory(WIREFRAME_LOAN, TODAY).entries).toHaveLength(21);
  });
});

describe('the Payment schedule link', () => {
  /** What `/loan-schedule` builds from the link, as its screen does. */
  function schedulePage(terms: LoanTerms) {
    const params = loanScheduleParams(terms);
    if (!params) throw new Error('no link');
    const route = readLoanRoute(params);
    return scheduleWithOverrides(termsFromRoute(route, { withExtras: true }), route.overrides);
  }

  it('carries the stored loan as it is saved', () => {
    expect(loanScheduleParams(WIREFRAME_LOAN)).toEqual({
      amount: '18000',
      rate: '6.25',
      months: '48',
      start: '2025-01-27',
      funded: '2024-12-27',
      basis: 'actual/365',
      payment: '424.8',
    });
    expect(loanScheduleParams(termsOf(storedOf(DAY_31_2025)))).toMatchObject({
      start: '2025-02-28',
      day: '31',
    });
    expect(
      loanScheduleParams(
        termsOf(storedOf(WIREFRAME, { payment_overrides: { '10': 1500, '22': 3000 } })),
      ),
    ).toMatchObject({ overrides: '{"10":1500,"22":3000}' });
    expect(
      loanScheduleParams(termsOf(storedOf(WIREFRAME, { funded_on: null }))),
    ).not.toHaveProperty('funded');
  });

  it.each([
    ['wireframe', storedOf(WIREFRAME)],
    [
      'monthly rests, no funding date',
      storedOf(WIREFRAME, { day_count_basis: 'monthly', funded_on: null }),
    ],
    ['day 31', storedOf(DAY_31_2025)],
    ['leap day 31', storedOf(DAY_31_2024)],
    ['changed payments', storedOf(WIREFRAME, { payment_overrides: { '10': 1500, '22': 3000 } })],
    ['paid off by a change', storedOf(WIREFRAME, { payment_overrides: { '22': 20_000 } })],
  ])('opens the same schedule, row for row: %s', (_name, row) => {
    const terms = termsOf(row);
    expect(schedulePage(terms).rows).toEqual(amortise(terms).rows);
  });

  it('would move a day-31 loan’s payments without the payment day', () => {
    const terms = termsOf(storedOf(DAY_31_2025));
    const params = loanScheduleParams(terms);
    const { day: _day, ...withoutDay } = params ?? {};
    const route = readLoanRoute(withoutDay);
    const moved = scheduleWithOverrides(termsFromRoute(route, { withExtras: true }));
    expect(moved.rows[1].date).toBe('2025-03-28');
    expect(schedulePage(terms).rows[1].date).toBe('2025-03-31');
  });

  it('is not offered for a loan pinned to a statement, which the link cannot carry', () => {
    const pinned = termsOf(
      storedOf(WIREFRAME, { statement_on: '2026-03-27', statement_principal: 13_000 }),
    );
    expect(loanScheduleParams(pinned)).toBeNull();
  });
});
