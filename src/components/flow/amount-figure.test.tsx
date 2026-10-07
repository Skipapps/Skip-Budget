import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { AmountFigure, displayAmount } from '@/components/flow/amount-figure';

describe('displayAmount', () => {
  it('shows an empty draft as a single zero, not as nothing', () => {
    expect(displayAmount('')).toBe('0');
  });

  it('groups the whole part in threes', () => {
    expect(displayAmount('1234')).toBe('1,234');
    expect(displayAmount('999999999')).toBe('999,999,999');
    expect(displayAmount('100')).toBe('100');
  });

  it('leaves the fraction alone, however many digits it has', () => {
    expect(displayAmount('1234.5')).toBe('1,234.5');
    expect(displayAmount('1234.50')).toBe('1,234.50');
  });

  it('keeps a trailing point, so 12. does not jump back to 12 under the finger', () => {
    expect(displayAmount('12.')).toBe('12.');
  });

  it('never rounds, pads or completes what was typed', () => {
    expect(displayAmount('5')).toBe('5');
    expect(displayAmount('0.5')).toBe('0.5');
    // Longer than the keypad cap: the cap refuses keystrokes, it never shortens money already there.
    expect(displayAmount('12345678901.23')).toBe('12,345,678,901.23');
  });
});

describe('AmountFigure', () => {
  it('is read aloud as money, not as the characters typed', async () => {
    const { getByLabelText } = await render(<AmountFigure value="1234.5" />);
    expect(getByLabelText('Amount, $1,234.50')).toBeTruthy();
  });

  it('reads a percent draft as a rate, with no currency in it', async () => {
    const { getByLabelText } = await render(<AmountFigure value="7.5" unit="percent" />);
    expect(getByLabelText('Rate, 7.5 percent')).toBeTruthy();
  });

  it('shows an empty draft as zero without claiming a zero was entered', async () => {
    const { getByText, getByLabelText } = await render(<AmountFigure value="" />);
    expect(getByText('0')).toBeTruthy();
    expect(getByLabelText('Amount, $0.00')).toBeTruthy();
  });
});

/**
 * Size is chosen from the glyph count, not `adjustsFontSizeToFit`. On a remount with a value already
 * in state iOS left the number at half size beside a full-size "$"; only a rendered font size can catch that.
 */
describe('AmountFigure sizing', () => {
  const sizeOf = (node: { props: { style?: StyleProp<TextStyle> } }) =>
    StyleSheet.flatten(node.props.style)?.fontSize;

  it('never asks iOS to fit the text for us', async () => {
    const { getByText } = await render(<AmountFigure value="3000" />);
    expect(getByText('3,000').props.adjustsFontSizeToFit).toBeUndefined();
    expect(getByText('3,000').props.minimumFontScale).toBeUndefined();
  });

  it('gives up to seven glyphs the full hero size', async () => {
    const { getByText, rerender } = await render(<AmountFigure value="" />);
    expect(sizeOf(getByText('0'))).toBe(64);

    await rerender(<AmountFigure value="3000" />);
    expect(sizeOf(getByText('3,000'))).toBe(64);

    // Seven glyphs, the widest string this band can hold.
    await rerender(<AmountFigure value="444444" />);
    expect(sizeOf(getByText('444,444'))).toBe(64);
  });

  it('steps down at eight glyphs and holds to ten', async () => {
    const { getByText, rerender } = await render(<AmountFigure value="4444.44" />);
    expect(sizeOf(getByText('4,444.44'))).toBe(48);

    await rerender(<AmountFigure value="44444444" />);
    expect(sizeOf(getByText('44,444,444'))).toBe(48);
  });

  it('steps down again at eleven glyphs and holds to the keypad cap', async () => {
    const { getByText, rerender } = await render(<AmountFigure value="999999999" />);
    expect(sizeOf(getByText('999,999,999'))).toBe(36);

    // Fourteen glyphs, everything the keypad can produce.
    await rerender(<AmountFigure value="444444444.44" />);
    expect(sizeOf(getByText('444,444,444.44'))).toBe(36);
  });

  it('shrinks a figure longer than the keypad allows rather than cutting it', async () => {
    // Only reachable from a saved record, and shown in full: shortening saved money would misstate it.
    const { getByText } = await render(<AmountFigure value="12345678901.23" />);
    expect(sizeOf(getByText('12,345,678,901.23'))).toBe(28);
  });

  it('sizes a prefilled value the same on a remount as on a fresh entry', async () => {
    // Step 1 unmounts on Continue and returns with the amount already in state.
    const fresh = await render(<AmountFigure value="3000" />);
    const freshSize = sizeOf(fresh.getByText('3,000'));

    const { getByText, rerender } = await render(<AmountFigure value="" />);
    await rerender(<AmountFigure value="3000" />);
    expect(sizeOf(getByText('3,000'))).toBe(freshSize);
    expect(freshSize).toBe(64);

    await rerender(<AmountFigure value="" />);
    expect(sizeOf(getByText('0'))).toBe(64);
  });

  it('keeps the $ and the % in proportion to the number at every size', async () => {
    const { getByText, rerender } = await render(<AmountFigure value="3000" />);
    expect(sizeOf(getByText('$'))).toBe(28);
    // Levels the $'s cap line with the digits': 0.268 x (64 - 28), to the half point.
    expect(StyleSheet.flatten(getByText('$').props.style)?.marginTop).toBe(9.5);

    await rerender(<AmountFigure value="444444444.44" />);
    expect(sizeOf(getByText('$'))).toBe(16);

    await rerender(<AmountFigure value="7.5" unit="percent" />);
    expect(sizeOf(getByText('%'))).toBe(28);
  });
});
