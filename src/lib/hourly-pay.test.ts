import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { estimateHourlyPay, hourlyProblem, OVERTIME_RATES, type HourlyPay } from '@/lib/hourly-pay';

const base: HourlyPay = {
  rate: 20,
  hoursPerWeek: 40,
  overtimeHoursPerWeek: 0,
  overtimeMultiplier: 1.5,
  deductionPercent: 0,
  frequency: 'weekly',
};

describe('estimateHourlyPay', () => {
  it('multiplies rate by hours for a weekly paycheck', () => {
    expect(estimateHourlyPay(base)).toEqual({
      grossPerWeek: 800,
      grossPerPaycheck: 800,
      takeHomePerPaycheck: 800,
    });
  });

  it('pays overtime at its multiple of the rate', () => {
    // 40 × $20 + 5 × $30 = $950
    expect(estimateHourlyPay({ ...base, overtimeHoursPerWeek: 5 }).grossPerWeek).toBe(950);
    // 40 × $20 + 5 × $40 = $1,000
    expect(
      estimateHourlyPay({ ...base, overtimeHoursPerWeek: 5, overtimeMultiplier: 2 }).grossPerWeek,
    ).toBe(1000);
  });

  it('pays a one-off pay for exactly the hours given, overtime included', () => {
    // 12 × $20 + 3 × $30 = $330, once.
    expect(
      estimateHourlyPay({ ...base, hoursPerWeek: 12, overtimeHoursPerWeek: 3, frequency: 'once' })
        .grossPerPaycheck,
    ).toBe(330);
  });

  it('covers two weeks on a fortnightly paycheck', () => {
    expect(estimateHourlyPay({ ...base, frequency: 'biweekly' }).grossPerPaycheck).toBe(1600);
  });

  it('averages the year for twice-a-month and monthly pay', () => {
    // $800 a week × 52 weeks ÷ 24 paychecks = $1,733.333… → $1,733.33
    expect(estimateHourlyPay({ ...base, frequency: 'semimonthly' }).grossPerPaycheck).toBe(1733.33);
    // $800 a week × 52 ÷ 12 = $3,466.666… → $3,466.67
    expect(estimateHourlyPay({ ...base, frequency: 'monthly' }).grossPerPaycheck).toBe(3466.67);
  });

  it('takes tax and deductions off the gross, to the cent', () => {
    // $800 less 22% = $624.00
    expect(estimateHourlyPay({ ...base, deductionPercent: 22 }).takeHomePerPaycheck).toBe(624);
    // $1,733.33 less 18.5% = $1,412.66395 → $1,412.66
    expect(
      estimateHourlyPay({ ...base, frequency: 'semimonthly', deductionPercent: 18.5 })
        .takeHomePerPaycheck,
    ).toBe(1412.66);
  });

  it('rounds half a cent away from zero, like every other amount', () => {
    // $15.25 × 37.5 hours = $571.875 → $571.88
    expect(estimateHourlyPay({ ...base, rate: 15.25, hoursPerWeek: 37.5 }).grossPerWeek).toBe(
      571.88,
    );
  });

  it('ignores negative overtime rather than paying it back', () => {
    expect(estimateHourlyPay({ ...base, overtimeHoursPerWeek: -3 }).grossPerWeek).toBe(800);
  });
});

describe('hourlyProblem', () => {
  it('accepts a complete week', () => {
    expect(hourlyProblem(base)).toBeNull();
  });

  it('asks for the rate and the hours', () => {
    expect(hourlyProblem({ ...base, rate: 0 })).toMatch(/per hour/);
    expect(hourlyProblem({ ...base, hoursPerWeek: 0 })).toMatch(/hours/);
  });

  it('refuses a week longer than a week', () => {
    expect(hourlyProblem({ ...base, hoursPerWeek: 120, overtimeHoursPerWeek: 60 })).toMatch(/168/);
  });

  it('refuses deductions of all the pay or more', () => {
    expect(hourlyProblem({ ...base, deductionPercent: 100 })).toMatch(/under 100/);
  });
});

describe('in Spanish and French', () => {
  beforeEach(() => resetLocaleForTests());
  afterAll(() => resetLocaleForTests());

  it('words each form hint in the language on screen', () => {
    setLanguage('es');
    expect(hourlyProblem({ ...base, rate: 0 })).toBe('Ingresa cuánto ganas por hora.');
    expect(hourlyProblem({ ...base, hoursPerWeek: 160, overtimeHoursPerWeek: 10 })).toBe(
      'Una semana solo tiene 168 horas. Revisa las horas que ingresaste.',
    );

    setLanguage('fr');
    expect(hourlyProblem({ ...base, overtimeHoursPerWeek: -1 })).toBe(
      'Les heures supplémentaires ne peuvent pas être négatives.',
    );
    expect(hourlyProblem({ ...base, deductionPercent: 100 })).toBe(
      'Les impôts et les retenues doivent être un pourcentage inférieur à 100.',
    );
  });

  it('names the overtime rates but keeps their values', () => {
    expect(OVERTIME_RATES.map((rate) => rate.label)).toEqual([
      'Time and a half (1.5×)',
      'Double time (2×)',
    ]);
    setLanguage('es');
    expect(OVERTIME_RATES[0].label).toBe('Tiempo y medio (1.5×)');
    setLanguage('fr');
    expect(OVERTIME_RATES.map((rate) => rate.label)).toEqual([
      'Temps et demi (1,5×)',
      'Temps double (2×)',
    ]);
    expect(OVERTIME_RATES.map((rate) => rate.value)).toEqual(['1.5', '2']);
  });
});
