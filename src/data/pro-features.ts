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
    title: 'Run every group at once',
    tagline: 'The flat, the trip, the dinner — all open at the same time.',
    benefits: [
      {
        title: 'As many open groups as life has',
        detail:
          'Your first group is on the house, and joining other people’s groups is always free. Pro opens as many of your own as you like — the flat does not close because a holiday started.',
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
          'Savings, less what you owe on credit cards, plus what friends owe you — one figure that means something.',
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
        title: 'The credit card comes pre-picked',
        detail:
          'When the last four digits match a credit card you track, it is already selected to save.',
      },
    ],
  },
  voice: {
    id: 'voice',
    artwork: 'welcomeTrack',
    title: 'Just say it',
    tagline:
      'Say what you spent or what’s due. Skip fills it in, and you check it before it’s saved.',
    benefits: [
      {
        title: 'Receipts, bills and subscriptions',
        detail:
          '“$12.50 at Starbucks today.” “Rent $1,800, due on the 1st.” “Netflix $15.99 every month.” One sentence each.',
      },
      {
        title: 'Nothing saves until you say so',
        detail:
          'Skip shows exactly what it heard. Fix anything it missed, then tap Save. Nothing is filed without you.',
      },
      {
        title: 'Skip never keeps your voice',
        detail:
          'Your iPhone turns what you say into text, on the phone when it can, or with Apple’s speech service when it can’t.',
      },
    ],
  },
  unlimited: {
    id: 'unlimited',
    artwork: 'emptyWallet',
    title: 'All your credit cards. All your accounts.',
    tagline: 'Free keeps one of each. Real wallets are bigger than that.',
    benefits: [
      {
        title: 'Every credit card and account you actually have',
        detail: 'Track them all, with live balances and their own ledgers.',
      },
      {
        title: 'Every income, counted',
        detail: 'Salary, side work, the second job — Left this month gets the whole truth.',
      },
      {
        title: 'Nothing ever locked or deleted',
        detail:
          'If Pro lapses, everything you made keeps working exactly as it is — you just cannot add past the free allowance until you are back.',
      },
    ],
  },
};
