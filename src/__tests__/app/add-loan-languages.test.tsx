import { fireEvent, render, screen, within } from '@testing-library/react-native';

import AddLoanScreen from '@/app/add-loan';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/** A drawn element, as the queries hand them back. */
type Node = ReturnType<typeof screen.getByText>;

/**
 * Adding a loan in Spanish and French. The words and the writing of figures follow the language;
 * the loan saved does not: it is the same to the cent in every language and currency. The loan is
 * the wireframe's, handed over from the calculator.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  selection: jest.fn(),
  toggle: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
  useLoanTypeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useTheme: () => ({ scheme: 'light' }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn() }));
jest.mock('@/providers/toast-context', () => ({ useToast: () => jest.fn() }));

const mockSave = jest.fn(async (_input: Record<string, unknown>) => ({ id: 'bill-9' }));
jest.mock('@/api/mutations', () => ({
  useSaveLoan: () => ({ mutateAsync: mockSave, isPending: false }),
  useUpdateLoan: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteBill: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
// The edit pages' loading state; a new loan never shows it.
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null, Skeleton: () => null }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: [] }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/push', () => ({ enableReminders: jest.fn() }));
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => jest.fn(),
}));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  router: {
    back: jest.fn(),
    canDismiss: () => true,
    dismissAll: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.useFakeTimers().setSystemTime(new Date(2026, 9, 12, 9, 0));
afterAll(() => {
  jest.useRealTimers();
  resetLocaleForTests();
});

/** The wireframe loan as the calculator hands it over. */
const WIREFRAME = {
  view: 'details',
  amount: '18000',
  rate: '6.25',
  months: '48',
  start: '2025-01-27',
  funded: '2024-12-27',
  basis: 'actual/365',
  monthly: '424.8',
};

const NBSP = ' ';
/** Compares the characters exactly as drawn, so a no-break space is not taken for a space. */
const RAW = { normalizer: (text: string) => text };

function box(label: string): Node {
  let node: Node | null = screen.getByText(label, RAW);
  while (node) {
    const inputs = within(node).queryAllByDisplayValue(/.*/);
    if (inputs.length === 1) return inputs[0];
    if (inputs.length > 1) break;
    node = node.parent;
  }
  throw new Error(`No single text box under "${label}"`);
}

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
    walk(children);
  };
  walk(screen.toJSON());
  return out;
}

/** No key and no placeholder may reach the screen untranslated. */
function expectAllWritten() {
  for (const text of everythingRead()) {
    expect(text).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(text).not.toMatch(/\{\w+\}/);
  }
}

async function showIn(language: Language, currency: CurrencyCode, params = WIREFRAME) {
  resetLocaleForTests();
  setLanguage(language);
  setCurrency(currency);
  mockParams = params;
  await render(<AddLoanScreen />);
}

const SKIP = /^(Skip|Omitir|Passer)$/;
const CONTINUE = /^(Continue|Continuar|Continuer)$/;
const SAVE = /^(Save loan|Guardar préstamo|Enregistrer le prêt)$/;
const CAR = /^(Car|Auto)$/;

beforeEach(() => jest.clearAllMocks());

describe('in Spanish', () => {
  it('asks for the payment on the keypad', async () => {
    await showIn('es', 'MXN', {} as typeof WIREFRAME);
    for (const line of [
      'Agregar préstamo',
      '¿Cuánto pagas cada mes?',
      'Escribe tu cuota mensual.',
    ]) {
      expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
    }
    expectAllWritten();
  });

  it('writes the details and the review', async () => {
    await showIn('es', 'MXN');
    for (const line of [
      'Tu préstamo',
      'Tipo de préstamo',
      'Nombre del préstamo',
      'Pago mensual',
      'Importe prestado',
      'APR',
      'Plazo',
      'Años',
      'Meses',
      'Fecha de inicio',
      '27 dic 2024',
      'Día de pago',
      'Primer pago: 27 ene 2025',
      'Se paga desde',
      'Continuar',
    ]) {
      expect([line, screen.queryAllByText(line, RAW).length > 0]).toEqual([line, true]);
    }
    await fireEvent.press(screen.getByRole('radio', { name: 'Auto' }));
    expect(box('Nombre del préstamo').props.value).toBe('Préstamo de auto');
    expectAllWritten();

    await fireEvent.press(screen.getByRole('radio', { name: 'Omitir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    for (const line of [
      'Revisa tu préstamo',
      'Préstamo de auto',
      'Próximo pago: 27 oct 2026',
      '$18,000',
      'Mensual',
      '$424.80',
      '4 años · 48 pagos',
      'Intereses totales',
      '$2,390.10',
      'Total que pagarás',
      '$20,390.10',
      'Agregar a las facturas mensuales',
      'Cuenta en tus gastos del mes',
      'Recordarme',
      '24 oct, 3 días antes de que venza',
      'Calendario de pagos',
      'Mira a dónde van los 48 pagos',
      'Guardar préstamo',
      'Volver a editar',
    ]) {
      expect([line, screen.queryAllByText(line, RAW).length > 0]).toEqual([line, true]);
    }
    expectAllWritten();
  });
});

describe('in French', () => {
  it('writes the details, with French figures and a rate typed with a comma', async () => {
    await showIn('fr', 'CAD');
    for (const line of [
      'Ton prêt',
      'Type de prêt',
      'Nom du prêt',
      'Paiement mensuel',
      'Montant emprunté',
      'Durée',
      'Ans',
      'Mois',
      'Date de début',
      '27 déc. 2024',
      'Jour de paiement',
      `Premier paiement${NBSP}: 27 janv. 2025`,
      'Payé depuis',
    ]) {
      expect([line, screen.queryAllByText(line, RAW).length > 0]).toEqual([line, true]);
    }
    expect(
      screen.getByRole('button', { name: `Paiement mensuel, 424,80${NBSP}$. Modifier` }),
    ).toBeTruthy();
    expect(box('APR').props.value).toBe('6,25');
    await fireEvent.changeText(box('APR'), '6,5');
    expect(box('APR').props.value).toBe('6,5');
    expectAllWritten();
  });

  it('says what is still missing, by the names on the page', async () => {
    await showIn('fr', 'CAD');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    expect(
      screen.getByText(
        `Pour continuer, remplis${NBSP}: Type de prêt, Nom du prêt, Payé depuis.`,
        RAW,
      ),
    ).toBeTruthy();
  });

  it('writes the review the French way', async () => {
    await showIn('fr', 'CAD');
    await fireEvent.press(screen.getByRole('radio', { name: 'Auto' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Passer' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    for (const line of [
      'Vérifie ton prêt',
      'Prêt auto',
      `Prochain paiement${NBSP}: 27 oct. 2026`,
      `18${NBSP}000${NBSP}$`,
      `424,80${NBSP}$`,
      `6,25${NBSP}%`,
      '4 ans · 48 paiements',
      `2${NBSP}390,10${NBSP}$`,
      'Total que tu paieras',
      'Ajouter aux factures mensuelles',
      'Me le rappeler',
      'Enregistrer le prêt',
      'Revenir aux détails',
    ]) {
      expect([line, screen.queryAllByText(line, RAW).length > 0]).toEqual([line, true]);
    }
    expectAllWritten();
  });
});

describe('in every language and currency', () => {
  it('saves the identical loan', async () => {
    const LOCALES: [Language, CurrencyCode][] = [
      ['en', 'USD'],
      ['es', 'MXN'],
      ['fr', 'CAD'],
      ['fr', 'GBP'],
    ];
    for (const [language, currency] of LOCALES) {
      await showIn(language, currency);
      await fireEvent.press(screen.getByRole('radio', { name: CAR }));
      await fireEvent.changeText(
        box(
          language === 'en'
            ? 'Loan name'
            : language === 'es'
              ? 'Nombre del préstamo'
              : 'Nom du prêt',
        ),
        'Auto',
      );
      await fireEvent.press(screen.getByRole('radio', { name: SKIP }));
      await fireEvent.press(screen.getByRole('button', { name: CONTINUE }));
      await fireEvent.press(screen.getByRole('button', { name: SAVE }));
      await screen.unmount();
    }

    const saved = mockSave.mock.calls.map(([input]) => input);
    expect(saved).toHaveLength(LOCALES.length);
    for (const input of saved.slice(1)) expect(input).toEqual(saved[0]);
    expect(saved[0]).toEqual({
      name: 'Auto',
      iconId: 'loan-car',
      principal: 18_000,
      annualRate: 6.25,
      termMonths: 48,
      monthlyPayment: 424.8,
      totalInterest: 2390.1,
      firstPaymentOn: '2025-01-27',
      fundedOn: '2024-12-27',
      dayCountBasis: 'actual/365',
      cardId: null,
      bankAccountId: null,
      paymentOverrides: null,
      lastPaymentOn: null,
      paymentDay: null,
      inSpending: true,
      countsFrom: '2026-10-12',
    });
  });
});
