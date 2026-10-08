import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import AboutScreen from '@/app/settings/about';
import { SettingsRow } from '@/components/settings/settings-row';
import { t } from '@/i18n';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * A Settings row at large text sizes in every language: title and subtitle wrap between words and
 * the row grows, and a value sits beside them while their widest word fits, moving under the title
 * (title, value, subtitle) once it does not. A switch has no second place, so its row never moves.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '0.1.0' } },
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
type Host = NonNullable<Screen['root']>;

const LANGUAGES: Language[] = ['en', 'es', 'fr'];

function phone(width: number, fontScale: number) {
  const window = { width, height: 812, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

const Icon = () => null;

/** A row's own group box: the nearest view above its title that reports its width. */
function rowBox(title: Host): Host {
  for (let at = title.parent; at; at = at.parent) {
    if (at.props.onLayout && String(at.props.className) === 'w-full') return at;
  }
  throw new Error('no row box');
}

async function lay(node: Host, width: number) {
  await fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });
}

/** One layout pass of one row: each line's room beside the value and its widest word. */
async function layOutRow(
  screen: Screen,
  row: number,
  room: number,
  widest: { title: number; subtitle?: number },
) {
  const hidden = { includeHiddenElements: true };
  const slot = (id: string) => screen.getAllByTestId(`fit-slot-${id}`, hidden);
  const copy = (id: string) => screen.getAllByTestId(`fit-copy-${id}`, hidden);
  await lay(slot('title')[row], room);
  await lay(copy('title')[row], widest.title);
  if (widest.subtitle !== undefined) {
    await lay(slot('subtitle')[0], room);
    await lay(copy('subtitle')[0], widest.subtitle);
  }
  await lay(rowBox(slot('title')[row]), 327);
}

/** The ids of the fit slots in the title's column, top to bottom. */
function column(screen: Screen, title: string): string[] {
  const slot = screen.getByText(title).parent as Host;
  return (slot.parent as Host).children
    .map((child) => (typeof child === 'string' ? '' : String(child.props.testID ?? '')))
    .filter(Boolean);
}

beforeEach(() => {
  resetLocaleForTests();
  phone(375, 1.4);
});
afterAll(() => resetLocaleForTests());

describe.each(LANGUAGES)('About in %s at the largest text size', (language) => {
  it('keeps the version beside its title, and wraps every title and subtitle whole', async () => {
    setLanguage(language);
    const screen = await render(<AboutScreen />);
    // 375pt: 327pt past the margins, less the 40pt icon, two 12pt gaps and "0.1.0" at 1.4x
    // (41pt). "Version" and "Versión" need 80pt.
    await layOutRow(screen, 2, 222, { title: 80.4 });

    expect(column(screen, t('settings.about.version'))).toEqual(['fit-slot-title']);
    expect(screen.getByText('0.1.0')).toBeTruthy();

    for (const line of [
      t('settings.about.privacy'),
      t('settings.about.privacyDetail'),
      t('settings.about.terms'),
      t('settings.about.version'),
      '0.1.0',
    ]) {
      const text = screen.getByText(line);
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.adjustsFontSizeToFit).toBeUndefined();
      expect(text.props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);
    }
    expect(
      screen.getByLabelText(`${t('settings.about.privacy')}. ${t('settings.about.privacyDetail')}`),
    ).toBeTruthy();
  });
});

describe('a row with a value, in every language', () => {
  /**
   * The privacy row's widest words at 1.4x (Montserrat Medium 15pt and Regular 12pt), from the
   * font's advance widths: "Privacy", "privacidad", "confidentialité"; "stored,", "guarda",
   * "conservé,".
   */
  const WIDEST: Record<Language, { title: number; subtitle: number }> = {
    en: { title: 77.66, subtitle: 57.39 },
    es: { title: 112.14, subtitle: 60.75 },
    fr: { title: 154.75, subtitle: 79.25 },
  };

  const row = () => (
    <SettingsRow
      icon={Icon as never}
      title={t('settings.about.privacy')}
      subtitle={t('settings.about.privacyDetail')}
      value="0.1.0"
    />
  );

  // The title's room is what a value leaves of the row: the wider the value, the less.
  it.each([
    ['en', 222, 'beside'],
    ['es', 222, 'beside'],
    ['fr', 222, 'beside'],
    ['en', 120, 'beside'],
    ['es', 120, 'beside'],
    ['fr', 120, 'under'],
    ['en', 100, 'beside'],
    ['es', 100, 'under'],
    ['fr', 100, 'under'],
  ] as const)('%s with %ipt for the title: value %s', async (language, room, expected) => {
    setLanguage(language);
    const screen = await render(row());
    await layOutRow(screen, 0, room, WIDEST[language]);

    // Under the title, it is read in the order drawn: title, value, then the subtitle.
    expect(column(screen, t('settings.about.privacy'))).toEqual(
      expected === 'under'
        ? ['fit-slot-title', 'fit-slot-value', 'fit-slot-subtitle']
        : ['fit-slot-title', 'fit-slot-subtitle'],
    );
    const value = screen.getByText('0.1.0');
    expect(value.props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);
    expect(value.props.numberOfLines).toBeUndefined();
  });

  it('stays under once the title has the room, rather than going back and forth', async () => {
    setLanguage('fr');
    const screen = await render(row());
    await layOutRow(screen, 0, 100, WIDEST.fr);
    await layOutRow(screen, 0, 223, WIDEST.fr);

    expect(column(screen, t('settings.about.privacy'))).toContain('fit-slot-value');
  });
});

describe.each(LANGUAGES)('a row with a switch in %s', (language) => {
  it('keeps the switch beside a title that wraps, whatever the title needs', async () => {
    setLanguage(language);
    const onChange = jest.fn();
    const screen = await render(
      <SettingsRow
        icon={Icon as never}
        title={t('preferences.lock.title')}
        subtitle={t('preferences.lock.caption')}
        toggle={{ value: false, onChange }}
      />,
    );
    await layOutRow(screen, 0, 40, { title: 155, subtitle: 50 });

    expect(column(screen, t('preferences.lock.title'))).toEqual([
      'fit-slot-title',
      'fit-slot-subtitle',
    ]);
    await fireEvent(screen.getByRole('switch'), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
