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
    // The store number is not part of the shop's name ("#4021" made it match no catalogue brand).
    expect(parseReceipt(TIM_HORTONS)).toEqual({
      merchant: 'TIM HORTONS',
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

function line(text: string, y: number, options: Partial<ParsedLine> = {}): ParsedLine {
  return { text, x: 0.05, y, width: 0.4, height: 0.02, ...options };
}

describe('parseMerchantFromLines', () => {
  it('takes the largest line at the top, not the first one', () => {
    // A slogan is printed above the name on many receipts.
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
    // Two-column layout: reading order would hand back the subtotal.
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

// Quebec receipts, shaped the way Vision returns them. Every figure is hand-checked: items sum to the
// subtotal, TPS is 5 % and TVQ 9,975 % of the taxable part, each rounded half up to the cent.

/** Grocery: bare item prices, one weighed item, taxes on the chips only (4,49 × 5 % = 0,2245). */
const METRO = `METRO
Metro Plus Côte-des-Neiges
5150 ch. de la Côte-des-Neiges
Montréal (Québec) H3T 1X8
514 555-0142
LAIT 2% 2L QUÉBON          5,79
PAIN TRANCHÉ POM           3,99
BANANES
1,124 kg @ 1,74 $/kg       1,96
FROMAGE CHEDDAR FORT      11,49
CROUSTILLES LAY'S 235G     4,49 TP
2 @ 3,49
JUS D'ORANGE TROP 1,54L    6,98
SOUS-TOTAL                34,70
TPS 5 %                    0,22
TVQ 9,975 %                0,45
TOTAL                     35,37 $
DÉBIT INTERAC             35,37 $
COMPTE ************7731
2026-10-04 17:48
TOTAL DES ÉCONOMIES        2,50 $
MERCI DE VOTRE VISITE`;

/** The bill as the restaurant prints it: no "$" anywhere, so only the labels make figures money. */
const BISTRO_BILL = `Bistro Le Lévêque
1030 av. Laurier O.
Outremont (Québec) H2V 2K8
TPS : 123456789 RT0001
TVQ : 1234567890 TQ0001
Table 12      Serveur : Julie
2 Moules frites            52,00
1 Tartare de saumon        24,50
1 Verre de vin rouge       13,00
Sous-total                 89,50
TPS 5 %                     4,48
TVQ 9,975 %                 8,93
Total                     102,91
Pourboire non inclus
2026-10-04 20:17`;

/** The card slip for that bill: 15 % tip on 102,91 is 15,4365, so 15,44. */
const BISTRO_SLIP = `ACHAT
MONTANT                102,91 $
POURBOIRE               15,44 $
TOTAL                  118,35 $
VISA ************4417
APPROUVÉ - MERCI`;

/** Pharmacy that repeats its taxes under the total, each on a line that says "TOTAL". */
const JEAN_COUTU = `JEAN COUTU
Pharmacie no 123
1234 rue Sainte-Catherine O.
Montréal QC H3B 1A7
ADVIL LIQUI-GELS 40        14,99 $ T
TYLENOL EXTRA FORT 100     12,49 $ T
GOMME ECLIPSE               2,29 $ T
SOUS-TOTAL                 29,77 $
TPS 5 %                     1,49 $
TVQ 9,975 %                 2,97 $
TOTAL                      34,23 $
MASTERCARD                 34,23 $
************2290
SOMMAIRE DES TAXES
TOTAL TPS                   1,49 $
TOTAL TVQ                   2,97 $
2026-10-05 11:06`;

/** Thousands grouped by a space: 2 654,48 × 9,975 % = 264,78438. */
const BIG_TICKET = `BEST BUY
Téléviseur OLED 65 po    2 499,99 $
Support mural              149,99 $
Écofrais                     4,50 $
SOUS-TOTAL               2 654,48 $
TPS 5 %                    132,72 $
TVQ 9,975 %                264,78 $
TOTAL                    3 051,98 $`;

describe('parseTotal on Canadian-French receipts', () => {
  it('reads a grocery receipt, and a line of savings under the total is not the total', () => {
    expect(parseReceipt(METRO)).toEqual({
      merchant: 'METRO',
      total: 35.37,
      date: '2026-10-04',
      last4: '7731',
    });
  });

  it('reads a restaurant bill printed without "$" from its Total line, not TPS or TVQ', () => {
    expect(parseTotal(BISTRO_BILL)).toBe(102.91);
  });

  it('reads the card slip with the tip as the amount charged', () => {
    expect(parseTotal(BISTRO_SLIP)).toBe(118.35);
  });

  it('never takes the TPS or TVQ repeated on a "TOTAL" line under the total', () => {
    expect(parseTotal(JEAN_COUTU)).toBe(34.23);
  });

  it.each([
    ['a space', ' '],
    ['a no-break space', '\u00A0'],
    ['a narrow no-break space', '\u202F'],
  ])('reads thousands grouped by %s', (_name, separator) => {
    const receipt = BIG_TICKET.replace(/(\d) (\d{3},)/g, `$1${separator}$2`).replace(
      /,(\d{2}) \$/g,
      `,$1${separator}$`,
    );
    expect(parseTotal(receipt)).toBe(3051.98);
  });

  it.each([
    ['a space', '12,99 $'],
    ['nothing', '12,99$'],
    ['a no-break space', '12,99\u00A0$'],
    ['a narrow no-break space', '12,99\u202F$'],
  ])('reads a figure anywhere when "$" follows it after %s', (_name, figure) => {
    expect(parseTotal(`FROMAGE ${figure}`)).toBe(12.99);
  });

  it('reads a figure on the line after its label', () => {
    const receipt =
      'Fruiterie 440\nFRAISES 5,49 $\nBLEUETS 6,99 $\nSOUS-TOTAL\n12,48\nTOTAL\n12,48';
    expect(parseTotal(receipt)).toBe(12.48);
  });

  it('reads "À payer" and "Montant dû" as the total, the way "Amount due" is', () => {
    expect(parseTotal('AMOUNT DUE 34.98\nCASH 40.00\nCHANGE 5.02')).toBe(34.98);
    expect(parseTotal('MONTANT DÛ 34,98 $\nCOMPTANT 40,00 $\nMONNAIE 5,02 $')).toBe(34.98);
    expect(parseTotal('SOLDE DÛ 34,98\nCOMPTANT 40,00 $')).toBe(34.98);
    expect(parseTotal('À PAYER 102,91\nCOMPTANT 120,00 $')).toBe(102.91);
  });

  it('reads the labels however the accents came through', () => {
    for (const label of ['À payer', 'A PAYER', 'A\u0300 payer', 'Total à payer', 'MONTANT DU']) {
      expect(parseTotal(`${label} 102,91\nCOMPTANT 120,00 $`)).toBe(102.91);
    }
  });

  it('does not read "montant du pourboire" (the tip) as the total', () => {
    expect(parseTotal('TOTAL 50,00 $\nMONTANT DU POURBOIRE 7,50 $')).toBe(50);
  });

  it.each([
    'SOUS-TOTAL 29,77 $',
    'Sous total 29,77 $',
    'TOTAL AVANT TAXES 29,77 $',
    'TOTAL PARTIEL 29,77 $',
    'TOTAL TPS 1,49 $',
    'TOTAL TVQ 2,97 $',
    'TOTAL TPS/TVH 1,49 $',
    'TOTAL DES TAXES 4,46 $',
    'TOTAL POURBOIRE 5,00 $',
    'TOTAL RABAIS 3,00 $',
  ])('never reads "%s" as the total', (notTotal) => {
    expect(parseTotal(`TOTAL 34,23 $\n${notTotal}`)).toBe(34.23);
  });

  it('reads a card slip that only says "MONTANT" as its largest amount', () => {
    expect(parseTotal('ACHAT\nMONTANT 48,87\nAPPROUVÉ')).toBe(48.87);
  });

  it('reads money printed after a time or a date, not glued to it', () => {
    expect(parseTotal('2026-10-06 15:42 123,45 $')).toBe(123.45);
    expect(parseTotal('06/10/26 123,45 $')).toBe(123.45);
  });
});

describe('parseTotal never guesses a comma figure', () => {
  it('keeps three digits after a comma as thousands, never as cents', () => {
    expect(parseTotal('TOTAL 1,299 $')).toBeUndefined();
    expect(parseTotal('TOTAL 1,299')).toBeUndefined();
    expect(parseTotal('TOTAL 12,999 $')).toBeUndefined();
  });

  it('does not read a tax rate as money', () => {
    expect(parseTotal('TVQ 9,975 %')).toBeUndefined();
  });

  it('ignores a comma figure with no "$" and no money label', () => {
    expect(parseTotal('PAIN TRANCHÉ 3,99\nLAIT 2 % 5,79')).toBeUndefined();
  });

  it('needs the label to be the whole label, not a count or a unit price beside it', () => {
    expect(parseTotal('TOTAL QTY 2,50')).toBeUndefined();
    expect(parseTotal('TOTAL 2 @ 2,50')).toBeUndefined();
    expect(parseTotal('TOTAL\nPAIN 5,49')).toBeUndefined();
  });

  it('reads at most one space between the figure and its "$"', () => {
    expect(parseTotal('FROMAGE 12,99  $')).toBeUndefined();
  });
});

/** An English receipt full of comma look-alikes: bin codes, a unit price, a seat list, points. */
const HARDWARE = `ACE HARDWARE
BIN A1,23
WOOD SCREWS 2,50 ea
HINGE A1,23 $4.99
2 @ 2,50 $ 5.00
SEAT 12,14 $45
1,299 REWARD POINTS
SUBTOTAL 9.99
TAX 0.83
TOTAL 10.82
CASH 20.00
CHANGE 9.18`;

describe('English receipts read exactly as before', () => {
  it('takes the labelled total past every comma look-alike', () => {
    expect(parseReceipt(HARDWARE)).toEqual({
      merchant: 'ACE HARDWARE',
      total: 10.82,
      date: undefined,
      last4: undefined,
    });
  });

  it('finds no phantom amount when only look-alikes carry a comma', () => {
    expect(
      parseTotal('BIN A1,23\nWOOD SCREWS 2,50 ea\nSEAT 12,14 $45\n1,299 REWARD POINTS'),
    ).toBeUndefined();
  });

  it('works the total out when nothing is labelled, rather than taking the cash handed over', () => {
    // Was 20 (the CASH line, the largest figure). Subtotal plus tax and cash minus change both
    // come to 10.82, the amount actually charged.
    expect(parseTotal(HARDWARE.replace('TOTAL 10.82\n', ''))).toBe(10.82);
  });

  it('reads a line with a dot amount only by its dot amounts', () => {
    expect(parseTotal('TOTAL 2,50 $ 5.00')).toBe(5);
    expect(parseTotal('TOTAL 5.00 (2,50 $ EA)')).toBe(5);
    expect(parseTotal('TOTAL 1,234.56')).toBe(1234.56);
  });

  it('never lets an English label vouch for a comma figure', () => {
    expect(parseTotal('VISA TOTAL\n2,50')).toBeUndefined();
    expect(parseTotal('TOTAL DUE 2,50')).toBeUndefined();
    expect(parseTotal('AMOUNT DUE 2,50')).toBeUndefined();
    expect(parseTotal('TOTAL 2,50 ea')).toBeUndefined();
  });

  it('reads the same positioned, with look-alikes in their own column', () => {
    const lines = HARDWARE.split('\n').flatMap((text, index) => {
      const y = 0.05 + index * 0.04;
      const [, label, figure] = text.match(/^(.*?)\s+(\S+)$/) ?? [];
      return label ? [line(label, y), line(figure, y, { x: 0.7 })] : [line(text, y)];
    });
    expect(parseTotalFromLines(lines)).toBe(10.82);
  });
});

describe('parseTotalFromLines on Canadian-French receipts', () => {
  it('pairs French labels with the bare figure on their row', () => {
    const lines = [
      line('Sous-total', 0.6),
      line('89,50', 0.6, { x: 0.7 }),
      line('TPS 5 %', 0.63),
      line('4,48', 0.63, { x: 0.7 }),
      line('TVQ 9,975 %', 0.66),
      line('8,93', 0.66, { x: 0.7 }),
      line('Total', 0.69),
      line('102,91', 0.69, { x: 0.7 }),
    ];
    expect(parseTotalFromLines(lines)).toBe(102.91);
  });

  it('never reads the TPS or TVQ rows under the total', () => {
    const lines = [
      line('TOTAL', 0.6),
      line('34,23 $', 0.6, { x: 0.7 }),
      line('TOTAL TPS', 0.7),
      line('1,49 $', 0.7, { x: 0.7 }),
      line('TOTAL TVQ', 0.73),
      line('2,97', 0.73, { x: 0.7 }),
    ];
    expect(parseTotalFromLines(lines)).toBe(34.23);
  });

  it('takes a bare figure on the next row when it is the whole row', () => {
    const lines = [
      line('À PAYER', 0.6),
      line('102,91', 0.63, { x: 0.7 }),
      line('COMPTANT', 0.7),
      line('120,00 $', 0.7, { x: 0.7 }),
    ];
    expect(parseTotalFromLines(lines)).toBe(102.91);
  });

  it('takes a bare figure beside or below a label only when it stands alone', () => {
    const beside = [line('TOTAL', 0.6), line('2 @ 2,50', 0.6, { x: 0.5 })];
    expect(parseTotalFromLines(beside)).toBeUndefined();

    const sharing = [line('TOTAL', 0.6), line('3,99', 0.63, { x: 0.7 }), line('PAIN', 0.632)];
    expect(parseTotalFromLines(sharing)).toBeUndefined();

    const further = [line('TOTAL', 0.6), line('MERCI', 0.63), line('3,99', 0.7, { x: 0.7 })];
    expect(parseTotalFromLines(further)).toBeUndefined();
  });

  it('ignores bare figures with no label, and takes the largest "$" figure', () => {
    expect(parseTotalFromLines([line('PAIN 3,99', 0.4), line('LAIT 5,79', 0.45)])).toBeUndefined();
    expect(parseTotalFromLines([line('PAIN 3,99 $', 0.4), line('LAIT 5,79 $', 0.45)])).toBe(5.79);
  });

  it('reads a whole positioned grocery receipt', () => {
    const lines = [
      line('METRO', 0.03, { height: 0.05 }),
      line('Montréal (Québec) H3T 1X8', 0.1),
      line('FROMAGE CHEDDAR FORT', 0.4),
      line('11,49', 0.4, { x: 0.7 }),
      line('SOUS-TOTAL', 0.6),
      line('34,70', 0.6, { x: 0.7 }),
      line('TOTAL', 0.68),
      line('35,37 $', 0.68, { x: 0.7 }),
      line('COMPTE ************7731', 0.8),
      line('2026-10-04 17:48', 0.85),
      line('TOTAL DES ÉCONOMIES', 0.9),
      line('2,50 $', 0.9, { x: 0.7 }),
    ];
    expect(parseReceiptFromLines(lines)).toEqual({
      merchant: 'METRO',
      total: 35.37,
      date: '2026-10-04',
      last4: '7731',
    });
  });
});
