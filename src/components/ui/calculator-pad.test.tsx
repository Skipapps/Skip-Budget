import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { CalculatorPad, calculatorFigureBand } from '@/components/ui/calculator-pad';

// The pad pulls in icons, theme colours and window insets; the figure under test needs none of them.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({ useColors: () => ({ ink: '#000000' }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

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

/**
 * Rounding goes through src/lib/money.ts: half away from zero, decided on 12 significant digits, so the
 * cent a lender would post is the cent the pad shows. 20.15 ÷ 2 is 10.075 exactly, but 10.075 * 100 is
 * 1007.4999999999999 in binary, so `Math.round(v * 100) / 100` would say $10.07.
 * Every expected value below is the exact decimal result, rounded by hand.
 */
describe('CalculatorPad arithmetic', () => {
  /** Opens the pad on `start`, presses the keys, taps Done; returns what it confirmed. */
  async function calculate(start: string, keys: string[]): Promise<string> {
    const onConfirm = jest.fn();
    const pad = await render(
      <CalculatorPad value={start} onCancel={() => {}} onConfirm={onConfirm} />,
    );
    for (const key of keys) await fireEvent.press(pad.getByLabelText(key));
    await fireEvent.press(pad.getByLabelText('Done'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    return onConfirm.mock.calls[0][0];
  }

  it.each([
    // [start, keys, exact decimal, posted]
    ['20.15', ['÷', '2', '='], '10.075', '10.08'],
    ['2.01', ['÷', '2', '='], '1.005', '1.01'],
    ['10.05', ['×', '0', '.', '5', '='], '5.025', '5.03'],
    ['0.01', ['÷', '2', '='], '0.005', '0.01'],
    ['100', ['÷', '3', '='], '33.333…', '33.33'],
    ['0.1', ['+', '0', '.', '2', '='], '0.3', '0.3'],
  ])('%s then %j is %s, posted as $%s', async (start, keys, _exact, posted) => {
    expect(await calculate(start, keys)).toBe(posted);
  });

  it('settles a half-finished sum on Done the same way', async () => {
    expect(await calculate('20.15', ['÷', '2'])).toBe('10.08');
  });

  // Below zero the half goes away from zero too: 0 − 20.15 ÷ 2 = −10.075 exactly.
  it.each([
    [['−', '2', '0', '.', '1', '5', '÷', '2', '='], '-10.08'],
    [['−', '2', '.', '0', '1', '÷', '2', '='], '-1.01'],
    [['−', '0', '.', '0', '1', '÷', '2', '='], '-0.01'],
  ])('0 then %j posts $%s', async (keys, posted) => {
    expect(await calculate('0', keys)).toBe(posted);
  });

  // Zero is "0", never "-0": −0.01 ÷ 3 = −0.00333… rounds to nothing.
  it.each([
    ['5', ['−', '5', '=']],
    ['0', ['×', '7', '=']],
    ['0.01', ['÷', '3', '=']],
    ['0', ['−', '0', '.', '0', '1', '÷', '3', '=']],
  ])('%s then %j lands on 0', async (start, keys) => {
    expect(await calculate(start, keys)).toBe('0');
  });
});
