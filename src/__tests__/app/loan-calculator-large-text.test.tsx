import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import LoanCalculatorScreen from '@/app/loan-calculator';
import { t } from '@/i18n';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { formatCurrency } from '@/lib/format';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The loan calculator at the largest text size, in every language. Save is the page's one action,
 * so it is pinned in the footer below the scroll, never at the end of it. The three sliders' labels
 * wrap beside their values; once a word of one label cannot sit beside its value, every row puts
 * its value under its label, and stays so while the value changes under the finger.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const mockConfirm = jest.fn(async (_options: Record<string, string>) => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

type Screen = Awaited<ReturnType<typeof render>>;
type Host = NonNullable<Screen['root']>;

const LOCALES: [Language, CurrencyCode][] = [
  ['en', 'USD'],
  ['es', 'MXN'],
  ['fr', 'CAD'],
];

const SLIDERS = ['amount', 'rate', 'term'] as const;
type Slider = (typeof SLIDERS)[number];

/**
 * At 1.4x, from the font's advance widths: each label's widest word (Montserrat Medium 13pt) and
 * the room left beside its value on a 375pt phone: 327pt less the 12pt gap and the value (SemiBold
 * 18pt at its 1.2x ceiling, in a pill with 16pt of padding a side when it opens a keypad). French
 * money is one unbreakable piece, "25 000 $", so its pill is the widest.
 */
const ROWS: Record<Language, Record<Slider, { word: number; room: number }>> = {
  en: {
    amount: { word: 73.93, room: 327 - 12 - (87.65 + 32) },
    rate: { word: 71.96, room: 327 - 12 - (64.13 + 32) },
    term: { word: 48.52, room: 327 - 12 - 51.26 },
  },
  es: {
    amount: { word: 89.34, room: 327 - 12 - (87.65 + 32) },
    rate: { word: 63.86, room: 327 - 12 - (64.13 + 32) },
    term: { word: 50.14, room: 327 - 12 - 71.54 },
  },
  fr: {
    amount: { word: 79.68, room: 327 - 12 - (94.26 + 32) },
    rate: { word: 78.82, room: 327 - 12 - (70.07 + 32) },
    term: { word: 57.09, room: 327 - 12 - 57.61 },
  },
};

function phone(fontScale: number) {
  const window = { width: 375, height: 812, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

async function layOutSliders(screen: Screen, rows: Record<Slider, { word: number; room: number }>) {
  for (const id of SLIDERS) {
    await layout(screen, `fit-slot-${id}-label`, rows[id].room);
    await layout(screen, `fit-copy-${id}-label`, rows[id].word);
  }
  await layout(screen, 'loan-sliders', 327);
}

/** Whether a slider's value sits beside its label (the row) or under it (the column). */
function placeOf(screen: Screen, id: Slider): 'beside' | 'under' {
  const row = screen.getByTestId(`fit-slot-${id}-label`).parent as Host;
  return String(row.props.className).includes('flex-row') ? 'beside' : 'under';
}

/** The label comes first in its row either way, so it is read before its value. */
function labelFirst(screen: Screen, id: Slider) {
  const row = screen.getByTestId(`fit-slot-${id}-label`).parent as Host;
  return row.children[0] === screen.getByTestId(`fit-slot-${id}-label`);
}

function insideScroll(node: Host | null): boolean {
  for (let at = node; at; at = at.parent) {
    if (String(at.type) === 'RCTScrollView') return true;
  }
  return false;
}

async function showIn(language: Language, currency: CurrencyCode) {
  phone(1.4);
  setLanguage(language);
  setCurrency(currency);
  return render(<LoanCalculatorScreen />);
}

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
});
afterAll(() => resetLocaleForTests());

describe.each(LOCALES)('in %s (%s) at the largest text size', (language, currency) => {
  it('pins Save in the footer, below the scroll, and it saves', async () => {
    const screen = await showIn(language, currency);
    const save = screen.getByRole('button', { name: t('common.save') });

    expect(insideScroll(save)).toBe(false);
    // The schedule card is now the last thing in the scroll, with room under it.
    const schedule = screen.getByText(t('loan.scheduleCard.title'));
    expect(insideScroll(schedule)).toBe(true);
    expect(screen.getAllByRole('button', { name: t('common.save') })).toHaveLength(1);

    await fireEvent.press(save);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/save-loan' }));
  });

  it('keeps every value beside its label: each label’s widest word fits', async () => {
    const screen = await showIn(language, currency);
    await layOutSliders(screen, ROWS[language]);

    for (const id of SLIDERS) {
      expect([id, placeOf(screen, id)]).toEqual([id, 'beside']);
      expect(labelFirst(screen, id)).toBe(true);
    }
  });

  it('puts every value under its label once one word cannot fit, and holds while it changes', async () => {
    const screen = await showIn(language, currency);
    // A value wide enough to leave the amount's label less than its widest word.
    const rows = { ...ROWS[language], amount: { ...ROWS[language].amount, room: 60 } };
    await layOutSliders(screen, rows);

    for (const id of SLIDERS) {
      expect([id, placeOf(screen, id)]).toEqual([id, 'under']);
      expect(labelFirst(screen, id)).toBe(true);
    }

    // A new amount from the keypad: the label now has the whole row, and the rows stay put.
    await fireEvent.press(screen.getByLabelText(new RegExp(`^${t('loan.amount')}, .+\\.`)));
    for (const key of [...'25000'].map(() => t('loan.keypad.deleteLast'))) {
      await fireEvent.press(screen.getByLabelText(key));
    }
    for (const key of ['9', '0', '0', '0', '0', '0']) {
      await fireEvent.press(screen.getByLabelText(key));
    }
    await fireEvent.press(screen.getByRole('button', { name: t('common.done') }));
    expect(screen.getByText(formatCurrency(900_000, { cents: false }))).toBeTruthy();
    await layOutSliders(screen, {
      amount: { word: ROWS[language].amount.word, room: 327 },
      rate: { word: ROWS[language].rate.word, room: 327 },
      term: { word: ROWS[language].term.word, room: 327 },
    });
    for (const id of SLIDERS) expect([id, placeOf(screen, id)]).toEqual([id, 'under']);
  });

  it('draws every label and value whole, labels on the row ceiling and values on the figure’s', async () => {
    const screen = await showIn(language, currency);
    for (const key of ['loan.amount', 'loan.interestRate', 'loan.termLabel'] as const) {
      const label = screen.getByText(t(key));
      expect(label.props.numberOfLines).toBeUndefined();
      expect(label.props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);

      const pill = screen.queryByLabelText(new RegExp(`^${t(key)}, `));
      if (!pill) continue;
      const value = (pill as Host).children.find((child) => typeof child !== 'string') as Host;
      expect(value.props.numberOfLines).toBeUndefined();
      expect(value.props.maxFontSizeMultiplier).toBe(TEXT_CAP.figure);
      // One unbreakable piece: French writes "25 000 $" and "7,50 %" with no-break spaces.
      expect(String(value.props.children)).not.toMatch(/[^\S\u00a0\u202f]/);
    }
  });
});
