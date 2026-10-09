import { creditLimitValue } from '@/api/mutations';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { draftFromAmount, draftFromTyped, formatDraft } from '@/lib/typed-amount';

// Only creditLimitValue is real, and it never touches the client.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const NBSP = '\u00A0';

/** Types `keys` one at a time into a field that redraws what it is handed, as the form's does. */
function typeInto(keys: string, start = ''): { draft: string; shown: string } {
  let draft = start;
  for (const key of keys) {
    const shown = formatDraft(draft);
    draft =
      key === '⌫' ? draftFromTyped(shown, shown.slice(0, -1)) : draftFromTyped(shown, shown + key);
  }
  return { draft, shown: formatDraft(draft) };
}

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('typing an amount in English', () => {
  it('keeps the draft in ASCII and draws it grouped', () => {
    expect(typeInto('1234.56')).toEqual({ draft: '1234.56', shown: '1,234.56' });
    expect(typeInto('10000')).toEqual({ draft: '10000', shown: '10,000' });
  });

  it('takes "1,234.56" pasted whole as one thousand two hundred and thirty-four dollars', () => {
    expect(draftFromTyped('', '1,234.56')).toBe('1234.56');
  });

  it('never takes the grouping it drew for a decimal when a digit is deleted', () => {
    expect(typeInto('1234⌫')).toEqual({ draft: '123', shown: '123' });
    expect(typeInto('12345⌫')).toEqual({ draft: '1234', shown: '1,234' });
  });

  it('takes a comma from a keyboard set to another region as the decimal', () => {
    const shown = formatDraft('1234');
    expect(draftFromTyped(shown, `${shown},`)).toBe('1234.');
    expect(typeInto('5', '1234.')).toEqual({ draft: '1234.5', shown: '1,234.5' });
  });

  it('follows the keypad: two decimals, one point, nine whole digits, no leading zeros', () => {
    expect(typeInto('1.239').draft).toBe('1.23');
    expect(typeInto('1..5').draft).toBe('1.5');
    expect(typeInto('1234567890').draft).toBe('123456789');
    expect(typeInto('007').draft).toBe('7');
    expect(typeInto('.5').draft).toBe('0.5');
    expect(typeInto('abc').draft).toBe('');
  });

  it('empties the field when the last digit goes', () => {
    expect(typeInto('5⌫')).toEqual({ draft: '', shown: '' });
  });
});

describe('typing an amount in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('draws the same digits as "1 234,56" and keeps the same draft', () => {
    expect(typeInto('1234,56')).toEqual({ draft: '1234.56', shown: `1${NBSP}234,56` });
  });

  it('takes a point from a keyboard set to another region as the decimal too', () => {
    expect(typeInto('1234.56')).toEqual({ draft: '1234.56', shown: `1${NBSP}234,56` });
  });

  it('never takes its own grouping for a decimal when a digit is deleted', () => {
    expect(typeInto('12345⌫')).toEqual({ draft: '1234', shown: `1${NBSP}234` });
  });
});

describe('typing an amount in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('groups and marks as in English', () => {
    expect(typeInto('1234.56')).toEqual({ draft: '1234.56', shown: '1,234.56' });
  });
});

describe('the amount saved', () => {
  it('is the same number whatever language it was typed in', () => {
    const saved = (['en', 'es', 'fr'] as const).map((language) => {
      setLanguage(language);
      const decimal = language === 'fr' ? ',' : '.';
      return creditLimitValue(typeInto(`2500${decimal}50`).draft);
    });
    expect(saved).toEqual([2500.5, 2500.5, 2500.5]);
  });
});

describe('an amount worked out by the calculator', () => {
  it('becomes a keypad draft rounded to the cent', () => {
    expect(draftFromAmount(String(3700 / 3))).toBe('1233.33');
    expect(draftFromAmount(String(0.1 + 0.2))).toBe('0.3');
    expect(draftFromAmount(String(2 / 3))).toBe('0.67');
    expect(draftFromAmount('1250')).toBe('1250');
    expect(draftFromAmount('10.5')).toBe('10.5');
    expect(draftFromAmount('0.005')).toBe('0.01');
  });

  it('is empty for nothing, a negative or not a number', () => {
    expect(draftFromAmount('')).toBe('');
    expect(draftFromAmount('0')).toBe('');
    expect(draftFromAmount('-40')).toBe('');
    expect(draftFromAmount('0.004')).toBe('');
    expect(draftFromAmount('NaN')).toBe('');
  });

  it('draws grouped in the field and saves the rounded figure', () => {
    const draft = draftFromAmount(String(3700 / 3));
    expect(formatDraft(draft)).toBe('1,233.33');
    expect(Number(draft)).toBe(1233.33);
  });
});
