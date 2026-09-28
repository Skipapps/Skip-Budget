// src/app/subscription-plans.tsx — one row per plan, grouped by next renewal,
// soonest first. Cancelled plans stay in the list at 0.5 opacity and count
// nothing towards the per-month total or a group total.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Subscriptions';
export const order = 35;

const CHASE = 'Chase ••4421';
const AMEX = 'Amex ••1002';

const SOURCE_OPTIONS = [
  { value: 'chase', label: CHASE },
  { value: 'amex', label: AMEX },
];

// BILLING_CYCLES from src/data/subscriptions-mock.ts — only two are offered
// as filter chips, even though the row labels know four.
const CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const head = () =>
  hstack({ mt: 8, gap: 12, align: 'center', justify: 'between', name: 'Head' }, [
    C.Title('Your subscriptions', { align: 'left', flush: true, flex: 1 }),
    C.ActionPill('Add'),
  ]);

const searchRow = (value, activeCount) =>
  hstack({ mt: 20, gap: 12, align: 'center', name: 'SearchRow' }, [
    C.SearchField({ value, placeholder: 'Search subscriptions', flex: 1 }),
    hstack({ w: 44, h: 44, radius: 'full', fill: 'ink/5', justify: 'end', align: 'center', name: 'FilterButton' }, [
      icon('SlidersHorizontal', { size: 20, color: 'ink' }),
      activeCount
        ? box({ w: 20, h: 20, radius: 'full', fill: 'accent', justify: 'center', align: 'center', ml: -6, mt: -6, self: 'start' }, [
            text(String(activeCount), { size: 11, weight: 500, lineHeight: 16, color: 'onControl', align: 'center' }, { hug: true }),
          ])
        : null,
    ]),
  ]);

/** The right-hand figure is "$10.99" then a smaller muted " / mo". */
const countRow = (left, total) =>
  vstack({}, [
    hstack({ mt: 20, justify: 'between', align: 'center', gap: 12 }, [
      text(left, { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
      total
        ? hstack({ hug: true, align: 'baseline' }, [
            text(total, { size: 15, weight: 600, lineHeight: 22, color: 'ink' }, { nowrap: true }),
            text(' / mo', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
          ])
        : null,
    ]),
    divider({ color: 'line', mt: 4 }),
  ]);

const ROWS = vstack({ pad: { b: 40 } }, [
  C.DateGroup('18 Sep 2026', -10.99, [
    C.SubscriptionRow('Spotify', 10.99, { cycle: 'Monthly', sourceLabel: AMEX, renewsOn: '18 Sep 2026' }),
  ]),
  // A cancelled plan keeps its renewal date but contributes 0 to the group.
  C.DateGroup('16 Oct 2026', 0, [
    C.SubscriptionRow('Netflix', 15.49, { cycle: 'Monthly', sourceLabel: CHASE, renewsOn: '16 Oct 2026', active: false }),
  ]),
]);

export default [
  screen({
    id: 'subscription-plans',
    name: 'Your subscriptions',
    back: true,
    children: [head(), searchRow('', 0), countRow('2 subscriptions', '$10.99'), ROWS],
  }),

  screen({
    id: 'subscription-plans-loading',
    name: 'Your subscriptions / loading',
    back: true,
    // The figure is withheld entirely while loading — only the word "Loading".
    children: [
      head(),
      searchRow('', 0),
      countRow('Loading', null),
      vstack({}, Array.from({ length: 6 }, () => C.SkeletonRow())),
    ],
  }),

  screen({
    id: 'subscription-plans-empty',
    name: 'Your subscriptions / none yet',
    back: true,
    children: [
      head(),
      C.PageState(
        'state-empty-subscriptions',
        'No subscriptions yet',
        'Add the ones you pay for and Skip will show what they cost you each month.',
        { action: 'Add a subscription' },
      ),
    ],
  }),

  screen({
    id: 'subscription-plans-no-results',
    name: 'Your subscriptions / nothing matches',
    back: true,
    children: [
      head(),
      searchRow('hulu', 1),
      countRow('0 of 2 subscriptions', '$0.00'),
      C.PageState(
        'state-no-results',
        'Nothing matches',
        'No subscription fits that search and those filters. Try a different name or clear what you have set.',
        { action: 'Clear filters' },
      ),
    ],
  }),

  screen({
    id: 'subscription-plans-error',
    name: 'Your subscriptions / could not load',
    back: true,
    children: [
      head(),
      C.PageState(
        'state-error',
        'Could not load your subscriptions',
        'Check your connection and try again. Nothing has been lost.',
        { action: 'Try again' },
      ),
    ],
  }),

  // SubscriptionFilterSheet — a full-screen Modal over bg-card.
  screen({
    id: 'subscription-plans-filter',
    name: 'Your subscriptions / filter',
    padBottom: 0,
    children: [
      vstack({ w: 390, ml: -24, flex: 1, fill: 'card', pad: { b: 16 }, name: 'FilterSubscriptions' }, [
        hstack({ pad: [8, 16], align: 'center' }, [
          box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [
            icon('X', { size: 22, color: 'ink', stroke: 2 }),
          ]),
          text('Filter subscriptions', { size: 18, weight: 600, lineHeight: 26, color: 'ink', align: 'center' }, { flex: 1, mr: 44, nowrap: true }),
        ]),
        vstack({ pad: { x: 24, b: 24 }, flex: 1 }, [
          vstack({ mt: 16 }, [
            C.FieldLabel('Billing cycle', { mb: 8 }),
            C.MultiChoiceChips(CYCLE_OPTIONS, ['monthly']),
          ]),
          vstack({ mt: 24 }, [
            C.FieldLabel('Charged to', { mb: 8 }),
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
