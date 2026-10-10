import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import ProFeatureScreen from '@/app/pro-feature';
import { PRO_FEATURES } from '@/data/pro-features';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * What a free person sees at a locked door: one icon, one example, a heading, one line, three
 * points, the price last. The Pro page itself is not here: this screen only points at it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockId: string | undefined;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: mockId }),
  Stack: { Screen: () => null },
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ muted: '#777777', accentInk: '#905479', onControl: '#FFFFFF' }),
}));

let mockStorePrice: string | null;
jest.mock('@/api/pro', () => ({
  useProPrices: () => ({
    data: mockStorePrice ? { monthly: { product: { priceString: mockStorePrice } } } : undefined,
  }),
}));

beforeEach(() => {
  resetLocaleForTests();
  mockId = 'voice';
  mockStorePrice = null;
  jest.clearAllMocks();
});
afterAll(() => resetLocaleForTests());

describe('the locked-feature screen', () => {
  it('draws the voice page as designed, the price last', async () => {
    const screen = await render(<ProFeatureScreen />);

    expect(screen.getByText('“$12.50 at Starbucks today”')).toBeTruthy();
    expect(screen.getByText('Just say it')).toBeTruthy();
    expect(screen.getByText('Speak it. Skip writes it down.')).toBeTruthy();
    expect(screen.getByText('Log receipts, bills and subscriptions')).toBeTruthy();
    expect(screen.getByText('You review it before it saves')).toBeTruthy();
    expect(screen.getByText('Your voice is never stored')).toBeTruthy();
    expect(screen.getByText('Included with Skip Pro')).toBeTruthy();
    expect(screen.getByText('Get Skip Pro — $1.99/mo')).toBeTruthy();
    expect(screen.getByText('Not now')).toBeTruthy();
  });

  it.each(Object.keys(PRO_FEATURES))('draws the %s page from its own words', async (id) => {
    mockId = id;
    const screen = await render(<ProFeatureScreen />);
    const feature = PRO_FEATURES[id];

    expect(screen.getByText(feature.example)).toBeTruthy();
    expect(screen.getByText(feature.title)).toBeTruthy();
    expect(screen.getByText(feature.subtitle)).toBeTruthy();
    feature.points.forEach((point) => expect(screen.getByText(point.text)).toBeTruthy());
  });

  it('lays the Unlimited page out with its two points, one under the other', async () => {
    mockId = 'unlimited';
    const screen = await render(<ProFeatureScreen />);

    const first = screen.getByText('Unlimited cards and accounts');
    const second = screen.getByText('Nothing locked if Pro ends');
    // Each point is a row of icon and words; the two rows are the list's only children.
    const list = first.parent?.parent;
    expect(list?.children).toHaveLength(2);
    expect(second.parent?.parent).toBe(list);
    expect(String(list?.props.className)).toContain('gap-5');
    expect(screen.queryByText(/Move money|Every income/)).toBeNull();
  });

  it('falls back to the cards-and-accounts page for an unknown or missing id', async () => {
    mockId = 'nonsense';
    const unknown = await render(<ProFeatureScreen />);
    expect(unknown.getByText(PRO_FEATURES.unlimited.title)).toBeTruthy();
    await unknown.unmount();

    mockId = undefined;
    const missing = await render(<ProFeatureScreen />);
    expect(missing.getByText(PRO_FEATURES.unlimited.title)).toBeTruthy();
  });

  it('opens the Pro page from the price button and leaves from Not now', async () => {
    const screen = await render(<ProFeatureScreen />);

    await fireEvent.press(screen.getByLabelText('Get Skip Pro — $1.99/mo'));
    expect(router.push).toHaveBeenCalledWith('/pro');
    expect(router.back).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Not now'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('shows the store’s own monthly price once it has answered', async () => {
    mockStorePrice = '$2.49';
    const screen = await render(<ProFeatureScreen />);
    expect(screen.getByText('Get Skip Pro — $2.49/mo')).toBeTruthy();
  });

  it('reads in Spanish and French, with no key or placeholder left over', async () => {
    for (const [language, price, notNow] of [
      ['es', '$1.99/mes', 'Ahora no'],
      ['fr', '1,99 $/mois', 'Pas maintenant'],
    ] as const) {
      setLanguage(language);
      const screen = await render(<ProFeatureScreen />);
      expect(screen.getByText(PRO_FEATURES.voice.title)).toBeTruthy();
      expect(screen.getByText(PRO_FEATURES.voice.subtitle)).toBeTruthy();
      expect(screen.getByLabelText(notNow)).toBeTruthy();
      const text = JSON.stringify(screen.toJSON());
      expect(text).not.toMatch(/pro\.(feature|voice)\./);
      expect(text).not.toMatch(/\{\w+\}/);
      expect(text).toContain(price.split('/')[0].slice(0, 4));
      await screen.unmount();
    }
  });
});
