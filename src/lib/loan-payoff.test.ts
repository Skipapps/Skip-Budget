import {
  PAYOFF_SAMPLE,
  PAYOFF_SCENARIOS,
  type PayoffReference,
  type PayoffSample,
} from '@/lib/__fixtures__/loan-payoff-reference';
import { inCents, referenceSchedule } from '@/lib/__fixtures__/loan-reference';
import { referencePayoffs, type PayoffReferenceLoan } from '@/lib/__fixtures__/payoff-reference';
import {
  amortise,
  paymentDates,
  readStoredPayoffs,
  scheduleByYear,
  termsFromStored,
  type AccrualBasis,
  type LoanTerms,
  type StoredLoan,
} from '@/lib/loan';
import { scheduleWithOverrides } from '@/lib/loan-overrides';
import {
  checkPayoff,
  paidOffOn,
  payoffDays,
  payoffQuote,
  withoutPayoff,
  type PayoffAccepted,
  type PayoffCheck,
} from '@/lib/loan-payoff';
import { loanStatus } from '@/lib/loan-status';
import { loanHistory } from '@/lib/loan-view';
import { toCents } from '@/lib/money';

const day = (iso: string) => new Date(`${iso}T00:00:00`);
const cents = (amount: number) => toCents(amount);

/** The engine's terms for a reference loan, payoffs given ids in the order paid. */
function termsOf(loan: PayoffReferenceLoan, payoffs = loan.payoffs): LoanTerms {
  return {
    principal: loan.principalCents / 100,
    annualRatePercent: Number(loan.rate),
    months: loan.months,
    firstPaymentOn: day(loan.firstPayment),
    fundedOn: loan.fundedOn ? day(loan.fundedOn) : undefined,
    paymentDay: loan.paymentDay,
    basis: loan.basis,
    payment: loan.paymentCents / 100,
    paymentOverrides: loan.changes
      ? Object.fromEntries(Object.entries(loan.changes).map(([n, v]) => [n, v / 100]))
      : undefined,
    payoffs: payoffs.map(([on, amount], index) => ({
      id: `p${index}`,
      on: day(on),
      amount: amount / 100,
    })),
  };
}

/** The engine's schedule in the reference's tuples. */
function engineTuples(terms: LoanTerms) {
  const schedule = amortise(terms);
  return {
    rows: schedule.rows.map((row) => [
      row.date,
      row.days,
      cents(row.interest),
      cents(row.payment),
      cents(row.balance),
    ]),
    posts: schedule.payoffs.map((posting) => [
      posting.on,
      cents(posting.amount),
      cents(posting.interest),
      cents(posting.principal),
      cents(posting.balance),
      posting.full,
      posting.afterPayments,
    ]),
    interestCents: cents(schedule.totalInterest),
    paidCents: cents(schedule.totalPaid),
  };
}

/** The engine's quotes on the reference's days, on the payoffs the reference had paid by then. */
function quotesOf(loan: PayoffReference | PayoffSample): Record<string, number> {
  const terms = termsOf(loan, loan.payoffs.slice(0, loan.quotePayoffs));
  return Object.fromEntries(
    Object.keys(loan.quotes ?? {}).map((on) => [on, cents(payoffQuote(terms, on).payoff)]),
  );
}

const accepted = (check: PayoffCheck): PayoffAccepted => {
  if (!check.ok) throw new Error(`refused: ${JSON.stringify(check.refusal)}`);
  return check;
};

const S = PAYOFF_SCENARIOS;
const WIREFRAME = termsOf(S.wireframe);
const TODAY = '2026-10-12';

describe('the engine against the independent Python reference', () => {
  it.each(Object.entries(S))('%s: every row, payoff and total to the cent', (_, scenario) => {
    const loan: PayoffReference = scenario;
    expect(engineTuples(termsOf(loan))).toEqual({
      rows: loan.rows,
      posts: loan.posts,
      interestCents: loan.interestCents,
      paidCents: loan.paidCents,
    });
  });

  it.each(Object.entries(S).filter(([, loan]) => 'quotes' in loan))(
    '%s: quotes what clears the loan on each day',
    (_, scenario) => {
      const loan: PayoffReference = scenario;
      expect(quotesOf(loan)).toEqual(loan.quotes);
    },
  );

  it('agrees on 60 random loans, every convention: payoffs, rows, last row, totals, quotes', () => {
    for (const loan of PAYOFF_SAMPLE) {
      const terms = termsOf(loan);
      const got = engineTuples(terms);
      expect({
        posts: got.posts,
        rowCount: got.rows.length,
        lastRow: got.rows[got.rows.length - 1] ?? null,
        interestCents: got.interestCents,
        paidCents: got.paidCents,
      }).toEqual({
        posts: loan.posts,
        rowCount: loan.rowCount,
        lastRow: loan.lastRow,
        interestCents: loan.interestCents,
        paidCents: loan.paidCents,
      });
      if (loan.quotes) expect(quotesOf(loan)).toEqual(loan.quotes);
    }
  });

  it('the in-repo reference agrees with Python, so its sweep below stands on it', () => {
    for (const loan of Object.values(S) as PayoffReference[]) {
      const { rows, posts } = referencePayoffs(loan);
      expect({ rows, posts }).toEqual({ rows: loan.rows, posts: loan.posts });
    }
    for (const loan of PAYOFF_SAMPLE) {
      const { rows, posts } = referencePayoffs(loan);
      expect({ rowCount: rows.length, lastRow: rows[rows.length - 1] ?? null, posts }).toEqual({
        rowCount: loan.rowCount,
        lastRow: loan.lastRow,
        posts: loan.posts,
      });
    }
  });
});

/** A seeded generator, so the sweep is the same on every run. */
function generator(seed: number) {
  let state = seed;
  const next = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
  return { next, pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] };
}

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function sweepLoans(count: number): PayoffReferenceLoan[] {
  const { next, pick } = generator(4242);
  const loans: PayoffReferenceLoan[] = [];
  for (let index = 0; index < count; index += 1) {
    const year = pick([2023, 2024, 2025]);
    const month = Math.floor(next() * 12);
    const wanted = pick([1, 14, 27, 28, 29, 30, 31]);
    const first = new Date(year, month, Math.min(wanted, new Date(year, month + 1, 0).getDate()));
    const paymentDay = next() < 0.5 ? pick([29, 30, 31]) : undefined;
    const months = pick([2, 12, 36, 60]);
    const basis = pick<AccrualBasis>(['actual/365', 'actual/360', '30/360', 'monthly']);
    const rate = pick(['0', '4.5', '6.25', '7.4995', '24.99', '60']);
    const principalCents = pick([120_000, 1_800_000, 3_139_433, 25_000_000]);
    const fundedOn =
      next() < 0.5 ? new Date(first.getFullYear(), first.getMonth(), first.getDate() - 40) : null;
    const start = fundedOn ?? new Date(first.getFullYear(), first.getMonth() - 1, first.getDate());
    const dates = paymentDates(first, months, paymentDay);
    const span = Math.round((dates[months - 1].getTime() - start.getTime()) / 86_400_000);
    const solved = cents(
      amortise({
        principal: principalCents / 100,
        annualRatePercent: Number(rate),
        months,
        firstPaymentOn: first,
        paymentDay,
        fundedOn: fundedOn ?? undefined,
        basis,
      }).payment,
    );
    const payoffs: [string, number][] = [];
    for (let made = pick([1, 2, 3]); made > 0; made -= 1) {
      const on = new Date(start);
      on.setDate(on.getDate() + Math.floor(next() * span));
      const date = next() < 0.2 ? dates[Math.floor(next() * months)] : on;
      payoffs.push([iso(date), pick([1, 1999, Math.round(principalCents * 0.1), principalCents])]);
    }
    payoffs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    loans.push({
      principalCents,
      rate,
      months,
      firstPayment: iso(first),
      fundedOn: fundedOn ? iso(fundedOn) : undefined,
      paymentDay,
      basis,
      paymentCents: solved + pick([0, 0, 1, 700]),
      changes: next() < 0.2 && months > 2 ? { 2: solved * 2 } : undefined,
      payoffs,
    });
  }
  return loans;
}

describe('a sweep of 1,200 random loans with random payoffs', () => {
  const loans = sweepLoans(1200);

  it('matches the exact-integer reference row for row and payoff for payoff', () => {
    for (const loan of loans) {
      const got = engineTuples(termsOf(loan));
      expect({ rows: got.rows, posts: got.posts }).toEqual(referencePayoffs(loan));
    }
  });

  it('pays back exactly what was borrowed plus the interest, and keeps the level payment', () => {
    for (const loan of loans) {
      const terms = termsOf(loan);
      const schedule = amortise(terms);
      expect(cents(schedule.payment)).toBe(loan.paymentCents);
      expect(cents(schedule.totalPaid)).toBe(loan.principalCents + cents(schedule.totalInterest));
      const last = schedule.payoffs[schedule.payoffs.length - 1];
      const ended = last?.full ? last.balance : schedule.rows[schedule.rows.length - 1].balance;
      expect(ended).toBe(0);
    }
  });

  it('is cleared by a payoff of exactly the quote, on any day, and by nothing less', () => {
    const { next } = generator(77);
    for (const loan of loans.slice(0, 400)) {
      const terms = termsOf(loan);
      const schedule = amortise(terms);
      const start = schedule.fundedOn;
      const on = new Date(start);
      on.setDate(on.getDate() + Math.floor(next() * 400));
      const quote = payoffQuote(terms, on).payoff;
      if (quote <= 0) continue;
      const paid = { ...terms, payoffs: [...(terms.payoffs ?? []), { on, amount: quote }] };
      const cleared = amortise(paid);
      const posting = cleared.payoffs[cleared.payoffs.length - 1];
      expect(posting).toMatchObject({ on: iso(on), full: true, balance: 0 });
      expect(cleared.payoffOn).toBe(iso(on));
      expect(cleared.rows.every((row) => row.date <= iso(on))).toBe(true);

      const short = { ...terms, payoffs: [...(terms.payoffs ?? []), { on, amount: quote - 0.01 }] };
      expect(amortise(short).payoffs.some((p) => p.on === iso(on) && p.full)).toBe(false);
    }
  });

  it('leaves a loan without payoffs exactly as before, to the exact-integer amortiser', () => {
    for (const loan of loans.slice(0, 300)) {
      const plain = termsOf(loan, []);
      const schedule = amortise(plain);
      expect(schedule.payoffs).toEqual([]);
      expect(amortise({ ...plain, payoffs: undefined })).toEqual(schedule);
      if (!/^\d+(\.\d+)?$/.test(loan.rate)) continue;
      const [whole, fraction = ''] = loan.rate.split('.');
      expect(inCents(schedule.rows)).toEqual(
        referenceSchedule({
          principalCents: loan.principalCents,
          rateUnits: Number(whole + fraction),
          unitsPerPercent: 10 ** fraction.length,
          months: loan.months,
          fundedOn: schedule.fundedOn,
          firstPaymentOn: day(loan.firstPayment),
          paymentDay: loan.paymentDay,
          basis: loan.basis,
          paymentCents: loan.paymentCents,
          changes: loan.changes,
        }),
      );
    }
  });
});

describe('the wireframe car loan: $18,000 at 6.25%, $424.80 a month, paid on the 27th', () => {
  it('a $2,000 partial payoff on 12 Oct 2026 pays 15 days of interest first, then the balance', () => {
    const check = accepted(checkPayoff(WIREFRAME, { on: TODAY, amount: 2000 }, TODAY));
    // $10,673.67 × 6.25% × 15/365 = $27.415… since the 27 Sep payment.
    expect(check).toMatchObject({
      kind: 'partial',
      quote: 10_701.09,
      interest: 27.42,
      principal: 1_972.58,
      balance: 8_701.09,
      endsOn: '2028-07-27',
      paymentsLeft: 22,
      paymentsLeftBefore: 27,
      interestSaved: 269.38,
    });
    const schedule = amortise(check.terms);
    expect(schedule.payment).toBe(424.8);
    expect(schedule.rows).toHaveLength(43);
    // The next payment accrues only from the payoff, on the smaller balance.
    expect(schedule.rows[21]).toMatchObject({
      date: '2026-10-27',
      interest: 22.35,
      principal: 402.45,
      payment: 424.8,
      balance: 8_298.64,
    });
    expect(schedule.rows[42]).toMatchObject({ date: '2028-07-27', payment: 279.12, balance: 0 });
    expect(schedule.totalInterest).toBe(2_120.72);
  });

  it('a cent under the quote is a partial payoff that leaves a cent', () => {
    expect(accepted(checkPayoff(WIREFRAME, { on: TODAY, amount: 10_701.08 }, TODAY))).toMatchObject(
      {
        kind: 'partial',
        balance: 0.01,
        endsOn: '2026-10-27',
      },
    );
  });

  it('the full payoff that day is $10,701.09, and the loan ends on it', () => {
    const quote = payoffQuote(WIREFRAME, TODAY);
    expect(quote).toMatchObject({
      principal: 10_673.67,
      accruedInterest: 27.42,
      payoff: 10_701.09,
      daysAccrued: 15,
    });
    expect(quote.accruedSince).toEqual(day('2026-09-27'));

    const check = accepted(checkPayoff(WIREFRAME, { on: TODAY, amount: 10_701.09 }, TODAY));
    expect(check).toMatchObject({
      kind: 'full',
      interest: 27.42,
      principal: 10_673.67,
      balance: 0,
      endsOn: TODAY,
      paymentsLeft: 0,
      paymentsLeftBefore: 27,
    });
    const status = loanStatus(check.terms, TODAY);
    expect(status).toMatchObject({
      paidOff: true,
      amountLeft: 0,
      percentPaid: 100,
      nextPayment: null,
      lastPaymentOn: TODAY,
      paymentCount: 21,
    });
    expect(loanStatus(check.terms, '2026-10-11')).toMatchObject({
      paidOff: false,
      amountLeft: 10_673.67,
      nextPayment: null,
    });
  });
});

describe('paying in full around a payment day (seen on 27 Oct 2026, payment 22 made)', () => {
  const ON_DAY = '2026-10-27';

  it('on the payment day: the payment posts first, the payoff clears what it leaves', () => {
    const quote = payoffQuote(WIREFRAME, ON_DAY);
    expect(quote).toMatchObject({ payoff: 10_303.7, accruedInterest: 0, daysAccrued: 0 });
    const check = accepted(checkPayoff(WIREFRAME, { on: ON_DAY, amount: 10_303.7 }, ON_DAY));
    expect(check).toMatchObject({ kind: 'full', interest: 0, principal: 10_303.7, endsOn: ON_DAY });
    expect(engineTuples(check.terms)).toEqual({
      rows: S.wireframeFullOnPaymentDay.rows,
      posts: S.wireframeFullOnPaymentDay.posts,
      interestCents: S.wireframeFullOnPaymentDay.interestCents,
      paidCents: S.wireframeFullOnPaymentDay.paidCents,
    });
    // The instalment is counted once: it is the schedule's last row, dated the bill's last day.
    const schedule = amortise(check.terms);
    expect(schedule.rows.at(-1)).toMatchObject({ number: 22, date: ON_DAY, payment: 424.8 });
    expect(schedule.payoffOn).toBe(ON_DAY);
    // $424.80 + $10,303.70 is the balance before the payment plus the whole period's interest.
    expect(cents(424.8) + cents(10_303.7)).toBe(cents(10_673.67) + cents(54.83));
    expect(loanStatus(check.terms, ON_DAY)).toMatchObject({
      paidOff: true,
      paymentsMade: 22,
      lastPaymentOn: ON_DAY,
    });
    expect(loanHistory(check.terms, ON_DAY, 2).entries).toMatchObject([
      { kind: 'payoff', on: ON_DAY, full: true },
      { kind: 'payment', number: 22, date: ON_DAY },
    ]);
  });

  it('the day before it: refused once the payment is made, cleared without it before', () => {
    const before = '2026-10-26';
    const quote = payoffQuote(WIREFRAME, before).payoff;
    // 10,673.67 × 6.25% × 29/365 = 53.00, since 27 Sep.
    expect(quote).toBe(10_726.67);
    expect(checkPayoff(WIREFRAME, { on: before, amount: quote }, ON_DAY)).toEqual({
      ok: false,
      refusal: { reason: 'before-last-payment', lastPaymentOn: ON_DAY, earliest: ON_DAY },
    });
    const check = accepted(checkPayoff(WIREFRAME, { on: before, amount: quote }, before));
    expect(engineTuples(check.terms)).toEqual({
      rows: S.wireframeFullDayBeforePayment.rows,
      posts: S.wireframeFullDayBeforePayment.posts,
      interestCents: S.wireframeFullDayBeforePayment.interestCents,
      paidCents: S.wireframeFullDayBeforePayment.paidCents,
    });
    expect(amortise(check.terms).rows.at(-1)?.date).toBe('2026-09-27');
  });

  it('the day after it: one day of interest on what the payment left', () => {
    const after = '2026-10-28';
    const quote = payoffQuote(WIREFRAME, after);
    // 10,303.70 × 6.25% × 1/365 = 1.764…
    expect(quote).toMatchObject({ payoff: 10_305.46, accruedInterest: 1.76, daysAccrued: 1 });
    const check = accepted(checkPayoff(WIREFRAME, { on: after, amount: 10_305.46 }, after));
    expect(engineTuples(check.terms)).toEqual({
      rows: S.wireframeFullDayAfterPayment.rows,
      posts: S.wireframeFullDayAfterPayment.posts,
      interestCents: S.wireframeFullDayAfterPayment.interestCents,
      paidCents: S.wireframeFullDayAfterPayment.paidCents,
    });
  });
});

describe('payoffQuote', () => {
  const partial = termsOf(S.wireframePartial);

  it('counts the days since the last payoff, not the last payment', () => {
    const quote = payoffQuote(partial, '2026-10-20');
    expect(quote.accruedSince).toEqual(day(TODAY));
    expect(quote.daysAccrued).toBe(8);
    expect(quote.principal).toBe(8_701.09);
    expect(quote.lastPaymentOn).toEqual(day('2026-09-27'));
    // 8,701.09 × 6.25% × 8/365 = 11.919…
    expect(quote.accruedInterest).toBe(11.92);
  });

  it('includes interest a small payoff left unpaid', () => {
    const tiny = termsOf(S.wireframeBelowInterest);
    // $20 of the $27.42 was paid; $7.42 is still owed on top of the days since.
    expect(payoffQuote(tiny, TODAY)).toMatchObject({ principal: 10_673.67, accruedInterest: 7.42 });
    expect(payoffQuote(tiny, TODAY).payoff).toBe(10_681.09);
  });

  it('runs from the funding day for a payoff dated before it', () => {
    const early = { ...WIREFRAME, payoffs: [{ on: day('2024-12-20'), amount: 1000 }] };
    const quote = payoffQuote(early, '2025-01-10');
    expect(quote.accruedSince).toEqual(day('2024-12-27'));
    expect(quote.daysAccrued).toBe(14);
    expect(quote.principal).toBe(17_000);
  });

  it('counts payoff interest in the year it was paid', () => {
    const quote = payoffQuote(partial, '2026-12-31');
    const rowsIn2026 = amortise(partial)
      .rows.filter((row) => row.date.startsWith('2026') && row.date <= '2026-12-31')
      .reduce((sum, row) => sum + cents(row.interest), 0);
    expect(cents(quote.interestPaidThisYear)).toBe(rowsIn2026 + 2742);
  });

  it('is nothing once a payoff cleared the loan, and runs from that day', () => {
    const full = termsOf(S.wireframeFull);
    expect(payoffQuote(full, '2026-11-01')).toMatchObject({
      payoff: 0,
      principal: 0,
      accruedInterest: 0,
      daysAccrued: 20,
      nextPaymentOn: null,
    });
    expect(payoffQuote(full, '2026-11-01').accruedSince).toEqual(day(TODAY));
  });

  it('takes a yyyy-mm-dd or a date alike', () => {
    expect(payoffQuote(partial, '2026-11-05')).toEqual(payoffQuote(partial, day('2026-11-05')));
  });
});

describe('checkPayoff refuses', () => {
  it('a loan already paid off, by its payments or by a payoff', () => {
    expect(checkPayoff(WIREFRAME, { on: '2028-12-27', amount: 1 }, '2028-12-27')).toEqual({
      ok: false,
      refusal: { reason: 'finished' },
    });
    expect(checkPayoff(termsOf(S.wireframeFull), { on: TODAY, amount: 1 }, TODAY)).toEqual({
      ok: false,
      refusal: { reason: 'finished' },
    });
  });

  it('a loan already paid off, whatever day is asked about', () => {
    expect(checkPayoff(termsOf(S.wireframeFull), { on: '2026-10-01', amount: 1 }, TODAY)).toEqual({
      ok: false,
      refusal: { reason: 'finished' },
    });
    expect(checkPayoff(WIREFRAME, { on: '2028-06-01', amount: 1 }, '2029-01-05')).toEqual({
      ok: false,
      refusal: { reason: 'finished' },
    });
  });

  it('an amount that is not whole cents, or nothing', () => {
    for (const amount of [10.005, Number.NaN, Infinity]) {
      expect(checkPayoff(WIREFRAME, { on: TODAY, amount }, TODAY)).toEqual({
        ok: false,
        refusal: { reason: 'not-an-amount' },
      });
    }
    for (const amount of [0, -5]) {
      expect(checkPayoff(WIREFRAME, { on: TODAY, amount }, TODAY)).toEqual({
        ok: false,
        refusal: { reason: 'zero' },
      });
    }
  });

  it('a day that is not one, in the future, or before the loan started', () => {
    for (const on of ['2026-02-30', '12 Oct', '']) {
      expect(checkPayoff(WIREFRAME, { on, amount: 100 }, TODAY)).toEqual({
        ok: false,
        refusal: { reason: 'not-a-date' },
      });
    }
    expect(checkPayoff(WIREFRAME, { on: '2026-10-13', amount: 100 }, TODAY)).toEqual({
      ok: false,
      refusal: { reason: 'future', latest: TODAY },
    });
    expect(checkPayoff(WIREFRAME, { on: '2024-12-26', amount: 100 }, TODAY)).toEqual({
      ok: false,
      refusal: { reason: 'before-start', earliest: '2024-12-27' },
    });
    // The start day itself is fine: no interest yet, all of it off the balance.
    expect(
      accepted(checkPayoff(WIREFRAME, { on: '2024-12-27', amount: 100 }, TODAY)),
    ).toMatchObject({
      interest: 0,
      principal: 100,
    });
  });

  it('more than clears the loan that day, with what does', () => {
    expect(checkPayoff(WIREFRAME, { on: TODAY, amount: 10_701.1 }, TODAY)).toEqual({
      ok: false,
      refusal: { reason: 'more-than-owed', quote: 10_701.09 },
    });
  });

  it('paying in full before a payment already made (R5), from that payment’s day', () => {
    const quoteOn = (on: string) => payoffQuote(WIREFRAME, on).payoff;
    for (const on of ['2026-09-26', '2026-09-20', '2026-08-27']) {
      expect(checkPayoff(WIREFRAME, { on, amount: quoteOn(on) }, TODAY)).toEqual({
        ok: false,
        refusal: {
          reason: 'before-last-payment',
          lastPaymentOn: '2026-09-27',
          earliest: '2026-09-27',
        },
      });
    }
    for (const on of ['2026-09-27', '2026-09-28', TODAY]) {
      expect(checkPayoff(WIREFRAME, { on, amount: quoteOn(on) }, TODAY)).toMatchObject({
        ok: true,
        kind: 'full',
        endsOn: on,
      });
    }
  });

  it('paying in full before a payoff already recorded, but not the same day after it', () => {
    const terms = { ...WIREFRAME, payoffs: [{ id: 'a', on: day('2026-10-10'), amount: 500 }] };
    const quote5 = payoffQuote(terms, '2026-10-05').payoff;
    expect(checkPayoff(terms, { on: '2026-10-05', amount: quote5 }, TODAY)).toEqual({
      ok: false,
      refusal: { reason: 'before-last-payoff', lastPayoffOn: '2026-10-10', earliest: '2026-10-10' },
    });
    const quote10 = payoffQuote(terms, '2026-10-10').payoff;
    expect(
      accepted(checkPayoff(terms, { on: '2026-10-10', amount: quote10 }, TODAY)),
    ).toMatchObject({
      kind: 'full',
      interest: 0,
    });
  });

  it('a back-dated partial that would overtake a later payoff, with the most that does not', () => {
    const terms = { ...WIREFRAME, payoffs: [{ id: 'a', on: day('2026-10-10'), amount: 5000 }] };
    const check = checkPayoff(terms, { on: '2026-10-01', amount: 6000 }, TODAY);
    expect(check).toMatchObject({ ok: false, refusal: { reason: 'overtakes-later' } });
    const most = !check.ok && check.refusal.reason === 'overtakes-later' ? check.refusal.most : 0;
    // The most leaves the 10 Oct payoff posting all $5,000; a cent more cuts it.
    const at = (amount: number) =>
      amortise({ ...terms, payoffs: [...terms.payoffs, { on: day('2026-10-01'), amount }] })
        .payoffs;
    expect(at(most).find((p) => p.id === 'a')).toMatchObject({ amount: 5000 });
    const kept = at(most).find((p) => p.id === 'a')!;
    expect(cents(kept.interest) + cents(kept.principal)).toBe(500_000);
    const cut = at(most + 0.01).find((p) => p.id === 'a')!;
    expect(cents(cut.interest) + cents(cut.principal)).toBeLessThan(500_000);
    expect(accepted(checkPayoff(terms, { on: '2026-10-01', amount: most }, TODAY)).kind).toBe(
      'partial',
    );
  });

  it('a back-dated partial that would end the loan before a payment already made', () => {
    const today = '2027-03-01';
    const check = checkPayoff(WIREFRAME, { on: TODAY, amount: 9500 }, today);
    expect(check).toMatchObject({ ok: false, refusal: { reason: 'overtakes-later' } });
    const most = !check.ok && check.refusal.reason === 'overtakes-later' ? check.refusal.most : 0;
    const ends = (amount: number) =>
      amortise({ ...WIREFRAME, payoffs: [{ on: day(TODAY), amount }] }).payoffOn!;
    expect(ends(most) >= '2027-02-27').toBe(true);
    expect(ends(most + 0.01) < '2027-02-27').toBe(true);
  });
});

describe('checkPayoff accepts', () => {
  it('a partial on a payment day: after the payment, so all of it comes off the balance', () => {
    const check = accepted(checkPayoff(WIREFRAME, { on: '2026-09-27', amount: 2000 }, TODAY));
    expect(check).toMatchObject({
      kind: 'partial',
      interest: 0,
      principal: 2000,
      balance: 8_673.67,
    });
    expect(engineTuples(check.terms).posts).toEqual(S.wireframeOnPaymentDay.posts);
  });

  it('a partial smaller than the interest built up: all of it is interest', () => {
    const check = accepted(checkPayoff(WIREFRAME, { on: TODAY, amount: 20 }, TODAY));
    expect(check).toMatchObject({
      kind: 'partial',
      interest: 20,
      principal: 0,
      balance: 10_673.67,
    });
    // The next payment pays the $7.42 left first, then its own $27.42.
    expect(amortise(check.terms).rows[21]).toMatchObject({ date: '2026-10-27', interest: 34.84 });
  });

  it('a second partial, then the full payoff the same day as another payoff', () => {
    const one = accepted(checkPayoff(WIREFRAME, { on: TODAY, amount: 2000 }, TODAY));
    const two = accepted(checkPayoff(one.terms, { on: '2027-02-03', amount: 1500 }, '2027-02-03'));
    expect(engineTuples(two.terms)).toMatchObject({ posts: S.wireframeTwoPartials.posts });
    expect(two).toMatchObject({ interest: 8.57, principal: 1_491.43, endsOn: '2028-03-27' });
    const quote = payoffQuote(two.terms, '2027-02-03').payoff;
    expect(quote).toBe(5_657.52);
    expect(
      accepted(checkPayoff(two.terms, { on: '2027-02-03', amount: quote }, '2027-02-03')),
    ).toMatchObject({
      kind: 'full',
      interest: 0,
      endsOn: '2027-02-03',
    });
  });

  it('a partial before the first payment, from the start day', () => {
    const check = accepted(
      checkPayoff(WIREFRAME, { on: '2025-01-10', amount: 3000 }, '2025-01-10'),
    );
    expect(engineTuples(check.terms)).toMatchObject({
      rows: S.wireframeBeforeFirstPayment.rows,
      posts: S.wireframeBeforeFirstPayment.posts,
    });
    expect(check.paymentsLeftBefore).toBe(48);
    expect(check.paymentsLeft).toBe(40);
  });

  it('the full payoff before the first payment, leaving no payments at all', () => {
    const quote = payoffQuote(WIREFRAME, '2025-01-10').payoff;
    expect(quote).toBe(18_043.15);
    const check = accepted(
      checkPayoff(WIREFRAME, { on: '2025-01-10', amount: quote }, '2025-01-12'),
    );
    const schedule = amortise(check.terms);
    expect(schedule.rows).toEqual([]);
    expect(schedule).toMatchObject({
      finalPayment: 0,
      payoffOn: '2025-01-10',
      totalInterest: 43.15,
    });
    expect(loanStatus(check.terms, '2025-01-12')).toMatchObject({
      paidOff: true,
      paymentCount: 0,
      paymentsMade: 0,
      amountLeft: 0,
      lastPaymentOn: '2025-01-10',
    });
  });

  it('a day-31 loan: payoffs on its clamped days and the 15th', () => {
    const day31 = termsOf(S.day31, []);
    const one = accepted(checkPayoff(day31, { on: '2025-03-31', amount: 1000 }, '2025-04-20'));
    const two = accepted(checkPayoff(one.terms, { on: '2025-04-15', amount: 3000 }, '2025-04-20'));
    expect(engineTuples(two.terms)).toMatchObject({ rows: S.day31.rows, posts: S.day31.posts });
    expect(amortise(two.terms).rows.map((row) => row.date)).toEqual([
      '2025-02-28',
      '2025-03-31',
      '2025-04-30',
      '2025-05-31',
      '2025-06-30',
      '2025-07-31',
      '2025-08-31',
      '2025-09-30',
    ]);
    expect(payoffQuote(two.terms, '2025-06-15').payoff).toBe(2_714.03);
  });

  it('a 0% loan: the quote is the balance, and none of a payoff is interest', () => {
    const zero = termsOf(S.zeroRate, []);
    const check = accepted(checkPayoff(zero, { on: '2026-05-20', amount: 250 }, '2026-05-20'));
    expect(check).toMatchObject({ interest: 0, principal: 250, balance: 550, interestSaved: 0 });
    expect(engineTuples(check.terms)).toMatchObject({ rows: S.zeroRate.rows });
    expect(payoffQuote(check.terms, '2026-07-03').payoff).toBe(450);
  });
});

describe('payoffDays', () => {
  it('runs from the start to today, and in full from the last payment’s day', () => {
    expect(payoffDays(WIREFRAME, TODAY)).toEqual({
      earliest: '2024-12-27',
      latest: TODAY,
      earliestFull: '2026-09-27',
    });
  });

  it('pays in full no earlier than the last payoff', () => {
    expect(payoffDays(termsOf(S.wireframePartial), '2026-10-20')).toMatchObject({
      earliestFull: TODAY,
    });
  });

  it('on a payment day can pay in full that day, after the payment', () => {
    expect(payoffDays(WIREFRAME, '2026-10-27')).toMatchObject({
      latest: '2026-10-27',
      earliestFull: '2026-10-27',
    });
  });

  it('has none once the loan is paid off, or before it starts', () => {
    expect(payoffDays(termsOf(S.wireframeFull), TODAY)).toBeNull();
    expect(payoffDays(WIREFRAME, '2028-12-27')).toBeNull();
    expect(payoffDays(WIREFRAME, '2024-12-26')).toBeNull();
    expect(payoffDays(WIREFRAME, '2024-12-27')).toMatchObject({ earliestFull: '2024-12-27' });
  });
});

describe('paidOffOn', () => {
  it('is the day a payoff cleared the loan, and null otherwise', () => {
    expect(paidOffOn(WIREFRAME)).toBeNull();
    expect(paidOffOn(termsOf(S.wireframePartial))).toBeNull();
    expect(paidOffOn(termsOf(S.wireframeFull))).toBe(TODAY);
    expect(paidOffOn(termsOf(S.wireframeSameDay))).toBe(TODAY);
  });
});

describe('payoffs read from storage', () => {
  const stored: StoredLoan = {
    principal: 18_000,
    annual_rate: 6.25,
    term_months: 48,
    monthly_payment: 424.8,
    first_payment_on: '2025-01-27',
    funded_on: '2024-12-27',
    day_count_basis: 'actual/365',
    statement_on: null,
    statement_principal: null,
    payment_overrides: null,
    payment_day: null,
  };

  it('a loan with none reads as before', () => {
    expect(termsFromStored(stored)?.payoffs).toBeUndefined();
    expect(termsFromStored({ ...stored, payoffs: [] })?.payoffs).toBeUndefined();
    expect(termsFromStored({ ...stored, payoffs: null })?.payoffs).toBeUndefined();
    expect(amortise(termsFromStored({ ...stored, payoffs: [] })!)).toEqual(amortise(WIREFRAME));
  });

  it('by day, then the order they were recorded, with numerics as text', () => {
    const terms = termsFromStored({
      ...stored,
      payoffs: [
        {
          id: 'c',
          paid_on: '2026-10-12',
          amount: '300.00',
          created_at: '2026-10-12T10:00:00.5+00:00',
        },
        { id: 'b', paid_on: '2026-10-12', amount: 500, created_at: '2026-10-12T09:00:00+00:00' },
        { id: 'a', paid_on: '2026-09-01', amount: '1000', created_at: '2026-10-13T00:00:00+00:00' },
      ],
    });
    expect(terms?.payoffs).toEqual([
      { id: 'a', on: day('2026-09-01'), amount: 1000 },
      { id: 'b', on: day('2026-10-12'), amount: 500 },
      { id: 'c', on: day('2026-10-12'), amount: 300 },
    ]);
  });

  it('the same-day pair then the full payoff, as the Python reference posts them', () => {
    const terms = termsFromStored({
      ...stored,
      payoffs: [
        {
          id: 'x',
          paid_on: '2026-10-12',
          amount: '9901.09',
          created_at: '2026-10-12T12:00:00+00:00',
        },
        {
          id: 'w',
          paid_on: '2026-10-12',
          amount: '300.00',
          created_at: '2026-10-12T11:00:00+00:00',
        },
        {
          id: 'v',
          paid_on: '2026-10-12',
          amount: '500.00',
          created_at: '2026-10-12T10:00:00+00:00',
        },
      ],
    })!;
    expect(engineTuples(terms)).toEqual({
      rows: S.wireframeSameDay.rows,
      posts: S.wireframeSameDay.posts,
      interestCents: S.wireframeSameDay.interestCents,
      paidCents: S.wireframeSameDay.paidCents,
    });
    expect(amortise(terms).payoffs.map((p) => p.id)).toEqual(['v', 'w', 'x']);
  });

  it('leaves out rows that are not a real day and a positive whole-cent amount', () => {
    expect(
      readStoredPayoffs([
        { id: 'bad-day', paid_on: '2026-02-30', amount: 10 },
        { id: 'no-day', paid_on: null, amount: 10 },
        { id: 'zero', paid_on: '2026-10-01', amount: 0 },
        { id: 'negative', paid_on: '2026-10-01', amount: '-5' },
        { id: 'fraction', paid_on: '2026-10-01', amount: 10.005 },
        { id: 'text', paid_on: '2026-10-01', amount: 'ten' },
        null,
        'row',
        { id: 'good', paid_on: '2026-10-01', amount: '10.50' },
      ]),
    ).toEqual([{ id: 'good', on: day('2026-10-01'), amount: 10.5 }]);
    expect(readStoredPayoffs('[]')).toBeUndefined();
    expect(readStoredPayoffs({})).toBeUndefined();
  });
});

describe('payoffs are part of the contract', () => {
  const partial = termsOf(S.wireframePartial);

  it('scheduleWithOverrides keeps them in the saved schedule and the terms it hands back', () => {
    const priced = scheduleWithOverrides(partial, { payments: { 25: 1000 } });
    expect(priced.contract.payoffs).toEqual(amortise(partial).payoffs);
    expect(priced.rows).toEqual(priced.contract.rows);
    const reference = referencePayoffs({ ...S.wireframePartial, changes: { 25: 100_000 } });
    expect(priced.paymentCount).toBe(reference.rows.length);
  });

  it('a payoff, then changed payments before and after it, as the reference has them', () => {
    const terms = termsOf(S.wireframePayoffThenChanges);
    const priced = scheduleWithOverrides(terms);
    expect(priced.problems).toEqual([]);
    expect(engineTuples(terms)).toMatchObject({
      rows: S.wireframePayoffThenChanges.rows,
      posts: S.wireframePayoffThenChanges.posts,
    });
    expect(priced.rows[19]).toMatchObject({ number: 20, payment: 600, overridden: true });
    expect(priced.rows[24]).toMatchObject({ number: 25, payment: 1000, overridden: true });
  });

  it('a changed payment after a full payoff is never reached', () => {
    const priced = scheduleWithOverrides(termsOf(S.wireframeFull), { payments: { 30: 900 } });
    expect(priced.unused).toEqual([30]);
    expect(priced.problems).toEqual([]);
  });

  it('judges a typed monthly payment on the loan as lent, whatever was paid off', () => {
    const asLent = scheduleWithOverrides(WIREFRAME, { monthlyPayment: 50 }).problems;
    expect(asLent).toEqual([
      { payment: 'monthly', reason: 'below-interest', minimum: expect.any(Number) },
    ]);
    // A payoff that clears the loan at any payment would otherwise let any payment through.
    const cleared = { ...WIREFRAME, payoffs: [{ on: day('2025-01-10'), amount: 25_000 }] };
    expect(scheduleWithOverrides(cleared, { monthlyPayment: 50 }).problems).toEqual(asLent);
  });

  it('solves the same level payment with or without them', () => {
    const { payment: _payment, ...unsolved } = partial;
    expect(amortise(unsolved).payment).toBe(amortise({ ...unsolved, payoffs: undefined }).payment);
    // 60% over 20 years solves to $499.98 only because $499.97 would leave a $1,182.78 balloon;
    // a payoff must not talk the solver out of that cent.
    const steep: LoanTerms = {
      principal: 10_000,
      annualRatePercent: 60,
      months: 240,
      firstPaymentOn: day('2025-01-27'),
      fundedOn: day('2024-12-27'),
    };
    expect(amortise(steep).payment).toBe(499.98);
    const paidDown = { ...steep, payoffs: [{ on: day('2026-03-01'), amount: 5000 }] };
    expect(amortise(paidDown).payment).toBe(499.98);
  });
});

describe('withoutPayoff', () => {
  it('takes one back out, and the loan ends where it would without it', () => {
    const two = termsOf(S.wireframeTwoPartials);
    const removed = withoutPayoff(two, 'p1');
    expect(removed?.endsOn).toBe('2028-07-27');
    expect(engineTuples(removed!.terms)).toMatchObject({
      rows: S.wireframePartial.rows,
      posts: S.wireframePartial.posts,
    });
    expect(withoutPayoff(removed!.terms, 'p0')).toEqual({
      terms: { ...WIREFRAME, payoffs: undefined },
      endsOn: '2028-12-27',
    });
  });

  it('reopens a loan a removed payoff had cleared', () => {
    const removed = withoutPayoff(termsOf(S.wireframeFull), 'p0')!;
    expect(removed.endsOn).toBe('2028-12-27');
    expect(loanStatus(removed.terms, TODAY)).toMatchObject({ paidOff: false, paymentsLeft: 27 });
  });

  it('leaves a later payoff as paid, which may then not clear the loan', () => {
    const sameDay = termsOf(S.wireframeSameDay);
    const removed = withoutPayoff(sameDay, 'p0')!;
    const last = amortise(removed.terms).payoffs.at(-1)!;
    expect(last).toMatchObject({ id: 'p2', amount: 9_901.09, full: false, balance: 500 });
    expect(removed.endsOn).toBe('2026-11-27');
  });

  it('is null for an id it does not have', () => {
    expect(withoutPayoff(WIREFRAME, 'p0')).toBeNull();
    expect(withoutPayoff(termsOf(S.wireframePartial), 'nope')).toBeNull();
  });
});

describe('scheduleByYear with payoffs: each year’s figures on the schedule page', () => {
  /** Per year from the in-repo reference's tuples: [payments, payoffs, interest¢, principal¢]. */
  function referenceYears(loan: PayoffReferenceLoan) {
    const years: Record<string, [number, number, number, number]> = {};
    const add = (date: string, payment: number, payoff: number, interest: number, paid: number) => {
      const year = (years[date.slice(0, 4)] ??= [0, 0, 0, 0]);
      year[0] += payment;
      year[1] += payoff;
      year[2] += interest;
      year[3] += paid - interest;
    };
    const { rows, posts } = referencePayoffs(loan);
    for (const [date, , interest, paid] of rows) add(date, 1, 0, interest, paid);
    for (const [on, , interest, principal] of posts) add(on, 0, 1, interest, interest + principal);
    return years;
  }

  function engineYears(terms: LoanTerms) {
    const schedule = amortise(terms);
    const years = scheduleByYear(schedule.rows, schedule.payoffs);
    return {
      years: Object.fromEntries(
        years.map((year) => [
          year.year,
          [year.payments.length, year.payoffs.length, cents(year.interest), cents(year.principal)],
        ]),
      ),
      interestCents: years.reduce((sum, year) => sum + cents(year.interest), 0),
      principalCents: years.reduce((sum, year) => sum + cents(year.principal), 0),
      schedule,
    };
  }

  const loan = (payoffs: [string, number][]): PayoffReferenceLoan => ({ ...S.wireframe, payoffs });

  it('a partial payoff: its interest is in its year, and the years add up', () => {
    const got = engineYears(termsOf(S.wireframePartial));
    expect(got.years).toEqual(referenceYears(S.wireframePartial));
    // 2026: ten payments’ interest plus the payoff’s $27.42.
    const plain = scheduleByYear(amortise(WIREFRAME).rows).find((year) => year.year === '2026')!;
    const rowsOf2026 = amortise(termsOf(S.wireframePartial)).rows.filter((row) =>
      row.date.startsWith('2026'),
    );
    expect(got.years['2026'][2]).toBe(
      rowsOf2026.reduce((sum, row) => sum + cents(row.interest), 0) + 2742,
    );
    expect(got.years['2026'][2]).not.toBe(cents(plain.interest));
    expect(got.interestCents).toBe(cents(got.schedule.totalInterest));
    expect(got.principalCents).toBe(1_800_000);
  });

  it('a full payoff: the last year holds it, and no year after it', () => {
    const got = engineYears(termsOf(S.wireframeFull));
    expect(got.years).toEqual(referenceYears(S.wireframeFull));
    expect(Object.keys(got.years)).toEqual(['2025', '2026']);
    expect(got.years['2026'][1]).toBe(1);
    expect(got.interestCents).toBe(cents(got.schedule.totalInterest));
    expect(got.principalCents).toBe(1_800_000);
  });

  it('a payoff across a year boundary counts in the year paid, the December days included', () => {
    // Paid 10 Jan 2027: 14 days of interest since the 27 Dec 2026 payment, all in 2027.
    const partial = loan([['2027-01-10', 200_000]]);
    const got = engineYears(termsOf(partial));
    expect(got.years).toEqual(referenceYears(partial));
    expect(got.schedule.payoffs[0]).toMatchObject({ on: '2027-01-10', interest: 22.92 });
    const without = engineYears(WIREFRAME);
    expect(got.years['2026']).toEqual(without.years['2026']);
    expect(got.interestCents).toBe(cents(got.schedule.totalInterest));

    // Cleared the same day: 2027 has the payoff and no payment.
    const quote = payoffQuote(WIREFRAME, '2027-01-10').payoff;
    const full = loan([['2027-01-10', cents(quote)]]);
    const cleared = engineYears(termsOf(full));
    expect(cleared.years).toEqual(referenceYears(full));
    expect(cleared.years['2027']).toEqual([0, 1, 2292, cents(quote) - 2292]);
    expect(cleared.principalCents).toBe(1_800_000);
  });

  it('a payoff before the first payment gives a year of its own when it clears the loan', () => {
    const got = engineYears(termsOf(S.wireframeFullBeforeFirstPayment));
    expect(got.years).toEqual({ '2025': [0, 1, 4315, 1_800_000] });
  });

  it('adds up to the schedule’s totals on every loan of the sweep, and is unchanged without payoffs', () => {
    for (const loan of sweepLoans(300)) {
      const got = engineYears(termsOf(loan));
      expect(got.years).toEqual(referenceYears(loan));
      expect(got.interestCents).toBe(cents(got.schedule.totalInterest));
      expect(got.principalCents).toBe(loan.principalCents);
      const rows = amortise(termsOf(loan, [])).rows;
      expect(scheduleByYear(rows, [])).toEqual(scheduleByYear(rows));
    }
  });
});
