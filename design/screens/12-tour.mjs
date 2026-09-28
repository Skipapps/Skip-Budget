import * as C from '../kit/components.mjs';
const { screen, vstack, hstack, text, art, icon } = C;

export const section = 'Onboarding & auth';
export const order = 12;

/**
 * src/app/tour.tsx — "What Skip can do".
 *
 * The route is one scrolling list of six stops, not a paged tour, so it is one
 * (tall) frame rather than one frame per page. Each card is composed here: the
 * kit has no equivalent of this artwork-plus-copy row (SettingsRow carries a
 * 40pt icon well, this carries 64pt art at 70% opacity).
 */
const STOPS = [
  [
    'tile-salary',
    'Track without linking a bank',
    'No credentials, no aggregator. You tell Skip what happens and it does the arithmetic — your bank never knows Skip exists.',
  ],
  [
    'tile-receipts',
    'Scan receipts in a tap',
    'Point the camera at a receipt and it is read on your phone — store, date, total, ready to check and save. The photo never leaves the device.',
  ],
  [
    'tile-split-calculator',
    'Split bills with friends',
    'Groups for the flat or the trip. Everyone sees the same running total, and settling up is written down, not transferred.',
  ],
  [
    'tile-loan-repayment',
    'Loans, to the cent',
    'Interest charged by the day, the way lenders actually bill — so Skip’s payoff matches your statement exactly.',
  ],
  [
    'tile-savings',
    'Savings that explain themselves',
    'When a month ends, whatever was left of it is added here — with the arithmetic shown, and corrections when Skip missed something.',
  ],
  [
    'tile-monthly-bills',
    'Reminded before things land',
    'Bills, renewals and payday, announced before they happen instead of discovered afterwards.',
  ],
];

const stopCard = ([artName, title, detail]) =>
  hstack(
    {
      gap: 16,
      radius: 16,
      stroke: 'line',
      fill: 'card',
      pad: 16,
      align: 'center',
      name: `Stop/${title}`,
    },
    [
      art(artName, { w: 64, h: 64, opacity: 0.7 }),
      vstack({ flex: 1 }, [
        text(title, { size: 15, weight: 600, lineHeight: 22, color: 'ink' }),
        text(detail, { size: 12, weight: 400, lineHeight: 18, color: 'muted' }, { mt: 4 }),
      ]),
      icon('ChevronRight', { size: 18, color: 'muted', stroke: 2 }),
    ],
  );

export default [
  screen({
    id: 'tour',
    name: 'Tour — what Skip can do',
    back: true,
    children: [
      C.Title('What Skip can do', { align: 'left' }),
      text(
        'Six things, each a tap away. No setup order to follow — start wherever your money bothers you most.',
        { ...C.TYPE.subtitle, align: 'left' },
        { mt: 12 },
      ),
      // <View className="mb-10 mt-7 w-full gap-3">
      vstack({ mt: 28, mb: 40, gap: 12, name: 'Stops' }, STOPS.map(stopCard)),
    ],
  }),
];
