import { fireEvent, render } from '@testing-library/react-native';

import FaqScreen from '@/app/faq';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** Common questions in Spanish and French: every line follows the language, prices included. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
}));

let mockStorePrices: unknown;
jest.mock('@/api/pro', () => ({ useProPrices: () => ({ data: mockStorePrices }) }));

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;
const LEFTOVER_PARAM = /\{\w+\}/;

const STORE = {
  monthly: { product: { priceString: 'MX$39.00' } },
  yearly: { product: { priceString: 'MX$399.00' } },
};

beforeEach(() => {
  resetLocaleForTests();
  mockStorePrices = undefined;
});
afterAll(() => resetLocaleForTests());

async function openEveryAnswer(screen: Awaited<ReturnType<typeof render>>, hint: string) {
  const questions = screen
    .getAllByRole('button')
    .filter((node) => node.props.accessibilityHint === hint);
  expect(questions).toHaveLength(16);
  for (const question of questions) {
    await fireEvent.press(question);
  }
}

describe('Common questions in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('translates the title, the sections and the way out', async () => {
    const screen = await render(<FaqScreen />);

    expect(screen.getByText('Preguntas frecuentes')).toBeTruthy();
    expect(screen.getByText(/^Respuestas cortas a lo que la gente pregunta\./)).toBeTruthy();
    const sections = [
      'Primeros pasos',
      'Tu dinero',
      'Recibos',
      'Préstamos',
      'Recordatorios',
      'Skip Pro y cobros',
      'Privacidad y tus datos',
    ];
    const headings = screen
      .getAllByText(new RegExp(`^(${sections.join('|')})$`))
      .map((node) => node.props.children);
    expect(headings).toEqual(sections);
    expect(screen.getByText('¿Sigues con dudas? Escríbenos')).toBeTruthy();
    expect(screen.getByLabelText('¿Por qué Skip no se conecta con mi banco?')).toBeTruthy();
  });

  it('opens every answer in Spanish, with no raw key or leftover parameter', async () => {
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Muestra la respuesta');

    expect(screen.getByText(/^A propósito\. Skip nunca pide credenciales bancarias/)).toBeTruthy();
    expect(screen.getByText(/^Solo lo que guardas:/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /\?$/ }).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(RAW_KEY)).toEqual([]);
    expect(screen.queryAllByText(LEFTOVER_PARAM)).toEqual([]);
    expect(screen.queryAllByText(/\bthe\b|\bSettings\b/)).toEqual([]);
  });

  it('quotes the fallback dollar prices until the store answers', async () => {
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Muestra la respuesta');

    expect(
      screen.getByText(/\$1\.99 al mes o \$19\.99 al año, cobrados por Apple\.$/),
    ).toBeTruthy();
  });

  it('quotes the store prices when it has answered', async () => {
    mockStorePrices = STORE;
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Muestra la respuesta');

    expect(
      screen.getByText(/MX\$39\.00 al mes o MX\$399\.00 al año, cobrados por Apple\.$/),
    ).toBeTruthy();
    expect(screen.queryAllByText(/\$1\.99/)).toEqual([]);
  });

  it('says the extra cards and accounts still open, edit and delete when Pro ends', async () => {
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Muestra la respuesta');

    expect(
      screen.getByText(
        'Nada se borra si Pro termina. Tu primera tarjeta de crédito y tu primera cuenta bancaria funcionan como antes. Las demás se quedan en Skip y siguen contando en tus saldos: puedes abrirlas, editarlas o eliminarlas, pero no elegirlas para gastos nuevos. Tampoco puedes agregar más allá del límite gratis, y las listas muestran los últimos 90 días (lo anterior se guarda, solo que no se ve hasta que Pro regrese).',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/en gris|no puedes abrirlas/)).toBeNull();
  });
});

describe('Common questions in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('translates the title, the sections and the way out', async () => {
    const screen = await render(<FaqScreen />);

    expect(screen.getByText('Questions fréquentes')).toBeTruthy();
    const sections = [
      'Premiers pas',
      'Ton argent',
      'Reçus',
      'Prêts',
      'Rappels',
      'Skip Pro et facturation',
      'Confidentialité et tes données',
    ];
    const headings = screen
      .getAllByText(new RegExp(`^(${sections.join('|')})$`))
      .map((node) => node.props.children);
    expect(headings).toEqual(sections);
    expect(screen.getByText('Toujours pas de réponse ? Écris-nous')).toBeTruthy();
    expect(
      screen.getByLabelText('Pourquoi Skip ne se connecte-t-il pas à ma banque ?'),
    ).toBeTruthy();
  });

  it('opens every answer in French, with no raw key or leftover parameter', async () => {
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Affiche la réponse');

    expect(screen.getByText(/^C’est voulu\. Skip ne demande jamais d’identifiants/)).toBeTruthy();
    expect(screen.getByText(/^Non\. La photo est lue sur l’appareil même/)).toBeTruthy();
    expect(screen.queryAllByText(RAW_KEY)).toEqual([]);
    expect(screen.queryAllByText(LEFTOVER_PARAM)).toEqual([]);
    expect(screen.queryAllByText(/\bthe\b|\bSettings\b/)).toEqual([]);
  });

  it('writes the dollar fallback the French way, and the store price as the store gives it', async () => {
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Affiche la réponse');

    expect(
      screen.getByText(/1,99\s\$ par mois ou 19,99\s\$ par an, facturés par Apple\.$/),
    ).toBeTruthy();
  });

  it('quotes the store prices when it has answered', async () => {
    mockStorePrices = STORE;
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Affiche la réponse');

    expect(
      screen.getByText(/MX\$39\.00 par mois ou MX\$399\.00 par an, facturés par Apple\.$/),
    ).toBeTruthy();
  });

  it('says the extra cards and accounts still open, edit and delete when Pro ends', async () => {
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Affiche la réponse');

    expect(
      screen.getByText(
        'Rien n’est supprimé si Pro finit. Ta première carte de crédit et ton premier compte bancaire fonctionnent comme avant. Les autres restent dans Skip et comptent toujours dans tes soldes : tu peux les ouvrir, les modifier ou les supprimer, mais pas les choisir pour de nouvelles dépenses. Tu ne peux pas non plus ajouter au-delà de la limite gratuite, et les listes affichent les 90 derniers jours (le reste est conservé, simplement masqué tant que Pro n’est pas de retour).',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/grisés|ne peux pas les ouvrir/)).toBeNull();
  });
});

describe('Common questions in English', () => {
  it('still quotes the fallback prices exactly as before', async () => {
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Shows the answer');

    expect(
      screen.getByText(
        /Insights and seven years of history\. \$1\.99 a month or \$19\.99 a year, billed by Apple\.$/,
      ),
    ).toBeTruthy();
  });

  it('promises only what Skip does when Pro ends', async () => {
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Shows the answer');

    expect(
      screen.getByText(
        'Nothing is deleted if Pro ends. Your first credit card and first bank account work as before. Any others stay in Skip and still count in your balances: you can open, edit or delete them, but not pick them for new spending. You also cannot add past the free allowance, and lists show the last 90 days (older entries are kept, just out of view until Pro returns).',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/early access|first-in-line|— ever/)).toBeNull();
    expect(screen.queryByText(/greyed out|cannot open/)).toBeNull();
  });

  it('quotes the store price in place of the fallback', async () => {
    mockStorePrices = STORE;
    const screen = await render(<FaqScreen />);
    await openEveryAnswer(screen, 'Shows the answer');

    expect(
      screen.getByText(/MX\$39\.00 a month or MX\$399\.00 a year, billed by Apple\.$/),
    ).toBeTruthy();
  });
});
