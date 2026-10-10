import { fireEvent, render } from '@testing-library/react-native';

import LoanCalculatorScreen from '@/app/loan-calculator';
import { BillMark } from '@/components/bills/bill-mark';
import { BillRow } from '@/components/bills/bill-row';
import { LoanTypeGrid } from '@/components/calculators/loan-type-grid';
import { LoanListCard } from '@/components/loans/loan-list-card';
import type { Bill } from '@/data/bill-categories';

/**
 * Each loan icon has a light and a dark drawing, picked by the app's own Light/Dark/System setting
 * (the theme provider's scheme), not by the phone. Every drawing is stood in by a view named after
 * its file, so the test sees which one was drawn: on the calculator, on the save page's type grid,
 * and on a saved loan's bill wherever bills are listed.
 */

function mockSvg(file: string) {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => createElement(View, { testID: `svg-${file}` }) };
}
jest.mock('../../assets/gradient-icons/loan-result.svg', () => mockSvg('loan-result'));
jest.mock('../../assets/gradient-icons/loan-result-dark.svg', () => mockSvg('loan-result-dark'));
jest.mock('../../assets/gradient-icons/loan-details.svg', () => mockSvg('loan-details'));
jest.mock('../../assets/gradient-icons/loan-details-dark.svg', () => mockSvg('loan-details-dark'));
jest.mock('../../assets/gradient-icons/loan-dates.svg', () => mockSvg('loan-dates'));
jest.mock('../../assets/gradient-icons/loan-dates-dark.svg', () => mockSvg('loan-dates-dark'));
jest.mock('../../assets/gradient-icons/loan-more-options.svg', () => mockSvg('loan-more-options'));
jest.mock('../../assets/gradient-icons/loan-more-options-dark.svg', () =>
  mockSvg('loan-more-options-dark'),
);
jest.mock('../../assets/gradient-icons/loan-payment-schedule.svg', () =>
  mockSvg('loan-payment-schedule'),
);
jest.mock('../../assets/gradient-icons/loan-payment-schedule-dark.svg', () =>
  mockSvg('loan-payment-schedule-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-car.svg', () => mockSvg('loan-type-car'));
jest.mock('../../assets/gradient-icons/loan-type-car-dark.svg', () =>
  mockSvg('loan-type-car-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-student.svg', () => mockSvg('loan-type-student'));
jest.mock('../../assets/gradient-icons/loan-type-student-dark.svg', () =>
  mockSvg('loan-type-student-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-home.svg', () => mockSvg('loan-type-home'));
jest.mock('../../assets/gradient-icons/loan-type-home-dark.svg', () =>
  mockSvg('loan-type-home-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-business.svg', () =>
  mockSvg('loan-type-business'),
);
jest.mock('../../assets/gradient-icons/loan-type-business-dark.svg', () =>
  mockSvg('loan-type-business-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-medical.svg', () => mockSvg('loan-type-medical'));
jest.mock('../../assets/gradient-icons/loan-type-medical-dark.svg', () =>
  mockSvg('loan-type-medical-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-credit-card.svg', () =>
  mockSvg('loan-type-credit-card'),
);
jest.mock('../../assets/gradient-icons/loan-type-credit-card-dark.svg', () =>
  mockSvg('loan-type-credit-card-dark'),
);
jest.mock('../../assets/gradient-icons/loan-type-other.svg', () => mockSvg('loan-type-other'));
jest.mock('../../assets/gradient-icons/loan-type-other-dark.svg', () =>
  mockSvg('loan-type-other-dark'),
);

// The bill categories' own drawings are bill-icons-dark.test.tsx's; here each is named by category.
jest.mock('@/theme/bill-icons', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useBillIcons: () =>
      new Proxy(
        {},
        { get: (_target, id) => () => createElement(View, { testID: `bill-icon-${String(id)}` }) },
      ),
  };
});

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: mockScheme }),
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => false) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));

const hidden = { includeHiddenElements: true };

const CAR_LOAN: Bill = {
  id: 'bill-1',
  name: 'Car loan',
  amount: 500.95,
  dueDate: '2026-10-09',
  recurrence: 'monthly',
  categoryId: 'loans',
  iconId: 'loan-car',
  sourceId: '',
};

const DRAWN: [string, () => React.JSX.Element, string[]][] = [
  [
    'the calculator, More options open',
    () => <LoanCalculatorScreen />,
    ['loan-result', 'loan-details', 'loan-dates', 'loan-more-options', 'loan-payment-schedule'],
  ],
  [
    'the loan type grid',
    () => <LoanTypeGrid value="car" onChange={() => {}} />,
    [
      // Personal is the result card's drawing.
      'loan-result',
      'loan-type-car',
      'loan-type-student',
      'loan-type-home',
      'loan-type-business',
      'loan-type-medical',
      'loan-type-credit-card',
      'loan-type-other',
    ],
  ],
  [
    'a saved loan’s mark',
    () => <BillMark categoryId="loans" iconId="loan-car" name="Car loan" />,
    ['loan-type-car'],
  ],
  [
    'a loan on the Loans page',
    () => (
      <LoanListCard
        loan={{
          billId: 'bill-1',
          name: 'Car loan',
          iconId: 'loan-car',
          principal: 18_000,
          annualRate: 6.25,
          termMonths: 48,
          monthly: 424.8,
          paymentsLeft: 27,
          paymentCount: 48,
          nextOn: '2026-10-15',
          left: 10_673.63,
          paidPercent: 41,
          ending: null,
          endedOn: null,
        }}
        onPress={() => {}}
      />
    ),
    ['loan-type-car'],
  ],
  [
    'a saved loan in a bill list',
    () => <BillRow bill={CAR_LOAN} sourceLabel="" />,
    ['loan-type-car'],
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
    const more = screen.queryByRole('button', { name: 'More options' });
    if (more) await fireEvent.press(more);
    for (const file of files) {
      expect([file, screen.queryAllByTestId(`svg-${file}${suffix}`, hidden).length > 0]).toEqual([
        file,
        true,
      ]);
      const other = scheme === 'dark' ? `svg-${file}` : `svg-${file}-dark`;
      // The home drawing is the same file in both modes; each is still its own import.
      expect([file, screen.queryAllByTestId(other, hidden)]).toEqual([file, []]);
    }
  });
});

describe('a bill that is not a saved loan', () => {
  it.each([null, 'other', 'education', 'loan-boat', 'loans'])(
    'wears its category’s icon, not a loan’s, for an icon id of %s',
    async (iconId) => {
      const screen = await render(<BillMark categoryId="housing" iconId={iconId} name="Rent" />);
      expect(screen.queryAllByTestId(/^svg-loan-/, hidden)).toEqual([]);
      expect(screen.getAllByTestId('bill-icon-housing', hidden)).toHaveLength(1);
    },
  );

  it('draws a loan’s bill saved before loan types as the Other type', async () => {
    mockScheme = 'light';
    const screen = await render(<BillMark categoryId="loans" iconId="other" name="Loan" />);
    expect(screen.getAllByTestId('svg-loan-type-other', hidden)).toHaveLength(1);
  });
});
