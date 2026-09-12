import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { CalculatorPad, calculatorFigureBand } from '@/components/ui/calculator-pad';

// Hoisted above the imports by babel-plugin-jest-hoist; the order here is for
// readability. The pad pulls in icons, theme colours and window insets, and
// the figure under test needs none of them.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({ useColors: () => ({ ink: '#000000' }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/**
 * The pad opens over a field that already holds a value, so its figure is
 * sized from the string rather than by `adjustsFontSizeToFit` — the same fix,
 * for the same iOS measuring bug, as the stepped flow's amount figure. These
 * are the band edges; the affix rides at the same proportion so the "$" can
 * never be left at full size beside a shrunken number again.
 */
describe('calculatorFigureBand', () => {
  it('keeps a short figure at the pad size it has today', () => {
    expect(calculatorFigureBand('0')).toMatchObject({ size: 48, affixSize: 24, affixTop: 8 });
    expect(calculatorFigureBand('444,444').size).toBe(48);
  });

  it('steps down at each band edge and nowhere else', () => {
    expect(calculatorFigureBand('4,444.44').size).toBe(40); // 8 glyphs
    expect(calculatorFigureBand('44,444,444').size).toBe(40); // 10
    expect(calculatorFigureBand('999,999,999').size).toBe(32); // 11
    expect(calculatorFigureBand('444,444,444.44').size).toBe(32); // 14
    expect(calculatorFigureBand('4,444,444,444.44').size).toBe(26); // 16
    expect(calculatorFigureBand('444,444,444,444,444').size).toBe(20); // 19
  });

  it('shrinks the $ with the number, never on its own', () => {
    for (const display of ['0', '4,444.44', '999,999,999', '4,444,444,444.44']) {
      const band = calculatorFigureBand(display);
      expect(band.affixSize).toBeLessThan(band.size);
      // Cap-aligned: 0.345 x (size - affixSize) in Poppins, to the half point.
      expect(Math.abs(band.affixTop - 0.345 * (band.size - band.affixSize))).toBeLessThan(0.6);
    }
  });
});

describe('CalculatorPad figure', () => {
  it('opens at full size on a value it was handed, not a shrunken one', async () => {
    // The pad is opened from a field that already has an amount in it, which
    // is the mount-with-text case iOS used to mis-measure.
    const { getByText } = await render(
      <CalculatorPad value="3000" onCancel={() => {}} onConfirm={() => {}} />,
    );

    const sizeOf = (node: { props: { style?: StyleProp<TextStyle> } }) =>
      StyleSheet.flatten(node.props.style)?.fontSize;

    const number = getByText('3,000');
    expect(sizeOf(number)).toBe(48);
    expect(number.props.adjustsFontSizeToFit).toBeUndefined();
    expect(sizeOf(getByText('$'))).toBe(24);
  });
});
