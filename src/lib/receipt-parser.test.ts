import {
  parseDate,
  parseLast4,
  parseMerchant,
  parseReceipt,
  parseTotal,
} from '@/lib/receipt-parser';
import {
  parseMerchantFromLines,
  parseReceiptFromLines,
  parseTotalFromLines,
  type ParsedLine,
} from '@/lib/receipt-parser';

/** Shaped the way Vision actually returns text: one line per recognised row. */
const WALMART = `Walmart
Save money. Live better.
1701 W Broadway
Columbia MO 65203
(573) 445-2828

GV WHT BREAD      1.28
BANANAS           2.14
MILK 2% GAL       3.49

SUBTOTAL          6.91
TAX 1             0.57
TOTAL             7.48

VISA  ************1122
APPROVED
08/26/2026  14:22`;

const TIM_HORTONS = `TIM HORTONS #4021
2 LARGE COFFEE            4.58
1 BOSTON CREAM            1.79
SUBTOTAL                  6.37
HST                       0.83
TOTAL DUE                 7.20
DEBIT ending in 4417
26 Aug 2026`;

/** Label and figure on separate lines, which column layouts produce. */
const SPLIT_COLUMNS = `Trader Joe's
ORGANIC EGGS   5.49
SUBTOTAL
5.49
TOTAL
5.49
2026-08-24`;

describe('parseTotal', () => {
  it('prefers the labelled total over the largest number', () => {
    expect(parseTotal(WALMART)).toBe(7.48);
  });

  it('ignores subtotal and tax lines', () => {
    expect(parseTotal(TIM_HORTONS)).toBe(7.2);
  });

  it('reads a figure printed on the line after its label', () => {
    expect(parseTotal(SPLIT_COLUMNS)).toBe(5.49);
  });

  it('takes the last labelled total when a receipt repeats it', () => {
    expect(parseTotal('TOTAL 10.00\nCARD COPY\nTOTAL 10.00')).toBe(10);
  });

  it('falls back to the largest amount when nothing is labelled', () => {
    expect(parseTotal('ITEM A 3.00\nITEM B 12.50')).toBe(12.5);
  });

  it('handles thousands separators', () => {
    expect(parseTotal('TOTAL 1,249.99')).toBe(1249.99);
  });

  it('returns undefined when there is no money at all', () => {
    expect(parseTotal('THANK YOU FOR SHOPPING')).toBeUndefined();
  });
});

describe('parseDate', () => {
  it('reads US slash dates as month first', () => {
    expect(parseDate('08/26/2026')).toBe('2026-08-26');
  });

  it('flips to day-first when the first number cannot be a month', () => {
    expect(parseDate('26/08/2026')).toBe('2026-08-26');
  });

  it('reads ISO dates', () => {
    expect(parseDate('2026-08-24')).toBe('2026-08-24');
  });

  it('reads "26 Aug 2026"', () => {
    expect(parseDate('26 Aug 2026')).toBe('2026-08-26');
  });

  it('reads "Aug 26, 2026"', () => {
    expect(parseDate('Aug 26, 2026')).toBe('2026-08-26');
  });

  it('expands two-digit years', () => {
    expect(parseDate('08/26/26')).toBe('2026-08-26');
  });

  it('rejects a date too far in the future to be a purchase', () => {
    expect(parseDate('08/26/2099')).toBeUndefined();
  });

  it('returns undefined when there is no date', () => {
    expect(parseDate('TOTAL 7.48')).toBeUndefined();
  });
});

describe('parseLast4', () => {
  it('reads masked digits', () => {
    expect(parseLast4('VISA ************1122')).toBe('1122');
  });

  it('reads "ending in"', () => {
    expect(parseLast4('DEBIT ending in 4417')).toBe('4417');
  });

  it('reads digits following a network name', () => {
    expect(parseLast4('MASTERCARD 8890')).toBe('8890');
  });

  it('refuses a bare four-digit run', () => {
    // A store number is not a card, and a wrong card is worse than none.
    expect(parseLast4('STORE 4021\nTOTAL 7.20')).toBeUndefined();
  });
});

describe('parseMerchant', () => {
  it('takes the shop name from the top', () => {
    expect(parseMerchant(WALMART)).toBe('Walmart');
  });

  it('skips address and phone lines', () => {
    expect(parseMerchant('123 Main Street\n(573) 445-2828\nAldi')).toBe('Aldi');
  });

  it('returns undefined when nothing looks like a name', () => {
    expect(parseMerchant('12345\n99.99')).toBeUndefined();
  });
});

describe('parseReceipt', () => {
  it('reads a whole supermarket receipt', () => {
    expect(parseReceipt(WALMART)).toEqual({
      merchant: 'Walmart',
      total: 7.48,
      date: '2026-08-26',
      last4: '1122',
    });
  });

  it('reads a coffee shop receipt', () => {
    expect(parseReceipt(TIM_HORTONS)).toEqual({
      merchant: 'TIM HORTONS #4021',
      total: 7.2,
      date: '2026-08-26',
      last4: '4417',
    });
  });

  it('leaves every field undefined rather than guessing from noise', () => {
    expect(parseReceipt('~~~~\n####')).toEqual({
      merchant: undefined,
      total: undefined,
      date: undefined,
      last4: undefined,
    });
  });
});

/* ------------------------------------------------------------------ *
 * Layout-aware parsing
 * ------------------------------------------------------------------ */

/** Builds a positioned line; only the fields a test cares about are given. */
function line(text: string, y: number, options: Partial<ParsedLine> = {}): ParsedLine {
  return { text, x: 0.05, y, width: 0.4, height: 0.02, ...options };
}

describe('parseMerchantFromLines', () => {
  it('takes the largest line at the top, not the first one', () => {
    // A slogan is printed above the name on plenty of receipts.
    const lines = [
      line('Welcome to', 0.02),
      line('LOBLAWS', 0.06, { height: 0.05 }),
      line('1000 Yonge Street', 0.12),
    ];
    expect(parseMerchantFromLines(lines)).toBe('LOBLAWS');
  });

  it('falls back to the topmost line when nothing is set larger', () => {
    const lines = [
      line('Jean Coutu', 0.03),
      line('Pharmacie', 0.07),
      line('450 Rue Principale', 0.11),
    ];
    expect(parseMerchantFromLines(lines)).toBe('Jean Coutu');
  });

  it('skips store numbers, phone numbers and addresses', () => {
    const lines = [
      line('Store #1482', 0.02, { height: 0.05 }),
      line('(573) 445-2828', 0.05, { height: 0.05 }),
      line('COSTCO WHOLESALE', 0.09, { height: 0.04 }),
    ];
    expect(parseMerchantFromLines(lines)).toBe('COSTCO WHOLESALE');
  });

  it('ignores anything below the top of the page', () => {
    expect(parseMerchantFromLines([line('TOTAL', 0.8, { height: 0.09 })])).toBeUndefined();
  });
});

describe('parseTotalFromLines', () => {
  it('pairs the label with the money on its own row', () => {
    // The two-column case: reading order would hand back the subtotal.
    const lines = [
      line('SUBTOTAL', 0.6),
      line('6.91', 0.6, { x: 0.7 }),
      line('TAX', 0.64),
      line('0.57', 0.64, { x: 0.7 }),
      line('TOTAL', 0.68),
      line('7.48', 0.68, { x: 0.7 }),
    ];
    expect(parseTotalFromLines(lines)).toBe(7.48);
  });

  it('never reads a subtotal or a tax line as the total', () => {
    const lines = [
      line('SUB-TOTAL', 0.6),
      line('99.99', 0.6, { x: 0.7 }),
      line('TOTAL DUE', 0.68),
      line('12.00', 0.68, { x: 0.7 }),
    ];
    expect(parseTotalFromLines(lines)).toBe(12);
  });

  it('takes the last total when a card footer repeats it', () => {
    const lines = [
      line('TOTAL', 0.6),
      line('42.00', 0.6, { x: 0.7 }),
      line('VISA TOTAL', 0.9),
      line('42.00', 0.9, { x: 0.7 }),
    ];
    expect(parseTotalFromLines(lines)).toBe(42);
  });

  it('falls back to the largest amount when nothing is labelled', () => {
    const lines = [line('BREAD 1.28', 0.4), line('MILK 3.49', 0.45)];
    expect(parseTotalFromLines(lines)).toBe(3.49);
  });
});

describe('parseReceiptFromLines', () => {
  it('reads store, total, date and card from a positioned receipt', () => {
    const lines = [
      line('WALMART', 0.04, { height: 0.05 }),
      line('1701 W Broadway', 0.1),
      line('SUBTOTAL', 0.6),
      line('6.91', 0.6, { x: 0.7 }),
      line('TOTAL', 0.66),
      line('7.48', 0.66, { x: 0.7 }),
      line('VISA ************1122', 0.8),
      line('08/26/2026 14:22', 0.9),
    ];

    expect(parseReceiptFromLines(lines)).toEqual({
      merchant: 'WALMART',
      total: 7.48,
      date: '2026-08-26',
      last4: '1122',
    });
  });

  it('falls back to flat parsing when there is no layout', () => {
    expect(parseReceiptFromLines([])).toEqual(parseReceipt(''));
  });
});
