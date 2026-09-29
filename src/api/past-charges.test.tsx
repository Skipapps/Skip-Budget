import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { usePastCharges } from '@/api/past-charges';

/**
 * Editing a plan that has already been charged asks whether the charges behind
 * it change too — and only then. A save with nothing to ask about behaves
 * exactly as it did before the question existed.
 */

const mockAsk = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));

let mockCharges: { data?: unknown[]; isSuccess: boolean };
jest.mock('@/api/charges', () => ({ useCharges: () => mockCharges }));

const mockEq = jest.fn(() => Promise.resolve({ error: null }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((_table: string) => ({ update: mockUpdate }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => mockFrom(table) } }));

function wrapper({ children }: { children: ReactNode }) {
  // gcTime 0 on both, or the mutation cache's timer holds Jest open after the run.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const RENT_CHARGES = [
  { id: 'c-1', bill_id: 'rent', subscription_id: null, charged_on: '2026-08-01' },
  { id: 'c-2', bill_id: 'rent', subscription_id: null, charged_on: '2026-09-01' },
  { id: 'c-3', bill_id: 'power', subscription_id: null, charged_on: '2026-09-03' },
];

const NEW_RENT = { label: 'Rent', amount: 1100, card_id: 'card-1', bank_account_id: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockCharges = { data: RENT_CHARGES, isSuccess: true };
});

describe('when there is nothing to ask', () => {
  it('saves a new bill without a question', async () => {
    const { result } = await renderHook(() => usePastCharges('bill', undefined), { wrapper });
    await expect(result.current.choose('Rent', true)).resolves.toBe('upcoming');
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('saves an edit that changed nothing a charge copies', async () => {
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });
    await expect(result.current.choose('Rent', false)).resolves.toBe('upcoming');
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('saves an edit to a bill that has never been charged', async () => {
    const { result } = await renderHook(() => usePastCharges('bill', 'water'), { wrapper });
    await expect(result.current.choose('Water', true)).resolves.toBe('upcoming');
    expect(mockAsk).not.toHaveBeenCalled();
  });
});

describe('when the bill has been charged', () => {
  it('asks, counting only its own charges, and returns the answer', async () => {
    mockAsk.mockResolvedValue('all');
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });

    await expect(result.current.choose('Rent', true)).resolves.toBe('all');

    const request = mockAsk.mock.calls[0][0];
    expect(request.title).toBe('Change past charges too?');
    expect(request.message).toContain('Rent has already been charged 2 times.');
    expect(request.actions.map((action: { id: string }) => action.id)).toEqual(['all', 'upcoming']);
  });

  it('keeps the past when told upcoming only', async () => {
    mockAsk.mockResolvedValue('upcoming');
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });
    await expect(result.current.choose('Rent', true)).resolves.toBe('upcoming');
  });

  it('returns null when the question is backed out of, so nothing saves', async () => {
    mockAsk.mockResolvedValue(null);
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });
    await expect(result.current.choose('Rent', true)).resolves.toBeNull();
  });

  it('asks anyway when the charges have not been read', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    mockAsk.mockResolvedValue('upcoming');
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });

    await result.current.choose('Rent', true);
    expect(mockAsk.mock.calls[0][0].message).toContain('Rent may already have been charged.');
  });
});

describe('Past and upcoming', () => {
  it('rewrites every charge of that bill, and only that bill, in place', async () => {
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });

    await act(() => result.current.apply(NEW_RENT));

    expect(mockFrom).toHaveBeenCalledWith('charges');
    expect(mockUpdate).toHaveBeenCalledWith(NEW_RENT);
    expect(mockEq).toHaveBeenCalledWith('bill_id', 'rent');
  });

  it('keys a subscription on its own column', async () => {
    const { result } = await renderHook(() => usePastCharges('subscription', 'netflix'), {
      wrapper,
    });

    await act(() => result.current.apply({ ...NEW_RENT, label: 'Netflix', amount: 17.99 }));

    expect(mockEq).toHaveBeenCalledWith('subscription_id', 'netflix');
  });
});

describe('before an edit can save', () => {
  it('knows the newest day the plan was charged', async () => {
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });
    expect(result.current.lastChargedOn).toBe('2026-09-01');
    expect(result.current.ready).toBe(true);
  });

  it('is not ready while the charges have not been read', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });
    expect(result.current.ready).toBe(false);
  });

  it('never holds up a new bill', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    const { result } = await renderHook(() => usePastCharges('bill', undefined), { wrapper });
    expect(result.current.ready).toBe(true);
  });
});
