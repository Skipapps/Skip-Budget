import { render } from '@testing-library/react-native';

import { AmountFigure, displayAmount } from '@/components/flow/amount-figure';

/**
 * The figure is the only place a person sees the money they are typing before
 * it is saved, so these are money rules rather than layout ones: what is on
 * screen has to be exactly what is in state, grouped for reading and nothing
 * else. Nothing here may round, pad or complete a figure.
 */
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
    // A person who typed "5" has not typed "5.00", and saying so on screen
    // states a precision they did not enter.
    expect(displayAmount('5')).toBe('5');
    expect(displayAmount('0.5')).toBe('0.5');
    // A figure longer than the keypad's own cap is still shown in full: the
    // cap refuses new keystrokes, it never shortens money already there.
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
