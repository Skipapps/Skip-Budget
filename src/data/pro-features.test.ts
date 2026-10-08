import { PRO_FEATURES } from '@/data/pro-features';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The explainer pages behind each locked door, read in the language on screen. */

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

const allText = () =>
  Object.values(PRO_FEATURES).flatMap((feature) => [
    feature.title,
    feature.tagline,
    ...feature.benefits.flatMap((benefit) => [benefit.title, benefit.detail]),
  ]);

describe('PRO_FEATURES', () => {
  it('keeps its English words and ids', () => {
    expect(PRO_FEATURES.history.title).toBe('Seven years of your money');
    expect(PRO_FEATURES.unlimited.benefits[2].title).toBe('Nothing ever locked or deleted');
    expect(Object.values(PRO_FEATURES).map((feature) => feature.id)).toEqual([
      'insights',
      'scan',
      'voice',
      'history',
      'logos',
      'unlimited',
    ]);
  });

  it('reads in Spanish', () => {
    setLanguage('es');
    expect(PRO_FEATURES.history.title).toBe('Siete años de tu dinero');
    expect(PRO_FEATURES.scan.tagline).toBe(
      'El plan Gratis lee 15 recibos al mes con la cámara y 15 desde fotos o archivos. Skip Pro los lee todos.',
    );
    expect(PRO_FEATURES.insights.benefits[0].title).toBe('Cómo estás, sin rodeos');
  });

  it('reads in French', () => {
    setLanguage('fr');
    expect(PRO_FEATURES.unlimited.title).toBe('Toutes tes cartes de crédit. Tous tes comptes.');
    expect(PRO_FEATURES.voice.benefits[2].title).toBe('Skip ne garde jamais ta voix');
    expect(PRO_FEATURES.voice.benefits[0].detail).toContain('Une phrase pour chacun');
  });

  it('follows a change of language on the same objects, with no key or English left over', () => {
    const english = allText();
    setLanguage('fr');
    const french = allText();

    expect(french).toHaveLength(english.length);
    french.forEach((line, index) => {
      expect(line).not.toMatch(/^pro\./);
      expect(line).not.toMatch(/\{\w+\}/);
      // The voice examples are English on purpose; everything around them is not.
      expect(line).not.toBe(english[index]);
    });
  });
});
