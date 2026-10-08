import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';

import SalaryScreen from '@/app/salary';
import { t } from '@/i18n';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The Salary page at the largest text size, in every language. Save is the page's one action, so
 * it is pinned in the footer below the scroll with the line that says why it could not save; the
 * page's own buttons, "Add another source" and "Add a one-off", end the scroll.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => jest.fn(async () => true) }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
jest.mock('@/api/mutations', () => ({
  useCreateSalarySource: () => ({
    mutateAsync: jest.fn(async () => ({ id: 'new' })),
    isPending: false,
  }),
  useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSalarySource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(async () => ({})), isPending: false }),
}));

const salaryRow = {
  id: 's1',
  name: 'Acme',
  amount: 1880,
  frequency: 'semimonthly',
  last_payday: '2026-09-30' as string | null,
  pay_type: 'fixed',
  hourly_rate: null,
  hours_per_week: null,
  overtime_hours_per_week: 0,
  overtime_multiplier: 1.5,
  deduction_percent: 0,
  account_ids: ['acc1'],
};

let mockRows = [salaryRow];
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({
    data: { rows: mockRows, hourlyAvailable: true },
    isPending: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useBankAccounts: () => ({
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' }],
  }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
type Host = NonNullable<Screen['root']>;

const LOCALES: [Language, CurrencyCode][] = [
  ['en', 'USD'],
  ['es', 'MXN'],
  ['fr', 'CAD'],
];

function insideScroll(node: Host | null): boolean {
  for (let at = node; at; at = at.parent) {
    if (String(at.type) === 'RCTScrollView') return true;
  }
  return false;
}

/** The page's own column inside the scroll: what it draws above the footer, in order. */
function scrollColumn(screen: Screen): Host {
  const add = screen.getByRole('button', { name: t('salary.addOneOff') });
  for (let at = add.parent; at; at = at.parent) {
    if (String(at.props.className).includes('max-w-[520px] flex-1')) return at;
  }
  throw new Error('no column');
}

async function showIn(language: Language, currency: CurrencyCode) {
  const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
  Dimensions.set({ window, screen: window });
  setLanguage(language);
  setCurrency(currency);
  return render(<SalaryScreen />);
}

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
  mockRows = [salaryRow];
});
afterAll(() => resetLocaleForTests());

describe.each(LOCALES)('in %s (%s) at the largest text size', (language, currency) => {
  it('pins Save in the footer and ends the scroll with the page’s own buttons', async () => {
    const screen = await showIn(language, currency);
    const save = screen.getByRole('button', { name: t('common.save') });
    expect(insideScroll(save)).toBe(false);

    const addSource = screen.getByRole('button', { name: t('salary.addSource') });
    const addOneOff = screen.getByRole('button', { name: t('salary.addOneOff') });
    expect(insideScroll(addSource)).toBe(true);
    expect(insideScroll(addOneOff)).toBe(true);
    // Nothing drawn after it in the scroll: the pads and pickers are closed.
    const drawn = scrollColumn(screen).children.filter((child) => typeof child !== 'string');
    expect(drawn.at(-1)).toBe(addOneOff);

    const label = screen.getByText(t('common.save'));
    expect(label.props.numberOfLines).toBeUndefined();
    expect(label.props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);

    await fireEvent.press(save);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('says why it cannot save right above Save, in the footer, whole', async () => {
    mockRows = [{ ...salaryRow, last_payday: null }];
    const screen = await showIn(language, currency);

    await fireEvent.press(screen.getByRole('button', { name: t('common.save') }));

    const reason = screen.getByText(t('salary.needLastPayday'));
    expect(insideScroll(reason)).toBe(false);
    expect(reason.props.numberOfLines).toBeUndefined();
    expect(reason.props.maxFontSizeMultiplier).toBe(TEXT_CAP.reading);
    // Above Save in the same footer.
    const footer = reason.parent as Host;
    const save = screen.getByRole('button', { name: t('common.save') });
    expect(footer.children.indexOf(reason)).toBeLessThan(footer.children.indexOf(save));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
