import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, wrap, flexSpacer } = C;

export const section = 'Pro';
export const order = 44;

/*
 * src/app/pro.tsx — six loaded rows before any price, yearly first and badged,
 * one Continue, and a restore path that keeps its own 44pt target.
 *
 * Prices are the App Store's `priceString` where the store answered
 * ($19.99 and $1.99, from src/lib/wall.ts's PRO_YEARLY_LABEL /
 * PRO_MONTHLY_LABEL). See the note on `storeClosed` below for what the screen
 * prints when it did not.
 */

const FEATURES = [
  { icon: 'CreditCard', title: 'Unlimited cards, accounts & incomes', hint: 'Track every card and account you actually have' },
  { icon: 'Camera', title: 'Unlimited receipt scanning', hint: 'Point, tap, filed — read on your phone, never uploaded' },
  { icon: 'Calculator', title: 'Loan calculator, to the cent', hint: 'Daily interest, the way your bank actually charges' },
  { icon: 'Users', title: 'Split manager', hint: 'Groups, friends, who-owes-who — settled without an app in the middle' },
  { icon: 'ChartColumn', title: 'Insights', hint: 'Your whole money picture on one page' },
  { icon: 'Palette', title: 'Themes, early features, first-in-line support', hint: 'Make Skip yours, and get the new things first' },
];

const FeatureRow = (feature) =>
  hstack({ radius: 16, stroke: 'line', fill: 'card', pad: { y: 12, x: 16 }, gap: 12, align: 'center', name: 'ProFeature' }, [
    box({ w: 40, h: 40, radius: 12, fill: 'ink/5', justify: 'center', align: 'center' }, icon(feature.icon, { size: 20, color: 'body' })),
    vstack({ flex: 1 }, [
      text(feature.title, { size: 13.5, weight: 600, lineHeight: 20, color: 'ink' }),
      text(feature.hint, { size: 11.5, weight: 400, lineHeight: 16, color: 'muted' }, { mt: 2 }),
    ]),
    icon('Check', { size: 18, color: 'accentInk', stroke: 2 }),
  ]);

/**
 * pro.tsx's <PriceCard>. The badge is absolutely positioned over the card's
 * top edge in the app; here it is a negative-margin child that lands in the
 * same place, and the margins net to zero so nothing below it moves.
 */
const PriceCard = ({ selected, name, price, hint, badge }) =>
  vstack(
    {
      radius: 16,
      stroke: selected ? 'control' : 'line',
      strokeWidth: selected ? 2 : 1,
      fill: 'card',
      pad: { y: 14, x: 16 },
      name: `PriceCard/${name}`,
    },
    [
      badge
        ? box({ hug: true, self: 'end', radius: 'full', fill: 'accent', pad: [2, 10], mt: -24, mb: 8, mr: 12 }, [
            text(badge, { size: 9, weight: 700, lineHeight: 12, color: 'onControl', letterSpacing: 0.5 }, { nowrap: true }),
          ])
        : null,
      hstack({ justify: 'between', gap: 12, align: 'baseline' }, [
        text(name, { size: 15, weight: 600, lineHeight: 22, color: 'ink' }, { nowrap: true }),
        text(price, { size: 15, weight: 700, lineHeight: 22, color: 'ink' }, { nowrap: true }),
      ]),
      text(hint, { size: 11.5, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 2 }),
    ],
  );

const FINE_PRINT =
  'Billed by Apple. Renews automatically until cancelled in your App Store subscriptions. Cancel any time — everything you made stays yours.';

const page = ({ plan = 'yearly', yearly = '$19.99', monthly = '$1.99', message, storeNote, primary = 'Continue' }) => [
  C.Title('Skip Pro', { align: 'left' }),
  text('Everything Skip can do, for less than a coffee a month.', { size: 14, weight: 400, lineHeight: 20, color: 'muted' }, { mt: 8 }),

  vstack({ mt: 24, gap: 10 }, FEATURES.map(FeatureRow)),

  vstack({ mt: 24, gap: 10 }, [
    PriceCard({
      selected: plan === 'yearly',
      name: 'Yearly',
      price: `${yearly}/yr`,
      hint: '$1.67 a month, billed once a year',
      badge: '2 MONTHS FREE',
    }),
    PriceCard({
      selected: plan === 'monthly',
      name: 'Monthly',
      price: `${monthly}/mo`,
      hint: 'Cancel any time in your Apple subscriptions',
    }),
  ]),

  message ? text(message, { size: 13, weight: 400, lineHeight: 19, color: 'ink', align: 'center' }, { mt: 16 }) : null,
  storeNote ? text(storeNote, { size: 12, weight: 400, lineHeight: 17, color: 'muted', align: 'center' }, { mt: 16 }) : null,

  vstack({ mt: 24, mb: 24, gap: 8 }, [
    C.Button(primary),
    wrap({ gap: 20, justify: 'center' }, [
      C.TextLink('Restore purchases', { variant: 'subtle' }),
      C.TextLink('Terms', { variant: 'subtle', underline: true }),
      C.TextLink('Privacy', { variant: 'subtle', underline: true }),
    ]),
    text(FINE_PRINT, { size: 10.5, weight: 400, lineHeight: 15, color: 'muted', align: 'center' }, { mt: 4 }),
  ]),
];

export default [
  screen({ id: 'pro', name: 'Skip Pro / yearly', back: true, children: page({ plan: 'yearly' }) }),
  screen({ id: 'pro-monthly', name: 'Skip Pro / monthly', back: true, children: page({ plan: 'monthly' }) }),
  screen({
    id: 'pro-restore',
    name: 'Skip Pro / nothing to restore',
    back: true,
    children: page({ plan: 'yearly', message: 'No past purchase to restore.' }),
  }),
  screen({
    id: 'pro-store-closed',
    name: 'Skip Pro / store has no plans yet',
    back: true,
    /*
     * With nothing to buy the prices fall back to PRO_YEARLY_LABEL /
     * PRO_MONTHLY_LABEL, which already carry their own "/yr" and "/mo" — and
     * the card appends another. Drawn exactly as the code renders it, because
     * hiding it here would hide it from whoever has to fix it. Raised in my
     * report.
     */
    children: page({
      plan: 'yearly',
      yearly: '$19.99/yr',
      monthly: '$1.99/mo',
      primary: 'Check again',
      storeNote: 'The App Store returned no plans for this app yet. Freshly readied products can take a few hours to reach the sandbox — check again shortly.',
    }),
  }),
  screen({
    id: 'pro-offline',
    name: 'Skip Pro / store unreachable',
    back: true,
    children: page({
      plan: 'yearly',
      yearly: '$19.99/yr',
      monthly: '$1.99/mo',
      primary: 'Check again',
      storeNote: 'We could not reach the App Store. Check your connection and tap Check again.',
    }),
  }),
  screen({
    id: 'pro-active',
    name: 'Skip Pro / already subscribed',
    back: true,
    children: [
      vstack({ mt: 32, align: 'center' }, [
        box({ w: 64, h: 64, radius: 'full', fill: 'accent', justify: 'center', align: 'center' }, icon('Crown', { size: 28, color: 'onControl', stroke: 2 })),
        C.Title('You have Skip Pro', { flush: true, mt: 20 }),
        text(
          'Everything is unlocked. Billing is handled by Apple — renewals, changes and cancellation all live in your App Store subscriptions.',
          { size: 14, weight: 400, lineHeight: 21, color: 'muted', align: 'center' },
          { mt: 12, w: 300, self: 'center' },
        ),
      ]),
      flexSpacer(),
      box({ pad: { t: 40 }, mb: 32 }, C.Button('Manage in the App Store', { variant: 'outline' })),
    ],
  }),
];
