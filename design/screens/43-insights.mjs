import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, divider, spacer } = C;
const { fmt, TYPE } = C;

export const section = 'Insights';
export const order = 43;

/*
 * src/app/insights.tsx — the whole picture, in the order people ask for it.
 *
 * Every figure below is arithmetic on one set of records for Sam, and the same
 * records the rest of the kit uses (Home's destinations are this month's
 * bills $1,240.50, receipts $386.42, subscriptions $64.97).
 *
 *   Where you stand   put aside $6,420.00, owed on cards $1,696.44
 *                     (Chase 4421 $1,284.36 + Amex 1002 $412.08),
 *                     friends owe $46.20  →  $4,769.76
 *   What goes out     week $375.44 · month $1,691.89 · year $16,179.09 ·
 *                     all time $20,517.71, and each period's bars add up to
 *                     exactly its own total.
 *
 * The category and merchant lists are the source's top 6 and top 5, so they
 * are a slice of the period's spending, not the whole of it.
 */

// --- pieces insights.tsx builds for itself -----------------------------------

/** insights.tsx's <StandRow>: a label and a signed figure. */
const StandRow = (label, value, { plain = false } = {}) =>
  hstack({ justify: 'between', gap: 12, name: 'StandRow' }, [
    text(label, { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { flex: 1, nowrap: true }),
    text(
      fmt(Math.abs(value)),
      plain
        ? { size: 14, weight: 500, lineHeight: 20, color: 'ink' }
        : { size: 14, weight: 600, lineHeight: 20, color: value < 0 ? 'moneyOut' : 'ink' },
      { nowrap: true },
    ),
  ]);

/** insights.tsx's <Row>: a bordered card that opens another screen. */
const Row = (label, { value, hint, ...p } = {}) =>
  hstack({ radius: 16, stroke: 'line', fill: 'card', pad: { y: 16, x: 20 }, gap: 12, align: 'center', name: 'InsightRow', ...p }, [
    vstack({ flex: 1 }, [
      text(label, { size: 15, weight: 500, lineHeight: 22, color: 'ink' }, { nowrap: true }),
      hint ? text(hint, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 2, nowrap: true }) : null,
    ]),
    value ? text(value, { size: 15, weight: 600, lineHeight: 22, color: 'ink' }, { nowrap: true }) : null,
    icon('ChevronRight', { size: 18, color: 'muted', stroke: 2 }),
  ]);

/** insights.tsx's <Prompt>: a card that argues for setting something up. */
const Prompt = (title, message, action, p = {}) =>
  vstack({ radius: 16, stroke: 'line', fill: 'card', pad: 20, name: 'Prompt', ...p }, [
    text(title, { size: 15, weight: 600, lineHeight: 24, color: 'ink' }),
    text(message, { size: 13, weight: 400, lineHeight: 19, color: 'muted' }, { mt: 8 }),
    C.ActionPill(action, { iconName: 'ArrowRight', mt: 16, self: 'start' }),
  ]);

/** A bar measured against the biggest row, not against the total. */
const shareBar = (amount, biggest) =>
  hstack({ h: 8, radius: 'full', fill: 'ink/5', clip: true, mt: 6 }, [
    box({ flex: Math.max(amount, 0.0001), fill: 'accent', radius: 'full', self: 'stretch' }),
    box({ flex: Math.max(biggest - amount, 0.0001) }),
  ]);

const barRow = (mark, label, amount, biggest, { visits, first } = {}) =>
  hstack({ gap: 12, align: 'center', mt: first ? 0 : 16 }, [
    mark,
    vstack({ flex: 1 }, [
      hstack({ justify: 'between', gap: 12, align: 'baseline' }, [
        text(label, { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { flex: 1, nowrap: true }),
        text(fmt(amount), { size: 14, weight: 600, lineHeight: 20, color: 'ink' }, { nowrap: true }),
      ]),
      shareBar(amount, biggest),
      visits ? text(visits, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 4, nowrap: true }) : null,
    ]),
  ]);

const Heading = (str, p = {}) => C.SectionHeading(str, { mt: 32, mb: 12, ...p });

const figureCard = (caption, figure, size, extra, p = {}) =>
  vstack({ radius: 16, stroke: 'line', fill: 'card', pad: 20, name: 'FigureCard', ...p }, [
    text(caption, TYPE.caption, { nowrap: true }),
    text(figure, { size, weight: 700, lineHeight: Math.round(size * 1.3), color: 'ink' }, { mt: 4, nowrap: true }),
    ...(extra ?? []),
  ]);

// --- the data ----------------------------------------------------------------

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
];

const CAT_ICON = {
  Housing: 'House',
  Groceries: 'ShoppingBag',
  'Electricity & Gas': 'Zap',
  'Mobile Phone': 'Smartphone',
  Internet: 'Wifi',
  Transportation: 'Car',
  Entertainment: 'Tv',
};

const WEEK = {
  key: 'week',
  caption: 'This week',
  out: 1071 - 695.56, // $375.44
  buckets: [
    { label: '13 Sun', spent: 88.4 }, { label: '14 Mon', spent: 65.33 }, { label: '15 Tue', spent: 54.12 },
    { label: '16 Wed', spent: 135.49 }, { label: '17 Thu', spent: 32.1 }, { label: '18 Fri', spent: 0 }, { label: '19 Sat', spent: 0 },
  ],
  kinds: { receipt: 239.95, bill: 120, subscription: 15.49 },
  categories: [
    { label: 'Groceries', amount: 207.85 }, { label: 'Electricity & Gas', amount: 120 },
    { label: 'Transportation', amount: 32.1 }, { label: 'Entertainment', amount: 15.49 },
  ],
  merchants: [
    { name: 'Electricity (AEP)', amount: 120, visits: '1 time', bill: 'Zap' },
    { name: "Trader Joe's", amount: 119.45, visits: '2 times' },
    { name: 'Whole Foods', amount: 88.4, visits: '1 time' },
    { name: 'Shell', amount: 32.1, visits: '1 time' },
    { name: 'Netflix', amount: 15.49, visits: '1 time' },
  ],
};

const MONTH = {
  key: 'month',
  caption: 'This month',
  out: 1691.89,
  buckets: [
    { label: '1–5', spent: 612.3 }, { label: '6–12', spent: 704.15 }, { label: '13–19', spent: 375.44 },
    { label: '20–26', spent: 0 }, { label: '27–30', spent: 0 },
  ],
  kinds: { receipt: 386.42, bill: 1240.5, subscription: 64.97 },
  categories: [
    { label: 'Housing', amount: 950 }, { label: 'Groceries', amount: 242.85 },
    { label: 'Electricity & Gas', amount: 120 }, { label: 'Mobile Phone', amount: 85.5 },
    { label: 'Internet', amount: 85 }, { label: 'Transportation', amount: 76.55 },
  ],
  merchants: [
    { name: 'Rent', amount: 950, visits: '1 time', bill: 'House' },
    { name: 'Electricity (AEP)', amount: 120, visits: '1 time', bill: 'Zap' },
    { name: "Trader Joe's", amount: 119.45, visits: '2 times' },
    { name: 'Whole Foods', amount: 88.4, visits: '1 time' },
    { name: 'T-Mobile', amount: 85.5, visits: '1 time', bill: 'Smartphone' },
  ],
};

const YEAR = {
  key: 'year',
  caption: 'This year',
  out: 16179.09,
  buckets: [
    { label: 'Jan', spent: 1842.1 }, { label: 'Feb', spent: 1610.55 }, { label: 'Mar', spent: 1904.87 },
    { label: 'Apr', spent: 1733.2 }, { label: 'May', spent: 1688.44 }, { label: 'Jun', spent: 1975.03 },
    { label: 'Jul', spent: 1820.66 }, { label: 'Aug', spent: 1912.35 }, { label: 'Sep', spent: 1691.89 },
    { label: 'Oct', spent: 0 }, { label: 'Nov', spent: 0 }, { label: 'Dec', spent: 0 },
  ],
  kinds: { receipt: 4429.86, bill: 11164.5, subscription: 584.73 },
  categories: [
    { label: 'Housing', amount: 8550 }, { label: 'Groceries', amount: 2186 },
    { label: 'Electricity & Gas', amount: 1080 }, { label: 'Mobile Phone', amount: 769.5 },
    { label: 'Internet', amount: 765 }, { label: 'Transportation', amount: 688.95 },
  ],
  merchants: [
    { name: 'Rent', amount: 8550, visits: '9 times', bill: 'House' },
    { name: 'Electricity (AEP)', amount: 1080, visits: '9 times', bill: 'Zap' },
    { name: "Trader Joe's", amount: 1075.05, visits: '18 times' },
    { name: 'Whole Foods', amount: 795.6, visits: '9 times' },
    { name: 'T-Mobile', amount: 769.5, visits: '9 times', bill: 'Smartphone' },
  ],
};

const ALL = {
  key: 'all',
  caption: 'All time',
  out: 20517.71,
  buckets: [
    { label: '2020', spent: 0 }, { label: '2021', spent: 0 }, { label: '2022', spent: 0 },
    { label: '2023', spent: 0 }, { label: '2024', spent: 0 }, { label: '2025', spent: 4338.62 },
    { label: '2026', spent: 16179.09 },
  ],
  kinds: { receipt: 4852.07, bill: 14886, subscription: 779.64 },
  categories: [
    { label: 'Housing', amount: 11400 }, { label: 'Groceries', amount: 2914.67 },
    { label: 'Electricity & Gas', amount: 1440 }, { label: 'Mobile Phone', amount: 1026 },
    { label: 'Internet', amount: 1020 }, { label: 'Transportation', amount: 918.6 },
  ],
  merchants: [
    { name: 'Rent', amount: 11400, visits: '12 times', bill: 'House' },
    { name: 'Electricity (AEP)', amount: 1440, visits: '12 times', bill: 'Zap' },
    { name: "Trader Joe's", amount: 1433.4, visits: '24 times' },
    { name: 'Whole Foods', amount: 1060.8, visits: '12 times' },
    { name: 'T-Mobile', amount: 1026, visits: '12 times', bill: 'Smartphone' },
  ],
};

const EMPTY = {
  key: 'month',
  caption: 'This month',
  out: 0,
  buckets: MONTH.buckets.map((b) => ({ ...b, spent: 0 })),
  kinds: { receipt: 0, bill: 0, subscription: 0 },
  categories: [],
  merchants: [],
};

// --- the column ---------------------------------------------------------------

const page = ({
  period,
  loading = false,
  savedTotal = 6420,
  owedOnCards = 1696.44,
  splitPosition = 46.2,
  groups = 2,
  income = 4200,
  incomeSources = 1,
  months = [
    { label: 'June 2026', saved: 412.18 },
    { label: 'July 2026', saved: 508.66 },
    { label: 'August 2026', saved: 339.2 },
  ],
  cards = [
    { label: 'Chase 4421', owed: 1284.36 },
    { label: 'Amex 1002', owed: 412.08 },
  ],
  monthlySubs = 64.97,
}) => {
  const worth = savedTotal - owedOnCards + splitPosition;
  const biggestCategory = period.categories[0]?.amount ?? 0;
  const busiest = period.merchants[0]?.amount ?? 0;

  return [
    C.Title('Insights', { align: 'left' }),

    Heading('Where you stand'),
    figureCard('Saved, less what you owe', fmt(worth), 34, [
      vstack({ mt: 16, gap: 10 }, [
        StandRow('Put aside', savedTotal),
        StandRow('Owed on cards', -owedOnCards),
        splitPosition !== 0 ? StandRow(splitPosition > 0 ? 'Owed to you by friends' : 'You owe friends', splitPosition) : null,
      ]),
    ]),

    Heading('What comes in'),
    income > 0
      ? figureCard('Every month', fmt(income), 28, [
          text(`from ${incomeSources} ${incomeSources === 1 ? 'source' : 'sources'}`, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 4 }),
        ])
      : Prompt(
          'Skip does not know what you earn yet',
          'Adding your pay is what turns this page from a record of what you spent into a picture of what you can afford.',
          'Set up payday',
        ),

    Heading('What goes out'),
    C.ChoiceChips(PERIODS, period.key),
    ...(loading
      ? [vstack({}, [C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow()])]
      : [
          figureCard(period.caption, fmt(period.out), 30, [box({ mt: 16 }, C.FlowChart(period.buckets))], { mt: 16 }),
          vstack({ mt: 12, radius: 16, stroke: 'line', fill: 'card', pad: { y: 16, x: 20 } }, [
            StandRow('Shop receipts', -period.kinds.receipt, { plain: true }),
            spacer(8),
            StandRow('Bills', -period.kinds.bill, { plain: true }),
            spacer(8),
            StandRow('Subscriptions', -period.kinds.subscription, { plain: true }),
            divider({ color: 'line', mt: 12, mb: 12 }),
            hstack({ justify: 'between', gap: 12, align: 'center' }, [
              text('Recorded in this period', { size: 15, weight: 600, lineHeight: 22, color: 'ink' }, { flex: 1 }),
              text(fmt(period.out), { size: 16, weight: 700, lineHeight: 22, color: 'ink' }, { nowrap: true }),
            ]),
          ]),
        ]),

    ...(period.categories.length
      ? [
          Heading('Where it goes'),
          vstack({ radius: 16, stroke: 'line', fill: 'card', pad: 20 },
            period.categories.map((c, i) =>
              barRow(C.BillMark(CAT_ICON[c.label] ?? 'FileText', { size: 34 }), c.label, c.amount, biggestCategory, { first: i === 0 }),
            ),
          ),
        ]
      : []),

    ...(period.merchants.length
      ? [
          Heading('Where you spend most'),
          vstack({ radius: 16, stroke: 'line', fill: 'card', pad: 20 },
            period.merchants.map((m, i) =>
              barRow(
                m.bill ? C.BillMark(m.bill, { size: 40 }) : C.BrandMark(m.name, { size: 40 }),
                m.name, m.amount, busiest, { visits: m.visits, first: i === 0 },
              ),
            ),
          ),
        ]
      : []),

    Heading('Shared with others'),
    Row(splitPosition === 0 ? 'All settled up' : splitPosition > 0 ? 'Friends owe you' : 'You owe friends', {
      value: splitPosition === 0 ? undefined : fmt(Math.abs(splitPosition)),
      hint: `across ${groups} ${groups === 1 ? 'group' : 'groups'}`,
    }),

    Heading('What you keep'),
    months.length > 0
      ? vstack({ radius: 16, stroke: 'line', fill: 'card', pad: { y: 16, x: 20 } }, [
          ...months.map((m, i) => box({ mt: i > 0 ? 12 : 0 }, StandRow(m.label, m.saved, { plain: true }))),
          divider({ color: 'line', mt: 12, mb: 12 }),
          hstack({ minH: 44, justify: 'between', align: 'center' }, [
            text('Every month', { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { flex: 1, nowrap: true }),
            icon('ChevronRight', { size: 18, color: 'muted', stroke: 2 }),
          ]),
        ])
      : Prompt(
          'No finished months yet',
          'When a month ends, whatever is left of it is added to your savings and shows up here.',
          'See savings',
        ),

    ...(cards.length
      ? [
          Heading('What you owe'),
          vstack({ radius: 16, stroke: 'line', fill: 'card', pad: { y: 16, x: 20 } },
            cards.map((c, i) => box({ mt: i > 0 ? 12 : 0 }, StandRow(c.label, -c.owed, { plain: true }))),
          ),
        ]
      : []),

    ...(monthlySubs > 0
      ? [
          Heading('Coming up'),
          Row('Subscriptions', { value: `${fmt(monthlySubs)}/mo`, hint: `${fmt(monthlySubs * 12)} over a year` }),
        ]
      : []),

    spacer(40),
  ];
};

export default [
  screen({ id: 'insights', name: 'Insights / month', back: true, children: page({ period: MONTH }) }),
  screen({ id: 'insights-week', name: 'Insights / week', back: true, children: page({ period: WEEK }) }),
  screen({ id: 'insights-year', name: 'Insights / year', back: true, children: page({ period: YEAR }) }),
  screen({ id: 'insights-all', name: 'Insights / all time', back: true, children: page({ period: ALL }) }),
  screen({ id: 'insights-loading', name: 'Insights / loading', back: true, children: page({ period: MONTH, loading: true }) }),
  screen({
    id: 'insights-new-account',
    name: 'Insights / nothing recorded yet',
    back: true,
    children: page({
      period: EMPTY,
      savedTotal: 0,
      owedOnCards: 0,
      splitPosition: 0,
      groups: 0,
      income: 0,
      months: [],
      cards: [],
      monthlySubs: 0,
    }),
  }),
  screen({
    id: 'insights-error',
    name: 'Insights / could not load',
    back: true,
    children: [
      C.Title('Insights', { align: 'left' }),
      C.PageState(
        'state-error',
        'We could not load your insights',
        'Something went wrong fetching your figures. Nothing is lost — check your connection and try again.',
        { action: 'Try again' },
      ),
    ],
  }),
];
