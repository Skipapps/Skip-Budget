import {
  parseDate,
  parseReceipt,
  parseReceiptFromLines,
  parseTotal,
  type BrandHint,
  type ParsedLine,
} from '@/lib/receipt-parser';
import catalogue from '@/lib/__fixtures__/brand-catalogue.json';

/**
 * One rule per test, on the smallest receipt that shows it. Lines are shaped the way Vision returns
 * them: a label and its amount are separate observations on one row; y is top-down.
 */

const TODAY = new Date(2026, 9, 7, 12);

type Row = string | [label: string, amount: string] | { text: string; size?: number; x?: number };

/** A receipt laid out top to bottom: names centred, labels left, amounts right. */
function layout(rows: Row[], { top = 0.05, pitch = 0.03, body = 0.012 } = {}): ParsedLine[] {
  const lines: ParsedLine[] = [];
  rows.forEach((row, index) => {
    const y = top + index * pitch;
    if (Array.isArray(row)) {
      lines.push({ text: row[0], x: 0.08, y, width: 0.4, height: body });
      lines.push({ text: row[1], x: 0.75, y, width: 0.15, height: body });
    } else if (typeof row === 'string') {
      const width = Math.min(0.9, row.length * 0.02);
      lines.push({ text: row, x: 0.5 - width / 2, y, width, height: body });
    } else {
      const width = Math.min(0.9, row.text.length * 0.02 * (row.size ?? 1));
      const height = body * (row.size ?? 1);
      lines.push({ text: row.text, x: row.x ?? 0.5 - width / 2, y, width, height });
    }
  });
  return lines;
}

const read = (rows: Row[], options: Parameters<typeof parseReceiptFromLines>[1] = {}) =>
  parseReceiptFromLines(layout(rows), { today: TODAY, ...options });

const ITEMS: Row[] = [
  ['MILK 2L', '4.29'],
  ['BREAD', '3.49'],
  ['APPLES', '5.10'],
];

describe('reading order', () => {
  it('pairs a label with the amount Vision returned as its own observation', () => {
    expect(read([...ITEMS, ['SUBTOTAL', '12.88'], ['TOTAL', '12.88']]).total).toBe(12.88);
  });

  it('turns a sideways photo (every line tall and narrow) upright', () => {
    const upright = layout([
      { text: 'COSTCO', size: 2 },
      '3120 Oak St',
      ...ITEMS,
      ['SUBTOTAL', '12.88'],
      ['TAX', '0.64'],
      ['TOTAL', '13.52'],
      'Date: 2026-09-14 10:02',
    ]);
    // Stored the way an iPhone stores a portrait shot: rotated a quarter turn, geometry and all.
    const sideways = upright.map((line) => ({
      ...line,
      x: line.y,
      y: 1 - line.x - line.width,
      width: line.height,
      height: line.width,
    }));
    expect(parseReceiptFromLines(sideways, { today: TODAY })).toEqual(
      parseReceiptFromLines(upright, { today: TODAY }),
    );
    expect(parseReceiptFromLines(sideways, { today: TODAY }).total).toBe(13.52);
  });

  it('levels a tilted photo so each price stays with its label', () => {
    const straight = layout(
      [
        'SHOP',
        ['CHEESE', '11.49'],
        ['PASTA', '2.99'],
        ['SAUCE', '4.19'],
        ['OLIVES', '6.25'],
        ['BREAD', '3.10'],
        ['SUBTOTAL', '28.02'],
        ['TAX', '1.40'],
        ['TOTAL', '29.42'],
        ['CASH', '40.00'],
        ['CHANGE', '10.58'],
      ],
      { pitch: 0.02 },
    );
    // Five degrees off square: the right-hand column sits a row and a half lower than its labels.
    const tilted = straight.map((line) => ({
      ...line,
      y: line.y + (line.x + line.width / 2) * 0.06,
    }));
    expect(parseReceiptFromLines(tilted).total).toBe(29.42);
  });

  it('measures the header against the text block, not the whole photo', () => {
    // A receipt on a table fills a small slice of the frame.
    const lines = layout(['SOBEYS', '4352 Main St', ...ITEMS, ['TOTAL', '12.88']], {
      top: 0.62,
      pitch: 0.012,
      body: 0.005,
    });
    expect(parseReceiptFromLines(lines).merchant).toBe('SOBEYS');
  });
});

describe('merchant: the printed name', () => {
  it('takes the first plain line under the paperwork when everything is one size', () => {
    expect(read(['TAX INVOICE', 'Woolworths', '182 Pacific Hwy', ...ITEMS]).merchant).toBe(
      'Woolworths',
    );
  });

  it('takes a large name under a slogan or a store number', () => {
    expect(
      read(['Save money. Live better.', { text: 'WALMART', size: 2 }, ...ITEMS]).merchant,
    ).toBe('WALMART');
    expect(read(['ABN 85 110 194 901', { text: 'KMART', size: 2.2 }, ...ITEMS]).merchant).toBe(
      'KMART',
    );
  });

  it('reads the name out of a greeting on the same line', () => {
    expect(read(['WELCOME TO OFFICEWORKS', '214 Victoria Rd', ...ITEMS]).merchant).toBe(
      'OFFICEWORKS',
    );
    expect(read(['Bienvenue chez METRO', ...ITEMS]).merchant).toBe('METRO');
  });

  it.each([
    ['English street', '4352 Main St'],
    ['English road', '403 Victoria Rd'],
    ['French street', '8971, ave du Parc'],
    ['French road', '4824, chemin Sainte-Foy'],
    ['French boulevard', '6802, boul. Taschereau'],
    ['Spanish street', 'Calle Hidalgo 469'],
    ['Spanish avenue', 'Av. Revolucion 539'],
    ['Mexican colonia and C.P.', 'Col. Centro C.P. 77635'],
    ['Mexican city and state', 'Guadalajara, Jal.'],
    ['Mexican state with dots', 'Toluca. Edo. Mex.'],
    ['US city, state and ZIP', 'Raleigh, NC 27658'],
    ['Canadian postal code', 'Edmonton AB T8H 8N8'],
    ['Quebec city', 'Montréal (Québec) H3T 1X8'],
    // A UK postcode only on a British receipt: see "still reads a British postcode" below.
    ['Australian state and postcode', 'HOBART TAS 7000'],
  ])('never takes an address line (%s)', (_kind, address) => {
    expect(read([address, ...ITEMS]).merchant).toBeUndefined();
  });

  it.each([
    'Tel: 0113 496 7745',
    '(514) 555-0142',
    'DATE: 17/09/2026 08:40',
    'ST# 0370 OP# 54006940',
    'Store 4880 Till 24 Receipt 92681',
    'SUC. 9331 CAJA 02 CAJERO ALEX',
    'Magasin/Store 4833 Caisse/Reg 13',
    '#32868 MAYA',
    'ABN 94 384 451 959',
    'VAT No. GB 043 0902 61',
    'R.F.C. NCB72255485L',
    'GST/HST 191379215 RT0001',
    'TPS 814282699 RT0001',
    'TVQ 0090539218 TQ0001',
    'TAX INVOICE',
    'CUSTOMER COPY',
    'FACTURE',
    'TICKET: 00057155',
    'THANK YOU',
    'BIENVENIDO',
    '04857533 Greek Yoghurt 1Kg',
    '2 @ 3.49',
  ])('never takes "%s" as the name', (text) => {
    expect(read([text, ...ITEMS]).merchant).toBeUndefined();
  });

  it('never takes a drawn logo read as letters', () => {
    expect(
      read([{ text: 'OIII', size: 4 }, '5749 Highland Ave', ...ITEMS]).merchant,
    ).toBeUndefined();
    expect(read([{ text: 'O11I', size: 4 }, ...ITEMS]).merchant).toBeUndefined();
    // Taller than any till prints text: a graphic, even when it spells a word.
    expect(read([{ text: 'CHID', size: 4.7 }, '13 Main Rd', ...ITEMS]).merchant).toBeUndefined();
  });

  it('reads Cyrillic look-alikes as the Latin letters they show', () => {
    // Cyrillic VE and ER ("ВР"), ER and IE before Latin "MEX" ("РЕMEX").
    const bp = '\u0412\u0420';
    const pemex = '\u0420\u0415MEX';
    expect(read([{ text: bp, size: 2.4 }, '604 High St', ...ITEMS]).merchant).toBe('BP');
    expect(read([{ text: pemex, size: 2 }, ...ITEMS]).merchant).toBe('PEMEX');
  });

  it.each([
    [['THE HOME', 'DEPOT'], 'THE HOME DEPOT'],
    [['DAN', "MURPHY'S"], "DAN MURPHY'S"],
    [['FARMACIAS', 'GUADALAJARA'], 'FARMACIAS GUADALAJARA'],
    [['BIG', 'W'], 'BIG W'],
  ])('joins a name set in two large lines: %j', (parts, name) => {
    const rows: Row[] = [
      'TAX INVOICE',
      { text: parts[0], size: 1.8 },
      { text: parts[1], size: 1.9 },
      '403 Victoria Rd',
      ...ITEMS,
    ];
    expect(read(rows).merchant).toBe(name);
  });

  it('joins two lines at body size only across a dangling "&" or "DE"', () => {
    expect(read(['MARKS &', 'SPENCER', '153 Mill Lane', ...ITEMS]).merchant).toBe(
      'MARKS & SPENCER',
    );
    expect(read(['Jean Coutu', 'Pharmacie', '450 Rue Principale', ...ITEMS]).merchant).toBe(
      'Jean Coutu',
    );
  });

  it('keeps a slogan out of the name', () => {
    const rows: Row[] = [
      { text: 'Ahorra dinero. Vive mejor.', size: 1.6 },
      { text: 'WALMART', size: 1.8 },
    ];
    expect(read([...rows, ...ITEMS]).merchant).toBe('WALMART');
  });

  it('strips store numbers but never real words or numbers in a name', () => {
    expect(read([{ text: 'TIM HORTONS #4021', size: 2 }, ...ITEMS]).merchant).toBe('TIM HORTONS');
    expect(read([{ text: 'SHELL Store 1234', size: 2 }, ...ITEMS]).merchant).toBe('SHELL');
    expect(read([{ text: '7-ELEVEN', size: 2 }, ...ITEMS]).merchant).toBe('7-ELEVEN');
    expect(read([{ text: 'FOREVER 21', size: 2 }, ...ITEMS]).merchant).toBe('FOREVER 21');
  });
});

describe('merchant: clues below the header', () => {
  const LOGO_ONLY: Row[] = ['1094 Lake Blvd', 'Seattle, WA 98185', '(602) 555-0100', ...ITEMS];

  it.each([
    ['Thank you for shopping at Walgreens', 'Walgreens'],
    ['Thanks for shopping at 7-Eleven!', '7-Eleven'],
    ["Merci d'avoir magasiné chez Super C", 'Super C'],
    ['Gracias por su compra en Pemex', 'Pemex'],
    ['Gracias por su compra en 0XXO', 'OXXO'],
    ['www.loblaws.ca', 'Loblaws'],
    ['Shop online: www.bunnings.com.au', 'Bunnings'],
    ["GLORIA JEAN'S COFFEES PTY LTD", "GLORIA JEAN'S COFFEES"],
    ['OPERADORA DE RESTAURANTES TOKS, S.A.', 'TOKS'],
    ['GROUPE JEAN COUTU (PJC) INC.', 'JEAN COUTU'],
    ['CANADIAN TIRE CORPORATION, LIMITED', 'CANADIAN TIRE'],
    ["MACY'S RETAIL HOLDINGS, LLC", "MACY'S"],
    ['Your receipt from Uber Eats', 'Uber Eats'],
    ['Merchant: Corner Bakery', 'Corner Bakery'],
    ['Votre achat chez Pharmaprix', 'Pharmaprix'],
    ['Su compra en Liverpool', 'Liverpool'],
    ['Gracias por tu compra en Coppel', 'Coppel'],
    ['Votre reçu de Pharmaprix', 'Pharmaprix'],
  ])('names a logo-only receipt from "%s"', (clue, name) => {
    expect(read([...LOGO_ONLY, ['TOTAL', '12.88'], clue]).merchant).toBe(name);
  });

  it('leaves an amount Vision put on the thanks row out of the name', () => {
    const rows: Row[] = [...LOGO_ONLY, ["Merci d'avoir magasiné chez Super C", '2,00']];
    expect(read(rows).merchant).toBe('Super C');
  });

  it('abstains when the receipt prints no name anywhere', () => {
    const rows: Row[] = [
      ...LOGO_ONLY,
      ['TOTAL', '12.88'],
      'THANK YOU FOR SHOPPING WITH US',
      'Votre reçu de caisse',
      'facturacion.com.mx',
      'Survey: www.mysurvey.com',
    ];
    expect(read(rows).merchant).toBeUndefined();
  });

  it('abstains on a line that follows the address, which is how a logo-only receipt looks', () => {
    expect(
      read(['546 Brisbane Rd, HOBART TAS 7000', 'PLUS UNLEADED', ...ITEMS]).merchant,
    ).toBeUndefined();
  });

  it('lets a clue outrank two stray letters at the top', () => {
    expect(read(['ES', ...ITEMS, ['TOTAL', '12.88'], 'Survey: www.maxi.ca/survey']).merchant).toBe(
      'Maxi',
    );
  });

  it('keeps the printed header when a clue confirms it', () => {
    expect(read(['Tim Hortons', ...ITEMS, 'www.timhortons.ca']).merchant).toBe('Tim Hortons');
  });
});

describe('merchant: brand hints', () => {
  const BRANDS: BrandHint[] = [
    { name: 'Walmart', aliases: ['wal-mart'], domain: 'walmart.com' },
    { name: 'The Home Depot', aliases: ['home depot'], domain: 'homedepot.com' },
    { name: 'BP', domain: 'bp.com' },
    { name: 'IGA', domain: 'iga.net' },
    { name: 'Réno-Dépôt', domain: 'renodepot.com' },
    { name: 'Loblaws', domain: 'loblaws.ca' },
    { name: 'Shoppers Drug Mart', aliases: ['shoppers'], domain: 'shoppersdrugmart.ca' },
  ];

  it('returns the catalogue spelling for a printed name', () => {
    expect(
      read([{ text: 'WAL-MART SUPERCENTER #1234', size: 2 }, ...ITEMS], { brands: BRANDS })
        .merchant,
    ).toBe('Walmart');
    expect(read([{ text: 'RENO-DEPOT', size: 2 }, ...ITEMS], { brands: BRANDS }).merchant).toBe(
      'Réno-Dépôt',
    );
  });

  it('matches a name split over two lines', () => {
    const rows: Row[] = [{ text: 'THE HOME', size: 1.8 }, { text: 'DEPOT', size: 1.8 }, ...ITEMS];
    expect(read(rows, { brands: BRANDS }).merchant).toBe('The Home Depot');
  });

  it('prefers the longest brand inside a line', () => {
    const rows: Row[] = [{ text: 'SHOPPERS DRUG MART', size: 2 }, ...ITEMS];
    expect(read(rows, { brands: BRANDS }).merchant).toBe('Shoppers Drug Mart');
  });

  it('matches a short name (four letters or fewer) only as the whole line', () => {
    expect(read([{ text: 'bp', size: 2 }, ...ITEMS], { brands: BRANDS }).merchant).toBe('BP');
    expect(read([{ text: 'IGA', size: 2 }, ...ITEMS], { brands: BRANDS }).merchant).toBe('IGA');
    expect(read([{ text: 'BPX FUELS', size: 2 }, ...ITEMS], { brands: BRANDS }).merchant).toBe(
      'BPX FUELS',
    );
  });

  it('finds the brand from a footer web address on a logo-only receipt', () => {
    const rows: Row[] = ['1563 River Rd', 'Fredericton NB E2B 4G4', ...ITEMS, 'www.loblaws.ca'];
    expect(read(rows, { brands: BRANDS }).merchant).toBe('Loblaws');
  });

  it('forgives one misread letter in a long name, and tries the other readings', () => {
    const brands: BrandHint[] = [{ name: 'Office Depot' }, { name: 'Chedraui' }];
    expect(read([{ text: 'OFFICE DEPOI', size: 2 }, ...ITEMS], { brands }).merchant).toBe(
      'Office Depot',
    );
    const lines = layout([{ text: 'CHEDRAUF', size: 2 }, ...ITEMS]);
    lines[0] = { ...lines[0], candidates: ['CHEDRAUF', 'CHEDRAUI'] };
    expect(parseReceiptFromLines(lines, { brands }).merchant).toBe('Chedraui');
    // Short names must match exactly: "BP" is not "BX".
    expect(read([{ text: 'BX', size: 2 }, ...ITEMS], { brands: [{ name: 'BP' }] }).merchant).toBe(
      'BX',
    );
  });

  it('still reads an unknown shop without the catalogue', () => {
    expect(read([{ text: 'FRUITERIE 440', size: 2 }, ...ITEMS], { brands: BRANDS }).merchant).toBe(
      'FRUITERIE 440',
    );
  });
});

describe('dates', () => {
  it('never lets a date pattern run across lines', () => {
    // The old named-month pattern matched "94 651" across the line break and lost the real date.
    expect(parseDate('ABN 94 651\n25 Jul 2026', { today: TODAY })).toBe('2026-07-25');
    expect(parseDate('01\nCURRYS\n193\n22 May 2026', { today: TODAY })).toBe('2026-05-22');
  });

  it.each([
    ['2026-10-06', '2026-10-06'],
    ['2026/07/18', '2026-07-18'],
    ['17-May-2026', '2026-05-17'],
    ['29-Aug-2026 09:34', '2026-08-29'],
    ['DATE: 10 Feb 2026', '2026-02-10'],
    ['06 FEB 2026 - 13:20', '2026-02-06'],
    ['FECHA 28 AGO 2026 HORA: 20:05', '2026-08-28'],
    ['28 de agosto de 2026', '2026-08-28'],
    ['5 ene 2026', '2026-01-05'],
    ['3 dic. 2025', '2025-12-03'],
    ['6 févr. 2026', '2026-02-06'],
    ['9 août 2026', '2026-08-09'],
    ['27 janv. 2026 - 18:47', '2026-01-27'],
    ['15 sept 2026', '2026-09-15'],
    ['Sep 25, 2026', '2026-09-25'],
    ['Apr 06, 2026 - 1:55 PM', '2026-04-06'],
    ['October 2, 2026', '2026-10-02'],
    ['Mon 05/25/2026 09:38', '2026-05-25'],
    ['23-01-2026 20:53', '2026-01-23'],
    ['29.04.26', '2026-04-29'],
    ['14/02/26', '2026-02-14'],
  ])('reads "%s"', (printed, iso) => {
    expect(parseDate(printed, { today: TODAY })).toBe(iso);
  });

  it.each([
    ['UK, from "£"', 'TOTAL £12.40', '2026-10-07'],
    ['UK, from VAT', 'VAT No. GB 043 0902 61', '2026-10-07'],
    ['Australia, from the ABN', 'ABN 94 384 451 959', '2026-10-07'],
    ['Australia, from TAX INVOICE', 'TAX INVOICE', '2026-10-07'],
    ['Mexico, from IVA', 'IVA 16% 48.96', '2026-10-07'],
    ['Mexico, from FECHA', 'FECHA', '2026-10-07'],
    ['Quebec, from TPS', 'TPS 814282699 RT0001', '2026-10-07'],
    ['Quebec, from French wording', 'MERCI DE VOTRE VISITE', '2026-10-07'],
    ['US, from a state and ZIP', 'Raleigh, NC 27658', '2026-07-10'],
  ])('reads an ambiguous date the way the receipt says: %s', (_name, clue, iso) => {
    expect(parseDate(`${clue}\n07/10/2026`, { today: TODAY })).toBe(iso);
  });

  it('lets the receipt outrank the phone, and the phone decide when the receipt does not', () => {
    expect(parseDate('VAT No. GB 043 0902 61\n03/04/2026', { today: TODAY, dayFirst: false })).toBe(
      '2026-04-03',
    );
    expect(parseDate('03/04/2026', { today: TODAY, dayFirst: true })).toBe('2026-04-03');
    expect(parseDate('03/04/2026', { today: TODAY, dayFirst: false })).toBe('2026-03-04');
  });

  it('reads English Canada (it prints both orders) as the reading not in the future, nearest today', () => {
    expect(parseDate('GST/HST 191379215 RT0001\n04/05/2026', { today: TODAY })).toBe('2026-05-04');
    expect(parseDate('GST/HST 191379215 RT0001\n11/09/26', { today: TODAY })).toBe('2026-09-11');
  });

  // Was 2026-03-11: the other reading was taken when the preferred one lay in the future. A
  // reading the region says is still to come is a misread or the wrong region, and flipping to
  // the other one is a guess, so the date stays blank.
  it('leaves an ambiguous date blank when the preferred reading is in the future', () => {
    expect(parseDate('11/03/2026', { today: TODAY, dayFirst: false })).toBeUndefined();
  });

  it('never reads an ambiguous date as tomorrow, but allows an unambiguous one', () => {
    // CAD user, no region words: 8 October would be tomorrow; 10 August is the date.
    expect(parseDate('08/10/2026 14:22', { today: TODAY })).toBe('2026-08-10');
    // USD user: 8 October read month first is tomorrow and is dropped, with no flip to 10 August.
    expect(parseDate('Albany, NY 12209\n10/08/2026 14:22', { today: TODAY })).toBeUndefined();
    expect(parseDate('10/08/2026 14:22', { today: TODAY, dayFirst: false })).toBeUndefined();
    // A shop a time zone ahead prints tomorrow's date; with the day above 12 it is unambiguous.
    expect(parseDate('2026-10-08', { today: TODAY })).toBe('2026-10-08');
    expect(parseDate('13/10/2026', { today: new Date(2026, 9, 12, 23) })).toBe('2026-10-13');
  });

  it('decides the order from strong evidence before a Spanish or French word', () => {
    const taqueria =
      'TAQUERIA EL SOL\n123 Main St\nLos Angeles, CA 90012\n10/06/2026 12:30 PM\nTACOS 12.00\nSALES TAX 1.14\nTOTAL 13.14\nGRACIAS!';
    expect(parseDate(taqueria, { today: TODAY })).toBe('2026-10-06');
    expect(parseDate(taqueria, { today: TODAY, dayFirst: false })).toBe('2026-10-06');
    const houston =
      'SUPERMERCADO LA FAMILIA\n500 Main St\nHouston, TX 77002\nFECHA/DATE: 09/08/2026 11:05';
    expect(parseDate(houston, { today: TODAY })).toBe('2026-09-08');
    expect(parseDate(houston, { today: TODAY, dayFirst: false })).toBe('2026-09-08');
    // The phone outranks a lone word; the word decides only when nothing else does.
    expect(parseDate('GRACIAS\n03/04/2026', { today: TODAY, dayFirst: false })).toBe('2026-03-04');
    expect(parseDate('GRACIAS\n03/04/2026', { today: TODAY })).toBe('2026-04-03');
  });

  it('leaves an ambiguous date blank when the receipt contradicts itself', () => {
    expect(
      parseDate('VAT No. GB 043 0902 61\nAlbany, NY 12209\n03/04/2026', { today: TODAY }),
    ).toBeUndefined();
    // An unambiguous date is still read.
    expect(
      parseDate('VAT No. GB 043 0902 61\nAlbany, NY 12209\n23/04/2026', { today: TODAY }),
    ).toBe('2026-04-23');
  });

  it('never takes a birth date or an exchange deadline for the purchase date', () => {
    const pharmacy =
      'SPRING PHARMACY\n77 Oak Ave\nAustin, TX 78701\nPATIENT: SMITH, AVA\nDOB 05/12/2019\nRX 4471023 AMOXICILLIN 12.00\nTOTAL 12.00\n09/01/2026';
    expect(parseDate(pharmacy, { today: TODAY, dayFirst: false })).toBe('2026-09-01');
    const gap =
      'GAP\n1 Mall Rd\nParamus, NJ 07652\nEXCHANGES THRU 09/30/2026\nJEANS 59.99\nTOTAL 59.99\n09/01/2026';
    expect(parseDate(gap, { today: TODAY, dayFirst: false })).toBe('2026-09-01');
    expect(parseDate('DATE OF BIRTH 2019-05-12\nRETURN BEFORE 2026-11-01')).toBeUndefined();
  });

  it('refuses a future date and one before 2000', () => {
    expect(parseDate('2026-10-09', { today: TODAY })).toBeUndefined();
    expect(parseDate('2026-10-08', { today: TODAY })).toBe('2026-10-08');
    expect(parseDate('1999-12-31', { today: TODAY })).toBeUndefined();
    expect(parseDate('31/02/2026', { today: TODAY })).toBeUndefined();
  });

  it('prefers the purchase date over a return-by date and a bare footer date', () => {
    const text = 'Fri 08/07/2026\nRETURN BY Sun 09/06/2026';
    expect(parseDate(`Raleigh, NC 27658\n${text}`, { today: TODAY })).toBe('2026-08-07');
    expect(parseDate('Valid until 2026-12-31\nDATE: 2026-03-02 10:41', { today: TODAY })).toBe(
      '2026-03-02',
    );
    expect(parseDate('2026-01-15\nDATE: 2026-03-02 10:41', { today: TODAY })).toBe('2026-03-02');
  });
});

describe('total', () => {
  it('reads a "$" that Vision returned as its own observation', () => {
    const rows: Row[] = ['TPS 345543318 RT0001', 'TOTAL DUE / TOTAL À PAYER', '12,97'];
    const lines = layout(rows);
    lines.splice(2, 1, { text: '$', x: 0.6, y: lines[1].y, width: 0.03, height: 0.012 });
    lines.push({ text: '12,97', x: 0.75, y: lines[1].y, width: 0.12, height: 0.012 });
    expect(parseReceiptFromLines(lines).total).toBe(12.97);
  });

  it('reads French amounts with the sign first', () => {
    expect(parseTotal('SOUS-TOTAL 27,37\nSOLDE $ 31,47\nPOURBOIRE\nSOLDE')).toBe(31.47);
    expect(parseTotal('TOTAL $9,85\nTIP / POURBOIRE\nTOTAL')).toBe(9.85);
  });

  it('reads a bilingual label as the French label it contains', () => {
    expect(read([['TOTAL / TOTAL.', '39,39']]).total).toBe(39.39);
    expect(read([['TOTAL DUE', '39,39']]).total).toBeUndefined();
  });

  it.each([
    ['digits run together', 'AMOUNT DUE 9709228.11'],
    ['a code with a leading zero', 'TOTAL 09150.24'],
    ['masked card digits', 'VISA DEBIT XXXXXXXX XXX643022.83'],
    ['masked digits after #', 'MASTERCARD #14400.72'],
    ['a million or more', 'TOTAL 1,000,000.00'],
  ])('never builds a total from %s', (_name, text) => {
    expect(parseTotal(text)).toBeUndefined();
  });

  it('takes the second TOTAL after a printed tip, in all three languages', () => {
    expect(parseTotal('SUBTOTAL 18.20\nTAX 1.57\nTOTAL 19.77\nTIP 2.73\nTOTAL 22.50')).toBe(22.5);
    expect(parseTotal('TOTAL 33,06 $\nPOURBOIRE 6,33 $\nTOTAL 39,39 $')).toBe(39.39);
    expect(parseTotal('TOTAL A PAGAR 1,394.09\nPROPINA 306.70\nTOTAL A PAGAR 1,700.79')).toBe(
      1700.79,
    );
  });

  it('takes the total before the tip when the tip and second total are left blank', () => {
    expect(
      parseTotal('SUBTOTAL 37.57\nSALES TAX 2.82\nTOTAL $40.39\nTIP\nTOTAL\nSIGNATURE X'),
    ).toBe(40.39);
    expect(parseTotal('IMPORTE 1,118.94\nPROPINA\nIMPORTE\nFIRMA X')).toBe(1118.94);
  });

  it('adds a tip printed after the total on a slip left for the post-tip total', () => {
    expect(parseTotal('TOTAL DUE 82.89\nDISCOVER ****0830\nTIP 16.50\nSIGNATURE X')).toBe(99.39);
    expect(parseTotal('AMOUNT DUE 33.36\nTIP 3.00\nTOTAL')).toBe(36.36);
  });

  it('leaves the total blank when the post-tip figure cannot be read', () => {
    // A handwritten total read as "92." beside TOTAL, or landing on the tip line as a "tip" as big
    // as the bill: the pre-tip figure would be a confident wrong answer.
    expect(parseTotal('GRAND TOTAL 84.66\nTIP\nTOTAL 92.\nSIGNATURE X')).toBeUndefined();
    expect(parseTotal('MONTANT TOTAL 128,27 $\nPOURBOIRE 128,29 $\nTOTAL')).toBeUndefined();
  });

  it('ignores suggested tips', () => {
    const text =
      'SUBTOTAL 30.57\nTAX 2.72\nBALANCE 33.29\nSUGGESTED TIP\n15% 4.59\n18% 5.50\n20% 6.11';
    expect(parseTotal(text)).toBe(33.29);
  });

  it.each([
    ['AMOUNT', 'AMOUNT £12.40'],
    ['PAID', 'PAID $12.40'],
    ['VISA', 'VISA 12.40'],
    ['EFTPOS', 'EFTPOS 12.40'],
    ['À PAYER', 'À PAYER 12,40'],
    ['IMPORTE', 'IMPORTE 12.40'],
    ['TOTAL A PAGAR', 'TOTAL A PAGAR 12.40'],
    ['BALANCE TO PAY', 'BALANCE TO PAY 12.40'],
    ['TOTAL INC GST', 'TOTAL INC GST 12.40\nGST INCLUDED IN TOTAL 1.13'],
    ['SALE AMOUNT', 'SALE AMOUNT 12.40'],
  ])('reads a total labelled %s', (_label, text) => {
    expect(parseTotal(`ITEM 9.99\n${text}`)).toBe(12.4);
  });

  it('never takes cash handed over, change or a zero balance as the total', () => {
    expect(parseTotal('SUBTOTAL 9.99\nTAX 0.83\nCASH 20.00\nCHANGE 9.18')).toBe(10.82);
    expect(parseTotal('TOTAL 13.13\nVISA 13.13\nBALANCE DUE 0.00')).toBe(13.13);
    expect(parseTotal('TOTAL 13.13\nAMOUNT TENDERED 20.00\nCHANGE 6.87')).toBe(13.13);
  });

  it('checks the total against the receipt arithmetic and takes the reading that adds up', () => {
    // Vision's best reading of the total is wrong; its runner-up adds up with subtotal and tax.
    const lines = layout([
      ['SUBTOTAL', '59.60'],
      ['TAX', '4.77'],
      ['TOTAL', '64.87'],
    ]);
    lines[5] = { ...lines[5], candidates: ['64.87', '64.37'] };
    expect(parseReceiptFromLines(lines).total).toBe(64.37);
  });

  it('recovers a total Vision ran into its label, when the arithmetic confirms it', () => {
    const text =
      'SUB-TOTAL 2,208.13\nIVA 16% 353.30\nIMPORTE TOTALS2,561.43\nEFECTIVO 2,571.43\nCAMBIO 10.00';
    expect(parseTotal(text)).toBe(2561.43);
    expect(parseTotal('SOUS-TOTAL 80,17\nTOTAL AMOUNT / MONTANT TOTABO,17 $')).toBe(80.17);
  });

  it('adds fees and takes off discounts when checking the sum', () => {
    const text =
      'SUBTOTAL 20.00\nDISCOUNT -2.00\nDELIVERY FEE 3.99\nTAX 1.10\nTOTAL 23.39\nVISA 23.09';
    // Subtotal less the discount plus the fee and tax is 23.09, as charged to the card: the
    // printed 23.39 is a misreading the two sums outvote.
    expect(parseTotal(text)).toBe(23.09);
  });

  it('counts exact cash, where the change is 0.00', () => {
    expect(parseTotal('TOTAL 15.00\nCASH 15.00\nCHANGE 0.00')).toBe(15);
    expect(parseTotal('TOTAL 16.00\nSUBTOTAL 14.00\nTAX 1.00\nCASH 15.00\nCHANGE 0.00')).toBe(15);
  });

  it('works the total out from cash and change when the total line is unreadable', () => {
    expect(parseTotal('TOTAL 22\nCASH 470.00\nCHANGE 5.78')).toBe(464.22);
    expect(parseTotal('TO PAY / À PAVERO,58 $\nCOMPTANT 220,00 $\nMONNAIE 9,42 $')).toBe(210.58);
  });

  it('replaces a misread total when two independent sums agree on another figure', () => {
    expect(parseTotal('SUBTOTAL 70.72\nTAX 4.95\nTOTAL 75.87\nCASH 80.67\nCHANGE 5.00')).toBe(
      75.67,
    );
  });

  it('keeps a clean labelled total that only one sum disputes', () => {
    expect(parseTotal('SUBTOTAL 99.99\nTOTAL DUE 12.00')).toBe(12);
  });

  it('builds cents from the printed digits, never by floating arithmetic', () => {
    expect(parseTotal('TOTAL 1,234.56')).toBe(1234.56);
    expect(parseTotal('SUBTOTAL 0.10\nTAX 0.20\nTOTAL 0.30')).toBe(0.3);
    expect(parseTotal('TOTAL 3 051,98 $')).toBe(3051.98);
  });
});

describe('whole receipts in each market', () => {
  it('reads a UK receipt', () => {
    const rows: Row[] = [
      { text: 'TESCO', size: 2 },
      '47 Church Lane',
      'EDINBURGH EH2 3ZE',
      'VAT No. GB 092 3142 92',
      'Date: 06/05/2026 08:28',
      ...ITEMS,
      ['BALANCE TO PAY', '£12.88'],
      ['VISA DEBIT', '12.88'],
    ];
    expect(read(rows)).toEqual({
      merchant: 'TESCO',
      total: 12.88,
      date: '2026-05-06',
      last4: undefined,
    });
  });

  it('reads an Australian receipt', () => {
    const rows: Row[] = [
      'TAX INVOICE',
      { text: 'COLES', size: 1.8 },
      '371 Burke Rd',
      'NEWCASTLE NSW 2300',
      'ABN 91 698 454 806',
      'DATE: 04/03/2026 10:50 AM',
      ...ITEMS,
      ['TOTAL INC GST', '$12.88'],
      ['GST INCLUDED IN TOTAL', '1.17'],
      ['EFTPOS', '12.88'],
    ];
    expect(read(rows)).toMatchObject({ merchant: 'COLES', total: 12.88, date: '2026-03-04' });
  });

  it('reads a Mexican receipt', () => {
    const rows: Row[] = [
      { text: 'SORIANA', size: 1.6 },
      'Calle Hidalgo 80',
      'Col. Lindavista C.P. 50307',
      'Toluca, Edo. Mex.',
      'R.F.C. AVP973995F4R',
      'FECHA: 05/06/2026 HORA: 11:01',
      ['1 YOGURT NATURAL 900G', '50.79'],
      ['SUB-TOTAL', '50.79'],
      ['IVA 16%', '8.13'],
      ['TOTAL A PAGAR', '$58.92'],
      'GRACIAS POR SU COMPRA',
    ];
    expect(read(rows)).toMatchObject({ merchant: 'SORIANA', total: 58.92, date: '2026-06-05' });
  });

  it('reads a Quebec receipt', () => {
    const rows: Row[] = [
      { text: 'SUPER C', size: 1.8 },
      '4107, rue Saint-Denis',
      'Gatineau (QC) J8Y 2C5',
      'TPS 046031004 RT0001',
      'TVQ 5606480483 TQ0001',
      ['LAIT 2% 2L', '5,79'],
      ['SOUS-TOTAL', '5,79'],
      ['TOTAL', '5,79 $'],
      '04/03/2026 17:48',
    ];
    expect(read(rows)).toMatchObject({ merchant: 'SUPER C', total: 5.79, date: '2026-03-04' });
  });

  it('reads plain text the same way, one row per line', () => {
    const text =
      'COSTA COFFEE\n204 Park Street\nLEEDS LS1 6BW\nLATTE 3.20\nTOTAL £3.20\n14/08/26 21:10';
    expect(parseReceipt(text, { today: TODAY })).toMatchObject({
      merchant: 'COSTA COFFEE',
      total: 3.2,
      date: '2026-08-14',
    });
  });
});

/** The app's real brand catalogue (372 brands), as the scan screens pass it. */
const CATALOGUE: BrandHint[] = catalogue.brands;

// Each of these gave a confident wrong answer in review; the inputs are the reviewer's own.
describe('review: totals that must not be wrong', () => {
  it('never takes a store-card or gift-card balance for the total', () => {
    const starbucks: Row[] = [
      { text: 'STARBUCKS', size: 2 },
      '1912 Pike Pl',
      'Seattle, WA 98101',
      '10/06/2026 8:14 AM',
      ['GRANDE LATTE', '5.45'],
      ['TOTAL', '5.45'],
      ['SBUX CARD', '5.45'],
      ['NEW BALANCE', '14.55'],
    ];
    expect(read(starbucks).total).toBe(5.45);
    const costa: Row[] = [
      { text: 'COSTA COFFEE', size: 2 },
      '12 High St',
      '01/10/2026 08:14',
      ['FLAT WHITE', '3.20'],
      ['TOTAL', '3.20'],
      ['GIFT CARD', '3.20'],
      ['REMAINING BALANCE', '16.80'],
    ];
    expect(read(costa, { dayFirst: true }).total).toBe(3.2);
  });

  it.each([
    'CARD BALANCE',
    'GIFT CARD BALANCE',
    'NEW BALANCE',
    'REWARDS BALANCE',
    'LOYALTY BALANCE',
    'STORED VALUE BALANCE',
    'BALANCE LEFT',
    'NOUVEAU SOLDE',
    'SOLDE RESTANT',
    'SALDO RESTANTE',
    'SALDO DISPONIBLE',
    'AVAILABLE BALANCE',
  ])('never reads "%s" as the total', (label) => {
    expect(parseTotal(`TOTAL 5.45\nVISA 5.45\n${label} 14.55`)).toBe(5.45);
  });

  const DINER: Row[] = [
    { text: "JOE'S DINER", size: 2 },
    '42 Elm St',
    'Albany, NY 12209',
    '10/06/2026 7:41 PM',
    ['CHEESEBURGER', '14.00'],
    ['FRIES', '6.00'],
    ['SHAKE', '20.00'],
    ['SUBTOTAL', '40.00'],
    ['TAX', '3.20'],
    ['TOTAL', '43.20'],
  ];

  it('never adds a printed tip suggestion to the total', () => {
    const guide: Row[] = [
      ...DINER,
      'TIP GUIDE 18%: $7.78',
      ['TIP', '________'],
      ['TOTAL', '________'],
      'X____________ Signature',
    ];
    expect(read(guide, { dayFirst: false }).total).toBe(43.2);
    const suggestions: Row[] = [
      ...DINER,
      ['Tip 18% =', '7.78'],
      ['Tip 20% =', '8.64'],
      ['TIP', '________'],
      ['TOTAL', '________'],
      'Signature',
    ];
    expect(read(suggestions, { dayFirst: false }).total).toBe(43.2);
  });

  it('works the total out from subtotal and tax when payment minus change agrees', () => {
    const rows: Row[] = [
      { text: 'CORNER MARKET', size: 2 },
      '9 Bay St',
      'Toronto ON M5J 2N8',
      ['MILK 2L', '4.29'],
      ['BREAD', '2.91'],
      ['SUBTOTAL', '7.20'],
      ['HST', '0.58'],
      ['PAYMENT', '20.00'],
      ['CHANGE DUE', '12.22'],
    ];
    expect(read(rows).total).toBe(7.78);
  });

  it('reads "T0TAL" and "CA5H" as the words they are, and never takes the cash handed over', () => {
    const rows: Row[] = [
      { text: 'CORNER MARKET', size: 2 },
      ['MILK 2L', '4.29'],
      ['BREAD', '3.49'],
      ['T0TAL', '7.78'],
      ['CA5H', '20.00'],
      ['CHANGE', '12.22'],
    ];
    expect(read(rows).total).toBe(7.78);
    // Without the words, a lone largest figure is not taken.
    expect(parseTotal('MILK 4.29\nBREAD 3.49\n7.78\n20.00')).toBeUndefined();
  });

  it('leaves a refund slip blank rather than filing it as a purchase', () => {
    const rows: Row[] = [
      { text: 'BEST BUY', size: 2 },
      'REFUND',
      ['HDMI CABLE', '-24.99'],
      ['TOTAL', '-24.99'],
      ['VISA REFUND', '-24.99'],
    ];
    expect(read(rows).total).toBeUndefined();
    expect(parseTotal('TOTAL 24.99-')).toBeUndefined();
    expect(parseTotal('TOTAL -$24.99')).toBeUndefined();
    // A discount printed as a credit still counts in the sum.
    expect(parseTotal('SUBTOTAL 10.00\nCOUPON -1.00\nTAX 0.90\nTOTAL 9.90\nVISA 9.90')).toBe(9.9);
  });
});

describe('review: shop names that must not be lost or replaced', () => {
  it.each([
    'TAQUERIA EL SOL',
    'CASA DEL SOL',
    'PHO BAR',
    'OLIO BAR',
    'KOI SPA',
    'LIL BBQ',
    'BOULEVARD BURGER',
    'RUE LA LA',
    'COL. ROMA TACOS',
  ])('reads "%s" as a name, not an address', (name) => {
    const rows: Row[] = [{ text: name, size: 2 }, '42 Elm St', 'Albany, NY 12209', ...ITEMS];
    expect(read(rows).merchant).toBe(name);
  });

  // The postcode shape alone ("PHO BAR" reads as one with O for 0) is looked for only on a receipt
  // showing £ or VAT, which every British receipt prints.
  it('still reads a British postcode on a British receipt', () => {
    const rows: Row[] = ['LEEDS LS1 8LQ', 'VAT No. GB 043 0902 61', ...ITEMS];
    expect(read(rows).merchant).toBeUndefined();
  });

  it('never lets a catalogue alias rename a printed shop', () => {
    // "office" is an alias of Microsoft 365, "x premium" of X.
    const office: Row[] = [{ text: 'OFFICE DEPOT', size: 2 }, '42 Elm St', ...ITEMS];
    expect(read(office, { brands: CATALOGUE }).merchant).toBe('OFFICE DEPOT');
    const premium: Row[] = [{ text: 'PREMIUM', size: 2 }, '42 Elm St', ...ITEMS];
    expect(read(premium, { brands: CATALOGUE }).merchant).toBe('PREMIUM');
    // An alias that is the whole line still counts.
    const cvs: Row[] = [{ text: 'CVS PHARMACY', size: 2 }, '42 Elm St', ...ITEMS];
    expect(read(cvs, { brands: CATALOGUE }).merchant).toBe('CVS');
  });

  it('never matches a single letter, a short brand inside a longer name, or a misread alias', () => {
    const signature: Row[] = ['1094 Lake Blvd', 'Seattle, WA 98185', ...ITEMS, 'X'];
    expect(read(signature, { brands: CATALOGUE }).merchant).toBeUndefined();
    const crave: Row[] = [{ text: 'CRAVE BURGERS', size: 2 }, '18 King St W', ...ITEMS];
    expect(read(crave, { brands: CATALOGUE }).merchant).toBe('CRAVE BURGERS');
    // One letter off an alias ("dashpass") is not the brand; one off a long brand name is.
    const brands: BrandHint[] = [
      { name: 'DoorDash', aliases: ['dashpass'] },
      { name: 'Walgreens' },
    ];
    expect(read([{ text: 'DASHPAS', size: 2 }, ...ITEMS], { brands }).merchant).toBe('DASHPAS');
    expect(read([{ text: 'WALGREEMS', size: 2 }, ...ITEMS], { brands }).merchant).toBe('Walgreens');
  });

  it('keeps a strong printed name over a delivery platform in the footer', () => {
    const joes: Row[] = [
      { text: "JOE'S DINER", size: 2 },
      '42 Elm St',
      'Albany, NY 12209',
      '10/06/2026 7:41 PM',
      ['CHEESEBURGER', '14.00'],
      ['TOTAL', '14.00'],
      'Order online: www.doordash.com/joes',
    ];
    expect(read(joes, { brands: CATALOGUE, dayFirst: false }).merchant).toBe("JOE'S DINER");
    const pho: Row[] = [
      { text: 'PHO SAIGON', size: 2 },
      '42 Elm St',
      'Albany, NY 12209',
      ['PHO', '14.00'],
      ['TOTAL', '14.00'],
      'Thank you for your order from Uber Eats',
    ];
    expect(read(pho, { brands: CATALOGUE, dayFirst: false }).merchant).toBe('PHO SAIGON');
  });

  it('still names a logo-only receipt from its footer through the catalogue', () => {
    const rows: Row[] = ['1563 River Rd', 'Fredericton NB E2B 4G4', ...ITEMS, 'www.walmart.com'];
    expect(read(rows, { brands: CATALOGUE }).merchant).toBe('Walmart');
  });
});

describe('review: input that must not hang or crash', () => {
  it('reads a runaway 50,000-character line quickly and safely', () => {
    const started = performance.now();
    expect(parseTotal(`TOTAL ${'9'.repeat(50000)}.99`)).toBeUndefined();
    const lines: ParsedLine[] = [
      { text: `${'1'.repeat(50000)}.00`, x: 0, y: 0, width: 1, height: 0.01 },
    ];
    expect(parseReceiptFromLines(lines).total).toBeUndefined();
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('survives missing text and missing candidates', () => {
    const empty = { merchant: undefined, total: undefined, date: undefined, last4: undefined };
    expect(parseReceipt(undefined as unknown as string)).toEqual(empty);
    expect(parseReceiptFromLines(undefined as unknown as ParsedLine[])).toEqual(empty);
    const odd = [
      { text: 'TOTAL 5.00', candidates: [undefined], x: 0, y: 0, width: 1, height: 0.01 },
      null,
    ] as unknown as ParsedLine[];
    expect(parseReceiptFromLines(odd).total).toBe(5);
  });
});

describe('speed', () => {
  it('reads a 150-line receipt in under 20 ms', () => {
    // Two header lines, 73 items as label and price, the total: 150 observations.
    const rows: Row[] = [{ text: 'SHOP', size: 2 }, '1 Main St'];
    for (let i = 0; i < 73; i++) rows.push([`ITEM ${i} ${'X'.repeat(i % 20)}`, `${i + 1}.99`]);
    rows.push(['TOTAL', '2,773.27']);
    const lines = layout(rows, { pitch: 0.012, body: 0.006 });
    expect(lines).toHaveLength(150);
    const times = Array.from({ length: 9 }, () => {
      const started = performance.now();
      parseReceiptFromLines(lines);
      return performance.now() - started;
    });
    // The first runs pay for compiling; the steady state is what a phone sees on every scan.
    const steady = times.slice(2).sort((a, b) => a - b);
    expect(steady[Math.floor(steady.length / 2)]).toBeLessThan(20);
  });
});
