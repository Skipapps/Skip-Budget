/**
 * Pulls the four things a receipt form needs out of recognised text. These are heuristics, so each
 * field is returned only when the evidence is reasonable: a blank field beats a confident wrong one.
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

/** Lines that name the grand total, excluding subtotal and tax. */
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

/** Two-digit years are read as 2000s. A far-future year means the guess is wrong. */
function isoDate(year: number, month: number, day: number): string | undefined {
  const fullYear = year < 100 ? 2000 + year : year;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  if (fullYear < 2000 || fullYear > new Date().getFullYear() + 1) return undefined;
  return `${fullYear}-${pad(month)}-${pad(day)}`;
}

/**
 * Finds the purchase date. Ambiguous numeric dates are read US-first (MM/DD), as both target
 * markets mostly print them; a first number above 12 can only be a day, so that case flips.
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
 * Finds the amount paid: a non-subtotal line that says "total" wins outright, otherwise the
 * largest amount on the receipt (usually, not always, the total).
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
    // Receipts often print the label and figure on separate lines, or in columns Vision reads as two.
    const next = lines[index + 1]?.match(MONEY);
    if (next?.length) labelled.push(toAmount(next[0]));
  }

  // Last labelled total wins: reprints and card-copy footers repeat it; the final one was charged.
  if (labelled.length) return labelled[labelled.length - 1];

  const all = (text.match(MONEY) ?? []).map(toAmount).filter((n) => n > 0);
  if (!all.length) return undefined;
  return Math.max(...all);
}

/**
 * Finds the last four digits of the card used. Masked forms only: a bare four-digit run is never
 * accepted, as receipts are full of them (store numbers, times, totals).
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
 * Guesses the merchant from the top of the receipt: the first line that is not obviously an
 * address, phone number or bare number. The catalog match downstream does the real work.
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

// Layout-aware parsing. Flat text loses what the layout encodes: the shop name is the biggest
// thing at the top, and a total is the money on the same ROW as the word "total", not necessarily
// the next line. These work on positioned lines and fall back to the flat-text versions above.

export type ParsedLine = {
  text: string;
  candidates?: string[];
  confidence?: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Boilerplate that outsizes the shop name on plenty of receipts. */
const NOT_A_NAME =
  /\b(welcome|thank\s*you|receipt|invoice|customer\s*copy|merchant\s*copy|order|survey|store\s*#?\d+|tel|phone|fax|www\.|http|gst|hst|qst|vat)\b/i;

const ADDRESSY =
  /\b(street|st\.?|road|rd\.?|ave\.?|avenue|suite|unit|blvd|hwy|highway|drive|dr\.?|floor)\b/i;

const PHONE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/;

function looksLikeName(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3 || trimmed.length > 40) return false;
  // Needs letters and must not be mostly digits ("12345678" is a store code).
  if (!/[a-z]/i.test(trimmed)) return false;
  if (trimmed.replace(/\D/g, '').length > trimmed.length / 2) return false;
  if (PHONE.test(trimmed)) return false;
  if (ADDRESSY.test(trimmed)) return false;
  if (NOT_A_NAME.test(trimmed)) return false;
  return true;
}

/**
 * The shop, chosen by how it was printed: the tallest plausible line in the top of the page. This
 * still finds the name when a slogan or store number is printed above it.
 */
export function parseMerchantFromLines(lines: ParsedLine[]): string | undefined {
  const top = lines.filter((line) => line.y <= 0.35 && looksLikeName(line.text));
  if (!top.length) return undefined;

  const tallest = top.reduce((best, line) => (line.height > best.height ? line : best));

  // Only trust size when decisive; on a receipt printed at one size the topmost sensible line wins.
  const median = [...top].sort((a, b) => a.height - b.height)[Math.floor(top.length / 2)];
  if (tallest.height < median.height * 1.15) {
    const highest = top.reduce((best, line) => (line.y < best.y ? line : best));
    return highest.text.trim().replace(/\s{2,}/g, ' ');
  }

  return tallest.text.trim().replace(/\s{2,}/g, ' ');
}

/** Two lines share a row when their vertical centres nearly coincide. */
function sameRow(a: ParsedLine, b: ParsedLine): boolean {
  const centreA = a.y + a.height / 2;
  const centreB = b.y + b.height / 2;
  return Math.abs(centreA - centreB) <= Math.max(a.height, b.height) * 0.6;
}

function moneyIn(text: string): number[] {
  return (text.match(MONEY) ?? []).map(toAmount).filter((value) => value > 0);
}

/**
 * The amount charged, matched to its label by row: the money on the label's row, preferring what
 * sits to its right, and only if the row has none, the line below. The last labelled total wins
 * (card footers and reprints repeat it).
 */
export function parseTotalFromLines(lines: ParsedLine[]): number | undefined {
  const labelled: { amount: number; y: number }[] = [];

  for (const line of lines) {
    if (!TOTAL_HINT.test(line.text) || NOT_TOTAL.test(line.text)) continue;

    const inline = moneyIn(line.text);
    if (inline.length) {
      labelled.push({ amount: inline[inline.length - 1], y: line.y });
      continue;
    }

    const rowMates = lines
      .filter((other) => other !== line && sameRow(other, line) && other.x >= line.x)
      .sort((a, b) => a.x - b.x)
      .flatMap((other) => moneyIn(other.text));

    if (rowMates.length) {
      labelled.push({ amount: rowMates[rowMates.length - 1], y: line.y });
      continue;
    }

    const below = lines
      .filter((other) => other.y > line.y)
      .sort((a, b) => a.y - b.y)
      .flatMap((other) => moneyIn(other.text));
    if (below.length) labelled.push({ amount: below[0], y: line.y });
  }

  if (labelled.length) {
    return labelled.sort((a, b) => a.y - b.y)[labelled.length - 1].amount;
  }

  const all = lines.flatMap((line) => moneyIn(line.text));
  return all.length ? Math.max(...all) : undefined;
}

/**
 * A receipt read from its layout, with the flat parser behind it. Date and card digits are matched
 * by shape anywhere on the page, so they come from the joined text.
 */
export function parseReceiptFromLines(lines: ParsedLine[]): ParsedReceipt {
  const text = lines.map((line) => line.text).join('\n');
  if (!lines.length) return parseReceipt(text);

  return {
    merchant: parseMerchantFromLines(lines) ?? parseMerchant(text),
    total: parseTotalFromLines(lines) ?? parseTotal(text),
    date: parseDate(text),
    last4: parseLast4(text),
  };
}
