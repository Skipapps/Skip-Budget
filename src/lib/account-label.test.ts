import { accountLabel } from '@/lib/account-label';

describe('accountLabel', () => {
  it('names an account by its nickname and last four', () => {
    expect(accountLabel({ nickname: 'Chase Checking', bank_name: 'Chase', last4: '7730' })).toBe(
      'Chase Checking ••7730',
    );
  });

  it('falls back to the bank when there is no nickname', () => {
    expect(accountLabel({ nickname: null, bank_name: 'Chase', last4: '7730' })).toBe(
      'Chase ••7730',
    );
    expect(accountLabel({ nickname: '', bank_name: 'Chase', last4: '7730' })).toBe('Chase ••7730');
  });

  it('leaves no dangling "••" when no digits were given', () => {
    expect(accountLabel({ nickname: null, bank_name: 'Capital One', last4: null })).toBe(
      'Capital One',
    );
    expect(accountLabel({ nickname: 'Savings', bank_name: 'Ally', last4: '' })).toBe('Savings');
  });
});
