import { DIRECTORY } from './test-fixtures';
import { VOCABULARY_CAP, voiceVocabulary } from './vocabulary';

describe('voiceVocabulary', () => {
  it("puts the person's own merchants first, then kind words, then brands by rank", () => {
    const words = voiceVocabulary(DIRECTORY, ["Joe's Diner", 'Oakwood Apartments']);
    expect(words.slice(0, 2)).toEqual(["Joe's Diner", 'Oakwood Apartments']);
    expect(words).toContain('subscription');
    expect(words).toContain('electric bill');
    expect(words.indexOf('rent')).toBeLessThan(words.indexOf('Amazon'));
    expect(words.indexOf('Amazon')).toBeLessThan(words.indexOf('Walmart'));
  });

  it('drops case-insensitive duplicates and blanks, keeping the first spelling', () => {
    const words = voiceVocabulary(DIRECTORY, ['NETFLIX', '  ', 'netflix', 'Rent', '']);
    expect(words.filter((word) => word.toLowerCase() === 'netflix')).toEqual(['NETFLIX']);
    expect(words.filter((word) => word.toLowerCase() === 'rent')).toEqual(['Rent']);
    expect(words).not.toContain('');
  });

  it('caps the list at 100', () => {
    const own = Array.from({ length: 150 }, (_, i) => `Shop ${i}`);
    const words = voiceVocabulary(DIRECTORY, own);
    expect(VOCABULARY_CAP).toBe(100);
    expect(words).toHaveLength(100);
    expect(words[99]).toBe('Shop 99');
  });

  it('copes with no directory and no merchants', () => {
    expect(voiceVocabulary([], []).length).toBeGreaterThan(0);
    expect(voiceVocabulary(undefined as never, undefined as never).length).toBeGreaterThan(0);
  });
});
