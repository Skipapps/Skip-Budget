import { activeLoans, type LoanBill } from '@/lib/active-loans';

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

  it('drops a loan once its end date has passed, and keeps it on the end date itself', () => {
    const bills = [
      bill('b1', 'Finished', { ends_on: '2026-10-08' }),
      bill('b2', 'Last payment today', { ends_on: TODAY }),
      bill('b3', 'Running', { ends_on: '2030-01-01' }),
    ];
    expect(activeLoans(bills, ['b1', 'b2', 'b3'], TODAY).map((loan) => loan.billId)).toEqual([
      'b2',
      'b3',
    ]);
  });

  it('ignores a loan whose bill is not in the list, and has nothing when there are no loans', () => {
    expect(activeLoans([bill('b1', 'Car')], ['gone'], TODAY)).toEqual([]);
    expect(activeLoans([bill('b1', 'Car')], [], TODAY)).toEqual([]);
  });
});
