import { fireEvent, render } from '@testing-library/react-native';
import { ScrollView, StyleSheet, type ViewStyle } from 'react-native';

import { DayStrip } from '@/components/flow/day-strip';

/**
 * The strip runs to the screen's edges and pads itself back by the page's own gutter, measured
 * rather than assumed, so the first day lines up with the fields above at any width.
 */

const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 56 } } });

it('pads by the measured gutter and brings the chosen day to the middle', async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
  const screen = await render(<DayStrip value={22} onChange={() => {}} />);

  // A 400pt screen with a 360pt column: 20pt each side.
  await fireEvent(screen.getByTestId('day-strip'), 'layout', layout(360));
  await fireEvent(screen.getByTestId('day-strip-bleed'), 'layout', layout(400));

  const strip = screen.getByTestId('day-strip-bleed').children[0] as unknown as {
    props: { contentContainerStyle: ViewStyle };
  };
  expect(StyleSheet.flatten(strip.props.contentContainerStyle).paddingHorizontal).toBe(20);
  // The 22nd's centre is 20 + 21 × 52 + 22 = 1134; half the strip is 200.
  expect(scrollTo).toHaveBeenLastCalledWith({ x: 934, animated: false });
  scrollTo.mockRestore();
});

it('stays hidden until both widths are known, so the days never jump into place', async () => {
  const screen = await render(<DayStrip value={3} onChange={() => {}} />);
  const bleed = screen.getByTestId('day-strip-bleed');
  expect(StyleSheet.flatten(bleed.props.style).opacity).toBe(0);

  await fireEvent(screen.getByTestId('day-strip'), 'layout', layout(333));
  await fireEvent(bleed, 'layout', layout(375));
  expect(StyleSheet.flatten(screen.getByTestId('day-strip-bleed').props.style).opacity).toBe(1);
});
