import { render } from '@testing-library/react-native';

const mockDirectory = [
  { id: 'netflix', name: 'Netflix', domain: 'netflix.com', logo_path: 'v1/netflix.png' },
  { id: 'usaa', name: 'USAA', domain: 'usaa.com', logo_path: null },
];
jest.mock('@/api/brands', () => ({
  useBrandDirectory: () => ({ data: mockDirectory }),
}));

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: (props: object) => <View testID="logo" {...props} /> };
});

const BASE = 'https://project.supabase.co';
let BrandLogo: typeof import('./brand-logo').BrandLogo;

// Loaded after the address is set, because the module reads it once on load.
beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = BASE;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  BrandLogo = require('./brand-logo').BrandLogo;
});

const source = (screen: Awaited<ReturnType<typeof render>>) =>
  (screen.getByTestId('logo').props as { source: { uri: string } }).source.uri;

it('draws our logo from the path on the row', async () => {
  const screen = await render(<BrandLogo name="Netflix" logoPath="v1/netflix.png" />);
  expect(source(screen)).toBe(`${BASE}/storage/v1/object/public/brand-logos/v1/netflix.png`);
});

it('finds our logo from the website when that is all the row knows', async () => {
  const screen = await render(<BrandLogo name="Netflix" domain="netflix.com" />);
  expect(source(screen)).toBe(`${BASE}/storage/v1/object/public/brand-logos/v1/netflix.png`);
});

it('draws letters for a catalog brand without a logo yet', async () => {
  const screen = await render(<BrandLogo name="USAA" domain="usaa.com" />);
  expect(screen.queryByTestId('logo')).toBeNull();
  expect(screen.getByText('US')).toBeTruthy();
});

it('draws letters for a store nobody has a logo for', async () => {
  const screen = await render(<BrandLogo name="Corner Shop" domain="cornershop.example" />);
  expect(screen.queryByTestId('logo')).toBeNull();
  expect(screen.getByText('CS')).toBeTruthy();
});

it('never asks Brandfetch', async () => {
  const screen = await render(<BrandLogo name="Netflix" domain="netflix.com" />);
  expect(source(screen)).not.toContain('brandfetch');
});
