import { fireEvent, render } from '@testing-library/react-native';

import ProScreen from '@/app/pro';
import ProFeatureScreen from '@/app/pro-feature';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The Pro page and a feature's explainer, read in Spanish and in French. Prices are the store's
 * own once it answers, and the dollar fallbacks until then; neither is ever converted.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'history' }),
}));

// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    body: '#333333',
    line: '#DDDDDD',
    accentInk: '#905479',
    onControl: '#FFFFFF',
  }),
}));

let mockPro = false;
let mockStore: 'closed' | 'open' = 'closed';
let mockPrices: { monthly: string; yearly: string; perMonth: string } = {
  monthly: '$1.99',
  yearly: '$19.99',
  perMonth: '$1.67',
};

jest.mock('@/api/pro', () => {
  // Required inside the factory: jest.mock is hoisted above the imports.
  const { t } = jest.requireActual('@/i18n');
  return {
    usePro: () => ({ pro: mockPro, ready: true }),
    purchasesAvailable: () => mockStore === 'open',
    usePurchasePro: () => ({ purchase: jest.fn(), restore: async () => false }),
    useProPrices: () =>
      mockStore === 'open'
        ? {
            data: {
              monthly: { product: { priceString: mockPrices.monthly } },
              yearly: {
                product: {
                  priceString: mockPrices.yearly,
                  pricePerMonthString: mockPrices.perMonth,
                },
              },
              trialText: t('pro.trial.week', { count: 1 }),
              debug: '',
            },
            error: null,
            isFetched: true,
            isFetching: false,
            refetch: jest.fn(),
          }
        : { data: undefined, error: null, isFetched: true, isFetching: false, refetch: jest.fn() },
  };
});

type Screen = Awaited<ReturnType<typeof render>>;
type Json = ReturnType<Screen['toJSON']>;

/** Every string drawn or read out, so a raw key or an unfilled {param} cannot hide anywhere. */
function wordsOn(screen: Screen): string[] {
  const found: string[] = [];
  const walk = (node: Json | string | Json[]) => {
    if (node === null) return;
    if (typeof node === 'string') return void found.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') found.push(value);
    }
    node.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

function expectNoRawText(screen: Screen) {
  const words = wordsOn(screen);
  expect(words.length).toBeGreaterThan(0);
  expect(words.filter((word) => /^[a-z]+\.[a-zA-Z]+\./.test(word))).toEqual([]);
  expect(words.filter((word) => /\{\w+\}/.test(word))).toEqual([]);
}

const NBSP = '\u00a0';

beforeEach(() => {
  resetLocaleForTests();
  mockPro = false;
  mockStore = 'closed';
  mockPrices = { monthly: '$1.99', yearly: '$19.99', perMonth: '$1.67' };
});
afterAll(() => resetLocaleForTests());

describe('the Pro page in English', () => {
  it('writes each fallback price once, with its period once', async () => {
    const screen = await render(<ProScreen />);
    expect(screen.getByText('$19.99/yr')).toBeTruthy();
    expect(screen.getByText('$1.99/mo')).toBeTruthy();
    expect(screen.getByText('$1.67 a month, billed once a year')).toBeTruthy();
    expect(screen.getByText('2 MONTHS FREE')).toBeTruthy();
  });

  it('lets the offer sticker follow the text size, since the card does not say it aloud', async () => {
    const screen = await render(<ProScreen />);
    const sticker = screen.getByText('2 MONTHS FREE');
    expect(sticker.props.allowFontScaling).toBeUndefined();
    expect(sticker.props.maxFontSizeMultiplier).toBe(1.3);
  });
});

describe('the Pro page in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('sells the features at the dollar fallbacks while the store is closed', async () => {
    const screen = await render(<ProScreen />);
    expect(
      screen.getByText('Todo lo que Skip puede hacer, por menos de lo que cuesta un café al mes.'),
    ).toBeTruthy();
    expect(screen.getByText('Tarjetas de crédito, cuentas e ingresos ilimitados')).toBeTruthy();
    expect(screen.getByText('Anual')).toBeTruthy();
    expect(screen.getByText('$19.99/año')).toBeTruthy();
    expect(screen.getByText('$1.67 al mes, cobrado una vez al año')).toBeTruthy();
    expect(screen.getByText('2 MESES GRATIS')).toBeTruthy();
    expect(screen.getByText('Mensual')).toBeTruthy();
    expect(screen.getByText('$1.99/mes')).toBeTruthy();
    expect(screen.getByText('Cancela cuando quieras en tus suscripciones de Apple')).toBeTruthy();
    expect(
      screen.getByText(
        'Las compras aún no están disponibles en esta versión. Todo lo de esta página llegará pronto.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Volver a consultar')).toBeTruthy();
    expect(screen.getByText('Restaurar compras')).toBeTruthy();
    expect(screen.getByText('Términos')).toBeTruthy();
    expect(screen.getByText('Privacidad')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('offers the store’s trial at the store’s prices once it answers', async () => {
    mockStore = 'open';
    const screen = await render(<ProScreen />);
    expect(screen.getByText('Prueba 1 semana gratis')).toBeTruthy();
    expect(screen.getByText('1 semana gratis, luego se cobra una vez al año')).toBeTruthy();
    expect(screen.getByText('1 semana gratis, luego cada mes')).toBeTruthy();
    expect(
      screen.getByLabelText('Anual, $19.99/año. 1 semana gratis, luego se cobra una vez al año'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Restaurar compras'));
    expect(await screen.findByText('No hay compras anteriores que restaurar.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('thanks someone who already has Pro', async () => {
    mockPro = true;
    const screen = await render(<ProScreen />);
    expect(screen.getByText('Tienes Skip Pro')).toBeTruthy();
    expect(screen.getByText('Administrar en el App Store')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('explains a locked feature, the price last', async () => {
    const screen = await render(<ProFeatureScreen />);
    expect(screen.getByText('Siete años de tu dinero')).toBeTruthy();
    expect(screen.getByText('Parte de Skip Pro')).toBeTruthy();
    expect(screen.getByText('Junto con todo lo demás que desbloquea Pro')).toBeTruthy();
    expect(screen.getByText('Ver Skip Pro: $1.99/mes')).toBeTruthy();
    expect(screen.getByText('o $19.99/año · Ahora no')).toBeTruthy();
    expect(screen.getByLabelText('Ahora no')).toBeTruthy();
    expectNoRawText(screen);
  });
});

describe('the Pro page in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('writes the dollar fallbacks the French way', async () => {
    const screen = await render(<ProScreen />);
    expect(
      screen.getByText('Tout ce que Skip peut faire, pour moins qu’un café par mois.'),
    ).toBeTruthy();
    expect(screen.getByText('Annuel')).toBeTruthy();
    expect(screen.getByText(`19,99${NBSP}$/an`)).toBeTruthy();
    expect(screen.getByText(`1,67${NBSP}$ par mois, facturé une fois par an`)).toBeTruthy();
    expect(screen.getByText('2 MOIS GRATUITS')).toBeTruthy();
    expect(screen.getByText(`1,99${NBSP}$/mois`)).toBeTruthy();
    expect(screen.getByText('Restaurer les achats')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('shows the store’s own price strings once it answers', async () => {
    mockStore = 'open';
    mockPrices = { monthly: '2,49 $', yearly: '24,99 $', perMonth: '2,08 $' };
    const screen = await render(<ProScreen />);
    expect(screen.getByText('24,99 $/an')).toBeTruthy();
    expect(screen.getByText('2,49 $/mois')).toBeTruthy();
    expect(screen.getByText('Essaie 1 semaine gratuite')).toBeTruthy();
    expect(screen.getByText('1 semaine gratuite, puis chaque mois')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('explains a locked feature with the store’s prices', async () => {
    mockStore = 'open';
    mockPrices = { monthly: '2,49 $', yearly: '24,99 $', perMonth: '2,08 $' };
    const screen = await render(<ProFeatureScreen />);
    expect(screen.getByText('Sept ans de ton argent')).toBeTruthy();
    expect(screen.getByText('Inclus dans Skip Pro')).toBeTruthy();
    expect(screen.getByText('Voir Skip Pro — 2,49 $/mois')).toBeTruthy();
    expect(screen.getByText('ou 24,99 $/an · Pas maintenant')).toBeTruthy();
    expectNoRawText(screen);
  });
});
