import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { InsightBanner } from '@/components/dashboard/insight-banner';

/** The full-width Insights card under the two tools: bulb, name and note, PRO pill, chevron. */

jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    { get: (_, name) => () => createElement(View, { testID: `lucide-${String(name)}` }) },
  );
});
jest.mock('@/theme/home-icons', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const icons = new Proxy(
    {},
    { get: (_, name) => () => createElement(View, { testID: `icon-${String(name)}` }) },
  );
  return { useHomeIcons: () => icons };
});
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ muted: '#777777' }),
}));

const OPEN = 'Insights. See the story behind your spending.';
const LOCKED = 'Insights. Pro feature. See the story behind your spending.';
const hidden = { includeHiddenElements: true };

describe('InsightBanner', () => {
  it('draws the bulb, the name, the note and a chevron, and opens Insights', async () => {
    const onPress = jest.fn();
    const screen = await render(<InsightBanner pro onPress={onPress} />);
    const card = screen.getByLabelText(OPEN);
    const inside = within(card);

    expect(card.props.accessibilityRole).toBe('button');
    expect(inside.getByTestId('icon-insights', hidden)).toBeTruthy();
    expect(inside.queryByTestId('icon-insights')).toBeNull();
    expect(inside.getByTestId('lucide-ChevronRight', hidden)).toBeTruthy();
    expect(inside.getByText('Insights')).toBeTruthy();
    expect(inside.getByText('See the story behind your spending')).toBeTruthy();
    expect(inside.queryAllByText('PRO', hidden)).toHaveLength(0);

    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a bordered card, full width, with no shadow', async () => {
    const screen = await render(<InsightBanner pro onPress={() => {}} />);
    const card = screen.getByTestId('insight-banner');
    const classes = String(card.props.className).split(/\s+/);
    expect(classes).toEqual(
      expect.arrayContaining(['w-full', 'border', 'border-line', 'bg-card', 'rounded-[20px]']),
    );
    expect(StyleSheet.flatten(card.props.style)?.shadowOpacity).toBeUndefined();
  });

  it('lets its words wrap at large text, with the row ceiling', async () => {
    const screen = await render(<InsightBanner pro onPress={() => {}} />);
    for (const text of ['Insights', 'See the story behind your spending']) {
      const node = screen.getByText(text);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.4);
    }
  });

  it('wears the PRO pill for someone without Pro, read once in its label', async () => {
    const screen = await render(<InsightBanner pro={false} onPress={() => {}} />);
    const card = within(screen.getByLabelText(LOCKED));
    expect(card.getAllByText('PRO', hidden)).toHaveLength(1);
    expect(card.queryByText('PRO')).toBeNull();
  });

  it('is no button and draws no chevron when it has nowhere to go', async () => {
    const screen = await render(<InsightBanner pro />);
    expect(screen.queryAllByRole('button', hidden)).toHaveLength(0);
    expect(screen.queryByTestId('lucide-ChevronRight', hidden)).toBeNull();
    expect(screen.getByText('Insights')).toBeTruthy();
  });
});
