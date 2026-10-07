import { fireEvent, render } from '@testing-library/react-native';

import AddCardScreen from '@/app/add-card';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The credit card form in Spanish and French, from the balance step to the save dialog. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/payment-card', () => ({ PaymentCard: () => null }));
// Reanimated 4 wants a native worklets module; the swatches are the only animated part of the form.
jest.mock('@/components/ui/color-picker', () => ({ ColorPicker: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async (_options: Record<string, unknown>) => false);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
}));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: () => null,
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useUpdateCard: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useCreateCard: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteCard: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => jest.fn(),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

let mockCard: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useCard: () => ({ ...mockCard, refetch: jest.fn() }),
  useCards: () => ({ data: [] }),
  // Two charges before today, which a new balance would absorb.
  useSourceLedger: () => ({
    ledger: { entries: [{ date: '2026-01-02' }, { date: '2026-01-03' }] },
  }),
}));

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;
const PARAM = /\{\w+\}/;

type Screen = Awaited<ReturnType<typeof render>>;
type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function everyLine(screen: Screen): string[] {
  const lines: string[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') {
      lines.push(node);
      return;
    }
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') lines.push(value);
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Json | Json[] | null;
  (Array.isArray(tree) ? tree : tree ? [tree] : []).forEach(walk);
  return lines;
}

function expectNoLeftovers(screen: Screen) {
  const lines = everyLine(screen);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((line) => RAW_KEY.test(line) || PARAM.test(line))).toEqual([]);
}

const existingCard = {
  id: 'card-1',
  holder: 'Everyday Visa',
  network: 'VISA',
  last4: '4242',
  color: '#000000',
  balance: 250,
  balance_as_of: '2026-01-01',
  bill_due_day: null,
};

beforeEach(() => {
  resetLocaleForTests();
  mockParams = {};
  mockCard = { data: null, isError: false, isFetched: true };
  mockConfirm.mockClear();
  mockUpdate.mockClear();
});
afterAll(() => resetLocaleForTests());

describe('Add a credit card in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('walks the three steps in Spanish', async () => {
    const screen = await render(<AddCardScreen />);

    expect(screen.getByText('Agregar una tarjeta de crédito')).toBeTruthy();
    expect(screen.getByText('¿Cuál es el saldo de la tarjeta de crédito ahora?')).toBeTruthy();
    expectNoLeftovers(screen);

    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.getByText('Elige la red de la tarjeta')).toBeTruthy();
    expect(screen.getAllByText('Nombre de la tarjeta de crédito').length).toBeGreaterThan(0);
    expect(screen.getByText('Color de la tarjeta')).toBeTruthy();
    expect(screen.getAllByText('Últimos 4 dígitos').length).toBeGreaterThan(0);
    expectNoLeftovers(screen);

    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Everyday Visa');
    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.getByText('¿Cuál es la fecha de vencimiento?')).toBeTruthy();
    expect(
      screen.getByText('Elige arriba la fecha de vencimiento y Skip te lo podrá recordar antes.'),
    ).toBeTruthy();
    expect(screen.getByText('Guardar tarjeta de crédito')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('says the failure line and its two ways out when the card cannot be read', async () => {
    mockParams = { id: 'card-1' };
    mockCard = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddCardScreen />);

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByText('Intentar de nuevo')).toBeTruthy();
    expect(screen.getByText('Regresar')).toBeTruthy();
  });
});

describe('Edit a credit card in French', () => {
  beforeEach(() => {
    setLanguage('fr');
    mockParams = { id: 'card-1' };
    mockCard = { data: existingCard, isError: false, isFetched: true };
  });

  it('asks before a new balance absorbs past charges, counting them in French', async () => {
    const screen = await render(<AddCardScreen />);

    expect(screen.getByText('Modifier la carte de crédit')).toBeTruthy();
    expect(screen.getByLabelText('Supprimer cette carte de crédit')).toBeTruthy();
    expect(screen.getByText('Supprimer la carte')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    const dialog = mockConfirm.mock.calls[0][0];
    expect(dialog.title).toBe('Ce solde devient le point de départ');
    expect(dialog.message).toContain('les 2 transactions déjà sur cette carte de crédit');
    expect(dialog.message).not.toMatch(PARAM);
    expect(dialog.confirmLabel).toBe('Mettre à jour le solde');
    expect(dialog.cancelLabel).toBe('Le laisser tel quel');
    // Refused, so nothing is written.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('asks before deleting, in French', async () => {
    const screen = await render(<AddCardScreen />);

    await fireEvent.press(screen.getByLabelText('Supprimer cette carte de crédit'));

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Supprimer cette carte de crédit ?',
        confirmLabel: 'Supprimer',
      }),
    );
  });
});

describe('Edit a credit card in English', () => {
  it('keeps the English balance warning word for word', async () => {
    mockParams = { id: 'card-1' };
    mockCard = { data: existingCard, isError: false, isFetched: true };
    const screen = await render(<AddCardScreen />);

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.press(screen.getByText('Save changes'));

    expect(mockConfirm.mock.calls[0][0].message).toBe(
      "A new balance is taken as today's figure, so the 2 transactions already on this credit " +
        'card are counted as part of it and will stop showing here. Nothing is deleted — they ' +
        'stay in your transactions, and on the bills and receipts they came from.',
    );
  });
});
