import {
  emptyLoanForm,
  firstPaymentOf,
  loanFormFromCalculator,
  loanName,
  missingFields,
  paymentDayOf,
  rateFromTyped,
  rateShown,
  reviewFieldsOf,
  termFromTyped,
  termMonthsOf,
  type LoanForm,
} from '@/components/loans/add/loan-form';
import { loanReminderOn } from '@/components/loans/add/loan-reminder';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { toIsoDate } from '@/lib/date';
import { loanReview } from '@/lib/loan-review';
import { readLoanRoute } from '@/lib/loan-route';

/**
 * The Add loan form's own rules: what the boxes keep as typed, the name that follows the loan type,
 * the calculator's loan on the details page, what Continue says is missing, and when the reminder
 * goes out. Every figure is priced by `loanReview`, never here.
 */

const form = (patch: Partial<LoanForm> = {}): LoanForm => ({ ...emptyLoanForm(), ...patch });

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('the rate box', () => {
  it.each([
    ['6.25', '6.25'],
    ['6,25', '6.25'],
    ['6,2,5', '6.25'],
    ['.5', '0.5'],
    ['6.25%', '6.25'],
    ['abc', ''],
    ['', ''],
    ['7.12345678949', '7.12345678949'],
  ])('reads %p as %p', (typed, draft) => {
    expect(rateFromTyped(typed)).toBe(draft);
  });

  it('draws the language’s decimal mark and reads either keyboard’s back', () => {
    setLanguage('fr');
    expect(rateShown('6.25')).toBe('6,25');
    expect(rateFromTyped('6,25')).toBe('6.25');
    expect(rateFromTyped('6.25')).toBe('6.25');
  });
});

describe('the term box', () => {
  it.each([
    ['4', '4'],
    ['048', '48'],
    ['4a', '4'],
    ['0', '0'],
    ['', ''],
  ])('reads %p as %p', (typed, draft) => {
    expect(termFromTyped(typed)).toBe(draft);
  });

  it('counts years in twelves and leaves an empty box as nothing', () => {
    expect(termMonthsOf(form({ term: '4', termUnit: 'years' }))).toBe(48);
    expect(termMonthsOf(form({ term: '48', termUnit: 'months' }))).toBe(48);
    expect(termMonthsOf(form({ term: '' }))).toBeNaN();
  });
});

describe('the name', () => {
  it('follows the loan type until the person types one', () => {
    expect(loanName(form())).toBe('');
    expect(loanName(form({ type: 'car' }))).toBe('Car loan');
    expect(loanName(form({ type: 'credit-card' }))).toBe('Credit card');
    expect(loanName(form({ type: 'other' }))).toBe('Loan');
    expect(loanName(form({ type: 'car', typedName: 'Civic' }))).toBe('Civic');
    expect(loanName(form({ type: 'car', typedName: '' }))).toBe('');
  });

  it('is written in the language on screen', () => {
    setLanguage('es');
    expect(loanName(form({ type: 'car' }))).toBe('Préstamo de auto');
    setLanguage('fr');
    expect(loanName(form({ type: 'home' }))).toBe('Prêt immobilier');
  });
});

describe('the payment day and first payment', () => {
  it('takes the start date’s day until one is picked', () => {
    const start = new Date(2024, 11, 27);
    expect(paymentDayOf(form())).toBeNull();
    expect(paymentDayOf(form({ startDate: start }))).toBe(27);
    expect(paymentDayOf(form({ startDate: start, pickedDay: 2 }))).toBe(2);
  });

  it('shows the rule’s first payment, or the calculator’s while it stands', () => {
    const start = new Date(2024, 11, 27);
    expect(toIsoDate(firstPaymentOf(form({ startDate: start })) as Date)).toBe('2025-01-27');
    expect(toIsoDate(firstPaymentOf(form({ startDate: start, pickedDay: 2 })) as Date)).toBe(
      '2025-02-02',
    );
    expect(
      toIsoDate(firstPaymentOf(form({ startDate: start, pinnedFirst: '2025-01-05' })) as Date),
    ).toBe('2025-01-05');
    expect(firstPaymentOf(form())).toBeNull();
  });
});

describe('the calculator’s loan on the details page', () => {
  const CALCULATOR = {
    amount: '25000',
    rate: '7.5',
    months: '60',
    start: '2026-10-12',
    funded: '2026-09-12',
    basis: 'actual/365',
    monthly: '500.97',
  };

  it('fills every field it knows, the payment it showed taken as the bank’s', () => {
    const filled = loanFormFromCalculator(readLoanRoute(CALCULATOR));
    expect(filled).toEqual({
      ...emptyLoanForm(),
      monthly: '500.97',
      principal: '25000',
      rate: '7.5',
      term: '5',
      termUnit: 'years',
      startDate: new Date(2026, 8, 12),
      pickedDay: 12,
      pinnedFirst: null,
      basis: 'actual/365',
      payments: undefined,
    });
    // Type, name and Paid from are the person's to answer.
    expect([filled.type, filled.typedName, filled.sourceId]).toEqual([null, null, null]);
  });

  it('keeps a term that is not whole years in months, and the convention and changes', () => {
    const filled = loanFormFromCalculator(
      readLoanRoute({ ...CALCULATOR, months: '30', basis: 'monthly', overrides: '{"12":1000}' }),
    );
    expect([filled.term, filled.termUnit, filled.basis]).toEqual(['30', 'months', 'monthly']);
    expect(filled.payments).toEqual({ 12: 1000 });
  });

  it('pins a first payment the rule would move, until the dates change', () => {
    // Money on 12 Sep, first payment 20 Sep: the rule would say 20 Oct.
    const filled = loanFormFromCalculator(readLoanRoute({ ...CALCULATOR, start: '2026-09-20' }));
    expect([filled.pickedDay, filled.pinnedFirst]).toEqual([20, '2026-09-20']);
    expect(toIsoDate(firstPaymentOf(filled) as Date)).toBe('2026-09-20');
    expect(toIsoDate(firstPaymentOf({ ...filled, pinnedFirst: null }) as Date)).toBe('2026-10-20');
  });

  it('takes nothing from a garbled link', () => {
    const filled = loanFormFromCalculator(
      readLoanRoute({ amount: 'x', months: 'y', start: 'soon', funded: '2026-13' }),
    );
    expect(filled).toEqual(emptyLoanForm());
  });
});

describe('what Continue says is missing', () => {
  const priced = (value: LoanForm) => {
    const review = loanReview(reviewFieldsOf(value), '2026-10-12');
    return !review.ok && review.refusal.reason === 'fields' ? review.refusal.fields : [];
  };

  it('names every empty box by its name on the page, top to bottom', () => {
    const empty = form();
    expect(missingFields(empty, priced(empty))).toEqual([
      'Loan type',
      'Loan name',
      'Monthly payment',
      'Amount borrowed',
      'APR',
      'Term',
      'Start date',
      'Payment day',
      'Paid from',
    ]);
  });

  it('never takes an empty rate for 0%, and does take a typed 0', () => {
    expect(reviewFieldsOf(form()).annualRate).toBeNaN();
    expect(reviewFieldsOf(form({ rate: '0' })).annualRate).toBe(0);
  });

  it('has nothing to say once everything is answered', () => {
    const full = form({
      monthly: '424.8',
      principal: '18000',
      type: 'car',
      rate: '6.25',
      term: '4',
      startDate: new Date(2024, 11, 27),
      sourceId: '',
    });
    expect(missingFields(full, priced(full))).toEqual([]);
  });
});

describe('the reminder date', () => {
  const dues = [new Date(2026, 9, 27), new Date(2026, 10, 27)];

  it('is the lead before the next payment that can still be reminded about', () => {
    expect(loanReminderOn(dues, 3, '2026-10-12')).toBe('2026-10-24');
    expect(loanReminderOn(dues, 7, '2026-10-20')).toBe('2026-10-20');
    expect(loanReminderOn(dues, 7, '2026-10-21')).toBe('2026-11-20');
    expect(loanReminderOn(dues, 0, '2026-10-27')).toBe('2026-10-27');
  });

  it('is none once every payment is too close or behind', () => {
    expect(loanReminderOn(dues, 3, '2026-11-25')).toBeNull();
    expect(loanReminderOn([], 3, '2026-10-12')).toBeNull();
  });
});
