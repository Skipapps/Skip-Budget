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
const SAME_EVERYWHERE = new Set(['voice', 'logos', 'unlimited']);

describe('PRO_FEATURES', () => {
  it('keeps its ids and gives every feature an icon, three points and an icon for each', () => {
    expect(features().map((feature) => feature.id)).toEqual([
      'insights',
      'scan',
      'voice',
      'history',
      'logos',
      'unlimited',
    ]);
    for (const feature of features()) {
      expect(feature.icon).toBeDefined();
      expect(feature.points).toHaveLength(3);
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
    expect(PRO_FEATURES.unlimited.points[2].text).toBe('Nothing locked if Pro ends');
  });

  it('reads in Spanish', () => {
    setLanguage('es');
    expect(PRO_FEATURES.history.title).toBe('Mira más atrás');
    expect(PRO_FEATURES.scan.subtitle).toBe('Haz la foto. Skip la lee.');
    expect(PRO_FEATURES.insights.points[0].text).toBe('Cómo estás ahora mismo');
  });

  it('reads in French', () => {
    setLanguage('fr');
    expect(PRO_FEATURES.unlimited.title).toBe('Ajoute-les tous');
    expect(PRO_FEATURES.voice.points[2].text).toBe('Ta voix n’est jamais gardée');
    expect(PRO_FEATURES.history.example).toBe('De 90 jours à 7 ans');
  });

  it.each(['en', 'es', 'fr'] as const)(
    'keeps every line short enough for one line in %s',
    (language) => {
      setLanguage(language);
      for (const feature of features()) {
        // 28pt heading, 15pt line and 15pt points on a 390pt phone.
        expect(feature.title.length).toBeLessThanOrEqual(22);
        expect(feature.subtitle.length).toBeLessThanOrEqual(42);
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
