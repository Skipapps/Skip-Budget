import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, icon, art, flexSpacer } = C;
const { TYPE } = C;

export const section = 'Pro';
export const order = 45;

/*
 * src/app/pro-feature.tsx — the wall a locked feature puts up for itself.
 *
 * One frame per id in src/data/pro-features.ts, which is what `useProGate`
 * passes through: loans, splits, insights, scan, theming, unlimited. Copy is
 * verbatim, including the price line from src/lib/wall.ts.
 */

const PRO_MONTHLY_LABEL = '$1.99/mo';
const PRO_YEARLY_LABEL = '$19.99/yr';

const FEATURES = [
  {
    id: 'loans',
    artwork: 'tile-loan-repayment',
    title: 'Know a loan to the cent',
    tagline: 'Most calculators guess with a twelfth of a year. Lenders charge by the day — and so does Skip.',
    benefits: [
      { title: 'Matches your bank’s statement exactly', detail: 'Payoff, next payment, accrued interest — the same figures your lender shows, to the cent.' },
      { title: 'Every payment, mapped out', detail: 'See how much of each month is interest, and what paying extra actually saves.' },
      { title: 'Filed as a bill, reminded on time', detail: 'Save a loan once and its payment joins your bills, reminders and dashboard.' },
    ],
  },
  {
    id: 'splits',
    artwork: 'tile-split-calculator',
    title: 'Split bills without the spreadsheet',
    tagline: 'The flat, the trip, the dinner — everyone sees the same running total.',
    benefits: [
      { title: 'Groups that keep score', detail: 'Add expenses as they happen and Skip works out who owes whom — down to who pays whom to settle in the fewest payments.' },
      { title: 'Friends without phone numbers', detail: 'A private code adds a friend; nobody can find you without it. People not on Skip yet can be a name until they join.' },
      { title: 'Settling that stays honest', detail: 'Payments are written down, not transferred — Skip never touches the money, so the ledger is the truth of what happened.' },
    ],
  },
  {
    id: 'insights',
    artwork: 'insights',
    title: 'Your whole money picture, one page',
    tagline: 'Where you stand, what comes in, where it goes, what you keep.',
    benefits: [
      { title: 'Where you stand, honestly', detail: 'Savings, less what you owe on cards, plus what friends owe you — one figure that means something.' },
      { title: 'Where it actually goes', detail: 'By category and by shop, with the chart that shows which weeks did the damage.' },
      { title: 'What each month left behind', detail: 'Finished months, added up — the difference between feeling careful and being right.' },
    ],
  },
  {
    id: 'scan',
    artwork: 'tile-receipts',
    title: 'Point, tap, filed',
    tagline: 'The camera finds the receipt, reads it, and fills the form. You just check it.',
    benefits: [
      { title: 'Read on your phone, never uploaded', detail: 'The photo is thrown away after reading — only the store, date and total are kept, on your account.' },
      { title: 'Skew, glare, thermal print — handled', detail: 'Skip straightens the page before reading it, which is the difference between a 3 and an 8.' },
      { title: 'The card comes pre-picked', detail: 'When the last four digits match a card you track, it is already selected to save.' },
    ],
  },
  {
    id: 'theming',
    artwork: 'welcome-hero',
    title: 'Make Skip look like yours',
    tagline: 'Accent colours, appearance — the same app, in your colours.',
    benefits: [
      { title: 'Every accent', detail: 'Pick the colour the whole app answers to, light or dark.' },
      { title: 'Appearance, your way', detail: 'Choose the look rather than following the system.' },
      { title: 'First in line for what is next', detail: 'Pro gets new features early, and support answered first.' },
    ],
  },
  {
    id: 'unlimited',
    artwork: 'state-empty-wallet',
    title: 'All your cards. All your accounts.',
    tagline: 'Free keeps one of each. Real wallets are bigger than that.',
    benefits: [
      { title: 'Every card and account you actually have', detail: 'Track them all, with live balances and their own ledgers.' },
      { title: 'Every income, counted', detail: 'Salary, side work, the second job — Left this month gets the whole truth.' },
      { title: 'Nothing ever deleted', detail: 'If Pro lapses, extras lock rather than vanish — everything is exactly where you left it when you return.' },
    ],
  },
];

const Benefit = (benefit) =>
  hstack({ gap: 12, name: 'Benefit' }, [
    box({ w: 24, h: 24, radius: 'full', fill: 'accent', justify: 'center', align: 'center', mt: 2 }, icon('Check', { size: 14, color: 'onControl', stroke: 2 })),
    vstack({ flex: 1 }, [
      text(benefit.title, { size: 15, weight: 600, lineHeight: 22, color: 'ink' }),
      text(benefit.detail, { size: 13, weight: 400, lineHeight: 19, color: 'muted' }, { mt: 2 }),
    ]),
  ]);

export default FEATURES.map((feature) =>
  screen({
    id: `pro-feature-${feature.id}`,
    name: `Pro wall / ${feature.id}`,
    back: true,
    children: [
      box({ mt: 16, radius: 16, fill: 'ink/5', pad: { y: 24 }, align: 'center' }, art(feature.artwork, { w: 110, h: 110, self: 'center' })),
      C.Title(feature.title, { align: 'left' }),
      text(feature.tagline, { ...TYPE.subtitle, align: 'left' }, { mt: 8 }),
      vstack({ mt: 24, gap: 16 }, feature.benefits.map(Benefit)),
      hstack({ mt: 24, radius: 16, stroke: 'line', fill: 'card', pad: { y: 14, x: 16 }, gap: 12, align: 'center', name: 'PartOfPro' }, [
        icon('Lock', { size: 18, color: 'muted' }),
        vstack({ flex: 1 }, [
          text('Part of Skip Pro', { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { nowrap: true }),
          text('With everything else Pro unlocks', { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { mt: 2, nowrap: true }),
        ]),
      ]),
      flexSpacer(),
      vstack({ pad: { t: 32 }, mb: 32, gap: 8 }, [
        C.Button(`See Skip Pro — ${PRO_MONTHLY_LABEL}`),
        box({ minH: 44, justify: 'center', align: 'center' }, [
          text(`or ${PRO_YEARLY_LABEL} · Not now`, { size: 13, weight: 400, lineHeight: 19, color: 'muted', align: 'center' }, { hug: true }),
        ]),
      ]),
    ],
  }),
);
