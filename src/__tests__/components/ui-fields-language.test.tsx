import { fireEvent, render } from '@testing-library/react-native';

import { ColorPicker } from '@/components/ui/color-picker';
import { OtpInput } from '@/components/ui/otp-input';
import { SearchField } from '@/components/ui/search-field';
import { SelectField } from '@/components/ui/select-field';
import { SkeletonList } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { FACE_COLORS } from '@/theme/card-colors';

/** The fields' own words follow the language; what they store does not. */

// The skeleton's pulse; reanimated's own mock needs the native worklets module.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withRepeat: (value: unknown) => value,
    withTiming: (value: unknown) => value,
    // The reanimated Babel plugin calls this wherever an inline style reads `.value` (the swatches).
    getUseOfValueInStyleWarning: () => '',
  };
});

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FBF9F7',
    control: '#905479',
  }),
  useTheme: () => ({ scheme: 'light' }),
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

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('TextField', () => {
  const password = (
    <TextField label="Contraseña" value="secret" onChangeText={() => {}} optional secureTextEntry />
  );

  it('marks an optional field and offers to show the password in Spanish', async () => {
    setLanguage('es');
    const view = await render(password);

    expect(view.getByText('(opcional)')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Mostrar contraseña'));
    expect(view.getByLabelText('Ocultar contraseña')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);
  });

  it('does the same in French', async () => {
    setLanguage('fr');
    const view = await render(password);

    expect(view.getByText('(facultatif)')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Afficher le mot de passe'));
    expect(view.getByLabelText('Masquer le mot de passe')).toBeTruthy();
    expectNoRawText(view.toJSON() as Json);
  });
});

describe('SearchField', () => {
  it('clears in the language on screen', async () => {
    setLanguage('es');
    const onChangeText = jest.fn();
    const spanish = await render(
      <SearchField value="luz" onChangeText={onChangeText} placeholder="Buscar" />,
    );
    await fireEvent.press(spanish.getByLabelText('Borrar la búsqueda'));
    expect(onChangeText).toHaveBeenCalledWith('');
    expectNoRawText(spanish.toJSON() as Json);
    await spanish.unmount();

    setLanguage('fr');
    const french = await render(<SearchField value="hydro" onChangeText={() => {}} />);
    expect(french.getByLabelText('Effacer la recherche')).toBeTruthy();
  });
});

describe('SelectField', () => {
  it('says when nothing is chosen', async () => {
    setLanguage('es');
    const spanish = await render(<SelectField label="Categoría" value="" onPress={() => {}} />);
    expect(spanish.getByLabelText('Categoría. Sin definir')).toBeTruthy();
    expectNoRawText(spanish.toJSON() as Json);
    await spanish.unmount();

    setLanguage('fr');
    const french = await render(<SelectField label="Catégorie" value="" onPress={() => {}} />);
    expect(french.getByLabelText('Catégorie. Non défini')).toBeTruthy();
  });
});

describe('OtpInput', () => {
  it('names the code with its length', async () => {
    setLanguage('es');
    const spanish = await render(<OtpInput value="" onChangeText={() => {}} autoFocus={false} />);
    expect(spanish.getByLabelText('Código de verificación de 6 dígitos')).toBeTruthy();
    await spanish.unmount();

    setLanguage('fr');
    const french = await render(<OtpInput value="" onChangeText={() => {}} autoFocus={false} />);
    expect(french.getByLabelText('Code de vérification à 6 chiffres')).toBeTruthy();
  });
});

describe('SkeletonList', () => {
  it('says it is loading', async () => {
    setLanguage('es');
    const spanish = await render(<SkeletonList rows={1} />);
    expect(spanish.getByLabelText('Cargando')).toBeTruthy();
    await spanish.unmount();

    setLanguage('fr');
    const french = await render(<SkeletonList rows={1} />);
    expect(french.getByLabelText('Chargement')).toBeTruthy();
  });
});

describe('ColorPicker', () => {
  it('names each swatch in the language on screen and stores the colour itself', async () => {
    // The swatch style reads `option.value`, which the reanimated plugin mistakes for a shared value.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setLanguage('es');
    const onChange = jest.fn();
    const spanish = await render(<ColorPicker value={FACE_COLORS[0].value} onChange={onChange} />);
    expect(spanish.getByLabelText('Azul')).toBeTruthy();
    expect(spanish.getByLabelText('Verde azulado')).toBeTruthy();
    expectNoRawText(spanish.toJSON() as Json);

    await fireEvent.press(spanish.getByLabelText('Negro'));
    expect(onChange).toHaveBeenCalledWith('#1E1A22');
    await spanish.unmount();

    setLanguage('fr');
    const french = await render(<ColorPicker value={FACE_COLORS[0].value} onChange={() => {}} />);
    expect(french.getByLabelText('Bleu')).toBeTruthy();
    expect(french.getByLabelText('Sarcelle')).toBeTruthy();
    expectNoRawText(french.toJSON() as Json);
    warn.mockRestore();
  });
});
