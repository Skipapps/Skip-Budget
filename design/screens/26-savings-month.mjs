// src/app/savings-month.tsx — correcting what a finished month really left.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, flexSpacer } = C;

export const section = 'Cards & money';
export const order = 26;

const head = (month) => [
  C.Title(month, { align: 'left' }),
  C.Subtitle(
    'Skip only knows what it was told. If something was paid in cash or never scanned, put the real figure here.',
    { mt: 12 },
  ),
];

/** What the app worked out, kept on screen beside the correction. */
const workedOut = (p = {}) =>
  vstack({ radius: 16, stroke: 'line', fill: 'card', pad: { x: 20, y: 16 }, name: 'What Skip worked out', ...p }, [
    text('What Skip worked out', { size: 12, weight: 400, lineHeight: 17, color: 'muted' }),
    text('$960.88', { size: 20, weight: 600, lineHeight: 28, color: 'ink' }, { mt: 4, nowrap: true }),
    text('$4,200.00 came in and $3,239.12 went out on bills, subscriptions and receipts.', { size: 12, weight: 400, lineHeight: 18, color: 'muted' }, { mt: 6 }),
  ]);

const fields = ({ amount = '', note = '' } = {}) =>
  vstack({ mt: 24, gap: 24 }, [
    C.SelectField('What it really left', {
      value: amount,
      placeholder: 'Leave empty to use Skip’s figure',
      iconName: 'Wallet',
    }),
    C.TextField('Why', { optional: true, value: note, placeholder: 'Paid the plumber in cash' }),
  ]);

const resetPill = () =>
  hstack({ minH: 48, radius: 'full', fill: 'ink/5', justify: 'center', align: 'center', gap: 8, name: 'Back to Skip’s figure' }, [
    icon('RotateCcw', { size: 18, color: 'ink' }),
    text('Back to Skip’s figure', { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true }),
  ]);

const excludeRow = (excluded) =>
  box({ minH: 48, radius: 'full', justify: 'center', align: 'center', name: 'Exclude' }, [
    text(excluded ? 'Count this month again' : 'Leave this month out', { size: 14, weight: 500, lineHeight: 20, color: excluded ? 'ink' : 'danger', align: 'center' }, { nowrap: true, hug: true }),
  ]);

const footer = ({ reset = false, excluded = false } = {}) =>
  vstack({ gap: 12, pad: { t: 40, b: 40 }, name: 'Footer' }, [
    C.Button('Save'),
    reset ? resetPill() : null,
    excludeRow(excluded),
  ]);

const skeleton = (h, w, radius, p = {}) => box({ h, w, radius: radius ?? 6, fill: 'line', opacity: 0.7, ...p });

export default [
  // Corrected: the figure somebody typed, the reason, and a way back.
  screen({
    id: 'savings-month',
    name: 'Savings month — corrected',
    back: true,
    children: [
      ...head('August 2026'),
      workedOut({ mt: 24 }),
      fields({ amount: '$840.00', note: 'Paid the plumber in cash' }),
      flexSpacer(),
      footer({ reset: true }),
    ],
  }),

  // Untouched: Skip's own figure stands, so there is nothing to reset.
  screen({
    id: 'savings-month-plain',
    name: 'Savings month',
    back: true,
    children: [...head('August 2026'), workedOut({ mt: 24 }), fields(), flexSpacer(), footer()],
  }),

  // Already left out: the same page, offering the way back in.
  screen({
    id: 'savings-month-excluded',
    name: 'Savings month — left out',
    back: true,
    children: [...head('August 2026'), workedOut({ mt: 24 }), fields(), flexSpacer(), footer({ excluded: true })],
  }),

  // Leaving a month out is asked for first.
  screen({
    id: 'savings-month-exclude-confirm',
    name: 'Savings month — leave out?',
    back: true,
    overlay: C.ConfirmDialog(
      'Leave August 2026 out?',
      'It stops counting towards your savings total. Nothing is deleted, and you can put it back.',
      { actions: [{ label: 'Leave it out', destructive: true }], cancel: 'Cancel' },
    ),
    children: [...head('August 2026'), workedOut({ mt: 24 }), fields(), flexSpacer(), footer()],
  }),

  // Before the month lands — a deep link can reach this route on a cold cache.
  screen({
    id: 'savings-month-loading',
    name: 'Savings month — loading',
    back: true,
    children: [
      vstack({ mt: 8, gap: 16 }, [
        skeleton(32, 228, 12),
        skeleton(20, undefined, 6),
        skeleton(112, undefined, 16, { mt: 8 }),
        skeleton(56, undefined, 12),
      ]),
      flexSpacer(),
    ],
  }),

  // The read failed.
  screen({
    id: 'savings-month-error',
    name: 'Savings month — could not load',
    back: true,
    children: [
      C.PageState(
        'state-error',
        'Could not load that month',
        'Check your connection and try again. Nothing has been lost — the figure and any note you saved are still there.',
        { action: 'Try again' },
      ),
    ],
  }),

  // Read fine, but that month is not on the account's savings.
  screen({
    id: 'savings-month-missing',
    name: 'Savings month — not there',
    back: true,
    children: [C.Title('Month'), C.Subtitle('That month is not on your savings.', { mt: 12 }), flexSpacer()],
  }),
];
