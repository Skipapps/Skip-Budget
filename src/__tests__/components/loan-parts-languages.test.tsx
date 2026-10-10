import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import {
  ScheduleCard,
  loanAmountText,
  loanRateText,
  loanTermText,
} from '@/components/calculators/schedule-card';
import { SliderRow } from '@/components/calculators/slider-row';
import { FlowChart } from '@/components/transactions/flow-chart';
import { RollingNumber } from '@/components/ui/rolling-number';
import { percent, t } from '@/i18n';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import type { ScheduleRow } from '@/lib/loan';

/**
 * The pieces the loan screens and the money figures are built from, in Spanish and French. English
 * must read exactly as it did; the other languages change the writing, never a figure.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000', muted: '#777', body: '#222', accent: '#905479', line: '#ddd' }),
}));
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
}));
// Reanimated's own mock needs the native worklets module. Reduced motion keeps every wheel at
// rest, which is the state these tests read.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- required inside the factory
  const { View } = require('react-native');
  const same = (value: unknown) => value;
  return {
    __esModule: true,
    default: { View },
    Easing: { inOut: same, out: same, cubic: same, quad: same },
    runOnJS: same,
    useAnimatedStyle: (style: () => object) => style(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withDelay: (_delay: number, next: unknown) => next,
    withTiming: same,
    withSpring: same,
  };
});

const NBSP = '\u00a0';
/**
 * Text queries fold whitespace by default and count a no-break space as whitespace, so they would
 * pass "1 234,56" written with an ordinary space. RAW compares the characters exactly as drawn.
 */
const RAW = { normalizer: (text: string) => text };

beforeEach(() => resetLocaleForTests());

describe('loanTermText', () => {
  it('writes whole words in English, as the loan pages are drawn', () => {
    expect(loanTermText(1)).toBe('1 month');
    expect(loanTermText(6)).toBe('6 months');
    expect(loanTermText(12)).toBe('1 year');
    expect(loanTermText(13)).toBe('1 year 1 month');
    expect(loanTermText(60)).toBe('5 years');
    expect(loanTermText(30)).toBe('2 years 6 months');
    expect(loanTermText(480)).toBe('40 years');
  });

  it('writes whole words in Spanish', () => {
    setLanguage('es');
    expect(loanTermText(1)).toBe('1 mes');
    expect(loanTermText(6)).toBe('6 meses');
    expect(loanTermText(12)).toBe('1 año');
    expect(loanTermText(13)).toBe('1 año 1 mes');
    expect(loanTermText(30)).toBe('2 años 6 meses');
    expect(loanTermText(480)).toBe('40 años');
  });

  it('writes whole words in French', () => {
    setLanguage('fr');
    expect(loanTermText(1)).toBe('1 mois');
    expect(loanTermText(12)).toBe('1 an');
    expect(loanTermText(13)).toBe('1 an 1 mois');
    expect(loanTermText(72)).toBe('6 ans');
    expect(loanTermText(30)).toBe('2 ans 6 mois');
  });
});

describe('loanRateText', () => {
  it('writes at least two decimals and never rounds a rate given to more', () => {
    const READS: [number, string][] = [
      [0, '0.00%'],
      [7.5, '7.50%'],
      [6.99, '6.99%'],
      [8.14, '8.14%'],
      [12, '12.00%'],
      [0.125, '0.125%'],
      [29.999, '29.999%'],
      // 0.30000000000000004 as typed through floating point: every digit, as given.
      [0.1 + 0.2, `${0.1 + 0.2}%`],
    ];
    for (const [rate, reads] of READS) expect([rate, loanRateText(rate)]).toEqual([rate, reads]);
  });

  it('writes the decimal comma and a no-break space before % in French', () => {
    setLanguage('fr');
    expect(loanRateText(8.14)).toBe(`8,14${NBSP}%`);
    expect(loanRateText(7.5)).toBe(`7,50${NBSP}%`);
    expect(loanRateText(12)).toBe(`12,00${NBSP}%`);
  });

  it('keeps the point and a flush % in Spanish', () => {
    setLanguage('es');
    expect(loanRateText(8.14)).toBe('8.14%');
  });
});

describe('loanAmountText', () => {
  it('drops the cents only when there are none, never rounding them away', () => {
    expect(loanAmountText(25_000)).toBe('$25,000');
    expect(loanAmountText(25_000.5)).toBe('$25,000.50');
    expect(loanAmountText(31_394.33)).toBe('$31,394.33');
    setLanguage('fr');
    setCurrency('CAD');
    expect(loanAmountText(25_000)).toBe(`25${NBSP}000${NBSP}$`);
  });
});

describe('SliderRow', () => {
  it('asks to edit in the language on screen', async () => {
    setLanguage('fr');
    await render(
      <SliderRow
        label="Taux d’intérêt"
        display={percent(7.5, 2)}
        value={7.5}
        min={0}
        max={30}
        onChange={() => {}}
        onValuePress={() => {}}
      />,
    );

    expect(screen.getByLabelText(`Taux d’intérêt, 7,50${NBSP}%. Modifier`, RAW)).toBeTruthy();
  });

  it('reads as before in English', async () => {
    await render(
      <SliderRow
        label="Interest rate"
        display={percent(7.5, 2)}
        value={7.5}
        min={0}
        max={30}
        onChange={() => {}}
        onValuePress={() => {}}
      />,
    );
    expect(screen.getByLabelText('Interest rate, 7.50%. Edit', RAW)).toBeTruthy();
  });
});

describe('ScheduleCard', () => {
  const row = (number: number): ScheduleRow =>
    ({
      number,
      date: '2026-01-14',
      days: 45,
      payment: 554.34,
      interest: 315.06,
      principal: 239.28,
      extra: 0,
      balance: 31_155.05,
    }) as ScheduleRow;
  const rows = Array.from({ length: 72 }, (_, i) => row(i + 1));

  it.each([
    ['en' as const, 'Payment schedule', 'See where all 72 payments go'],
    ['es' as const, 'Calendario de pagos', 'Mira a dónde van los 72 pagos'],
    ['fr' as const, 'Calendrier de remboursement', 'Vois où vont les 72 paiements'],
  ])('names the schedule and its payments in %s', async (language, title, subtitle) => {
    setLanguage(language);
    const onPress = jest.fn();
    await render(<ScheduleCard rows={rows} onPress={onPress} />);

    expect(screen.getByText(title, RAW)).toBeTruthy();
    expect(screen.getByText(subtitle, RAW)).toBeTruthy();
    const card = screen.getByRole('button', { name: title });
    expect(card.props.accessibilityHint).toBe(subtitle);
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('says "the 1 payment" in English when there is only one', async () => {
    await render(<ScheduleCard rows={[row(1)]} onPress={() => {}} />);
    expect(screen.getByText('See where the 1 payment goes', RAW)).toBeTruthy();
  });

  it('draws nothing for a loan with no payments', async () => {
    await render(<ScheduleCard rows={[]} onPress={() => {}} />);
    expect(screen.toJSON()).toBeNull();
  });
});

/** English says "1 payment" and "1 day"; two or more read exactly as they always have. */
describe('English loan lines at a count of one', () => {
  const row = { number: 1, date: '14 Jan 2026', payment: '$2', interest: '$1', principal: '$1' };

  it.each([
    [
      'loan.calculator.paymentsLastOn' as const,
      { date: '14 Jan 2026' },
      60,
      '1 payment · last on 14 Jan 2026',
      '60 payments · last on 14 Jan 2026',
    ],
    [
      'loan.calculator.firstCoversDays' as const,
      { interest: '$1.00' },
      45,
      'First payment covers 1 day, not a month — $1.00 of it is interest.',
      'First payment covers 45 days, not a month — $1.00 of it is interest.',
    ],
    [
      'loan.scheduleCard.subtitle' as const,
      {},
      60,
      'See where the 1 payment goes',
      'See where all 60 payments go',
    ],
    [
      'loan.schedule.yearSummary' as const,
      { interest: '$1.00' },
      12,
      '1 payment · $1.00 interest',
      '12 payments · $1.00 interest',
    ],
    [
      'loan.schedule.rowA11y' as const,
      { ...row, balance: '$0' },
      31,
      'Payment 1, 14 Jan 2026, covering 1 day. $2: $1 interest, $1 off the balance. $0 left.',
      'Payment 1, 14 Jan 2026, covering 31 days. $2: $1 interest, $1 off the balance. $0 left.',
    ],
    [
      'loan.schedule.rowA11yExtra' as const,
      { ...row, balance: '$0', extra: '$1' },
      31,
      'Payment 1, 14 Jan 2026, covering 1 day. $2: $1 interest, $1 off the balance, including $1 paid extra. $0 left.',
      'Payment 1, 14 Jan 2026, covering 31 days. $2: $1 interest, $1 off the balance, including $1 paid extra. $0 left.',
    ],
  ])('%s', (key, params, many, readsAtOne, readsAtMany) => {
    expect(t(key, { ...params, count: 1 })).toBe(readsAtOne);
    expect(t(key, { ...params, count: many })).toBe(readsAtMany);
  });
});

/**
 * Only digits are wheels. The French group space, the decimal comma and the trailing " $" are plain
 * text that never turns, and the cents keep their wheels however many digits the figure grows.
 */
describe('RollingNumber in French', () => {
  /**
   * Each Text in drawing order, read from the tree: the text queries trim, and trim() takes a
   * no-break space for whitespace, so a face holding only one would vanish from them.
   */
  async function facesOf(value: number): Promise<{ face: string; centred: boolean }[]> {
    const view = await render(<RollingNumber value={value} lineHeight={40} fontSize={32} />);
    return view.container
      .queryAll((node) => node.type === 'Text')
      .map((node) => ({
        face: node.children.join(''),
        centred:
          StyleSheet.flatten(node.props.style as StyleProp<TextStyle>)?.textAlign === 'center',
      }));
  }

  it('draws "1 234,56 $" with the comma and both no-break spaces held still', async () => {
    setLanguage('fr');
    setCurrency('CAD');
    const faces = await facesOf(1234.56);

    expect(faces.map(({ face }) => face).join('')).toBe(`1${NBSP}234,56${NBSP}$`);
    // A wheel centres its digit in its window; a mark is plain text that never turns.
    for (const { face, centred } of faces) expect(centred).toBe(/^\d$/.test(face));
    expect(faces.filter(({ face }) => face === NBSP)).toHaveLength(2);
  });

  it('writes the same number in every language and currency', async () => {
    const written: string[] = [];
    for (const [language, currency] of [
      ['en', 'USD'],
      ['es', 'MXN'],
      ['fr', 'CAD'],
      ['fr', 'GBP'],
    ] as const) {
      setLanguage(language);
      setCurrency(currency);
      written.push((await facesOf(-98765.43)).map(({ face }) => face).join(''));
    }
    expect(written).toEqual([
      '-$98,765.43',
      '-$98,765.43',
      `-98${NBSP}765,43${NBSP}$`,
      `-98${NBSP}765,43${NBSP}£`,
    ]);
  });
});

describe('FlowChart', () => {
  /** The bar labels as the old chart wrote them, for the English check. */
  const oldCompact = (value: number) =>
    value >= 1000
      ? `$${value / 1000 >= 10 ? Math.round(value / 1000) : (value / 1000).toFixed(1)}k`
      : `$${Math.round(value)}`;

  const BUCKETS = [
    { key: 'a', label: 'J', spent: 1500 },
    { key: 'b', label: 'F', spent: 12_345 },
    { key: 'c', label: 'M', spent: 420.4 },
  ];

  /** The chart draws once it knows its width; returns everything it drew. */
  async function drawnChart(): Promise<string> {
    const view = await render(<FlowChart buckets={BUCKETS} />);
    const [measured] = view.container.queryAll((node) => typeof node.props.onLayout === 'function');
    await fireEvent(measured, 'layout', { nativeEvent: { layout: { width: 300, height: 132 } } });
    return JSON.stringify(view.toJSON());
  }

  it('writes each bar exactly as before in English', async () => {
    const drawn = await drawnChart();
    for (const bucket of BUCKETS) {
      expect(drawn).toContain(JSON.stringify(oldCompact(bucket.spent)));
    }
  });

  it('writes each bar the French way, with no "$" in front', async () => {
    setLanguage('fr');
    setCurrency('CAD');
    const drawn = await drawnChart();
    for (const label of [`1,5k${NBSP}$`, `12k${NBSP}$`, `420${NBSP}$`]) {
      expect(drawn).toContain(JSON.stringify(label));
    }
    expect(drawn).not.toContain('"$');
  });
});
