import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { usePastCharges } from '@/api/past-charges';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Editing a plan that has already been charged asks whether the charges behind it change too, and
 * only then; deleting one asks whether to keep that past. A loan's charges are its payments.
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
  { id: 'c-4', bill_id: 'car', subscription_id: null, charged_on: '2026-08-27' },
  { id: 'c-5', bill_id: 'car', subscription_id: null, charged_on: '2026-09-27' },
  { id: 'c-6', bill_id: 'car', subscription_id: null, charged_on: '2026-10-27' },
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

    expect(result.current.count).toBe(2);
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

  it('never guesses while the charges have not been read: no question, nothing to save', async () => {
    mockCharges = { data: undefined, isSuccess: false };
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });

    await expect(result.current.choose('Rent', true)).resolves.toBeNull();
    await expect(result.current.chooseDelete('Rent')).resolves.toBeNull();
    expect(mockAsk).not.toHaveBeenCalled();
  });
});

describe('a loan', () => {
  it('counts its bill’s charges as its payments, and asks in those words', async () => {
    mockAsk.mockResolvedValue('all');
    const { result } = await renderHook(() => usePastCharges('loan', 'car'), { wrapper });

    expect(result.current.count).toBe(3);
    expect(result.current.lastChargedOn).toBe('2026-10-27');
    await expect(result.current.choose('Car loan', true)).resolves.toBe('all');
    expect(mockAsk.mock.calls[0][0]).toMatchObject({
      title: 'Change past payments too?',
      message:
        'Car loan already has 3 payments recorded. Change those as well, or only the ones still to come?',
    });
  });

  it('never rewrites its payments from here: the edit itself does, in one transaction', async () => {
    const { result } = await renderHook(() => usePastCharges('loan', 'car'), { wrapper });

    await expect(act(() => result.current.apply(NEW_RENT))).rejects.toThrow();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('counts its payoffs with its payments when it is deleted', async () => {
    mockAsk.mockResolvedValue('keep');
    const { result } = await renderHook(() => usePastCharges('loan', 'car'), { wrapper });

    await expect(result.current.chooseDelete('Car loan', { extra: 1 })).resolves.toBe('keep');
    expect(mockAsk.mock.calls[0][0].message).toBe(
      'Car loan has 4 past payments. Keep them in your history, or remove them from past months too? Either way, nothing after today is recorded.',
    );
  });

  it('offers to keep the past of a loan with a payoff and no payment yet', async () => {
    mockAsk.mockResolvedValue('everything');
    const { result } = await renderHook(() => usePastCharges('loan', 'new-loan'), { wrapper });

    await expect(result.current.chooseDelete('New loan', { extra: 1 })).resolves.toBe('everything');
    const request = mockAsk.mock.calls[0][0];
    expect(request.message).toContain('New loan has 1 past payment.');
    expect(request.actions.map((action: { id: string }) => action.id)).toEqual([
      'keep',
      'everything',
    ]);
  });
});

describe('Delete', () => {
  it('is the plain confirm for a plan with no past', async () => {
    mockAsk.mockResolvedValue('everything');
    const { result } = await renderHook(() => usePastCharges('bill', 'water'), { wrapper });

    await expect(result.current.chooseDelete('Water')).resolves.toBe('everything');
    const request = mockAsk.mock.calls[0][0];
    expect(request.title).toBe('Delete Water?');
    expect(request.message).toBe('This can’t be undone.');
    expect(request.actions.map((action: { id: string }) => action.id)).toEqual(['everything']);
  });

  it('offers to keep the past of a running plan, first, or remove everything', async () => {
    mockAsk.mockResolvedValue('keep');
    const { result } = await renderHook(() => usePastCharges('bill', 'rent'), { wrapper });

    await expect(result.current.chooseDelete('Rent')).resolves.toBe('keep');
    const request = mockAsk.mock.calls[0][0];
    expect(request.message).toBe(
      'Rent has 2 past charges. Keep them in your history, or remove them from past months too? Either way, nothing after today is recorded.',
    );
    expect(request.actions.map((action: { label: string }) => action.label)).toEqual([
      'Keep past charges',
      'Remove everything',
    ]);
  });

  it('only removes a plan already stopped, whose past is kept already', async () => {
    mockAsk.mockResolvedValue(null);
    mockCharges = {
      data: [{ id: 'c-9', bill_id: null, subscription_id: 'netflix', charged_on: '2026-09-05' }],
      isSuccess: true,
    };
    const { result } = await renderHook(() => usePastCharges('subscription', 'netflix'), {
      wrapper,
    });

    await expect(result.current.chooseDelete('Netflix', { stopped: true })).resolves.toBeNull();
    const request = mockAsk.mock.calls[0][0];
    expect(request.message).toContain('Netflix has 1 past charge.');
    expect(request.actions.map((action: { id: string }) => action.id)).toEqual(['everything']);
    expect(request.cancelLabel).toBe('Keep past charges');
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

describe('the question, word for word', () => {
  beforeEach(() => {
    resetLocaleForTests();
    mockAsk.mockResolvedValue('upcoming');
  });

  afterAll(() => resetLocaleForTests());

  async function asked(planId: string, name: string) {
    const { result } = await renderHook(() => usePastCharges('bill', planId), { wrapper });
    await result.current.choose(name, true);
    return mockAsk.mock.calls[mockAsk.mock.calls.length - 1][0];
  }

  it('keeps every English sentence as it was', async () => {
    expect((await asked('rent', 'Rent')).message).toBe(
      'Rent has already been charged 2 times. Change those as well, or only the ones still to come?',
    );
    expect((await asked('power', 'Power')).message).toBe(
      'Power has already been charged once. Change that charge as well, or only the ones still to come?',
    );
  });

  it('asks in Spanish', async () => {
    setLanguage('es');
    const request = await asked('rent', 'Renta');
    expect(request.title).toBe('¿Cambiar también los cargos anteriores?');
    expect(request.message).toBe(
      'Ya hubo 2 cargos de Renta. ¿Cambiarlos también o solo los próximos?',
    );
    expect(request.actions.map((action: { label: string }) => action.label)).toEqual([
      'Anteriores y próximos',
      'Solo los próximos',
    ]);
    expect(request.cancelLabel).toBe('Cancelar');
  });

  it('asks in French, with "that charge" only for one charge', async () => {
    setLanguage('fr');
    const one = await asked('power', 'Hydro');
    expect(one.title).toBe('Modifier aussi les prélèvements passés ?');
    expect(one.message).toBe(
      'Un prélèvement a déjà eu lieu pour Hydro. Modifier aussi ce prélèvement, ou seulement ceux à venir ?',
    );
    expect(one.cancelLabel).toBe('Annuler');
  });
});
