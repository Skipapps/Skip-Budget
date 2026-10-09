import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import AddCardScreen from '@/app/add-card';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The add-card flow as designed: details with a live face and an inline limit, the day of the
 * month with the reminder, and on a new card the page that says it was added. Dates are worked
 * from 9 October 2026.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#111111',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FBF9F7',
    control: '#905479',
    accentInk: '#905479',
    danger: '#B0453A',
  }),
  useTheme: () => ({ scheme: 'light' }),
  useMoneyColor: () => () => '#111111',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Jest turns an .svg into a number, not a component; the icons have a suite of their own.
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async () => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));
const mockToast = jest.fn();
jest.mock('@/providers/toast-context', () => ({ useToast: () => mockToast }));

let mockParams: Record<string, string> = {};
const mockScreenOptions: Record<string, unknown>[] = [];
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: {
    Screen: ({ options }: { options: Record<string, unknown> }) => {
      mockScreenOptions.push(options);
      return null;
    },
  },
  Redirect: () => null,
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
// Only creditLimitValue is real, and it never touches the client.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/mutations', () => ({
  creditLimitValue: jest.requireActual('@/api/mutations').creditLimitValue,
  useCreateCard: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateCard: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteCard: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockApplyReminder = jest.fn();
let mockSaved = { choice: 'off', remindAt: '09:00' };
jest.mock('@/api/reminders', () => ({
  ...jest.requireActual('@/api/reminders'),
  useApplyReminder: () => mockApplyReminder,
  useReminderChoice: () => mockSaved,
}));

let mockCard: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useCard: () => ({ ...mockCard, refetch: jest.fn() }),
  useCards: () => ({ data: [], isPending: false }),
  useSourceLedger: () => ({ ledger: null }),
}));

type Screen = Awaited<ReturnType<typeof render>>;

const saved = {
  id: 'card-1',
  holder: 'Amex Komal',
  network: 'Amex',
  last4: '6334',
  color: '#426EA8',
  balance: 4000,
  balance_as_of: '2026-10-01',
  bill_due_day: 22,
  credit_limit: 10000,
};

/** The balance keys, then on to the details. */
async function toDetails(keys = ''): Promise<Screen> {
  const screen = await render(<AddCardScreen />);
  for (const key of keys) await fireEvent.press(screen.getByLabelText(key));
  await fireEvent.press(screen.getByText('Continue'));
  return screen;
}

async function toDue(screen: Screen, name = 'Amex Komal') {
  await fireEvent.changeText(screen.getAllByDisplayValue('')[0], name);
  await fireEvent.press(screen.getByText('Continue'));
}

const created = () => mockCreate.mock.calls[0][0];

beforeEach(() => {
  resetLocaleForTests();
  jest.useFakeTimers({ now: new Date(2026, 9, 9, 9, 0, 0) });
  mockParams = {};
  mockCard = { data: null, isError: false, isFetched: true };
  mockSaved = { choice: 'off', remindAt: '09:00' };
  mockScreenOptions.length = 0;
  mockCreate.mockReset().mockResolvedValue({ id: 'card-new' });
  [mockUpdate, mockApplyReminder, mockToast, mockConfirm].forEach((fn) => fn.mockClear());
  [router.back, router.replace].forEach((fn) => jest.mocked(fn).mockClear());
});
afterEach(() => jest.useRealTimers());
afterAll(() => resetLocaleForTests());

describe('Add card — the details', () => {
  it('draws the live face, then name, network, last four, limit and colour', async () => {
    const screen = await toDetails('500');

    expect(screen.getByText('Owed')).toBeTruthy();
    expect(screen.getByText('-$500')).toBeTruthy();
    expect(screen.getByText('Limit not set')).toBeTruthy();
    expect(screen.getByTestId('card-limit-bar')).toBeTruthy();
    for (const label of ['Card name', 'Network', 'Last 4 digits', 'Card limit', 'Card colour']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    for (const network of ['VISA', 'Mastercard', 'AMEX', 'Discover']) {
      expect(screen.getByRole('radio', { name: network })).toBeTruthy();
    }
    expect(screen.getByPlaceholderText('Optional')).toBeTruthy();
    expect(
      screen.getAllByRole('radio', { name: /Blue|Violet|Plum|Teal|Slate|Sand|Rose|Black/ }),
    ).toHaveLength(8);
  });

  it('offers a colour from before the palette first, chosen, and lets it be chosen again', async () => {
    mockParams = { id: 'card-1' };
    mockCard = { data: { ...saved, color: '#FA8F6F' }, isError: false, isFetched: true };
    const screen = await toDetails();
    const swatch = (name: string) => screen.getByRole('radio', { name });

    expect(swatch('Current colour').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(swatch('Blue'));
    expect(swatch('Current colour').props.accessibilityState.selected).toBe(false);
    await fireEvent.press(swatch('Current colour'));
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Save changes'));

    expect(mockUpdate.mock.calls[0][0].values.color).toBe('#FA8F6F');
  });

  it('adds no extra swatch for a colour from the palette', async () => {
    mockParams = { id: 'card-1' };
    mockCard = { data: saved, isError: false, isFetched: true };
    const screen = await toDetails();
    expect(screen.queryByRole('radio', { name: 'Current colour' })).toBeNull();
  });

  it('shows a typed limit on the face at once, grouped in the field', async () => {
    const screen = await toDetails('500');
    await fireEvent.changeText(screen.getByPlaceholderText('Optional'), '10000');

    expect(screen.getByDisplayValue('10,000')).toBeTruthy();
    expect(screen.getByText('$500 of $10,000 limit')).toBeTruthy();
    const fill = StyleSheet.flatten(screen.getByTestId('card-limit-fill').props.style);
    expect(parseFloat(String(fill.width))).toBeCloseTo(5, 9);
  });

  it('saves the limit to the cent, the network as stored and the name trimmed', async () => {
    const screen = await toDetails();
    await fireEvent.changeText(screen.getByPlaceholderText('Optional'), '2500.50');
    await fireEvent.press(screen.getByRole('radio', { name: 'AMEX' }));
    await toDue(screen, '  Amex Komal ');
    await fireEvent.press(screen.getByText('Add card'));

    expect(created()).toEqual(
      expect.objectContaining({ holder: 'Amex Komal', network: 'Amex', credit_limit: 2500.5 }),
    );
  });

  it('saves no limit when the field is left empty', async () => {
    const screen = await toDetails();
    await toDue(screen);
    await fireEvent.press(screen.getByText('Add card'));

    expect(created().credit_limit).toBeNull();
  });

  it('clears a saved limit when the field is emptied on an edit', async () => {
    mockParams = { id: 'card-1' };
    mockCard = { data: saved, isError: false, isFetched: true };
    const screen = await toDetails();
    expect(screen.getByDisplayValue('10,000')).toBeTruthy();
    expect(screen.getByText('$4,000 of $10,000 limit')).toBeTruthy();

    await fireEvent.changeText(screen.getByDisplayValue('10,000'), '');
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Save changes'));

    expect(mockUpdate.mock.calls[0][0].values.credit_limit).toBeNull();
  });

  it('saves the same limit typed in French', async () => {
    setLanguage('fr');
    const screen = await render(<AddCardScreen />);
    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.changeText(screen.getByPlaceholderText('Facultatif'), '2500,50');
    expect(screen.getByDisplayValue('2 500,50')).toBeTruthy();
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Carte');
    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.press(screen.getByText('Ajouter la carte'));

    expect(created().credit_limit).toBe(2500.5);
  });
});

describe('Add card — the day it is due', () => {
  it('asks for a day before it can remind, and saves none when none is picked', async () => {
    const screen = await toDetails();
    await toDue(screen);

    expect(screen.getByText('When is the bill due?')).toBeTruthy();
    expect(screen.getByText('Pick the day it’s due each month.')).toBeTruthy();
    expect(screen.getByText('Pick a day above and Skip can remind you before it.')).toBeTruthy();
    expect(screen.getByLabelText('Remind me').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true, checked: false }),
    );

    await fireEvent.press(screen.getByText('Add card'));
    expect(created().bill_due_day).toBeNull();
    expect(mockApplyReminder).toHaveBeenCalledWith('card', 'card-new', null, '09:00');
  });

  it('reads the day back with the next due date, and the reminder with its own', async () => {
    const screen = await toDetails();
    await toDue(screen);
    await fireEvent.press(screen.getByLabelText('Day 22'));

    expect(screen.getByText('Due every month on the 22nd')).toBeTruthy();
    expect(screen.getByText('Next due: 22 Oct 2026')).toBeTruthy();
    // A new card's reminder starts on, three days before.
    expect(screen.getByText('19 Oct, 3 days before it’s due')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('1 week'));
    expect(screen.getByText('15 Oct, 1 week before it’s due')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('On the day'));
    expect(screen.getByText('22 Oct, the day it’s due')).toBeTruthy();
  });

  it('starts a new card’s reminder on, and saves none once it is switched off', async () => {
    const screen = await toDetails();
    await toDue(screen);
    await fireEvent.press(screen.getByLabelText('Day 22'));
    expect(screen.getByLabelText('Remind me').props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );

    await fireEvent.press(screen.getByLabelText('Remind me'));
    expect(screen.getByText('Get a nudge before it’s due')).toBeTruthy();
    expect(screen.queryByLabelText('3 days')).toBeNull();
    await fireEvent.press(screen.getByText('Add card'));

    expect(mockApplyReminder).toHaveBeenCalledWith('card', 'card-new', null, '09:00');
    expect(screen.getByText('No reminder set. You can add one anytime.')).toBeTruthy();
    expect(screen.getByText('Off')).toBeTruthy();
  });

  it('says what happens in a short month for the 29th to the 31st', async () => {
    const screen = await toDetails();
    await toDue(screen);
    await fireEvent.press(screen.getByLabelText('Day 31'));

    expect(
      screen.getByText('Due every month on the 31st, or the last day in shorter months'),
    ).toBeTruthy();
    expect(screen.getByText('Next due: 31 Oct 2026')).toBeTruthy();
  });

  it('lets the chosen day go again when it is pressed twice', async () => {
    const screen = await toDetails();
    await toDue(screen);
    await fireEvent.press(screen.getByLabelText('Day 22'));
    await fireEvent.press(screen.getByLabelText('Day 22'));

    expect(screen.queryByText('Due every month on the 22nd')).toBeNull();
    expect(screen.getByLabelText('Day 22').props.accessibilityState.selected).toBe(false);
  });

  it('saves the day and the reminder, keeping the reminder’s time of day', async () => {
    const screen = await toDetails();
    await toDue(screen);
    await fireEvent.press(screen.getByLabelText('Day 22'));
    await fireEvent.press(screen.getByLabelText('1 week'));
    await fireEvent.press(screen.getByText('Add card'));

    expect(created().bill_due_day).toBe(22);
    expect(mockApplyReminder).toHaveBeenCalledWith('card', 'card-new', 7, '09:00');
  });
});

describe('Add card — the page that says it was added', () => {
  async function addWithReminder(): Promise<Screen> {
    const screen = await toDetails('4000');
    await fireEvent.changeText(screen.getByPlaceholderText('Optional'), '10000');
    await toDue(screen);
    await fireEvent.press(screen.getByLabelText('Day 22'));
    await fireEvent.press(screen.getByText('Add card'));
    return screen;
  }

  it('shows the card as saved, when it is due and when Skip will remind', async () => {
    const screen = await addWithReminder();

    expect(screen.getByRole('header', { name: 'Card added' })).toBeTruthy();
    expect(screen.getByText('We’ll remind you 3 days before it’s due.')).toBeTruthy();
    expect(screen.getByText('-$4,000')).toBeTruthy();
    expect(screen.getByText('$4,000 of $10,000 limit')).toBeTruthy();
    expect(screen.getByText('22nd of each month')).toBeTruthy();
    expect(screen.getByText('22 Oct 2026')).toBeTruthy();
    expect(screen.getByText('19 Oct · 3 days before')).toBeTruthy();
  });

  it('is the confirmation itself: no toast goes over it', async () => {
    await addWithReminder();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('says so when there is no reminder, and leaves the next due date out without a day', async () => {
    const screen = await toDetails();
    await toDue(screen);
    await fireEvent.press(screen.getByText('Add card'));

    expect(screen.getByText('No reminder set. You can add one anytime.')).toBeTruthy();
    expect(screen.getByText('Not set')).toBeTruthy();
    expect(screen.getByText('Off')).toBeTruthy();
    expect(screen.queryByText('Next due')).toBeNull();
  });

  it('can be left by swiping, while the steps before it could not', async () => {
    await addWithReminder();
    const [stepOptions, pageOptions] = [mockScreenOptions.at(-2), mockScreenOptions.at(-1)];
    expect(stepOptions).toEqual({ gestureEnabled: false });
    expect(pageOptions).toEqual({ gestureEnabled: true });
  });

  it('leaves for the Cards tab from Done and from close', async () => {
    const screen = await addWithReminder();
    await fireEvent.press(screen.getByText('Done'));
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(router.back).toHaveBeenCalledTimes(2);
  });

  it('starts a fresh flow in the flow’s place for another card', async () => {
    const screen = await addWithReminder();
    await fireEvent.press(screen.getByText('Add another card'));
    expect(router.replace).toHaveBeenCalledWith('/add-card');
  });

  it('reads in French', async () => {
    setLanguage('fr');
    const screen = await render(<AddCardScreen />);
    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Carte');
    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.press(screen.getByLabelText('Jour 1'));
    expect(screen.getByText('À payer chaque mois le 1er')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ajouter la carte'));

    expect(screen.getByText('Carte ajoutée')).toBeTruthy();
    expect(screen.getByText('On te le rappellera 3 jours avant l’échéance.')).toBeTruthy();
    expect(screen.getByText('Le 1er de chaque mois')).toBeTruthy();
    expect(screen.getByText('Ajouter une autre carte')).toBeTruthy();
  });
});

describe('Add card — editing and the walk-in', () => {
  it('saves an edit in place: no added page, a toast and back, the reminder’s time kept', async () => {
    mockParams = { id: 'card-1' };
    mockCard = { data: saved, isError: false, isFetched: true };
    mockSaved = { choice: '1', remindAt: '18:30' };
    const screen = await toDetails();
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Due every month on the 22nd')).toBeTruthy();
    expect(screen.getByText('21 Oct, 1 day before it’s due')).toBeTruthy();
    expect(screen.queryByText('You can change these anytime in card settings.')).toBeNull();
    await fireEvent.press(screen.getByText('Save changes'));

    expect(mockApplyReminder).toHaveBeenCalledWith('card', 'card-1', 1, '18:30');
    expect(mockToast).toHaveBeenCalledWith('toast.card.updated');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Card added')).toBeNull();
  });

  it('opens an edit on the saved reminder, off when none is saved', async () => {
    mockParams = { id: 'card-1' };
    mockCard = { data: saved, isError: false, isFetched: true };
    const screen = await toDetails();
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Get a nudge before it’s due')).toBeTruthy();
    await fireEvent.press(screen.getByText('Save changes'));
    expect(mockApplyReminder).toHaveBeenCalledWith('card', 'card-1', null, '09:00');
  });

  it('goes on to the bank-account offer from the walk-in, as before', async () => {
    mockParams = { from: 'setup' };
    const screen = await toDetails();
    await toDue(screen);
    await fireEvent.press(screen.getByText('Add card'));

    expect(mockToast).toHaveBeenCalledWith('toast.card.added');
    expect(router.replace).toHaveBeenCalledWith('/account-offer');
    expect(screen.queryByText('Card added')).toBeNull();
  });
});
