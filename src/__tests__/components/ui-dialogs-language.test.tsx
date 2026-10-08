import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';

import { AppLockGate } from '@/components/app-lock-gate';
import { StepFlow } from '@/components/flow/step-flow';
import { BackButton } from '@/components/ui/back-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { t } from '@/i18n';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The dialog's default buttons, the add flows' chrome and the Face ID lock follow the language, and
 * the dialog's pair of buttons sits side by side or stacks by what each language's labels need.
 */

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  Stack: { Screen: () => null },
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/theme/shadows', () => ({ shadows: { floating: {} } }));

const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
}));

jest.mock('@/providers/preferences-provider', () => ({
  usePreferences: () => ({ appLock: true, ready: true }),
}));

const mockAuthenticate = jest.fn(async () => false);
jest.mock('@/lib/app-lock', () => ({ authenticate: () => mockAuthenticate() }));

// Two letters at least on each side, so a short abbreviation is not taken for a key.
const RAW_KEY = /^[a-z]{2,}\.[a-zA-Z]{2,}\./;
const PARAM = /\{\w+\}/;

type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function everyLine(tree: Json | Json[] | null): string[] {
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
  (Array.isArray(tree) ? tree : tree ? [tree] : []).forEach(walk);
  return lines;
}

function expectNoRawText(tree: Json | Json[] | null) {
  const lines = everyLine(tree);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((line) => RAW_KEY.test(line) || PARAM.test(line))).toEqual([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockAuthenticate.mockImplementation(async () => false);
});
afterAll(() => resetLocaleForTests());

describe('ConfirmDialog', () => {
  it('fills in its own Cancel and OK in Spanish', async () => {
    setLanguage('es');
    const choice = await render(
      <ConfirmDialog
        title="¿Eliminar esta factura?"
        actions={[{ id: 'confirm', label: 'Eliminar', destructive: true }]}
        onResolve={() => {}}
      />,
    );
    expect(choice.getByText('Cancelar')).toBeTruthy();
    expect(choice.getByLabelText('Cerrar')).toBeTruthy();
    expectNoRawText(choice.toJSON() as Json);
    await choice.unmount();

    const notice = await render(<ConfirmDialog title="Listo" onResolve={() => {}} />);
    expect(notice.getByText('Aceptar')).toBeTruthy();
  });

  it('keeps a label the caller gave, and null still means no way out', async () => {
    setLanguage('fr');
    const onResolve = jest.fn();
    const view = await render(
      <ConfirmDialog
        title="Tout supprimer ?"
        actions={[{ id: 'confirm', label: 'Supprimer' }]}
        cancelLabel={null}
        onResolve={onResolve}
      />,
    );
    expect(view.queryByText('Annuler')).toBeNull();

    await fireEvent.press(view.getByText('Supprimer'));
    expect(onResolve).toHaveBeenCalledWith('confirm');
  });

  // The dialog host is mounted at the root, outside the screens that remount on a language change.
  it('changes language while it is open', async () => {
    const view = await render(
      <ConfirmDialog
        title="Delete this bill?"
        actions={[{ id: 'confirm', label: 'Delete', destructive: true }]}
        onResolve={() => {}}
      />,
    );
    expect(view.getByText('Cancel')).toBeTruthy();

    await act(async () => setLanguage('fr'));

    expect(view.getByText('Annuler')).toBeTruthy();
    expect(view.getByLabelText('Fermer')).toBeTruthy();
  });
});

describe('ConfirmDialog buttons at every text size, in every language', () => {
  type Screen = Awaited<ReturnType<typeof render>>;

  /** Montserrat SemiBold at 15pt and the default text size, summed from the font's advance widths. */
  const AT_DEFAULT: Record<string, number> = {
    Delete: 51.08,
    Cancel: 52.53,
    Eliminar: 64.53,
    Cancelar: 67.94,
    Supprimer: 82.29,
    Annuler: 61.97,
  };

  /**
   * A 375pt phone: a 311pt card, 271pt between its margins, and each half past the 10pt gap 130.5pt,
   * less 20pt of padding a side, and Cancel's 1pt border too.
   */
  const ROOM = { row: 271, choice: 90.5, cancel: 88.5 };

  function phone(fontScale: number) {
    const window = { width: 375, height: 812, scale: 3, fontScale };
    Dimensions.set({ window, screen: window });
  }

  async function layout(screen: Screen, testID: string, width: number) {
    await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
    });
  }

  /** The buttons' box: the view that lays the pair out. */
  function buttonRow(screen: Screen) {
    for (let at = screen.getByTestId('fit-slot-choice-0').parent; at; at = at.parent) {
      if (String(at.props.className ?? '').includes('gap-2.5')) return at;
    }
    throw new Error('no button row');
  }

  async function deleteBill(language: Language, fontScale: number) {
    phone(fontScale);
    setLanguage(language);
    const onResolve = jest.fn();
    const screen = await render(
      <ConfirmDialog
        title={t('bills.add.deleteTitle')}
        message={t('bills.add.deleteMessage')}
        actions={[{ id: 'confirm', label: t('common.delete'), destructive: true }]}
        cancelLabel={t('common.cancel')}
        onResolve={onResolve}
      />,
    );
    const grow = Math.min(fontScale, TEXT_CAP.row);
    await layout(screen, 'fit-slot-cancel', ROOM.cancel);
    await layout(screen, 'fit-copy-cancel', AT_DEFAULT[t('common.cancel')] * grow);
    await layout(screen, 'fit-slot-choice-0', ROOM.choice);
    await layout(screen, 'fit-copy-choice-0', AT_DEFAULT[t('common.delete')] * grow);
    await fireEvent(buttonRow(screen), 'layout', { nativeEvent: { layout: { width: ROOM.row } } });
    return { screen, onResolve };
  }

  const before = { window: Dimensions.get('window'), screen: Dimensions.get('screen') };
  afterAll(() => Dimensions.set(before));

  // "Supprimer" outgrows its half from 1.2x and "Cancelar" from 1.3x; English fits at every size.
  it.each([
    ['en', 1, 'beside'],
    ['es', 1, 'beside'],
    ['fr', 1, 'beside'],
    ['en', 1.2, 'beside'],
    ['es', 1.2, 'beside'],
    ['fr', 1.2, 'stacked'],
    ['en', 1.4, 'beside'],
    ['es', 1.4, 'stacked'],
    ['fr', 1.4, 'stacked'],
    ['en', 3.1, 'beside'],
    ['es', 3.1, 'stacked'],
  ] as const)('%s at %fx: %s', async (language, fontScale, expected) => {
    const { screen } = await deleteBill(language, fontScale);
    const row = buttonRow(screen);
    expect(String(row.props.className).includes('flex-row') ? 'beside' : 'stacked').toBe(expected);

    // Side by side the way out is first; stacked it is last, away from the real choice.
    const at = (id: string) => {
      let node = screen.getByTestId(id);
      while (node.parent && node.parent !== row) node = node.parent;
      return row.children.indexOf(node);
    };
    const cancelFirst = at('fit-slot-cancel') < at('fit-slot-choice-0');
    expect(cancelFirst).toBe(expected === 'beside');
  });

  it.each(['en', 'es', 'fr'] as const)(
    'reads every word in %s, whole, and keeps the way out',
    async (language) => {
      const { screen, onResolve } = await deleteBill(language, 1.4);
      for (const label of [t('common.delete'), t('common.cancel')]) {
        const text = screen.getByText(label);
        expect(text.props.numberOfLines).toBeUndefined();
        expect(text.props.adjustsFontSizeToFit).toBeUndefined();
        expect(text.props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);
      }
      expect(screen.getByText(t('bills.add.deleteTitle')).props.maxFontSizeMultiplier).toBe(
        TEXT_CAP.heading,
      );
      expect(screen.getByText(t('bills.add.deleteMessage')).props.maxFontSizeMultiplier).toBe(
        TEXT_CAP.reading,
      );
      expectNoRawText(screen.toJSON() as Json);

      await fireEvent.press(screen.getByRole('button', { name: t('common.cancel') }));
      expect(onResolve).toHaveBeenCalledWith(null);
    },
  );
});

describe('AppLockGate', () => {
  const app = (
    <AppLockGate>
      <Text>Budget</Text>
    </AppLockGate>
  );

  it('asks for Face ID in Spanish, and says it is waiting', async () => {
    setLanguage('es');
    const view = await render(app);

    expect(view.queryByText('Budget')).toBeNull();
    expect(view.getByText('Skip está bloqueada')).toBeTruthy();
    expect(
      view.getByText('Tu presupuesto está protegido con Face ID en este teléfono.'),
    ).toBeTruthy();
    expect(view.getByText('Desbloquear')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);

    let finish: (ok: boolean) => void = () => {};
    mockAuthenticate.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    await fireEvent.press(view.getByRole('button', { name: 'Desbloquear Skip' }));
    expect(view.getByText('Esperando…')).toBeTruthy();

    await act(async () => finish(true));
    expect(view.getByText('Budget')).toBeTruthy();
  });

  // The gate sits above the screens' remount on a language change, so it follows the language itself.
  it('changes to French while it is up', async () => {
    const view = await render(app);
    expect(view.getByText('Skip is locked')).toBeTruthy();

    await act(async () => setLanguage('fr'));

    expect(view.getByText('Skip est verrouillée')).toBeTruthy();
    expect(view.getByText('Ton budget est protégé par Face ID sur ce téléphone.')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Déverrouiller Skip' })).toBeTruthy();
    expect(view.getByText('Déverrouiller')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);
  });
});

describe('BackButton', () => {
  it('reads its default label in the language on screen', async () => {
    setLanguage('es');
    const spanish = await render(<BackButton />);
    expect(spanish.getByLabelText('Volver')).toBeTruthy();
    await spanish.unmount();

    setLanguage('fr');
    const french = await render(<BackButton />);
    expect(french.getByLabelText('Retour')).toBeTruthy();
  });
});

describe('StepFlow', () => {
  const flow = (
    <StepFlow
      title="Agregar un recibo"
      closePrompt="¿Cancelar este recibo?"
      steps={3}
      current={1}
      onBack={() => {}}
      primaryLabel="Continuar"
      onPrimary={() => {}}
    >
      <Text>Paso</Text>
    </StepFlow>
  );

  it('speaks Spanish: back, close, progress and the close question', async () => {
    setLanguage('es');
    mockConfirm.mockResolvedValue(false);
    const view = await render(flow);

    expect(view.getByLabelText('Atrás')).toBeTruthy();
    expect(view.getByLabelText('Paso 2 de 3')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);

    await fireEvent.press(view.getByLabelText('Cerrar'));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '¿Cancelar este recibo?',
        message: 'No se guardará nada de lo que ingresaste aquí.',
        confirmLabel: 'Sí',
        cancelLabel: 'Volver',
      }),
    );
  });

  it('speaks French', async () => {
    setLanguage('fr');
    mockConfirm.mockResolvedValue(false);
    const view = await render(flow);

    expect(view.getByLabelText('Retour')).toBeTruthy();
    expect(view.getByLabelText('Étape 2 sur 3')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);

    await fireEvent.press(view.getByLabelText('Fermer'));
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Rien de ce que tu as saisi ici ne sera enregistré.',
        confirmLabel: 'Oui',
        cancelLabel: 'Revenir',
      }),
    );
  });
});
