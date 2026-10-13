import {
  FIRST_PAYMENT_MONTHS_MAX,
  defaultFirstPayment,
  earliestFirstPayment,
  firstPaymentProblem,
  isShortMonthEnd,
  latestFirstPayment,
  paymentDayChoices,
  paymentDayFits,
} from '@/lib/loan-first-payment';

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

const pad = (value: number) => String(value).padStart(2, '0');
/** yyyy-mm-dd, so a wrong date reads plainly in a failure. */
const iso = (date: Date | null) =>
  date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : null;

const daysApart = (from: Date, to: Date) =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  );

describe('defaultFirstPayment: a month after the start, on its day', () => {
  it('is the next month on the start’s day (the wireframe loan and the Founder’s screenshot)', () => {
    expect(iso(defaultFirstPayment(day(2024, 12, 27)))).toBe('2025-01-27');
    expect(iso(defaultFirstPayment(day(2025, 11, 30)))).toBe('2025-12-30');
    expect(iso(defaultFirstPayment(day(2026, 3, 1)))).toBe('2026-04-01');
    expect(iso(defaultFirstPayment(day(2025, 12, 31)))).toBe('2026-01-31');
  });

  it('clamps to a shorter month’s end: 29 Feb in a leap year, 28 Feb otherwise', () => {
    expect(iso(defaultFirstPayment(day(2024, 1, 31)))).toBe('2024-02-29');
    expect(iso(defaultFirstPayment(day(2025, 1, 31)))).toBe('2025-02-28');
    expect(iso(defaultFirstPayment(day(2024, 1, 30)))).toBe('2024-02-29');
    expect(iso(defaultFirstPayment(day(2025, 1, 29)))).toBe('2025-02-28');
    expect(iso(defaultFirstPayment(day(2026, 3, 31)))).toBe('2026-04-30');
    expect(iso(defaultFirstPayment(day(2026, 8, 31)))).toBe('2026-09-30');
  });

  it('starts on the last of February and is the same day of March', () => {
    expect(iso(defaultFirstPayment(day(2024, 2, 29)))).toBe('2024-03-29');
    expect(iso(defaultFirstPayment(day(2025, 2, 28)))).toBe('2025-03-28');
  });

  it('ignores the time of day and returns local midnight', () => {
    const due = defaultFirstPayment(new Date(2024, 11, 27, 23, 59, 59)) as Date;
    expect([due.getFullYear(), due.getMonth(), due.getDate(), due.getHours()]).toEqual([
      2025, 0, 27, 0,
    ]);
  });

  it('is null for a start that is not a date', () => {
    expect(defaultFirstPayment(new Date(Number.NaN))).toBeNull();
    expect(latestFirstPayment(new Date(Number.NaN))).toBeNull();
    expect(earliestFirstPayment(new Date(Number.NaN))).toBeNull();
  });

  it('holds for every start day of 2023–2025: next month, the start’s day or that month’s end', () => {
    const wrong: string[] = [];
    for (let start = day(2023, 1, 1); start <= day(2025, 12, 31);) {
      const due = defaultFirstPayment(start) as Date;
      const monthsAhead =
        (due.getFullYear() - start.getFullYear()) * 12 + due.getMonth() - start.getMonth();
      const lastOfMonth = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
      const span = daysApart(start, due);
      if (
        monthsAhead !== 1 ||
        due.getDate() !== Math.min(start.getDate(), lastOfMonth) ||
        due.getHours() !== 0 ||
        span < 28 ||
        span > 31 ||
        // The start's day always fits the default, so it stays the loan's payment day.
        !paymentDayFits(due, start.getDate())
      ) {
        wrong.push(`${start.toDateString()}: ${due.toDateString()}`);
      }
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    }
    expect(wrong).toEqual([]);
  });
});

describe('the first payments the page takes', () => {
  it('runs from the day after the start to the start’s day a year on', () => {
    expect(FIRST_PAYMENT_MONTHS_MAX).toBe(12);
    expect(iso(earliestFirstPayment(day(2025, 11, 30)))).toBe('2025-12-01');
    expect(iso(latestFirstPayment(day(2025, 11, 30)))).toBe('2026-11-30');
    expect(iso(earliestFirstPayment(day(2025, 12, 31)))).toBe('2026-01-01');
    // 29 Feb has no day a year on; its month's end does.
    expect(iso(latestFirstPayment(day(2024, 2, 29)))).toBe('2025-02-28');
  });

  it('takes 14 Jan for a 30 Nov start, which the payment day chips could not reach', () => {
    expect(firstPaymentProblem(day(2025, 11, 30), day(2026, 1, 14))).toBeNull();
  });

  it('refuses a first payment on or before the start', () => {
    expect(firstPaymentProblem(day(2025, 11, 30), day(2025, 11, 30))).toBe('not-after-start');
    expect(firstPaymentProblem(day(2025, 11, 30), day(2025, 11, 1))).toBe('not-after-start');
    expect(firstPaymentProblem(day(2025, 11, 30), day(2025, 12, 1))).toBeNull();
  });

  it('refuses a first payment more than a year after the start', () => {
    expect(firstPaymentProblem(day(2025, 11, 30), day(2026, 11, 30))).toBeNull();
    expect(firstPaymentProblem(day(2025, 11, 30), day(2026, 12, 1))).toBe('too-late');
    expect(firstPaymentProblem(day(2024, 2, 29), day(2025, 2, 28))).toBeNull();
    expect(firstPaymentProblem(day(2024, 2, 29), day(2025, 3, 1))).toBe('too-late');
  });

  it('compares days, not times of day', () => {
    expect(firstPaymentProblem(new Date(2025, 10, 30, 23, 0), new Date(2025, 11, 1, 0, 0))).toBe(
      null,
    );
    expect(firstPaymentProblem(new Date(2025, 10, 30, 0, 0), new Date(2025, 10, 30, 23, 59))).toBe(
      'not-after-start',
    );
  });
});

describe('a first payment on a short month’s last day', () => {
  it('is the last day of a month shorter than 31 days, and nothing else', () => {
    for (const date of [day(2025, 2, 28), day(2024, 2, 29), day(2026, 4, 30), day(2026, 11, 30)]) {
      expect([iso(date), isShortMonthEnd(date)]).toEqual([iso(date), true]);
    }
    for (const date of [day(2024, 2, 28), day(2026, 1, 31), day(2026, 4, 29), day(2026, 1, 14)]) {
      expect([iso(date), isShortMonthEnd(date)]).toEqual([iso(date), false]);
    }
  });

  it('can stand for its own day or a later one; any other date only for its own', () => {
    expect([28, 29, 30, 31].map((d) => paymentDayFits(day(2025, 2, 28), d))).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect([27, 32, 0, 28.5].map((d) => paymentDayFits(day(2025, 2, 28), d))).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect([30, 31].map((d) => paymentDayFits(day(2026, 4, 30), d))).toEqual([true, true]);
    expect([14, 15, 31].map((d) => paymentDayFits(day(2026, 1, 14), d))).toEqual([
      true,
      false,
      false,
    ]);
    expect(paymentDayFits(new Date(Number.NaN), 14)).toBe(false);
  });

  it('offers its own day and every month’s end, plus the day it was set for in between', () => {
    expect(paymentDayChoices(day(2025, 2, 28), 28)).toEqual([28, 31]);
    expect(paymentDayChoices(day(2025, 2, 28), 31)).toEqual([28, 31]);
    // A 30 Jan start, first due 28 Feb: a loan paid on the 30th, which neither chip says.
    expect(paymentDayChoices(day(2025, 2, 28), 30)).toEqual([28, 30, 31]);
    expect(paymentDayChoices(day(2024, 2, 29), 30)).toEqual([29, 30, 31]);
    expect(paymentDayChoices(day(2026, 4, 30), 30)).toEqual([30, 31]);
    // A day it cannot stand for is not offered.
    expect(paymentDayChoices(day(2025, 2, 28), 14)).toEqual([28, 31]);
  });

  it('offers nothing when the date says the day on its own', () => {
    expect(paymentDayChoices(day(2026, 1, 14), 14)).toBeNull();
    expect(paymentDayChoices(day(2026, 1, 31), 31)).toBeNull();
    expect(paymentDayChoices(day(2024, 2, 28), 28)).toBeNull();
    expect(paymentDayChoices(new Date(Number.NaN), 28)).toBeNull();
  });
});
