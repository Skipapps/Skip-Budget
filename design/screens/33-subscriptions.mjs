// src/app/subscriptions.tsx — the same shape as bills.tsx, for renewals:
// one row per time a plan actually charged, over a window you choose. The
// plans themselves live on /subscription-plans.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon } = C;

export const section = 'Subscriptions';
export const order = 33;

const CHASE = 'Chase ••4421';
const AMEX = 'Amex ••1002';

/** subscriptions.tsx `Tile` — local to the screen, not in the kit. */
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

const tiles = (count) =>
  hstack({ mt: 20, gap: 12, align: 'stretch', name: 'Tiles' }, [
    Tile('Repeat', 'Your plans', count === 1 ? '1 subscription' : `${count} subscriptions`, { chevron: true }),
    Tile('Plus', 'Add plan', 'Track a new one'),
  ]);

const summary = (total, count) =>
  vstack({ mt: 16, radius: 16, fill: 'ink/4', pad: [16, 16], name: 'Charged' }, [
    hstack({ justify: 'between', align: 'start', gap: 12 }, [
      vstack({ flex: 1 }, [
        text('Renewals charged', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
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

const head = (plans, total, count) => [
  C.Title('Subscriptions', { align: 'left' }),
  tiles(plans),
  summary(total, count),
];

// Oldest day first; the ledger projects the rest of the window, so the 18th
// is below today's line rather than above it.
const ROWS = vstack({ pad: { b: 40 } }, [
  C.DateGroup('Yesterday', -15.49, [
    C.TransactionRow('Netflix', -15.49, { kindLabel: CHASE }),
  ]),
  C.DateGroup('Tomorrow', -10.99, [
    C.TransactionRow('Spotify', -10.99, { kindLabel: AMEX }),
  ]),
]);

export default [
  screen({
    id: 'subscriptions',
    name: 'Subscriptions',
    back: true,
    children: [...head(2, -26.48, 2), ROWS],
  }),

  screen({
    id: 'subscriptions-range',
    name: 'Subscriptions / window menu',
    back: true,
    overlay: C.RangeMenu(['Today', 'Week', 'Month', 'Year', 'All'], 'Month'),
    children: [...head(2, -26.48, 2), ROWS],
  }),

  screen({
    id: 'subscriptions-loading',
    name: 'Subscriptions / loading',
    back: true,
    children: [...head(0, 0, 0), vstack({}, Array.from({ length: 5 }, () => C.SkeletonRow()))],
  }),

  screen({
    id: 'subscriptions-empty',
    name: 'Subscriptions / none yet',
    back: true,
    children: [
      ...head(0, 0, 0),
      C.PageState(
        'state-empty-subscriptions',
        'No subscriptions yet',
        'Add the ones you pay for and every renewal shows up here as it happens.',
        { action: 'Add a subscription' },
      ),
    ],
  }),

  screen({
    id: 'subscriptions-window-empty',
    name: 'Subscriptions / nothing in this window',
    back: true,
    children: [
      ...head(2, 0, 0),
      C.PageState(
        'state-empty-subscriptions',
        'Nothing in this window',
        'Nothing renewed in this stretch of time. Try a wider window.',
      ),
    ],
  }),

  screen({
    id: 'subscriptions-error',
    name: 'Subscriptions / could not load',
    back: true,
    children: [
      ...head(0, 0, 0),
      C.PageState(
        'state-error',
        'Could not load your subscriptions',
        'Check your connection and try again. Nothing has been lost.',
        { action: 'Try again' },
      ),
    ],
  }),
];
