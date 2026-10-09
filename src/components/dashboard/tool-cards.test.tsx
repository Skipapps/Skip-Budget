import { fireEvent, render, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { ToolCards } from '@/components/dashboard/tool-cards';

/** Go further's two tools, as designed: icon and chevron on top, then the name and a note. */

// Each glyph and gradient icon stands in as a view named after it.
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
  useColors: () => ({ accentInk: '#0000FF', muted: '#777777' }),
}));

const LOAN = 'Loan calculator. Opens the tool.';
const HABITS = 'Spending habits. Opens the tool.';
const HABITS_LOCKED = 'Spending habits. Pro feature. See what skipping saves.';
const hidden = { includeHiddenElements: true };

type Screen = Awaited<ReturnType<typeof render>>;

function phone(width: number, fontScale: number) {
  const window = { width, height: 844, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, hidden), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const sizeOf = (screen: Screen, text: string) =>
  StyleSheet.flatten(screen.getByText(text).props.style).fontSize as number;

describe('ToolCards', () => {
  beforeEach(() => phone(375, 1));

  it('offers the loan calculator, then spending habits, side by side', async () => {
    const screen = await render(<ToolCards onPress={() => {}} />);
    const tools = screen.getAllByRole('button');
    expect(tools.map((tool) => tool.props.accessibilityLabel)).toEqual([LOAN, HABITS]);

    const row = screen.getByTestId('go-further-tools');
    expect(row.props.className).toContain('flex-row');
    for (const tool of tools) {
      expect(tool.props.className).toContain('flex-1');
      expect(tool.props.className).toContain('border-line');
      // Bordered as drawn, and no shadow: an outline and a shadow together flatten each other.
      expect(StyleSheet.flatten(tool.props.style)?.shadowOpacity).toBeUndefined();
    }
  });

  it.each([
    [LOAN, 'loanCalculator', 'Loan calculator', 'See a monthly cost'],
    [HABITS, 'spendingHabits', 'Spending habits', 'Spot your patterns'],
  ])(
    'draws %s with its gradient icon, a chevron, the name and the note',
    async (label, icon, name, note) => {
      const screen = await render(<ToolCards onPress={() => {}} />);
      const tile = within(screen.getByLabelText(label));

      expect(tile.getByTestId(`icon-${icon}`, hidden)).toBeTruthy();
      expect(tile.getByTestId('lucide-ChevronRight', hidden)).toBeTruthy();
      // Marks only: the tile is the button, and VoiceOver reads its label once.
      expect(tile.queryByTestId('lucide-ChevronRight')).toBeNull();
      expect(tile.getByText(name)).toBeTruthy();
      expect(tile.getByText(note)).toBeTruthy();
      expect(sizeOf(screen, name)).toBe(15);
      expect(sizeOf(screen, note)).toBe(12);
      for (const text of [name, note]) {
        expect(screen.getByText(text).props.maxFontSizeMultiplier).toBe(1.3);
        expect(screen.getByText(text).props.numberOfLines).toBeUndefined();
      }
    },
  );

  it('keeps the routes', async () => {
    const onPress = jest.fn();
    const screen = await render(<ToolCards onPress={onPress} />);
    await fireEvent.press(screen.getByLabelText(LOAN));
    await fireEvent.press(screen.getByLabelText(HABITS));
    expect(onPress.mock.calls).toEqual([['/loan-calculator'], ['/habits']]);
  });

  it('puts the PRO pill beside the chevron of a locked Spending habits, and opens the explainer', async () => {
    const onPress = jest.fn();
    const screen = await render(<ToolCards onPress={onPress} habitsLocked />);

    const locked = within(screen.getByLabelText(HABITS_LOCKED));
    const pill = locked.getByText('PRO', hidden);
    expect(locked.queryByText('PRO')).toBeNull();
    // In the top row with the chevron, not pinned over it.
    const marks = locked.getByTestId('lucide-ChevronRight', hidden).parent?.parent;
    expect(within(marks!).getByText('PRO', hidden)).toBe(pill);

    await fireEvent.press(screen.getByLabelText(HABITS_LOCKED));
    expect(onPress).toHaveBeenLastCalledWith({
      pathname: '/pro-feature',
      params: { id: 'habits' },
    });
    // The loan calculator never locks.
    expect(within(screen.getByLabelText(LOAN)).queryAllByText('PRO', hidden)).toHaveLength(0);
  });

  it('stacks the two, full width, only when a name would go under its design size', async () => {
    // A tile 99pt wide at 1.3x (320pt, Display Zoom) still holds "calculator" at 15pt; a word
    // needing 160pt does not.
    phone(320, 1.3);
    const screen = await render(<ToolCards onPress={() => {}} />);
    const pass = async (name: Record<string, number>) => {
      for (const id of ['loanCalculator', 'spendingHabits']) {
        await layout(screen, `fit-slot-${id}-name`, 99);
        await layout(screen, `fit-copy-${id}-name`, name[id]);
        await layout(screen, `fit-slot-${id}-note`, 99);
        await layout(screen, `fit-copy-${id}-note`, 60);
      }
      await layout(screen, 'go-further-tools', 278);
      await layout(screen, 'go-further', 278);
    };

    await pass({ loanCalculator: 99.9, spendingHabits: 97.1 });
    expect(screen.getByTestId('go-further-tools').props.className).toContain('flex-row');

    await pass({ loanCalculator: 160, spendingHabits: 97.1 });
    expect(screen.getByTestId('go-further-tools').props.className).not.toContain('flex-row');
    for (const tool of screen.getAllByRole('button')) {
      expect(tool.props.className).toContain('w-full');
    }
  });
});
