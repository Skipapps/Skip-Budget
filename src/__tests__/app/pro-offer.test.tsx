import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ProOfferScreen from '@/app/pro-offer';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The one-time offer: half price, the store's own figures, a ten-minute timer that runs on the
 * clock and really ends, and every way out (X, No thanks) simply closing it.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
// The deadline the Pro page set when it claimed the offer.
let mockUntil: string | undefined;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ until: mockUntil }),
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
}));

const offerPack = { product: { priceString: '$9.99', pricePerMonthString: '$0.83', price: 9.99 } };
let mockRegular: { product: { priceString: string; price: number } } | null = {
  product: { priceString: '$19.99', price: 19.99 },
};
let mockOpen = true;
const mockRestore = jest.fn();
const mockPurchase = jest.fn();

jest.mock('@/api/pro', () => ({
  purchasesAvailable: () => mockOpen,
  usePurchasePro: () => ({ purchase: mockPurchase, restore: mockRestore }),
  useOfferPrices: () =>
    mockOpen
      ? {
          data: { offer: offerPack, regular: mockRegular },
          isFetching: false,
          refetch: jest.fn(),
        }
      : { data: undefined, isFetching: false, refetch: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-07T09:00:00'));
  mockUntil = String(Date.now() + 10 * 60 * 1000);
  mockRegular = { product: { priceString: '$19.99', price: 19.99 } };
  mockOpen = true;
  resetLocaleForTests();
});
afterEach(() => jest.useRealTimers());
afterAll(() => resetLocaleForTests());

const pass = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

it('offers Pro at the store’s half price, the ordinary price struck through', async () => {
  const screen = await render(<ProOfferScreen />);

  expect(screen.getByText('ONE-TIME OFFER')).toBeTruthy();
  expect(screen.getByText('Skip Pro, half price')).toBeTruthy();
  expect(screen.getByLabelText('Was $19.99')).toBeTruthy();
  expect(screen.getByText('$9.99')).toBeTruthy();
  expect(screen.getByText('That’s just $0.83 a month.')).toBeTruthy();
  expect(screen.getByText('7 years of money history')).toBeTruthy();
  expect(screen.getByLabelText('Get Pro for $9.99/year')).toBeTruthy();
  expect(screen.getByText('Billed once a year. Cancel anytime.')).toBeTruthy();
  expect(screen.getByText('If you close this, you won’t see this offer again.')).toBeTruthy();
});

it('counts down ten minutes on the clock', async () => {
  const screen = await render(<ProOfferScreen />);
  expect(screen.getByLabelText('10 min 0 s left')).toBeTruthy();
  expect(screen.getByText('This offer ends when the timer runs out.')).toBeTruthy();

  await pass(61_000);
  expect(screen.getByLabelText('8 min 59 s left')).toBeTruthy();
  expect(screen.getByText('08')).toBeTruthy();
  expect(screen.getByText('59')).toBeTruthy();
});

it('ends at zero: the button no longer buys, and the page says so', async () => {
  const screen = await render(<ProOfferScreen />);
  await pass(10 * 60 * 1000);

  expect(screen.getByText('This offer has ended.')).toBeTruthy();
  const button = screen.getByLabelText('Offer ended');
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(mockPurchase).not.toHaveBeenCalled();
  expect(screen.queryByText('Billed once a year. Cancel anytime.')).toBeNull();
});

it('buys the offer’s own plan and closes once Apple confirms', async () => {
  mockPurchase.mockResolvedValueOnce('done');
  const screen = await render(<ProOfferScreen />);

  await fireEvent.press(screen.getByLabelText('Get Pro for $9.99/year'));

  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(mockPurchase).toHaveBeenCalledWith(offerPack);
});

it('stays open when Apple’s sheet is cancelled', async () => {
  mockPurchase.mockResolvedValueOnce('cancelled');
  const screen = await render(<ProOfferScreen />);
  await fireEvent.press(screen.getByLabelText('Get Pro for $9.99/year'));
  await waitFor(() => expect(mockPurchase).toHaveBeenCalledTimes(1));
  expect(router.back).not.toHaveBeenCalled();
});

it.each(['Close', 'No thanks'])('%s simply closes it', async (label) => {
  const screen = await render(<ProOfferScreen />);
  await fireEvent.press(screen.getByLabelText(label));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('keeps Terms and Privacy within reach', async () => {
  const screen = await render(<ProOfferScreen />);
  await fireEvent.press(screen.getByLabelText('Terms'));
  expect(router.push).toHaveBeenCalledWith('/terms');
  await fireEvent.press(screen.getByLabelText('Privacy'));
  expect(router.push).toHaveBeenCalledWith('/privacy');
});

it('shows the dollar figures and offers to check again before the store answers', async () => {
  mockOpen = false;
  const screen = await render(<ProOfferScreen />);
  expect(screen.getByText('$9.99')).toBeTruthy();
  expect(screen.getByLabelText('Was $19.99')).toBeTruthy();
  expect(screen.getByLabelText('Check again')).toBeTruthy();
});

it('reads in Spanish', async () => {
  setLanguage('es');
  const screen = await render(<ProOfferScreen />);
  expect(screen.getByText('OFERTA ÚNICA')).toBeTruthy();
  expect(screen.getByText('Skip Pro a mitad de precio')).toBeTruthy();
  expect(screen.getByText('Solo $0.83 al mes.')).toBeTruthy();
  expect(screen.getByLabelText('Quedan 10 min 0 s')).toBeTruthy();
  expect(screen.getByText('Si cierras esto, no volverás a ver esta oferta.')).toBeTruthy();
  expect(screen.getByLabelText('No, gracias')).toBeTruthy();
});

describe('opened only by a claim', () => {
  it('closes at once, drawing nothing, without a deadline (a typed link)', async () => {
    mockUntil = undefined;
    const screen = await render(<ProOfferScreen />);
    expect(screen.queryByText('Skip Pro, half price')).toBeNull();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('closes for a deadline further off than an offer lasts', async () => {
    mockUntil = String(Date.now() + 60 * 60 * 1000);
    await render(<ProOfferScreen />);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('keeps the same deadline across a remount, so the ten minutes never start again', async () => {
    const screen = await render(<ProOfferScreen key="first" />);
    await pass(61_000);

    // A new instance, as when the navigator remounts for a change of text size.
    await screen.rerender(<ProOfferScreen key="second" />);
    expect(screen.getByLabelText('8 min 59 s left')).toBeTruthy();
  });
});

describe('what App Review looks for', () => {
  it('offers Restore, and closes when a purchase comes back', async () => {
    mockRestore.mockResolvedValueOnce(true);
    const screen = await render(<ProOfferScreen />);
    await fireEvent.press(screen.getByLabelText('Restore purchase'));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  });

  it('says when there is nothing to restore', async () => {
    mockRestore.mockResolvedValueOnce(false);
    const screen = await render(<ProOfferScreen />);
    await fireEvent.press(screen.getByLabelText('Restore purchase'));
    expect(await screen.findByText('No past purchase to restore.')).toBeTruthy();
  });

  it('says it renews automatically', async () => {
    const screen = await render(<ProOfferScreen />);
    expect(
      screen.getByText(
        'Billed by Apple. Renews automatically until you cancel in your App Store subscriptions.',
      ),
    ).toBeTruthy();
  });

  it('does not call it half price when the store’s prices are not', async () => {
    mockRegular = { product: { priceString: '$24.99', price: 24.99 } };
    const screen = await render(<ProOfferScreen />);
    expect(screen.queryByText('Skip Pro, half price')).toBeNull();
    expect(screen.getByText('Skip Pro, a one-time price')).toBeTruthy();
  });

  it('draws no struck price rather than a dollar guess beside a store price', async () => {
    mockRegular = null;
    const screen = await render(<ProOfferScreen />);
    expect(screen.getByText('$9.99')).toBeTruthy();
    expect(screen.queryByLabelText(/^Was /)).toBeNull();
  });
});
