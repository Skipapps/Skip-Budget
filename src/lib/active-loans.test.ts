import { WIREFRAME } from '@/lib/__fixtures__/add-loan-reference';
import { activeLoans, loanFinished, loanPricingDay, type LoanBill } from '@/lib/active-loans';
import { termsFromStored, type LoanTerms } from '@/lib/loan';
import { loanStatus } from '@/lib/loan-status';
import { checkPayoff, paidOffOn, payoffQuote } from '@/lib/loan-payoff';
import { loanHistory, upcomingPayments } from '@/lib/loan-view';

const TODAY = '2026-10-09';

const bill = (id: string, name: string, extra: Partial<LoanBill> = {}): LoanBill => ({
  id,
  name,
  next_due_on: '2026-11-01',
  ends_on: null,
  ...extra,
});

describe('activeLoans', () => {
  it('keeps only the bills a loan lives behind, in the bills’ order', () => {
    const bills = [bill('b1', 'Rent'), bill('b2', 'Car'), bill('b3', 'Phone'), bill('b4', 'Study')];
    expect(activeLoans(bills, ['b4', 'b2'], TODAY)).toEqual([
      { billId: 'b2', name: 'Car' },
      { billId: 'b4', name: 'Study' },
    ]);
  });

  it('drops a loan whose bill has no next date', () => {
    expect(activeLoans([bill('b1', 'Car', { next_due_on: null })], ['b1'], TODAY)).toEqual([]);
  });

  it('drops a loan from its last payment day on, as the schedule counts that payment made', () => {
    const bills = [
      bill('b1', 'Finished', { ends_on: '2026-10-08' }),
      bill('b2', 'Last payment today', { ends_on: TODAY }),
      bill('b3', 'Running', { ends_on: '2030-01-01' }),
      bill('b4', 'Last payment tomorrow', { ends_on: '2026-10-10' }),
    ];
    expect(activeLoans(bills, ['b1', 'b2', 'b3', 'b4'], TODAY).map((loan) => loan.billId)).toEqual([
      'b3',
      'b4',
    ]);
  });

  it('ignores a loan whose bill is not in the list, and has nothing when there are no loans', () => {
    expect(activeLoans([bill('b1', 'Car')], ['gone'], TODAY)).toEqual([]);
    expect(activeLoans([bill('b1', 'Car')], [], TODAY)).toEqual([]);
  });
});

describe('loanFinished', () => {
  const running = { next_due_on: '2026-11-01', ends_on: '2030-01-01' };

  it('is finished on the last payment’s own day, by the schedule or by the bill', () => {
    expect(loanFinished(running, TODAY, TODAY)).toBe(true);
    expect(loanFinished(running, TODAY, '2026-10-10')).toBe(false);
    expect(loanFinished({ ...running, ends_on: TODAY }, TODAY)).toBe(true);
    expect(loanFinished({ ...running, ends_on: '2026-10-10' }, TODAY)).toBe(false);
  });

  it('is finished when the bill stopped, whatever the schedule says', () => {
    expect(loanFinished({ next_due_on: null, ends_on: '2030-01-01' }, TODAY, '2030-01-01')).toBe(
      true,
    );
    expect(loanFinished({ ...running, ends_on: '2026-06-05' }, TODAY, '2030-01-01')).toBe(true);
  });

  it('is running while both have payments to come', () => {
    expect(loanFinished(running, TODAY, '2030-01-01')).toBe(false);
    expect(loanFinished(running, TODAY)).toBe(false);
  });
});

describe('loanPricingDay', () => {
  /** The wireframe loan as the Add Loan flow saves it: 48 × $424.80 from 27 Jan 2025 to 27 Dec 2028. */
  const CAR = termsFromStored({
    principal: WIREFRAME.principal,
    annual_rate: WIREFRAME.annualRate,
    term_months: WIREFRAME.months,
    monthly_payment: WIREFRAME.paymentCents / 100,
    first_payment_on: WIREFRAME.firstPayment,
    funded_on: WIREFRAME.start,
    day_count_basis: 'actual/365',
    statement_on: null,
    statement_principal: null,
  }) as LoanTerms;
  const NOW = '2026-10-12';
  const runningBill = { next_due_on: '2026-10-27', ends_on: '2028-12-27' };

  /** What both pages read for a loan: its status and history on the pricing day. */
  const priced = (bill: Pick<LoanBill, 'next_due_on' | 'ends_on'>, today: string) => {
    const day = loanPricingDay(bill, today);
    const status = loanStatus(CAR, day);
    return {
      day,
      status,
      history: loanHistory(CAR, day),
      finished: loanFinished(bill, today, status.lastPaymentOn),
    };
  };

  it('freezes a loan stopped mid-schedule at its end date: nothing after it is made', () => {
    // Stopped 10 Apr 2026: payment 15 (27 Mar) was the last made, leaving $12,846.15.
    const stopped = { next_due_on: '2026-04-27', ends_on: '2026-04-10' };
    for (const today of [NOW, '2027-06-01', '2031-01-01']) {
      const { day, status, history, finished } = priced(stopped, today);
      expect(day).toBe('2026-04-10');
      expect(status).toMatchObject({
        paymentsMade: 15,
        paymentsLeft: 33,
        amountLeft: 12_846.15,
        // 5,153.85 / 18,000 = 28.6%.
        percentPaid: 29,
        paidOff: false,
      });
      expect(history.total).toBe(15);
      expect(history.entries[0]).toMatchObject({ number: 15, date: '2026-03-27' });
      // Finished, with money left: the page's "Stopped on 10 Apr 2026 · $12,846.15 left".
      expect(finished).toBe(true);
    }
    // Priced on today instead, the payments after the stop would read as made.
    expect(loanStatus(CAR, NOW)).toMatchObject({ paymentsMade: 21, amountLeft: 10_673.67 });
  });

  it('counts a payment on the end date itself as made', () => {
    const { status, history } = priced({ next_due_on: null, ends_on: '2026-03-27' }, NOW);
    expect(status).toMatchObject({ paymentsMade: 15, amountLeft: 12_846.15 });
    expect(history.entries[0]).toMatchObject({ kind: 'payment', date: '2026-03-27' });
  });

  it('is today when the bill ends today', () => {
    expect(loanPricingDay({ ends_on: NOW }, NOW)).toBe(NOW);
    expect(priced({ ...runningBill, ends_on: NOW }, NOW).status).toEqual(loanStatus(CAR, NOW));
    // Ending on a payment day: that payment is made, as on any other day.
    const { status } = priced({ ...runningBill, ends_on: '2026-09-27' }, '2026-09-27');
    expect(status).toMatchObject({ paymentsMade: 21, amountLeft: 10_673.67 });
  });

  it('changes nothing for a bill ended on or after the last payment: it is paid off as normal', () => {
    for (const endsOn of ['2028-12-27', '2029-01-31']) {
      for (const today of ['2028-12-27', '2030-01-01']) {
        const { status, history, finished } = priced({ ...runningBill, ends_on: endsOn }, today);
        expect(status).toEqual(loanStatus(CAR, today));
        expect(status).toMatchObject({
          paymentsMade: 48,
          amountLeft: 0,
          percentPaid: 100,
          paidOff: true,
        });
        expect(history.total).toBe(48);
        // Finished and paid off: "Paid off on 27 Dec 2028".
        expect(finished).toBe(true);
      }
    }
  });

  it('is today while the bill runs on, or has no end date', () => {
    expect(loanPricingDay(runningBill, NOW)).toBe(NOW);
    expect(loanPricingDay({ ends_on: null }, NOW)).toBe(NOW);
    expect(loanPricingDay({}, NOW)).toBe(NOW);
    // A bill with neither a next date nor an end date has no stop date to freeze on.
    const noDates: Pick<LoanBill, 'next_due_on' | 'ends_on'> = { next_due_on: null, ends_on: null };
    expect(loanPricingDay(noDates, NOW)).toBe(NOW);
    expect(upcomingPayments(CAR, loanPricingDay(runningBill, NOW), 1)[0].date).toBe('2026-10-27');
  });

  describe('once a payoff cleared the loan', () => {
    const quote = payoffQuote(CAR, NOW).payoff;
    const check = checkPayoff(CAR, { on: NOW, amount: quote }, NOW);
    if (!check.ok) throw new Error('refused');
    const PAID = check.terms;
    const paidOn = paidOffOn(PAID);

    it('is read on the payoff day, whatever its bill says', () => {
      expect(paidOn).toBe(NOW);
      for (const ends_on of [null, '2026-09-30', NOW, '2028-12-27']) {
        expect(loanPricingDay({ ends_on }, '2026-11-20', paidOn)).toBe(NOW);
      }
    });

    it('reads paid off on that day, and finished, even with a bill stopped before it', () => {
      const stoppedEarlier = { next_due_on: null, ends_on: '2026-09-30' };
      const day = loanPricingDay(stoppedEarlier, '2026-11-20', paidOn);
      const status = loanStatus(PAID, day);
      expect(status).toMatchObject({ paidOff: true, amountLeft: 0, lastPaymentOn: NOW });
      expect(loanFinished(stoppedEarlier, '2026-11-20', status.lastPaymentOn)).toBe(true);
      expect(loanHistory(PAID, day).entries[0]).toMatchObject({ kind: 'payoff', full: true });
      // Without the payoff day the stop would hide the payoff and leave money owing.
      expect(loanStatus(PAID, loanPricingDay(stoppedEarlier, '2026-11-20'))).toMatchObject({
        paidOff: false,
        amountLeft: 10_673.67,
      });
    });

    it('counts as finished with the bill still running, from the payoff day', () => {
      const status = loanStatus(PAID, loanPricingDay(runningBill, NOW, paidOn));
      expect(loanFinished(runningBill, NOW, status.lastPaymentOn)).toBe(true);
      expect(loanFinished(runningBill, '2026-10-11', status.lastPaymentOn)).toBe(false);
    });

    it('is read on the payoff day when that is today, before an earlier bill end', () => {
      expect(loanPricingDay({ ends_on: '2026-09-30' }, NOW, paidOn)).toBe(NOW);
    });

    it('is not read early on a payoff day still to come, nor without one', () => {
      expect(loanPricingDay(runningBill, '2026-10-11', paidOn)).toBe('2026-10-11');
      expect(loanPricingDay(runningBill, NOW, null)).toBe(NOW);
      expect(loanPricingDay({ ends_on: '2026-09-30' }, NOW, null)).toBe('2026-09-30');
      expect(paidOffOn(CAR)).toBeNull();
    });
  });
});
