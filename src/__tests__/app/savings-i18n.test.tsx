import { render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import SavingsScreen from '@/app/savings';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Savings is a placeholder page, read in English, Spanish and French: its title and two lines are
 * all there is. It works nothing out, so no figure may appear and nothing may be read from the
 * server.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

const mockArtwork = jest.fn();
jest.mock('@/theme/artwork', () => ({
  useArtwork: () =>
    new Proxy(
      {},
      {
        get: (_target, name) => {
          mockArtwork(name);
          return () => null;
        },
      },
    ),
}));

// Anything the page asked of the data layer is recorded by name; nothing here answers it.
const mockDataRead = jest.fn();
const touching = (module: string) =>
  new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === '__esModule') return false;
        mockDataRead(`${module}.${String(name)}`);
        return () => ({});
      },
    },
  );
jest.mock('@/api/queries', () => touching('queries'));
jest.mock('@/api/mutations', () => touching('mutations'));
jest.mock('@/lib/supabase', () => touching('supabase'));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
}));

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function shownText(node: Node): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  // The title's measuring copy is on screen for its width only, never seen or heard.
  if (props.importantForAccessibility === 'no-hide-descendants') return [];
  const spoken = ['accessibilityLabel', 'accessibilityHint', 'placeholder'].flatMap((name) =>
    typeof props[name] === 'string' ? [props[name] as string] : [],
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Node))];
}

const WORDS: Record<Language, { title: string; headline: string; message: string }> = {
  en: {
    title: 'Savings',
    headline: 'Savings is getting a fresh start',
    message: 'A new way to save is on its way. It will show up here.',
  },
  es: {
    title: 'Ahorros',
    headline: 'Ahorros se está renovando',
    message: 'Viene en camino una nueva forma de ahorrar. Aparecerá aquí.',
  },
  fr: {
    title: 'Épargne',
    headline: 'L’épargne fait peau neuve',
    message: 'Une nouvelle façon d’épargner arrive bientôt. Elle s’affichera ici.',
  },
};
const BACK: Record<Language, string> = { en: 'Go back', es: 'Volver', fr: 'Retour' };
const LANGUAGES = Object.keys(WORDS) as Language[];

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
});
afterAll(() => resetLocaleForTests());

describe.each(LANGUAGES)('Savings in %s', (language) => {
  beforeEach(() => setLanguage(language));

  it('says its title and its two lines, and nothing else', async () => {
    const screen = await render(<SavingsScreen />);
    const words = WORDS[language];

    expect(screen.getByText(words.title)).toBeTruthy();
    expect(screen.getByText(words.headline)).toBeTruthy();
    expect(screen.getByText(words.message)).toBeTruthy();

    // The back button's label is the only other line; a raw key or a {param} would show here too.
    const lines = shownText(screen.toJSON() as Node);
    expect(lines).toHaveLength(4);
    expect(lines.filter((line) => line !== BACK[language])).toEqual([
      words.title,
      words.headline,
      words.message,
    ]);
  });

  it('shows no figure anywhere, spoken or written', async () => {
    const screen = await render(<SavingsScreen />);

    expect(shownText(screen.toJSON() as Node).filter((line) => /\d|[$€£]/.test(line))).toEqual([]);
  });

  it('draws the Savings art and reads nothing from the server', async () => {
    await render(<SavingsScreen />);

    expect(mockArtwork).toHaveBeenCalledWith('tileSavings');
    expect(mockDataRead).not.toHaveBeenCalled();
  });
});

describe('Savings at large text sizes', () => {
  beforeEach(() => {
    // The longest of the three languages, at the largest text size.
    setLanguage('es');
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
    Dimensions.set({ window, screen: window });
  });

  it('prints both lines whole, at the ceilings of a heading and of reading text', async () => {
    const screen = await render(<SavingsScreen />);

    const headline = screen.getByText(WORDS.es.headline);
    const message = screen.getByText(WORDS.es.message);
    for (const line of [headline, message]) {
      expect(line.props.numberOfLines).toBeUndefined();
      expect(line.props.adjustsFontSizeToFit).toBeUndefined();
    }
    expect(headline.props.maxFontSizeMultiplier).toBe(TEXT_CAP.heading);
    expect(message.props.maxFontSizeMultiplier).toBe(TEXT_CAP.reading);
  });
});
