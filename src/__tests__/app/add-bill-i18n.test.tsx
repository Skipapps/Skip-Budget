import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import AddBillScreen from '@/app/add-bill';
import { billCategoryLabel } from '@/components/bills/bill-row';
import { BILL_CATEGORIES } from '@/data/bills-mock';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Adding and editing a bill in Spanish and French, with the real category and icon pickers. The
 * words follow the language; what is saved (category id, schedule, amount) does not. The one
 * exception is the name: a new bill is pre-named with its category as read, and from then on that
 * text is the person's own.
 */

const mockProps: Record<string, any> = {};

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
  tap: jest.fn(),
}));

// Stubs that still show the words handed to them.
jest.mock('@/components/ui/button', () => {
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/flow/amount-step', () => ({
  AmountStep: (props: any) => {
    mockProps.amount = props;
    return null;
  },
}));
jest.mock('@/components/brands/brand-field', () => {
  const { Text } = require('react-native');
  return {
    BrandField: (props: any) => {
      mockProps.brand = props;
      return <Text accessibilityHint={props.placeholder}>{props.label}</Text>;
    },
  };
});
jest.mock('@/components/ui/source-tiles', () => ({ SourceTiles: () => null }));
jest.mock('@/components/flow/inline-calendar', () => ({
  InlineCalendar: (props: any) => {
    mockProps.calendar = props;
    return null;
  },
}));
jest.mock('@/components/ui/date-picker', () => ({ DatePicker: () => null }));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/components/ui/calculator-pad', () => ({ CalculatorPad: () => null }));
jest.mock('@/components/calculators/schedule-card', () => ({ ScheduleCard: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#222222',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
    onControl: '#FFFFFF',
  }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async (_: object) => true);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => async () => undefined,
}));

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    lastChargedOn: null,
    ready: true,
    saving: false,
    choose: async () => 'upcoming',
    apply: jest.fn(),
    retry: jest.fn(),
  }),
}));
jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => async () => {},
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00' }),
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateBill: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateBill: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteBill: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

let mockBill: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useBill: () => ({ ...mockBill, refetch: jest.fn() }),
  useLoanForBill: () => ({ data: null }),
  usePaymentSources: () => ({ sources: [] }),
}));

const POWER = {
  id: 'bill-1',
  name: 'CFE',
  amount: 1234.56,
  category_id: 'energy',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-10-15',
  starts_on: '2026-10-15',
  ends_on: null,
  card_id: null,
  bank_account_id: null,
  note: null,
  brand_id: null,
  brands: null,
};

const NBSP = '\u00a0';

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function shownText(node: Node): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  const spoken = ['accessibilityLabel', 'accessibilityHint', 'placeholder'].flatMap((name) =>
    typeof props[name] === 'string' ? [props[name] as string] : [],
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Node))];
}

function expectNoRawText(tree: Node) {
  const lines = shownText(tree);
  expect(lines.filter((line) => /^[a-z]+\.[a-zA-Z]+\./.test(line))).toEqual([]);
  expect(lines.filter((line) => /\{\w+\}/.test(line))).toEqual([]);
}

const set = (key: string, value: unknown) =>
  act(() => {
    const props = mockProps[key];
    (props.onChange ?? props.onChangeText)(value);
  });

type Rendered = Awaited<ReturnType<typeof render>>;

/** The words each step is pressed by, and what Housing is called, per language. */
const WORDS: Record<Language, Record<string, string>> = {
  en: {
    housingTile: 'Housing. Rent, mortgage, HOA fees',
    continue: 'Continue',
    quarterly: 'Every 3 months',
    save: 'Save bill',
    housing: 'Housing',
  },
  es: {
    housingTile: 'Vivienda. Renta, hipoteca, cuotas de mantenimiento',
    continue: 'Continuar',
    quarterly: 'Cada 3 meses',
    save: 'Guardar factura',
    housing: 'Vivienda',
  },
  fr: {
    housingTile: 'Logement. Loyer, hypothèque, frais de copropriété',
    continue: 'Continuer',
    quarterly: 'Tous les 3 mois',
    save: 'Enregistrer la facture',
    housing: 'Logement',
  },
};

const LANGUAGES = ['en', 'es', 'fr'] as const;

/**
 * A new Housing bill, every step pressed by the words of `language`. `onDetails` runs on the
 * details step, where the Name field is.
 */
async function addHousing(
  language: Language,
  words: Record<string, string>,
  onDetails?: (screen: Rendered) => Promise<void>,
) {
  setLanguage(language);
  const screen = await render(<AddBillScreen />);

  await fireEvent.press(screen.getByLabelText(words.housingTile));
  await set('amount', '1234.56');
  await fireEvent.press(screen.getByText(words.continue));
  if (onDetails) await onDetails(screen);
  await fireEvent.press(screen.getByText(words.continue));
  await set('calendar', new Date(2026, 9, 15));
  await fireEvent.press(screen.getByText(words.quarterly));
  await fireEvent.press(screen.getByText(words.save));

  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  const saved = mockCreate.mock.calls[0][0];
  await screen.unmount();
  return saved;
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockProps)) delete mockProps[key];
  resetLocaleForTests();
  mockParams = {};
  mockBill = { data: null, isError: false, isFetched: false };
  mockCreate.mockResolvedValue({ id: 'bill-new' });
});
afterAll(() => resetLocaleForTests());

describe('Add a bill in Spanish', () => {
  it('reads every step in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Agregar una factura')).toBeTruthy();
    expect(screen.getByText('¿De qué es esta factura?')).toBeTruthy();
    expect(screen.getByText('Vivienda')).toBeTruthy();
    expect(screen.getByText('Renta, hipoteca, cuotas de mantenimiento')).toBeTruthy();
    expect(screen.getByText('Otra factura')).toBeTruthy();
    expect(
      screen.getByLabelText('Transporte. Auto, transporte público, estacionamiento, casetas'),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(
      screen.getByLabelText('Vivienda. Renta, hipoteca, cuotas de mantenimiento'),
    );
    expect(screen.getByText('¿De cuánto es la factura?')).toBeTruthy();
    expect(screen.getByText('Calculadora')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await set('amount', '80');
    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('Empresa')).toBeTruthy();
    expect(screen.getByHintText('Inmobiliaria o administradora')).toBeTruthy();
    expect(screen.getByText('Nombre')).toBeTruthy();
    expect(screen.getByText('Categoría')).toBeTruthy();
    expect(screen.getByLabelText('Luz y gas')).toBeTruthy();
    expect(screen.getByText('Se paga con')).toBeTruthy();
    expect(screen.getByText('Nota')).toBeTruthy();
    expect(screen.getByPlaceholderText('Algo que quieras recordar')).toBeTruthy();
    // Pre-named in the language on screen; the category id stays 'housing'.
    expect(screen.getByDisplayValue('Vivienda')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('¿Cuándo vence?')).toBeTruthy();
    expect(screen.getByText('Se repite')).toBeTruthy();
    for (const chip of ['Semanal', 'Mensual', 'Cada 3 meses', 'Anual', 'Periodo específico']) {
      expect(screen.getByLabelText(chip)).toBeTruthy();
    }
    expect(screen.getByText('Guardar factura')).toBeTruthy();

    await fireEvent.press(screen.getByText('Periodo específico'));
    expect(screen.getByText('¿Cuándo empieza?')).toBeTruthy();
    expect(screen.getByText('Hasta')).toBeTruthy();
    expect(screen.getByText('Continúa — sin fecha de fin')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says the one failure line when the bill to edit cannot be read', async () => {
    setLanguage('es');
    mockParams = { id: 'bill-1' };
    mockBill = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByText('Intentar de nuevo')).toBeTruthy();
    expect(screen.getByText('Regresar')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});

describe('Add a bill in French', () => {
  it('offers the icons by name for a bill of its own', async () => {
    setLanguage('fr');
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Ajouter une facture')).toBeTruthy();
    expect(screen.getByText('Cette facture, c’est pour quoi ?')).toBeTruthy();
    expect(screen.getByText('Électricité et gaz')).toBeTruthy();

    await fireEvent.press(
      screen.getByLabelText('Autre facture. Donne-lui un nom et choisis une icône'),
    );
    expect(screen.getByText('De combien est la facture ?')).toBeTruthy();
    await set('amount', '15.99');
    await fireEvent.press(screen.getByText('Continuer'));

    expect(screen.getByText('Entreprise')).toBeTruthy();
    expect(screen.getByHintText('Cherche une entreprise')).toBeTruthy();
    expect(screen.getByText('Icône')).toBeTruthy();
    expect(screen.getByLabelText('Éducation')).toBeTruthy();
    expect(screen.getByLabelText('Télé')).toBeTruthy();
    expect(screen.getByText('Payée avec')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('edits and deletes in French', async () => {
    setLanguage('fr');
    mockParams = { id: 'bill-1' };
    mockBill = { data: POWER, isError: false, isFetched: true };
    const screen = await render(<AddBillScreen />);

    expect(screen.getByText('Modifier la facture')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.press(screen.getByText('Continuer'));
    expect(screen.getByText('Quelle est la date d’échéance ?')).toBeTruthy();
    expect(screen.getByText('Enregistrer les modifications')).toBeTruthy();
    expect(screen.getByText('Supprimer la facture')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByLabelText('Supprimer cette facture'));
    expect(mockConfirm).toHaveBeenCalledWith({
      title: `Supprimer cette facture${NBSP}?`,
      message: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
  });
});

describe('What a bill saves', () => {
  it('is the same in every language but for the name it was pre-filled with', async () => {
    const english = await addHousing('en', WORDS.en);
    mockCreate.mockClear();
    const spanish = await addHousing('es', WORDS.es);
    mockCreate.mockClear();
    const french = await addHousing('fr', WORDS.fr);

    expect(english).toMatchObject({
      name: 'Housing',
      amount: 1234.56,
      category_id: 'housing',
      recurrence: 'quarterly',
      next_due_on: '2026-10-15',
    });
    expect(spanish).toEqual({ ...english, name: 'Vivienda' });
    expect(french).toEqual({ ...english, name: 'Logement' });
  });
});

const GREYSTAR = {
  brandId: 'b-greystar',
  name: 'Greystar',
  domain: 'greystar.com',
  categoryId: 'housing',
};

describe('A new bill’s name', () => {
  it.each(LANGUAGES)('is the category as read in %s, and is saved so', async (language) => {
    const words = WORDS[language];
    const saved = await addHousing(language, words, async (screen) => {
      expect(screen.getByDisplayValue(words.housing)).toBeTruthy();
    });

    expect(saved).toMatchObject({ name: words.housing, category_id: 'housing' });
  });

  it.each(LANGUAGES)(
    'keeps a name typed by hand in %s, a company picked after it too',
    async (language) => {
      const words = WORDS[language];
      const saved = await addHousing(language, words, async (screen) => {
        await fireEvent.changeText(screen.getByDisplayValue(words.housing), 'Casa de mamá');
        await set('brand', GREYSTAR);
        expect(screen.getByDisplayValue('Casa de mamá')).toBeTruthy();
      });

      expect(saved).toMatchObject({
        name: 'Casa de mamá',
        category_id: 'housing',
        brand_id: 'b-greystar',
      });
    },
  );

  it.each(LANGUAGES)('gives way to a company in %s, since nobody typed it', async (language) => {
    const words = WORDS[language];
    const saved = await addHousing(language, words, async (screen) => {
      await set('brand', GREYSTAR);
      expect(screen.getByDisplayValue('Greystar')).toBeTruthy();
    });

    expect(saved).toMatchObject({ name: 'Greystar', category_id: 'housing' });
  });

  it.each(LANGUAGES)(
    'is the category as read in %s on a bill handed over by voice',
    async (language) => {
      const words = WORDS[language];
      setLanguage(language);
      mockParams = { from: 'voice', prefillCategory: 'housing', prefillAmount: '80' };
      const screen = await render(<AddBillScreen />);

      // The voice page already named the category, so the form opens on the amount.
      await fireEvent.press(screen.getByText(words.continue));
      expect(screen.getByDisplayValue(words.housing)).toBeTruthy();
    },
  );

  it('is word for word the English label in English', () => {
    setLanguage('en');
    for (const category of BILL_CATEGORIES) {
      expect(billCategoryLabel(category.id)).toBe(category.label);
    }
  });

  it('is never renamed on a bill saved before, whatever the language now', async () => {
    setLanguage('fr');
    mockParams = { id: 'bill-2' };
    mockBill = {
      data: { ...POWER, id: 'bill-2', name: 'Vivienda', category_id: 'housing' },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddBillScreen />);

    await fireEvent.press(screen.getByText('Continuer'));
    expect(screen.getByDisplayValue('Vivienda')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.press(screen.getByText('Enregistrer les modifications'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      id: 'bill-2',
      values: { name: 'Vivienda', category_id: 'housing' },
    });
  });
});
