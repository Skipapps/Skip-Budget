import { LOAN_TYPES, loanTypeIconId, loanTypeLabelKey, loanTypeOf } from '@/data/loan-types';
import { t } from '@/i18n';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import {
  SAVABLE_RATE_MAX,
  baseParams,
  overrideParams,
  parseBasis,
  rateSavable,
  readLoanRoute,
  routeDate,
  termsFromRoute,
  typedAmount,
  typedRate,
} from '@/lib/loan-route';

afterEach(() => resetLocaleForTests());

describe('a typed loan amount', () => {
  it('is kept exactly as typed, however far past the slider’s ends', () => {
    expect(typedAmount('2500000')).toBe(2_500_000);
    expect(typedAmount('999999999.99')).toBe(999_999_999.99);
    expect(typedAmount('250')).toBe(250);
    expect(typedAmount('0.01')).toBe(0.01);
    expect(typedAmount('25000.')).toBe(25_000);
  });

  it('is refused at zero or with nothing typed, never turned into another figure', () => {
    for (const draft of ['', ' ', '0', '0.', '0.00', '-5', 'abc']) {
      expect([draft, typedAmount(draft)]).toEqual([draft, null]);
    }
  });
});

describe('a typed rate', () => {
  it('is kept exactly as typed, past the slider’s 30%, and zero is a rate', () => {
    expect(typedRate('45')).toBe(45);
    expect(typedRate('150.25')).toBe(150.25);
    expect(typedRate('0')).toBe(0);
    expect(typedRate('8.14')).toBe(8.14);
  });

  it('is refused when nothing is typed or it is below zero', () => {
    for (const draft of ['', ' ', '-1', 'x'])
      expect([draft, typedRate(draft)]).toEqual([draft, null]);
  });
});

describe('a savable rate', () => {
  it('runs from 0 to the loans table’s 100, to its nine decimals', () => {
    expect(SAVABLE_RATE_MAX).toBe(100);
    // Sixteenths of a point, a four-decimal note rate, a daily rate × 365, and nine decimals.
    for (const rate of [0, 7.5, 8.14, 6.0625, 7.4995, 8.139865, 7.123456789, 99.999999999, 100]) {
      expect([rate, rateSavable(rate)]).toEqual([rate, true]);
    }
  });

  it('is refused past 100, below 0, or with a tenth decimal the column would round away', () => {
    for (const rate of [100.0000000001, 150, -0.5, 7.12345678949, 0.0000000001, NaN]) {
      expect([rate, rateSavable(rate)]).toEqual([rate, false]);
    }
  });
});

describe('the route a loan page is opened with', () => {
  it('reads every figure as the ASCII it was sent as', () => {
    expect(
      readLoanRoute({
        amount: '31394.33',
        rate: '8.14',
        months: '72',
        start: '2026-01-14',
        funded: '2025-11-30',
        basis: 'monthly',
        payment: '554.34',
        extra: '100',
        lump: '2500',
        lumpOn: '2027-03-14',
        fees: '0',
        name: 'Car loan',
      }),
    ).toEqual({
      principal: 31_394.33,
      annualRate: 8.14,
      months: 72,
      start: '2026-01-14',
      funded: '2025-11-30',
      basis: 'monthly',
      payment: 554.34,
      extraMonthly: 100,
      lumpSum: 2500,
      lumpOn: '2027-03-14',
      fees: 0,
      name: 'Car loan',
      overrides: {},
      draft: '',
    });
  });

  it('reads the bank’s payment and the changed payments, and drops what is not money', () => {
    expect(
      readLoanRoute({ monthly: '554.23', overrides: '{"12":10000,"3":600.5}', draft: 'loan-4' }),
    ).toEqual(
      expect.objectContaining({
        overrides: { monthlyPayment: 554.23, payments: { 3: 600.5, 12: 10_000 } },
        draft: 'loan-4',
      }),
    );
    for (const monthly of ['', '0', '-5', '554.235', 'abc']) {
      expect([monthly, readLoanRoute({ monthly }).overrides]).toEqual([monthly, {}]);
    }
    expect(readLoanRoute({ overrides: '{"0":5,"x":5,"4":-1,"5":1.001}' }).overrides).toEqual({});
    expect(readLoanRoute({ overrides: 'not json' }).overrides).toEqual({});
  });

  it('writes the changes back as params, leaving out what is not set', () => {
    const changes = { monthlyPayment: 554.23, payments: { 12: 10_000 } };
    expect(overrideParams(changes)).toEqual({ monthly: '554.23', overrides: '{"12":10000}' });
    expect(readLoanRoute(overrideParams(changes)).overrides).toEqual(changes);
    expect(overrideParams({})).toEqual({});
  });

  it('builds the contract without extras, and the schedule with them', () => {
    const route = readLoanRoute({
      amount: '25000',
      rate: '7.5',
      months: '60',
      start: '2026-10-09',
      funded: '2026-09-09',
      basis: 'monthly',
      extra: '100',
      lump: '2500',
      lumpOn: '2027-10-09',
    });
    const contract = termsFromRoute(route, { withExtras: false });
    expect(contract).toEqual(
      expect.objectContaining({
        principal: 25_000,
        annualRatePercent: 7.5,
        months: 60,
        extra: undefined,
      }),
    );
    expect(contract.payment).toBeUndefined();
    expect(termsFromRoute(route, { withExtras: true }).extra).toEqual({
      monthly: 100,
      lumpSums: [{ on: new Date(2027, 9, 9), amount: 2500 }],
    });
    expect(baseParams(route)).toEqual({
      amount: '25000',
      rate: '7.5',
      months: '60',
      start: '2026-10-09',
      funded: '2026-09-09',
      basis: 'monthly',
    });
    expect(baseParams(readLoanRoute({ payment: '554.34' })).payment).toBe('554.34');
  });

  it('reads a missing or garbled figure as nothing, and unknown fees as unknown, not none', () => {
    const route = readLoanRoute({ amount: 'x', extra: '-4', basis: 'weekly' });
    expect(route).toEqual(
      expect.objectContaining({
        principal: 0,
        annualRate: 0,
        months: 0,
        start: '',
        basis: 'actual/365',
        payment: 0,
        extraMonthly: 0,
        fees: null,
        name: '',
      }),
    );
  });

  it('lets only the app’s own conventions through', () => {
    for (const basis of ['actual/365', 'actual/360', '30/360', 'monthly'] as const) {
      expect(parseBasis(basis)).toBe(basis);
    }
    expect(parseBasis('actual/366')).toBe('actual/365');
    expect(parseBasis(undefined)).toBe('actual/365');
  });

  it('reads a date as local midnight', () => {
    const date = routeDate('2026-03-08');
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate(), date?.getHours()]).toEqual([
      2026, 2, 8, 0,
    ]);
    expect(routeDate('')).toBeUndefined();
  });
});

describe('loan types', () => {
  it('are stored on the bill as loan-<type> and read back, and nothing else reads as one', () => {
    for (const type of LOAN_TYPES) expect(loanTypeOf(loanTypeIconId(type))).toBe(type);
    expect(loanTypeIconId('credit-card')).toBe('loan-credit-card');
    for (const other of [null, undefined, '', 'other', 'loans', 'loan-', 'loan-boat', 'car']) {
      expect([other, loanTypeOf(other)]).toEqual([other, null]);
    }
  });

  it('are offered in the design’s order', () => {
    expect(LOAN_TYPES).toEqual([
      'personal',
      'car',
      'student',
      'home',
      'business',
      'medical',
      'credit-card',
      'other',
    ]);
  });

  it.each([
    [
      'en' as const,
      ['Personal', 'Car', 'Student', 'Home', 'Business', 'Medical', 'Credit card', 'Other'],
    ],
    [
      'es' as const,
      [
        'Personal',
        'Auto',
        'Estudiantil',
        'Vivienda',
        'Negocio',
        'Médico',
        'Tarjeta de crédito',
        'Otro',
      ],
    ],
    [
      'fr' as const,
      [
        'Personnel',
        'Auto',
        'Études',
        'Maison',
        'Entreprise',
        'Médical',
        'Carte de crédit',
        'Autre',
      ],
    ],
  ])('are named in %s', (language, names) => {
    setLanguage(language);
    expect(LOAN_TYPES.map((type) => t(loanTypeLabelKey(type)))).toEqual(names);
  });
});
