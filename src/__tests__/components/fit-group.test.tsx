import { act, fireEvent, render } from '@testing-library/react-native';
import { Profiler } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import {
  FitFigure,
  FitGroup,
  FitRows,
  FitText,
  fitScale,
  useFitGroup,
  useGroupFits,
} from '@/components/ui/fit-group';

/**
 * Jest has no layout, so widths reach the group the way a late layout pass does on a phone: through
 * onLayout on the group's box, each member's slot and each measuring copy.
 */

function phone(width: number, fontScale: number) {
  const window = { width, height: 844, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

type Screen = Awaited<ReturnType<typeof render>>;

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const fontSizeOf = (screen: Screen, label: string) =>
  StyleSheet.flatten(screen.getByText(label).props.style).fontSize as number;

/** An owner with one shrink group: a row of tiles, one column when the row cannot hold them. */
function Tiles({ labels, sizes }: { labels: string[]; sizes?: number[] }) {
  const group = useFitGroup({ mode: 'shrink' });
  return (
    <FitGroup group={group} testID="box">
      <View testID={group.fits ? 'row' : 'column'}>
        {labels.map((label, index) => (
          <FitText
            key={label}
            id={label}
            role="control"
            size={sizes?.[index] ?? 15}
            className="font-app-medium text-ink"
            slotClassName="flex-1"
          >
            {label}
          </FitText>
        ))}
      </View>
    </FitGroup>
  );
}

const LABELS = ['Receipt', 'Bill', 'Subscription', 'Salary'];
/** Montserrat Medium at 15pt x 1.3, from the font's advance widths. */
const NATURAL_AT_1_3: Record<string, number> = {
  Receipt: 76.0,
  Bill: 31.1,
  Subscription: 125.4,
  Salary: 59.8,
};

/**
 * One layout pass. On a phone the group reads every width from the same committed layout; here they
 * arrive one event at a time, so the box comes last, once its slots already hold their new widths.
 */
async function layOut(screen: Screen, box: number, slot: number, natural = NATURAL_AT_1_3) {
  for (const label of LABELS) {
    await layout(screen, `fit-slot-${label}`, slot);
    await layout(screen, `fit-copy-${label}`, natural[label]);
  }
  await layout(screen, 'box', box);
}

describe('fitScale', () => {
  const tiles = { mode: 'shrink' as const, size: 15, role: 'control' as const, fontScale: 1.3 };

  it('gives every member the size at which the widest one fits', () => {
    // 100.5pt for text, as in a quarter of 375pt less icon and padding: 99.5 / 125.4.
    const members = LABELS.map((label) => ({ slot: 100.5, natural: NATURAL_AT_1_3[label] }));
    expect(fitScale(members, tiles)).toEqual({ scale: 0.79, fits: true });
  });

  it('keeps the full size when everything fits', () => {
    const members = LABELS.map((label) => ({ slot: 127, natural: NATURAL_AT_1_3[label] }));
    expect(fitScale(members, tiles)).toEqual({ scale: 1, fits: true });
  });

  it('never takes a group under its default-size look, and says the layout has to change', () => {
    // 15pt x 1.3 x 0.5 would be 9.75pt; the floor is the 15pt design size.
    const result = fitScale(
      [
        { slot: 101, natural: 200 },
        { slot: 101, natural: 40 },
      ],
      tiles,
    );
    expect(result.fits).toBe(false);
    expect(15 * 1.3 * result.scale).toBeCloseTo(15, 5);
  });

  it('does not shrink at all at the default text size: there is nothing to take back', () => {
    const result = fitScale(
      [
        { slot: 93, natural: 104 },
        { slot: 93, natural: 60 },
      ],
      { ...tiles, fontScale: 1 },
    );
    expect(result).toEqual({ scale: 1, fits: false });
  });

  it('never goes under 11pt, even for a group of one', () => {
    const figure = { mode: 'shrink' as const, size: 17, role: 'figure' as const, fontScale: 1 };
    // A lone figure may go under its design size, to 11pt and no further.
    expect(fitScale([{ slot: 151, natural: 200 }], figure)).toEqual({ scale: 0.75, fits: true });
    const tooLong = fitScale([{ slot: 101, natural: 300 }], figure);
    expect(tooLong.fits).toBe(false);
    expect(17 * tooLong.scale).toBeCloseTo(11, 5);
  });

  it('lets a smaller text setting shrink to 11pt rather than forcing the other layout', () => {
    const small = { ...tiles, size: 12, fontScale: 0.882 };
    // 12 x 0.882 = 10.58pt is already under 11, so any shrinking is a layout change.
    expect(fitScale([{ slot: 50, natural: 60 }], small).fits).toBe(false);
    expect(
      fitScale(
        [
          { slot: 70, natural: 60 },
          { slot: 70, natural: 20 },
        ],
        small,
      ),
    ).toEqual({ scale: 1, fits: true });
  });

  it('in switch mode never scales, and holds only while every widest word fits its slot', () => {
    const rows = { mode: 'switch' as const, size: 15, role: 'row' as const, fontScale: 1.4 };
    expect(
      fitScale(
        [
          { slot: 150, natural: 145.6 },
          { slot: 120, natural: 103.7 },
        ],
        rows,
      ),
    ).toEqual({ scale: 1, fits: true });
    expect(
      fitScale(
        [
          { slot: 137, natural: 145.6 },
          { slot: 120, natural: 103.7 },
        ],
        rows,
      ),
    ).toEqual({ scale: 1, fits: false });
  });

  it('treats nothing measured as fitting', () => {
    expect(fitScale([], tiles)).toEqual({ scale: 1, fits: true });
    expect(fitScale([{ slot: 10, natural: 0 }], tiles)).toEqual({ scale: 1, fits: true });
  });
});

describe('FitGroup', () => {
  beforeEach(() => phone(375, 1.3));

  it('draws every member at its design size until it has been laid out', async () => {
    const screen = await render(<Tiles labels={LABELS} />);
    for (const label of LABELS) expect(fontSizeOf(screen, label)).toBe(15);
    expect(screen.getByTestId('row')).toBeTruthy();
  });

  it('keeps its measuring copies out of the accessibility tree', async () => {
    const screen = await render(<Tiles labels={LABELS} />);
    // One visible "Subscription"; the copy is only found when hidden elements are asked for.
    expect(screen.getAllByText('Subscription')).toHaveLength(1);
    expect(screen.getAllByText('Subscription', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('shrinks all members together to the size the widest one needs', async () => {
    const screen = await render(<Tiles labels={LABELS} />);
    await layOut(screen, 327, 100.5);

    const sizes = LABELS.map((label) => fontSizeOf(screen, label));
    expect(new Set(sizes).size).toBe(1);
    expect(sizes[0]).toBeCloseTo(15 * 0.79, 5);
    expect(screen.getByTestId('row')).toBeTruthy();
  });

  it('changes layout instead of going under the floor, then sizes for the new layout', async () => {
    const screen = await render(<Tiles labels={LABELS} />);
    await layOut(screen, 272, 60);
    expect(screen.getByTestId('column')).toBeTruthy();

    // In one column every slot is wide: the full size returns, and the column stays.
    for (const label of LABELS) await layout(screen, `fit-slot-${label}`, 260);
    expect(screen.getByTestId('column')).toBeTruthy();
    for (const label of LABELS) expect(fontSizeOf(screen, label)).toBe(15);
  });

  it('does not keep a decision made against a passing width', async () => {
    // A box laid out narrow for a moment (a tab mounting), then at its real width.
    const screen = await render(<Tiles labels={LABELS} />);
    await layOut(screen, 120, 20);
    expect(screen.getByTestId('column')).toBeTruthy();

    await layOut(screen, 380, 127);
    expect(screen.getByTestId('row')).toBeTruthy();
    for (const label of LABELS) expect(fontSizeOf(screen, label)).toBe(15);
  });

  it('decides again when the text size changes', async () => {
    const screen = await render(<Tiles labels={LABELS} />);
    await layOut(screen, 327, 100.5);
    expect(fontSizeOf(screen, 'Bill')).toBeCloseTo(15 * 0.79, 5);

    // Back to the default size: the copies measure 1/1.3 as wide, and everything fits again.
    await act(() => phone(375, 1));
    const atDefault = Object.fromEntries(
      LABELS.map((label) => [label, NATURAL_AT_1_3[label] / 1.3]),
    );
    await screen.rerender(<Tiles labels={LABELS} />);
    for (const label of LABELS) await layout(screen, `fit-copy-${label}`, atDefault[label]);
    for (const label of LABELS) expect(fontSizeOf(screen, label)).toBe(15);
  });

  it('refuses members that could not share one size', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const screen = await render(<Tiles labels={['Receipt', 'Bill']} sizes={[15, 13]} />);
    await expect(async () => {
      await layout(screen, 'box', 327);
      for (const label of ['Receipt', 'Bill']) {
        await layout(screen, `fit-slot-${label}`, 150);
        await layout(screen, `fit-copy-${label}`, 50);
      }
    }).rejects.toThrow(/cannot share one size/);
    spy.mockRestore();
  });
});

const NBSP = '\u00A0';
const NARROW_NBSP = '\u202F';

const copyOf = (screen: Screen, id: string) =>
  screen.getByTestId(`fit-copy-${id}`, { includeHiddenElements: true }).props.children as string;

describe('FitText measuring copy', () => {
  beforeEach(() => phone(375, 1.4));

  it('measures a French amount whole: its no-break spaces are not places to wrap', async () => {
    const screen = await render(
      <View>
        <FitText id="fr" role="row" size={15}>{`-1${NBSP}030,50${NBSP}$`}</FitText>
        <FitText id="narrow" role="row" size={15}>{`1${NARROW_NBSP}234,56${NBSP}$`}</FitText>
        <FitText id="name" role="row" size={15}>
          Ticketmaster Entertainment
        </FitText>
      </View>,
    );

    expect(copyOf(screen, 'fr')).toBe(`-1${NBSP}030,50${NBSP}$`);
    expect(copyOf(screen, 'narrow')).toBe(`1${NARROW_NBSP}234,56${NBSP}$`);
    // An ordinary space is where a line may break, so each word is measured on its own.
    expect(copyOf(screen, 'name')).toBe('Ticketmaster\nEntertainment');
  });

  it('draws no copy for a member that is only as wide as its own words', async () => {
    const screen = await render(
      <View>
        <FitText id="amount" hug role="row" size={15}>
          $1,234.50
        </FitText>
      </View>,
    );

    expect(screen.queryByTestId('fit-copy-amount', { includeHiddenElements: true })).toBeNull();
    expect(screen.getAllByText('$1,234.50', { includeHiddenElements: true })).toHaveLength(1);
  });
});

/** Commits that drew the row: what a long list pays for every row. */
let rowRenders = 0;
const countRender = () => {
  rowRenders += 1;
};

function Row() {
  const group = useFitGroup({ mode: 'switch' });
  return (
    <FitGroup group={group} testID="row-box">
      <View testID={group.fits ? 'beside' : 'under'}>
        <FitText id="label" role="row" size={15} slotClassName="flex-1">
          Ticketmaster Entertainment
        </FitText>
        <FitText id="amount" hug role="row" size={15}>
          -$1,234.50
        </FitText>
      </View>
    </FitGroup>
  );
}

const CountedRow = () => (
  <Profiler id="row" onRender={countRender}>
    <Row />
  </Profiler>
);

/** What a phone reports once the row is laid out: everything fits beside the amount. */
const ROW_PASS: [string, number][] = [
  ['fit-slot-label', 200],
  ['fit-copy-label', 150],
  ['fit-slot-amount', 104],
  ['row-box', 327],
];

describe('FitGroup in a long list', () => {
  beforeEach(() => {
    phone(375, 1.4);
    rowRenders = 0;
  });

  it('mounts a row with one render: members joining the group do not draw it again', async () => {
    await render(<CountedRow />);
    expect(rowRenders).toBe(1);
  });

  it('draws nothing more when a layout pass only confirms what the group already decided', async () => {
    const screen = await render(<CountedRow />);
    for (const [testID, width] of ROW_PASS.slice(0, -1)) await layout(screen, testID, width);

    // The last width completes the measurement: one render to measure, none to store a decision
    // that did not change.
    const before = rowRenders;
    await layout(screen, 'row-box', 327);
    expect(rowRenders - before).toBe(1);
    expect(screen.getByTestId('beside')).toBeTruthy();

    // A phone reports the same widths again from onLayout, the amount's slot included.
    const settled = rowRenders;
    for (const [testID, width] of ROW_PASS) await layout(screen, testID, width);
    expect(rowRenders).toBe(settled);
  });

  it('says so in development when a group keeps changing under the same conditions', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const screen = await render(<Tiles labels={LABELS} />);
    await layOut(screen, 327, 100.5);

    // A slot that keeps answering the size it was given: room for Subscription, then not.
    for (let i = 0; i < 7; i += 1) {
      await layout(screen, 'fit-slot-Subscription', i % 2 === 0 ? 127 : 100.5);
    }

    const stops = warn.mock.calls.filter(([message]) => /stopped after 6 changes/.test(message));
    expect(stops).toHaveLength(1);
    expect(stops[0][0]).toContain('Subscription');
    warn.mockRestore();
  });
});

describe('FitFigure', () => {
  beforeEach(() => phone(375, 1.3));

  async function figureIn(box: number, natural: number) {
    const screen = await render(
      <FitFigure id="total" size={26} className="font-app-bold text-ink">
        -$12,345.67
      </FitFigure>,
    );
    await layout(screen, 'fit-slot-total', box);
    await layout(screen, 'fit-copy-total', natural);
    await layout(screen, 'fit-figure-total', box);
    return screen;
  }

  it('keeps its size while it fits, whole and with its cents', async () => {
    const screen = await figureIn(300, 180);
    const figure = screen.getByText('-$12,345.67');
    expect(fontSizeOf(screen, '-$12,345.67')).toBe(26);
    expect(figure.props.maxFontSizeMultiplier).toBe(1.2);
    expect(figure.props.numberOfLines).toBeUndefined();
    expect(figure.props.adjustsFontSizeToFit).toBeUndefined();
    expect(screen.queryByTestId('fit-scroll-total')).toBeNull();
  });

  it('shrinks alone to the width it has, even under its default size', async () => {
    // 149 / 200 = 0.74: 26pt x 1.2 x 0.74 = 23.1pt on screen, under 26 and over 11.
    const screen = await figureIn(150, 200);
    expect(fontSizeOf(screen, '-$12,345.67')).toBeCloseTo(26 * 0.74, 5);
  });

  it('stops at 11pt, and past that scrolls sideways rather than break between digits', async () => {
    const screen = await figureIn(150, 600);
    expect(fontSizeOf(screen, '-$12,345.67') * 1.2).toBeCloseTo(11, 5);

    const scroller = screen.getByTestId('fit-scroll-total');
    expect(scroller.props.horizontal).toBe(true);
    // Whole, on one line inside the scroller; the slot it sits in keeps its measured width.
    const figure = screen.getByText('-$12,345.67');
    expect(figure.props.numberOfLines).toBeUndefined();
    let node = figure.parent;
    while (node && node !== scroller) node = node.parent;
    expect(node === scroller).toBe(true);
    expect(scroller.parent === screen.getByTestId('fit-slot-total')).toBe(true);
  });
});

function Pair({ id, label, value }: { id: string; label: string; value: string }) {
  const stacked = !useGroupFits();
  return (
    <View testID={`${id}-${stacked ? 'under' : 'beside'}`}>
      <FitText id={`${id}-label`} role="row" size={14} slotClassName="flex-1">
        {label}
      </FitText>
      <FitText id={`${id}-value`} hug role="row" size={14}>
        {value}
      </FitText>
    </View>
  );
}

describe('FitRows', () => {
  beforeEach(() => phone(375, 1.4));

  async function card(widestOfSecond: number) {
    const screen = await render(
      <FitRows testID="card">
        <Pair id="aside" label="Put aside" value="$3,300.00" />
        <Pair id="owed" label="Owed on credit cards" value="$1,234.63" />
      </FitRows>,
    );
    await layout(screen, 'fit-slot-aside-label', 150);
    await layout(screen, 'fit-copy-aside-label', 60);
    await layout(screen, 'fit-slot-owed-label', 150);
    await layout(screen, 'fit-copy-owed-label', widestOfSecond);
    await layout(screen, 'card', 290);
    return screen;
  }

  it('keeps every value beside its label while every widest word fits', async () => {
    const screen = await card(80);
    expect(screen.getByTestId('aside-beside')).toBeTruthy();
    expect(screen.getByTestId('owed-beside')).toBeTruthy();
  });

  it('puts every value in the card under its label once one word cannot fit', async () => {
    const screen = await card(160);
    expect(screen.getByTestId('aside-under')).toBeTruthy();
    expect(screen.getByTestId('owed-under')).toBeTruthy();
  });
});
