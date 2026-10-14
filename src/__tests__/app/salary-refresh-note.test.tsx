import { act, fireEvent, render } from '@testing-library/react-native';

import SalaryScreen from '@/app/salary';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * A reload of the pays that fails. Pinned: with the last answer still held the editor stays, with
 * its figures, and says so in one line right under the total card; with nothing read it is the
 * failure line alone, never an empty editor whose Save would delete every pay; the two never show
 * together.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accentInk: '#905479' }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useDialog: () => jest.fn(async () => null) }));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-08', todayDate: new Date('2026-10-08T00:00:00') }),
}));
jest.mock('@/api/pay', () => ({
  recordDuePay: jest.fn(async () => 0),
  usePastPay: () => ({ choose: jest.fn(), apply: jest.fn(), saving: false }),
  useDeletePay: () => ({ countPast: jest.fn(async () => 0), remove: jest.fn(), removing: false }),
}));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
const mockUpdate = jest.fn(async (_input: { id: string; values: Record<string, unknown> }) => ({}));
jest.mock('@/api/mutations', () => {
  const idle = () => ({ mutateAsync: jest.fn(async () => ({})), isPending: false });
  return {
    useCreateSalarySource: idle,
    useUpdateSalarySource: () => ({ mutateAsync: mockUpdate, isPending: false }),
    useDeleteUnseenPay: idle,
    useSetSalaryAccounts: idle,
  };
});

const acme = {
  id: 's1',
  name: 'Acme',
  amount: 1880,
  frequency: 'semimonthly',
  last_payday: '2026-09-30',
  pay_type: 'fixed',
  hourly_rate: null,
  hours_per_week: null,
  overtime_hours_per_week: 0,
  overtime_multiplier: 1.5,
  deduction_percent: 0,
  account_ids: ['acc1'],
};

const mockRefetch = jest.fn();
let mockDetails: { data: unknown; isError: boolean } = { data: undefined, isError: false };
jest.mock('@/api/queries', () => ({
  useSalaryDetails: () => ({ ...mockDetails, isPending: false, refetch: mockRefetch }),
  useBankAccounts: () => ({
    data: [{ id: 'acc1', bank_name: 'Chase', nickname: 'Chase Checking', last4: '7730' }],
  }),
}));

const NOTE: Record<Language, string> = {
  en: 'Couldn’t refresh · showing your last figures',
  es: 'No se pudo actualizar · mostrando tus últimas cifras',
  fr: 'Impossible d’actualiser · voici tes derniers chiffres',
};

const held = () => ({ data: { rows: [acme], hourlyAvailable: true }, isError: true });

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockDetails = { data: { rows: [acme], hourlyAvailable: true }, isError: false };
});

afterAll(() => resetLocaleForTests());

it('says nothing of a reload while the read is fine', async () => {
  const screen = await render(<SalaryScreen />);
  expect(screen.getByText('Acme')).toBeTruthy();
  expect(screen.queryByText(NOTE.en)).toBeNull();
});

it('keeps the pays and the total after a failed reload, with the note right under the total card', async () => {
  mockDetails = held();
  const screen = await render(<SalaryScreen />);

  expect(screen.queryByText('Try again')).toBeNull();
  expect(screen.getByText('Acme')).toBeTruthy();
  expect(screen.getByText('$3,760.00')).toBeTruthy();
  const total = screen.getByText('Total per month');
  const note = screen.getByText(NOTE.en);
  let card: typeof total = total;
  while (card.parent && !card.parent.children.includes(note)) card = card.parent;
  const siblings = card.parent!.children;
  expect(siblings.indexOf(note)).toBe(siblings.indexOf(card) + 1);

  // The editor still saves what it shows.
  await fireEvent.press(screen.getByText('Save'));
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
});

it('shows the failure line alone when nothing was read, and no editor', async () => {
  mockDetails = { data: undefined, isError: true };
  const screen = await render(<SalaryScreen />);

  expect(screen.queryByText(NOTE.en)).toBeNull();
  expect(screen.queryByText('Save')).toBeNull();
  await fireEvent.press(screen.getByText('Try again'));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

it.each(['es', 'fr'] as const)('says the note in %s', async (language) => {
  await act(async () => setLanguage(language));
  mockDetails = held();
  const screen = await render(<SalaryScreen />);
  expect(screen.getByText(NOTE[language])).toBeTruthy();
});
