import { render } from '@testing-library/react-native';

import { DestinationList } from '@/components/dashboard/destination-list';
import { InsightBanner } from '@/components/dashboard/insight-banner';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ToolCards } from '@/components/dashboard/tool-cards';

/**
 * Each Home icon has a light and a dark drawing, picked by the app's own Light/Dark/System setting
 * (the theme provider's scheme), not by the phone. Every drawing is stood in by a view named after
 * its file, so the test sees which one was drawn.
 */

function mockSvg(file: string) {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => createElement(View, { testID: `svg-${file}` }) };
}
jest.mock('../../assets/gradient-icons/home-receipt.svg', () => mockSvg('home-receipt'));
jest.mock('../../assets/gradient-icons/home-receipt-dark.svg', () => mockSvg('home-receipt-dark'));
jest.mock('../../assets/gradient-icons/home-bill.svg', () => mockSvg('home-bill'));
jest.mock('../../assets/gradient-icons/home-bill-dark.svg', () => mockSvg('home-bill-dark'));
jest.mock('../../assets/gradient-icons/home-subscription.svg', () => mockSvg('home-subscription'));
jest.mock('../../assets/gradient-icons/home-subscription-dark.svg', () =>
  mockSvg('home-subscription-dark'),
);
jest.mock('../../assets/gradient-icons/home-spending-habits.svg', () =>
  mockSvg('home-spending-habits'),
);
jest.mock('../../assets/gradient-icons/home-spending-habits-dark.svg', () =>
  mockSvg('home-spending-habits-dark'),
);
jest.mock('../../assets/gradient-icons/home-insights.svg', () => mockSvg('home-insights'));
jest.mock('../../assets/gradient-icons/home-insights-dark.svg', () =>
  mockSvg('home-insights-dark'),
);
jest.mock('../../assets/gradient-icons/salary.svg', () => mockSvg('salary'));
jest.mock('../../assets/gradient-icons/salary-dark.svg', () => mockSvg('salary-dark'));
jest.mock('../../assets/gradient-icons/loans.svg', () => mockSvg('loans'));
jest.mock('../../assets/gradient-icons/loans-dark.svg', () => mockSvg('loans-dark'));

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: mockScheme }),
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));

const ROWS = [
  { id: 'monthly-bills', label: 'Monthly Bills' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'subscriptions', label: 'Subscriptions' },
];

const hidden = { includeHiddenElements: true };

/** Which drawing each part of Home draws, by file, light names first. */
const DRAWN: [string, () => React.JSX.Element, string[]][] = [
  [
    'Quick add',
    () => <QuickActions onPress={() => {}} />,
    ['home-receipt', 'home-bill', 'home-subscription', 'salary'],
  ],
  [
    'Where your money went',
    () => <DestinationList items={ROWS} amounts={{}} onPress={() => {}} />,
    ['home-bill', 'home-receipt', 'home-subscription'],
  ],
  ['Go further', () => <ToolCards onPress={() => {}} />, ['loans', 'home-spending-habits']],
  ['Insights', () => <InsightBanner pro onPress={() => {}} />, ['home-insights']],
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
      expect(screen.getAllByTestId(`svg-${file}${suffix}`, hidden).length).toBeGreaterThan(0);
      const other = scheme === 'dark' ? `svg-${file}` : `svg-${file}-dark`;
      expect(screen.queryAllByTestId(other, hidden)).toHaveLength(0);
    }
  });
});
