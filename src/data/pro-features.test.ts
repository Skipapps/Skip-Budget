import { PRO_FEATURES } from '@/data/pro-features';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The explainer pages behind each locked door, read in the language on screen. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

const features = () => Object.values(PRO_FEATURES);

const allText = () =>
  features().flatMap((feature) => [
    feature.example,
    feature.title,
    feature.subtitle,
    ...feature.points.map((point) => point.text),
  ]);

/** The examples are the same in every language: dictation is English, and a card is a card. */
const SAME_EVERYWHERE = new Set(['voice', 'unlimited']);

/**
 * Approved with a heading and line that wrap to two lines; the page wraps them whole (no line
 * limit), so only the points are held to one line.
 */
const TWO_LINE_HEADINGS = new Set(['habits']);

describe('PRO_FEATURES', () => {
  it('keeps its ids and gives every feature an icon, two or three points and an icon for each', () => {
    expect(features().map((feature) => feature.id)).toEqual([
      'insights',
      'scan',
      'voice',
      'history',
      'unlimited',
      'habits',
    ]);
    for (const feature of features()) {
      expect(feature.icon).toBeDefined();
      expect(feature.points).toHaveLength(feature.id === 'unlimited' ? 2 : 3);
      feature.points.forEach((point) => expect(point.icon).toBeDefined());
    }
  });

  it('reads in English, the voice page exactly as designed', () => {
    const voice = PRO_FEATURES.voice;
    expect(voice.example).toBe('“$12.50 at Starbucks today”');
    expect(voice.title).toBe('Just say it');
    expect(voice.subtitle).toBe('Speak it. Skip writes it down.');
    expect(voice.points.map((point) => point.text)).toEqual([
      'Log receipts, bills and subscriptions',
      'You review it before it saves',
      'Your voice is never stored',
    ]);
    expect(PRO_FEATURES.history.title).toBe('See further back');
    // Moving money between accounts is free on every plan, so Unlimited makes two points.
    expect(PRO_FEATURES.unlimited.points.map((point) => point.text)).toEqual([
      'Unlimited cards and accounts',
      'Nothing locked if Pro ends',
    ]);
    const habits = PRO_FEATURES.habits;
    expect(habits.example).toBe('Coffee · 3 days skipped · $15.00 saved');
    expect(habits.title).toBe('See what skipping saves');
    expect(habits.subtitle).toBe('Tap the days you buy it. Skip adds up the days you don’t.');
    expect(habits.points.map((point) => point.text)).toEqual([
      'One tap records what you spent',
      'Every day you skip counts as saved',
      'Counts in your receipts and balance',
    ]);
  });

  it('reads in Spanish', () => {
    setLanguage('es');
    expect(PRO_FEATURES.history.title).toBe('Mira más atrás');
    expect(PRO_FEATURES.scan.subtitle).toBe('Haz la foto. Skip la lee.');
    expect(PRO_FEATURES.insights.points[0].text).toBe('Cómo estás ahora mismo');
    expect(PRO_FEATURES.habits.points[1].text).toBe('Cada día sin comprar cuenta como ahorro');
    expect(PRO_FEATURES.unlimited.points.map((point) => point.text)).toEqual([
      'Tarjetas y cuentas sin límite',
      'Nada se bloquea si Pro termina',
    ]);
  });

  it('reads in French', () => {
    setLanguage('fr');
    expect(PRO_FEATURES.unlimited.title).toBe('Ajoute-les tous');
    expect(PRO_FEATURES.unlimited.points.map((point) => point.text)).toEqual([
      'Cartes et comptes illimités',
      'Rien n’est bloqué si Pro finit',
    ]);
    expect(PRO_FEATURES.voice.points[2].text).toBe('Ta voix n’est jamais gardée');
    expect(PRO_FEATURES.history.example).toBe('De 90 jours à 7 ans');
    expect(PRO_FEATURES.habits.example).toBe('Café · 3 jours sans achat · 15,00 $ économisés');
  });

  it.each(['en', 'es', 'fr'] as const)(
    'keeps every line short enough for one line in %s',
    (language) => {
      setLanguage(language);
      for (const feature of features()) {
        // 28pt heading, 15pt line and 15pt points on a 390pt phone.
        const lines = TWO_LINE_HEADINGS.has(feature.id) ? 2 : 1;
        expect(feature.title.length).toBeLessThanOrEqual(22 * lines);
        expect(feature.subtitle.length).toBeLessThanOrEqual(42 * lines);
        feature.points.forEach((point) => expect(point.text.length).toBeLessThanOrEqual(40));
        [
          feature.example,
          feature.title,
          feature.subtitle,
          ...feature.points.map((p) => p.text),
        ].forEach((line) => expect(line).not.toMatch(/\n/));
      }
    },
  );

  it('follows a change of language on the same objects, with no key left over', () => {
    const english = features().map(({ id, example, title }) => ({ id, example, title }));
    const englishText = allText();
    setLanguage('fr');
    const french = allText();

    expect(french).toHaveLength(englishText.length);
    french.forEach((line) => {
      expect(line).not.toMatch(/^pro\./);
      expect(line).not.toMatch(/\{\w+\}/);
    });

    features().forEach((feature, index) => {
      expect(feature.id).toBe(english[index].id);
      expect(feature.title).not.toBe(english[index].title);
      if (SAME_EVERYWHERE.has(feature.id)) expect(feature.example).toBe(english[index].example);
      else expect(feature.example).not.toBe(english[index].example);
    });
  });
});
