import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { lastUpdated, updatedLine } from '@/lib/source-updated';

const TODAY = '2026-10-09';

const ledger = (...dates: string[]) => ({
  entries: dates.map((date, index) => ({
    id: `e${index}`,
    label: 'x',
    date,
    amount: -1,
    kind: 'receipt' as const,
  })),
});

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('lastUpdated', () => {
  it('is the later of the typed balance day and the newest entry', () => {
    expect(lastUpdated('2026-10-01', ledger('2026-10-05', '2026-09-20'), TODAY)).toBe('2026-10-05');
    expect(lastUpdated('2026-10-07', ledger('2026-10-05'), TODAY)).toBe('2026-10-07');
  });

  it('does not trust the ledger to be in order', () => {
    expect(lastUpdated(null, ledger('2026-09-01', '2026-10-03', '2026-09-30'), TODAY)).toBe(
      '2026-10-03',
    );
  });

  it('leaves out anything after today', () => {
    expect(lastUpdated('2026-10-12', ledger('2026-10-20', '2026-10-02'), TODAY)).toBe('2026-10-02');
  });

  it('is the typed day alone with no entries, and null with neither', () => {
    expect(lastUpdated('2026-09-30', ledger(), TODAY)).toBe('2026-09-30');
    expect(lastUpdated(undefined, null, TODAY)).toBeNull();
    expect(lastUpdated(null, ledger(), TODAY)).toBeNull();
  });
});

describe('updatedLine', () => {
  it('says today, yesterday, a day this year without the year, and an older one with it', () => {
    expect(updatedLine(TODAY, TODAY)).toBe('Updated today');
    expect(updatedLine('2026-10-08', TODAY)).toBe('Updated yesterday');
    expect(updatedLine('2026-10-04', TODAY)).toBe('Updated 4 Oct');
    expect(updatedLine('2025-12-31', TODAY)).toBe('Updated 31 Dec 2025');
    expect(updatedLine(null, TODAY)).toBeNull();
  });

  it('counts yesterday across a month and a year boundary', () => {
    expect(updatedLine('2026-09-30', '2026-10-01')).toBe('Updated yesterday');
    expect(updatedLine('2025-12-31', '2026-01-01')).toBe('Updated yesterday');
  });

  it('reads in Spanish and French', () => {
    setLanguage('es');
    expect(updatedLine(TODAY, TODAY)).toBe('Actualizado hoy');
    expect(updatedLine('2026-10-08', TODAY)).toBe('Actualizado ayer');
    expect(updatedLine('2026-10-04', TODAY)).toMatch(/^Actualizado el 4 \S+$/);

    setLanguage('fr');
    expect(updatedLine(TODAY, TODAY)).toBe('Mis à jour aujourd’hui');
    expect(updatedLine('2026-10-08', TODAY)).toBe('Mis à jour hier');
    expect(updatedLine('2026-10-04', TODAY)).toMatch(/^Mis à jour le 4 \S+$/);
  });
});
