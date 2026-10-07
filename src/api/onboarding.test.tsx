import { renderHook } from '@testing-library/react-native';

import { useGettingStarted } from '@/api/onboarding';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The setup steps, worded in the language on screen; what each one points at never changes. */

jest.mock('@/api/queries', () => {
  const none = { data: [], isPending: false };
  return {
    useProfile: () => ({ data: { getting_started_dismissed_at: null } }),
    useSalarySources: () => none,
    useCards: () => none,
    useBankAccounts: () => none,
    useBills: () => none,
    useSubscriptions: () => none,
    useReceipts: () => none,
  };
});
jest.mock('@/api/mutations', () => ({ useUpdateProfile: () => ({ mutate: jest.fn() }) }));

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

async function steps() {
  const { result } = await renderHook(() => useGettingStarted());
  return result.current.steps;
}

describe('useGettingStarted', () => {
  it('keeps the English steps, ids and routes', async () => {
    const english = await steps();
    expect(english.map((step) => step.title)).toEqual([
      'Set your pay',
      'Add your credit card and bank account',
      'Add your bills',
      'Add your subscriptions',
      'Add a receipt',
    ]);
    expect(english[2].detail).toBe('Rent or the phone bill — one is enough to light up Coming up.');
    expect(english.map((step) => [step.id, step.href])).toEqual([
      ['salary', '/salary'],
      ['wallet', '/add-card'],
      ['bill', '/add-bill'],
      ['subscription', '/add-subscription'],
      ['receipt', '/add-receipt'],
    ]);
  });

  it('reads in Spanish', async () => {
    setLanguage('es');
    const spanish = await steps();
    expect(spanish[0].title).toBe('Configura tu salario');
    expect(spanish[3].title).toBe('Agrega tus suscripciones');
    expect(spanish[4].detail).toBe(
      'Lo que gastas día a día, junto a tus facturas. Es opcional: la app funciona sin esto.',
    );
  });

  it('reads in French, ids and routes unchanged', async () => {
    setLanguage('fr');
    const french = await steps();
    expect(french[1].title).toBe('Ajoute ta carte de crédit et ton compte bancaire');
    expect(french[0].detail).toBe(
      '« Reste ce mois-ci », l’épargne et Aperçu se calculent à partir de ce qui entre.',
    );
    expect(french.map((step) => step.id)).toEqual([
      'salary',
      'wallet',
      'bill',
      'subscription',
      'receipt',
    ]);
  });
});
