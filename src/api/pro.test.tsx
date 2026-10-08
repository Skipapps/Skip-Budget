import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The store's plans and their free trials. A trial is reported only for a plan that has one and
 * only when RevenueCat confirms this person may take it: unknown, ineligible or a failed check all
 * show the ordinary price, so nobody is promised a trial Apple will not give.
 */

const ELIGIBLE = 2;
const INELIGIBLE = 1;
const UNKNOWN = 0;

const twoWeeks = { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 2 };
const mockOfferings = {
  all: { default: {} },
  current: {
    availablePackages: [{}, {}],
    monthly: { product: { identifier: 'monthly', introPrice: null } },
    annual: { product: { identifier: 'yearly', introPrice: twoWeeks } },
  },
};

let mockEligibility: Record<string, { status: number }> | Error = {};
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  LOG_LEVEL: { WARN: 'WARN' },
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    getOfferings: async () => mockOfferings,
    checkTrialOrIntroductoryPriceEligibility: async () => {
      if (mockEligibility instanceof Error) throw mockEligibility;
      return mockEligibility;
    },
    INTRO_ELIGIBILITY_STATUS: { INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2 },
  },
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/pro-bypass', () => ({ useProOverride: () => 'off' }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

// The key is read when the module loads, so it is set before the module is required.
process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { trialPeriodLabel, useProPrices } = require('@/api/pro') as typeof import('@/api/pro');

beforeEach(() => {
  resetLocaleForTests();
  mockEligibility = {};
  mockOfferings.current.monthly.product.introPrice = null;
});
afterAll(() => resetLocaleForTests());

describe('trialPeriodLabel', () => {
  it('words the period in English, including a unit it does not know', () => {
    expect(trialPeriodLabel({ count: 14, unit: 'DAY' })).toBe('14 days');
    expect(trialPeriodLabel({ count: 1, unit: 'MONTH' })).toBe('1 month');
    expect(trialPeriodLabel({ count: 3, unit: 'FORTNIGHT' })).toBe('3 fortnights');
  });

  it('reads in Spanish and French', () => {
    setLanguage('es');
    expect(trialPeriodLabel({ count: 14, unit: 'DAY' })).toBe('14 días');
    expect(trialPeriodLabel({ count: 1, unit: 'YEAR' })).toBe('1 año');

    setLanguage('fr');
    expect(trialPeriodLabel({ count: 1, unit: 'WEEK' })).toBe('1 semaine');
    expect(trialPeriodLabel({ count: 14, unit: 'DAY' })).toBe('14 jours');
  });
});

describe('useProPrices', () => {
  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  const load = async () => {
    const { result } = await renderHook(() => useProPrices(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    return result.current.data!;
  };

  it('offers the yearly trial to someone eligible, and none on a plan without one', async () => {
    mockEligibility = { yearly: { status: ELIGIBLE }, monthly: { status: ELIGIBLE } };
    const prices = await load();

    expect(prices.trials).toEqual({ yearly: { count: 2, unit: 'WEEK' }, monthly: null });
    expect(prices.yearly).toBe(mockOfferings.current.annual);
    expect(prices.monthly).toBe(mockOfferings.current.monthly);
  });

  it('gives each plan its own trial', async () => {
    mockOfferings.current.monthly.product.introPrice = {
      price: 0,
      periodUnit: 'DAY',
      periodNumberOfUnits: 7,
    } as never;
    mockEligibility = { yearly: { status: ELIGIBLE }, monthly: { status: ELIGIBLE } };
    const prices = await load();
    expect(prices.trials.monthly).toEqual({ count: 7, unit: 'DAY' });
  });

  it.each([
    ['has used it', INELIGIBLE],
    ['cannot be told apart', UNKNOWN],
  ])('offers no trial to someone who %s', async (_, status) => {
    mockEligibility = { yearly: { status } };
    const prices = await load();
    expect(prices.trials).toEqual({ yearly: null, monthly: null });
  });

  it('offers no trial when the check fails, and says why while debugging', async () => {
    mockEligibility = new Error('no receipt');
    const prices = await load();
    expect(prices.trials).toEqual({ yearly: null, monthly: null });
    expect(prices.debug).toContain('trialErr=no receipt');
  });

  it('counts a paid introductory price as no free trial', async () => {
    mockOfferings.current.annual.product.introPrice = { ...twoWeeks, price: 0.99 };
    mockEligibility = { yearly: { status: ELIGIBLE } };
    const prices = await load();
    expect(prices.trials.yearly).toBeNull();
    mockOfferings.current.annual.product.introPrice = twoWeeks;
  });
});
