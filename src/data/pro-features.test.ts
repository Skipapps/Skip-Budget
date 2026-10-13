import { PRO_FEATURES } from '@/data/pro-features';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { exportFileName } from '@/lib/payment-export';

/** The explainer pages behind each locked door, read in the language on screen. */

// Each icon stands in as its own name, so a test can say which one a point carries.
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_target, name) => String(name) }));

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

/**
 * The examples are the same in every language: dictation is English, a card is a card, and an
 * export's file name is not translated.
 */
const SAME_EVERYWHERE = new Set(['voice', 'unlimited', 'export']);

/**
 * Approved with a heading and line that wrap to two lines; the page wraps them whole (no line
 * limit), so only the points are held to one line.
 */
const TWO_LINE_HEADINGS = new Set(['habits']);

/**
 * Approved words that wrap a point to two lines, by feature id and the point's place. The page
 * wraps a point whole beside its icon, so only these may run past one line.
 */
const TWO_LINE_POINTS = new Set(['unlimited:1']);

describe('PRO_FEATURES', () => {
  it('keeps its ids and gives every feature an icon, two or three points and an icon for each', () => {
    expect(features().map((feature) => feature.id)).toEqual([
      'insights',
      'scan',
      'voice',
      'history',
      'unlimited',
      'habits',
      'export',
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
      'Extras can still be opened and deleted if Pro ends',
    ]);
    expect(PRO_FEATURES.history.points[1].text).toBe('Nothing is deleted if Pro ends');
    const habits = PRO_FEATURES.habits;
    expect(habits.example).toBe('Coffee · 3 days skipped · $15.00 saved');
    expect(habits.title).toBe('See what skipping saves');
    expect(habits.subtitle).toBe('Tap the days you buy it. Skip adds up the days you don’t.');
    expect(habits.points.map((point) => point.text)).toEqual([
      'One tap records what you spent',
      'Every day you skip counts as saved',
      'Counts in your receipts and balance',
    ]);
    const exporting = PRO_FEATURES.export;
    expect(exporting.example).toBe('skip-payments-all-years.pdf');
    expect(exporting.title).toBe('Export your payments');
    expect(exporting.subtitle).toBe('Every payment, as a spreadsheet or a PDF.');
    expect(exporting.points.map((point) => point.text)).toEqual([
      'CSV for Numbers, Excel or Google Sheets',
      'A PDF statement to print or send',
      'Any year, up to 7 years back',
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
      'Los extras se pueden abrir y eliminar si Pro termina',
    ]);
    expect(PRO_FEATURES.history.points[1].text).toBe('Nada se borra si Pro termina');
    expect(PRO_FEATURES.export.title).toBe('Exporta tus pagos');
    expect(PRO_FEATURES.export.points[1].text).toBe('Extracto en PDF para imprimir o enviar');
  });

  it('reads in French', () => {
    setLanguage('fr');
    expect(PRO_FEATURES.unlimited.title).toBe('Ajoute-les tous');
    expect(PRO_FEATURES.unlimited.points.map((point) => point.text)).toEqual([
      'Cartes et comptes illimités',
      'Tu peux ouvrir et supprimer les autres si Pro finit',
    ]);
    expect(PRO_FEATURES.history.points[1].text).toBe('Rien n’est supprimé si Pro finit');
    expect(PRO_FEATURES.voice.points[2].text).toBe('Ta voix n’est jamais gardée');
    expect(PRO_FEATURES.history.example).toBe('De 90 jours à 7 ans');
    expect(PRO_FEATURES.habits.example).toBe('Café · 3 jours sans achat · 15,00 $ économisés');
    expect(PRO_FEATURES.export.subtitle).toBe('Chaque paiement, en tableur ou en PDF.');
    expect(PRO_FEATURES.export.points[0].text).toBe('CSV pour Numbers, Excel ou Google Sheets');
  });

  it.each(['en', 'es', 'fr'] as const)(
    'shows a file name the export really writes, with no year to go stale, in %s',
    (language) => {
      setLanguage(language);
      expect(PRO_FEATURES.export.example).toBe(
        exportFileName({ kind: 'all', year: 'all', ext: 'pdf' }),
      );
      expect(PRO_FEATURES.export.example).not.toMatch(/\d{4}/);
    },
  );

  it.each(['en', 'es', 'fr'] as const)(
    'keeps every line short enough for one line in %s',
    (language) => {
      setLanguage(language);
      for (const feature of features()) {
        // 28pt heading, 15pt line and 15pt points on a 390pt phone.
        const lines = TWO_LINE_HEADINGS.has(feature.id) ? 2 : 1;
        expect(feature.title.length).toBeLessThanOrEqual(22 * lines);
        expect(feature.subtitle.length).toBeLessThanOrEqual(42 * lines);
        feature.points.forEach((point, index) => {
          const pointLines = TWO_LINE_POINTS.has(`${feature.id}:${index}`) ? 2 : 1;
          expect(point.text.length).toBeLessThanOrEqual(40 * pointLines);
        });
        [
          feature.example,
          feature.title,
          feature.subtitle,
          ...feature.points.map((p) => p.text),
        ].forEach((line) => expect(line).not.toMatch(/\n/));
      }
    },
  );

  it('draws no padlock beside what happens to extra cards and accounts when Pro ends', () => {
    const icons = PRO_FEATURES.unlimited.points.map((point) => String(point.icon));
    expect(icons).toEqual(['Infinity', 'CircleCheck']);
    for (const feature of features()) {
      feature.points.forEach((point) => expect(String(point.icon)).not.toMatch(/Lock/));
    }
  });

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
