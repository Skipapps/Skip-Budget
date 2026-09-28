// src/app/(tabs)/transactions.tsx — the ledger: a period, its shape, its rows.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Transactions';
export const order = 27;

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
];

const CARD = 'VISA ••4421';
const ACCOUNT = 'Chase Checking ••1180';

/** The window and the way through it. Forward is dead on the latest period. */
const periodStepper = (label, { atEarliest = false, atLatest = true, ...p } = {}) =>
  hstack({ radius: 'full', fill: 'ink/5', pad: { x: 6, y: 8 }, justify: 'between', align: 'center', name: 'PeriodStepper', ...p }, [
    box({ w: 40, h: 40, radius: 'full', justify: 'center', align: 'center', opacity: atEarliest ? 0.3 : undefined }, [
      icon('ChevronLeft', { size: 20, color: 'ink', stroke: 2 }),
    ]),
    text(label, { size: 15, weight: 600, lineHeight: 22, color: 'ink', align: 'center' }, { flex: 1, nowrap: true }),
    box({ w: 40, h: 40, radius: 'full', justify: 'center', align: 'center', opacity: atLatest ? 0.3 : undefined }, [
      icon('ChevronRight', { size: 20, color: 'ink', stroke: 2 }),
    ]),
  ]);

/** Search plus the filter button, which carries a count when filters are on. */
const searchRow = (count, p = {}) =>
  hstack({ gap: 12, align: 'center', name: 'SearchRow', ...p }, [
    C.SearchField({ flex: 1, placeholder: 'Search transactions' }),
    box({ w: 44, h: 44, radius: 'full', fill: 'ink/5', justify: 'center', align: 'center' }, [
      icon('SlidersHorizontal', { size: 20, color: 'ink' }),
    ]),
    count
      ? box({ w: 20, h: 20, radius: 'full', fill: 'accent', justify: 'center', align: 'center', ml: -14, mt: -4, self: 'start', name: 'FilterCount' }, [
          text(String(count), { size: 11, weight: 500, lineHeight: 16, color: 'onControl', align: 'center' }, { hug: true }),
        ])
      : null,
  ]);

/** A day heading (relative) or a bucket heading, then the hairline, then rows. */
const group = (label, total, rows) =>
  vstack({ name: `Group/${label}` }, [C.DateGroupHeader(label, { total }), divider({ color: 'line', mt: 4 }), ...rows]);

const row = (name, amount, kindLabel, sourceLabel, extra = {}) =>
  C.LedgerRow(name, amount, { kindLabel, sourceLabel, ...extra });

const bill = (iconName) => ({ kind: 'bill', iconName });
const income = { kind: 'income' };

// The week of 13–19 Sep 2026, cut off at today (Thu 17 Sep).
const weekChart = [
  { label: '13 Sun', spent: 0 },
  { label: '14 Mon', spent: 0 },
  { label: '15 Tue', spent: 54.12 },
  { label: '16 Wed', spent: 135.49 },
  { label: '17 Thu', spent: 32.1 },
  { label: '18 Fri', spent: 0 },
  { label: '19 Sat', spent: 0 },
];

const weekGroups = [
  group('15 Sep 2026', 4145.88, [
    row("Trader Joe's", -54.12, 'Receipts', CARD),
    row('Salary', 4200, 'Income', ACCOUNT, income),
  ]),
  group('Yesterday', -135.49, [
    row('Netflix', -15.49, 'Subscriptions', CARD),
    row('Electricity', -120, 'Monthly Bills', CARD, bill('Zap')),
  ]),
  group('Today', -32.1, [row('Shell', -32.1, 'Receipts', CARD)]),
];

export default [
  // Loaded: the week, its summary, its shape, and the rows oldest day first.
  screen({
    id: 'transactions',
    name: 'Transactions',
    tab: 'transactions',
    children: [
      C.Title('Transactions'),
      box({ mt: 20 }, C.ChoiceChips(PERIODS, 'week')),
      periodStepper('13 – 19 Sep', { mt: 16 }),
      vstack({ mt: 16, gap: 16 }, [
        C.LedgerSummary({ net: 3978.29, inTotal: 4200, outTotal: 221.71, count: 5 }),
        C.FlowChart(weekChart),
      ]),
      searchRow(0, { mt: 20 }),
      vstack({ mt: 8, pad: { b: 96 } }, weekGroups),
    ],
  }),

  // The same page stepped up to a month: the buckets become weeks, and the
  // headings are the bucket's own label rather than a relative day.
  screen({
    id: 'transactions-month',
    name: 'Transactions — month',
    tab: 'transactions',
    children: [
      C.Title('Transactions'),
      box({ mt: 20 }, C.ChoiceChips(PERIODS, 'month')),
      periodStepper('Sep 2026', { mt: 16 }),
      vstack({ mt: 16, gap: 16 }, [
        C.LedgerSummary({ net: 2221.55, inTotal: 4200, outTotal: 1978.45, count: 11 }),
        C.FlowChart([
          { label: '1–5', spent: 1460.99 },
          { label: '6–12', spent: 295.75 },
          { label: '13–19', spent: 221.71 },
          { label: '20–26', spent: 0 },
          { label: '27–30', spent: 0 },
        ]),
      ]),
      searchRow(0, { mt: 20 }),
      vstack({ mt: 8, pad: { b: 96 } }, [
        group('1–5', -1460.99, [
          row('Rent', -1450, 'Monthly Bills', ACCOUNT, bill('House')),
          row('Spotify', -10.99, 'Subscriptions', CARD),
        ]),
        group('6–12', -295.75, [
          row('Shell', -41.8, 'Receipts', ACCOUNT),
          row('Whole Foods', -86.44, 'Receipts', CARD),
          row('T-Mobile', -65.16, 'Monthly Bills', CARD, bill('Smartphone')),
          row('Whole Foods', -102.35, 'Receipts', ACCOUNT),
        ]),
        group('13–19', 3978.29, [
          row("Trader Joe's", -54.12, 'Receipts', CARD),
          row('Salary', 4200, 'Income', ACCOUNT, income),
          row('Netflix', -15.49, 'Subscriptions', CARD),
          row('Electricity', -120, 'Monthly Bills', CARD, bill('Zap')),
          row('Shell', -32.1, 'Receipts', CARD),
        ]),
      ]),
    ],
  }),

  // The filter sheet: a full-screen modal with its own header and footer
  // (src/components/transactions/filter-sheet.tsx). Draft filters only reach
  // the list on Apply.
  screen({
    id: 'transactions-filter',
    name: 'Transactions — filter',
    padBottom: 16,
    children: [
      hstack({ gap: 0, align: 'center', mt: 8, name: 'FilterHeader' }, [
        box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('X', { size: 22, color: 'ink', stroke: 2 })]),
        text('Filter', { size: 18, weight: 600, lineHeight: 26, color: 'ink', align: 'center' }, { flex: 1, nowrap: true, mr: 44 }),
      ]),
      vstack({ mt: 16 }, [
        C.SelectField('Date', { value: '', placeholder: 'Any date', iconName: 'Calendar' }),
      ]),
      vstack({ mt: 24 }, [
        C.FieldLabel('Card or bank account', { mb: 8 }),
        C.MultiChoiceChips(
          [
            { value: 'card', label: CARD },
            { value: 'acct', label: ACCOUNT },
          ],
          [],
          { emptyHint: 'Showing every card and account.' },
        ),
      ]),
      vstack({ mt: 24 }, [
        C.FieldLabel('Type of transaction', { mb: 8 }),
        C.MultiChoiceChips(
          [
            { value: 'income', label: 'Income' },
            { value: 'bill', label: 'Monthly Bills' },
            { value: 'receipt', label: 'Receipts' },
            { value: 'subscription', label: 'Subscriptions' },
          ],
          ['receipt'],
          { emptyHint: 'Showing every type.' },
        ),
      ]),
      C.flexSpacer(),
      hstack({ gap: 12, align: 'stretch', pad: { t: 8 }, name: 'FilterFooter' }, [
        box({ flex: 1, minH: 64, radius: 'full', stroke: 'control', justify: 'center', align: 'center' }, [
          text('Reset', { size: 17, weight: 500, lineHeight: 24, color: 'ink', align: 'center' }, { hug: true }),
        ]),
        box({ flex: 2 }, C.Button('Apply')),
      ]),
    ],
  }),

  // Filters on, and nothing fits them.
  screen({
    id: 'transactions-no-results',
    name: 'Transactions — nothing matches',
    tab: 'transactions',
    children: [
      C.Title('Transactions'),
      box({ mt: 20 }, C.ChoiceChips(PERIODS, 'week')),
      periodStepper('13 – 19 Sep', { mt: 16 }),
      vstack({ mt: 16, gap: 16 }, [
        C.LedgerSummary({ net: 3978.29, inTotal: 4200, outTotal: 221.71, count: 5 }),
        C.FlowChart(weekChart),
      ]),
      searchRow(1, { mt: 20 }),
      C.PageState('state-no-results', 'Nothing matches', 'No transaction fits that search and those filters.', {
        action: 'Clear filters',
      }),
    ],
  }),

  // Nothing recorded at all yet.
  screen({
    id: 'transactions-empty',
    name: 'Transactions — empty',
    tab: 'transactions',
    children: [
      C.Title('Transactions'),
      box({ mt: 20 }, C.ChoiceChips(PERIODS, 'week')),
      periodStepper('13 – 19 Sep', { mt: 16 }),
      vstack({ mt: 16, gap: 16 }, [C.LedgerSummary({ net: 0, inTotal: 0, outTotal: 0, count: 0 })]),
      searchRow(0, { mt: 20 }),
      C.PageState(
        'state-empty-wallet',
        'Nothing here yet',
        'Receipts, bills and subscriptions all show up here together once you add a few.',
        { action: 'Add a receipt' },
      ),
    ],
  }),

  // Loading: seven placeholder rows, and no summary or chart until the
  // figures are real.
  screen({
    id: 'transactions-loading',
    name: 'Transactions — loading',
    tab: 'transactions',
    children: [
      C.Title('Transactions'),
      box({ mt: 20 }, C.ChoiceChips(PERIODS, 'week')),
      periodStepper('13 – 19 Sep', { mt: 16 }),
      searchRow(0, { mt: 20 }),
      vstack({}, Array.from({ length: 7 }, () => C.SkeletonRow())),
    ],
  }),

  // The read failed.
  screen({
    id: 'transactions-error',
    name: 'Transactions — could not load',
    tab: 'transactions',
    children: [
      C.Title('Transactions'),
      box({ mt: 20 }, C.ChoiceChips(PERIODS, 'week')),
      periodStepper('13 – 19 Sep', { mt: 16 }),
      searchRow(0, { mt: 20 }),
      C.PageState(
        'state-error',
        'Could not load your transactions',
        'Check your connection and try again. Nothing has been lost.',
        { action: 'Try again' },
      ),
    ],
  }),
];
