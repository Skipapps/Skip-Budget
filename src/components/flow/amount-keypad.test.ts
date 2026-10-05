import { applyAmountKey } from './amount-keypad';

// lucide ships ESM that Jest does not transform; the rules under test never render a glyph.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

// The theme provider reaches for AsyncStorage's native module, which does not exist under Jest.
jest.mock('@/providers/theme-provider', () => ({ useColors: () => ({ ink: '#111111' }) }));

describe('applyAmountKey', () => {
  it('appends digits', () => {
    expect(applyAmountKey('', '1')).toBe('1');
    expect(applyAmountKey('12', '5')).toBe('125');
  });

  it('replaces a lone leading zero rather than keeping it', () => {
    expect(applyAmountKey('0', '7')).toBe('7');
    // Only a lone one: 0.5 is a real figure and 10 is not "1" then "0".
    expect(applyAmountKey('0.', '5')).toBe('0.5');
    expect(applyAmountKey('1', '0')).toBe('10');
  });

  it('allows one decimal point, and starts one on an empty draft', () => {
    expect(applyAmountKey('', '.')).toBe('0.');
    expect(applyAmountKey('12', '.')).toBe('12.');
    expect(applyAmountKey('12.5', '.')).toBe('12.5');
  });

  it('stops at two digits after the point', () => {
    expect(applyAmountKey('12.5', '0')).toBe('12.50');
    expect(applyAmountKey('12.50', '9')).toBe('12.50');
  });

  it('deletes one character at a time, including the point', () => {
    expect(applyAmountKey('12.50', 'delete')).toBe('12.5');
    expect(applyAmountKey('12.', 'delete')).toBe('12');
    expect(applyAmountKey('', 'delete')).toBe('');
  });

  it('caps the whole part at nine digits', () => {
    expect(applyAmountKey('12345678', '9')).toBe('123456789');
    expect(applyAmountKey('123456789', '1')).toBe('123456789');
  });

  it('never truncates a longer figure that was loaded rather than typed', () => {
    const loaded = '12345678901.23';
    expect(applyAmountKey(loaded, '4')).toBe(loaded);
    expect(applyAmountKey(loaded, 'delete')).toBe('12345678901.2');
  });
});
