import { sumMoney, toCents } from '@/lib/money';
import {
  exportFileName,
  exportMonths,
  exportRows,
  paymentsCsv,
  paymentsHtml,
  plainAmount,
  type ExportRow,
  type ExportSource,
  type ExportWords,
  type HtmlFormats,
} from '@/lib/payment-export';
import { buildTokens } from '@/theme/palette';

/**
 * What an export writes: a CSV any spreadsheet opens safely, and a statement page whose month
 * totals add up to its rows to the cent.
 */

const WORDS: ExportWords = {
  date: 'Date',
  name: 'Name',
  kind: 'Kind',
  amount: 'Amount (USD)',
  paidFrom: 'Paid from',
  title: 'Payment history',
  scope: 'Bills · 2026',
  total: 'Total',
  made: 'Made with Skip Budget on 12 Oct 2026',
};

const row = (extra: Partial<ExportRow> = {}): ExportRow => ({
  date: '2026-10-11',
  name: 'Nationwide',
  kind: 'Bill',
  amount: 145,
  paidFrom: 'Card not set',
  ...extra,
});

/** The CSV's records, without the byte-order mark and the final line break. */
const records = (csv: string) => csv.slice(1).replace(/\r\n$/, '').split('\r\n');

/** A formatter that keeps float noise visible: 0.30000000000000004 must never be printed. */
const RAW: HtmlFormats = {
  money: (amount) => `[${amount}]`,
  date: (iso) => `{${iso}}`,
  month: (month) => `<${month}>`,
};

describe('exportRows', () => {
  const source = (extra: Partial<ExportSource> = {}): ExportSource => ({
    date: '2026-10-09',
    name: 'Netflix',
    amount: 15.99,
    kind: 'subscription',
    status: 'paid',
    sourceId: 'card-1',
    ...extra,
  });
  const labels: Record<string, string> = { 'card-1': 'Discover ••6334', 'acct-1': 'Komal ••7010' };
  const options = {
    labelOf: jest.fn((id: string) => labels[id] ?? null),
    kindWord: {
      bill: 'Bill',
      subscription: 'Subscription',
      paidOff: 'Paid off',
      extraPayment: 'Extra payment',
    },
    notSet: 'Card not set',
  };

  it('keeps the date, the name as recorded and the amount, and names the card or account', () => {
    expect(exportRows([source()], options)).toEqual([
      {
        date: '2026-10-09',
        name: 'Netflix',
        kind: 'Subscription',
        amount: 15.99,
        paidFrom: 'Discover ••6334',
      },
    ]);
    expect(exportRows([source({ kind: 'bill', sourceId: 'acct-1' })], options)[0]).toMatchObject({
      kind: 'Bill',
      paidFrom: 'Komal ••7010',
    });
  });

  it('gives a loan payoff its own word, never Bill', () => {
    const rows = exportRows(
      [
        source({ kind: 'bill', status: 'paidOff', name: 'Car loan' }),
        source({ kind: 'bill', status: 'extraPayment', name: 'Car loan' }),
      ],
      options,
    );
    expect(rows.map((r) => r.kind)).toEqual(['Paid off', 'Extra payment']);
  });

  it('says Card not set for no card, and for a card deleted since', () => {
    options.labelOf.mockClear();
    const rows = exportRows([source({ sourceId: '' }), source({ sourceId: 'gone' })], options);
    expect(rows.map((r) => r.paidFrom)).toEqual(['Card not set', 'Card not set']);
    expect(options.labelOf).not.toHaveBeenCalledWith('');
  });
});

describe('plainAmount', () => {
  it.each([
    [0.1, '0.10'],
    [1035, '1035.00'],
    [10.075, '10.08'],
    [1.005, '1.01'],
    [0.005, '0.01'],
    [1234567.89, '1234567.89'],
    [999999999999.99, '999999999999.99'],
    [0, '0.00'],
    [-0, '0.00'],
    [-12.5, '-12.50'],
    [0.1 + 0.2, '0.30'],
  ])('writes %p as %p', (amount, text) => {
    expect(plainAmount(amount)).toBe(text);
  });
});

describe('paymentsCsv', () => {
  it('starts with the UTF-8 mark, ends every record with CRLF, and writes plain numbers', () => {
    const csv = paymentsCsv(
      [
        row(),
        row({
          date: '2026-10-01',
          name: 'Ashword Hill Apartments',
          amount: 1035,
          paidFrom: 'Komal ••7010',
        }),
        row({ date: '2026-09-15', name: 'iCloud+', kind: 'Subscription', amount: 0.1 }),
      ],
      WORDS,
    );

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(records(csv)).toEqual([
      'Date,Name,Kind,Amount (USD),Paid from',
      '2026-10-11,Nationwide,Bill,145.00,Card not set',
      '2026-10-01,Ashword Hill Apartments,Bill,1035.00,Komal ••7010',
      '2026-09-15,iCloud+,Subscription,0.10,Card not set',
    ]);
  });

  it('rounds to the cent half away from zero, never with a symbol or grouping', () => {
    const csv = paymentsCsv([row({ amount: 10.075 }), row({ amount: 1234567.891 })], WORDS);
    expect(records(csv).slice(1)).toEqual([
      '2026-10-11,Nationwide,Bill,10.08,Card not set',
      '2026-10-11,Nationwide,Bill,1234567.89,Card not set',
    ]);
  });

  it('quotes a cell with a comma, a quote or a line break, doubling the quotes', () => {
    const csv = paymentsCsv(
      [
        row({ name: 'Smith, Jones & Co' }),
        row({ name: 'The "Good" Gym' }),
        row({ name: 'Line one\nline two', paidFrom: 'Visa, joint' }),
        row({ name: 'Café Crème' }),
      ],
      WORDS,
    );
    expect(csv.slice(1)).toBe(
      [
        'Date,Name,Kind,Amount (USD),Paid from',
        '2026-10-11,"Smith, Jones & Co",Bill,145.00,Card not set',
        '2026-10-11,"The ""Good"" Gym",Bill,145.00,Card not set',
        '2026-10-11,"Line one\nline two",Bill,145.00,"Visa, joint"',
        '2026-10-11,Café Crème,Bill,145.00,Card not set',
        '',
      ].join('\r\n'),
    );
  });

  it.each([
    ['=HYPERLINK("http://x.example","Pay")', `"'=HYPERLINK(""http://x.example"",""Pay"")"`],
    ['+1 555 0100', "'+1 555 0100"],
    ['-2+3+cmd', "'-2+3+cmd"],
    ['@SUM(A1:A9)', "'@SUM(A1:A9)"],
    ['\tTab first', "'\tTab first"],
    ['\rReturn first', `"'\rReturn first"`],
    ['  =1+1', "'  =1+1"],
    ['＝1+1', "'＝1+1"],
  ])('keeps %j as text, never a formula', (name, cell) => {
    const [, record] = records(paymentsCsv([row({ name, paidFrom: name })], WORDS));
    expect(record).toBe(`2026-10-11,${cell},Bill,145.00,${cell}`);
  });

  it('leaves names that only contain those signs alone, and a negative amount a number', () => {
    const [, first, second] = records(
      paymentsCsv([row({ name: 'Spotify+ Family', amount: -12.5 }), row({ name: 'AT&T' })], WORDS),
    );
    expect(first).toBe('2026-10-11,Spotify+ Family,Bill,-12.50,Card not set');
    expect(second).toBe('2026-10-11,AT&T,Bill,145.00,Card not set');
  });

  it('writes the header in the words it is given, guarded the same way', () => {
    const csv = paymentsCsv([], {
      ...WORDS,
      date: 'Fecha',
      amount: 'Importe (EUR)',
      name: '=Nombre',
    });
    expect(records(csv)).toEqual(["Fecha,'=Nombre,Kind,Importe (EUR),Paid from"]);
  });
});

describe('exportMonths', () => {
  it('groups by calendar month in the order months appear, totals by sumMoney', () => {
    const rows = [
      row({ date: '2026-10-11', amount: 0.1 }),
      row({ date: '2026-10-09', amount: 0.2 }),
      row({ date: '2026-09-28', amount: 10.075 }),
      row({ date: '2026-09-22', amount: 0.005 }),
      row({ date: '2025-12-31', amount: 554 }),
      // Out of order, it still joins its month rather than starting a second October.
      row({ date: '2026-10-01', amount: 1035 }),
    ];

    const months = exportMonths(rows);
    expect(months.map((m) => [m.month, m.rows.length])).toEqual([
      ['2026-10', 3],
      ['2026-09', 2],
      ['2025-12', 1],
    ]);
    months.forEach((m) => expect(m.total).toBe(sumMoney(m.rows.map((r) => r.amount))));
    // Each total adds the cents its rows show: 10.08 + 0.01, not the rounded 10.08 of the sum.
    expect(months.map((m) => m.total)).toEqual([1035.3, 10.09, 554]);
  });
});

describe('paymentsHtml', () => {
  const rows = [
    row({ date: '2026-10-11', amount: 0.1 }),
    row({ date: '2026-10-09', name: 'Netflix', kind: 'Subscription', amount: 0.2 }),
    row({ date: '2026-09-28', name: 'Car loan', kind: 'Paid off', amount: 10.075 }),
    row({ date: '2026-09-22', name: 'AEP', amount: 0.005, paidFrom: 'Komal ••7010' }),
  ];

  /** The statement's lines, in print order. */
  const lines = (html: string) =>
    [...html.matchAll(/<div class="row( month| columns)?">(.*?)<\/div><\/div>/g)].map((m) => ({
      kind: m[1]?.trim() ?? 'row',
      cells: [...`${m[2]}</div>`.matchAll(/<div class="(\w+)">(.*?)<\/div>/g)].map((c) => [
        c[1],
        c[2],
      ]),
    }));

  it('is a whole UTF-8 document, light only, with nothing to fetch', () => {
    const html = paymentsHtml(rows, WORDS, RAW);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('color-scheme: light');
    expect(html).not.toMatch(/<img|<script|<link|url\(|https?:/i);
  });

  it('heads the page in the accent, with the scope and the grand total', () => {
    const html = paymentsHtml(rows, WORDS, RAW);
    const accent = buildTokens('light').accentInk;
    expect(accent).toBe('#905479');
    expect(html).toContain(`h1 { margin: 0; color: ${accent};`);
    expect(html).toContain('<h1>Payment history</h1><p class="scope">Bills · 2026</p>');
    expect(html).toContain(
      `<span class="label">Total</span><span class="figure">[${sumMoney(rows.map((r) => r.amount))}]</span>`,
    );
    expect(html).toContain('<span class="figure">[10.39]</span>');
    expect(html).toContain('<footer>Made with Skip Budget on 12 Oct 2026</footer>');
  });

  it('prints the column headings, then each month with its total and its rows, in CSV column order', () => {
    expect(lines(paymentsHtml(rows, WORDS, RAW))).toEqual([
      {
        kind: 'columns',
        cells: [
          ['date', 'Date'],
          ['name', 'Name'],
          ['kind', 'Kind'],
          ['amount', 'Amount (USD)'],
          ['from', 'Paid from'],
        ],
      },
      {
        kind: 'month',
        cells: [
          ['heading', '&lt;2026-10&gt;'],
          ['amount', '[0.3]'],
          ['from', ''],
        ],
      },
      {
        kind: 'row',
        cells: [
          ['date', '{2026-10-11}'],
          ['name', 'Nationwide'],
          ['kind', 'Bill'],
          ['amount', '[0.1]'],
          ['from', 'Card not set'],
        ],
      },
      {
        kind: 'row',
        cells: [
          ['date', '{2026-10-09}'],
          ['name', 'Netflix'],
          ['kind', 'Subscription'],
          ['amount', '[0.2]'],
          ['from', 'Card not set'],
        ],
      },
      {
        kind: 'month',
        cells: [
          ['heading', '&lt;2026-09&gt;'],
          ['amount', '[10.09]'],
          ['from', ''],
        ],
      },
      {
        kind: 'row',
        cells: [
          ['date', '{2026-09-28}'],
          ['name', 'Car loan'],
          ['kind', 'Paid off'],
          ['amount', '[10.075]'],
          ['from', 'Card not set'],
        ],
      },
      {
        kind: 'row',
        cells: [
          ['date', '{2026-09-22}'],
          ['name', 'AEP'],
          ['kind', 'Bill'],
          ['amount', '[0.005]'],
          ['from', 'Komal ••7010'],
        ],
      },
    ]);
  });

  it('totals each month as the sum of the cents its rows show', () => {
    const html = paymentsHtml(rows, WORDS, RAW);
    const totals = lines(html)
      .filter((l) => l.kind === 'month')
      .map((l) => l.cells[1][1]);
    expect(totals).toEqual(
      exportMonths(rows).map((m) => `[${sumMoney(m.rows.map((r) => r.amount))}]`),
    );
    // Float addition would print the noise.
    expect(html).not.toContain('0.30000000000000004');
  });

  it('keeps each month heading with its first row, so it never sits alone at the foot of a page', () => {
    const html = paymentsHtml(rows, WORDS, RAW);
    const keeps = [
      ...html.matchAll(/<div class="keep">(.*?)<\/div><\/div>\n(.*?)<\/div><\/div><\/div>/g),
    ];
    expect(keeps).toHaveLength(2);
    expect(keeps[0][0]).toContain('&lt;2026-10&gt;');
    expect(keeps[0][0]).toContain('Nationwide');
    expect(keeps[0][0]).not.toContain('Netflix');
    expect(keeps[1][0]).toContain('&lt;2026-09&gt;');
    expect(keeps[1][0]).toContain('Car loan');
    expect(keeps[1][0]).not.toContain('AEP');
    expect(html).toContain('.keep { page-break-inside: avoid; break-inside: avoid; }');
  });

  it('escapes every name, word and formatted value', () => {
    const html = paymentsHtml(
      [row({ name: `<script>alert("x")</script> & 'co'`, paidFrom: '<b>Visa</b>', kind: 'A&B' })],
      { ...WORDS, title: 'History <i>', scope: '"2026"', total: "Total's", made: '<made>' },
      { money: () => '<m>', date: () => '<d>', month: () => '<mo>' },
    );
    const body = html.slice(html.indexOf('<body>'));
    expect(body).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;co&#39;');
    expect(body).toContain('&lt;b&gt;Visa&lt;/b&gt;');
    expect(body).toContain('A&amp;B');
    expect(body).toContain('History &lt;i&gt;');
    expect(body).toContain('&quot;2026&quot;');
    expect(body).toContain('Total&#39;s');
    expect(body).toContain('&lt;made&gt;');
    expect(body).toContain('&lt;m&gt;');
    expect(body).toContain('&lt;d&gt;');
    expect(body).toContain('&lt;mo&gt;');
    expect(html).toContain('<title>History &lt;i&gt;</title>');
    expect(body).not.toMatch(/<(script|b|i|made|m|d|mo)>/);
  });

  it('fits A4 and Letter alike: only shares of the page, no page size of its own, rows kept whole', () => {
    const html = paymentsHtml(rows, WORDS, RAW);
    expect(html).not.toMatch(/width\s*:\s*[\d.]+\s*(px|pt|in|mm|cm)/);
    expect(html).not.toMatch(/@page/);
    const shares = [...html.matchAll(/\.(date|name|kind|amount|from) \{ width: (\d+)%/g)];
    expect(shares.map((m) => m[1])).toEqual(['date', 'name', 'kind', 'amount', 'from']);
    expect(shares.reduce((sum, m) => sum + Number(m[2]), 0)).toBe(100);
    expect(html).toContain('.heading { width: 61%; }');
    expect(html).toMatch(/\.row \{[^}]*page-break-inside: avoid; break-inside: avoid; \}/);
  });

  it('still makes a page with no rows, totalling zero', () => {
    const html = paymentsHtml([], WORDS, RAW);
    expect(html).toContain('<span class="figure">[0]</span>');
    expect(html).not.toContain('<section>');
  });
});

describe('exportFileName', () => {
  it.each([
    [{ kind: 'all', year: 2026, ext: 'csv' }, 'skip-payments-2026.csv'],
    [{ kind: 'bill', year: 2026, ext: 'pdf' }, 'skip-bills-2026.pdf'],
    [{ kind: 'subscription', year: 'all', ext: 'csv' }, 'skip-subscriptions-all-years.csv'],
    [{ kind: 'all', year: 'all', ext: 'pdf' }, 'skip-payments-all-years.pdf'],
  ] as const)('names %j %s', (o, name) => {
    expect(exportFileName(o)).toBe(name);
  });
});

it('keeps a figure the CSV writes equal to the cents the app holds', () => {
  for (const amount of [0.07, 19.99, 554.23, 1205.99, 18548.81]) {
    const [whole, cents] = plainAmount(amount).split('.');
    expect(Number(whole) * 100 + Number(cents)).toBe(toCents(amount));
  }
});
