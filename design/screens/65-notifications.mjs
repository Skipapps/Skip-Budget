// src/app/notifications.tsx — the rolling week of charges the app recorded on
// your behalf. Oldest day first, like every other dated list in the app.
import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Reminders & notifications';
export const order = 65;

const SubtitleLeft = (str, p = {}) => text(str, { ...C.TYPE.subtitle, align: 'left' }, p);

/** "Clear all" — self-start pill, 18pt bin, ink label. */
const clearAll = () =>
  hstack({ mt: 16, hug: true, self: 'start', minH: 40, radius: 'full', fill: 'ink/5', pad: [0, 16], gap: 6, name: 'ClearAll' }, [
    icon('Trash2', { size: 18, color: 'ink' }),
    text('Clear all', { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true }),
  ]);

/**
 * One notice. Label, where it came out of, the amount, and an X that clears
 * just this one. Full-width hairline between rows inside a day, not the 52pt
 * inset one — these rows carry no leading mark.
 */
const NoticeRow = (label, amount, source) =>
  hstack({ gap: 12, pad: [14, 0], align: 'center', name: 'NoticeRow' }, [
    vstack({ flex: 1 }, [
      text(label, { size: 15, weight: 500, lineHeight: 22, color: 'ink' }, { nowrap: true }),
      text(source ? `Deducted from ${source}` : 'No payment method set', { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 2, nowrap: true }),
    ]),
    text(C.fmt(-Math.abs(amount)), { size: 15, weight: 600, lineHeight: 22, color: C.money(-Math.abs(amount)) }, { nowrap: true }),
    box({ w: 32, h: 32, radius: 'full', justify: 'center', align: 'center' }, [icon('X', { size: 16, color: 'muted' })]),
  ]);

const DAYS = [
  {
    label: '12 Sep 2026',
    rows: [{ label: 'Spotify', amount: 10.99, source: null }],
  },
  {
    label: '15 Sep 2026',
    rows: [{ label: 'T-Mobile', amount: 65, source: 'Chase Checking ••1180' }],
  },
  {
    label: 'Yesterday',
    rows: [
      { label: 'Electricity', amount: 120, source: 'Chase Checking ••1180' },
      { label: 'Netflix', amount: 15.49, source: 'AMEX ••1002' },
    ],
  },
];

const day = (group) =>
  vstack({ name: `Day/${group.label}` }, [
    C.DateGroupHeader(group.label, { total: -group.rows.reduce((sum, row) => sum + row.amount, 0) }),
    ...group.rows.flatMap((row, i) => [
      i > 0 ? divider({ color: 'line/60' }) : null,
      NoticeRow(row.label, row.amount, row.source),
    ]),
  ]);

const heading = () => [
  C.Title('Notifications', { align: 'left' }),
  SubtitleLeft(
    'What the app has put through this past week. Older notices clear themselves; the charges behind them are kept.',
    { mt: 8 },
  ),
];

export default [
  screen({
    id: 'notifications',
    name: 'Notifications',
    back: true,
    children: [...heading(), clearAll(), vstack({ mt: 8, pad: { b: 40 } }, DAYS.map(day))],
  }),

  screen({
    id: 'notifications-empty',
    name: 'Notifications · nothing this week',
    back: true,
    children: [
      ...heading(),
      C.PageState(
        'state-empty-wallet',
        'Nothing this week',
        'When a bill falls due or a subscription renews, the app records it and tells you here.',
      ),
    ],
  }),

  screen({
    id: 'notifications-loading',
    name: 'Notifications · loading',
    back: true,
    children: [...heading(), vstack({}, Array.from({ length: 5 }, () => C.SkeletonRow()))],
  }),

  screen({
    id: 'notifications-error',
    name: 'Notifications · could not load',
    back: true,
    children: [
      ...heading(),
      C.PageState('state-error', 'Could not load these', 'Check your connection and try again. Nothing has been lost.', {
        action: 'Try again',
      }),
    ],
  }),

  screen({
    id: 'notifications-clear-all',
    name: 'Notifications · clear all',
    back: true,
    overlay: C.ConfirmDialog(
      'Clear all 4 notices?',
      'Only the notices go. Every charge stays on your bills, your cards and in your transactions, and none of your totals change.',
      { actions: [{ label: 'Clear' }], cancel: 'Keep them' },
    ),
    children: [...heading(), clearAll(), vstack({ mt: 8, pad: { b: 40 } }, DAYS.map(day))],
  }),
];
