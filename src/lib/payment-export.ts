import { sumMoney, toCents, wholeCents } from '@/lib/money';
import { buildTokens } from '@/theme/palette';

/** Which payments a view shows. */
export type ExportKind = 'all' | 'bill' | 'subscription';

/** What one payment brings to an export. A payment-history entry has every field. */
export type ExportSource = {
  date: string;
  name: string;
  /** Positive: money paid out. */
  amount: number;
  kind: 'bill' | 'subscription';
  status: 'paid' | 'paidOff' | 'extraPayment';
  /** '' when no card or account was set. */
  sourceId: string;
};

export type ExportRow = {
  /** yyyy-mm-dd */
  date: string;
  name: string;
  kind: string;
  amount: number;
  paidFrom: string;
};

/** Every word an export prints, in the app's language. */
export type ExportWords = {
  date: string;
  name: string;
  kind: string;
  /** Names the currency, since CSV amounts are bare numbers: "Amount (USD)". */
  amount: string;
  paidFrom: string;
  title: string;
  scope: string;
  total: string;
  made: string;
};

export type KindWords = Record<'bill' | 'subscription' | 'paidOff' | 'extraPayment', string>;

export function exportRows(
  rows: readonly ExportSource[],
  o: { labelOf: (id: string) => string | null; kindWord: KindWords; notSet: string },
): ExportRow[] {
  return rows.map((row) => ({
    date: row.date,
    name: row.name,
    // A loan payoff is not a bill a person was charged, so it keeps its own word.
    kind: row.status === 'paid' ? o.kindWord[row.kind] : o.kindWord[row.status],
    amount: row.amount,
    // A card deleted since has no label either, and reads the same as one never set.
    paidFrom: (row.sourceId && o.labelOf(row.sourceId)) || o.notSet,
  }));
}

/** "1035.00": whole cents, a dot, no grouping and no symbol, so every spreadsheet reads a number. */
export function plainAmount(amount: number): string {
  // toCents keeps 12 significant digits, which drops the cents above $10 billion; a stored amount
  // is already whole cents, so only a real third decimal is rounded.
  const cents = wholeCents(amount) ?? toCents(amount);
  const whole = Math.abs(cents);
  const sign = cents < 0 ? '-' : '';
  return `${sign}${Math.floor(whole / 100)}.${String(whole % 100).padStart(2, '0')}`;
}

/**
 * Spreadsheets run a cell that opens with one of these as a formula, so a payee typed as
 * "=HYPERLINK(…)" would run when the file is opened; a leading apostrophe keeps it text. Leading
 * spaces and the full-width forms some locales accept count too.
 */
const FORMULA_START = /^(?:\s*[=+\-@＝＋－＠]|[\t\r\n])/;

function csvCell(text: string): string {
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The byte-order mark Excel needs to read UTF-8 rather than guess a Windows code page. */
const BOM = '\uFEFF';
const CRLF = '\r\n';

/** RFC 4180: comma-separated, CRLF after every record, quoted only where needed. */
export function paymentsCsv(rows: readonly ExportRow[], w: ExportWords): string {
  const header = [w.date, w.name, w.kind, w.amount, w.paidFrom].map(csvCell);
  const records = rows.map((row) => [
    csvCell(row.date),
    csvCell(row.name),
    csvCell(row.kind),
    // Built here from cents, never from free text, so a minus sign is a number, not a formula.
    plainAmount(row.amount),
    csvCell(row.paidFrom),
  ]);
  return BOM + [header, ...records].map((record) => record.join(',') + CRLF).join('');
}

export type ExportMonth = { month: string; total: number; rows: ExportRow[] };

/**
 * Rows by calendar month (yyyy-mm), in the order the months first appear, each with its total. The
 * total adds the cents each row shows, so a printed month always adds up to its rows.
 */
export function exportMonths(rows: readonly ExportRow[]): ExportMonth[] {
  const months = new Map<string, ExportRow[]>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const list = months.get(month);
    if (list) list.push(row);
    else months.set(month, [row]);
  }
  return [...months].map(([month, list]) => ({
    month,
    total: sumMoney(list.map((row) => row.amount)),
    rows: list,
  }));
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/**
 * The page margins, in points, that the PDF renderer is given. The HTML sets none of its own: on
 * iOS margins come only from the print call, and both there would double them.
 */
export const PDF_MARGINS = { top: 40, right: 36, bottom: 40, left: 36 } as const;

export type HtmlFormats = {
  money: (amount: number) => string;
  /** A row's date, as the app writes it. */
  date: (iso: string) => string;
  /** A month heading from yyyy-mm, with its year: one export can span years. */
  month: (month: string) => string;
};

/** One line of the statement: a cell per column, each a fixed share of the page width. */
function line(kind: string, cells: readonly [string, string][]): string {
  const inner = cells.map(([column, text]) => `<div class="${column}">${escapeHtml(text)}</div>`);
  return `<div class="${kind}">${inner.join('')}</div>`;
}

/**
 * A statement that looks like the app's history page: the accent heading, then month groups with
 * their totals. Light only, the system font and no images, so nothing is fetched while printing.
 * Every width is a share of the page, so it fits A4 and US Letter alike, and a long name wraps in
 * its own column instead of squeezing the others.
 *
 * Built from blocks, not a table: iOS prints with WebKit, which keeps a block whole across a page
 * break but ignores that on table rows and does not repeat a table's headings. So no row splits,
 * a month's heading never sits alone at the foot of a page, and the column headings print once.
 */
export function paymentsHtml(rows: readonly ExportRow[], w: ExportWords, o: HtmlFormats): string {
  const c = buildTokens('light');
  const total = sumMoney(rows.map((row) => row.amount));

  const months = exportMonths(rows).map((group) => {
    const [first, ...rest] = group.rows.map((row) =>
      line('row', [
        ['date', o.date(row.date)],
        ['name', row.name],
        ['kind', row.kind],
        ['amount', o.money(row.amount)],
        ['from', row.paidFrom],
      ]),
    );
    const heading = line('row month', [
      ['heading', o.month(group.month)],
      ['amount', o.money(group.total)],
      ['from', ''],
    ]);
    return `<section>\n<div class="keep">${heading}\n${first}</div>\n${rest.join('\n')}\n</section>`;
  });

  const columns = line('row columns', [
    ['date', w.date],
    ['name', w.name],
    ['kind', w.kind],
    ['amount', w.amount],
    ['from', w.paidFrom],
  ]);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(w.title)}</title>
<style>
:root { color-scheme: light; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
* { box-sizing: border-box; }
body { margin: 0; background: #FFFFFF; color: ${c.ink}; font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.35; -webkit-text-size-adjust: 100%; }
header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16pt; padding-bottom: 10pt; margin-bottom: 6pt; border-bottom: 2pt solid ${c.accent}; }
h1 { margin: 0; color: ${c.accentInk}; font-size: 20pt; font-weight: 700; }
.scope { margin: 3pt 0 0; color: ${c.muted}; font-size: 10.5pt; }
.summary { text-align: right; }
.summary span { display: block; }
.summary .label { color: ${c.muted}; font-size: 9pt; }
.summary .figure { color: ${c.accentInk}; font-size: 18pt; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; }
.row { display: flex; border-bottom: 0.5pt solid ${c.line}; page-break-inside: avoid; break-inside: avoid; }
.row > div { min-width: 0; padding: 5pt 6pt; overflow-wrap: anywhere; word-break: break-word; }
.keep { page-break-inside: avoid; break-inside: avoid; }
.date { width: 15%; color: ${c.muted}; }
.name { width: 31%; font-weight: 600; }
.kind { width: 15%; color: ${c.muted}; }
.amount { width: 17%; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
.from { width: 22%; color: ${c.muted}; }
.heading { width: 61%; }
.columns { border-bottom: 0.75pt solid ${c.line}; }
.columns > div { padding-top: 8pt; color: ${c.muted}; font-size: 8.5pt; font-weight: 600; }
.month { border-bottom: 0.75pt solid ${c.ink}; font-size: 10.5pt; font-weight: 700; }
.month > div { padding-top: 12pt; }
.month .amount { color: ${c.muted}; font-weight: 600; }
footer { margin-top: 16pt; color: ${c.muted}; font-size: 8.5pt; }
</style>
</head>
<body>
<header>
<div><h1>${escapeHtml(w.title)}</h1><p class="scope">${escapeHtml(w.scope)}</p></div>
<div class="summary"><span class="label">${escapeHtml(w.total)}</span><span class="figure">${escapeHtml(o.money(total))}</span></div>
</header>
${columns}
${months.join('\n')}
<footer>${escapeHtml(w.made)}</footer>
</body>
</html>
`;
}

const FILE_KIND: Record<ExportKind, string> = {
  all: 'payments',
  bill: 'bills',
  subscription: 'subscriptions',
};

/** skip-payments-2026.csv, skip-bills-2026.pdf, skip-subscriptions-all-years.csv */
export function exportFileName(o: {
  kind: ExportKind;
  year: number | 'all';
  ext: 'csv' | 'pdf';
}): string {
  return `skip-${FILE_KIND[o.kind]}-${o.year === 'all' ? 'all-years' : o.year}.${o.ext}`;
}
