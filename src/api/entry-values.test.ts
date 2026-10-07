import {
  buildBillValues,
  buildReceiptValues,
  buildSubscriptionValues,
  defaultBillName,
  type BillInput,
  type ReceiptInput,
  type SubscriptionInput,
} from '@/api/entry-values';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The shared builders, on their own: these pin each rule directly, with the same fixtures as
 * `src/__tests__/app/add-*-save.test.tsx`, so the voice review page can rely on them without a
 * form on screen.
 */

const SOURCES = [
  { id: 'card-1', kind: 'card' as const },
  { id: 'acct-1', kind: 'account' as const },
];

const WHOLE_FOODS = {
  brandId: 'b-wf',
  name: 'Whole Foods',
  domain: 'wholefoods.com',
  categoryId: 'groceries',
};

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('buildReceiptValues', () => {
  const input = (patch: Partial<ReceiptInput> = {}): ReceiptInput => ({
    store: WHOLE_FOODS,
    amount: '1030.5',
    date: day(2026, 9, 28),
    sourceId: 'acct-1',
    note: '  Weekly shop  ',
    captureSource: 'manual',
    ...patch,
  });

  it('builds the exact row', () => {
    expect(buildReceiptValues(input(), SOURCES)).toEqual({
      ok: true,
      values: {
        brand_id: 'b-wf',
        merchant: 'Whole Foods',
        amount: 1030.5,
        purchased_on: '2026-09-28',
        category_id: 'groceries',
        card_id: null,
        bank_account_id: 'acct-1',
        note: 'Weekly shop',
        source: 'manual',
        image_path: null,
      },
    });
  });

  it('carries a voice receipt as voice', () => {
    const built = buildReceiptValues(input({ captureSource: 'voice' }), SOURCES);
    expect(built.ok && built.values.source).toBe('voice');
  });

  it.each([
    ['1100', 1100],
    ['15.99', 15.99],
    ['0.10', 0.1],
    ['1030.5', 1030.5],
  ])('reads %s as exactly %p', (amount, expected) => {
    const built = buildReceiptValues(input({ amount }), SOURCES);
    expect(built.ok && built.values.amount).toBe(expected);
  });

  it('files a card, an account, or neither for an unknown id', () => {
    const card = buildReceiptValues(input({ sourceId: 'card-1' }), SOURCES);
    const gone = buildReceiptValues(input({ sourceId: 'card-gone' }), SOURCES);
    const none = buildReceiptValues(input({ sourceId: '' }), SOURCES);
    expect(card.ok && [card.values.card_id, card.values.bank_account_id]).toEqual(['card-1', null]);
    expect(gone.ok && [gone.values.card_id, gone.values.bank_account_id]).toEqual([null, null]);
    expect(none.ok && [none.values.card_id, none.values.bank_account_id]).toEqual([null, null]);
  });

  it("files a store without a category under 'other' and a blank note as none", () => {
    const built = buildReceiptValues(
      input({ store: { ...WHOLE_FOODS, categoryId: '' }, note: '   ' }),
      SOURCES,
    );
    expect(built.ok && [built.values.category_id, built.values.note]).toEqual(['other', null]);
  });

  it('asks for the store before the amount, in the form’s words', () => {
    expect(buildReceiptValues(input({ store: null, amount: '' }), SOURCES)).toEqual({
      ok: false,
      field: 'store',
      message: 'Pick a store first.',
    });
    for (const amount of ['', '0', '-1', 'abc', 'NaN', 'Infinity']) {
      expect(buildReceiptValues(input({ amount }), SOURCES)).toEqual({
        ok: false,
        field: 'amount',
        message: 'Enter how much you spent.',
      });
    }
  });
});

describe('buildBillValues', () => {
  const input = (patch: Partial<BillInput> = {}): BillInput => ({
    name: 'Housing',
    amount: '1100',
    issuer: null,
    categoryId: 'housing',
    iconId: 'other',
    recurrence: 'monthly',
    startDate: day(2026, 11, 1),
    endDate: null,
    sourceId: 'acct-1',
    note: '',
    ...patch,
  });
  const fresh = { sources: SOURCES, lastChargedOn: null };

  it('builds the exact row for a new bill', () => {
    expect(buildBillValues(input(), fresh)).toEqual({
      ok: true,
      values: {
        name: 'Housing',
        amount: 1100,
        brand_id: null,
        category_id: 'housing',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2026-11-01',
        starts_on: '2026-11-01',
        ends_on: null,
        card_id: null,
        bank_account_id: 'acct-1',
        note: null,
      },
    });
  });

  it("takes the company's brand but never its spend category", () => {
    const built = buildBillValues(
      input({
        name: 'Comcast',
        categoryId: 'internet',
        issuer: {
          brandId: 'b-cc',
          name: 'Comcast',
          domain: 'comcast.com',
          categoryId: 'utilities',
        },
      }),
      fresh,
    );
    expect(built.ok && [built.values.brand_id, built.values.category_id]).toEqual([
      'b-cc',
      'internet',
    ]);
  });

  it('keeps an icon only on an Other bill', () => {
    const other = buildBillValues(input({ categoryId: 'other', iconId: 'dumbbell' }), fresh);
    const untouched = buildBillValues(input({ categoryId: 'other', iconId: 'other' }), fresh);
    const blank = buildBillValues(input({ categoryId: 'other', iconId: '' }), fresh);
    const housing = buildBillValues(input({ categoryId: 'housing', iconId: 'dumbbell' }), fresh);
    expect(other.ok && other.values.icon_id).toBe('dumbbell');
    expect(untouched.ok && untouched.values.icon_id).toBe('other');
    expect(blank.ok && blank.values.icon_id).toBeNull();
    expect(housing.ok && housing.values.icon_id).toBeNull();
  });

  it('floors starts_on after the last charge, and only when there is one', () => {
    const moved = buildBillValues(input({ startDate: day(2026, 9, 15) }), {
      sources: SOURCES,
      lastChargedOn: '2026-09-01',
    });
    const later = buildBillValues(input({ startDate: day(2026, 10, 20) }), {
      sources: SOURCES,
      lastChargedOn: '2026-09-01',
    });
    const past = buildBillValues(input({ startDate: day(2026, 3, 1) }), fresh);
    expect(moved.ok && [moved.values.next_due_on, moved.values.starts_on]).toEqual([
      '2026-09-15',
      '2026-10-01',
    ]);
    expect(later.ok && later.values.starts_on).toBe('2026-10-20');
    // A new bill's past first date is kept; the recorders backfill from it,
    // exactly as they would for the form.
    expect(past.ok && past.values.starts_on).toBe('2026-03-01');
  });

  it("writes a period as 'period', from its own first day, never floored", () => {
    const built = buildBillValues(
      input({ recurrence: 'period', startDate: day(2026, 6, 1), endDate: day(2026, 12, 31) }),
      { sources: SOURCES, lastChargedOn: '2026-09-01' },
    );
    expect(built.ok && built.values).toMatchObject({
      recurrence: 'period',
      next_due_on: '2026-06-01',
      starts_on: '2026-06-01',
      ends_on: '2026-12-31',
    });
  });

  it('keeps an end date on a repeating bill, as the form does', () => {
    const built = buildBillValues(input({ endDate: day(2027, 1, 31) }), fresh);
    expect(built.ok && built.values.ends_on).toBe('2027-01-31');
  });

  it('checks name, amount, date and range in that order, naming the step', () => {
    expect(buildBillValues(input({ name: '  ', amount: '', startDate: null }), fresh)).toEqual({
      ok: false,
      field: 'details',
      message: 'Give the bill a name.',
    });
    expect(buildBillValues(input({ amount: '0', startDate: null }), fresh)).toEqual({
      ok: false,
      field: 'amount',
      message: 'Enter how much it costs.',
    });
    expect(buildBillValues(input({ startDate: null }), fresh)).toEqual({
      ok: false,
      field: 'when',
      message: 'Pick the first due date.',
    });
    expect(buildBillValues(input({ recurrence: 'period', startDate: null }), fresh)).toEqual({
      ok: false,
      field: 'when',
      message: 'Pick the date it starts.',
    });
    expect(
      buildBillValues(
        input({ recurrence: 'period', startDate: day(2026, 10, 10), endDate: day(2026, 10, 1) }),
        fresh,
      ),
    ).toEqual({
      ok: false,
      field: 'when',
      message: 'The end date cannot be before the start date.',
    });
  });

  it('trims the name and the note', () => {
    const built = buildBillValues(input({ name: '  Gym  ', note: '  Off-peak  ' }), fresh);
    expect(built.ok && [built.values.name, built.values.note]).toEqual(['Gym', 'Off-peak']);
  });
});

describe('buildSubscriptionValues', () => {
  const NETFLIX = {
    brandId: 'b-nf',
    name: 'Netflix',
    domain: 'netflix.com',
    categoryId: 'entertainment',
  };
  const input = (patch: Partial<SubscriptionInput> = {}): SubscriptionInput => ({
    service: NETFLIX,
    amount: '15.99',
    cycle: 'monthly',
    renewsOn: null,
    sourceId: 'card-1',
    note: '',
    active: true,
    ...patch,
  });
  const fresh = { sources: SOURCES, lastChargedOn: null, countsFrom: null };

  it('builds the exact row for a new one with no renewal date', () => {
    expect(buildSubscriptionValues(input(), fresh)).toEqual({
      ok: true,
      values: {
        brand_id: 'b-nf',
        name: 'Netflix',
        amount: 15.99,
        cycle: 'monthly',
        next_renewal_on: null,
        started_on: null,
        category_id: 'entertainment',
        card_id: 'card-1',
        bank_account_id: null,
        note: null,
        active: true,
      },
    });
  });

  it('counts a new one from the renewal picked', () => {
    const built = buildSubscriptionValues(input({ renewsOn: day(2026, 10, 12) }), fresh);
    expect(built.ok && [built.values.next_renewal_on, built.values.started_on]).toEqual([
      '2026-10-12',
      '2026-10-12',
    ]);
  });

  it('only ever moves an edited start earlier', () => {
    const ctx = { sources: SOURCES, lastChargedOn: null, countsFrom: '2026-08-10' };
    const earlier = buildSubscriptionValues(input({ renewsOn: day(2026, 7, 10) }), ctx);
    const later = buildSubscriptionValues(input({ renewsOn: day(2026, 11, 10) }), ctx);
    const cleared = buildSubscriptionValues(input({ renewsOn: null }), ctx);
    expect(earlier.ok && earlier.values.started_on).toBe('2026-07-10');
    expect(later.ok && later.values.started_on).toBe('2026-08-10');
    expect(cleared.ok && cleared.values.started_on).toBe('2026-08-10');
  });

  it('floors the start after the last renewal recorded', () => {
    const built = buildSubscriptionValues(input({ renewsOn: day(2026, 10, 10) }), {
      sources: SOURCES,
      lastChargedOn: '2026-09-10',
      countsFrom: '2026-01-10',
    });
    expect(built.ok && built.values.started_on).toBe('2026-10-01');
  });

  it("files a service without a category under 'other', and carries active", () => {
    const built = buildSubscriptionValues(
      input({ service: { ...NETFLIX, categoryId: '' }, active: false }),
      fresh,
    );
    expect(built.ok && [built.values.category_id, built.values.active]).toEqual(['other', false]);
  });

  it('asks for the service before the amount, in the form’s words', () => {
    expect(buildSubscriptionValues(input({ service: null, amount: '' }), fresh)).toEqual({
      ok: false,
      field: 'service',
      message: 'Pick a service first.',
    });
    expect(buildSubscriptionValues(input({ amount: '0' }), fresh)).toEqual({
      ok: false,
      field: 'amount',
      message: 'Enter what it costs.',
    });
  });
});

describe('defaultBillName', () => {
  const COMCAST = { brandId: 'b-cc', name: 'Comcast', domain: 'comcast.com', categoryId: 'x' };

  it('is the company, else the category label, else nothing for Other', () => {
    expect(defaultBillName('internet', 'Internet', COMCAST)).toBe('Comcast');
    expect(defaultBillName('internet', 'Internet', null)).toBe('Internet');
    expect(defaultBillName('other', 'Other bill', null)).toBe('');
    expect(defaultBillName('other', 'Other bill', COMCAST)).toBe('Comcast');
  });
});

describe('the form hints in Spanish and French', () => {
  beforeEach(() => resetLocaleForTests());
  afterAll(() => resetLocaleForTests());

  const receipt: ReceiptInput = {
    store: null,
    amount: '12.50',
    date: day(2026, 9, 28),
    sourceId: '',
    note: '',
    captureSource: 'manual',
  };

  const bill: BillInput = {
    name: 'Rent',
    amount: '1800',
    issuer: null,
    categoryId: 'housing',
    iconId: 'other',
    recurrence: 'monthly',
    startDate: null,
    endDate: null,
    sourceId: '',
    note: '',
  };

  const subscription: SubscriptionInput = {
    service: null,
    amount: '15.99',
    cycle: 'monthly',
    renewsOn: null,
    sourceId: '',
    note: '',
    active: true,
  };

  const subscriptionCtx = { sources: SOURCES, lastChargedOn: null, countsFrom: null };

  it('keeps the field and words the hint in Spanish', () => {
    setLanguage('es');
    expect(buildReceiptValues(receipt, SOURCES)).toEqual({
      ok: false,
      field: 'store',
      message: 'Primero elige una tienda.',
    });
    expect(buildReceiptValues({ ...receipt, store: WHOLE_FOODS, amount: '0' }, SOURCES)).toEqual({
      ok: false,
      field: 'amount',
      message: 'Ingresa cuánto gastaste.',
    });
    expect(buildBillValues(bill, { sources: SOURCES, lastChargedOn: null })).toMatchObject({
      field: 'when',
      message: 'Elige la primera fecha de vencimiento.',
    });
    expect(buildSubscriptionValues(subscription, subscriptionCtx)).toMatchObject({
      field: 'service',
      message: 'Primero elige un servicio.',
    });
  });

  it('keeps the field and words the hint in French', () => {
    setLanguage('fr');
    expect(
      buildBillValues({ ...bill, name: '  ' }, { sources: SOURCES, lastChargedOn: null }),
    ).toMatchObject({ field: 'details', message: 'Donne un nom à la facture.' });
    expect(
      buildBillValues(
        {
          ...bill,
          recurrence: 'period',
          startDate: day(2026, 9, 10),
          endDate: day(2026, 9, 1),
        },
        { sources: SOURCES, lastChargedOn: null },
      ),
    ).toMatchObject({
      field: 'when',
      message: 'La date de fin ne peut pas précéder la date de début.',
    });
    expect(
      buildSubscriptionValues(
        { ...subscription, service: WHOLE_FOODS, amount: '' },
        subscriptionCtx,
      ),
    ).toMatchObject({ field: 'amount', message: 'Indique ce que ça coûte.' });
  });
});
