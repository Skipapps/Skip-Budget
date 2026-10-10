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
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
  useLoanTypeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
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
    'Guardar este préstamo',
    'Aparecerá en Préstamos como una factura mensual.',
    'Pago mensual',
    '/ mes',
    'Prestado',
    '$31,394.33',
    'Tasa',
    '8.14%',
    'Plazo',
    '6 años',
    'Pagos',
    '72 mensuales',
    'Primer pago',
    '14 ene 2026',
    'Intereses totales',
    'Nombre',
    'Tipo de préstamo',
    'Personal',
    'Auto',
    'Estudiantil',
    'Vivienda',
    'Negocio',
    'Médico',
    'Tarjeta de crédito',
    'Otro',
    'Guardar en Préstamos',
  ]) {
    expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
  }
  expect(screen.getByPlaceholderText('p. ej., Préstamo de auto', RAW)).toBeTruthy();
});

it('summarises the loan in French, with French figures', async () => {
  await showIn('fr', 'CAD');

  for (const line of [
    'Enregistrer ce prêt',
    'Il apparaîtra sous Prêts comme une facture mensuelle.',
    'Paiement mensuel',
    '/ mois',
    `31${NBSP}394,33${NBSP}$`,
    `8,14${NBSP}%`,
    'Durée',
    '6 ans',
    '72 mensuels',
    '14 janv. 2026',
    'Intérêts totaux',
    'Type de prêt',
    'Carte de crédit',
    'Enregistrer dans Prêts',
  ]) {
    expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
  }
  for (const text of everythingRead()) {
    expect(text).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(text).not.toMatch(/\{\w+\}/);
  }
});

it('says what is still missing, by the names on the page, in the language on screen', async () => {
  await showIn('fr', 'CAD');
  await fireEvent.press(screen.getByText('Enregistrer dans Prêts', RAW));
  expect(
    screen.getByText(`Pour enregistrer ce prêt, remplis${NBSP}: Nom, Payé depuis.`, RAW),
  ).toBeTruthy();
  expect(mockSave).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('radio', { name: 'Passer' }));
  await fireEvent.press(screen.getByText('Enregistrer dans Prêts', RAW));
  expect(screen.getByText(`Pour enregistrer ce prêt, remplis${NBSP}: Nom.`, RAW)).toBeTruthy();
  expect(mockSave).not.toHaveBeenCalled();
});

it('saves the identical loan in every language and currency', async () => {
  const LOCALES: [Language, CurrencyCode, string][] = [
    ['en', 'USD', 'e.g. Car loan'],
    ['es', 'MXN', 'p. ej., Préstamo de auto'],
    ['fr', 'CAD', 'p. ex. Prêt auto'],
    ['fr', 'GBP', 'p. ex. Prêt auto'],
  ];
  for (const [language, currency, placeholder] of LOCALES) {
    await showIn(language, currency);
    await fireEvent.changeText(screen.getByPlaceholderText(placeholder, RAW), 'Auto');
    await fireEvent.press(screen.getByRole('radio', { name: /^(Skip|Omitir|Passer)$/ }));
    await fireEvent.press(
      screen.getByRole('button', {
        name: /^(Save to Loans|Guardar en Préstamos|Enregistrer dans Prêts)$/,
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
      iconId: 'loan-personal',
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
