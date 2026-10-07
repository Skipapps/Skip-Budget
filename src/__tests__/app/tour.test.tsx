import fs from 'node:fs';
import path from 'node:path';

import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import TourScreen from '@/app/tour';

/**
 * The tour pushes each stop `as never`, so typed routes cannot check where a card goes. This presses
 * every card and checks the screen it opens is still in the app.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// Artwork imports SVGs, which Jest has no transformer for. Every stop draws one, so this counts them.
jest.mock('@/theme/artwork', () => {
  const { View } = jest.requireActual('react-native');
  const Art = () => <View testID="artwork" />;
  return { useArtwork: () => new Proxy({}, { get: () => Art }) };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
}));

const APP = path.join(__dirname, '..', '..', 'app');

const STOPS = [
  { title: 'Track without linking a bank', href: '/salary' },
  { title: 'Scan receipts in a tap', href: '/receipts' },
  { title: 'Loans, to the cent', href: '/loan-calculator' },
  { title: 'Savings that explain themselves', href: '/savings' },
  { title: 'Reminded before things land', href: '/reminders' },
];

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** A pushed path is a screen when a route file answers it, at the top level or in the tab group. */
function isScreen(href: string) {
  const name = href.slice(1);
  return [`${name}.tsx`, `${name}/index.tsx`, `(tabs)/${name}.tsx`].some((file) =>
    fs.existsSync(path.join(APP, file)),
  );
}

const titlePattern = new RegExp(`^(${STOPS.map((stop) => stop.title).join('|')})$`);

beforeEach(() => {
  jest.mocked(router.push).mockClear();
});

describe('Tour', () => {
  it('shows five stops in order, as many as its subtitle says', async () => {
    const screen = await render(<TourScreen />);

    expect(screen.getAllByTestId('artwork')).toHaveLength(STOPS.length);
    const titles = screen.getAllByText(titlePattern).map((node) => node.props.children);
    expect(titles).toEqual(STOPS.map((stop) => stop.title));
    expect(screen.getByText(/^Five things, each a tap away\./)).toBeTruthy();
    expect(screen.queryByText(/split|friend/i)).toBeNull();
  });

  it('opens a screen that exists from every stop', async () => {
    const screen = await render(<TourScreen />);

    // Every card on the page, not just the expected ones, so a stray stop is pressed too.
    const cards = screen
      .getAllByRole('button')
      .filter((node) => node.props.accessibilityLabel !== 'Go back');
    for (const card of cards) {
      await fireEvent.press(card);
    }

    const pushed = jest.mocked(router.push).mock.calls.map(([href]) => href);
    expect(pushed).toEqual(STOPS.map((stop) => stop.href));
    expect(pushed.filter((href) => !isScreen(String(href)))).toEqual([]);
  });

  it('is counted the same way by the Settings row that opens it', () => {
    const support = fs.readFileSync(path.join(APP, 'settings', 'support.tsx'), 'utf8');
    expect(support).toContain(
      `subtitle="The ${COUNT_WORDS[STOPS.length]} things, each a tap away"`,
    );
  });
});
