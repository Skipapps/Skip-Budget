import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ProScreen from '@/app/pro';

/**
 * The Pro page as designed: Free against Pro in ten rows, the two plans with yearly chosen, and one
 * button that offers the trial only to someone Apple will give it to. Prices are the store's own
 * once it answers, the dollar fallbacks before.
 */

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return new Proxy({}, { get: (_target, name) => () => <View testID={`icon-${String(name)}`} /> });
});
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
let mockScreenOptions: { gestureEnabled?: boolean } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  Stack: {
    Screen: ({ options }: { options: { gestureEnabled?: boolean } }) => {
      mockScreenOptions = options;
      return null;
    },
  },
}));

// The one-time offer: whether leaving would open it, and the server's once-only claim.
let mockOfferArmed = false;
const mockClaim = jest.fn(async () => true);
jest.mock('@/api/pro-offer', () => ({
  useExitOffer: () => ({ armed: mockOfferArmed, claim: mockClaim }),
}));
// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    body: '#333333',
    line: '#DDDDDD',
    accentInk: '#905479',
    onControl: '#FFFFFF',
  }),
}));

type Trial = { count: number; unit: string } | null;
const yearlyPack = {
  product: { priceString: '$19.99', pricePerMonthString: '$1.67', identifier: 'yearly' },
};
const monthlyPack = {
  product: { priceString: '$1.99', pricePerMonthString: '$1.99', identifier: 'monthly' },
};

let mockPro = false;
let mockOpen = false;
let mockTrials: { monthly: Trial; yearly: Trial } = { monthly: null, yearly: null };
const mockPurchase = jest.fn();
const mockRestore = jest.fn();

jest.mock('@/api/pro', () => {
  const { t } = jest.requireActual('@/i18n');
  return {
    usePro: () => ({ pro: mockPro, ready: true }),
    purchasesAvailable: () => mockOpen,
    trialPeriodLabel: ({ count }: { count: number }) => t('pro.period.day', { count }),
    usePurchasePro: () => ({ purchase: mockPurchase, restore: mockRestore }),
    useProPrices: () =>
      mockOpen
        ? {
            data: { yearly: yearlyPack, monthly: monthlyPack, trials: mockTrials, debug: '' },
            error: null,
            isFetched: true,
            isFetching: false,
            refetch: jest.fn(),
          }
        : { data: undefined, error: null, isFetched: true, isFetching: false, refetch: jest.fn() },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPro = false;
  mockOpen = false;
  mockTrials = { monthly: null, yearly: null };
  mockOfferArmed = false;
  mockScreenOptions = {};
});

const ROWS = [
  'Track spending & bills: Free, included. Pro, included.',
  'Upload any bill: Free, Limited. Pro, included.',
  'Scan receipts: Free, Limited. Pro, Unlimited.',
  'Cards & accounts: Free, Limited. Pro, Unlimited.',
  'Money history: Free, 90 days. Pro, 7 years.',
  'Voice entry: Free, not included. Pro, included.',
  'Insights: Free, not included. Pro, included.',
  'Brand logos: Free, not included. Pro, included.',
  'New features first: Free, not included. Pro, included.',
  'Priority support: Free, not included. Pro, included.',
];

describe('the table', () => {
  it('compares Free and Pro in the design’s ten rows, each read as one sentence', async () => {
    const screen = await render(<ProScreen />);

    expect(screen.getByText('Get more with Skip Pro')).toBeTruthy();
    expect(screen.getByText('Less than a coffee a month.')).toBeTruthy();
    expect(screen.getByText('What you get')).toBeTruthy();
    for (const row of ROWS) expect(screen.getByLabelText(row)).toBeTruthy();

    const labels = screen
      .getAllByLabelText(/: Free, .*\. Pro, .*\.$/)
      .map((node) => node.props.accessibilityLabel);
    expect(labels).toEqual(ROWS);
  });

  it('draws the cells the design draws', async () => {
    const screen = await render(<ProScreen />);

    expect(screen.getAllByText('Limited')).toHaveLength(3);
    expect(screen.getAllByText('Unlimited')).toHaveLength(2);
    expect(screen.getByText('90 days')).toBeTruthy();
    expect(screen.getByText('7 years')).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(5);
  });

  it('sells only what this app does', async () => {
    const screen = await render(<ProScreen />);
    expect(screen.queryByText(/split|friend|\bgroup|loan/i)).toBeNull();
  });
});

describe('the plans', () => {
  it('opens on yearly, Most Popular, with the dollar fallbacks before the store answers', async () => {
    const screen = await render(<ProScreen />);

    const yearly = screen.getByLabelText('Yearly, $19.99/yr. $1.67/mo');
    const monthly = screen.getByLabelText('Monthly, $1.99/mo. Billed monthly');
    expect(yearly.props.accessibilityState).toEqual({ checked: true });
    expect(monthly.props.accessibilityState).toEqual({ checked: false });
    expect(screen.getByText('Most Popular')).toBeTruthy();

    await fireEvent.press(monthly);
    expect(
      screen.getByLabelText('Monthly, $1.99/mo. Billed monthly').props.accessibilityState,
    ).toEqual({ checked: true });
  });

  it('says purchases are not open in a build without billing, and offers to check again', async () => {
    const screen = await render(<ProScreen />);
    expect(screen.getByLabelText('Check again')).toBeTruthy();
    expect(screen.queryByText(/Cancel anytime/)).toBeNull();
  });
});

describe('the button', () => {
  it('offers the trial to someone who can take it, with what follows it', async () => {
    mockOpen = true;
    mockTrials = { monthly: null, yearly: { count: 14, unit: 'DAY' } };
    const screen = await render(<ProScreen />);

    expect(screen.getByLabelText('Try Pro free for 14 days')).toBeTruthy();
    expect(screen.getByText('Then $19.99/year. Cancel anytime.')).toBeTruthy();
    expect(
      screen.getByText(
        'Billed by Apple. Renews automatically until you cancel in your App Store subscriptions.',
      ),
    ).toBeTruthy();
  });

  it('follows the plan chosen: a plan with no trial is bought at its price', async () => {
    mockOpen = true;
    mockTrials = { monthly: null, yearly: { count: 14, unit: 'DAY' } };
    const screen = await render(<ProScreen />);

    await fireEvent.press(screen.getByLabelText('Monthly, $1.99/mo. Billed monthly'));
    expect(screen.getByLabelText('Get Pro for $1.99/month')).toBeTruthy();
    expect(screen.getByText('Billed every month. Cancel anytime.')).toBeTruthy();
  });

  it('never promises a trial to someone who has used theirs', async () => {
    mockOpen = true;
    const screen = await render(<ProScreen />);

    expect(screen.queryByText(/free for/)).toBeNull();
    expect(screen.getByLabelText('Get Pro for $19.99/year')).toBeTruthy();
    expect(screen.getByText('Billed once a year. Cancel anytime.')).toBeTruthy();
  });

  it('buys the chosen plan and steps back once Apple confirms', async () => {
    mockOpen = true;
    mockPurchase.mockResolvedValueOnce('done');
    const screen = await render(<ProScreen />);

    await fireEvent.press(screen.getByLabelText('Monthly, $1.99/mo. Billed monthly'));
    await fireEvent.press(screen.getByLabelText('Get Pro for $1.99/month'));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockPurchase).toHaveBeenCalledWith(monthlyPack);
  });

  it('stays put when the person cancels Apple’s sheet', async () => {
    mockOpen = true;
    mockPurchase.mockResolvedValueOnce('cancelled');
    const screen = await render(<ProScreen />);

    await fireEvent.press(screen.getByLabelText('Get Pro for $19.99/year'));
    await waitFor(() => expect(mockPurchase).toHaveBeenCalledWith(yearlyPack));
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('the links', () => {
  it('keeps Restore, Terms and Privacy within reach', async () => {
    mockRestore.mockResolvedValueOnce(false);
    const screen = await render(<ProScreen />);

    await fireEvent.press(screen.getByLabelText('Terms'));
    expect(router.push).toHaveBeenCalledWith('/terms');
    await fireEvent.press(screen.getByLabelText('Privacy'));
    expect(router.push).toHaveBeenCalledWith('/privacy');

    await fireEvent.press(screen.getByLabelText('Restore purchase'));
    expect(await screen.findByText('No past purchase to restore.')).toBeTruthy();
  });
});

it('tells someone who already has Pro, with a way to manage it', async () => {
  mockPro = true;
  const screen = await render(<ProScreen />);
  expect(screen.getByText('You have Skip Pro')).toBeTruthy();
  expect(screen.queryByText('What you get')).toBeNull();
});

describe('leaving without buying', () => {
  it('opens the one-time offer in this page’s place, the first time, with the swipe held', async () => {
    mockOfferArmed = true;
    const screen = await render(<ProScreen />);
    expect(mockScreenOptions.gestureEnabled).toBe(false);

    // Read before the tap: the claim can settle inside it.
    const before = Date.now();
    await fireEvent.press(screen.getByLabelText('Go back'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
    // The ten minutes start at the claim and travel with the page.
    const [{ pathname, params }] = jest.mocked(router.replace).mock.calls[0] as unknown as [
      { pathname: string; params: { until: string } },
    ];
    expect(pathname).toBe('/pro-offer');
    const until = Number(params.until);
    expect(until).toBeGreaterThanOrEqual(before + 10 * 60 * 1000);
    expect(until).toBeLessThanOrEqual(Date.now() + 10 * 60 * 1000);
    expect(mockClaim).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('just goes back once the offer has been seen, with the swipe open', async () => {
    const screen = await render(<ProScreen />);
    expect(mockScreenOptions.gestureEnabled).toBe(true);

    await fireEvent.press(screen.getByLabelText('Go back'));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(mockClaim).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('goes back when another phone claimed it first, or the claim fails', async () => {
    mockOfferArmed = true;
    mockClaim.mockResolvedValueOnce(false);
    const screen = await render(<ProScreen />);
    await fireEvent.press(screen.getByLabelText('Go back'));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.replace).not.toHaveBeenCalled();

    mockClaim.mockRejectedValueOnce(new Error('offline'));
    await fireEvent.press(screen.getByLabelText('Go back'));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(2));
  });

  it('claims once however many times the chevron is tapped', async () => {
    mockOfferArmed = true;
    let release: (value: boolean) => void = () => {};
    mockClaim.mockImplementationOnce(() => new Promise<boolean>((resolve) => (release = resolve)));
    const screen = await render(<ProScreen />);

    await fireEvent.press(screen.getByLabelText('Go back'));
    await fireEvent.press(screen.getByLabelText('Go back'));
    release(true);

    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  it('never offers it after a purchase: buying steps back directly', async () => {
    mockOfferArmed = true;
    mockOpen = true;
    mockPurchase.mockResolvedValueOnce('done');
    const screen = await render(<ProScreen />);

    await fireEvent.press(screen.getByLabelText('Get Pro for $19.99/year'));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockClaim).not.toHaveBeenCalled();
  });
});
