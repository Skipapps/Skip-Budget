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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
}));

const offerPack = { product: { priceString: '$9.99', pricePerMonthString: '$0.83' } };
const regularPack = { product: { priceString: '$19.99' } };
let mockOpen = true;
const mockPurchase = jest.fn();

jest.mock('@/api/pro', () => ({
  purchasesAvailable: () => mockOpen,
  usePurchasePro: () => ({ purchase: mockPurchase, restore: jest.fn() }),
  useOfferPrices: () =>
    mockOpen
      ? {
          data: { offer: offerPack, regular: regularPack },
          isFetching: false,
          refetch: jest.fn(),
        }
      : { data: undefined, isFetching: false, refetch: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-07T09:00:00'));
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
