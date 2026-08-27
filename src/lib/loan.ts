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
