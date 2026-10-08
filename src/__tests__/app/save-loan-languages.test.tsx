import { fireEvent, render, screen } from '@testing-library/react-native';

import SaveLoanScreen from '@/app/save-loan';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { amortise } from '@/lib/loan';

/**
 * Filing a loan as a bill, in Spanish and French. The summary is written in the language; the loan
 * saved is the same in every language and currency, to the cent, and is the engine's own figure for
 * the real lender statement's terms (src/lib/loan.test.ts).
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Its glyphs import SVGs that jest's `@/` mapper cannot resolve; the picker is another screen's test.
jest.mock('@/components/bills/icon-picker', () => ({ IconPicker: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accent: '#905479' }),
}));

const mockSave = jest.fn(async (_input: Record<string, unknown>) => ({}));
jest.mock('@/api/mutations', () => ({
  useSaveLoan: () => ({ mutateAsync: mockSave, isPending: false }),
}));
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: [] }) }));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    amount: '31394.33',
    rate: '8.14',
    months: '72',
    start: '2026-01-14',
    funded: '2025-11-30',
    basis: 'actual/365',
  }),
  router: { dismissTo: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

const NBSP = '\u00a0';
/**
 * Text queries fold whitespace by default and count a no-break space as whitespace, so they would
 * pass "1 234,56" written with an ordinary space. RAW compares the characters exactly as drawn.
 */
const RAW = { normalizer: (text: string) => text };

const ENGINE = amortise({
  principal: 31_394.33,
  annualRatePercent: 8.14,
  months: 72,
  firstPaymentOn: new Date(2026, 0, 14),
  fundedOn: new Date(2025, 10, 30),
  basis: 'actual/365',
});

function everythingRead(): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') return void out.push(node);
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown };
    for (const key of ['accessibilityLabel', 'placeholder']) {
      if (typeof props?.[key] === 'string') out.push(props[key] as string);
    }
    walk(children);
  };
  walk(screen.toJSON());
  return out;
}

async function showIn(language: Language, currency: CurrencyCode) {
  setLanguage(language);
  setCurrency(currency);
  await render(<SaveLoanScreen />);
}

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
});

it('summarises the loan in Spanish', async () => {
  await showIn('es', 'MXN');

  for (const line of [
    'Agregar a facturas mensuales',
    'Se convierte en una factura mensual en Préstamos, así que cuenta contra lo que te queda.',
    'Pago mensual',
    'Prestado',
    '$31,394.33',
    'Tasa',
    '8.14% anual',
    'Plazo',
    '6 años · 72 pagos',
    'Primer pago',
    '14 ene 2026',
    'Intereses en todo el plazo',
    'Nombre',
    'Ícono',
    'Agregar a facturas',
  ]) {
    expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
  }
  expect(screen.getByPlaceholderText('Préstamo de auto, préstamo estudiantil…', RAW)).toBeTruthy();
});

it('summarises the loan in French, with French figures', async () => {
  await showIn('fr', 'CAD');

  for (const line of [
    'Ajouter aux factures mensuelles',
    'Paiement mensuel',
    `31${NBSP}394,33${NBSP}$`,
    `8,14${NBSP}% par an`,
    'Durée',
    '6 ans · 72 paiements',
    '14 janv. 2026',
    'Intérêts sur toute la durée',
    'Ajouter aux factures',
  ]) {
    expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
  }
  for (const text of everythingRead()) {
    expect(text).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(text).not.toMatch(/\{\w+\}/);
  }
});

it('asks for a name in the language on screen', async () => {
  await showIn('fr', 'CAD');
  await fireEvent.press(screen.getByText('Ajouter aux factures', RAW));
  expect(
    screen.getByText('Donne un nom au prêt pour le repérer dans tes factures.', RAW),
  ).toBeTruthy();
  expect(mockSave).not.toHaveBeenCalled();
});

it('saves the identical loan in every language and currency', async () => {
  const LOCALES: [Language, CurrencyCode, string][] = [
    ['en', 'USD', 'Car loan, student loan…'],
    ['es', 'MXN', 'Préstamo de auto, préstamo estudiantil…'],
    ['fr', 'CAD', 'Prêt auto, prêt étudiant…'],
    ['fr', 'GBP', 'Prêt auto, prêt étudiant…'],
  ];
  for (const [language, currency, placeholder] of LOCALES) {
    await showIn(language, currency);
    await fireEvent.changeText(screen.getByPlaceholderText(placeholder, RAW), 'Auto');
    await fireEvent.press(
      screen.getByRole('button', {
        name: /^(Add to bills|Agregar a facturas|Ajouter aux factures)$/,
      }),
    );
    await screen.unmount();
  }

  const saved = mockSave.mock.calls.map(([input]) => input);
  expect(saved).toHaveLength(LOCALES.length);
  for (const input of saved.slice(1)) expect(input).toEqual(saved[0]);
  expect(saved[0]).toEqual(
    expect.objectContaining({
      name: 'Auto',
      principal: 31_394.33,
      annualRate: 8.14,
      termMonths: 72,
      monthlyPayment: ENGINE.payment,
      totalInterest: ENGINE.totalInterest,
      firstPaymentOn: '2026-01-14',
      fundedOn: '2025-11-30',
      dayCountBasis: 'actual/365',
    }),
  );
});
