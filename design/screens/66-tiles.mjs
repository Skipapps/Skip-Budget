// src/app/tiles.tsx — the order of the five tiles under "Where it goes".
// Moved a step at a time with the two chevrons, not dragged: five rows is
// short enough that two taps beats a long press and a hold.
import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, spacer, flexSpacer } = C;

export const section = 'Reminders & notifications';
export const order = 66;

const SubtitleLeft = (str, p = {}) => text(str, { ...C.TYPE.subtitle, align: 'left' }, p);

/** The two step buttons: 36pt, 12px corners, bordered, 30% when there is nowhere to go. */
const step = (direction, disabled) =>
  box(
    {
      w: 36, h: 36, radius: 12, stroke: 'line', justify: 'center', align: 'center',
      opacity: disabled ? 0.3 : undefined, name: `Step/${direction}`,
    },
    [icon(direction === 'up' ? 'ChevronUp' : 'ChevronDown', { size: 18, color: 'body', stroke: 2 })],
  );

/** DESTINATION_ICONS from src/components/dashboard/destination-list.tsx. */
const ICONS = {
  'monthly-bills': 'CalendarDays',
  receipts: 'ReceiptText',
  subscriptions: 'Repeat',
  'loan-calculator': 'Landmark',
  'split-calculator': 'Users',
};

/** spendingCategories from src/data/dashboard-mock.ts, in shipped order. */
const TILES = [
  { id: 'monthly-bills', label: 'Monthly Bills' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'loan-calculator', label: 'Loan calculator' },
  { id: 'split-calculator', label: 'Split manager' },
];

const row = (tile, index, count) =>
  hstack({ mb: 12, radius: 16, stroke: 'line', fill: 'card', pad: [14, 16], gap: 12, align: 'center', name: `Tile/${tile.id}` }, [
    C.IconWell(ICONS[tile.id]),
    text(tile.label, { size: 15, weight: 500, lineHeight: 22, color: 'ink' }, { flex: 1, nowrap: true }),
    text(String(index + 1), { size: 13, weight: 400, lineHeight: 18, color: 'muted' }, { nowrap: true }),
    step('up', index === 0),
    step('down', index === count - 1),
  ]);

const resetPill = () =>
  hstack({ mt: 4, hug: true, self: 'start', minH: 40, radius: 'full', fill: 'ink/5', pad: [0, 16], gap: 8, name: 'OriginalOrder' }, [
    icon('RotateCcw', { size: 18, color: 'ink' }),
    text('Original order', { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true }),
  ]);

const page = (tiles, { reset = false, save } = {}) => [
  C.Title('Dashboard order', { align: 'left' }),
  SubtitleLeft('The order they appear in under “Where it goes” on your dashboard.', { mt: 8 }),
  vstack({ mt: 24 }, tiles.map((tile, index) => row(tile, index, tiles.length))),
  reset ? resetPill() : null,
  save ? flexSpacer() : null,
  save ? vstack({ pad: { t: 32 } }, [C.Button(save)]) : null,
  spacer(40),
];

const MOVED = [TILES[2], TILES[0], TILES[1], TILES[3], TILES[4]];

export default [
  screen({ id: 'tiles', name: 'Dashboard order', back: true, children: page(TILES) }),
  screen({
    id: 'tiles-moved',
    name: 'Dashboard order · moved',
    back: true,
    children: page(MOVED, { reset: true, save: 'Save order' }),
  }),
  screen({
    id: 'tiles-saving',
    name: 'Dashboard order · saving',
    back: true,
    children: page(MOVED, { reset: true, save: 'Saving…' }),
  }),
];
