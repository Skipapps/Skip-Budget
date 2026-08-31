import type { ArtworkName } from '@/theme/artwork';

export type ProFeature = {
  id: string;
  artwork: ArtworkName;
  title: string;
  tagline: string;
  benefits: { title: string; detail: string }[];
};

/**
 * The explainer behind each locked door.
 *
 * One page argues for one feature in its own terms — what it does for the
 * person, never "this is locked". The paywall is the last line, not the first.
 */
export const PRO_FEATURES: Record<string, ProFeature> = {
  loans: {
    id: 'loans',
    artwork: 'tileLoanRepayment',
    title: 'Know a loan to the cent',
    tagline:
      'Most calculators guess with a twelfth of a year. Lenders charge by the day — and so does Skip.',
    benefits: [
      {
        title: 'Matches your bank’s statement exactly',
        detail:
          'Payoff, next payment, accrued interest — the same figures your lender shows, to the cent.',
      },
      {
        title: 'Every payment, mapped out',
        detail: 'See how much of each month is interest, and what paying extra actually saves.',
      },
      {
        title: 'Filed as a bill, reminded on time',
        detail: 'Save a loan once and its payment joins your bills, reminders and dashboard.',
      },
    ],
  },
  splits: {
    id: 'splits',
    artwork: 'tileSplitCalculator',
    title: 'Split bills without the spreadsheet',
    tagline: 'The flat, the trip, the dinner — everyone sees the same running total.',
    benefits: [
      {
        title: 'Groups that keep score',
        detail:
          'Add expenses as they happen and Skip works out who owes whom — down to who pays whom to settle in the fewest payments.',
      },
      {
        title: 'Friends without phone numbers',
        detail:
          'A private code adds a friend; nobody can find you without it. People not on Skip yet can be a name until they join.',
      },
      {
        title: 'Settling that stays honest',
        detail:
          'Payments are written down, not transferred — Skip never touches the money, so the ledger is the truth of what happened.',
      },
    ],
  },
  insights: {
    id: 'insights',
    artwork: 'insights',
    title: 'Your whole money picture, one page',
    tagline: 'Where you stand, what comes in, where it goes, what you keep.',
    benefits: [
      {
        title: 'Where you stand, honestly',
        detail:
          'Savings, less what you owe on cards, plus what friends owe you — one figure that means something.',
      },
      {
        title: 'Where it actually goes',
        detail: 'By category and by shop, with the chart that shows which weeks did the damage.',
      },
      {
        title: 'What each month left behind',
        detail:
          'Finished months, added up — the difference between feeling careful and being right.',
      },
    ],
  },
  scan: {
    id: 'scan',
    artwork: 'tileReceipts',
    title: 'Point, tap, filed',
    tagline: 'The camera finds the receipt, reads it, and fills the form. You just check it.',
    benefits: [
      {
        title: 'Read on your phone, never uploaded',
        detail:
          'The photo is thrown away after reading — only the store, date and total are kept, on your account.',
      },
      {
        title: 'Skew, glare, thermal print — handled',
        detail:
          'Skip straightens the page before reading it, which is the difference between a 3 and an 8.',
      },
      {
        title: 'The card comes pre-picked',
        detail: 'When the last four digits match a card you track, it is already selected to save.',
      },
    ],
  },
  theming: {
    id: 'theming',
    artwork: 'welcomeHero',
    title: 'Make Skip look like yours',
    tagline: 'Accent colours, appearance — the same app, in your colours.',
    benefits: [
      {
        title: 'Every accent',
        detail: 'Pick the colour the whole app answers to, light or dark.',
      },
      {
        title: 'Appearance, your way',
        detail: 'Choose the look rather than following the system.',
      },
      {
        title: 'First in line for what is next',
        detail: 'Pro gets new features early, and support answered first.',
      },
    ],
  },
  unlimited: {
    id: 'unlimited',
    artwork: 'emptyWallet',
    title: 'All your cards. All your accounts.',
    tagline: 'Free keeps one of each. Real wallets are bigger than that.',
    benefits: [
      {
        title: 'Every card and account you actually have',
        detail: 'Track them all, with live balances and their own ledgers.',
      },
      {
        title: 'Every income, counted',
        detail: 'Salary, side work, the second job — Left this month gets the whole truth.',
      },
      {
        title: 'Nothing ever deleted',
        detail:
          'If Pro lapses, extras lock rather than vanish — everything is exactly where you left it when you return.',
      },
    ],
  },
};
