import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { StepFlow } from '@/components/flow/step-flow';
import { BackButton } from '@/components/ui/back-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The dialog's default buttons and the add flows' chrome follow the language. */

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
