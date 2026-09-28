// src/app/(tabs)/cards.tsx — the wallet: cards, bank accounts, Money tiles.
import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, box } = C;

export const section = 'Cards & money';
export const order = 20;

/** SectionHeader inside cards.tsx: heading on the left, "+ …" pill on the right. */
const sectionHeader = (title, actionLabel, p = {}) =>
  hstack({ justify: 'between', gap: 12, name: 'SectionHeader', ...p }, [
    box({ flex: 1 }, C.SectionHeading(title)),
    C.ActionPill(actionLabel),
  ]);

const chase = { holder: 'Chase', network: 'VISA', balance: 412.3, last4: '4421', color: '#161616' };
const amex = { holder: 'Amex', network: 'AMEX', balance: 89.7, last4: '1002', color: '#7BC4F5' };
const checking = {
  bankName: 'Chase',
  accountType: 'Checking',
  balance: 2840.12,
  last4: '1180',
  color: '#7BC4F5',
};

// Salary: $4,200.00 a month. Savings: the four finished months on 25-savings
// summed the way cards.tsx sums them — Number(month.saved), before any
// correction: 687.14 − 261.30 + 881.28 + 960.88 = 2,268.00.
const SALARY = 4200;
const SAVINGS = 2268;

const moneyTiles = (salary, savings, p = {}) =>
  hstack({ gap: 12, align: 'stretch', pad: { b: 32 }, name: 'Money tiles', ...p }, [
    C.AmountTile('Salary', salary, 'tile-salary', { flex: 1 }),
    C.AmountTile('Savings', savings, 'tile-savings', { flex: 1 }),
  ]);

export default [
  // Loaded: one card, one account, both tiles.
  screen({
    id: 'cards',
    name: 'Cards',
    tab: 'cards',
    children: [
      sectionHeader('Cards', 'New card', { mt: 8 }),
      vstack({ mt: 20, gap: 16 }, [C.PaymentCard(chase)]),
      sectionHeader('Bank accounts', 'Add account', { mt: 40 }),
      vstack({ mt: 20, gap: 16 }, [C.AccountCard(checking)]),
      box({ mt: 40 }, C.SectionHeading('Money')),
      moneyTiles(SALARY, SAVINGS, { mt: 20 }),
    ],
  }),

  // Nothing added yet: both lists stand down to a ListNote, tiles read $0.00.
  screen({
    id: 'cards-empty',
    name: 'Cards — empty',
    tab: 'cards',
    children: [
      sectionHeader('Cards', 'New card', { mt: 8 }),
      vstack({ mt: 20, gap: 16 }, [
        C.ListNote('No cards yet. Add one to track what you spend on it.'),
      ]),
      sectionHeader('Bank accounts', 'Add account', { mt: 40 }),
      vstack({ mt: 20, gap: 16 }, [
        C.ListNote('No bank accounts yet. Add one to see money coming in and out.'),
      ]),
      box({ mt: 40 }, C.SectionHeading('Money')),
      moneyTiles(0, 0, { mt: 20 }),
    ],
  }),

  // Free plan: everything past the first of a kind is kept but dimmed to 0.45
  // and opens the case for Pro instead of the ledger.
  screen({
    id: 'cards-free-plan',
    name: 'Cards — free plan',
    tab: 'cards',
    children: [
      sectionHeader('Cards', 'New card', { mt: 8 }),
      vstack({ mt: 20, gap: 16 }, [
        C.PaymentCard(chase),
        C.PaymentCard({ ...amex, opacity: 0.45, name: 'CardFace/locked' }),
      ]),
      sectionHeader('Bank accounts', 'Add account', { mt: 40 }),
      vstack({ mt: 20, gap: 16 }, [C.AccountCard(checking)]),
      box({ mt: 40 }, C.SectionHeading('Money')),
      moneyTiles(SALARY, SAVINGS, { mt: 20 }),
    ],
  }),

  // A balance read that failed is answered by the page, never by a region:
  // the faces would otherwise fall back to the figure typed weeks ago.
  screen({
    id: 'cards-error',
    name: 'Cards — could not load',
    tab: 'cards',
    children: [
      C.PageState(
        'state-error',
        'Could not load your wallet',
        'Skip could not work out what is on your cards and accounts right now. Check your connection and try again.',
        { action: 'Try again' },
      ),
    ],
  }),
];
