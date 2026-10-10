import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import SalaryScreen from '@/app/salary';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/**
 * The Salary page in Spanish and French. Words and figures are written in the language; what is
 * saved is not: pay typed on the keypad or worked out on the calculator in French is the same number
 * English saves.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The real SDK starts a cleanup interval that holds Jest open.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));

// Pay that has already landed is written down before a save changes anything; none of that is under
// test in this file, so the sweep finds nothing and an edit to a salary that has paid is not asked.
jest.mock('@/api/pay', () => ({
  recordDuePay: jest.fn(async () => 0),
  usePastPay: () => ({
    choose: jest.fn(async () => 'upcoming'),
    apply: jest.fn(async () => {}),
    saving: false,
  }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

const mockCreate = jest.fn(async () => ({ id: 'new' }));
const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSalarySource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(async () => ({})), isPending: false }),
}));

const fixedRow = {
  id: 's1',
  name: 'Acme',
  amount: 1880,
  frequency: 'semimonthly',
  last_payday: '2026-09-30',
  pay_type: 'fixed',
  hourly_rate: null,
  hours_per_week: null,
  overtime_hours_per_week: 0,
  overtime_multiplier: 1.5,
  deduction_percent: 0,
  account_ids: ['acc1'],
};

const hourlyRow = {
  ...fixedRow,
  frequency: 'biweekly',
  pay_type: 'hourly',
  hourly_rate: 20,
  hours_per_week: 40,
  overtime_hours_per_week: 5,
};

let mockDetails: { rows: unknown[]; hourlyAvailable: boolean } = {
  rows: [fixedRow],
  hourlyAvailable: true,
};
let mockFailed = false;
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: mockFailed ? undefined : mockDetails,
    isPending: false,
    isError: mockFailed,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' }],
  }),
}));

const NBSP = '\u00a0';
/**
 * Text queries fold whitespace by default and count a no-break space as whitespace, so they would
 * pass "1 234,56" written with an ordinary space. RAW compares the characters exactly as drawn.
 */
const RAW = { normalizer: (text: string) => text };

function everythingRead(): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') return void out.push(node);
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown };
    for (const key of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      if (typeof props?.[key] === 'string') out.push(props[key] as string);
    }
    const value = (props?.accessibilityValue as { text?: unknown } | undefined)?.text;
    if (typeof value === 'string') out.push(value);
    walk(children);
  };
  walk(screen.toJSON());
  return out;
}

function expectNoRawText() {
  for (const text of everythingRead()) {
    expect(text).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(text).not.toMatch(/\{\w+\}/);
  }
}

async function showIn(language: Language, currency: CurrencyCode) {
  setLanguage(language);
  setCurrency(currency);
  await render(<SalaryScreen />);
}

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockFailed = false;
  mockDetails = { rows: [fixedRow], hourlyAvailable: true };
});

it('reads in Spanish, with Mexican figures', async () => {
  await showIn('es', 'MXN');

  for (const line of [
    'Salario',
    'Total al mes',
    '$3,760.00',
    'Fuente 1',
    'Acme',
    'Salario fijo',
    'Por hora',
    'Importe',
    '$1,880.00',
    'Frecuencia',
    'Dos veces al mes',
    'Último día de pago',
    '30 sep 2026',
    'Se deposita en',
    'Agregar fuente',
    'Guardar',
  ]) {
    expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
  }
  expect(screen.getByText(/^Próximo día de pago: \d{1,2} [a-z]{3} \d{4}$/, RAW)).toBeTruthy();
  expect(screen.getByText(/^Próximo día de pago: \d{1,2} \S+ · 1 fuente$/, RAW)).toBeTruthy();
  for (const label of ['Quitar fuente 1', 'Cambiar el nombre de Acme', 'Abrir calculadora']) {
    expect(screen.getByLabelText(label, RAW)).toBeTruthy();
  }
  expectNoRawText();
});

it('reads in French, with French figures', async () => {
  await showIn('fr', 'CAD');

  for (const line of [
    'Salaire',
    'Total par mois',
    `3${NBSP}760,00${NBSP}$`,
    'Source 1',
    'Acme',
    'Paie fixe',
    'À l’heure',
    'Montant',
    `1${NBSP}880,00${NBSP}$`,
    'Fréquence',
    'Dernier jour de paie',
    '30 sept. 2026',
    'Versée dans',
    'Ajouter une source',
    'Enregistrer',
  ]) {
    expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
  }
  expect(
    screen.getByText(/^Prochain jour de paie\u00a0: \d{1,2} [a-zéû.]+ \d{4}$/, RAW),
  ).toBeTruthy();
  expect(
    screen.getByText(/^Prochain jour de paie\u00a0: \d{1,2} [a-zéû.]+ · 1 source$/, RAW),
  ).toBeTruthy();
  expect(screen.getByLabelText('Renommer Acme', RAW)).toBeTruthy();
  expectNoRawText();
});

it('works out hourly pay in French and saves the English figure', async () => {
  mockDetails = { rows: [hourlyRow], hourlyAvailable: true };
  await showIn('fr', 'CAD');

  for (const line of [
    'Taux horaire',
    `20,00${NBSP}$ de l’heure`,
    'Heures par semaine',
    'Heures supplémentaires',
    'Heures supplémentaires par semaine',
    'Taux des heures supplémentaires',
    'Chaque paie, avant impôts',
    // (40 × 20 + 5 × 30) × 2 weeks.
    `1${NBSP}900,00${NBSP}$`,
  ]) {
    expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
  }
  expect(screen.getAllByText('h', RAW).length).toBe(2);
  expect(
    screen.getByLabelText(
      /^Chaque paie, environ 1\u00a0900,00\u00a0\$ avant impôts\. Environ [\d\u00a0]+,\d{2}\u00a0\$ par mois\.$/,
      RAW,
    ),
  ).toBeTruthy();

  await fireEvent.press(screen.getByText('Enregistrer', RAW));
  expect(mockUpdate).toHaveBeenCalledWith({
    id: 's1',
    values: expect.objectContaining({ amount: 1900, hourly_rate: 20, hours_per_week: 40 }),
  });
});

it('names the source in a French hourly problem, with the no-break space before the colon', async () => {
  mockDetails = { rows: [{ ...hourlyRow, hours_per_week: null }], hourlyAvailable: true };
  await showIn('fr', 'CAD');

  await fireEvent.press(screen.getByText('Enregistrer', RAW));
  expect(
    screen.getByText(
      `Acme${NBSP}: Indique combien d’heures tu travailles dans une semaine normale.`,
      RAW,
    ),
  ).toBeTruthy();
  expect(mockUpdate).not.toHaveBeenCalled();
});

it('keeps every figure whole at large text and lets every line grow', async () => {
  const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
  Dimensions.set({ window, screen: window });
  mockDetails = { rows: [hourlyRow], hourlyAvailable: true };
  await showIn('fr', 'CAD');

  // The month's total and the paycheck estimate: each a figure of its own, measured and drawn as
  // one piece, with its cents.
  for (const id of ['monthly-total', 'paycheck']) {
    const copy = screen.getByTestId(`fit-copy-${id}`, { includeHiddenElements: true });
    const figure = copy.props.children as string;
    expect(figure).toMatch(/^[\d\u00a0]+,\d{2}\u00a0\$$/);
    const node = screen.getByText(figure, RAW);
    expect(node.props.numberOfLines).toBeUndefined();
    expect(node.props.adjustsFontSizeToFit).toBeUndefined();
    expect(node.props.maxFontSizeMultiplier).toBe(1.2);
  }
  expect(screen.getByText(`1${NBSP}900,00${NBSP}$`, RAW)).toBeTruthy();

  // The next payday lines, under Last payday and in the total card, are reading text.
  for (const line of [
    /^Prochain jour de paie\u00a0: \d{1,2} [a-zéû.]+ \d{4}$/,
    /^Prochain jour de paie\u00a0: .+ · 1 source$/,
  ]) {
    expect(screen.getByText(line, RAW).props.maxFontSizeMultiplier).toBe(1.6);
  }
  // The source's caption and name wrap beside its buttons, the add button's words inside it.
  expect(String(screen.getByText('Source 1', RAW).parent?.props.className)).toContain('flex-1');
  expect(String(screen.getByText('Ajouter une source', RAW).props.className)).toContain('shrink');
});

it('says the one failure line in the language on screen', async () => {
  mockFailed = true;
  await showIn('fr', 'CAD');
  expect(screen.getByText('Une erreur est survenue. Réessaie.', RAW)).toBeTruthy();
  expect(screen.getByText('Réessayer', RAW)).toBeTruthy();
});

describe('pay typed in any language', () => {
  const LOCALES = [
    {
      language: 'en' as const,
      currency: 'USD' as const,
      amount: '$1,880.00',
      deleteKey: 'Delete last digit',
      decimalKey: 'Decimal point',
      decimalFace: '.',
      done: 'Done',
      save: 'Save',
      calculator: 'Open calculator',
    },
    {
      language: 'es' as const,
      currency: 'MXN' as const,
      amount: '$1,880.00',
      deleteKey: 'Borrar el último dígito',
      decimalKey: 'Punto decimal',
      decimalFace: '.',
      done: 'Listo',
      save: 'Guardar',
      calculator: 'Abrir calculadora',
    },
    {
      language: 'fr' as const,
      currency: 'CAD' as const,
      amount: `1${NBSP}880,00${NBSP}$`,
      deleteKey: 'Effacer le dernier chiffre',
      decimalKey: 'Virgule décimale',
      decimalFace: ',',
      done: 'Terminé',
      save: 'Enregistrer',
      calculator: 'Ouvrir la calculatrice',
    },
  ];

  it('saves 1234.56 typed on the keypad as the same number in every language', async () => {
    for (const c of LOCALES) {
      await showIn(c.language, c.currency);
      await fireEvent.press(screen.getByText(c.amount, RAW));
      for (let i = 0; i < 4; i += 1) {
        await fireEvent.press(screen.getByLabelText(c.deleteKey, RAW));
      }
      for (const key of ['1', '2', '3', '4', c.decimalKey, '5', '6']) {
        await fireEvent.press(screen.getByLabelText(key, RAW));
      }
      await fireEvent.press(screen.getByText(c.done, RAW));
      await fireEvent.press(screen.getByText(c.save, RAW));
      await screen.unmount();
    }

    const amounts = mockUpdate.mock.calls.map(([{ values }]) => values.amount);
    expect(amounts).toEqual([1234.56, 1234.56, 1234.56]);
  });

  it('saves 20.15 ÷ 2 from the calculator as 10.08 in every language', async () => {
    for (const c of LOCALES) {
      await showIn(c.language, c.currency);
      await fireEvent.press(screen.getByLabelText(c.calculator, RAW));
      for (const key of ['AC', '2', '0', c.decimalFace, '1', '5', '÷', '2', '=']) {
        await fireEvent.press(screen.getByLabelText(key, RAW));
      }
      await fireEvent.press(screen.getByText(c.done, RAW));
      await fireEvent.press(screen.getByText(c.save, RAW));
      await screen.unmount();
    }

    const amounts = mockUpdate.mock.calls.map(([{ values }]) => values.amount);
    expect(amounts).toEqual([10.08, 10.08, 10.08]);
  });
});
