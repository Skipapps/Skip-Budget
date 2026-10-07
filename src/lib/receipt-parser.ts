/**
 * Pulls the four things a receipt form needs out of recognised text: the shop, the amount charged,
 * the purchase date and the card's last four digits. Every field is a judgement, so each is returned
 * only when the evidence clears a bar: a blank field beats a confident wrong one, for money above all.
 *
 * Both entry points run one engine. `parseReceiptFromLines` reads Vision's positioned observations
 * (print size tells a shop name from its address; a label owns the amount on its row);
 * `parseReceipt` reads plain text, one row per line.
 */

export type ParsedReceipt = {
  merchant?: string;
  total?: number;
  /** yyyy-mm-dd */
  date?: string;
  last4?: string;
};

export type ParsedLine = {
  text: string;
  candidates?: string[];
  confidence?: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** A catalogue entry a printed name can be matched to (the app's BrandRow fits). */
export type BrandHint = { name: string; aliases?: string[] | null; domain?: string | null };

export type ParseOptions = {
  /** Known shops: a header or footer line naming one returns the catalogue's spelling. */
  brands?: readonly BrandHint[];
  /** "Now", for refusing future dates and choosing between two readings. Defaults to the clock. */
  today?: Date;
  /** How the phone's region writes dates; used only when the receipt itself does not tell. */
  dayFirst?: boolean;
};

// =============================================================================================
// Text
// =============================================================================================

// Each look-alike and the Latin letter it shows, position for position.
const LOOKALIKE_FROM = 'АВЕКМНОРСТХУІЈЅӀавекмнорстхуіјѕԁӏΑΒΕΖΗΙΚΜΝΟΡΤΥΧοĐđ';
const LOOKALIKE_TO = 'ABEKMHOPCTXYIJSIaBekMHopcTxyijsdlABEZHIKMNOPTYXoDd';
const LOOKALIKES = new Map([...LOOKALIKE_FROM].map((c, i) => [c, LOOKALIKE_TO[i]]));
const LOOKALIKE = /[\u0391-\u03c9\u0400-\u052f\u0110\u0111]/g;
const SLASHED = /[\u00d8\u00f8]/g;

/** Vision sometimes answers Latin capitals with Cyrillic or Greek twins ("РЕMEX", "ВР"). */
function latin(text: string): string {
  return (
    text
      .replace(LOOKALIKE, (c) => LOOKALIKES.get(c) ?? c)
      // Thermal printers slash their zeros: beside a digit "Ø" is 0, elsewhere the letter O.
      .replace(SLASHED, (_c, at: number, all: string) =>
        /\d/.test(all[at - 1] ?? '') || /\d/.test(all[at + 1] ?? '') ? '0' : 'O',
      )
  );
}

const ACCENTED = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ';
const UNACCENTED = 'aaaaaaceeeeiiiinooooouuuuyy';
const PLAIN = new Map([...ACCENTED].map((c, i) => [c, UNACCENTED[i]]));

/**
 * Lower case without accents, so "À PAYER", "à payer" and "A PAYER" read alike. Labels are matched
 * on folded text because JavaScript's \b treats "À" as a non-letter and tills drop accents unevenly.
 */
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00e0-\u00ff]/g, (c) => PLAIN.get(c) ?? c);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// =============================================================================================
// Rows: Vision's observations put back into printed lines
// =============================================================================================

type Cell = { text: string; alts: string[]; x: number; y: number; w: number; h: number };

type Row = {
  /** Left to right. A label and its amount are usually two observations on one row. */
  cells: Cell[];
  /** The cells joined two spaces apart, so figures in neighbouring cells never run together. */
  text: string;
  folded: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** The tallest cell: a name printed large is a single observation. */
  height: number;
};

type Page = {
  rows: Row[];
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** The usual print size, against which a big name stands out. */
  body: number;
  /** Plain text has no geometry: size and position say nothing. */
  flat: boolean;
  /** Shows £ or VAT, so British postcodes are looked for. */
  uk: boolean;
};

const BRITISH = /£|\bvat\b|\bgbp\b/;

/** Prices: what sits in a receipt's right-hand column. */
const PRICE_CELL = /^[-$£€]?\s?\d{1,6}[.,]\d{2}\b/;

/**
 * A photo stored sideways (an iPhone portrait shot carries EXIF 6) and read without honouring the
 * flag comes back with every line tall and narrow. Turned upright here so rows and sizes mean what
 * they do on a straight page. Which way to turn: the one that puts the prices on the right.
 */
function upright(cells: Cell[]): Cell[] {
  const long = cells.filter((cell) => cell.text.length >= 5);
  const tall = long.filter((cell) => cell.h > cell.w).length;
  if (long.length < 3 || tall < long.length * 0.6) return cells;

  const turn = (cell: Cell, clockwise: boolean): Cell =>
    clockwise
      ? { ...cell, x: 1 - cell.y - cell.h, y: cell.x, w: cell.h, h: cell.w }
      : { ...cell, x: cell.y, y: 1 - cell.x - cell.w, w: cell.h, h: cell.w };
  const turned = cells.map((cell) => turn(cell, true));

  let prices = 0;
  let priceCount = 0;
  let others = 0;
  let otherCount = 0;
  for (const cell of turned) {
    const centre = cell.x + cell.w / 2;
    if (PRICE_CELL.test(cell.text)) {
      prices += centre;
      priceCount += 1;
    } else {
      others += centre;
      otherCount += 1;
    }
  }
  const pricesRight = !priceCount || !otherCount || prices / priceCount >= others / otherCount;
  return pricesRight ? turned : cells.map((cell) => turn(cell, false));
}

/**
 * A photo taken a few degrees off square tilts every row, and a label and its price (far apart on
 * the row) then land on different rows. Each price votes for the slopes that would line it up with
 * a label to its left; the slope most prices agree on is the tilt, and cells are levelled by it
 * before rows are formed. Only a clear win over "no tilt" counts, so a straight page stays as is.
 */
function level(cells: Cell[]): Cell[] {
  const lone = cells.map((cell) => LONE_FIGURE.test(cell.text.trim()));
  const prices = cells.filter((_cell, i) => lone[i]);
  const labels = cells.filter((_cell, i) => !lone[i]);
  if (prices.length < 4 || labels.length < 4) return cells;

  const centres = labels
    .map((label) => ({ x: label.x + label.w / 2, y: label.y + label.h / 2 }))
    .sort((a, b) => a.y - b.y);
  /** Every slope up to `limit` that lines a price up with a label to its left, sorted. */
  const votesUpTo = (limit: number) => {
    const votes: { slope: number; price: number }[] = [];
    prices.forEach((price, index) => {
      const px = price.x + price.w / 2;
      const py = price.y + price.h / 2;
      let lo = 0;
      let hi = centres.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (centres[mid].y < py - limit) lo = mid + 1;
        else hi = mid;
      }
      for (let i = lo; i < centres.length && centres[i].y <= py + limit; i++) {
        const dx = px - centres[i].x;
        if (dx < 0.1) continue;
        const slope = (py - centres[i].y) / dx;
        if (Math.abs(slope) <= limit) votes.push({ slope, price: index });
      }
    });
    return votes.sort((a, b) => a.slope - b.slope);
  };
  /** The most distinct prices inside any window of slopes `width` wide. */
  const width = 0.008;
  const bestWindow = (votes: { slope: number; price: number }[]) => {
    const counts = new Array<number>(prices.length).fill(0);
    let distinct = 0;
    let best = { support: 0, from: 0, to: 0 };
    for (let hi = 0, lo = 0; hi < votes.length; hi++) {
      if (counts[votes[hi].price]++ === 0) distinct += 1;
      while (votes[hi].slope - votes[lo].slope > width) {
        if (--counts[votes[lo].price] === 0) distinct -= 1;
        lo += 1;
      }
      if (distinct > best.support) best = { support: distinct, from: lo, to: hi };
    }
    return best;
  };

  // A flattened page keeps a slight slope, and one row up or down is itself a slope of a few
  // hundredths: a tilt must pair clearly more prices than the best near-level slope does. When
  // even every price could not, the page is straight enough and the full search is skipped.
  const nearLevel = bestWindow(votesUpTo(0.012)).support;
  const needed = Math.max(nearLevel + Math.max(2, prices.length * 0.15), prices.length * 0.6);
  if (needed > prices.length) return cells;
  const votes = votesUpTo(0.12);
  const best = bestWindow(votes);
  if (best.support < needed) return cells;
  const slope = median(votes.slice(best.from, best.to + 1).map((v) => v.slope));
  const middle = cells.reduce((sum, cell) => sum + cell.x + cell.w / 2, 0) / cells.length;
  // A tilted line's box is taller by its run times the slope; without that a long name on a
  // tilted photo looks like a drawn logo.
  return cells.map((cell) => {
    const centre = cell.y + cell.h / 2 - slope * (cell.x + cell.w / 2 - middle);
    const h = Math.max(cell.h - Math.abs(slope) * cell.w, cell.h * 0.4);
    return { ...cell, y: centre - h / 2, h };
  });
}

function overlapsHorizontally(a: Cell, b: Cell): boolean {
  const shared = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  return shared > Math.min(a.w, b.w) * 0.3;
}

function makeRow(cells: Cell[]): Row {
  const sorted = [...cells].sort((a, b) => a.x - b.x);
  const text = sorted.map((cell) => cell.text).join('  ');
  return {
    cells: sorted,
    text,
    folded: fold(text),
    top: Math.min(...sorted.map((cell) => cell.y)),
    bottom: Math.max(...sorted.map((cell) => cell.y + cell.h)),
    left: Math.min(...sorted.map((cell) => cell.x)),
    right: Math.max(...sorted.map((cell) => cell.x + cell.w)),
    height: Math.max(...sorted.map((cell) => cell.h)),
  };
}

/**
 * Reading order: cells sorted by their vertical centre and gathered into rows by how closely the
 * centres agree. Two cells that overlap sideways are stacked lines, never one row.
 */
/**
 * No receipt line is anywhere near this long; a runaway reading (a 50,000-digit line) would
 * otherwise cost seconds in the figure scans.
 */
const MAX_LINE = 300;
const MAX_LINES = 2000;

/** Text from outside, which may be missing or not a string at all. */
function clip(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, MAX_LINE) : '';
}

function pageFromLines(lines: readonly ParsedLine[] | undefined | null): Page {
  const raw: Cell[] = [];
  for (const line of (Array.isArray(lines) ? lines : []).slice(0, MAX_LINES)) {
    if (!line || typeof line !== 'object') continue;
    const text = latin(clip(line.text)).trim();
    const box = [line.x, line.y, line.width, line.height];
    if (!text || !box.every(Number.isFinite)) continue;
    const candidates: unknown[] = Array.isArray(line.candidates) ? line.candidates : [];
    const alts = candidates
      .map((candidate) => latin(clip(candidate)).trim())
      .filter((candidate) => candidate && candidate !== text);
    raw.push({
      text,
      alts,
      x: line.x,
      y: line.y,
      w: Math.max(line.width, 0),
      h: Math.max(line.height, 1e-6),
    });
  }
  const cells = level(upright(raw)).sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));

  const groups: { cells: Cell[]; centre: number; height: number }[] = [];
  for (const cell of cells) {
    const centre = cell.y + cell.h / 2;
    let best = -1;
    let bestGap = Infinity;
    for (let i = groups.length - 1; i >= 0 && i >= groups.length - 4; i--) {
      const group = groups[i];
      const gap = Math.abs(centre - group.centre);
      if (gap > Math.max(cell.h, group.height) * 0.5) continue;
      if (group.cells.some((other) => overlapsHorizontally(other, cell))) continue;
      if (gap < bestGap) {
        best = i;
        bestGap = gap;
      }
    }
    if (best < 0) {
      groups.push({ cells: [cell], centre, height: cell.h });
    } else {
      const group = groups[best];
      group.cells.push(cell);
      group.centre = group.cells.reduce((sum, c) => sum + c.y + c.h / 2, 0) / group.cells.length;
      group.height = median(group.cells.map((c) => c.h));
    }
  }

  const rows = groups
    .map((group) => makeRow(group.cells))
    .sort((a, b) => a.top + a.bottom - (b.top + b.bottom));
  const sized = cells.filter((cell) => cell.text.length >= 3);
  return {
    rows,
    top: rows.length ? Math.min(...rows.map((row) => row.top)) : 0,
    bottom: rows.length ? Math.max(...rows.map((row) => row.bottom)) : 1,
    left: rows.length ? Math.min(...rows.map((row) => row.left)) : 0,
    right: rows.length ? Math.max(...rows.map((row) => row.right)) : 1,
    body: median((sized.length ? sized : cells).map((cell) => cell.h)),
    flat: false,
    uk: rows.some((row) => BRITISH.test(row.folded)),
  };
}

function pageFromText(text: string | undefined | null): Page {
  const rows: Row[] = [];
  const lines = (typeof text === 'string' ? text : '').split('\n').slice(0, MAX_LINES);
  lines.forEach((line, index) => {
    const trimmed = latin(clip(line)).trim();
    if (!trimmed) return;
    const cell: Cell = { text: trimmed, alts: [], x: 0, y: index, w: 1, h: 0.5 };
    rows.push(makeRow([cell]));
  });
  return {
    rows,
    top: 0,
    bottom: Math.max(1, rows.length ? rows[rows.length - 1].bottom : 1),
    left: 0,
    right: 1,
    body: 0.5,
    flat: true,
    uk: rows.some((row) => BRITISH.test(row.folded)),
  };
}

// =============================================================================================
// Money
// =============================================================================================

/**
 * Integer cents built from the printed digits; the dollars are only formed at the very end. A weak
 * reading is glued to letters; `stuck` means the letters are a whole total label ("A PAGAR260.79").
 */
type Reading = { cents: number; weak: boolean; stuck?: boolean; negative?: boolean };

/** "-24.99", "-$24.99", "$-24.99" or "24.99-": a credit (refund, discount), never a charge. */
function negativeAt(text: string, start: number, end: number): boolean {
  return /-[ $£€]{0,2}$/.test(text.slice(Math.max(0, start - 3), start)) || text[end] === '-';
}

const STUCK_LABEL = /(total|totals|pagar|payer|pay|due|du|amount|importe|montant|solde|balance)$/;
const stuckTo = (text: string, index: number) =>
  STUCK_LABEL.test(fold(text.slice(Math.max(0, index - 8), index)));

/** A till receipt for a million or more in any of the five currencies is a misreading. */
const MAX_CENTS = 100_000_000;

/** 1,234.56 / 1234.56 / 12.34. Grouped by commas or not grouped at all, cents required. */
const DOT_FIGURE = /(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)/g;

/**
 * Comma-decimal money as Quebec prints it: "12,99 $", "1 234,56 $" (grouped by a space, U+00A0 or
 * U+202F). Exactly two decimals with no digit or decimal after, so "1,299" stays a thousand and
 * "9,975 %" a tax rate.
 */
const COMMA_FIGURE = /(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+),(\d{2})(?!\d|[.,]\d)/g;
const DOLLAR_AFTER = /^[ \u00a0\u202f]?\$(?![ \u00a0\u202f]?\d)/;
const DOLLAR_BEFORE = /\$[ \u00a0\u202f]?$/;
/** A cell holding nothing but a figure and its currency. */
const LONE_FIGURE =
  /^[-(]?(?:[$£€][ \u00a0\u202f]?)?(?:\d{1,3}(?:[ \u00a0\u202f,]\d{3})+|\d+)[.,]\d{2}[ \u00a0\u202f]?(?:[$£€)]|[a-z]{3})?[ *]?[a-z]?$/i;
const CURRENCY_MARK = /^(?:[$£€]|usd|cad|aud|gbp|mxn|eur|[.•·:*=_-]+)$/i;

function centsOf(whole: string, decimals: string): number {
  return Number(whole.replace(/\D/g, '')) * 100 + Number(decimals);
}

/**
 * What precedes a figure decides whether it is one: glued to a digit it is the tail of a longer
 * number, after a run of masks it is card digits ("XXX643022.83", "#14400.72"), glued to a letter it
 * may be a currency sign or a label Vision ran into the amount ("TOTALS2,561.43", "E40.17"), which
 * is worth a look but never trusted alone.
 */
function before(text: string, index: number): 'ok' | 'glued' | 'reject' {
  const c1 = text[index - 1];
  if (c1 === undefined) return 'ok';
  const c2 = text[index - 2] ?? '';
  if (/\d/.test(c1)) return 'reject';
  if ((c1 === '.' || c1 === ',') && /\d/.test(c2)) return 'reject';
  if (c1 === '*' || c1 === '#') return 'reject';
  if ((c1 === 'X' || c1 === 'x') && /[xX*#]/.test(c2)) return 'reject';
  if (/[a-z\u00c0-\u024f]/i.test(c1)) return 'glued';
  return 'ok';
}

/** Comma figures may follow punctuation, but not a number and one mark ("15:42 123,45"). */
function commaStart(text: string, index: number): 'ok' | 'glued' | 'reject' {
  if (index === 0) return 'ok';
  const c1 = text[index - 1];
  if (/\s/.test(c1)) return 'ok';
  if (/[a-z\u00c0-\u024f]/i.test(c1)) return 'glued';
  if (/[\d,.]/.test(c1)) return 'reject';
  return index < 2 || !/\d/.test(text[index - 2]) ? 'ok' : 'reject';
}

/**
 * The amounts in one cell, in order. A cell with a dot-decimal figure is read by that alone, so no
 * comma look-alike on an English line adds a figure. A comma figure counts when "$" touches it
 * (before or after) or when `bare` says the row's label makes it money.
 */
function readCell(text: string, bare: boolean, dollarBefore = false): Reading[] {
  const dotted: Reading[] = [];
  const dot = new RegExp(DOT_FIGURE);
  for (let match = dot.exec(text); match; match = dot.exec(text)) {
    const context = before(text, match.index);
    const whole = match[1];
    // Money has no leading zero and at most six ungrouped digits; "09150.24" is a code.
    if (context === 'reject' || /^0\d/.test(whole) || (!whole.includes(',') && whole.length > 6)) {
      dot.lastIndex = match.index + 1;
      continue;
    }
    const cents = centsOf(whole, match[2]);
    if (cents >= MAX_CENTS) continue;
    const glued = context === 'glued';
    const negative = negativeAt(text, match.index, match.index + match[0].length);
    dotted.push({ cents, weak: glued, stuck: glued && stuckTo(text, match.index), negative });
  }
  if (dotted.length) return dotted;

  const found: Reading[] = [];
  const comma = new RegExp(COMMA_FIGURE);
  for (let match = comma.exec(text); match; match = comma.exec(text)) {
    const context = commaStart(text, match.index);
    if (context === 'reject') {
      comma.lastIndex = match.index + 1;
      continue;
    }
    const end = match.index + match[0].length;
    const dollar =
      DOLLAR_AFTER.test(text.slice(end)) ||
      DOLLAR_BEFORE.test(text.slice(Math.max(0, match.index - 2), match.index)) ||
      (dollarBefore && found.length === 0 && /^[\s]*$/.test(text.slice(0, match.index)));
    if (!dollar && !bare) continue;
    const cents = centsOf(match[1], match[2]);
    if (cents >= MAX_CENTS) continue;
    const glued = context === 'glued';
    const negative = negativeAt(text, match.index, end);
    found.push({ cents, weak: glued, stuck: glued && stuckTo(text, match.index), negative });
  }
  return found;
}

// Letters Vision gives for digits, and the digit each stands for.
const DIGIT_LIKE_FROM = 'OoDQIl|SBZ';
const DIGIT_LIKE_TO = '0000111582';
const REPAIRABLE = /([0-9OoDQIl|SBZ]{1,7})([.,])([0-9OoDQIl|SBZ]{2})(?![0-9A-Za-z])/g;

/**
 * Figures Vision half-read as letters ("TOTABO,17" for TOTAL 80,17). Only ever a tie-breaker that
 * the receipt's own arithmetic has to confirm.
 */
function repaired(text: string): number[] {
  const out: number[] = [];
  const pattern = new RegExp(REPAIRABLE);
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const digits = (part: string) =>
      [...part].map((c) => DIGIT_LIKE_TO[DIGIT_LIKE_FROM.indexOf(c)] ?? c).join('');
    const whole = digits(match[1]);
    if (!/\d/.test(match[0]) || whole.length > 6) continue;
    const cents = centsOf(whole, digits(match[3]));
    if (cents > 0 && cents < MAX_CENTS) out.push(cents);
  }
  return out;
}

// Labels, matched on folded text.

/** Rows that carry money but never the charge, whatever else they say. */
const SKIP =
  /\b(agree|accepte|acepto|sugg\w*|sugerid\w*|savings?|saved|economies|ahorr\w*|points?|puntos|item count|items? sold|total items|\d+ items?|articles|articulos|qty|quantity|cantidad|cash ?back|rate|taux|tasa|previous|anterior|available|avail|disponible|ledger|eligible|elegible|admissible|guide|(?:card|gift card|new|remaining|account|points|rewards|loyalty|stored value) bal\w*|bal\w* (?:remaining|left|restant)|nouveau solde|solde restant|saldo (?:restante|disponible))\b/;
const SUBTOTAL = /\bsub[ -]*total\b|\bsous[ -]*total\b|\btotal partiel\b|\bavant taxes?\b|^sub\b/;
const TOTAL_INCLUDING = /^(grand )?total\b.*\b(inc|incl|including|includes|inclus|incluido)\b/;
const TAX =
  /\b(tax|taxes|sales tax|gst|hst|pst|qst|vat|tps|tvq|tvh|iva|ieps|impuestos?|taxe)\b|\b(gst|vat|tax|iva)incl/;
const TAX_INCLUDED = /\b(incl\w*|inc|inclus\w*|incluid\w*)\b|\b(gst|vat|tax|iva)incl/;
const TIP = /\b(tip|tips|gratuity|gratuities|pourboire|propina|service|servicio)\b/;
const TIP_ONLY = /\b(tip|tips|gratuity|gratuities|pourboire|propina)\b/;
/** Charges added between the subtotal and the total. */
const FEE =
  /\b(fees?|frais|cargos?|comision|envio|delivery|livraison|surcharge|deposit|consigne|ecofrais|eco fee)\b/;
const DISCOUNT = /\b(discount|descuento|rabais|remise|escompte|coupon|promo|promotion|reduction)\b/;
const CHANGE = /\b(change|monnaie|rendu|cambio|vuelto)\b/;
const CASH = /\b(cash|comptant|especes|efectivo|tendered|recibido)\b/;
/** A cash machine's amount: the charge, though "cash" is in the label. */
const WITHDRAWAL = /\b(withdrawal|retrait|retiro|disposicion)\b/;
/** The account an Australian or Canadian debit card drew on: its line carries the charge. */
const ACCOUNT = /\b(cheque|chq)\b/;
/** "PAYMENT 20.00" with no card named: money handed over, which the change line comes back from. */
const PAYMENT = /\b(payment|paiement|pago)\b/;
const TOTAL =
  /\b(total|totals|grand total|balance|due|amount|saleamount|montant|solde|a payer|to pay|paid|importe|a pagar|monto|purchase|achat)\b/;
const TENDER =
  /\b(visa|mastercard|master card|mc|amex|american express|discover|debit|debito|credit|credito|interac|eftpos|contactless|sans contact|tap|carte|card|tarjeta|tend|apple pay|google pay|paypal|jcb|diners)\b/;

/**
 * The whole label, figures and rates aside, that lets a comma figure without "$" count as money. It
 * must be the entire label, or one side of a bilingual "TOTAL DUE / TOTAL À PAYER": "TOTAL QTY 2,50"
 * or "TOTAL 2 @ 2,50" could be a count or a unit price.
 */
const FR_MONEY_LABEL =
  /^(grand total|total( (a payer|du))?|sous-? ?total|montant( (total|du|a payer))?|solde( (du|a payer))?|a payer|tps|tvq|tvh|pourboire|comptant|monnaie|argent comptant)$/;

const RATE = /\d+(?:[.,]\d+)? ?%/g;

/** A row's words with its figures, rates and currency marks taken out, from folded text. */
function labelOf(folded: string): string {
  return (
    folded
      .replace(RATE, ' ')
      .replace(DOT_FIGURE, ' ')
      .replace(COMMA_FIGURE, ' ')
      .replace(/[$£€:]|\.{2,}|[•·]+/g, ' ')
      // A digit inside a word of letters is a misread letter: "T0TAL" is TOTAL, "CA5H" is CASH.
      .replace(/\b[a-z0-9]*[a-z][a-z0-9]*\b/g, (word) =>
        /[a-z].*[a-z]/.test(word)
          ? word.replace(/0/g, 'o').replace(/5/g, 's').replace(/1/g, 'l')
          : word,
      )
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function isFrenchMoneyLabel(label: string): boolean {
  const cleaned = label.replace(/\b(usd|cad|aud|gbp|mxn)\b/g, '').trim();
  return cleaned
    .split('/')
    .map((part) => part.replace(/[.]+$/, '').trim())
    .some((part) => FR_MONEY_LABEL.test(part));
}

type Kind =
  | 'total'
  | 'tender'
  | 'cash'
  | 'change'
  | 'subtotal'
  | 'tax'
  | 'taxinfo'
  | 'tip'
  | 'fee'
  | 'discount'
  | 'skip'
  | 'none';

function kindOf(label: string): Kind {
  if (!/[a-z]/.test(label)) return 'none';
  if (ACCOUNT.test(label)) return 'tender';
  if (SKIP.test(label)) return 'skip';
  if (SUBTOTAL.test(label)) return 'subtotal';
  if (TAX.test(label) && !TOTAL_INCLUDING.test(label)) {
    return TAX_INCLUDED.test(label) ? 'taxinfo' : 'tax';
  }
  if (TIP.test(label)) return 'tip';
  if (DISCOUNT.test(label)) return 'discount';
  if (FEE.test(label)) return 'fee';
  if (CHANGE.test(label)) return 'change';
  if (WITHDRAWAL.test(label)) return 'total';
  if (CASH.test(label)) return 'cash';
  if (TOTAL.test(label)) return 'total';
  if (TENDER.test(label)) return 'tender';
  if (PAYMENT.test(label)) return 'cash';
  return 'none';
}

type MoneyRow = {
  kind: Kind;
  /** May bare comma figures on this row be money? */
  frenchLabel: boolean;
  /** Every cell is a figure or a currency mark. */
  lone: boolean;
  readings: Reading[];
};

function isLoneCell(cell: Cell): boolean {
  return LONE_FIGURE.test(cell.text.trim()) || CURRENCY_MARK.test(cell.text.trim());
}

/** Figures on a row, read cell by cell; a "$" that Vision returned as its own cell marks the next. */
function rowReadings(row: Row, bareLabel: boolean, bareLone: boolean): Reading[] {
  const out: Reading[] = [];
  let dollar = false;
  for (const cell of row.cells) {
    const trimmed = cell.text.trim();
    if (trimmed === '$') {
      dollar = true;
      continue;
    }
    const lone = LONE_FIGURE.test(trimmed);
    // A one-cell row ("Total 102,91" as plain text) is its own label.
    const bare =
      (lone && bareLone) ||
      (row.cells.length === 1 &&
        bareLabel &&
        /\d,\d{2}/.test(trimmed) &&
        isFrenchMoneyLabel(labelOf(fold(trimmed))));
    out.push(...readCell(cell.text, bare, dollar));
    dollar = false;
  }
  return out;
}

/** Every reading a row could hold: Vision's other candidates, glued and half-read figures. */
function alternatives(row: Row): number[] {
  const out = new Set<number>();
  const cells = row.cells;
  for (const [index, cell] of cells.entries()) {
    for (const text of [cell.text, ...cell.alts]) {
      for (const reading of readCell(text, true)) out.add(reading.cents);
      for (const cents of repaired(text)) out.add(cents);
    }
    // "$183" and "28" read as two cells: the decimal point was lost between them.
    const next = cells[index + 1];
    const whole = cell.text.match(/(?:^|[\s$£€])(\d{1,6})$/);
    if (next && whole && /^\d{2}$/.test(next.text.trim())) {
      out.add(centsOf(whole[1], next.text.trim()));
    }
  }
  return [...out];
}

/** A figure the receipt's arithmetic produces, and the rows it was built from. */
type Derived = { cents: number; source: 'sum' | 'cash' | 'card'; rows: number[] };

/**
 * The amount charged. A row labelled as the total (in English, French or Spanish, or "AMOUNT",
 * "PAID", "BALANCE TO PAY"...) wins, and the last such row with a figure wins over earlier ones:
 * after a printed tip the second TOTAL is the charge; with the tip left blank, the last figure is
 * the pre-tip total. The receipt's own arithmetic then checks it: subtotal plus taxes and tip, cash
 * minus change, the amount on the card line. When the labelled figure fails the check, another
 * reading of that row that passes it, or two independent sums that agree, replace it.
 */
function readTotal(page: Page): number | undefined {
  const { rows } = page;
  const commaMode = rows.some(
    (row) =>
      /\b(tps|tvq|tvh|sous-? ?total|montant|a payer|pourboire|comptant|monnaie|solde)\b/.test(
        row.folded,
      ) || /\d,\d{2} ?\$/.test(row.text),
  );

  const money: MoneyRow[] = rows.map((row) => {
    const label = labelOf(row.folded);
    const kind = kindOf(label);
    const labelled = kind !== 'none' && kind !== 'skip';
    const frenchLabel = labelled && isFrenchMoneyLabel(label);
    const lone = row.cells.every(isLoneCell);
    return {
      kind,
      frenchLabel,
      lone,
      readings: rowReadings(row, true, labelled && !lone && (frenchLabel || commaMode)),
    };
  });

  // A label with nothing on its row owns a figure standing alone on the next row.
  for (let i = 0; i < money.length - 1; i++) {
    const row = money[i];
    const next = money[i + 1];
    if (row.kind === 'none' || row.kind === 'skip' || row.readings.length) continue;
    if (!next.lone || next.kind !== 'none') continue;
    const readings = rowReadings(rows[i + 1], false, row.frenchLabel || commaMode);
    if (!readings.length) continue;
    row.readings = readings;
    next.kind = 'skip';
    next.readings = [];
  }

  const strong = (row: MoneyRow) => row.readings.filter((reading) => !reading.weak);
  // A zero is never the charge ("BALANCE DUE 0.00" once the card has paid), nor a credit; a
  // discount is printed as a credit and counts by its size.
  const last = (row: MoneyRow) => {
    const found = strong(row).filter(
      (reading) => reading.cents > 0 && (!reading.negative || row.kind === 'discount'),
    );
    return found.length ? found[found.length - 1].cents : undefined;
  };

  // A refund slip prints its total as a credit: filing it as a purchase would be wrong.
  const refund = money.some(
    (row) =>
      row.kind === 'total' &&
      strong(row).some((reading) => reading.negative) &&
      !strong(row).some((reading) => !reading.negative && reading.cents > 0),
  );
  if (refund) return undefined;

  let chosen = -1;
  for (let i = 0; i < money.length; i++) {
    if (money[i].kind === 'total' && last(money[i]) !== undefined) chosen = i;
  }
  const labelled = chosen >= 0 ? last(money[chosen]) : undefined;

  // A tip printed after the last readable total, on a slip that goes on to a total or signature
  // line, is added to it (that line was left for the post-tip sum). A total line after the tip
  // that holds figures nobody could read (a handwritten amount) leaves the charge unknown: the
  // pre-tip figure would be a confident wrong answer.
  let tipAfter = 0;
  let tipLine = false;
  let closed = false;
  let unreadable = false;
  for (let i = chosen + 1; chosen >= 0 && i < money.length; i++) {
    const { folded, text } = rows[i];
    // A suggested tip ("TIP 18% = 7.78", "TIP GUIDE") is advice, not money added.
    const suggestion = /%|\bguide\b|\bsugg/.test(folded);
    if (money[i].kind === 'tip' && TIP_ONLY.test(folded) && !/\bincl/.test(folded) && !suggestion) {
      tipLine = true;
      tipAfter += last(money[i]) ?? 0;
    } else if (
      tipLine &&
      (money[i].kind === 'total' || /\b(signature|firma|signez|sign)\b/.test(folded))
    ) {
      closed = true;
      if (money[i].kind === 'total' && /\d/.test(text)) unreadable = true;
    }
  }
  if (labelled !== undefined && tipAfter > 0 && closed) {
    // A "tip" above half the bill is a misread figure (a handwritten total on the tip line).
    return tipAfter * 2 <= labelled ? (labelled + tipAfter) / 100 : undefined;
  }
  if (unreadable) return undefined;

  // The receipt's arithmetic. The subtotal is the last one above the chosen total, else the first
  // one anywhere (an item line can carry a total-like label above the real subtotal).
  const derived: Derived[] = [];
  let subtotalAt = -1;
  for (let i = 0; i < money.length; i++) {
    if (money[i].kind !== 'subtotal' || last(money[i]) === undefined) continue;
    if (chosen < 0 || i < chosen || subtotalAt < 0) subtotalAt = i;
    if (chosen >= 0 && i > chosen) break;
  }
  if (subtotalAt >= 0) {
    let end = chosen > subtotalAt ? chosen : money.length;
    if (end === money.length) {
      for (let i = subtotalAt + 1; i < money.length; i++) {
        if (money[i].kind === 'total' && last(money[i]) !== undefined) {
          end = i;
          break;
        }
      }
    }
    let tips = 0;
    let taxes = 0;
    const used = [subtotalAt];
    for (let i = subtotalAt + 1; i < end; i++) {
      const value = last(money[i]);
      const { kind } = money[i];
      if (value === undefined) continue;
      if (kind === 'tax') taxes += value;
      if (kind === 'tip' || kind === 'fee') tips += value;
      if (kind === 'discount') tips -= value;
      if (kind === 'tax' || kind === 'tip' || kind === 'fee' || kind === 'discount') used.push(i);
    }
    const sum = last(money[subtotalAt])! + tips;
    derived.push({ cents: sum + taxes, source: 'sum', rows: used });
    // Where prices include tax (VAT, GST included) the tax line is information, not an addition.
    if (taxes) derived.push({ cents: sum, source: 'sum', rows: used });
  }
  let cash: { cents: number; row: number } | undefined;
  for (let i = 0; i < money.length; i++) {
    const { kind } = money[i];
    // Exact cash prints "CHANGE 0.00": a zero that counts.
    const value = kind === 'change' ? strong(money[i]).pop()?.cents : last(money[i]);
    if (value === undefined) continue;
    if (kind === 'cash') cash = { cents: value, row: i };
    if (kind === 'change' && cash !== undefined && cash.cents - value > 0) {
      derived.push({ cents: cash.cents - value, source: 'cash', rows: [cash.row, i] });
    }
    if (kind === 'tender') derived.push({ cents: value, source: 'card', rows: [i] });
  }

  /** Whether the arithmetic gives `cents` without leaning on row `from` itself. */
  const matches = (cents: number, from = -1) =>
    derived.some((d) => d.cents === cents && !d.rows.includes(from));
  const agreed = () => {
    for (const a of derived) {
      if (derived.some((b) => b.source !== a.source && b.cents === a.cents)) return a.cents;
    }
    return undefined;
  };

  // On a tilted or warped photo a label can be paired with its neighbour's figure, so the rows
  // either side are read too; like every other alternative they count only if the sums confirm.
  const confirmedNear = (index: number) =>
    alternatives(rows[index]).find((cents) => matches(cents)) ??
    [index - 1, index + 1]
      .flatMap((i) => (money[i] ? strong(money[i]).map((r) => ({ cents: r.cents, row: i })) : []))
      .find(({ cents, row }) => matches(cents, row))?.cents;
  const subtotal = subtotalAt >= 0 ? last(money[subtotalAt]) : undefined;
  const discounted = money.some((row) => row.kind === 'discount');
  const earlier = money
    .slice(0, Math.max(chosen, 0))
    .filter((row) => row.kind === 'total')
    .map(last)
    .filter((cents): cents is number => cents !== undefined);
  const tipBetween = money.some((row, i) => row.kind === 'tip' && i < chosen);
  // Below its own subtotal with nothing taken off, or below the total printed before a tip
  // (totals only grow), a total is a misread figure.
  const plausible = (cents: number) =>
    (subtotal === undefined || discounted || cents >= subtotal) &&
    !(tipBetween && earlier.some((before) => cents < before));

  const card = derived.filter((d) => d.source === 'card').pop();
  const change = derived.find((d) => d.source === 'cash');

  if (labelled !== undefined) {
    if (!derived.length || matches(labelled)) return labelled / 100;
    const other = confirmedNear(chosen);
    if (other !== undefined) return other / 100;
    const sums = agreed();
    if (sums !== undefined) return sums / 100;
    if (plausible(labelled)) return labelled / 100;
    // After a tip the card line shows the pre-tip sum, so it cannot stand in either.
    if (tipBetween) return undefined;
    return ((card ?? change)?.cents ?? labelled) / 100;
  }

  // No labelled total could be read: a half-read one the arithmetic confirms, then the arithmetic.
  for (let i = money.length - 1; i >= 0; i--) {
    if (money[i].kind !== 'total') continue;
    const other = confirmedNear(i);
    if (other !== undefined) return other / 100;
  }
  const sums = agreed();
  if (sums !== undefined) return sums / 100;
  if (card) return card.cents / 100;
  if (change) return change.cents / 100;
  // A total Vision ran into its whole label ("TOTAL A PAGAR260.79"), when nothing contradicts it.
  for (let i = money.length - 1; i >= 0; i--) {
    if (money[i].kind !== 'total') continue;
    const stuck = money[i].readings.filter((reading) => reading.stuck);
    if (stuck.length) return stuck[stuck.length - 1].cents / 100;
  }

  // Nothing labelled at all: the largest amount, but only when a second row prints the same figure
  // (an item total repeated on a card or summary line); a lone largest figure is as often the cash
  // handed over or a misread as it is the total.
  const seen = new Map<number, number>();
  for (const row of money) {
    if (row.kind === 'cash' || row.kind === 'change' || row.kind === 'skip') continue;
    const figures = new Set(
      strong(row)
        .filter((r) => !r.negative)
        .map((r) => r.cents),
    );
    for (const cents of figures) seen.set(cents, (seen.get(cents) ?? 0) + 1);
  }
  const repeated = [...seen].filter(([cents, rowsWith]) => cents > 0 && rowsWith >= 2);
  return repeated.length ? Math.max(...repeated.map(([cents]) => cents)) / 100 : undefined;
}

// =============================================================================================
// Dates
// =============================================================================================

/** Month names and abbreviations in English, French and Spanish, folded, January first. */
const MONTH_NAMES = [
  'jan january janv janvier ene enero',
  'feb february fev fevr fevrier febrero',
  'mar march mars marzo',
  'apr april avr avril abr abril',
  'may mai mayo',
  'jun june juin junio',
  'jul july juil juillet julio',
  'aug august aout ago agosto',
  'sep sept september septembre septiembre setiembre',
  'oct october octobre octubre',
  'nov november novembre noviembre',
  'dec december decembre dic diciembre',
];
const MONTH_WORDS = new Map(
  MONTH_NAMES.flatMap((names, index) => names.split(' ').map((name) => [name, index + 1] as const)),
);

// Every pattern runs on one row's text and uses literal spaces, never \s: a date never spans rows
// (a line-spanning pattern once read "ABN 94 651" and missed the real "25 Jul 2026").
const YEAR_FIRST = /(^|[^\d])(20\d{2})([-/.])(\d{1,2})\3(\d{1,2})(?!\d)/g;
const DAY_MONTH_NAME =
  /(^|[^\d])(\d{1,2})(?:er|st|nd|rd|th)?[ .\-/]{0,3}(?:de )?([a-z]{3,10})\.?[ .\-/,]{0,3}(?:de )?(\d{4}|\d{2})(?![\d:]|[.,]\d)/g;
const MONTH_NAME_DAY =
  /(^|[^a-z])([a-z]{3,10})\.?[ ]{1,2}(\d{1,2})(?:st|nd|rd|th)?,?[ ]{1,2}(\d{4})(?!\d)/g;
const NUMERIC = /(^|[^\d/.-])(\d{1,2})([/.-])(\d{1,2})\3(\d{4}|\d{2})(?![\d/.-]\d|\d)/g;
const TIME = /\b\d{1,2}[:h] ?\d{2}\b|\b(am|pm)\b/;
const DATE_LABEL = /\b(date|fecha|dated)\b/;
const NOT_PURCHASE =
  /\b(return\w*|retour\w*|devoluci\w*|exchang\w*|exp|expir\w*|vence|vencimiento|valid\w*|before|use by|until|thru|through|hasta|due date|dob|birth\w*|naissance|nacimiento)\b/;

type DateHit = {
  /** One reading, or two for "07/10/2026" with both numbers 12 or below. */
  dayFirst?: string;
  monthFirst?: string;
  only?: string;
  score: number;
};

function daysIn(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function iso(year: number, month: number, day: number): string | undefined {
  const full = year < 100 ? 2000 + year : year;
  if (month < 1 || month > 12 || day < 1 || day > daysIn(full, month)) return undefined;
  return `${full}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function localIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function datesOnRow(folded: string): DateHit[] {
  if (!/\d/.test(folded) || NOT_PURCHASE.test(folded)) return [];
  const score = (DATE_LABEL.test(folded) ? 2 : 0) + (TIME.test(folded) ? 2 : 0);
  const hits: DateHit[] = [];
  const add = (hit: Omit<DateHit, 'score'>) => hits.push({ ...hit, score });

  for (const m of folded.matchAll(YEAR_FIRST)) add({ only: iso(+m[2], +m[4], +m[5]) });
  for (const m of folded.matchAll(DAY_MONTH_NAME)) {
    const month = MONTH_WORDS.get(m[3]);
    if (month) add({ only: iso(+m[4], month, +m[2]) });
  }
  for (const m of folded.matchAll(MONTH_NAME_DAY)) {
    const month = MONTH_WORDS.get(m[2]);
    if (month) add({ only: iso(+m[4], month, +m[3]) });
  }
  for (const m of folded.matchAll(NUMERIC)) {
    const [first, second, year] = [+m[2], +m[4], +m[5]];
    if (first > 12 || second > 12 || first === second) {
      add({ only: first > 12 ? iso(year, second, first) : iso(year, first, second) });
    } else {
      add({ dayFirst: iso(year, second, first), monthFirst: iso(year, first, second) });
    }
  }
  return hits;
}

/** Day first, month first, or contradicting itself. */
type Order = 'day' | 'month' | 'conflict';

const US_STATES =
  'AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|PR|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY';
const US_ADDRESS = new RegExp(`\\b(${US_STATES}),? \\d{5}(?:-\\d{4})?\\b`);
/** Printed only where dates are written day first: the UK, Australia, Mexico, Quebec. */
const STRONG_DAY_FIRST =
  /£|\bgbp\b|\bvat\b|\btax ?invoice\b|\babn\b|\beftpos\b|\baud\b|\bgst incl|\b(nsw|vic|qld|tas|act|wa|sa|nt) \d{4}\b|\br\.? ?f\.? ?c\b|\bc\.? ?p\.? ?\d{5}\b|\bmxn\b|\btps\b|\btvq\b|\(qc\)/;
const STRONG_MONTH_FIRST = /\bsales tax\b|\busd\b/;
/** Spanish and French words: printed by US and Canadian shops too, so they only lean. */
const WEAK_DAY_FIRST =
  /\biva\b|\bfecha\b|\btotal a pagar\b|\bgracias\b|\bsous-? ?total\b|\bmontant\b|\ba payer\b|\bpourboire\b|\bmonnaie\b|\bmerci\b/;

/**
 * How a numeric date whose day and month are both 12 or below is read. Inference order:
 *   1. what the receipt prints that only one side of the world prints: "£", VAT, ABN, EFTPOS, an
 *      Australian state and postcode, RFC, C.P., MXN, TPS, TVQ, "(QC)" mean day first; a US state
 *      and ZIP, sales tax or USD mean month first; both at once is a contradiction, and the date is
 *      left blank;
 *   2. the phone's region (`options.dayFirst`);
 *   3. Spanish or French wording (FECHA, GRACIAS, MERCI, SOUS-TOTAL...), which leans day first;
 *   4. nothing: English Canada prints both orders, so the reading that is not in the future and is
 *      nearest today.
 * A reading after today is dropped. When the side chosen in 1-3 reads as a future day, the date
 * is left blank rather than flipped: the other reading would be a guess. A date printed year first,
 * or with a day above 12, is never ambiguous.
 */
function dateOrder(rows: Row[], options: ParseOptions): Order | undefined {
  const all = rows.map((row) => row.folded).join('\n');
  const raw = rows.map((row) => row.text).join('\n');
  const day = STRONG_DAY_FIRST.test(all);
  const month = US_ADDRESS.test(raw) || STRONG_MONTH_FIRST.test(all);
  if (day && month) return 'conflict';
  if (day || month) return day ? 'day' : 'month';
  if (options.dayFirst !== undefined) return options.dayFirst ? 'day' : 'month';
  return WEAK_DAY_FIRST.test(all) ? 'day' : undefined;
}

function readDate(page: Page, options: ParseOptions): string | undefined {
  const today = options.today ?? new Date();
  const now = localIso(today);
  // A shop in a later time zone can print tomorrow's date, but only an unambiguous one counts.
  const limit = localIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  const usable = (value: string | undefined, last = limit) =>
    value !== undefined && value >= '2000-01-01' && value <= last ? value : undefined;

  let order: Order | undefined | null = null;
  const resolve = () => {
    if (order === null) order = dateOrder(page.rows, options);
    return order;
  };

  let best: { value: string; score: number } | undefined;
  for (const row of page.rows) {
    for (const hit of datesOnRow(row.folded)) {
      let value: string | undefined;
      if (hit.only !== undefined) {
        value = usable(hit.only);
      } else {
        const df = usable(hit.dayFirst, now);
        const mf = usable(hit.monthFirst, now);
        const side = resolve();
        if (side === 'day') value = df;
        else if (side === 'month') value = mf;
        else if (side === undefined) value = df && mf ? (df > mf ? df : mf) : (df ?? mf);
      }
      if (value === undefined) continue;
      if (!best || hit.score > best.score) best = { value, score: hit.score };
    }
  }
  return best?.value;
}

// =============================================================================================
// Card
// =============================================================================================

/**
 * The last four digits of the card used. Masked forms only: a bare four-digit run is never
 * accepted, as receipts are full of them (store numbers, times, totals).
 */
export function parseLast4(input: string): string | undefined {
  const text = typeof input === 'string' ? input : '';
  const masked = text.match(/(?:[*x#•]{2,}\s*|ending\s+(?:in\s+)?|acct\s*#?\s*)(\d{4})\b/i);
  if (masked) return masked[1];

  const afterNetwork = text.match(
    /\b(?:visa|mastercard|master\s*card|amex|american\s+express|discover|debit|credit|interac)\b[^\d\n]{0,12}(\d{4})\b/i,
  );
  return afterNetwork?.[1];
}

// =============================================================================================
// Merchant
// =============================================================================================

const GREETING = /^(welcom\w*( to)?|bienvenue( chez| a| au)?|bienvenid[oa]s?( a| al)?)\b/;

const STREET =
  /\b(street|st|road|rd|avenue|ave|av|boulevard|blvd|boul|bd|drive|dr|lane|ln|way|highway|hwy|parkway|pkwy|place|pl|court|ct|crescent|cres|terrace|tce|parade|pde|square|sq|close|grove|row|plaza|suite|ste|unit|floor|rue|chemin|ch|rang|route|rte|montee|cote|calle|avenida|calzada|calz|carretera|carr|colonia|col|privada|prol|prolongacion|paseo|periferico|circuito|andador|esquina|esq|local|piso|mall|centre|center|market place|retail park)\b/;
const STREET_FIRST =
  /^(av|ave|avenida|calle|calzada|calz|blvd|boul|boulevard|bd|rue|chemin|ch|carretera|paseo|prol|privada|col|colonia)\b/;
// Postcodes allow for letters read in place of digits, but a match needs one real digit:
// otherwise "PHO BAR" or "TAQUERIA EL SOL" reads as one.
const POSTAL = [
  /\b[a-z]{2}\.? \d{5}(?:-\d{4})?\b/, // US state and ZIP
  /\b[a-z][0-9oil][a-z] ?[0-9oil][a-z][0-9oil]\b/, // Canada A1A 1A1
  /\b(nsw|vic|qld|tas|act|wa|sa|nt) \d{4}\b/, // Australia state and postcode
  /\bc\.? ?p\.? ?\d{5}\b/, // Mexico C.P.
  /\((qc|quebec|on|ontario|bc|ab|mb|sk|ns|nb|nl|pe)\)/, // "Montréal (Québec)"
  /\b(ab|bc|mb|nb|nl|ns|nt|nu|on|pe|qc|sk|yt) [a-z0-9]{3} ?[a-z0-9]{3}$/, // a misread postal code
];
/** Only looked for on a British receipt (one showing £ or VAT): the shape is too common. */
const UK_POSTCODE = /\b[a-z]{1,2}[0-9oil][a-z0-9]? [0-9oilbszg][a-z]{2}\b/;
/** "Guadalajara, Jal.", "Monterrey, N.L.", "Toluca. Edo. Mex.", "Ciudad de Mexico, CDMX". */
const CITY_AND_STATE = /, ?([a-z]{1,4}\.? ?){1,3}$|\. ?([a-z]{1,4}\. ?){1,3}$/;
const PHONE_WORD = /\b(tel|telephone|telefono|ph|phone|fax|tlf|whatsapp)\b/;
const PHONE = /\(?\d{2,4}\)?[ .-]?\d{3,4}[ .-]\d{4}\b|\b\d{3}-\d{4}\b/;
const WEB = /www\.|https?:|\.(com|ca|mx|net|org|co\.uk|com\.au|com\.mx)\b|@[a-z0-9-]+\./;
const DATE_OR_TIME =
  /\b\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}\b|\b\d{1,2}[:h]\d{2}\b|\b\d{1,2} ?(am|pm)\b|\b(mon|tue|wed|thu|fri|sat|sun)\b.*\d/;
const TILL_WORD =
  /\b(store|str|magasin|tienda|suc|sucursal|branch|caja|caisse|register|reg|till|lane|trans|tran|transaction|terminal|term|pos|operator|op|cashier|cajero|cajera|caissier|caissiere|server|mesero|mesera|serveur|serveuse|table|mesa|guests|personas|check|cheque|folio|order|orden|pedido|commande|tid|mid|aid|auth|ref|pump|bomba|pompe|clerk|emp|host|kiosk|kiosco|quiosco|borne|st|tr|te|no|num|nro)\b/;
/** A line that starts by naming who served or where: "Server Lucas", "Cajero: ALEX". */
const STAFF =
  /^(server|serveur|serveuse|mesero|mesera|cashier|cajero|cajera|caissier|caissiere|operator|operateur|clerk|host|guests?|table|mesa|check|cheque|order|orden|pedido|commande|billed to|facture a|facturado a)\b/;
const TAX_ID =
  /\b(abn|acn|vat|gst|hst|pst|qst|tps|tvq|tvh|rfc|nif|cif|ein|tax ?id|tax ?no|siret|siren)\b|\br\.? ?f\.? ?c\b|\b(rt|tq)\d{4}\b/;
const PAPERWORK =
  /\b(receipt|invoice|taxinvoice|facture|factura|ticket|recibo|recu|comprobante|copy|copie|copia|duplicate|duplicado|reprint|original|nota de venta|merchant|cardholder|customer|approved|approuve|aprobado|authori[sz]ed|declined|refund|signature|firma|thank|thanks|merci|gracias|welcome|bienvenue|bienvenid\w*|sale|venta|vente|survey|encuesta|volume|unleaded|diesel|orders?|commande|pedido|orden|confirmation|confirmacion|confirmed|summary|resume|resumen|details|detalles|hello|bonjour|hola|dear|transaction|transaccion|releve|record|statement|e-ticket|eat in|dine in|take ?(away|out)|to go|carry ?out|drive ?thru|sur place|a emporter|para llevar|comer aqui|item|description|descripcion|articulo|qty|cant|precio|prix)\b|\bprice\//;
const ITEMISH = /\d[.,]\d{2}\b|\d ?@ ?\d|\b\d+(\.\d+)? ?(kg|lb|lbs|g|ml|l|oz|pk|ct)\b|\d{6,}/;

const MONEY_WORDS = new Set(
  (
    'total totals subtotal sub sous grand amount balance due paid pay payer pagar paye a to du de ' +
    'importe montant solde sale tax taxes gst hst pst qst vat tps tvq tvh iva tip service charge ' +
    'cash change tendered visa mastercard debit credit card eftpos amex interac tarjeta efectivo ' +
    'cambio propina pourboire comptant monnaie inc incl included in net fee fees discount ' +
    'aud cad usd gbp mxn contactless tend withdrawal'
  ).split(' '),
);

/** A drawn logo Vision read as letters: "OIII", "IIIO", "O11I", "11111". */
function isJunk(text: string, letters: number): boolean {
  if (letters < 2) return true;
  const compact = text.replace(/\s+/g, '');
  if (compact.length < 3) return false;
  let strokes = 0;
  for (const c of compact) if ('Il1|!O0o.•·:;-_=~/\\\'"`,'.includes(c)) strokes += 1;
  return strokes >= compact.length * 0.7;
}

function isAddress(folded: string, uk: boolean): boolean {
  const postcode = (pattern: RegExp) => /\d/.test(folded.match(pattern)?.[0] ?? '');
  if (POSTAL.some(postcode) || (uk && postcode(UK_POSTCODE))) return true;
  if (CITY_AND_STATE.test(folded) && /[a-z]{3}/.test(folded)) return true;
  const hasDigit = /\d/.test(folded);
  if (hasDigit && STREET.test(folded)) return true;
  // "BOULEVARD BURGER", "RUE LA LA": a street word starts a shop's name too; an address has a number.
  if (hasDigit && STREET_FIRST.test(folded)) return true;
  // "1701 W Broadway": a house number and words.
  return /^\d{1,5}[a-z]?,? [a-z]/.test(folded) && folded.split(' ').length >= 3;
}

/** Why a header row cannot be the shop's name, if it cannot. */
function excluded(text: string, folded: string, uk = false): string | undefined {
  const letters = (folded.match(/[a-z]/g) ?? []).length;
  if (isJunk(text, letters)) return 'junk';
  if (text.length > 48) return 'long';
  if (isAddress(folded, uk)) return 'address';
  if (PHONE_WORD.test(folded) || PHONE.test(folded)) return 'phone';
  if (WEB.test(folded)) return 'web';
  if (DATE_OR_TIME.test(folded)) return 'date';
  if (/#\s*\d/.test(folded) || (TILL_WORD.test(folded) && /\d/.test(folded))) return 'till';
  if (STAFF.test(folded)) return 'till';
  if (TAX_ID.test(folded)) return 'taxid';
  if (ITEMISH.test(folded)) return 'item';
  if (PAPERWORK.test(folded)) return 'paperwork';
  // Only a line made of money words is a money label: "TOTAL TOOLS" is a shop.
  const label = labelOf(folded);
  const kind = kindOf(label);
  if (kind !== 'none' && kind !== 'skip' && label.split(/[ /]+/).every((w) => MONEY_WORDS.has(w))) {
    return 'money label';
  }
  const digits = (folded.match(/\d/g) ?? []).length;
  if (digits > letters * 0.5) return 'digits';
  return undefined;
}

/**
 * A store number after the name ("TIM HORTONS #4021", "SHELL Store 1234") is dropped before the
 * line is judged. One before it ("#32868 MAYA") marks a cashier or transaction line.
 */
function withoutStoreNumber(text: string): string {
  const stripped = text
    .replace(
      /\s*(?:#|\b(?:store|no\.?|n°|nº|num\.?|suc\.?|sucursal|magasin|tienda|branch)\s*#?)\s*\d+\s*$/i,
      '',
    )
    .trim();
  return /[a-z]{2}/i.test(stripped) ? stripped : text;
}

/** Drops a leading greeting ("WELCOME TO WALMART") by word count, keeping the printed spelling. */
function withoutGreeting(text: string): string {
  const match = fold(text).match(GREETING);
  if (!match) return text;
  const words = match[0].split(' ').length;
  return text
    .split(/\s+/)
    .slice(words)
    .join(' ')
    .replace(/^[\s!,.:-]+/, '');
}

/** "TIM HORTONS #4021" is Tim Hortons: store numbers and stray marks go, real words stay. */
function cleanName(text: string): string {
  return (
    text
      .replace(/\s*#\s*\d+\b/g, ' ')
      .replace(
        /\b(store|no\.?|n°|nº|num\.?|suc\.?|sucursal|magasin|tienda|branch)\s*#?\s*\d+\b/gi,
        ' ',
      )
      .replace(/\(\s*\d+\s*\)/g, ' ')
      .split(/\s+/)
      // A zero inside a word of letters is an O ("0XXO").
      .map((word) =>
        /^[0-9A-Za-z]+$/.test(word) && /[A-Za-z]{2}/.test(word) ? word.replace(/0/g, 'O') : word,
      )
      .join(' ')
      .replace(/^[\s\-–—:;,.*=_~|]+|(?:[\s\-–—:;,*=_~|]|\.{2,})+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

type Candidate = {
  index: number;
  text: string;
  score: number;
  size: number;
  centre: number;
  letters: number;
  /** A lone letter ("W" of "BIG" / "W"): never a name alone, only the end of one. */
  fragment: boolean;
};

const CONNECTOR_END = /(^|\s)(&|and|et|y|de|del|la|le|les|the|of|du|des)$/i;
const CONNECTOR_START = /^(&|and|et|y|de|del|la|le|les|of|du|des)(\s|$)/i;

/**
 * The name printed at the top. Rows above the first priced line are scored by size against the
 * usual print, how early they come, centring and capitals; addresses, phones, web addresses, dates,
 * till and tax-id lines, prices and paperwork words never qualify. A row printed after the address
 * is seldom the name (it is how a logo-only receipt looks), so it loses most of its score.
 */
function headerCandidates(page: Page): Candidate[] {
  const { rows } = page;
  const span = Math.max(page.bottom - page.top, 1e-6);
  const width = Math.max(page.right - page.left, 1e-6);
  const candidates: Candidate[] = [];
  let addressSeen = false;
  let eligible = 0;
  const judge = (raw: string) => {
    const text = withoutStoreNumber(withoutGreeting(raw));
    return { text, why: text ? excluded(text, fold(text), page.uk) : 'empty' };
  };

  for (let index = 0; index < rows.length && index < 14; index++) {
    const row = rows[index];
    if (!page.flat && index >= 4 && (row.top - page.top) / span > 0.45) break;
    if (/\d[.,]\d{2}\b/.test(row.text) && !DATE_OR_TIME.test(row.folded)) break;

    let cells = row.cells;
    let { text, why } = judge(row.text);
    if (why === 'address') addressSeen = true;
    if (why && cells.length > 1) {
      // A name can share its row with "RECEIPT" or the date (a digital receipt's header): the
      // cells are judged one by one and those that could be a name are kept.
      const kept = cells.filter((cell) => !judge(cell.text).why);
      if (kept.length) {
        cells = kept;
        ({ text, why } = judge(kept.map((cell) => cell.text).join(' ')));
      }
    }
    if (!text) continue;
    const folded = fold(text);
    const tallest = Math.max(...cells.map((cell) => cell.h));
    const size = page.body > 0 ? tallest / page.body : 1;
    const middle =
      (Math.min(...cells.map((c) => c.x)) + Math.max(...cells.map((c) => c.x + c.w))) / 2;
    const centre = (middle - page.left) / width;
    const letters = folded.replace(/[^a-z]/g, '');
    if (why === 'junk' && /^[A-Za-z]$/.test(text)) {
      candidates.push({ index, text, score: -Infinity, size, centre, letters: 1, fragment: true });
    }
    if (why) continue;

    const upper = text.replace(/[^A-Z]/g, '').length / Math.max(letters.length, 1);
    const words = text.split(/\s+/).filter(Boolean).length;

    let score = 0;
    if (!page.flat) {
      // Even double-height, double-width print stays under about four times the body text:
      // taller is a drawn logo read as letters ("CHID"), which the size must not vouch for.
      score += size > 4.5 ? -1.5 : 2 * Math.min(Math.max((size - 1.1) / 0.6, 0), 1);
      score += 0.4 * (1 - Math.min(Math.abs(centre - 0.5) * 2, 1));
      // A name follows its address only where there is no name: a logo-only receipt.
      if (addressSeen) score -= 1.5;
    }
    score += [1.2, 0.6, 0.3][eligible] ?? 0;
    score += 0.4 * upper;
    if (words > 4) score -= 0.8 * (words - 4);
    if (/[a-z][.!?] [A-Za-z]/.test(text)) score -= 0.8;
    eligible += 1;
    candidates.push({ index, text, score, size, centre, letters: letters.length, fragment: false });
  }
  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * A name set in two big lines ("THE HOME" / "DEPOT", "DAN" / "MURPHY'S") is read as two rows:
 * neighbours of a similar large size, centred alike, are one name. A dangling "&" or "DE" joins
 * them whatever their size.
 */
function joinSplitName(best: Candidate, all: Candidate[], page: Page): string {
  let text = best.text;
  let top = best;
  let bottom = best;
  for (let pass = 0; pass < 2; pass++) {
    for (const other of all) {
      // A lone letter ends a name ("BIG" / "W"); above one it is an app's icon ("K" over "KFC").
      const above = other.index === top.index - 1 && !other.fragment;
      const below = other.index === bottom.index + 1;
      if (!above && !below) continue;
      const near = above ? top : bottom;
      const ratio = other.size / near.size;
      const sameColumn = page.flat || Math.abs(other.centre - near.centre) < 0.12;
      const big = !page.flat && other.size >= 1.08 && near.size >= 1.08;
      const words = (text + ' ' + other.text).split(/\s+/).length;
      const dangling = above
        ? CONNECTOR_END.test(other.text) || CONNECTOR_START.test(top.text)
        : CONNECTOR_END.test(bottom.text) || CONNECTOR_START.test(other.text);
      const sentence = /[a-z][.!?]( |$)/i.test(other.text) || other.text.split(/\s+/).length > 3;
      if (!sameColumn || ratio < 0.65 || ratio > 1.55 || words > 5 || sentence) continue;
      if (!big && !dangling) continue;
      if (above) {
        text = `${other.text} ${text}`;
        top = other;
      } else {
        text = `${text} ${other.text}`;
        bottom = other;
      }
    }
  }
  return text;
}

/** Sentences that name the shop: thanks, "receipt from", "Merchant:". */
const NAMED_PHRASE =
  "thanks?(?: you)?(?: very much)? for (?:shopping|dining|visiting|choosing|your (?:purchase|visit|business|order)|stopping by|eating)(?: (?:at|with|in|from))?|merci (?:d'avoir|de|davoir) (?:magasine|magasiner|choisi|visite|votre visite)(?: (?:chez|a|au))?|gracias por (?:(?:su|tu) (?:compra|preferencia|visita|pedido)|comprar|preferirnos|elegirnos|visitarnos)(?: (?:en|a))?|(?:your )?(?:receipt|order|purchase) (?:from|at)|votre (?:recu|commande|achat) (?:de|chez)|(?:su |tu )?recibo de|(?:su |tu )?(?:compra|pedido) en|(?:sold by|merchant|store name|seller|vendor|marchand|commercant|vendeur|comercio|establecimiento|vendido por) ?:";
const NAMED = new RegExp(`\\b(?:${NAMED_PHRASE}) (.+)$`);
/** The same sentence with the shop's name wrapped onto the next line. */
const NAMED_WRAPPED = new RegExp(`\\b(?:${NAMED_PHRASE})$`);
const NOT_A_SHOP =
  /^(us|nous|nosotros)\b|^(today|hoy|again|with|at|in|en|chez|a|au)$|^(caisse|paiement|pago|compra|caja|venta|transaction|transaccion|commande|achat|pedido)\b/;
const SENTENCE_END = /( +[$£€]?\d+[.,]\d{2}\b.*)?[!.]*$/;
const LEGAL_SUFFIX =
  /[,\s]+(inc|incorporated|ltd|limited|llc|l\.l\.c|corp|corporation|co|company|companies|plc|pty|pty ltd|ltee|limitee|gmbh|llp|lp|s\.? ?a\.?(?: ?b\.?)?(?: de c\.? ?v\.?)?|s\.? de r\.? ?l\.?(?: de c\.? ?v\.?)?|sab de cv|sa de cv)\.?$/;
/** Words a registered company name wraps around the trading name. */
const CORPORATE =
  /\b(group|groupe|grupo|holdings?|retail|operadora( de)?|restaurantes?|restaurants|cadena comercial|comercial|tiendas|stores|enterprises?|international|operations|trading|services|servicios|distribuidora|corporativo|nueva|de mexico|mexico|canada|australia|usa|uk|us)\b/g;
/** Domain words that name a service, not the shop ("facturacion.com.mx"). */
const GENERIC_DOMAIN =
  /^(www|com|co|net|org|gob|gov|edu|help|support|shop|store|online|app|mail|email|info|contact|portal|clientes?)$|survey|feedback|encuesta|opinion|factur|receipt|tellus|ticket/;

type Clue = { name: string; kind: 'thanks' | 'legal' | 'web' };

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Lines anywhere on the page that name the shop: thanks, the legal entity, the web address. */
function nameClues(page: Page): Clue[] {
  const clues: Clue[] = [];
  for (const [index, row] of page.rows.entries()) {
    const folded = row.folded.replace(/\s+/g, ' ').trim();
    const next = page.rows[index + 1];
    if (next && NAMED_WRAPPED.test(folded) && /( (at|from|in|chez|en|de|a|au)|:)$/.test(folded)) {
      const name = cleanName(next.text);
      const nextFolded = fold(name);
      const why = excluded(name, nextFolded, page.uk);
      if (!NOT_A_SHOP.test(nextFolded) && (!why || why === 'paperwork' || why === 'money label')) {
        clues.push({ name, kind: 'thanks' });
      }
      continue;
    }
    const thanks = folded.match(NAMED);
    if (thanks) {
      // The shop is the tail of the sentence, taken from the printed words to keep its spelling.
      // An amount Vision put on the same row is not part of the name.
      const said = thanks[1].replace(SENTENCE_END, '').trim();
      const tail = said.replace(/( (today|again|hoy|aujourd'hui|soon))+$/, '').trim();
      const count = tail.split(' ').length;
      const words = row.text.replace(/\s+/g, ' ').replace(SENTENCE_END, '').trim().split(' ');
      const start = words.length - said.split(' ').length;
      const original = words.slice(start, start + count).join(' ');
      const name = cleanName(original);
      if (tail && count <= 5 && !NOT_A_SHOP.test(tail) && /[a-z]{2}/i.test(name)) {
        clues.push({ name, kind: 'thanks' });
      }
      continue;
    }
    if (
      LEGAL_SUFFIX.test(folded) &&
      !/\d/.test(folded) &&
      !TOTAL.test(folded) &&
      !TAX.test(folded)
    ) {
      let name = row.text.replace(/\s+/g, ' ').trim();
      for (let i = 0; i < 3 && LEGAL_SUFFIX.test(fold(name)); i++) {
        const cut = fold(name).match(LEGAL_SUFFIX)!;
        name = name.slice(0, name.length - cut[0].length);
      }
      const core = name
        .replace(/\([^)]*\)/g, ' ')
        .split(/\s+/)
        .filter(
          (word) =>
            !fold(word)
              .replace(CORPORATE, '')
              .match(/^[\s,.]*$/) || !word,
        )
        .join(' ');
      const cleaned = cleanName(core.replace(/^(de|of)\s+/i, ''));
      if (/[a-z]{2}/i.test(cleaned)) clues.push({ name: cleaned, kind: 'legal' });
      continue;
    }
    const web = folded.match(
      /(?:www\.)?((?:[a-z0-9-]+\.)+)(?:com|ca|mx|net|org|co\.uk|com\.au|com\.mx|uk|au)\b/,
    );
    if (web) {
      const labels = web[1].split('.').filter(Boolean);
      const label = [...labels].reverse().find((part) => !GENERIC_DOMAIN.test(part));
      if (label && label.length >= 2) clues.push({ name: titleCase(label), kind: 'web' });
    }
  }
  return clues;
}

function squash(text: string): string {
  return fold(text)
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

/** Words, with joining marks dropped so "WAL-MART" and "Walmart" are one word. */
function spaced(text: string): string {
  return ` ${fold(text)
    .replace(/&/g, ' and ')
    .replace(/['’`´.-]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

/**
 * The catalogue's name for a printed one, if any; case, accent, punctuation and space blind. A
 * brand's own name may be the whole line or, from six letters, whole words inside it ("WALMART
 * SUPERCENTER"); a shorter one inside a longer line is too often another business ("CRAVE
 * BURGERS" is not the streaming service). An alias or web domain must be the whole line: aliases
 * name products as often as shops ("office" for Microsoft 365 would take OFFICE DEPOT). The
 * longest match wins, so "Shoppers Drug Mart" is not taken for a shorter brand inside it. One
 * misread letter is forgiven only against a brand name of seven letters or more.
 */
function matchHint(text: string, brands: readonly BrandHint[]): string | undefined {
  const flat = squash(text);
  const words = spaced(text);
  // A single character (a signature "X", a stray letter) never names a shop.
  if (flat.length < 2) return undefined;
  let found: { name: string; length: number } | undefined;
  const take = (name: string, length: number) => {
    if (!found || length > found.length) found = { name, length };
  };
  for (const brand of brands) {
    const key = squash(brand.name);
    if (
      key.length >= 2 &&
      (key === flat || (key.length >= 6 && words.includes(spaced(brand.name))))
    ) {
      take(brand.name, key.length);
    }
    if ((brand.aliases ?? []).some((alias) => squash(alias) === flat))
      take(brand.name, flat.length);
    const domain = brand.domain
      ?.toLowerCase()
      .replace(/^www\./, '')
      .split('.')[0];
    if (domain && squash(domain) === flat) take(brand.name, flat.length);
  }
  if (found || flat.length < 7) return found?.name;
  // One letter misread in a long name ("OFFICE DEPOI"): close enough when the whole line is it.
  return brands.find((brand) => {
    const key = squash(brand.name);
    return key.length >= 7 && withinOneEdit(flat, key);
  })?.name;
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1 || a === b) return a === b;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

function readMerchant(page: Page, options: ParseOptions): string | undefined {
  const candidates = headerCandidates(page);
  const clues = nameClues(page);
  const best = candidates.find((candidate) => !candidate.fragment);
  const header = best ? cleanName(joinSplitName(best, candidates, page)) : undefined;

  // Two letters at body size ("ES") is as likely a stray as a name ("BP"); a clue outranks it.
  const strong = best && best.score >= 1.6 && (best.letters >= 3 || best.size >= 1.3);

  const brands = options.brands;
  if (brands?.length) {
    // The header first. Footer clues and the header's lesser rows only when the header itself is
    // weak: a printed name the catalogue does not know must not give way to a delivery platform's
    // web address ("JOE'S DINER" with "www.doordash.com/joes") or a product line.
    const lines = [
      ...(header ? [header] : []),
      // Vision's other readings of the name, for the letter it may have got wrong.
      ...(best ? page.rows[best.index].cells.flatMap((cell) => cell.alts).map(cleanName) : []),
      ...(strong
        ? []
        : [
            ...clues.map((clue) => clue.name),
            ...candidates
              .filter((candidate) => !candidate.fragment)
              .slice(1, 6)
              .map((candidate) => cleanName(candidate.text)),
          ]),
    ];
    for (const line of lines) {
      const hit = matchHint(line, brands);
      if (hit) return hit;
    }
  }

  const agrees = (clue: Clue) => header !== undefined && squash(header).includes(squash(clue.name));
  if (strong && header) return header;
  const confirmed = clues.find(agrees);
  if (confirmed && header) return header;
  const clue =
    clues.find((c) => c.kind === 'thanks') ?? clues.find((c) => c.kind === 'legal') ?? clues[0];
  if (clue) return clue.name;
  if (best && header && best.score >= 1.0) return header;
  return undefined;
}

// =============================================================================================
// Entry points
// =============================================================================================

function readPage(page: Page, options: ParseOptions = {}): ParsedReceipt {
  return {
    merchant: readMerchant(page, options),
    total: readTotal(page),
    date: readDate(page, options),
    last4: parseLast4(page.rows.map((row) => row.text).join('\n')),
  };
}

/** The receipt from plain text, one row per line. */
export function parseReceipt(text: string, options?: ParseOptions): ParsedReceipt {
  return readPage(pageFromText(text), options);
}

/** The receipt from Vision's positioned lines. */
export function parseReceiptFromLines(lines: ParsedLine[], options?: ParseOptions): ParsedReceipt {
  return readPage(pageFromLines(lines), options);
}

export function parseMerchant(text: string, options: ParseOptions = {}): string | undefined {
  return readMerchant(pageFromText(text), options);
}

export function parseMerchantFromLines(
  lines: ParsedLine[],
  options: ParseOptions = {},
): string | undefined {
  return readMerchant(pageFromLines(lines), options);
}

export function parseTotal(text: string): number | undefined {
  return readTotal(pageFromText(text));
}

export function parseTotalFromLines(lines: ParsedLine[]): number | undefined {
  return readTotal(pageFromLines(lines));
}

export function parseDate(text: string, options: ParseOptions = {}): string | undefined {
  return readDate(pageFromText(text), options);
}
