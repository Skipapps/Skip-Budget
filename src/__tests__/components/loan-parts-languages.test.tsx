import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ProportionBar } from '@/components/calculators/proportion-bar';
import { ScheduleCard, loanRateText, loanTermText } from '@/components/calculators/schedule-card';
import { SliderRow } from '@/components/calculators/slider-row';
import { FlowChart } from '@/components/transactions/flow-chart';
import { RollingNumber } from '@/components/ui/rolling-number';
import { percent, t } from '@/i18n';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { formatTerm, type ScheduleRow } from '@/lib/loan';

/**
 * The pieces the loan screens and the money figures are built from, in Spanish and French. English
 * must read exactly as it did; the other languages change the writing, never a figure.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000', muted: '#777', body: '#222', accent: '#905479', line: '#ddd' }),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
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
  it('reads exactly as formatTerm in English, for every term the slider reaches and more', () => {
    for (let months = 0; months <= 480; months += 1) {
      expect(loanTermText(months)).toBe(formatTerm(months));
    }
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
  const RATES = [0, 7.5, 6.99, 8.14, 12, 0.125, 29.999, 0.1 + 0.2];

  it('reads exactly as the rate was given in English, never padded or rounded', () => {
    for (const rate of RATES) expect(loanRateText(rate)).toBe(`${rate}%`);
  });

  it('writes the decimal comma and a no-break space before % in French', () => {
    setLanguage('fr');
    expect(loanRateText(8.14)).toBe(`8,14${NBSP}%`);
    expect(loanRateText(7.5)).toBe(`7,5${NBSP}%`);
    expect(loanRateText(12)).toBe(`12${NBSP}%`);
  });

  it('keeps the point and a flush % in Spanish', () => {
    setLanguage('es');
    expect(loanRateText(8.14)).toBe('8.14%');
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
        minLabel={percent(0, 0)}
        maxLabel={percent(30, 0)}
      />,
    );

    expect(screen.getByLabelText(`Taux d’intérêt, 7,50${NBSP}%. Modifier`, RAW)).toBeTruthy();
    expect(screen.getByText(`0${NBSP}%`, RAW)).toBeTruthy();
    expect(screen.getByText(`30${NBSP}%`, RAW)).toBeTruthy();
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

describe('ProportionBar', () => {
  it.each([
    ['en' as const, 'USD' as const, 'Borrowed $25,000', 'Interest 13%'],
    ['es' as const, 'MXN' as const, 'Prestado $25,000', 'Intereses 13%'],
    ['fr' as const, 'CAD' as const, `Emprunté 25${NBSP}000${NBSP}$`, `Intérêts 13${NBSP}%`],
  ])('labels the split in %s', async (language, currency, borrowed, interest) => {
    setLanguage(language);
    setCurrency(currency);
    // 3,750 of 28,750 is 13.04%.
    await render(<ProportionBar principal={25_000} interest={3_750} />);
    expect(screen.getByText(borrowed, RAW)).toBeTruthy();
    expect(screen.getByText(interest, RAW)).toBeTruthy();
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

  it('reads as before in English', async () => {
    await render(<ScheduleCard rows={rows} onPress={() => {}} />);
    expect(screen.getByText('Where each payment goes', RAW)).toBeTruthy();
    expect(
      screen.getByText('57% of your first payment is interest — see all 72 payments', RAW),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Where each payment goes. First payment: $315.06 interest, $239.28 off the balance. Opens the full schedule.',
        RAW,
      ),
    ).toBeTruthy();
  });

  it('is in Spanish', async () => {
    setLanguage('es');
    await render(<ScheduleCard rows={rows} onPress={() => {}} />);
    expect(screen.getByText('A dónde va cada pago', RAW)).toBeTruthy();
    expect(
      screen.getByText('57% de tu primer pago se va en intereses: ve los 72 pagos', RAW),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'A dónde va cada pago. Primer pago: $315.06 de intereses, $239.28 a capital. Abre el calendario completo.',
        RAW,
      ),
    ).toBeTruthy();
  });

  it('is in French, with the figures written the French way', async () => {
    setLanguage('fr');
    await render(<ScheduleCard rows={rows} onPress={() => {}} />);
    expect(screen.getByText('Où va chaque paiement', RAW)).toBeTruthy();
    expect(
      screen.getByText(
        `57${NBSP}% de ton premier paiement va aux intérêts — vois les 72 paiements`,
        RAW,
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Où va chaque paiement. Premier paiement${NBSP}: 315,06${NBSP}$ d’intérêts, 239,28${NBSP}$ en capital. Ouvre le calendrier complet.`,
        RAW,
      ),
    ).toBeTruthy();
  });

  it('says "the 1 payment" in English when there is only one', async () => {
    await render(<ScheduleCard rows={[row(1)]} onPress={() => {}} />);
    expect(
      screen.getByText('57% of your first payment is interest — see the 1 payment', RAW),
    ).toBeTruthy();
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
      'loan.save.termPayments' as const,
      { term: '1 mo' },
      2,
      '1 mo · 1 payment',
      '1 mo · 2 payments',
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
