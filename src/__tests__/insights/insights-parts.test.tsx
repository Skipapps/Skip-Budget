import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import { InsightsHero } from '@/components/insights/insights-hero';
import { PeriodSwitch } from '@/components/insights/period-switch';
import { Section, type SectionState } from '@/components/insights/section';
import {
  BAR_ROOM,
  SpendChart,
  spendBarHeights,
  type SpendBar,
} from '@/components/insights/spend-chart';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The pieces Insights is drawn from, on literal figures: the plum card, the Month/Year switch, the
 * spending chart and a section's states.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (href: unknown) => mockPush(href), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { Skeleton: () => createElement(View, { testID: 'skeleton' }) };
});
jest.mock('@/providers/theme-provider', () => {
  const colors = new Proxy({}, { get: () => '#000000' });
  return { useColors: () => colors, useTheme: () => ({ scheme: 'light', colors }) };
});

beforeEach(() => {
  resetLocaleForTests();
  mockPush.mockClear();
});
afterAll(() => resetLocaleForTests());

type Json = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

function texts(node: Json): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  return (node.children ?? []).flatMap((child) => texts(child as Json));
}

describe('the plum card', () => {
  it('says what is left, what came in and went out, and the share spent', async () => {
    await render(
      <InsightsHero
        figures={{
          in: 10_000,
          out: 1_599.99,
          left: 8_400.01,
          over: false,
          spentPercent: 16,
          belowOnePercent: false,
        }}
      />,
    );
    expect(screen.getByText('Left this month')).toBeTruthy();
    expect(screen.getByText('$8,400.01')).toBeTruthy();
    expect(screen.getByText('$10,000.00 in · $1,599.99 out')).toBeTruthy();
    expect(screen.getByText('You’ve spent 16% of your income so far.')).toBeTruthy();
    expect(screen.getByTestId('insights-hero-summary').props.accessibilityLabel).toBe(
      'Left this month: $8,400.01. $10,000.00 in, $1,599.99 out. You’ve spent 16% of your income so far.',
    );
  });

  it('says over, unsigned, when more went out than came in', async () => {
    await render(
      <InsightsHero
        figures={{
          in: 1_000,
          out: 1_250.5,
          left: -250.5,
          over: true,
          spentPercent: 125,
          belowOnePercent: false,
        }}
      />,
    );
    expect(screen.getByText('Over this month')).toBeTruthy();
    expect(screen.getByText('$250.50')).toBeTruthy();
    expect(screen.queryByText('-$250.50')).toBeNull();
    expect(screen.getByText('You’ve spent 125% of your income so far.')).toBeTruthy();
  });

  it('leaves the share line off with no pay this month', async () => {
    await render(
      <InsightsHero
        figures={{
          in: 0,
          out: 40,
          left: -40,
          over: true,
          spentPercent: null,
          belowOnePercent: false,
        }}
      />,
    );
    expect(screen.getByText('$0.00 in · $40.00 out')).toBeTruthy();
    expect(texts(screen.toJSON()).filter((line) => /income so far/.test(line))).toEqual([]);
  });

  it('reads in French with the figures written the Canadian way', async () => {
    setLanguage('fr');
    await render(
      <InsightsHero
        figures={{
          in: 10_000,
          out: 1_599.99,
          left: 8_400.01,
          over: false,
          spentPercent: 16,
          belowOnePercent: false,
        }}
      />,
    );
    expect(screen.getByText('Reste ce mois-ci')).toBeTruthy();
    expect(screen.getByText('Entrées 10 000,00 $ · Sorties 1 599,99 $')).toBeTruthy();
    expect(screen.getByText('Tu as dépensé 16 % de tes revenus jusqu’ici.')).toBeTruthy();
  });
});

describe('the Month / Year switch', () => {
  function draw(mode: 'month' | 'year') {
    const onChoose = jest.fn();
    const onMode = jest.fn();
    return {
      onChoose,
      onMode,
      shown: render(
        <PeriodSwitch
          mode={mode}
          shown={mode === 'month' ? 'Oct 2026' : '2026'}
          shownA11y={
            mode === 'month'
              ? 'Showing October 2026. Choose another month'
              : 'Showing 2026. Choose another year'
          }
          onChoose={onChoose}
          onMode={onMode}
        />,
      ),
    };
  }

  it('in Month: the chosen side names the month and opens Choose month; Year switches', async () => {
    const { onChoose, onMode, shown } = draw('month');
    await shown;
    const sides = screen.getAllByRole('button');
    expect(sides.map((side) => side.props.accessibilityLabel)).toEqual([
      'Showing October 2026. Choose another month',
      'Show the whole year',
    ]);
    expect(sides.map((side) => side.props.accessibilityState)).toEqual([
      { selected: true },
      { selected: false },
    ]);
    expect(screen.getByText('Oct 2026')).toBeTruthy();
    expect(screen.getByText('Year')).toBeTruthy();

    await fireEvent.press(sides[0]);
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onMode).not.toHaveBeenCalled();
    await fireEvent.press(sides[1]);
    expect(onMode).toHaveBeenCalledWith('year');
  });

  it('in Year: Month on the left switches back; the year on the right opens Choose year', async () => {
    const { onChoose, onMode, shown } = draw('year');
    await shown;
    const sides = screen.getAllByRole('button');
    expect(sides.map((side) => side.props.accessibilityLabel)).toEqual([
      'Show one month',
      'Showing 2026. Choose another year',
    ]);
    await fireEvent.press(sides[0]);
    expect(onMode).toHaveBeenCalledWith('month');
    await fireEvent.press(sides[1]);
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it('caps both sides at the control ceiling and never cuts them to one line', async () => {
    const { shown } = draw('month');
    await shown;
    for (const words of ['Oct 2026', 'Year']) {
      const text = screen.getByText(words);
      expect(text.props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
      expect(text.props.numberOfLines).toBeUndefined();
    }
  });
});

describe('the spending chart', () => {
  const month: SpendBar[] = [
    { key: '1', label: '1–3', spoken: '1–3', amount: 1_500, highlight: false },
    { key: '4', label: '4–10', spoken: '4–10', amount: 0, highlight: false },
    { key: '11', label: '11–17', spoken: '11–17', amount: 99.99, highlight: false },
    { key: '18', label: '18–24', spoken: '18–24', amount: 0, highlight: false },
    { key: '25', label: '25–31', spoken: '25–31', amount: 0, highlight: false },
  ];

  it('draws each bar as its share of the biggest, a small one never as none', () => {
    expect(spendBarHeights([1_500, 0, 99.99, 0.01])).toEqual([BAR_ROOM, 0, 7, 4]);
    expect(spendBarHeights([0, 0])).toEqual([0, 0]);
  });

  it('in Month: every bar with money carries its figure; one with none lies flat', async () => {
    await render(<SpendChart bars={month} mode="month" />);
    expect(screen.getByTestId('insights-chart-figure-0').props.children).toBe('$1.5k');
    expect(screen.getByTestId('insights-chart-figure-2').props.children).toBe('$100');
    expect(screen.queryByTestId('insights-chart-figure-1')).toBeNull();
    expect(screen.getByTestId('insights-chart-flat-1')).toBeTruthy();
    expect(screen.getByTestId('insights-chart-bar-0').props.style).toEqual({ height: BAR_ROOM });
    // Every bar of a month is the solid accent.
    expect(screen.getByTestId('insights-chart-bar-2').props.className).toContain('bg-accent');
    expect(screen.getByTestId('insights-chart-bar-2').props.className).not.toContain(
      'bg-accent/30',
    );
  });

  it('is read aloud as one stop, every bar to the cent', async () => {
    await render(<SpendChart bars={month} mode="month" />);
    expect(screen.getByTestId('insights-chart').props.accessibilityLabel).toBe(
      '1–3: $1,500.00, 4–10: $0.00, 11–17: $99.99, 18–24: $0.00, 25–31: $0.00',
    );
  });

  it('in Year: only the highlighted month is dark and carries a figure', async () => {
    const year: SpendBar[] = 'JFMAMJJASOND'.split('').map((initial, index) => ({
      key: String(index),
      label: initial,
      spoken: initial,
      amount: index < 10 ? 1_599.99 : 0,
      highlight: index === 9,
    }));
    await render(<SpendChart bars={year} mode="year" />);
    expect(screen.getByTestId('insights-chart-figure-9').props.children).toBe('$1.6k');
    expect(screen.queryByTestId('insights-chart-figure-8')).toBeNull();
    expect(screen.getByTestId('insights-chart-bar-9').props.className).toContain('bg-accent');
    expect(screen.getByTestId('insights-chart-bar-9').props.className).not.toContain('/30');
    expect(screen.getByTestId('insights-chart-bar-0').props.className).toContain('bg-accent/30');
    expect(screen.getByTestId('insights-chart-flat-11')).toBeTruthy();
  });

  it('caps its words at the control ceiling and never cuts them to one line', async () => {
    await render(<SpendChart bars={month} mode="month" />);
    for (const words of ['$1.5k', '25–31']) {
      const text = screen.getByText(words);
      expect(text.props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.adjustsFontSizeToFit).toBeUndefined();
    }
  });
});

describe('a section', () => {
  const draw = (state: SectionState) =>
    render(
      <Section
        id="loans"
        title="Loans"
        subtitle="Money you owe on loans"
        seeAll="/loans"
        state={state}
      >
        <></>
      </Section>,
    );

  it('has its heading, its muted line and See all to its page', async () => {
    await draw({ kind: 'ready' });
    expect(screen.getByRole('header', { name: 'Loans' })).toBeTruthy();
    expect(screen.getByText('Money you owe on loans')).toBeTruthy();
    await fireEvent.press(screen.getByRole('link', { name: 'See all: Loans' }));
    expect(mockPush).toHaveBeenCalledWith('/loans');
  });

  it('holds its room while loading', async () => {
    await draw({ kind: 'loading' });
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('fails in its own card, with the one failure line and Try again', async () => {
    const onRetry = jest.fn();
    await draw({ kind: 'failed', onRetry });
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('when empty, says so in one muted line with the action that fills it', async () => {
    const onAction = jest.fn();
    await draw({ kind: 'empty', line: 'No loans yet', actionLabel: 'Add a loan', onAction });
    expect(screen.getByText('No loans yet').props.className).toContain('text-muted');
    await fireEvent.press(screen.getByRole('button', { name: 'Add a loan' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('draws nothing when hidden', async () => {
    await draw({ kind: 'hidden' });
    expect(screen.toJSON()).toBeNull();
  });
});
