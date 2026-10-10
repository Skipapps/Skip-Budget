import { render } from '@testing-library/react-native';

import { BillMark } from '@/components/bills/bill-mark';
import { BillRow } from '@/components/bills/bill-row';
import { CategoryPicker } from '@/components/bills/category-picker';
import type { Bill } from '@/data/bill-categories';

/**
 * Each bill category has a light and a dark drawing, picked by the app's own Light/Dark/System
 * setting (the theme provider's scheme), not by the phone. Every drawing is stood in by a view named
 * after its file, so the test sees which one was drawn: on the category picker, and wherever a bill
 * is listed or opened.
 */

function mockSvg(file: string) {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => createElement(View, { testID: `svg-${file}` }) };
}
jest.mock('../../assets/gradient-icons/bill-housing.svg', () => mockSvg('bill-housing'));
jest.mock('../../assets/gradient-icons/bill-housing-dark.svg', () => mockSvg('bill-housing-dark'));
jest.mock('../../assets/gradient-icons/bill-energy.svg', () => mockSvg('bill-energy'));
jest.mock('../../assets/gradient-icons/bill-energy-dark.svg', () => mockSvg('bill-energy-dark'));
jest.mock('../../assets/gradient-icons/bill-water.svg', () => mockSvg('bill-water'));
jest.mock('../../assets/gradient-icons/bill-water-dark.svg', () => mockSvg('bill-water-dark'));
jest.mock('../../assets/gradient-icons/bill-internet.svg', () => mockSvg('bill-internet'));
jest.mock('../../assets/gradient-icons/bill-internet-dark.svg', () =>
  mockSvg('bill-internet-dark'),
);
jest.mock('../../assets/gradient-icons/bill-mobile.svg', () => mockSvg('bill-mobile'));
jest.mock('../../assets/gradient-icons/bill-mobile-dark.svg', () => mockSvg('bill-mobile-dark'));
jest.mock('../../assets/gradient-icons/bill-insurance.svg', () => mockSvg('bill-insurance'));
jest.mock('../../assets/gradient-icons/bill-insurance-dark.svg', () =>
  mockSvg('bill-insurance-dark'),
);
jest.mock('../../assets/gradient-icons/bill-transport.svg', () => mockSvg('bill-transport'));
jest.mock('../../assets/gradient-icons/bill-transport-dark.svg', () =>
  mockSvg('bill-transport-dark'),
);
jest.mock('../../assets/gradient-icons/bill-health.svg', () => mockSvg('bill-health'));
jest.mock('../../assets/gradient-icons/bill-health-dark.svg', () => mockSvg('bill-health-dark'));
jest.mock('../../assets/gradient-icons/bill-education.svg', () => mockSvg('bill-education'));
jest.mock('../../assets/gradient-icons/bill-education-dark.svg', () =>
  mockSvg('bill-education-dark'),
);
jest.mock('../../assets/gradient-icons/bill-other.svg', () => mockSvg('bill-other'));
jest.mock('../../assets/gradient-icons/bill-other-dark.svg', () => mockSvg('bill-other-dark'));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: mockScheme }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));

const hidden = { includeHiddenElements: true };
const IDS = [
  'housing',
  'energy',
  'water',
  'internet',
  'mobile',
  'insurance',
  'transport',
  'health',
  'education',
  'other',
];

const bill = (categoryId: string): Bill => ({
  id: 'bill-1',
  name: 'A bill',
  amount: 80,
  dueDate: '2026-11-01',
  recurrence: 'monthly',
  categoryId,
  sourceId: '',
});

const DRAWN: [string, () => React.JSX.Element, string[]][] = [
  [
    'the category picker',
    () => <CategoryPicker onSelect={() => {}} />,
    IDS.map((id) => `bill-${id}`),
  ],
  ['a bill’s mark', () => <BillMark categoryId="insurance" name="Geico" />, ['bill-insurance']],
  [
    'a Family & Healthcare bill, as Health & Medical',
    () => <BillMark categoryId="family" name="Clinic" />,
    ['bill-health'],
  ],
  [
    'a bill in a list',
    () => <BillRow bill={bill('education')} sourceLabel="" />,
    ['bill-education'],
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

describe('a bill with a logo', () => {
  it('keeps the logo, and draws no category icon', async () => {
    const screen = await render(
      <BillMark categoryId="internet" domain="xfinity.com" name="Xfinity" />,
    );
    expect(screen.queryAllByTestId(/^svg-bill-/, hidden)).toEqual([]);
  });
});

describe('a spending category', () => {
  it('keeps its glyph: no bill category icon stands in for groceries', async () => {
    const screen = await render(<BillMark categoryId="groceries" name="Groceries" />);
    expect(screen.queryAllByTestId(/^svg-bill-/, hidden)).toEqual([]);
  });
});
