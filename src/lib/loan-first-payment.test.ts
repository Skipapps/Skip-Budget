import { firstPaymentOn } from '@/lib/loan-first-payment';

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

/** yyyy-mm-dd of the rule's first payment, so a wrong date reads plainly in a failure. */
function first(start: Date, paymentDay: number): string | null {
  const due = firstPaymentOn(start, paymentDay);
  if (!due) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
}

const daysApart = (from: Date, to: Date) =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  );

describe('firstPaymentOn: the payment day on or after the start day', () => {
  it('is the payment day of the next month (the wireframe loan and the Founder’s examples)', () => {
    expect(first(day(2024, 12, 27), 27)).toBe('2025-01-27');
    expect(first(day(2024, 12, 28), 28)).toBe('2025-01-28');
    expect(first(day(2024, 12, 27), 31)).toBe('2025-01-31');
    expect(first(day(2026, 3, 1), 15)).toBe('2026-04-15');
  });

  it('is next month when the payment day is the start day itself', () => {
    for (const [start, expected] of [
      [day(2026, 1, 1), '2026-02-01'],
      [day(2026, 6, 15), '2026-07-15'],
      [day(2026, 11, 30), '2026-12-30'],
      [day(2025, 12, 31), '2026-01-31'],
    ] as const) {
      expect([start.toDateString(), first(start, start.getDate())]).toEqual([
        start.toDateString(),
        expected,
      ]);
    }
  });
});

describe('firstPaymentOn: a payment day earlier in the month than the start day', () => {
  it('skips to the month after next, so the first period is not a few days', () => {
    expect(first(day(2025, 12, 28), 2)).toBe('2026-02-02');
    expect(first(day(2024, 12, 27), 22)).toBe('2025-02-22');
    expect(first(day(2026, 5, 2), 1)).toBe('2026-07-01');
  });

  it('carries into the next year', () => {
    expect(first(day(2025, 11, 30), 2)).toBe('2026-01-02');
    expect(first(day(2025, 12, 15), 1)).toBe('2026-02-01');
  });
});

describe('firstPaymentOn: days 29–31 clamp to the month’s end', () => {
  it('29 Feb in a leap year, 28 Feb otherwise', () => {
    expect(first(day(2024, 1, 31), 31)).toBe('2024-02-29');
    expect(first(day(2025, 1, 31), 31)).toBe('2025-02-28');
    expect(first(day(2024, 1, 30), 30)).toBe('2024-02-29');
    expect(first(day(2025, 1, 29), 29)).toBe('2025-02-28');
    expect(first(day(2024, 1, 29), 29)).toBe('2024-02-29');
  });

  it('a 31st in a 30-day month is its 30th', () => {
    expect(first(day(2026, 3, 31), 31)).toBe('2026-04-30');
    expect(first(day(2026, 8, 31), 31)).toBe('2026-09-30');
    expect(first(day(2026, 10, 31), 31)).toBe('2026-11-30');
    expect(first(day(2026, 4, 30), 31)).toBe('2026-05-31');
  });

  it('compares on the day asked for, not the day it clamps to', () => {
    // 30 is earlier than the 31st, so it waits a month, though February has no 30th either way.
    expect(first(day(2025, 1, 31), 30)).toBe('2025-03-30');
    expect(first(day(2024, 1, 31), 29)).toBe('2024-03-29');
    // Month after next is February: clamped there.
    expect(first(day(2023, 12, 31), 30)).toBe('2024-02-29');
    expect(first(day(2024, 12, 31), 30)).toBe('2025-02-28');
  });

  it('starts on the last of February', () => {
    expect(first(day(2024, 2, 29), 29)).toBe('2024-03-29');
    expect(first(day(2025, 2, 28), 28)).toBe('2025-03-28');
    expect(first(day(2025, 2, 28), 29)).toBe('2025-03-29');
    expect(first(day(2025, 2, 28), 31)).toBe('2025-03-31');
    expect(first(day(2024, 2, 29), 28)).toBe('2024-04-28');
  });
});

describe('firstPaymentOn: what it takes and gives', () => {
  it('ignores the time of day and returns local midnight', () => {
    const due = firstPaymentOn(new Date(2024, 11, 27, 23, 59, 59), 27) as Date;
    expect([
      due.getFullYear(),
      due.getMonth(),
      due.getDate(),
      due.getHours(),
      due.getMinutes(),
    ]).toEqual([2025, 0, 27, 0, 0]);
  });

  it('is null for a day that is not 1–31 or a start that is not a date', () => {
    for (const bad of [0, 32, -1, 2.5, Number.NaN, Infinity]) {
      expect([bad, firstPaymentOn(day(2025, 1, 15), bad)]).toEqual([bad, null]);
    }
    expect(firstPaymentOn(new Date(Number.NaN), 15)).toBeNull();
  });

  it('holds for every start day of 2023–2025 and every payment day', () => {
    const wrong: string[] = [];
    let checked = 0;
    for (let start = day(2023, 1, 1); start <= day(2025, 12, 31);) {
      for (let paymentDay = 1; paymentDay <= 31; paymentDay += 1) {
        const due = firstPaymentOn(start, paymentDay) as Date;
        const monthsAhead =
          (due.getFullYear() - start.getFullYear()) * 12 + due.getMonth() - start.getMonth();
        const lastOfMonth = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
        const span = daysApart(start, due);
        checked += 1;

        if (
          monthsAhead !== (paymentDay >= start.getDate() ? 1 : 2) ||
          due.getDate() !== Math.min(paymentDay, lastOfMonth) ||
          due.getHours() !== 0 ||
          // Never a short first period: at least February's 28 days, at most two months less a day.
          span < 28 ||
          span > 61
        ) {
          wrong.push(`${start.toDateString()} day ${paymentDay}: ${due.toDateString()}`);
        }
      }
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    }
    expect(checked).toBe(1096 * 31);
    expect(wrong).toEqual([]);
  });
});
