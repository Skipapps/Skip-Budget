import { fireEvent, render, within } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import type { PaymentSourceRow } from '@/api/queries';
import { SourceTiles } from '@/components/ui/source-tiles';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { selection } from '@/lib/haptics';
import { contrast } from '@/lib/tone';
import { buildTokens, mix, type Tokens } from '@/theme/palette';

/**
 * The Paid with / Paid from tiles, as drawn on the save-loan design: two to a row, each the card's
 * colour, its name, its last four and a radio that becomes a plum check; a Skip tile in the same
 * style; one to a row at large text or when a name's word would not fit.
 */

// Each glyph stands in as a view named after it.
jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    { get: (_, name) => () => createElement(View, { testID: `lucide-${String(name)}` }) },
  );
});

// The app's own tokens, so the contrast rules are checked against the colours drawn.
const LIGHT = buildTokens('light');
const DARK = buildTokens('dark');
let mockColors: Tokens = LIGHT;
jest.mock('@/providers/theme-provider', () => ({ useColors: () => mockColors }));
jest.mock('@/lib/haptics', () => ({ selection: jest.fn() }));

type Screen = Awaited<ReturnType<typeof render>>;
const hidden = { includeHiddenElements: true };

const VISA: PaymentSourceRow = {
  id: 'visa',
  label: 'VISA ••4821',
  name: 'VISA',
  last4: '4821',
  color: '#426EA8',
  kind: 'card',
};
const EVERYDAY: PaymentSourceRow = {
  id: 'everyday',
  label: 'Everyday ••1111',
  name: 'Everyday',
  last4: '1111',
  color: '#1E1A22',
  kind: 'account',
};
/** What VoiceOver reads for each: the last four in words, not as bullets. */
const VISA_SAYS = 'VISA, ending in 4821';
const EVERYDAY_SAYS = 'Everyday, ending in 1111';
const SNOW: PaymentSourceRow = {
  id: 'snow',
  label: 'Mastercard',
  name: 'Mastercard',
  last4: null,
  color: '#FFFFFF',
  kind: 'card',
};

function phone(width: number, fontScale: number) {
  const window = { width, height: 844, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, hidden), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const tile = (screen: Screen, label: string) => screen.getByRole('radio', { name: label });

const rowsOf = (screen: Screen) =>
  screen.getAllByTestId('source-tiles-row').map((row) => within(row).queryAllByRole('radio'));

const styleOf = (node: { props: { style?: unknown } }): TextStyle =>
  StyleSheet.flatten(node.props.style as StyleProp<TextStyle>) ?? {};

beforeEach(() => {
  resetLocaleForTests();
  mockColors = LIGHT;
  phone(390, 1);
  jest.mocked(selection).mockClear();
});
afterAll(() => resetLocaleForTests());

describe('SourceTiles', () => {
  it('draws each card and account as a tile: its colour, its name, ••last4 and a radio', async () => {
    const screen = await render(
      <SourceTiles sources={[VISA, EVERYDAY]} value="" onChange={() => {}} />,
    );

    // VoiceOver hears the name and the last four in one label, as a radio.
    expect(screen.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel)).toEqual([
      VISA_SAYS,
      EVERYDAY_SAYS,
    ]);
    const visa = within(tile(screen, VISA_SAYS));
    expect(styleOf(visa.getByTestId('source-tile-swatch', hidden)).backgroundColor).toBe('#426EA8');
    const name = visa.getByText('VISA');
    const last4 = visa.getByText('••4821');
    expect(styleOf(name).fontSize).toBe(14);
    expect(name.props.className).toContain('font-app-semibold');
    expect(styleOf(last4).fontSize).toBe(12);
    expect(last4.props.className).toContain('text-muted');
    for (const text of [name, last4]) {
      expect(text.props.maxFontSizeMultiplier).toBe(1.3);
      // A long name wraps between its words; nothing is cut.
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.ellipsizeMode).toBeUndefined();
    }
    expect(visa.getByTestId('source-tile-radio', hidden)).toBeTruthy();
    expect(visa.queryByTestId('source-tile-check', hidden)).toBeNull();
  });

  it.each([
    ['en', ['VISA, ending in 4821', 'Everyday, ending in 1111', 'Mastercard']],
    ['es', ['VISA, terminada en 4821', 'Everyday, terminada en 1111', 'Mastercard']],
    ['fr', ['VISA, se terminant par 4821', 'Everyday, se terminant par 1111', 'Mastercard']],
  ] as const)('says the name and the last four in words in %s', async (language, spoken) => {
    setLanguage(language);
    const screen = await render(
      <SourceTiles sources={[VISA, EVERYDAY, SNOW]} value="" onChange={() => {}} />,
    );

    expect(screen.getAllByRole('radio').map((radio) => radio.props.accessibilityLabel)).toEqual(
      spoken,
    );
    // On screen the digits keep their dots.
    expect(screen.getByText('••4821')).toBeTruthy();
  });

  it('lights the chosen tile with a plum border, a soft plum tint and a filled check', async () => {
    const screen = await render(
      <SourceTiles sources={[VISA, EVERYDAY]} value="everyday" onChange={() => {}} />,
    );

    const chosen = tile(screen, EVERYDAY_SAYS);
    expect(chosen).toBeSelected();
    expect(chosen).toBeChecked();
    expect(chosen.props.className).toContain('border-accent-ink');
    expect(chosen.props.className).not.toContain('border-line');
    const inside = within(chosen);
    expect(inside.getByTestId('source-tile-tint', hidden).props.className).toContain(
      'bg-accent/10',
    );
    const check = inside.getByTestId('source-tile-check', hidden);
    expect(check.props.className).toContain('bg-control');
    expect(within(check).getByTestId('lucide-Check', hidden)).toBeTruthy();

    const other = tile(screen, VISA_SAYS);
    expect(other).not.toBeSelected();
    expect(other).not.toBeChecked();
    expect(other.props.className).toContain('border-line');
    expect(other.props.className).toContain('bg-card');
    expect(within(other).queryByTestId('source-tile-tint', hidden)).toBeNull();
    expect(within(other).getByTestId('source-tile-radio', hidden).props.className).toContain(
      'border-muted/40',
    );
    // The same border width either way, so choosing moves nothing inside the tile.
    for (const radio of [chosen, other]) expect(radio.props.className).toContain('border-[1.5px]');
  });

  it('picks a tile with a tap and a haptic', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <SourceTiles sources={[VISA, EVERYDAY]} value="visa" onChange={onChange} />,
    );

    await fireEvent.press(tile(screen, EVERYDAY_SAYS));
    expect(onChange).toHaveBeenLastCalledWith('everyday');
    expect(selection).toHaveBeenCalledTimes(1);
  });

  it('takes the label as the name when a row has no name, with no last-four line', async () => {
    const plain = { id: 'plain', label: 'VISA ••4821', color: '#426EA8', kind: 'card' } as const;
    const screen = await render(<SourceTiles sources={[plain]} value="" onChange={() => {}} />);

    const inside = within(tile(screen, 'VISA ••4821'));
    expect(inside.getByText('VISA ••4821')).toBeTruthy();
    expect(inside.queryByText(/^••/)).toBeNull();
  });

  it('takes the label as the name when the name is blank, so no tile has an empty line', async () => {
    const blank = { id: 'blank', label: 'Ally', name: '', last4: null, color: '#5B6573' } as const;
    const screen = await render(
      <SourceTiles sources={[{ ...blank, kind: 'account' }]} value="" onChange={() => {}} />,
    );

    const inside = within(tile(screen, 'Ally'));
    expect(inside.getByText('Ally')).toBeTruthy();
    expect(inside.queryByText('')).toBeNull();
  });

  it('draws the chosen border in the legible plum, clearing 3:1 against the card in both modes', async () => {
    // The fill plum is only 2.6:1 on the dark card; the light design's border is unchanged.
    expect(contrast(DARK.accent, DARK.card)).toBeLessThan(3);
    expect(contrast(DARK.accentInk, DARK.card)).toBeGreaterThanOrEqual(3);
    expect(contrast(LIGHT.accentInk, LIGHT.card)).toBeGreaterThanOrEqual(3);
    expect(LIGHT.accentInk).toBe('#905479');

    const screen = await render(<SourceTiles sources={[VISA]} value="visa" onChange={() => {}} />);
    expect(tile(screen, VISA_SAYS).props.className).toMatch(/(?:^|\s)border-accent-ink(?:\s|$)/);
    expect(tile(screen, VISA_SAYS).props.className).not.toMatch(/(?:^|\s)border-accent(?:\s|$)/);
  });

  it('draws no last-four line for a card saved without its digits', async () => {
    const screen = await render(<SourceTiles sources={[SNOW]} value="" onChange={() => {}} />);
    const inside = within(tile(screen, 'Mastercard'));
    expect(inside.getByText('Mastercard')).toBeTruthy();
    expect(inside.queryByText(/••/)).toBeNull();
  });

  describe('the Skip tile', () => {
    const skip = (selected: boolean, onPress = jest.fn()) => ({ label: 'Skip', selected, onPress });

    it('comes last, in the same style: a dashed swatch, the wording and a radio', async () => {
      const screen = await render(
        <SourceTiles sources={[VISA, EVERYDAY]} value="" onChange={() => {}} skip={skip(false)} />,
      );

      const radios = screen.getAllByRole('radio');
      expect(radios.map((radio) => radio.props.accessibilityLabel)).toEqual([
        VISA_SAYS,
        EVERYDAY_SAYS,
        'Skip',
      ]);
      const skipTile = radios[2];
      expect(skipTile.props.className).toContain('rounded-[16px]');
      expect(skipTile.props.className).toContain('border-line');
      const inside = within(skipTile);
      expect(inside.getByTestId('source-tile-swatch-skip', hidden).props.className).toContain(
        'border-dashed',
      );
      expect(inside.queryByTestId('source-tile-swatch', hidden)).toBeNull();
      expect(inside.getByText('Skip').props.className).toContain('font-app-semibold');
      expect(inside.queryByText(/••/)).toBeNull();
      expect(inside.getByTestId('source-tile-radio', hidden)).toBeTruthy();
    });

    it('lights nothing while unanswered, and only Skip once Skip is the answer', async () => {
      // '' with Skip unselected is null upstream: not answered yet.
      const screen = await render(
        <SourceTiles sources={[VISA]} value="" onChange={() => {}} skip={skip(false)} />,
      );
      for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeSelected();

      await screen.rerender(
        <SourceTiles sources={[VISA]} value="" onChange={() => {}} skip={skip(true)} />,
      );
      expect(tile(screen, 'Skip')).toBeSelected();
      expect(tile(screen, 'Skip')).toBeChecked();
      expect(within(tile(screen, 'Skip')).getByTestId('source-tile-check', hidden)).toBeTruthy();
      expect(tile(screen, VISA_SAYS)).not.toBeSelected();
    });

    it('answers through its own handler, not onChange', async () => {
      const onChange = jest.fn();
      const onPress = jest.fn();
      const screen = await render(
        <SourceTiles
          sources={[VISA]}
          value="visa"
          onChange={onChange}
          skip={skip(false, onPress)}
        />,
      );

      await fireEvent.press(tile(screen, 'Skip'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
      expect(selection).toHaveBeenCalledTimes(1);
    });

    it('is not drawn where the picker has no Skip', async () => {
      const screen = await render(
        <SourceTiles sources={[VISA, EVERYDAY]} value="" onChange={() => {}} />,
      );
      expect(screen.getAllByRole('radio')).toHaveLength(2);
      expect(screen.queryByTestId('source-tile-swatch-skip', hidden)).toBeNull();
    });
  });

  describe('the grid', () => {
    const three = (
      <SourceTiles
        sources={[VISA, EVERYDAY]}
        value=""
        onChange={() => {}}
        skip={{ label: 'Skip', selected: false, onPress: () => {} }}
      />
    );

    it('puts two to a row, and an odd last tile keeps its column’s width', async () => {
      const screen = await render(three);

      const rows = rowsOf(screen);
      expect(rows.map((row) => row.map((radio) => radio.props.accessibilityLabel))).toEqual([
        [VISA_SAYS, EVERYDAY_SAYS],
        ['Skip'],
      ]);
      // Beside the lone Skip tile, an empty cell the width of a tile.
      const last = screen.getAllByTestId('source-tiles-row')[1];
      const cells = last.children as { props: { className?: string } }[];
      expect(cells).toHaveLength(2);
      expect(cells[1].props.className).toBe('flex-1');
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio.props.className).toContain('flex-1');
        expect(radio.props.className).toContain('min-w-0');
      }
    });

    it('stays two to a row up to the text size before the tiles’ ceiling', async () => {
      phone(390, 1.235);
      const screen = await render(three);
      expect(rowsOf(screen).map((row) => row.length)).toEqual([2, 1]);
    });

    it.each([1.353, 1.786, 3.571])('goes one to a row at large text (%s)', async (fontScale) => {
      phone(390, fontScale);
      const screen = await render(three);

      expect(rowsOf(screen).map((row) => row.length)).toEqual([1, 1, 1]);
      // No spacer once each tile has the row to itself.
      for (const row of screen.getAllByTestId('source-tiles-row')) {
        expect(row.children).toHaveLength(1);
      }
    });

    it('goes one to a row when a word of a name would not fit beside the swatch and the radio', async () => {
      const pass = async (screen: Screen, widest: Record<string, number>) => {
        for (const [id, width] of Object.entries(widest)) {
          await layout(screen, `fit-slot-${id}`, 76);
          await layout(screen, `fit-copy-${id}`, width);
        }
        await layout(screen, 'source-tiles', 348);
      };
      const words = { 'visa-name': 32, 'visa-last4': 34, 'snow-name': 75 };

      const fits = await render(
        <SourceTiles sources={[VISA, SNOW]} value="" onChange={() => {}} />,
      );
      await pass(fits, words);
      expect(rowsOf(fits).map((row) => row.length)).toEqual([2]);
      await fits.unmount();

      // "Mastercard" at 14pt is about 82pt: wider than the 76pt beside the swatch and the radio.
      const wide = await render(
        <SourceTiles sources={[VISA, SNOW]} value="" onChange={() => {}} />,
      );
      await pass(wide, { ...words, 'snow-name': 82 });
      expect(rowsOf(wide).map((row) => row.length)).toEqual([1, 1]);
    });
  });

  describe('swatches', () => {
    const swatchOf = (screen: Screen, label: string) =>
      within(tile(screen, label)).getByTestId('source-tile-swatch', hidden);

    it('outlines a black card on the dark page so it stays visible, and leaves a blue one alone', async () => {
      mockColors = DARK;
      const screen = await render(
        <SourceTiles sources={[VISA, EVERYDAY]} value="everyday" onChange={() => {}} />,
      );

      expect(styleOf(swatchOf(screen, EVERYDAY_SAYS))).toMatchObject({
        backgroundColor: '#1E1A22',
        borderWidth: 1,
        borderColor: DARK.muted,
      });
      expect(styleOf(swatchOf(screen, VISA_SAYS)).borderWidth).toBeUndefined();
    });

    it('outlines a white card in light mode, and leaves a black one alone', async () => {
      const screen = await render(
        <SourceTiles sources={[SNOW, EVERYDAY]} value="" onChange={() => {}} />,
      );

      expect(styleOf(swatchOf(screen, 'Mastercard'))).toMatchObject({
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: LIGHT.muted,
      });
      expect(styleOf(swatchOf(screen, EVERYDAY_SAYS)).borderWidth).toBeUndefined();
    });

    it('outlines sand on a white tile, where it is only 1.51:1', async () => {
      const sand = { ...VISA, color: '#E9CF9B' };
      expect(contrast('#E9CF9B', LIGHT.card)).toBeLessThan(1.6);
      const screen = await render(<SourceTiles sources={[sand]} value="" onChange={() => {}} />);

      expect(styleOf(swatchOf(screen, VISA_SAYS))).toMatchObject({
        backgroundColor: '#E9CF9B',
        borderWidth: 1,
        borderColor: LIGHT.muted,
      });
    });

    it('measures a chosen tile’s swatch against the plum tint it sits on, not the bare card', async () => {
      // Clear of the white card, but too close to the tinted one.
      const grey = { ...VISA, color: '#C6C6C6' };
      const tinted = mix(LIGHT.card, LIGHT.accent, 0.1);
      expect(contrast(grey.color, LIGHT.card)).toBeGreaterThanOrEqual(1.6);
      expect(contrast(grey.color, tinted)).toBeLessThan(1.6);

      const screen = await render(<SourceTiles sources={[grey]} value="" onChange={() => {}} />);
      expect(styleOf(swatchOf(screen, VISA_SAYS)).borderWidth).toBeUndefined();

      await screen.rerender(<SourceTiles sources={[grey]} value="visa" onChange={() => {}} />);
      expect(styleOf(swatchOf(screen, VISA_SAYS))).toMatchObject({
        backgroundColor: '#C6C6C6',
        borderWidth: 1,
        borderColor: LIGHT.muted,
      });
    });

    it('keeps the card’s own colour when its tile is chosen', async () => {
      const screen = await render(
        <SourceTiles sources={[VISA]} value="visa" onChange={() => {}} />,
      );
      expect(styleOf(swatchOf(screen, VISA_SAYS)).backgroundColor).toBe('#426EA8');
    });
  });
});
