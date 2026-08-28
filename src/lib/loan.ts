/** Standard amortisation maths for a fixed-rate, fixed-term loan. */

export type LoanBreakdown = {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  /** Interest as a share of everything paid, 0–1. */
  interestShare: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * M = P · r(1+r)^n / ((1+r)^n − 1)
 *
 * A 0% rate divides by zero in that formula, so it is handled separately
 * rather than returning NaN — interest-free plans are a real case.
 */
export function calculateLoan(
  principal: number,
  annualRatePercent: number,
  months: number,
): LoanBreakdown {
  if (principal <= 0 || months <= 0) {
    return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0, interestShare: 0 };
  }

  const monthlyRate = annualRatePercent / 100 / 12;

  const monthlyPayment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);

  const totalPaid = monthlyPayment * months;
  const totalInterest = totalPaid - principal;

  return {
    monthlyPayment: round2(monthlyPayment),
    totalPaid: round2(totalPaid),
    totalInterest: round2(totalInterest),
    interestShare: totalPaid > 0 ? totalInterest / totalPaid : 0,
  };
}

/** Last payment date, given when repayments start. */
export function payoffDate(start: Date, months: number): Date {
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end;
}

/** "3 yrs 6 mo" — clearer than a raw month count once terms get long. */
export function formatTerm(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return `${remainder} mo`;
  if (remainder === 0) return `${years} yr${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${remainder} mo`;
}

export type AmortisationRow = {
  /** 1-based payment number. */
  number: number;
  /** yyyy-mm-dd */
  date: string;
  payment: number;
  interest: number;
  principal: number;
  /** What is still owed after this payment. */
  balance: number;
};

/**
 * Where every single payment goes.
 *
 * "Total interest = $5,056" says a loan is expensive. This says why: on a
 * 7.5% loan the first payment is more than a third interest, and the last is
 * almost none. That shift is the whole story of borrowing money, and it is
 * invisible in a single total.
 *
 * The final payment is squared off against whatever is actually left rather
 * than recomputed, so the balance lands on exactly zero instead of a few cents
 * either side — which is what a real lender does.
 */
export function amortisationSchedule(
  principal: number,
  annualRatePercent: number,
  months: number,
  firstPaymentOn: Date,
): AmortisationRow[] {
  if (principal <= 0 || months <= 0) return [];

  const { monthlyPayment } = calculateLoan(principal, annualRatePercent, months);
  const monthlyRate = annualRatePercent / 100 / 12;

  const rows: AmortisationRow[] = [];
  let balance = principal;

  for (let index = 0; index < months; index += 1) {
    const interest = round2(balance * monthlyRate);
    const last = index === months - 1;

    // Rounding leaves a few cents adrift over dozens of payments; the last one
    // absorbs them so the loan actually closes.
    const paid = last ? balance : Math.min(round2(monthlyPayment - interest), balance);
    const payment = round2(paid + interest);

    balance = round2(balance - paid);

    const due = new Date(firstPaymentOn);
    due.setMonth(due.getMonth() + index);
    // Guard the 31st: setMonth rolls a short month into the next one.
    if (due.getDate() !== firstPaymentOn.getDate()) due.setDate(0);

    rows.push({
      number: index + 1,
      date: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`,
      payment,
      interest,
      principal: paid,
      balance: Math.max(0, balance),
    });
  }

  return rows;
}

/** Schedule rows grouped into years, for a term too long to scan flat. */
export function scheduleByYear(rows: AmortisationRow[]) {
  const years = new Map<string, AmortisationRow[]>();
  for (const row of rows) {
    const year = row.date.slice(0, 4);
    const bucket = years.get(year);
    if (bucket) bucket.push(row);
    else years.set(year, [row]);
  }

  return [...years.entries()].map(([year, payments]) => ({
    year,
    payments,
    interest: round2(payments.reduce((sum, row) => sum + row.interest, 0)),
    principal: round2(payments.reduce((sum, row) => sum + row.principal, 0)),
  }));
}
