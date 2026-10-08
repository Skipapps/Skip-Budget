import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BrandLogo, FAILED_LOGO_RETRY_MS } from '@/components/brands/brand-logo';
import { resetLogoShapesForTests } from '@/lib/logo-shape';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * Every logo comes from our own logo service, by website. No website, or one the service has no
 * logo for, draws the monogram (or the caller's own fallback); nothing else is ever asked.
 */

// Each render of the image is a request for its URL.
const mockImage = jest.fn();
jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Image: (props: { source: { uri: string } }) => {
      mockImage(props.source.uri);
      return <View testID="logo" {...props} />;
    },
  };
});

const API = 'https://logos.test';
const ENV = ['EXPO_PUBLIC_LOGO_API_URL', 'EXPO_PUBLIC_LOGO_CDN_URL'] as const;
const saved: Partial<Record<(typeof ENV)[number], string>> = {};

beforeAll(() => {
  for (const name of ENV) saved[name] = process.env[name];
});

// Logos are Pro; these pages are drawn for a paying account.
afterEach(() => resetProStatusForTests());
beforeEach(() => {
  resetLogoShapesForTests();
  publishProStatus({ pro: true, ready: true });
  // A failure is forgotten on a timer, so the clock is the test's to move.
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_LOGO_API_URL = API;
  process.env.EXPO_PUBLIC_LOGO_CDN_URL = '';
  mockImage.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

type Screen = Awaited<ReturnType<typeof render>>;
const source = (screen: Screen) =>
  (screen.getByTestId('logo').props as { source: { uri: string } }).source.uri;

it('loads the logo for the website from our logo service', async () => {
  const screen = await render(<BrandLogo name="Netflix" domain="netflix.com" />);

  expect(source(screen)).toBe(`${API}/v1/logo/netflix.com`);
  expect(screen.queryByText('NE')).toBeNull();
});

it('asks neither the old storage bucket nor a third party', async () => {
  const screen = await render(<BrandLogo name="Netflix" domain="netflix.com" />);

  expect(source(screen)).not.toContain('/storage/v1/object');
  expect(source(screen)).not.toContain('brandfetch');
});

it('draws letters when the service has no logo for the website', async () => {
  const screen = await render(<BrandLogo name="Corner Shop" domain="cornershop.example" />);

  await fireEvent(screen.getByTestId('logo'), 'error');

  expect(screen.queryByTestId('logo')).toBeNull();
  expect(screen.getByText('CS')).toBeTruthy();
});

it('draws letters when there is no website', async () => {
  const none = await render(<BrandLogo name="Corner Shop" domain={null} />);
  expect(none.queryByTestId('logo')).toBeNull();
  expect(none.getByText('CS')).toBeTruthy();
});

it('draws letters when the service is not configured', async () => {
  process.env.EXPO_PUBLIC_LOGO_API_URL = '';
  const screen = await render(<BrandLogo name="Netflix" domain="netflix.com" />);

  expect(screen.queryByTestId('logo')).toBeNull();
  expect(screen.getByText('NE')).toBeTruthy();
});

it('draws the caller’s fallback instead of letters, with no website or a failed logo', async () => {
  const glyph = <Text>glyph</Text>;

  const none = await render(<BrandLogo name="Rent" fallback={glyph} />);
  expect(none.getByText('glyph')).toBeTruthy();
  expect(none.queryByText('RE')).toBeNull();

  const failed = await render(<BrandLogo name="AEP" domain="aep.com" fallback={glyph} />);
  await fireEvent(failed.getByTestId('logo'), 'error');
  expect(failed.getByText('glyph')).toBeTruthy();
});

it('tries again when the same row is reused for another brand', async () => {
  const screen = await render(<BrandLogo name="Closed Shop" domain="closed.example" />);
  await fireEvent(screen.getByTestId('logo'), 'error');
  expect(screen.queryByTestId('logo')).toBeNull();

  await screen.rerender(<BrandLogo name="Netflix" domain="netflix.com" />);

  expect(source(screen)).toBe(`${API}/v1/logo/netflix.com`);
});

const wait = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

it('asks for a logo that is not there once per wait, and again once the wait is over', async () => {
  const missing = `${API}/v1/logo/gone.example`;
  const asked = () => mockImage.mock.calls.filter(([uri]) => uri === missing).length;

  const first = await render(<BrandLogo name="Gone Store" domain="gone.example" />);
  await fireEvent(first.getByTestId('logo'), 'error');
  await first.unmount();

  // Within the wait: letters at once, and no second request.
  await wait(FAILED_LOGO_RETRY_MS - 1);
  const within = await render(<BrandLogo name="Gone Store" domain="gone.example" />);
  expect(within.queryByTestId('logo')).toBeNull();
  expect(within.getByText('GS')).toBeTruthy();
  expect(asked()).toBe(1);
  await within.unmount();

  // Only that website is remembered: another one is still asked for.
  const other = await render(<BrandLogo name="Netflix" domain="netflix.com" />);
  expect(source(other)).toBe(`${API}/v1/logo/netflix.com`);
  await other.unmount();

  // After it: asked again.
  await wait(1);
  const after = await render(<BrandLogo name="Gone Store" domain="gone.example" />);
  expect(source(after)).toBe(missing);
  expect(asked()).toBe(2);
});

it('gives a row still on screen its logo back once the wait is over, as after an offline blip', async () => {
  const screen = await render(<BrandLogo name="Blip Store" domain="blip.example" />);
  await fireEvent(screen.getByTestId('logo'), 'error');
  expect(screen.getByText('BS')).toBeTruthy();

  await wait(FAILED_LOGO_RETRY_MS - 1);
  expect(screen.queryByTestId('logo')).toBeNull();

  await wait(1);
  expect(source(screen)).toBe(`${API}/v1/logo/blip.example`);
});

it('asks for nothing when a row has no website', async () => {
  await render(<BrandLogo name="Corner Shop" domain={null} />);
  await render(<BrandLogo name="Corner Shop" />);

  expect(mockImage).not.toHaveBeenCalled();
});

describe('on the free plan', () => {
  afterEach(() => resetProStatusForTests());

  it('draws the initials, and asks the service for nothing', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    const screen = await render(<BrandLogo name="Trader Joe's" domain="traderjoes.com" />);

    expect(screen.getByText('TJ')).toBeTruthy();
    expect(screen.queryByTestId('logo')).toBeNull();
    expect(mockImage).not.toHaveBeenCalled();
  });

  it('draws the caller’s own fallback, like a bill’s glyph', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    const glyph = <Text>glyph</Text>;
    const screen = await render(<BrandLogo name="Hydro" domain="hydro.com" fallback={glyph} />);

    expect(screen.getByText('glyph')).toBeTruthy();
    expect(mockImage).not.toHaveBeenCalled();
  });

  it('draws a quiet circle while the plan is unknown, fetching nothing, and the logo on Pro', async () => {
    resetProStatusForTests();
    const unknown = await render(<BrandLogo name="Netflix" domain="netflix.com" />);
    expect(unknown.queryByTestId('logo')).toBeNull();
    expect(unknown.queryByText('NE')).toBeNull();
    expect(mockImage).not.toHaveBeenCalled();

    await act(async () => publishProStatus({ pro: true, ready: true }));
    expect(source(unknown)).toBe(`${API}/v1/logo/netflix.com`);
  });

  it('draws initials at once for a store with no logo, whatever the plan', async () => {
    resetProStatusForTests();
    const screen = await render(<BrandLogo name="Corner Deli" />);
    expect(screen.getByText('CD')).toBeTruthy();
  });

  it('turns to initials on a lapse and back to the logo on a return, without a remount', async () => {
    await act(async () => publishProStatus({ pro: true, ready: true }));
    const screen = await render(<BrandLogo name="Netflix" domain="netflix.com" />);
    expect(screen.getByTestId('logo')).toBeTruthy();

    await act(async () => publishProStatus({ pro: false, ready: true }));
    expect(screen.queryByTestId('logo')).toBeNull();
    expect(screen.getByText('NE')).toBeTruthy();

    await act(async () => publishProStatus({ pro: true, ready: true }));
    expect(screen.getByTestId('logo')).toBeTruthy();
  });
});

describe('the logo inside its circle', () => {
  type Box = { width: number; height: number };
  const box = (screen: Screen) => (screen.getByTestId('logo').props as { style: Box }).style;
  const load = (screen: Screen, width: number, height: number) =>
    act(async () => {
      (screen.getByTestId('logo').props as { onLoad: (e: unknown) => void }).onLoad({
        cacheType: 'none',
        source: { url: '', width, height, mediaType: null },
      });
    });

  it('keeps a square icon filling the circle', async () => {
    const screen = await render(<BrandLogo name="Netflix" domain="netflix.com" size={40} />);
    await load(screen, 512, 512);
    expect(box(screen)).toEqual({ width: 40, height: 40 });
  });

  it('draws a wide wordmark whole, its corners inside the circle', async () => {
    const screen = await render(<BrandLogo name="Elon" domain="elonmanagement.com" size={40} />);
    expect(box(screen)).toEqual({ width: 40, height: 40 });

    await load(screen, 1131, 486);
    const { width, height } = box(screen);
    expect(width / height).toBeCloseTo(1131 / 486, 0);
    expect(Math.hypot(width / 2, height / 2)).toBeLessThan(20);
    expect(width).toBeGreaterThan(30);
  });

  it('draws a tall logo whole too', async () => {
    const screen = await render(<BrandLogo name="Blo" domain="blo.com" size={60} />);
    await load(screen, 316, 430);
    const { width, height } = box(screen);
    expect(height).toBeGreaterThan(width);
    expect(Math.hypot(width / 2, height / 2)).toBeLessThan(30);
  });

  it('remembers the shape, so the next row draws it right first time', async () => {
    const first = await render(<BrandLogo name="Elon" domain="elonmanagement.com" size={40} />);
    await load(first, 1000, 250);
    const drawn = box(first);

    const next = await render(<BrandLogo name="Elon" domain="elonmanagement.com" size={40} />);
    expect(box(next)).toEqual(drawn);
  });

  it("does not lend one store's shape to another in a recycled row", async () => {
    const screen = await render(<BrandLogo name="Elon" domain="elonmanagement.com" size={40} />);
    await load(screen, 1000, 250);
    await screen.rerender(<BrandLogo name="Netflix" domain="netflix.com" size={40} />);
    expect(box(screen)).toEqual({ width: 40, height: 40 });
  });
});
