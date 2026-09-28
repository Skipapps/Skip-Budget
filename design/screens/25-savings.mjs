// src/app/savings.tsx — what each finished month left behind, and why.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Cards & money';
export const order = 25;

const head = () => [
  C.Title('Savings', { align: 'left' }),
  C.Subtitle(
    'When a month ends, whatever was left of it is added here. Nothing is moved between your accounts — this is a record, not a transfer.',
    { mt: 12 },
  ),
];

const savedSoFar = (total, kept, p = {}) =>
  vstack({ radius: 16, stroke: 'line', fill: 'card', pad: { x: 20, y: 24 }, align: 'center', name: 'Saved so far', ...p }, [
    text('Saved so far', { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { hug: true }),
    text(total, { size: 38, weight: 700, lineHeight: 48, color: 'ink' }, { mt: 4, hug: true, nowrap: true }),
    text(`across ${kept} ${kept === 1 ? 'month' : 'months'} that ended with something left`, { size: 13, weight: 400, lineHeight: 18, color: 'muted', align: 'center' }, { mt: 4 }),
  ]);

/** MonthRow — the month, its figure, and the arithmetic behind it. */
const monthRow = (name, amount, explain, { over = false, excluded = false } = {}) =>
  vstack({ name: `MonthRow/${name}` }, [
    hstack({ gap: 12, align: 'center', pad: { t: 16, b: 16 } }, [
      vstack({ flex: 1 }, [
        hstack({ justify: 'between', gap: 12, align: 'baseline' }, [
          text(name, { size: 15, weight: 500, lineHeight: 22, color: 'ink' }, { flex: 1, nowrap: true }),
          text(
            amount,
            excluded
              ? { size: 14, weight: 400, lineHeight: 20, color: 'muted', strike: true }
              : { size: 15, weight: 600, lineHeight: 22, color: over ? 'moneyOut' : 'moneyIn' },
            { nowrap: true },
          ),
        ]),
        text(explain, { size: 12, weight: 400, lineHeight: 18, color: 'muted' }, { mt: 6 }),
      ]),
      icon('ChevronRight', { size: 18, color: 'muted', stroke: 2 }),
    ]),
    divider({ color: 'line' }),
  ]);

const plainExplain = (income, spent) =>
  `${income} came in and ${spent} went out on bills, subscriptions and receipts — the rest stayed.`;

const may = monthRow('May 2026', '$687.14', plainExplain('$4,200.00', '$3,512.86'));
const june = monthRow('June 2026', '−$261.30', '$4,461.30 went out against $4,200.00 coming in, so this month took from your savings rather than adding to them.', { over: true });
const july = monthRow('July 2026', '$881.28', plainExplain('$4,200.00', '$3,318.72'));
const august = monthRow('August 2026', '$840.00', 'You said this month left $840.00 — Paid the plumber in cash. Skip worked out $960.88.');

export default [
  // Oldest month at the top, the one that just finished at the bottom.
  screen({
    id: 'savings',
    name: 'Savings',
    back: true,
    children: [
      ...head(),
      savedSoFar('$2,147.12', 3, { mt: 24 }),
      vstack({ mt: 32, pad: { b: 40 } }, [may, june, july, august]),
    ],
  }),

  // A month left out counts as nothing, and says so where its figure was.
  screen({
    id: 'savings-excluded',
    name: 'Savings — a month left out',
    back: true,
    children: [
      ...head(),
      savedSoFar('$2,408.42', 3, { mt: 24 }),
      vstack({ mt: 32, pad: { b: 40 } }, [
        may,
        monthRow('June 2026', '−$261.30', 'Left out of your savings. Tap to count it again.', { excluded: true }),
        july,
        august,
      ]),
    ],
  }),

  // Nothing has finished yet.
  screen({
    id: 'savings-empty',
    name: 'Savings — nothing yet',
    back: true,
    children: [
      ...head(),
      C.PageState(
        'tile-savings',
        'Nothing yet',
        'Your first month appears here once it has finished. Until then the figure is still being spent, so there is nothing honest to show.',
      ),
    ],
  }),

  // Four placeholder rows while the months land.
  screen({
    id: 'savings-loading',
    name: 'Savings — loading',
    back: true,
    children: [...head(), vstack({}, [C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow()])],
  }),

  // The read failed. Nothing is lost.
  screen({
    id: 'savings-error',
    name: 'Savings — could not load',
    back: true,
    children: [
      ...head(),
      C.PageState('state-error', 'Could not load your savings', 'Check your connection and try again. Nothing has been lost.', {
        action: 'Try again',
      }),
    ],
  }),
];
