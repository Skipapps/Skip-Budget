import {
  emptyLoanForm,
  firstPaymentHint,
  firstPaymentOf,
  firstPaymentProblemOf,
  latestFirstPaymentOf,
  loanFormFromCalculator,
  loanFormFromSaved,
  loanName,
  missingFields,
  paymentDayChoiceLabel,
  paymentDayChoicesOf,
  paymentDayOf,
  paymentRhythm,
  rateFromTyped,
  rateShown,
  reviewFieldsOf,
  termFromTyped,
  termMonthsOf,
  withFirstPayment,
  withSourceKept,
  withStartDate,
  type LoanForm,
} from '@/components/loans/add/loan-form';
import type { LoanDetail } from '@/api/loans';
import type { PaymentSourceRow } from '@/api/queries';
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

const iso = (date: Date | null) => (date ? toIsoDate(date) : null);
/** The form after a start date, then (optionally) a first payment, picked on the page. */
function picked(start: Date, first?: Date): LoanForm {
  const started = { ...form(), ...withStartDate(form(), start) };
  return first ? pick(started, first) : started;
}

/** The form after a day is picked in the First payment's calendar. */
const pick = (current: LoanForm, day: Date): LoanForm => ({
  ...current,
  ...withFirstPayment(current, day),
});

describe('the first payment', () => {
  it('is a month after the start date, on its day, until one is picked', () => {
    expect(firstPaymentOf(form())).toBeNull();
    expect(paymentDayOf(form())).toBeNull();
    const founder = picked(new Date(2025, 10, 30));
    expect([iso(firstPaymentOf(founder)), paymentDayOf(founder)]).toEqual(['2025-12-30', 30]);
    expect(paymentRhythm(30)).toBe(
      'Then every month on the 30th, or the last day in shorter months',
    );
  });

  it('is the date picked, on its own day: 14 Jan from a 30 Nov start (the Founder’s loan)', () => {
    const founder = picked(new Date(2025, 10, 30), new Date(2026, 0, 14));
    expect([iso(firstPaymentOf(founder)), paymentDayOf(founder)]).toEqual(['2026-01-14', 14]);
    expect(paymentDayChoicesOf(founder)).toBeNull();
    expect(paymentRhythm(14)).toBe('Then every month on the 14th');
    expect(firstPaymentProblemOf(founder)).toBeNull();
    expect(reviewFieldsOf(founder)).toEqual(
      expect.objectContaining({
        startDate: new Date(2025, 10, 30),
        firstPaymentOn: new Date(2026, 0, 14),
        paymentDay: 14,
      }),
    );
  });

  it('moves with the start date while untouched, and stays put once picked', () => {
    const untouched = picked(new Date(2025, 10, 30));
    const movedOn = { ...untouched, ...withStartDate(untouched, new Date(2025, 11, 5)) };
    expect(iso(firstPaymentOf(movedOn))).toBe('2026-01-05');

    const set = picked(new Date(2025, 10, 30), new Date(2026, 0, 14));
    const stays = { ...set, ...withStartDate(set, new Date(2025, 11, 5)) };
    expect(iso(firstPaymentOf(stays))).toBe('2026-01-14');
    expect(firstPaymentProblemOf(stays)).toBeNull();
  });

  it('says so under the field once the start moves to it or past it, and keeps the date', () => {
    const set = picked(new Date(2025, 10, 30), new Date(2026, 0, 14));
    for (const start of [new Date(2026, 0, 14), new Date(2026, 1, 1)]) {
      const moved = { ...set, ...withStartDate(set, start) };
      expect(iso(firstPaymentOf(moved))).toBe('2026-01-14');
      expect(firstPaymentProblemOf(moved)).toBe('not-after-start');
      expect(firstPaymentHint('not-after-start', start)).toBe(
        'Pick a first payment after the start date.',
      );
    }
  });

  it('takes up to a year after the start date, and names the last day it takes', () => {
    const start = new Date(2025, 10, 30);
    expect(firstPaymentProblemOf(picked(start, new Date(2026, 10, 30)))).toBeNull();
    expect(firstPaymentProblemOf(picked(start, new Date(2026, 11, 1)))).toBe('too-late');
    expect(firstPaymentHint('too-late', start)).toBe(
      'Pick a first payment no later than 30 Nov 2026, a year after the start date.',
    );
    // A start moved back a year and more catches the slip too.
    const set = picked(start, new Date(2026, 0, 14));
    const earlier = { ...set, ...withStartDate(set, new Date(2024, 10, 30)) };
    expect(firstPaymentProblemOf(earlier)).toBe('too-late');
  });

  it('has nothing to say while either date is empty', () => {
    expect(firstPaymentProblemOf(form({ pickedFirst: '2026-01-14' }))).toBeNull();
    expect(firstPaymentProblemOf(form())).toBeNull();
  });
});

describe('a first payment on a short month’s last day', () => {
  it('from a 31 Jan start, defaults to 28 Feb at each month’s end, with the 28th offered', () => {
    const start = picked(new Date(2025, 0, 31));
    expect(iso(firstPaymentOf(start))).toBe('2025-02-28');
    expect(paymentDayChoicesOf(start)).toEqual([28, 31]);
    expect(paymentDayOf(start)).toBe(31);
    expect(paymentRhythm(31)).toBe('Then on the last day of every month');
    expect(reviewFieldsOf(start)).toEqual(
      expect.objectContaining({ firstPaymentOn: new Date(2025, 1, 28), paymentDay: 31 }),
    );
    // "On the 28th".
    expect(paymentDayOf({ ...start, pickedDay: 28 })).toBe(28);
    expect(paymentDayChoicesOf({ ...start, pickedDay: 28 })).toEqual([28, 31]);
  });

  it('picked by hand, it is its own day until the month end is chosen', () => {
    const start = picked(new Date(2025, 0, 15), new Date(2025, 1, 28));
    expect(paymentDayChoicesOf(start)).toEqual([28, 31]);
    expect(paymentDayOf(start)).toBe(28);
    expect(paymentDayOf({ ...start, pickedDay: 31 })).toBe(31);
  });

  it('from a 30 Jan start, is a loan paid on the 30th, offered with the 28th and month end', () => {
    const start = picked(new Date(2025, 0, 30));
    expect(iso(firstPaymentOf(start))).toBe('2025-02-28');
    expect(paymentDayChoicesOf(start)).toEqual([28, 30, 31]);
    expect(paymentDayOf(start)).toBe(30);
    // Choosing another keeps all three offered.
    expect(paymentDayChoicesOf({ ...start, pickedDay: 28 })).toEqual([28, 30, 31]);
  });

  it('changes nothing when the date shown is picked again, chips included', () => {
    const start = picked(new Date(2025, 0, 30));
    expect(withFirstPayment(start, new Date(2025, 1, 28))).toEqual({});
    const again = pick(start, new Date(2025, 1, 28));
    expect([again.pickedFirst, paymentDayChoicesOf(again), paymentDayOf(again)]).toEqual([
      null,
      [28, 30, 31],
      30,
    ]);
    const chose = { ...start, pickedDay: 31 };
    expect(paymentDayOf(pick(chose, new Date(2025, 1, 28)))).toBe(31);
  });

  it('follows the start again when its default is picked after another date', () => {
    const away = picked(new Date(2025, 0, 30), new Date(2025, 2, 14));
    expect(paymentDayOf(away)).toBe(14);
    const back = pick(away, new Date(2025, 1, 28));
    expect([back.pickedFirst, back.pickedDay]).toEqual([null, null]);
    expect([paymentDayChoicesOf(back), paymentDayOf(back)]).toEqual([[28, 30, 31], 30]);
    // Untouched again, it moves with the start.
    const moved = { ...back, ...withStartDate(back, new Date(2025, 2, 31)) };
    expect([iso(firstPaymentOf(moved)), paymentDayOf(moved)]).toEqual(['2025-04-30', 31]);
  });

  it('on 30 Apr offers the 30th and month end; a chip that no longer fits is let go', () => {
    const april = picked(new Date(2026, 2, 31));
    expect([iso(firstPaymentOf(april)), paymentDayChoicesOf(april), paymentDayOf(april)]).toEqual([
      '2026-04-30',
      [30, 31],
      31,
    ]);
    // The start moves on, and the untouched first payment with it: the chip goes too.
    const chose = { ...april, pickedDay: 30 };
    const moved = { ...chose, ...withStartDate(chose, new Date(2026, 2, 14)) };
    expect([iso(firstPaymentOf(moved)), paymentDayChoicesOf(moved), paymentDayOf(moved)]).toEqual([
      '2026-04-14',
      null,
      14,
    ]);
    expect(paymentDayOf({ ...form({ pickedFirst: '2026-04-14', pickedDay: 31 }) })).toBe(14);
  });

  it('words its chips by the day, and month end as every month’s last day', () => {
    expect([28, 30, 31].map(paymentDayChoiceLabel)).toEqual([
      'On the 28th',
      'On the 30th',
      'Last day of each month',
    ]);
  });
});

describe('the words under the First payment, in Spanish and French', () => {
  it('writes the day as each language does', () => {
    setLanguage('es');
    expect([paymentRhythm(14), paymentRhythm(1), paymentRhythm(29), paymentRhythm(31)]).toEqual([
      'Después, cada mes el día 14',
      'Después, cada mes el día 1',
      'Después, cada mes el día 29, o el último día en los meses más cortos',
      'Después, el último día de cada mes',
    ]);
    expect([28, 31].map(paymentDayChoiceLabel)).toEqual(['El día 28', 'Último día de cada mes']);
    setLanguage('fr');
    expect([paymentRhythm(14), paymentRhythm(1), paymentRhythm(31)]).toEqual([
      'Puis chaque mois le 14',
      'Puis chaque mois le 1er',
      'Puis le dernier jour de chaque mois',
    ]);
    expect([28, 31].map(paymentDayChoiceLabel)).toEqual(['Le 28', 'Dernier jour de chaque mois']);
    expect(firstPaymentHint('too-late', new Date(2025, 10, 30))).toBe(
      'Choisis un premier paiement au plus tard le 30 nov. 2026, un an après la date de début.',
    );
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
      // 12 Oct is a month after 12 Sep: it follows the start date like an untouched one.
      pickedFirst: null,
      pickedDay: null,
      carried: null,
      basis: 'actual/365',
      payments: undefined,
    });
    expect([iso(firstPaymentOf(filled)), paymentDayOf(filled)]).toEqual(['2026-10-12', 12]);
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

  it('sets a first payment that is not a month after the start, which stays when the start moves', () => {
    // Money on 12 Sep, first payment 20 Sep.
    const filled = loanFormFromCalculator(readLoanRoute({ ...CALCULATOR, start: '2026-09-20' }));
    expect([filled.pickedFirst, filled.pickedDay]).toEqual(['2026-09-20', null]);
    expect([iso(firstPaymentOf(filled)), paymentDayOf(filled)]).toEqual(['2026-09-20', 20]);
    const moved = { ...filled, ...withStartDate(filled, new Date(2026, 8, 1)) };
    expect(iso(firstPaymentOf(moved))).toBe('2026-09-20');
  });

  it('keeps the calculator’s 28th for a 31 Jan loan first due 28 Feb, as its schedule had it', () => {
    // The calculator anchors on its first payment's own day: 28 Feb, 28 Mar, …
    const filled = loanFormFromCalculator(
      readLoanRoute({ ...CALCULATOR, funded: '2025-01-31', start: '2025-02-28' }),
    );
    expect([filled.pickedFirst, filled.pickedDay]).toEqual([null, 28]);
    expect([iso(firstPaymentOf(filled)), paymentDayOf(filled)]).toEqual(['2025-02-28', 28]);
    expect(paymentDayChoicesOf(filled)).toEqual([28, 31]);
  });

  it('takes back the calculator’s day when its date is picked again after another', () => {
    // Money on 15 Jan 2025, first due 28 Feb, handed over with the 30th as its day.
    const filled = loanFormFromCalculator(
      readLoanRoute({ ...CALCULATOR, funded: '2025-01-15', start: '2025-02-28', day: '30' }),
    );
    expect([paymentDayChoicesOf(filled), paymentDayOf(filled)]).toEqual([[28, 30, 31], 30]);
    const away = pick(filled, new Date(2025, 2, 14));
    expect(paymentDayOf(away)).toBe(14);
    const back = pick(away, new Date(2025, 1, 28));
    expect([back.pickedFirst, paymentDayChoicesOf(back), paymentDayOf(back)]).toEqual([
      '2025-02-28',
      [28, 30, 31],
      30,
    ]);
  });

  it('takes a calculator loan first due more than a year after its money landed, as set there', () => {
    const filled = loanFormFromCalculator(
      readLoanRoute({ ...CALCULATOR, funded: '2025-06-12', start: '2026-10-12' }),
    );
    expect(firstPaymentProblemOf(filled)).toBeNull();
    // Moving either date makes it a pick on this page, held to a year.
    const moved = { ...filled, ...withStartDate(filled, new Date(2025, 5, 11)) };
    expect(firstPaymentProblemOf(moved)).toBe('too-late');
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
      'Interest rate',
      'Term',
      'Start date',
      'First payment',
      'Paid from',
    ]);
  });

  it('never takes an empty rate for 0%, and does take a typed 0', () => {
    expect(reviewFieldsOf(form()).annualRate).toBeNaN();
    expect(reviewFieldsOf(form({ rate: '0' })).annualRate).toBe(0);
  });

  it('names the First payment when only it is empty, and not once the start fills it', () => {
    const noFirst = form({
      monthly: '424.8',
      principal: '18000',
      type: 'car',
      rate: '6.25',
      term: '4',
      sourceId: '',
    });
    expect(missingFields(noFirst, priced(noFirst))).toEqual(['Start date', 'First payment']);
    const onlyFirst = pick(noFirst, new Date(2025, 0, 27));
    expect(missingFields(onlyFirst, priced(onlyFirst))).toEqual(['Start date']);
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

describe('a saved loan on the details page', () => {
  function saved(bill: Partial<LoanDetail['bill']> = {}, loan: Partial<LoanDetail> = {}) {
    return {
      id: 'loan-car',
      bill_id: 'bill-car',
      principal: 18_000,
      annual_rate: 6.25,
      term_months: 48,
      monthly_payment: 424.8,
      total_interest: 2390.1,
      first_payment_on: '2025-01-27',
      funded_on: '2024-12-27',
      day_count_basis: 'actual/365',
      statement_on: null,
      statement_principal: null,
      payment_overrides: null,
      payment_day: null,
      created_at: '2026-10-12T09:00:00Z',
      source: null,
      ...loan,
      bill: {
        id: 'bill-car',
        name: 'Car loan',
        icon_id: 'loan-car',
        category_id: 'loans',
        amount: 424.8,
        starts_on: '2026-10-27',
        next_due_on: '2026-10-27',
        ends_on: '2028-12-27',
        card_id: null,
        bank_account_id: 'acct-1',
        in_spending: true,
        created_at: '2026-10-12T09:00:00Z',
        ...bill,
      },
    } as LoanDetail;
  }

  it('fills every box from what was saved, and prices back to the same loan', () => {
    const filled = loanFormFromSaved(saved());
    expect(filled).toEqual(
      expect.objectContaining({
        monthly: '424.8',
        principal: '18000',
        type: 'car',
        // Still the type's own name, so it follows a change of type.
        typedName: null,
        rate: '6.25',
        term: '4',
        termUnit: 'years',
        // A saved first payment is a fact: set, never following the start.
        pickedFirst: '2025-01-27',
        pickedDay: null,
        carried: { start: '2024-12-27', first: '2025-01-27', day: 27, saved: true },
        sourceId: 'acct-1',
        basis: 'actual/365',
      }),
    );
    expect(toIsoDate(filled.startDate!)).toBe('2024-12-27');
    const priced = loanReview(reviewFieldsOf(filled), '2026-10-12');
    expect(priced.ok && priced.save).toEqual(
      expect.objectContaining({
        principal: 18_000,
        monthlyPayment: 424.8,
        totalInterest: 2390.1,
        firstPaymentOn: '2025-01-27',
        fundedOn: '2024-12-27',
        paymentDay: null,
      }),
    );
  });

  it('keeps a name of the person’s own, and Skip as Skip', () => {
    const filled = loanFormFromSaved(saved({ name: 'Our Civic', bank_account_id: null }));
    expect(filled.typedName).toBe('Our Civic');
    expect(filled.sourceId).toBe('');
  });

  /** The saved loan's fields, priced back: what an untouched edit sends. */
  const savedBack = (filled: LoanForm) => {
    const review = loanReview(reviewFieldsOf(filled), '2026-10-12');
    if (!review.ok) throw new Error(JSON.stringify(review.refusal));
    return review.save;
  };

  it('keeps the payment day of a loan first due on a clamped day, at each month’s end', () => {
    const filled = loanFormFromSaved(
      saved({}, { first_payment_on: '2025-02-28', funded_on: '2025-01-31', payment_day: 31 }),
    );
    expect([filled.pickedFirst, filled.pickedDay]).toEqual(['2025-02-28', null]);
    expect([iso(firstPaymentOf(filled)), paymentDayOf(filled)]).toEqual(['2025-02-28', 31]);
    expect(savedBack(filled)).toEqual(
      expect.objectContaining({
        firstPaymentOn: '2025-02-28',
        fundedOn: '2025-01-31',
        paymentDay: 31,
      }),
    );
  });

  it('keeps a 30th saved on 28 Feb from a mid-January start, offered among the chips', () => {
    const filled = loanFormFromSaved(
      saved({}, { first_payment_on: '2025-02-28', funded_on: '2025-01-15', payment_day: 30 }),
    );
    expect([iso(firstPaymentOf(filled)), paymentDayOf(filled)]).toEqual(['2025-02-28', 30]);
    expect(paymentDayChoicesOf(filled)).toEqual([28, 30, 31]);
    expect(savedBack(filled)).toEqual(
      expect.objectContaining({ firstPaymentOn: '2025-02-28', paymentDay: 30 }),
    );
  });

  it('keeps a first payment that is not a month after the start, as it was saved', () => {
    const filled = loanFormFromSaved(saved({}, { first_payment_on: '2025-01-10' }));
    expect(filled.pickedFirst).toBe('2025-01-10');
    expect([iso(firstPaymentOf(filled)), paymentDayOf(filled)]).toEqual(['2025-01-10', 10]);
    expect(savedBack(filled)).toEqual(
      expect.objectContaining({
        firstPaymentOn: '2025-01-10',
        fundedOn: '2024-12-27',
        paymentDay: null,
      }),
    );
  });

  it('keeps the Founder’s loan as saved: 30 Nov 2025, first due 14 Jan 2026', () => {
    const filled = loanFormFromSaved(
      saved(
        { amount: 554.34 },
        {
          principal: 31_394.33,
          annual_rate: 8.14,
          term_months: 72,
          monthly_payment: 554.34,
          first_payment_on: '2026-01-14',
          funded_on: '2025-11-30',
        },
      ),
    );
    expect([iso(filled.startDate), iso(firstPaymentOf(filled)), paymentDayOf(filled)]).toEqual([
      '2025-11-30',
      '2026-01-14',
      14,
    ]);
    expect(savedBack(filled)).toEqual(
      expect.objectContaining({
        firstPaymentOn: '2026-01-14',
        fundedOn: '2025-11-30',
        paymentDay: null,
        monthlyPayment: 554.34,
      }),
    );
  });

  it('keeps a saved loan first due more than a year after its start, until the start changes', () => {
    const filled = loanFormFromSaved(saved({}, { first_payment_on: '2026-03-27' }));
    expect(firstPaymentProblemOf(filled)).toBeNull();
    expect(savedBack(filled).firstPaymentOn).toBe('2026-03-27');
    // The calendar runs to the saved date, and every day it offers is taken.
    expect(iso(latestFirstPaymentOf(filled))).toBe('2026-03-27');
    expect(firstPaymentProblemOf(pick(filled, new Date(2026, 2, 26)))).toBeNull();
    // Another start is held to a year.
    const moved = { ...filled, ...withStartDate(filled, new Date(2024, 11, 26)) };
    expect(iso(latestFirstPaymentOf(moved))).toBe('2025-12-26');
    expect(firstPaymentProblemOf(moved)).toBe('too-late');
  });

  it('never moves a saved first payment with the start, even one a month after it', () => {
    const filled = loanFormFromSaved(saved());
    const later = { ...filled, ...withStartDate(filled, new Date(2025, 0, 5)) };
    expect([iso(firstPaymentOf(later)), paymentDayOf(later)]).toEqual(['2025-01-27', 27]);
    expect(firstPaymentProblemOf(later)).toBeNull();
    // Past it, the date stays and the hint says so.
    const past = { ...filled, ...withStartDate(filled, new Date(2025, 1, 1)) };
    expect([iso(firstPaymentOf(past)), firstPaymentProblemOf(past)]).toEqual([
      '2025-01-27',
      'not-after-start',
    ]);
    // A date picked on the start's default stays a date too: it does not follow later starts.
    const onDefault = pick(later, new Date(2025, 1, 5));
    expect(onDefault.pickedFirst).toBe('2025-02-05');
    const again = { ...onDefault, ...withStartDate(onDefault, new Date(2025, 0, 10)) };
    expect(iso(firstPaymentOf(again))).toBe('2025-02-05');
  });

  it('keeps a saved 30th on 28 Feb through a re-pick and a pick away and back', () => {
    const filled = loanFormFromSaved(
      saved({}, { first_payment_on: '2025-02-28', funded_on: '2025-01-30', payment_day: 30 }),
    );
    expect([paymentDayChoicesOf(filled), paymentDayOf(filled)]).toEqual([[28, 30, 31], 30]);
    const again = pick(filled, new Date(2025, 1, 28));
    expect(savedBack(again)).toEqual(
      expect.objectContaining({ firstPaymentOn: '2025-02-28', paymentDay: 30 }),
    );
    const back = pick(pick(filled, new Date(2025, 2, 14)), new Date(2025, 1, 28));
    expect([paymentDayChoicesOf(back), paymentDayOf(back)]).toEqual([[28, 30, 31], 30]);
    expect(savedBack(back)).toEqual(
      expect.objectContaining({ firstPaymentOn: '2025-02-28', paymentDay: 30 }),
    );
  });

  it('starts a loan saved without its funding day where its schedule does, and draws an untyped one as Other', () => {
    const filled = loanFormFromSaved(saved({ icon_id: null, name: 'Loan' }, { funded_on: null }));
    expect(toIsoDate(filled.startDate!)).toBe('2024-12-27');
    expect(filled.type).toBe('other');
    expect(filled.typedName).toBeNull();
  });

  it('carries the payments changed on the schedule', () => {
    const filled = loanFormFromSaved(saved({}, { payment_overrides: { '12': 1000 } }));
    expect(filled.payments).toEqual({ 12: 1000 });
  });
});

describe('the Paid from tiles of a saved loan', () => {
  const tile = (id: string, kind: 'card' | 'account'): PaymentSourceRow => ({
    id,
    kind,
    label: id,
    color: '#000000',
  });
  const offered = [tile('card-1', 'card'), tile('acct-1', 'account')];

  it('adds the card or account it is paid from, among its kind, when the plan does not offer it', () => {
    expect(withSourceKept(offered, tile('card-2', 'card')).map((source) => source.id)).toEqual([
      'card-1',
      'card-2',
      'acct-1',
    ]);
    expect(withSourceKept(offered, tile('acct-2', 'account')).map((source) => source.id)).toEqual([
      'card-1',
      'acct-1',
      'acct-2',
    ]);
  });

  it('leaves the tiles as they are when it is offered already, or the loan has none', () => {
    expect(withSourceKept(offered, tile('card-1', 'card'))).toBe(offered);
    expect(withSourceKept(offered, null)).toBe(offered);
  });
});
