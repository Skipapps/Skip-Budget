import { act, fireEvent, render, screen } from '@testing-library/react-native';

import LoanCalculatorScreen from '@/app/loan-calculator';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * The loan calculator in Spanish and French. Words and the writing of figures follow the language;
 * the loan does not: the payment, interest and totals are the same cents in every language and
 * currency, and what goes on to /save-loan is the same ASCII figures.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accent: '#905479' }),
}));

const mockConfirm = jest.fn(async (_options: Record<string, string>) => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

const NBSP = '\u00a0';
/**
 * Text queries fold whitespace by default and count a no-break space as whitespace, so they would
 * pass "1 234,56" written with an ordinary space. RAW compares the characters exactly as drawn.
 */
const RAW = { normalizer: (text: string) => text };

/** Every string drawn or read out, in tree order. */
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

function expectNoRawText() {
  for (const text of everythingRead()) {
    expect(text).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(text).not.toMatch(/\{\w+\}/);
  }
}

/** Every money figure on the page as cents, whole or with cents, read back per language. */
function centsIn(text: string, language: Language): number[] {
  const pattern =
    language === 'fr'
      ? /(-?)(\d{1,3}(?:\u00a0\d{3})*)(?:,(\d{2}))?\u00a0[$£]/g
      : /(-?)[$£](\d{1,3}(?:,\d{3})*)(?:\.(\d{2}))?/g;
  return [...text.matchAll(pattern)].map(([, sign, whole, cents]) => {
    const value = Number(whole.replace(/\D/g, '')) * 100 + Number(cents ?? 0);
    return sign ? -value : value;
  });
}

async function showIn(language: Language, currency: CurrencyCode) {
  setLanguage(language);
  setCurrency(currency);
  await render(<LoanCalculatorScreen />);
}

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
});

describe('in Spanish', () => {
  beforeEach(() => showIn('es', 'MXN'));

  it('labels the loan, its sliders and its dates', () => {
    for (const line of [
      'Calculadora de préstamos',
      'Pago mensual',
      'El préstamo',
      'Importe del préstamo',
      'Tasa de interés',
      'Plazo',
      '7.50%',
      '5 años',
      '0%',
      '30%',
      '6 meses',
      '40 años',
      'Fechas',
      'Dinero recibido',
      'Primer pago',
      'Abonos a capital y comisiones',
      'Opcional',
      'Cómo se cobran los intereses',
      'Diario · 365',
      'Cálculo mensual',
      '30 / 360',
      'Prestado',
      'Intereses pagados',
      'Total que pagas',
      'A dónde va cada pago',
      'Guardar',
    ]) {
      expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
    }
    expect(
      screen.getByText(/^Los intereses se generan cada día sobre lo que aún debes/, RAW),
    ).toBeTruthy();
    expectNoRawText();
  });

  it('switches the note with the convention', async () => {
    await fireEvent.press(screen.getByLabelText('Cálculo mensual', RAW));
    expect(
      screen.getByText(
        /^Una doceava parte de la tasa anual cada mes, diga lo que diga el calendario/,
        RAW,
      ),
    ).toBeTruthy();
  });

  it('asks before filing the loan, in Spanish', async () => {
    await fireEvent.press(screen.getByText('Guardar', RAW));

    const [{ title, message, confirmLabel, cancelLabel }] = mockConfirm.mock.calls[0];
    expect(title).toBe('¿Agregar esto a las facturas mensuales?');
    expect(message).toMatch(
      /^\$\d{1,3}(,\d{3})*\.\d{2} al mes durante 5 años, en la categoría Préstamos\.$/,
    );
    expect(confirmLabel).toBe('Continuar');
    expect(cancelLabel).toBe('Ahora no');
  });
});

describe('in French', () => {
  beforeEach(() => showIn('fr', 'CAD'));

  it('writes rates, terms and amounts the French way', () => {
    for (const line of [
      'Calculateur de prêt',
      'Paiement mensuel',
      'Taux d’intérêt',
      'Durée',
      `7,50${NBSP}%`,
      '5 ans',
      `0${NBSP}%`,
      `30${NBSP}%`,
      '6 mois',
      '40 ans',
      `25${NBSP}000${NBSP}$`,
      `500${NBSP}$`,
      `1${NBSP}000${NBSP}000${NBSP}$`,
      'Versements supplémentaires et frais',
      'Facultatif',
      'Aucun supplément',
      'Quotidien · 365',
      'Calcul mensuel',
      'Total remboursé',
      'Où va chaque paiement',
      'Enregistrer',
    ]) {
      expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
    }
    expect(screen.getByLabelText(`Taux d’intérêt, 7,50${NBSP}%. Modifier`, RAW)).toBeTruthy();
    expectNoRawText();
  });

  it('keeps the payment whole and moves every summary figure under its label together', async () => {
    const copy = screen.getByTestId('fit-copy-payment', { includeHiddenElements: true });
    const payment = copy.props.children as string;
    // Measured and drawn as one piece, with its cents.
    expect(payment).toMatch(/^[\d\u00a0]+,\d{2}\u00a0\$$/);
    const figure = screen.getByText(payment, RAW);
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(figure.props.maxFontSizeMultiplier).toBe(1.2);

    const lines = ['borrowed', 'interest', 'fees', 'total', 'apr'].filter((id) =>
      screen.queryByTestId(`fit-slot-${id}-label`),
    );
    expect(lines).toEqual(expect.arrayContaining(['borrowed', 'interest', 'total']));
    const layout = async (testID: string, width: number) =>
      fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
      });
    const besideBefore = String(screen.getByTestId('fit-slot-total-label').parent?.props.className);
    expect(besideBefore).toContain('flex-row');
    // "Remboursé" in Total remboursé is the one word too wide to sit beside its figure.
    for (const id of lines) {
      await layout(`fit-slot-${id}-label`, 150);
      await layout(`fit-copy-${id}-label`, id === 'total' ? 160 : 90);
    }
    await layout('loan-summary', 290);

    for (const id of lines) {
      const row = screen.getByTestId(`fit-slot-${id}-label`).parent;
      expect([id, String(row?.props.className).includes('flex-row')]).toEqual([id, false]);
      expect(screen.getByTestId(`fit-slot-${id}-value`).parent).toBe(row);
    }
  });

  it('takes a rate typed with the decimal comma and files the same ASCII figure', async () => {
    await fireEvent.press(screen.getByLabelText(`Taux d’intérêt, 7,50${NBSP}%. Modifier`, RAW));
    expect(screen.getByText('Taux annuel en pourcentage', RAW)).toBeTruthy();
    expect(screen.getByText('7,5', RAW)).toBeTruthy();

    for (let i = 0; i < 3; i += 1) {
      await fireEvent.press(screen.getByLabelText('Effacer le dernier chiffre', RAW));
    }
    for (const key of ['8', 'Virgule décimale', '1', '4']) {
      await fireEvent.press(screen.getByLabelText(key, RAW));
    }
    expect(screen.getByText('8,14', RAW)).toBeTruthy();
    await fireEvent.press(screen.getByText('Terminé', RAW));

    expect(screen.getByText(`8,14${NBSP}%`, RAW)).toBeTruthy();

    await fireEvent.press(screen.getByText('Enregistrer', RAW));
    expect(mockConfirm.mock.calls[0][0].title).toBe(`Ajouter ceci aux factures mensuelles${NBSP}?`);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/save-loan',
        params: expect.objectContaining({ amount: '25000', rate: '8.14', months: '60' }),
      }),
    );
  });
});

describe('in every language and currency', () => {
  const LOCALES: [Language, CurrencyCode][] = [
    ['en', 'USD'],
    ['es', 'MXN'],
    ['fr', 'CAD'],
    ['fr', 'GBP'],
  ];

  it('shows the same loan, figure for figure', async () => {
    const figures: number[][] = [];
    for (const [language, currency] of LOCALES) {
      await showIn(language, currency);
      figures.push(everythingRead().flatMap((text) => centsIn(text, language)));
      await screen.unmount();
    }
    expect(figures[0].length).toBeGreaterThan(5);
    for (const other of figures.slice(1)) expect(other).toEqual(figures[0]);
  });

  it('hands /save-loan the same figures', async () => {
    for (const [language, currency] of LOCALES) {
      await showIn(language, currency);
      await fireEvent.press(screen.getByRole('button', { name: /^(Save|Guardar|Enregistrer)$/ }));
      await screen.unmount();
    }
    const sent = mockPush.mock.calls.map(([route]) => route);
    expect(sent).toHaveLength(LOCALES.length);
    for (const route of sent.slice(1)) expect(route).toEqual(sent[0]);
  });
});

describe('on the free plan', () => {
  afterEach(() => resetProStatusForTests());

  it('opens the calculator itself: it is free, never the Pro explainer', async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
    await render(<LoanCalculatorScreen />);
    expect(screen.getByText('Monthly payment', RAW)).toBeTruthy();
  });
});
