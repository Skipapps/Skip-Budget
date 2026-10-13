import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import PaymentMonthScreen from '@/app/payment-month';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { onPaymentPicked } from '@/lib/payment-pick';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Choose month, on 12 Oct 2026: free lists Jul 2026 (the 90-day floor's month) to Oct 2027 and
 * offers Pro's older months below; Pro lists Jan 2020 to Oct 2027. This month comes first, then the
 * coming months soonest first, then the past by year, newest first; a ticked month further down is
 * scrolled into view. A pick goes back to the page that opened this one, by its id.
 */

jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    { get: (_target, name) => () => createElement(View, { testID: `icon-${String(name)}` }) },
  );
});
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000001', muted: '#000002', accentInk: '#000003' }),
}));
let mockToday = '2026-10-12';
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: mockToday, todayDate: new Date(`${mockToday}T00:00:00`) }),
}));
let mockFloor = { floor: '2026-07-15', free: true };
jest.mock('@/api/history', () => ({ useHistoryFloor: () => mockFloor }));

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

const CEILINGS = new Set<number>(Object.values(TEXT_CAP));
const hidden = { includeHiddenElements: true };

const radioNames = () =>
  screen.getAllByRole('radio').map((node) => String(node.props.accessibilityLabel));

beforeEach(() => {
  resetLocaleForTests();
  mockToday = '2026-10-12';
  mockFloor = { floor: '2026-07-15', free: true };
  mockParams = {};
  jest.clearAllMocks();
});

describe('the months listed', () => {
  it('on free: this month, the coming months soonest first, then back to July, and no badges', async () => {
    mockParams = { owner: 'bills-1', selected: '2026-10' };
    await render(<PaymentMonthScreen />);

    expect(screen.getByRole('header', { name: 'Choose month' })).toBeTruthy();
    expect(radioNames()).toEqual([
      'This month, October 2026',
      'November 2026',
      'December 2026',
      ...['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August']
        .concat(['September', 'October'])
        .map((month) => `${month} 2027`),
      ...['September', 'August', 'July'].map((month) => `${month} 2026`),
    ]);
    expect(screen.getByRole('header', { name: 'Coming months' })).toBeTruthy();
    expect(screen.getByRole('header', { name: '2026' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: '2027' })).toBeNull();
    expect(screen.queryByRole('header', { name: '2025' })).toBeNull();
    expect(screen.queryByTestId('pro-badge', hidden)).toBeNull();
  });

  it('on free, offers the older months with Pro below the list', async () => {
    await render(<PaymentMonthScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'See older months with Pro' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pro-feature',
      params: { id: 'history' },
    });
  });

  it('on Pro: seven calendar years back to January 2020, and no footer', async () => {
    mockFloor = { floor: '2019-10-12', free: false };
    await render(<PaymentMonthScreen />);
    const names = radioNames();
    expect(names).toHaveLength(1 + 12 + 9 + 12 * 6);
    expect(names.slice(13, 15)).toEqual(['September 2026', 'August 2026']);
    expect(names[names.length - 1]).toBe('January 2020');
    expect(names).not.toContain('December 2019');
    expect(screen.getByRole('header', { name: '2020' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'See older months with Pro' })).toBeNull();
  });

  it('on Pro, drops 2020 on New Year’s Day 2027', async () => {
    mockToday = '2027-01-01';
    mockFloor = { floor: '2020-01-01', free: false };
    await render(<PaymentMonthScreen />);
    const names = radioNames();
    expect(names[0]).toBe('This month, January 2027');
    expect(names[1]).toBe('February 2027');
    expect(screen.getByRole('header', { name: '2026' })).toBeTruthy();
    expect(names[names.length - 1]).toBe('January 2021');
    expect(screen.queryByRole('header', { name: '2020' })).toBeNull();
  });

  it('names a past month under its year, and a coming one with its year', async () => {
    await render(<PaymentMonthScreen />);
    const september = screen.getByRole('radio', { name: 'September 2026' });
    expect(within(september).getByText('September')).toBeTruthy();
    const november = screen.getByRole('radio', { name: 'November 2026' });
    expect(within(november).getByText('November 2026')).toBeTruthy();
    expect(within(screen.getByTestId('this-month-card')).getByText('This month')).toBeTruthy();
    expect(within(screen.getByTestId('this-month-card')).getByText('October 2026')).toBeTruthy();
  });
});

describe('the month ticked', () => {
  it('is this month when the page shows this month', async () => {
    mockParams = { owner: 'bills-1', selected: '2026-10' };
    await render(<PaymentMonthScreen />);
    expect(
      screen.getAllByRole('radio', { checked: true }).map((node) => node.props.accessibilityLabel),
    ).toEqual(['This month, October 2026']);
  });

  it('is this month when opened without one, as a page opened by a link shows', async () => {
    await render(<PaymentMonthScreen />);
    expect(
      screen.getByRole('radio', { name: 'This month, October 2026', checked: true }),
    ).toBeTruthy();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('is the month the page shows, when another', async () => {
    mockParams = { owner: 'bills-1', selected: '2026-08' };
    await render(<PaymentMonthScreen />);
    expect(screen.getByRole('radio', { name: 'August 2026', checked: true })).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'This month, October 2026', checked: false }),
    ).toBeTruthy();
  });

  it('is none for a month the plan does not list', async () => {
    mockParams = { owner: 'bills-1', selected: '2025-01' };
    await render(<PaymentMonthScreen />);
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
  });
});

describe('picking', () => {
  it('hands the month to the page that opened this one and goes back, once', async () => {
    mockParams = { owner: 'bills-1', selected: '2026-10' };
    const heard = jest.fn();
    const other = jest.fn();
    const stop = onPaymentPicked('bills-1', 'month', (pick) => heard(pick.month));
    const stopOther = onPaymentPicked('subscriptions-1', 'month', other);
    await render(<PaymentMonthScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'September 2026' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'August 2026' }));

    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith('2026-09');
    expect(other).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
    stopOther();
  });

  it('hands back this month too', async () => {
    mockParams = { owner: 'bills-1', selected: '2026-08' };
    const heard = jest.fn();
    const stop = onPaymentPicked('bills-1', 'month', (pick) => heard(pick.month));
    await render(<PaymentMonthScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'This month, October 2026' }));
    expect(heard).toHaveBeenCalledWith('2026-10');
    stop();
  });

  it('hands nothing to anyone when opened by a link, and still goes back', async () => {
    const heard = jest.fn();
    const stop = onPaymentPicked('', 'month', heard);
    await render(<PaymentMonthScreen />);
    await act(() => fireEvent.press(screen.getByRole('radio', { name: 'July 2026' })));
    expect(heard).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe('bringing the ticked month into view', () => {
  const scrollTo = () => (ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo;

  async function layOut(nodes: [string, { y: number; height: number }][]) {
    for (const [testID, { y, height }] of nodes) {
      await fireEvent(screen.getByTestId(testID), 'layout', {
        nativeEvent: { layout: { x: 0, y, width: 342, height } },
      });
    }
  }

  it('scrolls once to a month further down, a third of the way from the top', async () => {
    mockFloor = { floor: '2019-10-12', free: false };
    mockParams = { owner: 'bills-1', selected: '2023-03' };
    await render(<PaymentMonthScreen />);
    await layOut([
      ['month-scroller', { y: 0, height: 600 }],
      ['block-2023', { y: 1800, height: 680 }],
      ['months-2023-card', { y: 26, height: 650 }],
      ['months-2023-2023-03', { y: 486, height: 52 }],
    ]);
    // The row's top: 1800 + 26 + 486 = 2312, lifted a third of 600.
    expect(scrollTo()).toHaveBeenCalledTimes(1);
    expect(scrollTo()).toHaveBeenCalledWith({ y: 2112, animated: false });

    await layOut([['month-scroller', { y: 0, height: 620 }]]);
    expect(scrollTo()).toHaveBeenCalledTimes(1);
  });

  it('waits until the scroller, the card and the row are all laid out, in any order', async () => {
    mockParams = { owner: 'bills-1', selected: '2026-07' };
    await render(<PaymentMonthScreen />);
    await layOut([
      ['months-2026-2026-07', { y: 104, height: 52 }],
      ['block-2026', { y: 900, height: 180 }],
    ]);
    expect(scrollTo()).not.toHaveBeenCalled();
    await layOut([
      ['months-2026-card', { y: 26, height: 156 }],
      ['month-scroller', { y: 0, height: 600 }],
    ]);
    expect(scrollTo()).toHaveBeenCalledWith({ y: 830, animated: false });
  });

  it('leaves the page where it is when the ticked month is already in sight', async () => {
    mockParams = { owner: 'bills-1', selected: '2026-11' };
    await render(<PaymentMonthScreen />);
    await layOut([
      ['month-scroller', { y: 0, height: 600 }],
      ['block-coming', { y: 100, height: 650 }],
      ['coming-months-card', { y: 26, height: 624 }],
      ['coming-months-2026-11', { y: 0, height: 52 }],
    ]);
    expect(scrollTo()).not.toHaveBeenCalled();
  });
});

describe('in every language, at large text', () => {
  it.each<Language>(['en', 'es', 'fr'])(
    '%s: each line at its role’s ceiling, never cut, never a raw key',
    async (language) => {
      setLanguage(language);
      await render(<PaymentMonthScreen />);
      const lines: string[] = [];
      const walk = (node: Json | string) => {
        if (typeof node === 'string') return;
        if (node.type === 'Text') {
          expect(CEILINGS.has(node.props.maxFontSizeMultiplier as number)).toBe(true);
          expect(node.props.numberOfLines).toBeUndefined();
          expect(node.props.adjustsFontSizeToFit).toBeUndefined();
          lines.push((node.children ?? []).filter((child) => typeof child === 'string').join(''));
        }
        node.children?.forEach(walk);
      };
      const tree = screen.toJSON() as Tree;
      (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
      for (const line of lines) {
        expect(line).not.toMatch(/(payments|ui)\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}/);
      }
    },
  );

  it('writes the page in Spanish and French', async () => {
    setLanguage('es');
    await render(<PaymentMonthScreen />);
    for (const line of [
      'Elige el mes',
      'Este mes',
      'octubre de 2026',
      'septiembre',
      'Consulta los meses anteriores con Pro',
      'Próximos meses',
    ]) {
      expect(screen.getAllByText(line).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('radio', { name: 'septiembre de 2026' })).toBeTruthy();

    setLanguage('fr');
    await render(<PaymentMonthScreen />);
    for (const line of [
      'Choisis le mois',
      'Ce mois-ci',
      'octobre 2026',
      'septembre',
      'Mois à venir',
    ]) {
      expect(screen.getAllByText(line).length).toBeGreaterThan(0);
    }
  });
});
