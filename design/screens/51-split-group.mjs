// src/app/split-group.tsx — one group: where you stand, what to do about it,
// and everything that put you there.
//
// The figures below are the real arithmetic, not decoration. Lake house has two
// members (Sam, Priya) and src/lib/split.ts splits in integer cents:
//   Fuel      $52.00 paid by Priya → 5200 / 2 = 2600 each   (you $26.00)
//   Groceries $86.20 paid by Sam   → 8620 / 2 = 4310 each   (you $43.10)
//   Sam  paid 86.20, owes 69.10, was paid 5.00 → +12.10
//   Priya paid 52.00 + 5.00 settled, owes 69.10 → −12.10
// so the hero reads "You are owed $12.10" and simplifyDebts() has exactly one
// payment to suggest: Priya → Sam $12.10.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider } = C;

export const section = 'Splits';
export const order = 51;

const TINT = { bg: 'rgba(79,168,232,0.16)', fg: '#3E8FCC' };

/**
 * src/components/splits/group-icon.tsx, composed rather than C.GroupIcon: the
 * kit's renderer hands an `icon()` the whole width of its box, so the glyph
 * hugs the left edge of the well instead of centring. `hug: true` fixes it.
 */
const GroupIcon = (glyph, size) => {
  const well = Math.round(size * 1.85);
  return box({ w: well, h: well, radius: 14, fill: TINT.bg, justify: 'center', align: 'center', name: 'GroupIcon' }, [
    icon(glyph, { size, color: TINT.fg, hug: true }),
  ]);
};

/** Header row: the glyph, the name, the headcount, and the settings target. */
const Header = (name, people) =>
  hstack({ mt: 8, gap: 12, align: 'start', justify: 'between', name: 'GroupHeader' }, [
    hstack({ flex: 1, gap: 12, align: 'center' }, [
      GroupIcon('Users', 22),
      vstack({ flex: 1 }, [
        C.Title(name, { align: 'left', flush: true, nowrap: true }),
        // Subtitle is centred by its own class in typography.tsx; the screen
        // passes only `mt-1`, so it really does centre inside this column.
        C.Subtitle(`${people} ${people === 1 ? 'person' : 'people'}`, { mt: 4 }),
      ]),
    ]),
    box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('Settings2', { size: 20, color: 'muted', stroke: 1.9, hug: true })]),
  ]);

/** Where you stand, said in words rather than left to a minus sign. */
const BalanceCard = (balance) => {
  const settled = Math.abs(balance) < 0.005;
  return vstack({ mt: 24, radius: 16, stroke: 'line', fill: 'card', pad: { t: 24, b: 24, x: 20 }, align: 'center', name: 'BalanceCard' }, [
    text(settled ? 'Nothing outstanding' : balance > 0 ? 'You are owed' : 'You owe', C.TYPE.caption, { nowrap: true, hug: true }),
    text(C.fmt(Math.abs(balance)), { size: 38, weight: 700, lineHeight: 48, color: 'ink', align: 'center' }, { mt: 4, nowrap: true, hug: true }),
    settled ? text('All settled up', { size: 13, weight: 400, lineHeight: 18, color: 'muted', align: 'center' }, { mt: 4, hug: true }) : null,
  ]);
};

/**
 * The two half-width buttons, composed rather than taken from the kit.
 *
 * src/components/ui/button.tsx sets `adjustsFontSizeToFit minimumFontScale={0.8}`
 * on the label and says why: "Two of these sit side by side on a group screen,
 * and a label that wraps there makes the pair different heights… Shrinking the
 * type is the better trade." "Add expense" plus its icon does not fit 17px in
 * half of a 342pt column, so the app draws it smaller — it never ellipsises.
 * Everything else here is button.tsx's own geometry: min-h-16, px-5 py-4,
 * rounded-full, icon in a 12pt-margin slot.
 */
const HalfButton = (label, { variant = 'primary', size = 17, leading } = {}) =>
  hstack(
    {
      flex: 1, minH: 64, radius: 'full', pad: [16, 20], justify: 'center', align: 'center',
      fill: variant === 'primary' ? 'control' : 'none',
      stroke: variant === 'outline' ? 'control' : undefined,
      name: `Button/${variant}`,
    },
    [
      leading ? box({ hug: true, mr: 12 }, leading) : null,
      text(label, { size, weight: 500, lineHeight: Math.round(size * 1.4), color: variant === 'primary' ? 'onControl' : 'ink', align: 'center' }, { nowrap: true }),
    ],
  );

const Actions = () =>
  hstack({ mt: 16, gap: 12, name: 'Actions' }, [
    HalfButton('Add expense', { size: 15, leading: icon('Plus', { size: 17, color: 'onControl', stroke: 2.2 }) }),
    HalfButton('Settle up', { variant: 'outline' }),
  ]);

/** One suggested payment: two names, an arrow, and the figure. */
const PaymentRow = (from, to, amount) =>
  hstack({ gap: 8, align: 'center', pad: [14, 0], name: 'PaymentRow' }, [
    text(from, { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { flex: 1, nowrap: true }),
    icon('ArrowRight', { size: 15, color: 'muted', stroke: 2 }),
    text(to, { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { flex: 1, nowrap: true }),
    text(C.fmt(amount), { size: 14, weight: 600, lineHeight: 20, color: 'accentInk' }, { nowrap: true }),
  ]);

const ExpenseRow = (description, amount, payer, yourShare) =>
  hstack({ gap: 12, align: 'center', pad: [14, 0], name: 'ExpenseRow' }, [
    vstack({ flex: 1 }, [
      text(description, C.TYPE.rowTitle, { nowrap: true }),
      text(`${payer} paid`, C.TYPE.rowSub, { mt: 2, nowrap: true }),
    ]),
    vstack({ hug: true, align: 'end' }, [
      text(C.fmt(amount), C.TYPE.rowAmount, { nowrap: true, hug: true }),
      text(`you ${C.fmt(yourShare)}`, C.TYPE.rowSub, { mt: 2, nowrap: true, hug: true }),
    ]),
  ]);

const SettlementRow = (from, to, amount) =>
  hstack({ gap: 12, align: 'center', pad: [14, 0], name: 'SettlementRow' }, [
    vstack({ flex: 1 }, [
      text(`${from} paid ${to}`, C.TYPE.rowTitle, { nowrap: true }),
      text('Settled up', C.TYPE.rowSub, { mt: 2, nowrap: true }),
    ]),
    text(C.fmt(amount), { size: 15, weight: 600, lineHeight: 22, color: 'accentInk' }, { nowrap: true }),
  ]);

/**
 * DateGroupHeader with a zero total. The kit's helper paints a zero `ink`;
 * useMoneyColor() returns undefined at zero, so the app leaves the `text-muted`
 * class in charge. Composed here so a settlement-only day reads as the app does.
 */
const ZeroDayHeader = (label) =>
  hstack({ justify: 'between', gap: 12, pad: { t: 16, b: 6 }, name: 'DateGroupHeader/zero' }, [
    text(label, { size: 13, weight: 500, lineHeight: 18, color: 'muted', transform: 'uppercase', letterSpacing: 0.4 }, { nowrap: true }),
    text(C.fmt(0), C.TYPE.caption, { nowrap: true }),
  ]);

const History = (children) =>
  vstack({ mt: 36, pad: { b: 40 }, name: 'History' }, [C.FieldLabel('History', { mb: 8 }), ...children]);

export default [
  screen({
    id: 'split-group',
    name: 'Split group',
    back: true,
    children: [
      Header('Lake house', 2),
      BalanceCard(12.1),
      Actions(),
      vstack({ mt: 36, name: 'SuggestedPayments' }, [
        C.FieldLabel('Suggested payments', { mb: 8 }),
        divider({ color: 'line' }),
        PaymentRow('Priya', 'Sam', 12.1),
      ]),
      History([
        C.DateGroupHeader('15 Sep 2026', { total: -52 }),
        ExpenseRow('Fuel', 52, 'Priya', 26),
        C.DateGroupHeader('Yesterday', { total: -86.2 }),
        ExpenseRow('Groceries', 86.2, 'Sam', 43.1),
        ZeroDayHeader('Today'),
        SettlementRow('Priya', 'Sam', 5),
      ]),
    ],
  }),

  screen({
    id: 'split-group-empty',
    name: 'Split group / nothing yet',
    back: true,
    children: [
      Header('Lake house', 2),
      BalanceCard(0),
      Actions(),
      History([
        divider({ color: 'line' }),
        text('Nothing yet. Add the first expense and everyone in the group will see where they stand.', { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { pad: [20, 0] }),
      ]),
    ],
  }),

  screen({
    id: 'split-group-loading',
    name: 'Split group / loading',
    back: true,
    children: [C.Title('Group'), vstack({}, [C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow(), C.SkeletonRow()])],
  }),

  screen({
    id: 'split-group-error',
    name: 'Split group / could not open',
    back: true,
    children: [
      C.PageState('state-error', 'Could not open that group', 'It may have been archived, or you may no longer be a member.', { action: 'Back to splits' }),
    ],
  }),
];
