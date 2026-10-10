import { refusedLoanSave } from '@/lib/loan-refusal';

/**
 * The refusals a loan's Save can explain in its own words, as PostgREST hands them over (these are
 * the bodies a real PostgREST 14.5 returned for save_loan); everything else is the house failure.
 */

const check = (constraint: string) => ({
  code: '23514',
  details: null,
  hint: null,
  message: `new row for relation "loans" violates check constraint "${constraint}"`,
});

describe('refusedLoanSave', () => {
  it('names a changed payment the database refuses', () => {
    expect(refusedLoanSave(check('loans_payment_overrides_valid'))).toBe('payments');
  });

  it('names a rate outside 0 to 100%', () => {
    expect(refusedLoanSave(check('loans_annual_rate_check'))).toBe('rate');
  });

  it('names a payoff date outside the term', () => {
    expect(
      refusedLoanSave({
        code: 'P0001',
        details: null,
        hint: null,
        message: 'the last payment must fall within the term',
      }),
    ).toBe('lastPayment');
  });

  it('is nothing for any other refusal or failure', () => {
    for (const thrown of [
      check('loans_term_months_check'),
      { code: '23514', message: 'A habit receipt cannot be dated before the habit started.' },
      { code: 'P0001', message: 'not authenticated' },
      { code: 'P0001', message: 'a loan needs at least one payment' },
      { code: 'P0001', message: 'Scanning receipts is part of Skip Pro.' },
      // The right words under the wrong code are not the database's answer.
      { code: '42501', message: 'loans_payment_overrides_valid' },
      new Error('the last payment must fall within the term'),
      new Error('Network request failed'),
      'loans_annual_rate_check',
      null,
      undefined,
    ]) {
      expect(refusedLoanSave(thrown)).toBeNull();
    }
  });
});
