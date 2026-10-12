import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import SavingsScreen from '@/app/savings';
import { AUGUST, JULY, SEPTEMBER, potView } from '@/components/savings/__fixtures__/design';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { PotView } from '@/lib/savings';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The Savings page (design 1) in English, Spanish and French: Ready to use with its Send button,
 * the month in progress, and By month with each month's pill. A new account sees $0 and when its
 * first wrap-up comes. Every line is whole at the largest text size.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null, Skeleton: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ scheme: 'light' }),
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
}));

type Savings = {
  pots: PotView[];
  summary: { readyToUse: number; pots: PotView[] };
  soFar: { month: string; earned: number; spent: number; leftOver: number; movesOn: string } | null;
  isPending: boolean;
  isError: boolean;
};
let mockSavings: Savings;
const mockRefetch = jest.fn();
jest.mock('@/api/savings', () => ({
  useSavings: () => ({ ...mockSavings, refetch: mockRefetch }),
}));

const SO_FAR = {
  month: '2026-10',
  earned: 3700,
  spent: 2961.29,
  leftOver: 738.71,
  movesOn: '2026-11-01',
};

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels and hints. Measuring copies are skipped. */
function shownText(node: Node): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  if (props.importantForAccessibility === 'no-hide-descendants') return [];
  const spoken = ['accessibilityLabel', 'accessibilityHint'].flatMap((name) =>
    typeof props[name] === 'string' ? [props[name] as string] : [],
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Node))];
}

const WORDS: Record<
  Language,
  { title: string; ready: string; send: string; soFar: string; september: string; byMonth: string }
> = {
  en: {
    title: 'Savings',
    ready: 'Ready to use',
    send: 'Send to my goals',
    soFar: 'October so far',
    september: 'September',
    byMonth: 'By month',
  },
  es: {
    title: 'Ahorros',
    ready: 'Listo para usar',
    send: 'Enviar a mis metas',
    soFar: 'Octubre hasta ahora',
    september: 'Septiembre',
    byMonth: 'Por mes',
  },
  fr: {
    title: 'Épargne',
    ready: 'Prêt à utiliser',
    send: 'Envoyer à mes objectifs',
    soFar: 'Octobre jusqu’ici',
    september: 'Septembre',
    byMonth: 'Par mois',
  },
};
const LANGUAGES = Object.keys(WORDS) as Language[];

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  const pots = [SEPTEMBER, AUGUST, JULY];
  mockSavings = {
    pots,
    summary: { readyToUse: 850, pots },
    soFar: SO_FAR,
    isPending: false,
    isError: false,
  };
});
afterAll(() => resetLocaleForTests());

describe.each(LANGUAGES)('Savings in %s', (language) => {
  beforeEach(() => setLanguage(language));

  it('reads as designed, with no message key or unfilled {parameter}', async () => {
    await render(<SavingsScreen />);
    const words = WORDS[language];
    for (const line of [words.title, words.ready, words.send, words.soFar, words.september]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
    expect(screen.getByText(words.byMonth)).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();

    const lines = shownText(screen.toJSON() as Node);
    expect(lines.filter((line) => /\b(savings|goals|ui)\.[a-zA-Z]/.test(line))).toEqual([]);
    expect(lines.filter((line) => /[{}]/.test(line))).toEqual([]);
  });
});

describe('Savings', () => {
  it('shows $850 ready, the month so far and every month with its pill', async () => {
    await render(<SavingsScreen />);
    expect(screen.getByText('$850')).toBeTruthy();
    expect(screen.getByText('$738.71')).toBeTruthy();
    expect(screen.getByText('Earned $3,700 · Spent $2,961.29')).toBeTruthy();
    expect(screen.getByText('Moves to savings on 1 Nov')).toBeTruthy();
    for (const line of ['$640', 'Ready', '$520', 'Sent to goals', '$410', '$210 left']) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
  });

  it('opens Add to savings, Send, and a month', async () => {
    await render(<SavingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add to savings' }));
    expect(router.push).toHaveBeenLastCalledWith('/savings-entry');
    await fireEvent.press(screen.getByRole('button', { name: 'Send to my goals' }));
    expect(router.push).toHaveBeenLastCalledWith('/send-to-goals');
    await fireEvent.press(screen.getByRole('button', { name: /^July, \$410/ }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/savings-pot/[id]',
      params: { id: 'jul' },
    });
  });

  it('greets a new account with $0 and its first wrap-up, and offers no Send', async () => {
    mockSavings = {
      pots: [],
      summary: { readyToUse: 0, pots: [] },
      soFar: SO_FAR,
      isPending: false,
      isError: false,
    };
    await render(<SavingsScreen />);
    expect(screen.getByText('$0')).toBeTruthy();
    expect(screen.getByText('Your first wrap-up arrives on 1 Nov')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send to my goals' })).toBeNull();
    expect(screen.queryByText('By month')).toBeNull();
  });

  it('says "Nothing left over" for a month with no pay and no spending, not Overspent', async () => {
    const empty = potView({
      id: 'jun',
      month: '2026-06-01',
      earned: 0,
      spent: 0,
      amount: 0,
      leftOver: 0,
      status: 'overspent',
      left: 0,
    });
    const over = potView({
      id: 'may',
      month: '2026-05-01',
      earned: 3700,
      spent: 3800,
      amount: 0,
      leftOver: -100,
      status: 'overspent',
      left: 0,
    });
    mockSavings.summary.pots = [SEPTEMBER, empty, over];
    await render(<SavingsScreen />);
    expect(screen.getByText('Nothing left over')).toBeTruthy();
    expect(screen.getByText('Overspent')).toBeTruthy();
  });

  it('says so, with Try again, when savings cannot be read at all', async () => {
    mockSavings = {
      pots: [],
      summary: { readyToUse: 0, pots: [] },
      soFar: null,
      isPending: false,
      isError: true,
    };
    await render(<SavingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalled();
    expect(screen.queryByText('$0')).toBeNull();
  });

  it('keeps the page when only a reload behind it failed', async () => {
    mockSavings.isError = true;
    await render(<SavingsScreen />);
    expect(screen.getByText('$850')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});

describe('Savings at large text sizes', () => {
  beforeEach(() => {
    setLanguage('es');
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
    Dimensions.set({ window, screen: window });
  });

  it('cuts no line and holds each to its role’s ceiling', async () => {
    await render(<SavingsScreen />);
    for (const [line, cap] of [
      ['Listo para usar', TEXT_CAP.control],
      ['Octubre hasta ahora', TEXT_CAP.row],
      ['Pasa a ahorros el 1 nov', TEXT_CAP.row],
    ] as const) {
      const text = screen.getByText(line);
      expect([line, text.props.maxFontSizeMultiplier]).toEqual([line, cap]);
      expect(text.props.numberOfLines).toBeUndefined();
    }
  });
});
