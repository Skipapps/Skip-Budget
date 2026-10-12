import { render } from '@testing-library/react-native';

import { CompletedGoalCard, GoalCard, GoalsSummaryCard } from '@/components/savings/goal-cards';
import { GoalIcon } from '@/components/savings/goal-icon';
import { GoalTypeGrid } from '@/components/savings/goal-type-grid';
import { ReadyCard } from '@/components/savings/ready-card';
import { WrapUpHero } from '@/components/savings/wrap-up-hero';
import { GOAL_TYPES } from '@/data/goal-types';

/**
 * Every goal and savings icon has a light and a dark drawing, picked by the app's own
 * Light/Dark/System setting (the theme provider's scheme), not by the phone. Every drawing is stood
 * in by a view named after its file, so the test sees which one was drawn.
 */

function mockSvg(file: string) {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => createElement(View, { testID: `svg-${file}` }) };
}
jest.mock('../../assets/gradient-icons/goal-trip.svg', () => mockSvg('goal-trip'));
jest.mock('../../assets/gradient-icons/goal-trip-dark.svg', () => mockSvg('goal-trip-dark'));
jest.mock('../../assets/gradient-icons/goal-emergency.svg', () => mockSvg('goal-emergency'));
jest.mock('../../assets/gradient-icons/goal-emergency-dark.svg', () =>
  mockSvg('goal-emergency-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-home.svg', () => mockSvg('loan-type-home'));
jest.mock('../../assets/gradient-icons/loan-type-home-dark.svg', () =>
  mockSvg('loan-type-home-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-car.svg', () => mockSvg('loan-type-car'));
jest.mock('../../assets/gradient-icons/loan-type-car-dark.svg', () =>
  mockSvg('loan-type-car-dark'),
);
jest.mock('../../assets/gradient-icons/bill-education.svg', () => mockSvg('bill-education'));
jest.mock('../../assets/gradient-icons/bill-education-dark.svg', () =>
  mockSvg('bill-education-dark'),
);
jest.mock('../../assets/gradient-icons/book-wedding.svg', () => mockSvg('book-wedding'));
jest.mock('../../assets/gradient-icons/book-wedding-dark.svg', () => mockSvg('book-wedding-dark'));
jest.mock('../../assets/gradient-icons/bill-mobile.svg', () => mockSvg('bill-mobile'));
jest.mock('../../assets/gradient-icons/bill-mobile-dark.svg', () => mockSvg('bill-mobile-dark'));
jest.mock('../../assets/gradient-icons/book-gifts.svg', () => mockSvg('book-gifts'));
jest.mock('../../assets/gradient-icons/book-gifts-dark.svg', () => mockSvg('book-gifts-dark'));
jest.mock('../../assets/gradient-icons/bill-health.svg', () => mockSvg('bill-health'));
jest.mock('../../assets/gradient-icons/bill-health-dark.svg', () => mockSvg('bill-health-dark'));
jest.mock('../../assets/gradient-icons/book-kids-family.svg', () => mockSvg('book-kids-family'));
jest.mock('../../assets/gradient-icons/book-kids-family-dark.svg', () =>
  mockSvg('book-kids-family-dark'),
);
jest.mock('../../assets/gradient-icons/book-pets.svg', () => mockSvg('book-pets'));
jest.mock('../../assets/gradient-icons/book-pets-dark.svg', () => mockSvg('book-pets-dark'));
jest.mock('../../assets/gradient-icons/goals.svg', () => mockSvg('goals'));
jest.mock('../../assets/gradient-icons/goals-dark.svg', () => mockSvg('goals-dark'));
jest.mock('../../assets/gradient-icons/medal.svg', () => mockSvg('medal'));
jest.mock('../../assets/gradient-icons/medal-dark.svg', () => mockSvg('medal-dark'));
jest.mock('../../assets/gradient-icons/savings.svg', () => mockSvg('savings'));
jest.mock('../../assets/gradient-icons/savings-dark.svg', () => mockSvg('savings-dark'));
jest.mock('../../assets/gradient-icons/salary.svg', () => mockSvg('salary'));
jest.mock('../../assets/gradient-icons/salary-dark.svg', () => mockSvg('salary-dark'));
jest.mock('../../assets/gradient-icons/loans.svg', () => mockSvg('loans'));
jest.mock('../../assets/gradient-icons/loans-dark.svg', () => mockSvg('loans-dark'));
jest.mock('../../assets/gradient-icons/reminder.svg', () => mockSvg('reminder'));
jest.mock('../../assets/gradient-icons/reminder-dark.svg', () => mockSvg('reminder-dark'));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: mockScheme }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));

const hidden = { includeHiddenElements: true };

/** The file each goal type is drawn from. */
const TYPE_FILES: Record<(typeof GOAL_TYPES)[number], string> = {
  trip: 'goal-trip',
  emergency: 'goal-emergency',
  home: 'loan-type-home',
  car: 'loan-type-car',
  education: 'bill-education',
  wedding: 'book-wedding',
  phone: 'bill-mobile',
  gifts: 'book-gifts',
  health: 'bill-health',
  family: 'book-kids-family',
  pets: 'book-pets',
  other: 'goals',
};

const DRAWN: [string, () => React.JSX.Element, string[]][] = [
  [
    'the goal type grid',
    () => <GoalTypeGrid value="trip" onChange={() => {}} />,
    GOAL_TYPES.map((type) => TYPE_FILES[type]),
  ],
  [
    'an active goal',
    () => (
      <GoalCard
        id="g1"
        name="Emergency fund"
        iconId="emergency"
        targetDate="2026-12-01"
        saved={420}
        target={1000}
        percent={42}
        pace={null}
        onPress={() => {}}
      />
    ),
    ['goal-emergency'],
  ],
  [
    'a goal saved with a type this version does not know, as Other',
    () => <GoalIcon iconId="yacht" size={40} />,
    ['goals'],
  ],
  [
    'a reached goal, with the medal',
    () => (
      <CompletedGoalCard
        id="g3"
        name="New phone"
        saved={600}
        reachedOn="2026-08-20"
        onPress={() => {}}
      />
    ),
    ['medal'],
  ],
  [
    'the Goals summary',
    () => <GoalsSummaryCard saved={720} target={2200} active={2} done={1} />,
    ['goals'],
  ],
  ['the Ready to use card', () => <ReadyCard amount={850} />, ['savings']],
  [
    'the wrap-up',
    () => <WrapUpHero celebrate kicker="September wrap-up" title="Congrats" subtitle="" />,
    ['savings', 'medal'],
  ],
];

describe.each([
  ['dark', '-dark'],
  ['light', ''],
] as const)('in %s mode', (scheme, suffix) => {
  beforeEach(() => {
    mockScheme = scheme;
  });

  it.each(DRAWN)('draws %s with the drawings for the mode', async (_, element, files) => {
    const screen = await render(element());
    for (const file of files) {
      expect([file, screen.queryAllByTestId(`svg-${file}${suffix}`, hidden).length]).toEqual([
        file,
        1,
      ]);
      const other = scheme === 'dark' ? `svg-${file}` : `svg-${file}-dark`;
      expect([file, screen.queryAllByTestId(other, hidden)]).toEqual([file, []]);
    }
  });
});

describe('an overspent wrap-up', () => {
  it('draws the pig alone: no medal and no confetti', async () => {
    const screen = await render(
      <WrapUpHero celebrate={false} kicker="September wrap-up" title="Over" subtitle="" />,
    );
    expect(screen.queryAllByTestId('svg-savings', hidden)).toHaveLength(1);
    expect(screen.queryAllByTestId(/^svg-medal/, hidden)).toEqual([]);
    expect(screen.queryByTestId('wrap-up-confetti', hidden)).toBeNull();
  });
});
