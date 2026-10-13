import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { usePastCharges, type PastRead } from '@/api/past-charges';

/**
 * Editing or deleting a plan asks about its charges, so it waits for them: `load()` answers from
 * the read at once when it has answered, and otherwise waits for it, rejecting only when the read
 * fails. A question handed what `load()` answered asks with that count, read or not at render.
 */

const mockAsk = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => mockAsk }));

const mockRefetch = jest.fn();
let mockCharges: { data?: unknown[]; isSuccess: boolean };
jest.mock('@/api/charges', () => ({
  useCharges: () => ({ ...mockCharges, refetch: mockRefetch }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const CHARGES = [
  { id: 'c-1', bill_id: 'rent', subscription_id: null, charged_on: '2026-08-01' },
  { id: 'c-2', bill_id: 'rent', subscription_id: null, charged_on: '2026-09-01' },
  { id: 'c-3', bill_id: 'power', subscription_id: null, charged_on: '2026-09-03' },
  { id: 'c-4', bill_id: null, subscription_id: 'rent', charged_on: '2026-10-01' },
];

const RENT: PastRead = { count: 2, lastChargedOn: '2026-09-01' };

beforeEach(() => {
  mockAsk.mockReset();
  mockAsk.mockResolvedValue(null);
  mockRefetch.mockReset();
  mockCharges = { data: CHARGES, isSuccess: true };
});

const hookFor = async (planId: string | undefined, kind: 'bill' | 'subscription' = 'bill') =>
  (await renderHook(() => usePastCharges(kind, planId), { wrapper })).result;

describe('load', () => {
  it('answers at once from the charges already read, with no read of its own', async () => {
    const result = await hookFor('rent');
    await expect(result.current.load()).resolves.toEqual(RENT);
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('counts only the plan’s own column', async () => {
    const result = await hookFor('rent', 'subscription');
    await expect(result.current.load()).resolves.toEqual({
      count: 1,
      lastChargedOn: '2026-10-01',
    });
  });

  it('waits for the read when the charges have not answered, joining one on its way', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    mockRefetch.mockResolvedValue({ data: CHARGES });
    const result = await hookFor('rent');
    await expect(result.current.load()).resolves.toEqual(RENT);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockRefetch).toHaveBeenCalledWith({ throwOnError: true, cancelRefetch: false });
  });

  it('rejects when the read fails: unread is never none', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    const refused = new Error('connection failure');
    mockRefetch.mockRejectedValue(refused);
    const result = await hookFor('rent');
    await expect(result.current.load()).rejects.toBe(refused);
  });

  it('has nothing to read for a plan not saved yet', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    const result = await hookFor(undefined);
    await expect(result.current.load()).resolves.toEqual({ count: 0, lastChargedOn: null });
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});

describe('the questions, handed what load answered', () => {
  it('asks the change question with that count, even before the page has the read', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    mockAsk.mockResolvedValue('all');
    const result = await hookFor('rent');
    let scope: unknown;
    await act(async () => {
      scope = await result.current.choose('Rent', true, { count: 5, lastChargedOn: null });
    });
    expect(scope).toBe('all');
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mockAsk.mock.calls[0][0])).toContain('5');
  });

  it('asks the delete question with that count and the extra past', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    mockAsk.mockResolvedValue('everything');
    const result = await hookFor('rent');
    let choice: unknown;
    await act(async () => {
      choice = await result.current.chooseDelete(
        'Car loan',
        { extra: 1 },
        { count: 2, lastChargedOn: null },
      );
    });
    expect(choice).toBe('everything');
    expect(JSON.stringify(mockAsk.mock.calls[0][0])).toContain('3 past');
  });

  it('still answers null, asking nothing, when asked without it before the read', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    const result = await hookFor('rent');
    await expect(result.current.choose('Rent', true)).resolves.toBeNull();
    await expect(result.current.chooseDelete('Rent')).resolves.toBeNull();
    expect(mockAsk).not.toHaveBeenCalled();
  });
});
