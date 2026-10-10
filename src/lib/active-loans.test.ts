import { activeLoans, loanFinished, type LoanBill } from '@/lib/active-loans';

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
