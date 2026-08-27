/**
 * Pulls the four things a receipt form needs out of recognised text.
 *
 * Vision returns lines in reading order and nothing more — no structure, no
 * labels. Everything below is heuristics over that, so each field is returned
 * only when the evidence is reasonable and left undefined otherwise. A blank
 * field the user fills in is far better than a confident wrong number.
 */

export type ParsedReceipt = {
  merchant?: string;
  total?: number;
  /** yyyy-mm-dd */
  date?: string;
  last4?: string;
};

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** Lines that name the grand total, deliberately excluding subtotal and tax. */
const TOTAL_HINT = /\b(grand\s*total|total\s*due|amount\s*due|balance\s*due|total)\b/i;
const NOT_TOTAL =
  /\b(sub\s*-?\s*total|tax|gst|hst|pst|vat|tip|change|cash\s*back|savings?|discount)\b/i;

/** 1,234.56 / 1234.56 / 12.34 — comma grouping optional, cents required. */
const MONEY = /\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}/g;

function toAmount(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Two-digit years are read as 2000s. A receipt is a record of a purchase that
 * already happened, so a far-future year means the guess is wrong.
 */
function isoDate(year: number, month: number, day: number): string | undefined {
  const fullYear = year < 100 ? 2000 + year : year;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  if (fullYear < 2000 || fullYear > new Date().getFullYear() + 1) return undefined;
  return `${fullYear}-${pad(month)}-${pad(day)}`;
}

/**
 * Finds the purchase date.
 *
 * Ambiguous numeric dates are read US-first (MM/DD) because both target
 * markets print that way far more often than DD/MM — but a first number above
 * 12 can only be a day, so that case flips.
 */
export function parseDate(text: string): string | undefined {
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return isoDate(+iso[1], +iso[2], +iso[3]);

  const named = text.match(
    /\b(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{2,4})\b|\b([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{2,4})\b/i,
  );
  if (named) {
    if (named[1]) {
      const month = MONTHS[named[2].toLowerCase()];
      if (month) return isoDate(+named[3], month, +named[1]);
    } else {
      const month = MONTHS[named[4].toLowerCase()];
      if (month) return isoDate(+named[6], month, +named[5]);
    }
  }

  const numeric = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (numeric) {
    const [first, second, year] = [+numeric[1], +numeric[2], +numeric[3]];
    return first > 12 ? isoDate(year, second, first) : isoDate(year, first, second);
  }

  return undefined;
}

/**
 * Finds the amount paid.
 *
 * Preference order matters more than cleverness: a line that says "total" and
 * is not a subtotal wins outright. Only when no such line exists does it fall
 * back to the largest amount on the receipt, which is usually — not always —
 * the total.
 */
export function parseTotal(text: string): number | undefined {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const labelled: number[] = [];
  for (const [index, line] of lines.entries()) {
    if (!TOTAL_HINT.test(line) || NOT_TOTAL.test(line)) continue;

    const onLine = line.match(MONEY);
    if (onLine?.length) {
      labelled.push(toAmount(onLine[onLine.length - 1]));
      continue;
    }
    // Receipts often print the label and the figure on separate lines, or in
    // columns that Vision reads as two lines.
    const next = lines[index + 1]?.match(MONEY);
    if (next?.length) labelled.push(toAmount(next[0]));
  }

  // Last labelled total wins: reprints and card-copy footers repeat it, and
  // the final one is the figure actually charged.
  if (labelled.length) return labelled[labelled.length - 1];

  const all = (text.match(MONEY) ?? []).map(toAmount).filter((n) => n > 0);
  if (!all.length) return undefined;
  return Math.max(...all);
}

/**
 * Finds the last four digits of the card used.
 *
 * Masked forms only. A bare four-digit run is never accepted — receipts are
 * full of them (store numbers, times, totals) and a wrong card is worse than
 * no card.
 */
export function parseLast4(text: string): string | undefined {
  const masked = text.match(/(?:[*x#•]{2,}\s*|ending\s+(?:in\s+)?|acct\s*#?\s*)(\d{4})\b/i);
  if (masked) return masked[1];

  const afterNetwork = text.match(
    /\b(?:visa|mastercard|master\s*card|amex|american\s+express|discover|debit|credit|interac)\b[^\d\n]{0,12}(\d{4})\b/i,
  );
  return afterNetwork?.[1];
}

/**
 * Guesses the merchant from the top of the receipt.
 *
 * Shop names are printed first and largest. This only filters out the lines
 * that are obviously not a name — addresses, phone numbers, bare numbers — and
 * returns the first survivor. The catalog match downstream does the real work,
 * so a rough string here is enough.
 */
export function parseMerchant(text: string): string | undefined {
  const candidates = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of candidates) {
    if (line.length < 3 || line.length > 40) continue;
    if (!/[a-z]/i.test(line)) continue;
    // Addresses, phone numbers, receipt metadata.
    if (/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/.test(line)) continue;
    if (/\b(street|st\.?|road|rd\.?|ave\.?|avenue|suite|unit|blvd|hwy|drive|dr\.?)\b/i.test(line))
      continue;
    if (/\b(receipt|invoice|order|tel|phone|fax|www\.|http)\b/i.test(line)) continue;
    if (/^\d/.test(line)) continue;

    return line.replace(/\s{2,}/g, ' ');
  }
  return undefined;
}

export function parseReceipt(text: string): ParsedReceipt {
  return {
    merchant: parseMerchant(text),
    total: parseTotal(text),
    date: parseDate(text),
    last4: parseLast4(text),
  };
}
