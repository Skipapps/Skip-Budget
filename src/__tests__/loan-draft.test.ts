import { act, renderHook } from '@testing-library/react-native';

import {
  readLoanDraft,
  resetLoanDraftForTests,
  startLoanDraft,
  updateLoanDraft,
  useLoanDraft,
  useOpenLoanDraft,
} from '@/lib/loan-draft';

/**
 * The open calculator's changes: one slot, written by the payment pages on Done and read live by
 * the calculator and the schedule underneath. A stale or unknown id reads nothing and writes nothing.
 */

beforeEach(() => resetLoanDraftForTests());

describe('the loan draft', () => {
  it('starts empty, and a new calculator replaces the old draft', () => {
    const first = startLoanDraft();
    expect(readLoanDraft(first)).toEqual({});
    expect(updateLoanDraft(first, { monthlyPayment: 554.23 })).toBe(true);

    const second = startLoanDraft();
    expect(second).not.toBe(first);
    expect(readLoanDraft(second)).toEqual({});
    expect(readLoanDraft(first)).toBeNull();
    expect(updateLoanDraft(first, { monthlyPayment: 1 })).toBe(false);
    expect(readLoanDraft(second)).toEqual({});
  });

  it('reads nothing for a link with no draft, or another one', () => {
    startLoanDraft();
    expect(readLoanDraft(undefined)).toBeNull();
    expect(readLoanDraft('')).toBeNull();
    expect(readLoanDraft('loan-999')).toBeNull();
    expect(updateLoanDraft(undefined, {})).toBe(false);
  });

  it('re-renders its readers on every write', async () => {
    const id = startLoanDraft();
    const byId = await renderHook(() => useLoanDraft(id));
    const open = await renderHook(() => useOpenLoanDraft());
    expect(byId.result.current).toEqual({});
    expect(open.result.current?.id).toBe(id);

    await act(async () => {
      updateLoanDraft(id, { payments: { 12: 10_000 } });
    });
    expect(byId.result.current).toEqual({ payments: { 12: 10_000 } });
    expect(open.result.current).toEqual({ id, overrides: { payments: { 12: 10_000 } } });

    await act(async () => {
      startLoanDraft();
    });
    expect(byId.result.current).toBeNull();
    expect(open.result.current?.overrides).toEqual({});
  });
});
