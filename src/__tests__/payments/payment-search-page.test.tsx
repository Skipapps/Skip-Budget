import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import PaymentSearchScreen, { PaymentSearchPage, type SearchData } from '@/app/payment-search';
import { amountText, rangeText, sourceText } from '@/components/payments/filter-rows';
import { nameMatch } from '@/components/payments/payment-row';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { PaymentEntry } from '@/lib/payment-entries';
import { pickPayment } from '@/lib/payment-pick';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Search payments, on 12 Oct 2026, with design 5.png's Netflix: one $15.99 a month from Sep 2021,
 * so "netflix" finds 62 over 2021 – 2026; 2026 is $159.90 · 10 and 2025 $191.88 · 12, and 2024 –
 * 2021 fold into "40 more". On free, every figure stays whole while rows stop at 15 Jul.
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
// The filter pages' link helpers sit beside their pages, which reach the database; nothing here does.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000001', muted: '#000002', accentInk: '#000003' }),
}));
jest.mock('@/theme/artwork', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    useArtwork: () =>
      new Proxy(
        {},
        { get: (_target, name) => () => createElement(View, { testID: `art-${String(name)}` }) },
      ),
  };
});
jest.mock('@/components/ui/skeleton', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { SkeletonList: () => createElement(View, { testID: 'skeleton-list' }) };
});
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-12', todayDate: new Date('2026-10-12T00:00:00') }),
}));

const mockRecent = { recent: [] as string[], remember: jest.fn(), forget: jest.fn() };
jest.mock('@/api/payment-searches', () => ({ useRecentSearches: () => mockRecent }));
const mockPayments = jest.fn();
jest.mock('@/api/payment-ledger', () => ({
  usePayments: (today: string) => mockPayments(today),
}));

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

const CEILINGS = new Set<number>(Object.values(TEXT_CAP));
const LABELS: Record<string, string> = { komal: 'Komal ••7010' };
const labelOf = (id: string) => LABELS[id] ?? null;

function payment(
  over: Partial<PaymentEntry> & Pick<PaymentEntry, 'id' | 'date' | 'name' | 'amount'>,
): PaymentEntry {
  return {
    planName: over.name,
    kind: 'subscription',
    status: 'paid',
    sourceId: '',
    planId: over.id.split('@')[0],
    categoryId: 'entertainment',
    iconId: null,
    domain: null,
    logoHidden: false,
    ...over,
  };
}

/** Netflix on the 9th, Sep 2021 to Oct 2026; one AEP bill; one Spotify. Newest first. */
const NETFLIX: PaymentEntry[] = [];
for (let index = 2026 * 12 + 9; index >= 2021 * 12 + 8; index -= 1) {
  const year = Math.floor(index / 12);
  const month = String((index % 12) + 1).padStart(2, '0');
  NETFLIX.push(
    payment({
      id: `netflix@${year}-${month}-09`,
      date: `${year}-${month}-09`,
      name: 'Netflix',
      amount: 15.99,
    }),
  );
}
const AEP = payment({
  id: 'aep@2026-09-22',
  date: '2026-09-22',
  name: 'AEP',
  amount: 150,
  kind: 'bill',
  sourceId: 'komal',
  categoryId: 'energy',
});
const SPOTIFY = payment({
  id: 'spotify@2026-10-09',
  date: '2026-10-09',
  name: 'Spotify',
  amount: 10,
});
const PAYMENTS = [SPOTIFY, ...NETFLIX.slice(0, 1), AEP, ...NETFLIX.slice(1)].sort((a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? -1 : 1,
);

function dataOf(over: Partial<SearchData> = {}): SearchData {
  return {
    payments: PAYMENTS,
    listFloor: '2020-01-01',
    free: false,
    labelOf,
    isLoading: false,
    isError: false,
    refreshFailed: false,
    refetch: jest.fn(),
    ...over,
  };
}

const draw = (data: SearchData = dataOf()) =>
  render(<PaymentSearchPage today="2026-10-12" data={data} />);

const type = (text: string) => fireEvent.changeText(screen.getByTestId('search-input'), text);

const pushedOwner = () =>
  ((router.push as jest.Mock).mock.calls.at(-1)?.[0] as { params: { owner: string } }).params.owner;

beforeEach(() => {
  resetLocaleForTests();
  mockParams = {};
  mockRecent.recent = [];
  jest.clearAllMocks();
});

describe('opening the search', () => {
  it('focuses the field, and Cancel goes back', async () => {
    await draw();
    expect(screen.getByTestId('search-input').props.autoFocus).toBe(true);
    expect(screen.getByTestId('search-input').props.accessibilityLabel).toBe('Search payments');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('starts on the tab it was opened with, All otherwise', async () => {
    await draw();
    expect(screen.getByRole('tab', { name: 'All', selected: true })).toBeTruthy();
    mockParams = { kind: 'bill' };
    await draw();
    expect(screen.getByRole('tab', { name: 'Bills', selected: true })).toBeTruthy();
  });

  it('reads every payment through usePayments, on today', async () => {
    mockPayments.mockReturnValue(dataOf());
    await render(<PaymentSearchScreen />);
    expect(mockPayments).toHaveBeenCalledWith('2026-10-12');
    expect(screen.getByTestId('search-filters')).toBeTruthy();
  });
});

describe('before a search', () => {
  it('lists the recent searches: a tap searches again, × forgets one', async () => {
    mockRecent.recent = ['Car loan', 'AEP', 'Rent'];
    await draw();
    expect(
      within(screen.getByTestId('recent-searches')).getByRole('header', { name: 'Recent' }),
    ).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Remove Rent' }));
    expect(mockRecent.forget).toHaveBeenCalledWith('Rent');

    await fireEvent.press(screen.getByRole('button', { name: 'AEP' }));
    expect(screen.getByTestId('search-input').props.value).toBe('AEP');
    expect(screen.getByText('1 result · 2026')).toBeTruthy();
  });

  it('has no Recent card with nothing kept', async () => {
    await draw();
    expect(screen.queryByTestId('recent-searches')).toBeNull();
  });

  it('shows each filter as it stands, and Pro’s seven years in the footer', async () => {
    await draw();
    expect(screen.getByRole('button', { name: 'Date range, Any time' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Amount, Any amount' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Paid from, All accounts' })).toBeTruthy();
    expect(screen.getByText('Search across up to 7 years of payments.')).toBeTruthy();
  });

  it('says what free searches, and what Pro would', async () => {
    await draw(dataOf({ free: true, listFloor: '2026-07-15' }));
    expect(
      screen.getByText('Search your last 90 days of payments. Pro searches up to 7 years.'),
    ).toBeTruthy();
  });

  it('opens each filter’s page with this page’s id and takes back what is picked', async () => {
    await draw();
    await fireEvent.press(screen.getByRole('button', { name: 'Amount, Any amount' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/payment-filter',
      params: { type: 'amount', owner: pushedOwner() },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Paid from, All accounts' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/payment-filter',
      params: { type: 'from', owner: pushedOwner(), source: 'all' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Date range, Any time' }));
    const owner = pushedOwner();
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/payment-filter',
      params: { type: 'date', owner, range: 'any' },
    });

    await act(() =>
      pickPayment({ owner: 'another-page', type: 'filters', filter: { range: 'thisYear' } }),
    );
    expect(screen.getByTestId('search-start')).toBeTruthy();

    // A filter is a search: the year's payments are listed, all 12 of them.
    await act(() => pickPayment({ owner, type: 'filters', filter: { range: 'thisYear' } }));
    expect(screen.getByText('12 results · 2026')).toBeTruthy();
  });
});

describe('the results', () => {
  it('count every match and fold the years past the two newest', async () => {
    await draw();
    await type('netflix');
    expect(screen.getByText('62 results · 2021 – 2026')).toBeTruthy();
    expect(screen.getByRole('header', { name: '2026, 10 payments, $159.90' })).toBeTruthy();
    expect(within(screen.getByTestId('results-2026')).getByText('$159.90 · 10')).toBeTruthy();
    expect(within(screen.getByTestId('results-2025')).getByText('$191.88 · 12')).toBeTruthy();
    expect(screen.queryByTestId('results-2024')).toBeNull();
    expect(screen.getByText('2024 – 2021 · 40 more')).toBeTruthy();
    expect(screen.getByText('No matches? Try a shorter word or another year.')).toBeTruthy();
    // No filter is set, so there is none to clear.
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();

    await fireEvent.press(screen.getByTestId('results-folded'));
    expect(screen.getByTestId('results-2021')).toBeTruthy();
    expect(within(screen.getByTestId('results-2021')).getByText('$63.96 · 4')).toBeTruthy();
    expect(screen.queryByTestId('results-folded')).toBeNull();
  });

  it('writes each row with its year and marks the words searched in plum', async () => {
    await draw();
    await type('netf');
    const row = screen.getByTestId('payment-netflix@2026-10-09');
    expect(within(row).getByText('9 Oct 2026 · Card not set')).toBeTruthy();
    const marked = within(row).getByTestId('marked-name');
    const plum = within(marked).getByText('Netf');
    expect(plum).not.toBe(marked);
    expect(String(plum.props.className)).toContain('text-tint-ink');
    expect(marked.props.children).toEqual(['', expect.anything(), 'lix']);
  });

  it('keeps the search and opens the payment’s plan', async () => {
    await draw();
    await type('netflix');
    await fireEvent.press(screen.getByTestId('payment-netflix@2026-10-09'));
    expect(mockRecent.remember).toHaveBeenCalledWith('netflix');
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/subscription/[id]',
      params: { id: 'netflix' },
    });
  });

  it('keeps the search when the keyboard’s Search is pressed, and never per letter', async () => {
    await draw();
    await type('ne');
    await type('net');
    expect(mockRecent.remember).not.toHaveBeenCalled();
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    expect(mockRecent.remember).toHaveBeenCalledWith('net');
  });

  it('on free: whole counts and totals, rows from 15 Jul, and the notice for the rest', async () => {
    await draw(dataOf({ free: true, listFloor: '2026-07-15' }));
    await type('netflix');
    expect(screen.getByText('62 results · 2021 – 2026')).toBeTruthy();
    expect(within(screen.getByTestId('results-2026')).getByText('$159.90 · 10')).toBeTruthy();
    expect(
      within(screen.getByTestId('results-2026-card'))
        .getAllByRole('button')
        .map((node) => node.props.testID),
    ).toEqual([
      'payment-netflix@2026-10-09',
      'payment-netflix@2026-09-09',
      'payment-netflix@2026-08-09',
    ]);
    expect(screen.queryByTestId('results-2025')).toBeNull();
    expect(screen.queryByTestId('results-folded')).toBeNull();
    expect(screen.getByText('Older history is saved')).toBeTruthy();
  });

  it('follows the tab: Netflix is no bill', async () => {
    await draw();
    await type('netflix');
    await fireEvent.press(screen.getByRole('tab', { name: 'Bills' }));
    expect(screen.getByText('No payments match')).toBeTruthy();
  });

  it('says plainly when nothing matches, and offers to clear a filter that narrowed it', async () => {
    await draw();
    await type('zzz');
    expect(screen.getByTestId('art-noResults')).toBeTruthy();
    expect(screen.getByText('No payments match')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Paid from, All accounts' }));
    await act(() =>
      pickPayment({ owner: pushedOwner(), type: 'filters', filter: { source: 'nobody' } }),
    );
    expect(screen.getByText('No payments match')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByTestId('search-start')).toBeTruthy();
  });

  it('lets a set filter be cleared from the results, and the dates changed', async () => {
    await draw();
    await fireEvent.press(screen.getByRole('button', { name: 'Date range, Any time' }));
    await act(() =>
      pickPayment({ owner: pushedOwner(), type: 'filters', filter: { range: 'lastYear' } }),
    );
    expect(screen.getByText('12 results · 2025')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Date range: Last year' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/payment-filter',
      params: { type: 'date', owner: pushedOwner(), range: 'lastYear' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByTestId('search-start')).toBeTruthy();
  });

  it('offers every filter above the results, each with its value once set, opening its page', async () => {
    await draw();
    await type('netflix');
    const links = () =>
      within(screen.getByTestId('results-filters'))
        .getAllByRole('button')
        .map((node) => node.props.accessibilityLabel);
    expect(links()).toEqual(['Date range', 'Amount', 'Paid from']);

    await fireEvent.press(screen.getByRole('button', { name: 'Amount' }));
    const owner = pushedOwner();
    await act(() =>
      pickPayment({ owner, type: 'filters', filter: { minCents: 1000, maxCents: null } }),
    );
    await act(() => pickPayment({ owner, type: 'filters', filter: { source: '' } }));
    expect(links()).toEqual([
      'Date range',
      'Amount: $10.00 or more',
      'Paid from: Card not set',
      'Clear filters',
    ]);

    await fireEvent.press(screen.getByRole('button', { name: 'Amount: $10.00 or more' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/payment-filter',
      params: { type: 'amount', owner, min: '1000' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Paid from: Card not set' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/payment-filter',
      params: { type: 'from', owner, source: 'none' },
    });
  });

  it('keeps the filters to hand when they leave nothing to show', async () => {
    await draw();
    await type('netflix');
    await fireEvent.press(screen.getByRole('button', { name: 'Paid from' }));
    await act(() =>
      pickPayment({ owner: pushedOwner(), type: 'filters', filter: { source: 'komal' } }),
    );
    expect(screen.getByText('No payments match')).toBeTruthy();
    expect(
      within(screen.getByTestId('results-filters')).getByRole('button', {
        name: 'Paid from: Komal ••7010',
      }),
    ).toBeTruthy();
  });

  it('draws the filter links as small plum words on the page, not on a card', async () => {
    await draw();
    await type('netflix');
    for (const id of ['results-date-range', 'results-amount', 'results-paid-from']) {
      const link = screen.getByTestId(id);
      expect(link.props.hitSlop).toEqual(expect.objectContaining({ top: 12, bottom: 12 }));
      expect(String(within(link).getByText(/./).props.className)).toContain('text-accent-ink');
      for (let at = link.parent; at; at = at.parent) {
        expect(String(at.props.className ?? '')).not.toContain('bg-card');
      }
    }
  });

  it('waits for the payments, and never shows a search it could not run', async () => {
    await draw(dataOf({ isLoading: true }));
    expect(screen.getByTestId('search-filters')).toBeTruthy();
    await type('netflix');
    expect(screen.getByTestId('skeleton-list')).toBeTruthy();

    const failed = dataOf({ isError: true });
    await draw(failed);
    await type('netflix');
    expect(screen.queryByTestId('search-results')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(failed.refetch).toHaveBeenCalledTimes(1);
  });
});

const NOTE: Record<Language, string> = {
  en: 'Couldn’t refresh · showing your last figures',
  es: 'No se pudo actualizar · mostrando tus últimas cifras',
  fr: 'Impossible d’actualiser · voici tes derniers chiffres',
};

type Host = ReturnType<typeof screen.getByText>;

/** The refresh note as drawn, and what comes straight after it. */
function noteAbove(language: Language = 'en'): Host {
  const note = screen.getByText(NOTE[language]);
  expect(note.props.accessibilityRole).toBe('text');
  expect(note.props.maxFontSizeMultiplier).toBe(TEXT_CAP.reading);
  expect(note.props.numberOfLines).toBeUndefined();
  expect(String(note.props.className)).toContain('text-center');
  const kids = (note.parent?.children ?? []) as (Host | string)[];
  return kids[kids.indexOf(note) + 1] as Host;
}

describe('a refresh that failed', () => {
  it('says so under the field, above Recent and the filters', async () => {
    mockRecent.recent = ['AEP'];
    await draw(dataOf({ refreshFailed: true }));
    expect(noteAbove().props.testID).toBe('search-start');
    expect(screen.getByTestId('recent-searches')).toBeTruthy();
  });

  it('says so above the results, which still show', async () => {
    await draw(dataOf({ refreshFailed: true }));
    await type('netflix');
    expect(noteAbove().props.testID).toBe('search-results');
    expect(screen.getByText('62 results · 2021 – 2026')).toBeTruthy();
  });

  it('has no note after a good refresh, and never one beside the error page', async () => {
    await draw(dataOf());
    expect(screen.queryByText(NOTE.en)).toBeNull();
    await draw(dataOf({ isError: true, refreshFailed: true }));
    await type('netflix');
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(screen.queryByText(NOTE.en)).toBeNull();
  });

  it.each<Language>(['es', 'fr'])('says it in %s', async (language) => {
    setLanguage(language);
    await draw(dataOf({ refreshFailed: true }));
    expect(noteAbove(language).props.testID).toBe('search-start');
  });
});

describe('the words', () => {
  it('finds where the words sit in a name, any case, no accents', () => {
    expect(nameMatch('Netflix', 'net')).toEqual([0, 3]);
    expect(nameMatch('Car loan', ' LOAN ')).toEqual([4, 8]);
    expect(nameMatch('Électricité', 'electricite')).toEqual([0, 11]);
    expect(nameMatch('Café ☕ Luna', 'luna')).toEqual([7, 11]);
    expect(nameMatch('Netflix', 'netflx')).toBeNull();
    expect(nameMatch('Netflix', '  ')).toBeNull();
  });

  it('writes each filter as it stands', () => {
    expect(rangeText({ from: '2026-01-01', to: '2026-03-31' })).toBe('1 Jan 2026 – 31 Mar 2026');
    expect(rangeText('last3Months')).toBe('Last 3 months');
    expect(amountText({ minCents: 1000, maxCents: null })).toBe('$10.00 or more');
    expect(amountText({ minCents: null, maxCents: 5000 })).toBe('Up to $50.00');
    expect(amountText({ minCents: 1000, maxCents: 5000 })).toBe('$10.00 – $50.00');
    expect(sourceText('', labelOf)).toBe('Card not set');
    expect(sourceText('komal', labelOf)).toBe('Komal ••7010');
    expect(sourceText('gone', labelOf)).toBe('Card not set');
  });
});

describe('in every language, at large text', () => {
  it.each<Language>(['en', 'es', 'fr'])(
    '%s: each line at its role’s ceiling, never cut, never a raw key',
    async (language) => {
      setLanguage(language);
      mockRecent.recent = ['Car loan'];
      await draw();
      const check = () => {
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
          expect(line).not.toMatch(/(payments|ui|pro)\.[a-z]/);
          expect(line).not.toMatch(/\{\w+\}/);
        }
      };
      check();
      await type('netf');
      check();
    },
  );

  it('searches in Spanish and French', async () => {
    setLanguage('es');
    await draw();
    for (const line of [
      'Cancelar',
      'Filtros',
      'Rango de fechas',
      'Todas las fechas',
      'Todas las cuentas',
    ]) {
      expect(screen.getAllByText(line).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('La búsqueda abarca hasta 7 años de pagos.')).toBeTruthy();
    await type('netflix');
    expect(screen.getByText('62 resultados · 2021 – 2026')).toBeTruthy();
    expect(screen.getByText('2024 – 2021 · 40 más')).toBeTruthy();

    setLanguage('fr');
    await draw();
    expect(screen.getByText('Période')).toBeTruthy();
    await type('netflix');
    expect(screen.getByText('62 résultats · 2021 – 2026')).toBeTruthy();
    expect(
      screen.getByText('Rien trouvé ? Essaie un mot plus court ou une autre année.'),
    ).toBeTruthy();
  });
});
