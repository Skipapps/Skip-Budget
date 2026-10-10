import { currentBillCategory } from '@/lib/retired-bill-categories';

describe('currentBillCategory', () => {
  it('reads a Family & Healthcare bill as Health & Medical', () => {
    expect(currentBillCategory('family')).toBe('health');
  });

  it('leaves every other category as it is, Loans & Credit included', () => {
    for (const id of ['housing', 'loans', 'health', 'education', 'other', 'something-new']) {
      expect(currentBillCategory(id)).toBe(id);
    }
  });
});
