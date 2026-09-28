// src/app/source/[id].tsx — one card or account, its arithmetic, its ledger.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box, text, icon, divider, flexSpacer } = C;

export const section = 'Cards & money';
export const order = 23;

const chase = { holder: 'Chase', network: 'VISA', balance: 412.3, last4: '4421', color: '#161616' };
const checking = {
  bankName: 'Chase',
  accountType: 'Checking',
  balance: 2840.12,
  last4: '1180',
  color: '#7BC4F5',
};

/** Title flush-left with the edit button beside it. */
const header = (name) =>
  hstack({ mt: 8, gap: 12, justify: 'between', name: 'Header' }, [
    C.Title(name, { align: 'left', flush: true, flex: 1, nowrap: true }),
    box({ w: 44, h: 44, radius: 'full', fill: 'ink/5', justify: 'center', align: 'center' }, [
      icon('Pencil', { size: 18, color: 'ink' }),
    ]),
  ]);

/** SummaryLine — py-1.5, label left, figure right. */
const line = (label, value, strong) =>
  hstack({ justify: 'between', gap: 12, pad: [6, 0] }, [
    text(label, strong ? { size: 14, weight: 500, lineHeight: 20, color: 'ink' } : { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { flex: 1, nowrap: true }),
    text(value, strong ? { size: 16, weight: 600, lineHeight: 22, color: 'ink' } : { size: 14, weight: 400, lineHeight: 20, color: 'body' }, { nowrap: true }),
  ]);

const summary = (rows, total, p = {}) =>
  vstack({ radius: 16, stroke: 'line', pad: { x: 16, y: 12 }, name: 'Summary', ...p }, [
    ...rows.map(([l, v]) => line(l, v)),
    divider({ color: 'line', mt: 8, mb: 8 }),
    line(total[0], total[1], true),
  ]);

/** The `floating` pill, pinned bottom-right over the scroll area in the app. */
const floatingPill = (label, p = {}) =>
  hstack({ hug: true, h: 56, radius: 'full', fill: 'control', pad: [0, 20], gap: 8, align: 'center', self: 'end', name: 'FloatingAction', ...p }, [
    icon('Plus', { size: 20, color: 'onControl', stroke: 2 }),
    text(label, { size: 15, weight: 500, lineHeight: 22, color: 'onControl' }, { nowrap: true }),
  ]);

// Chase •••• 4421: $178.00 on 1 Sep, $384.30 charged since, $150.00 paid →
// $412.30 owed now. The rows below add up to exactly that.
const cardEntries = [
  C.TransactionRow('Spotify', -10.99, { kindLabel: 'Subscription · 4 Sep 2026' }),
  C.TransactionRow('Whole Foods', -86.44, { kindLabel: 'Receipt · 8 Sep 2026' }),
  C.TransactionRow('T-Mobile', -65.16, { kindLabel: 'Bill · 10 Sep 2026', kind: 'bill', iconName: 'Smartphone' }),
  C.TransactionRow('Payment', 150, { kindLabel: 'Payment · 12 Sep 2026', kind: 'payment' }),
  C.TransactionRow("Trader Joe's", -54.12, { kindLabel: 'Receipt · 15 Sep 2026' }),
  C.TransactionRow('Netflix', -15.49, { kindLabel: 'Subscription · 16 Sep 2026' }),
  C.TransactionRow('Electricity', -120, { kindLabel: 'Bill · 16 Sep 2026', kind: 'bill', iconName: 'Zap' }),
  C.TransactionRow('Shell', -32.1, { kindLabel: 'Receipt · 17 Sep 2026' }),
];

// Chase Checking •••• 1180: $234.27 on 1 Sep, $1,594.15 out, $4,200.00 in →
// $2,840.12 now.
const accountEntries = [
  C.TransactionRow('Rent', -1450, { kindLabel: 'Bill · 3 Sep 2026', kind: 'bill', iconName: 'House' }),
  C.TransactionRow('Shell', -41.8, { kindLabel: 'Receipt · 6 Sep 2026' }),
  C.TransactionRow('Whole Foods', -102.35, { kindLabel: 'Receipt · 11 Sep 2026' }),
  C.TransactionRow('Payment', 4200, { kindLabel: 'Payment · 15 Sep 2026', kind: 'payment' }),
];

export default [
  // A card's ledger, oldest day first — the page opens at the bottom.
  screen({
    id: 'source-card',
    name: 'Card ledger',
    back: true,
    children: [
      header('Chase'),
      box({ mt: 24 }, C.PaymentCard(chase)),
      summary(
        [
          ['Balance on 1 Sep 2026', '$178.00'],
          ['Charged since', '-$384.30'],
          ['Payments', '$150.00'],
        ],
        ['Owed now', '$412.30'],
        { mt: 24 },
      ),
      box({ mt: 32 }, C.SectionHeading('Transactions')),
      C.RowList(cardEntries, { mt: 4 }),
      floatingPill('Make a payment', { mt: 24, mb: 8 }),
    ],
  }),

  // The same screen for a bank account: different words for the same lines.
  screen({
    id: 'source-account',
    name: 'Account ledger',
    back: true,
    children: [
      header('Chase Checking'),
      box({ mt: 24 }, C.AccountCard(checking)),
      summary(
        [
          ['Balance on 1 Sep 2026', '$234.27'],
          ['Spent since', '-$1,594.15'],
          ['Money in', '$4,200.00'],
        ],
        ['Balance now', '$2,840.12'],
        { mt: 24 },
      ),
      box({ mt: 32 }, C.SectionHeading('Transactions')),
      C.RowList(accountEntries, { mt: 4 }),
      floatingPill('Add money', { mt: 24, mb: 8 }),
    ],
  }),

  // Nothing has landed on it yet.
  screen({
    id: 'source-empty',
    name: 'Card ledger — empty',
    back: true,
    children: [
      header('Amex'),
      box({ mt: 24 }, C.PaymentCard({ holder: 'Amex', network: 'AMEX', balance: 0, last4: '1002', color: '#7BC4F5' })),
      summary(
        [
          ['Balance on 12 Sep 2026', '$0.00'],
          ['Charged since', '$0.00'],
          ['Payments', '$0.00'],
        ],
        ['Owed now', '$0.00'],
        { mt: 24 },
      ),
      box({ mt: 32 }, C.SectionHeading('Transactions')),
      C.PageState(
        'state-empty-wallet',
        'Nothing on this one yet',
        'Receipts, bills and subscriptions paid with this card land here as their dates arrive.',
      ),
      floatingPill('Make a payment', { mt: 8, mb: 8 }),
    ],
  }),

  // Before the lists land — a spinner, not a skeleton: nothing here has a
  // knowable shape until the source itself is read.
  screen({
    id: 'source-loading',
    name: 'Card ledger — loading',
    back: true,
    children: [
      box({ mt: 96, align: 'center' }, [
        box({ w: 24, h: 24, radius: 'full', stroke: 'muted', strokeWidth: 2, opacity: 0.35, name: 'ActivityIndicator' }),
      ]),
      flexSpacer(),
    ],
  }),

  // Could not be opened, or is no longer there.
  screen({
    id: 'source-error',
    name: 'Card ledger — could not open',
    back: true,
    children: [
      C.PageState('state-error', 'Could not open this one', 'It may have been deleted. Go back and pick another.', {
        action: 'Go back',
      }),
    ],
  }),

  // The pay pad: a full-screen modal with its own keypad (src/components/ui/amount-pad.tsx).
  screen({
    id: 'source-pay-pad',
    name: 'Card ledger — payment',
    padBottom: 16,
    children: [
      hstack({ gap: 0, align: 'center', mt: 8, name: 'PadHeader' }, [
        box({ w: 44, h: 44, radius: 'full', justify: 'center', align: 'center' }, [icon('ChevronLeft', { size: 24, color: 'ink', stroke: 2 })]),
        text('Payment', { size: 17, weight: 600, lineHeight: 24, color: 'ink', align: 'center' }, { flex: 1, nowrap: true, mr: 44 }),
      ]),
      flexSpacer(),
      C.AmountFigure('150'),
      text('Chase', { size: 15, weight: 400, lineHeight: 22, color: 'muted', align: 'center' }, { mt: 8 }),
      flexSpacer(),
      C.AmountKeypad(),
      C.Button('Done', { mt: 20 }),
    ],
  }),
];
