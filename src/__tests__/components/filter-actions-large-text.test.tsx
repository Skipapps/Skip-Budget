import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import { BillFilterSheet, EMPTY_BILL_FILTERS } from '@/components/bills/bill-filter-sheet';
import {
  EMPTY_RECEIPT_FILTERS,
  ReceiptFilterSheet,
} from '@/components/receipts/receipt-filter-sheet';
import {
  EMPTY_SUBSCRIPTION_FILTERS,
  SubscriptionFilterSheet,
} from '@/components/subscriptions/subscription-filter-sheet';
import { EMPTY_FILTERS, FilterSheet } from '@/components/transactions/filter-sheet';
import { FilterActions } from '@/components/ui/filter-actions';
import { t, type MessageKey } from '@/i18n';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Reset and Apply at the foot of the four filter pages, at every text size and in every language:
 * a third and two thirds side by side while both labels fit on one line, otherwise stacked with
 * Apply first. Spanish and French run longer, so the same page can stack in one language and not in
 * another. Neither label is ever cut, and Apply is always there.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/shadows', () => ({ shadows: { floating: {} } }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

type Screen = Awaited<ReturnType<typeof render>>;

const LANGUAGES: Language[] = ['en', 'es', 'fr'];

/**
 * Each label on one line in Montserrat Medium at 17pt and the default text size, summed from the
 * font's advance widths. A larger text size multiplies it, up to the row ceiling.
 */
const AT_DEFAULT: Record<string, number> = {
  Reset: 48.72,
  Borrar: 54.74,
  Effacer: 60.64,
  'Borrar todo': 99.53,
  'Tout effacer': 103.55,
  Apply: 49.88,
  Aplicar: 60.37,
  Appliquer: 85.59,
};

/**
 * A 375pt phone: the page's 20pt margins leave 335pt; beside each other, past the 12pt gap, Reset
 * takes a third less its 1pt border and Apply two thirds less its 20pt padding. Stacked, each has
 * the whole width less its padding.
 */
const ROOM = {
  container: 335,
  beside: { reset: 105.67, apply: 175.33 },
  stacked: { reset: 293, apply: 295 },
};

const PAGES: { page: string; reset: MessageKey; apply: MessageKey }[] = [
  { page: 'Bills', reset: 'bills.filter.reset', apply: 'bills.filter.apply' },
  {
    page: 'Subscriptions',
    reset: 'subscriptions.filter.reset',
    apply: 'subscriptions.filter.apply',
  },
  { page: 'Receipts', reset: 'receipts.filter.reset', apply: 'receipts.filter.apply' },
  { page: 'Activity', reset: 'transactions.filter.reset', apply: 'transactions.filter.apply' },
];

function phone(fontScale: number) {
  const window = { width: 375, height: 812, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

/** One layout pass: each label's room in the layout on screen and its width on one line. */
async function layOut(screen: Screen, labels: { reset: string; apply: string }, fontScale: number) {
  const grow = Math.min(fontScale, TEXT_CAP.row);
  const room = stacked(screen) ? ROOM.stacked : ROOM.beside;
  await layout(screen, 'fit-slot-reset', room.reset);
  await layout(screen, 'fit-copy-reset', AT_DEFAULT[labels.reset] * grow);
  await layout(screen, 'fit-slot-apply', room.apply);
  await layout(screen, 'fit-copy-apply', AT_DEFAULT[labels.apply] * grow);
  await layout(screen, 'filter-actions', ROOM.container);
}

const stacked = (screen: Screen) =>
  !String(screen.getByTestId('filter-actions').props.className).includes('flex-row');

/** The two buttons, top to bottom (or left to right), by their labels. */
function order(screen: Screen, labels: { reset: string; apply: string }): string[] {
  const box = screen.getByTestId('filter-actions');
  const at = (label: string) => {
    let node: typeof box | null = screen.getByLabelText(label);
    while (node && node.parent !== box) node = node.parent;
    expect(node).not.toBeNull();
    return box.children.indexOf(node as never);
  };
  return [labels.reset, labels.apply].sort((a, b) => at(a) - at(b));
}

const labelsIn = (language: Language, page: (typeof PAGES)[number]) => {
  setLanguage(language);
  return { reset: t(page.reset), apply: t(page.apply) };
};

const actions = (
  labels: { reset: string; apply: string },
  onReset = jest.fn(),
  onApply = jest.fn(),
) => (
  <FilterActions
    resetLabel={labels.reset}
    applyLabel={labels.apply}
    onReset={onReset}
    onApply={onApply}
  />
);

beforeEach(() => {
  resetLocaleForTests();
  phone(1);
});
afterAll(() => resetLocaleForTests());

describe('which layout each page gets, in each language', () => {
  // At the largest sizes Activity's "Borrar todo" and "Tout effacer" need 139pt and 145pt, and a
  // third of the row holds 105pt; "Reset" needs 68pt. Every other page's labels fit everywhere.
  const CASES: [string, Language, number, 'beside' | 'stacked'][] = [];
  for (const { page } of PAGES) {
    for (const language of LANGUAGES) {
      CASES.push([page, language, 1, 'beside']);
      const longReset = page === 'Activity' && language !== 'en';
      CASES.push([page, language, 1.4, longReset ? 'stacked' : 'beside']);
      // Past the ceiling the labels stop growing, so the choice is the same as at 1.4x.
      CASES.push([page, language, 3.1, longReset ? 'stacked' : 'beside']);
    }
  }

  it.each(CASES)('%s in %s at %fx: %s', async (page, language, fontScale, expected) => {
    phone(fontScale);
    const labels = labelsIn(
      language,
      PAGES.find((each) => each.page === page)!,
    );
    const screen = await render(actions(labels));
    await layOut(screen, labels, fontScale);

    expect(stacked(screen) ? 'stacked' : 'beside').toBe(expected);
    expect(order(screen, labels)).toEqual(
      expected === 'stacked' ? [labels.apply, labels.reset] : [labels.reset, labels.apply],
    );
  });
});

describe.each(LANGUAGES)('Activity’s filter actions in %s at the largest text size', (language) => {
  const page = PAGES[3];

  it('draws both labels whole, on the row ceiling, with no line limit', async () => {
    phone(1.4);
    const labels = labelsIn(language, page);
    const screen = await render(actions(labels));
    await layOut(screen, labels, 1.4);

    for (const label of [labels.reset, labels.apply]) {
      const text = screen.getByText(label);
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.adjustsFontSizeToFit).toBeUndefined();
      expect(text.props.ellipsizeMode).toBeUndefined();
      expect(text.props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);
      expect(StyleSheet.flatten(text.props.style).fontSize).toBe(17);
    }
    // Measured on one line, so a two-word label is judged by all of it, not its widest word.
    const copy = screen.getByTestId('fit-copy-reset', { includeHiddenElements: true });
    expect(copy.props.children).toBe(labels.reset);
  });

  it('keeps both buttons, each answering its own press', async () => {
    phone(1.4);
    const onReset = jest.fn();
    const onApply = jest.fn();
    const labels = labelsIn(language, page);
    const screen = await render(actions(labels, onReset, onApply));
    await layOut(screen, labels, 1.4);

    expect(screen.getByRole('button', { name: labels.apply })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: labels.reset }));
    await fireEvent.press(screen.getByRole('button', { name: labels.apply }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});

describe('a stacked pair', () => {
  it('stays stacked once its buttons have the whole width, rather than going back and forth', async () => {
    phone(1.4);
    const labels = labelsIn('fr', PAGES[3]);
    const screen = await render(actions(labels));
    await layOut(screen, labels, 1.4);
    expect(stacked(screen)).toBe(true);

    // Judged from the full-width slots it would fit side by side; it holds.
    await layOut(screen, labels, 1.4);
    expect(stacked(screen)).toBe(true);
  });

  it('goes back beside each other when the text size comes down', async () => {
    phone(1.4);
    const labels = labelsIn('es', PAGES[3]);
    const screen = await render(actions(labels));
    await layOut(screen, labels, 1.4);
    expect(stacked(screen)).toBe(true);

    await act(async () => phone(1));
    await layOut(screen, labels, 1);
    expect(stacked(screen)).toBe(false);
  });
});

describe.each(LANGUAGES)('the four filter pages in %s', (language) => {
  const sheets: { page: string; sheet: (onApply: jest.Mock) => ReactElement }[] = [
    {
      page: 'Bills',
      sheet: (onApply) => (
        <BillFilterSheet
          filters={EMPTY_BILL_FILTERS}
          sourceOptions={[]}
          onCancel={() => {}}
          onApply={onApply}
        />
      ),
    },
    {
      page: 'Subscriptions',
      sheet: (onApply) => (
        <SubscriptionFilterSheet
          filters={EMPTY_SUBSCRIPTION_FILTERS}
          sourceOptions={[]}
          onCancel={() => {}}
          onApply={onApply}
        />
      ),
    },
    {
      page: 'Receipts',
      sheet: (onApply) => (
        <ReceiptFilterSheet
          filters={EMPTY_RECEIPT_FILTERS}
          sourceOptions={[]}
          onCancel={() => {}}
          onApply={onApply}
        />
      ),
    },
    {
      page: 'Activity',
      sheet: (onApply) => (
        <FilterSheet
          filters={EMPTY_FILTERS}
          sourceOptions={[]}
          onCancel={() => {}}
          onApply={onApply}
        />
      ),
    },
  ];

  it.each(sheets)(
    '$page: Reset and Apply in the language, Apply always applying',
    async ({ page, sheet }) => {
      phone(1.4);
      const labels = labelsIn(
        language,
        PAGES.find((each) => each.page === page)!,
      );
      const onApply = jest.fn();
      const screen = await render(sheet(onApply));
      await layOut(screen, labels, 1.4);

      expect(stacked(screen)).toBe(page === 'Activity' && language !== 'en');
      expect(screen.getByRole('button', { name: labels.reset })).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: labels.apply }));
      expect(onApply).toHaveBeenCalledTimes(1);
    },
  );
});
