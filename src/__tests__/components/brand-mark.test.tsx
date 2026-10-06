import { render } from '@testing-library/react-native';

import { BrandMark } from '@/components/brands/brand-mark';

/**
 * A list row's logo: the row's own website when it has one, else a catalog brand found by the
 * row's name. A row whose owner chose letters gets letters, even when its name matches a brand.
 */

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: (props: object) => <View testID="logo" {...props} /> };
});

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const mockDirectory = [
  {
    id: 'target',
    name: 'Target',
    domain: 'target.com',
    category_id: 'shopping',
    logo_path: null,
    aliases: [],
  },
];
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandDirectory: () => ({ data: mockDirectory }),
}));

const API = 'https://logos.test';
const savedApi = process.env.EXPO_PUBLIC_LOGO_API_URL;
const savedCdn = process.env.EXPO_PUBLIC_LOGO_CDN_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_LOGO_API_URL = API;
  process.env.EXPO_PUBLIC_LOGO_CDN_URL = '';
});

afterAll(() => {
  process.env.EXPO_PUBLIC_LOGO_API_URL = savedApi;
  process.env.EXPO_PUBLIC_LOGO_CDN_URL = savedCdn;
});

type Screen = Awaited<ReturnType<typeof render>>;
const source = (screen: Screen) =>
  (screen.getByTestId('logo').props as { source: { uri: string } }).source.uri;

it('draws the row’s own website without looking the name up', async () => {
  const screen = await render(<BrandMark name="Target" domain="planetfitness.com" />);

  expect(source(screen)).toBe(`${API}/v1/logo/planetfitness.com`);
});

it('finds a catalog brand by name when the row has no website', async () => {
  const screen = await render(<BrandMark name="TARGET T-1234" />);

  expect(source(screen)).toBe(`${API}/v1/logo/target.com`);
});

it('draws letters for a store nobody knows', async () => {
  const screen = await render(<BrandMark name="Corner Deli" />);

  expect(screen.queryByTestId('logo')).toBeNull();
  expect(screen.getByText('CD')).toBeTruthy();
});

it('keeps letters when the owner chose them, though the name matches a brand', async () => {
  const screen = await render(<BrandMark name="Target Pest Control" hidden />);

  expect(screen.queryByTestId('logo')).toBeNull();
  expect(screen.getByText('TP')).toBeTruthy();
});

it('keeps letters when the owner chose them, even if a website is passed', async () => {
  const screen = await render(<BrandMark name="Target" domain="target.com" hidden />);

  expect(screen.queryByTestId('logo')).toBeNull();
  expect(screen.getByText('TA')).toBeTruthy();
});
