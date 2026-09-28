// src/app/bill-plans.tsx — the schedule itself: one row per bill, grouped by
// next due date, soonest first. Search + filter narrow it; the filter is a
// full-screen Modal (bill-filter-sheet.tsx), drawn here as its own frame.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Bills';
export const order = 32;

const CHASE = 'Chase ••4421';
const AMEX = 'Amex ••1002';

const SOURCE_OPTIONS = [
  { value: 'chase', label: CHASE },
  { value: 'amex', label: AMEX },
];

const CATEGORY_OPTIONS = [
  { value: 'housing', label: 'Housing' },
  { value: 'energy', label: 'Electricity & Gas' },
  { value: 'water', label: 'Water & Waste' },
  { value: 'internet', label: 'Internet' },
  { value: 'mobile', label: 'Mobile Phone' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'loans', label: 'Loans & Credit' },
  { value: 'transport', label: 'Transportation' },
  { value: 'family', label: 'Family & Healthcare' },
  { value: 'other', label: 'Other bill' },
];

// RECURRENCES only — 'period' is deliberately not offered as a filter chip.
const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly' },
];

/** Title row: flush left title beside the add pill. */
const head = (label) =>
  hstack({ mt: 8, gap: 12, align: 'center', justify: 'between', name: 'Head' }, [
    C.Title('Your bills', { align: 'left', flush: true, flex: 1 }),
    C.ActionPill(label),
  ]);

/** Search field beside the 44pt filter button, with its count badge. */
const searchRow = (value, activeCount) =>
  hstack({ mt: 20, gap: 12, align: 'center', name: 'SearchRow' }, [
    C.SearchField({ value, placeholder: 'Search bills', flex: 1 }),
    // The badge is -top-1.5 / -right-1.5 on the 44pt button, so it hangs off
    // the corner: `justify: 'end'` plus negative margins is how that lands here.
    hstack({ w: 44, h: 44, radius: 'full', fill: 'ink/5', justify: 'end', align: 'center', name: 'FilterButton' }, [
      icon('SlidersHorizontal', { size: 20, color: 'ink' }),
      activeCount
        ? box({ w: 20, h: 20, radius: 'full', fill: 'accent', justify: 'center', align: 'center', ml: -6, mt: -6, self: 'start' }, [
            text(String(activeCount), { size: 11, weight: 500, lineHeight: 16, color: 'onControl', align: 'center' }, { hug: true }),
          ])
        : null,
    ]),
  ]);

/** "3 bills" on the left, the total of what is on screen on the right. */
const countRow = (left, total) =>
  vstack({}, [
    hstack({ mt: 20, justify: 'between', align: 'center', gap: 12 }, [
      text(left, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
      text(total, { size: 15, weight: 600, lineHeight: 22, color: 'ink' }, { nowrap: true }),
    ]),
    divider({ color: 'line', mt: 4 }),
  ]);

const ROWS = vstack({ pad: { b: 40 } }, [
  C.DateGroup('20 Sep 2026', -120, [
    C.BillRow('Electricity', 120, { logo: true, recurrence: 'Monthly', sourceLabel: CHASE, dueDate: '20 Sep 2026' }),
  ]),
  C.DateGroup('28 Sep 2026', -85, [
    C.BillRow('T-Mobile', 85, { logo: true, recurrence: 'Monthly', sourceLabel: AMEX, dueDate: '28 Sep 2026' }),
  ]),
  C.DateGroup('1 Oct 2026', -1450, [
    C.BillRow('Rent', 1450, { iconName: 'House', recurrence: 'Monthly', sourceLabel: CHASE, dueDate: '1 Oct 2026' }),
  ]),
]);

export default [
  screen({
    id: 'bill-plans',
    name: 'Your bills',
    back: true,
    children: [head('Add bill'), searchRow('', 0), countRow('3 bills', '-$1,655.00'), ROWS],
  }),

  screen({
    id: 'bill-plans-loading',
    name: 'Your bills / loading',
    back: true,
    children: [
      head('Add bill'),
      searchRow('', 0),
      countRow('Loading', '$0.00'),
      vstack({}, Array.from({ length: 6 }, () => C.SkeletonRow())),
    ],
  }),

  screen({
    id: 'bill-plans-empty',
    name: 'Your bills / none yet',
    back: true,
    // Search and filter are hidden before anything exists: their presence
    // makes an empty list look like a failed search.
    children: [
      head('Add bill'),
      C.PageState(
        'state-empty-bills',
        'No bills yet',
        'Add the ones that repeat — rent, power, phone — and Skip will keep track of what is due.',
        { action: 'Add a bill' },
      ),
    ],
  }),

  screen({
    id: 'bill-plans-no-results',
    name: 'Your bills / nothing matches',
    back: true,
    children: [
      head('Add bill'),
      searchRow('gym', 1),
      countRow('0 of 3 bills', '$0.00'),
      C.PageState(
        'state-no-results',
        'Nothing matches',
        'No bill fits that search and those filters. Try a different name or clear what you have set.',
        { action: 'Clear filters' },
      ),
    ],
  }),

  screen({
    id: 'bill-plans-error',
    name: 'Your bills / could not load',
    back: true,
    children: [
      head('Add bill'),
      C.PageState(
        'state-error',
        'Could not load your bills',
        'Check your connection and try again. Nothing has been lost.',
        { action: 'Try again' },
      ),
    ],
  }),

  // BillFilterSheet is a full-screen Modal over bg-card, not a bottom sheet:
  // close button and centred title, a scrolling body, Reset / Apply pinned.
  screen({
    id: 'bill-plans-filter',
    name: 'Your bills / filter',
    padBottom: 0,
    children: [
      vstack({ w: 390, ml: -24, flex: 1, fill: 'card', pad: { b: 16 }, name: 'FilterBills' }, [
        hstack({ pad: [8, 16], align: 'center' }, [
          box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [
            icon('X', { size: 22, color: 'ink', stroke: 2 }),
          ]),
          text('Filter bills', { size: 18, weight: 600, lineHeight: 26, color: 'ink', align: 'center' }, { flex: 1, mr: 44, nowrap: true }),
        ]),
        vstack({ pad: { x: 24, b: 24 }, flex: 1 }, [
          vstack({ mt: 16 }, [
            C.FieldLabel('Category', { mb: 8 }),
            C.MultiChoiceChips(CATEGORY_OPTIONS, [], { emptyHint: 'Showing every category.' }),
          ]),
          vstack({ mt: 24 }, [
            C.FieldLabel('Paid with', { mb: 8 }),
            C.MultiChoiceChips(SOURCE_OPTIONS, ['chase']),
          ]),
          vstack({ mt: 24 }, [
            C.FieldLabel('How often', { mb: 8 }),
            C.MultiChoiceChips(RECURRENCE_OPTIONS, ['monthly']),
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
