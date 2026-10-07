import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The free-trial wording on the paywall, in the language on screen. */

const mockOfferings = {
  all: { default: {} },
  current: {
    availablePackages: [{}],
    monthly: null,
    annual: {
      product: { introPrice: { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 2 } },
    },
  },
};

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  LOG_LEVEL: { WARN: 'WARN' },
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    getOfferings: async () => mockOfferings,
  },
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/pro-bypass', () => ({ useProOverride: () => 'off' }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

// The key is read when the module loads, so it is set before the module is required.
process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_test';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { trialLabel, useProPrices } = require('@/api/pro') as typeof import('@/api/pro');

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('trialLabel', () => {
  it('keeps the English wording, including a unit it does not know', () => {
    expect(trialLabel({ count: 7, unit: 'DAY' })).toBe('7 days free');
    expect(trialLabel({ count: 1, unit: 'MONTH' })).toBe('1 month free');
    expect(trialLabel({ count: 3, unit: 'FORTNIGHT' })).toBe('3 fortnights free');
  });

  it('reads in Spanish and French', () => {
    setLanguage('es');
    expect(trialLabel({ count: 7, unit: 'DAY' })).toBe('7 días gratis');
    expect(trialLabel({ count: 1, unit: 'YEAR' })).toBe('1 año gratis');

    setLanguage('fr');
    expect(trialLabel({ count: 1, unit: 'WEEK' })).toBe('1 semaine gratuite');
    expect(trialLabel({ count: 3, unit: 'MONTH' })).toBe('3 mois gratuits');
  });
});

describe('useProPrices', () => {
  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  it('words a cached trial in whichever language is on screen', async () => {
    const { result, rerender } = await renderHook(() => useProPrices(), { wrapper });
    await waitFor(() => expect(result.current.data?.trialText).toBe('2 weeks free'));

    setLanguage('fr');
    await rerender({});
    expect(result.current.data?.trialText).toBe('2 semaines gratuites');
    expect(result.current.data?.yearly).toEqual(mockOfferings.current.annual);
  });
});
