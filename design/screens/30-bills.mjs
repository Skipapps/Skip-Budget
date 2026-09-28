// src/app/bills.tsx — what the bills have actually cost, over a chosen window.
// The page lists the times a bill landed (useLedger, kind 'bill'), not the
// plans; the plans live on /bill-plans. States: loaded, loading, empty,
// error, and the RangeDropdown's open menu.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon } = C;

export const section = 'Bills';
export const order = 30;

const CHASE = 'Chase ••4421';
const AMEX = 'Amex ••1002';

/** bills.tsx `Tile` — the local compact pair at the top. Not in the kit. */
const Tile = (iconName, title, caption, { chevron = false } = {}) =>
  vstack({ flex: 1, radius: 16, stroke: 'line', fill: 'card', pad: 16, name: `Tile/${title}` }, [
    hstack({ justify: 'between', align: 'center', gap: 8 }, [
      box({ w: 36, h: 36, radius: 'full', fill: 'ink/5', justify: 'center', align: 'center' }, [
        icon(iconName, { size: 18, color: 'ink' }),
      ]),
      chevron ? icon('ChevronRight', { size: 18, color: 'muted', stroke: 2 }) : null,
    ]),
    text(title, { size: 15, weight: 500, lineHeight: 22, color: 'ink' }, { mt: 12, nowrap: true }),
    text(caption, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 2, nowrap: true }),
  ]);

const tiles = (recurring) =>
  hstack({ mt: 20, gap: 12, align: 'stretch', name: 'Tiles' }, [
    Tile('ReceiptText', 'Your bills', recurring === 1 ? '1 recurring' : `${recurring} recurring`, { chevron: true }),
    Tile('Plus', 'Add bill', 'Set up a new one'),
  ]);

/** The one figure and the window it belongs to — bills.tsx, `bg-ink/[0.035]`. */
const summary = (total, count) =>
  vstack({ mt: 16, radius: 16, fill: 'ink/4', pad: [16, 16], name: 'Charged' }, [
    hstack({ justify: 'between', align: 'start', gap: 12 }, [
      vstack({ flex: 1 }, [
        text('Bills charged', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
        text(C.fmt(total), { size: 26, weight: 700, lineHeight: 34, color: C.money(total) }, { mt: 2, nowrap: true }),
      ]),
      C.RangeDropdown('Month'),
    ]),
    text(
      count === 0 ? 'Nothing in this window' : `${count} ${count === 1 ? 'charge' : 'charges'}`,
      { size: 12, weight: 400, lineHeight: 17, color: 'muted' },
      { mt: 8 },
    ),
  ]);

const head = (recurring, total, count) => [
  C.Title('Monthly bills', { align: 'left' }),
  tiles(recurring),
  summary(total, count),
];

export default [
  screen({
    id: 'bills',
    name: 'Bills',
    back: true,
    children: [
      ...head(3, -1655, 3),
      // groupByDate direction 'asc' — oldest day first, today last.
      vstack({ pad: { b: 40 } }, [
        C.DateGroup('1 Sep 2026', -1450, [
          C.TransactionRow('Rent', -1450, { kindLabel: CHASE, kind: 'bill', iconName: 'House' }),
        ]),
        C.DateGroup('8 Sep 2026', -85, [
          C.TransactionRow('T-Mobile', -85, { kindLabel: AMEX, kind: 'bill', iconName: 'Smartphone' }),
        ]),
        C.DateGroup('Yesterday', -120, [
          C.TransactionRow('Electricity', -120, { kindLabel: CHASE, kind: 'bill', iconName: 'Zap' }),
        ]),
      ]),
    ],
  }),

  screen({
    id: 'bills-range',
    name: 'Bills / window menu',
    back: true,
    overlay: C.RangeMenu(['Today', 'Week', 'Month', 'Year', 'All'], 'Month'),
    children: [
      ...head(3, -1655, 3),
      vstack({ pad: { b: 40 } }, [
        C.DateGroup('1 Sep 2026', -1450, [
          C.TransactionRow('Rent', -1450, { kindLabel: CHASE, kind: 'bill', iconName: 'House' }),
        ]),
        C.DateGroup('8 Sep 2026', -85, [
          C.TransactionRow('T-Mobile', -85, { kindLabel: AMEX, kind: 'bill', iconName: 'Smartphone' }),
        ]),
        C.DateGroup('Yesterday', -120, [
          C.TransactionRow('Electricity', -120, { kindLabel: CHASE, kind: 'bill', iconName: 'Zap' }),
        ]),
      ]),
    ],
  }),

  screen({
    id: 'bills-loading',
    name: 'Bills / loading',
    back: true,
    // The tiles and the figure are not gated on the query, so they render with
    // the zero the empty ledger gives them while the rows are still arriving.
    children: [...head(0, 0, 0), vstack({}, Array.from({ length: 5 }, () => C.SkeletonRow()))],
  }),

  screen({
    id: 'bills-empty',
    name: 'Bills / no bills yet',
    back: true,
    children: [
      ...head(0, 0, 0),
      C.PageState(
        'state-empty-bills',
        'No bills yet',
        'Add the ones that repeat — rent, power, phone — and each time one lands it shows up here.',
        { action: 'Add a bill' },
      ),
    ],
  }),

  screen({
    id: 'bills-window-empty',
    name: 'Bills / nothing in this window',
    back: true,
    // Bills exist, this window has none — no action button on this one.
    children: [
      ...head(3, 0, 0),
      C.PageState(
        'state-empty-bills',
        'Nothing in this window',
        'Your bills have not landed in this stretch of time. Try a wider window.',
      ),
    ],
  }),

  screen({
    id: 'bills-error',
    name: 'Bills / could not load',
    back: true,
    children: [
      ...head(0, 0, 0),
      C.PageState(
        'state-error',
        'Could not load your bills',
        'Check your connection and try again. Nothing has been lost.',
        { action: 'Try again' },
      ),
    ],
  }),
];
