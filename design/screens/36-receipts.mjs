// src/app/receipts.tsx — every receipt in the chosen window, oldest day first
// so the last shop is at the bottom and the page opens there. Scan leads;
// typing one out by hand is the fallback.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Receipts';
export const order = 36;

const CHASE = 'Chase ••4421';
const AMEX = 'Amex ••1002';

const SOURCE_OPTIONS = [
  { value: 'chase', label: CHASE },
  { value: 'amex', label: AMEX },
];

const head = () =>
  hstack({ mt: 8, gap: 12, align: 'center', justify: 'between', name: 'Head' }, [
    C.Title('Receipts', { align: 'left', flush: true, flex: 1 }),
    C.ActionPill('Scan', { iconName: 'ScanLine' }),
    C.ActionPill('Add'),
  ]);

const searchRow = (value, activeCount) =>
  hstack({ mt: 20, gap: 12, align: 'center', name: 'SearchRow' }, [
    C.SearchField({ value, placeholder: 'Search receipts', flex: 1 }),
    hstack({ w: 44, h: 44, radius: 'full', fill: 'ink/5', justify: 'end', align: 'center', name: 'FilterButton' }, [
      icon('SlidersHorizontal', { size: 20, color: 'ink' }),
      activeCount
        ? box({ w: 20, h: 20, radius: 'full', fill: 'accent', justify: 'center', align: 'center', ml: -6, mt: -6, self: 'start' }, [
            text(String(activeCount), { size: 11, weight: 500, lineHeight: 16, color: 'onControl', align: 'center' }, { hug: true }),
          ])
        : null,
    ]),
  ]);

/** Window pill and count on the left, the total of what is on screen right. */
const windowRow = (count, total) =>
  hstack({ mt: 20, justify: 'between', align: 'center', gap: 12, name: 'WindowRow' }, [
    hstack({ hug: true, gap: 12, align: 'center' }, [
      C.RangeDropdown('Month'),
      text(count, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
    ]),
    total ? text(total, { size: 15, weight: 600, lineHeight: 22, color: 'ink' }, { nowrap: true }) : null,
  ]);

const ROWS = vstack({ pad: { b: 40 } }, [
  C.DateGroup('10 Sep 2026', -86.2, [
    C.ReceiptRow('Whole Foods', 86.2, { sourceLabel: AMEX, date: '10 Sep 2026' }),
  ]),
  C.DateGroup('15 Sep 2026', -54.12, [
    C.ReceiptRow("Trader Joe's", 54.12, { sourceLabel: CHASE, date: '15 Sep 2026' }),
  ]),
  C.DateGroup('Today', -32.1, [
    C.ReceiptRow('Shell', 32.1, { sourceLabel: CHASE, date: '17 Sep 2026' }),
  ]),
]);

export default [
  screen({
    id: 'receipts',
    name: 'Receipts',
    back: true,
    children: [head(), searchRow('', 0), windowRow('3 receipts', '-$172.42'), ROWS],
  }),

  screen({
    id: 'receipts-loading',
    name: 'Receipts / loading',
    back: true,
    // The total is blank while loading — the page does not show a $0.00 it
    // would have to correct a moment later.
    children: [
      head(),
      searchRow('', 0),
      windowRow('Loading', null),
      vstack({}, Array.from({ length: 6 }, () => C.SkeletonRow())),
    ],
  }),

  screen({
    id: 'receipts-empty',
    name: 'Receipts / none yet',
    back: true,
    children: [
      head(),
      C.PageState(
        'state-empty-receipts',
        'No receipts yet',
        'Point the camera at a paper receipt and Skip reads the store, date and total. Or add one by hand.',
        { action: 'Scan a receipt' },
      ),
    ],
  }),

  screen({
    id: 'receipts-no-results',
    name: 'Receipts / nothing matches',
    back: true,
    children: [
      head(),
      searchRow('costco', 1),
      windowRow('0 receipts', '$0.00'),
      C.PageState(
        'state-no-results',
        'Nothing matches',
        'No receipt fits that search and those filters. Try a different store or clear what you have set.',
        { action: 'Clear filters' },
      ),
    ],
  }),

  screen({
    id: 'receipts-error',
    name: 'Receipts / could not load',
    back: true,
    children: [
      head(),
      C.PageState(
        'state-error',
        'Could not load your receipts',
        'Check your connection and try again. Nothing has been lost.',
        { action: 'Try again' },
      ),
    ],
  }),

  // A scan that threw — the one inline error this page has, above the search.
  screen({
    id: 'receipts-scan-error',
    name: 'Receipts / scan failed',
    back: true,
    children: [
      head(),
      text('Could not read that receipt.', { size: 13, weight: 400, lineHeight: 18, color: 'danger' }, { mt: 12 }),
      searchRow('', 0),
      windowRow('3 receipts', '-$172.42'),
      ROWS,
    ],
  }),

  // ReceiptFilterSheet — a full-screen Modal over bg-card. A single date
  // rather than a range: a receipt happened on a day.
  screen({
    id: 'receipts-filter',
    name: 'Receipts / filter',
    padBottom: 0,
    children: [
      vstack({ w: 390, ml: -24, flex: 1, fill: 'card', pad: { b: 16 }, name: 'FilterReceipts' }, [
        hstack({ pad: [8, 16], align: 'center' }, [
          box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [
            icon('X', { size: 22, color: 'ink', stroke: 2 }),
          ]),
          text('Filter receipts', { size: 18, weight: 600, lineHeight: 26, color: 'ink', align: 'center' }, { flex: 1, mr: 44, nowrap: true }),
        ]),
        vstack({ pad: { x: 24, b: 24 }, flex: 1 }, [
          vstack({ mt: 16 }, [
            C.SelectField('Date', { value: '15 Sep 2026', iconName: 'Calendar' }),
            text('Clear date', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { mt: 8, ml: 4, hug: true }),
          ]),
          vstack({ mt: 24 }, [
            C.FieldLabel('Paid with', { mb: 8 }),
            C.MultiChoiceChips(SOURCE_OPTIONS, [], { emptyHint: 'Showing every card and account.' }),
          ]),
        ]),
        hstack({ gap: 12, pad: { x: 20, t: 8 }, align: 'stretch' }, [
          C.Button('Reset', { variant: 'outline', flex: 1 }),
          C.Button('Apply', { flex: 2 }),
        ]),
      ]),
    ],
  }),
];
