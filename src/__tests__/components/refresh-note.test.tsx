import { render, screen } from '@testing-library/react-native';

import { RefreshNote } from '@/components/ui/refresh-note';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The quiet line under figures whose reload failed while their last answer still shows: nothing at
 * all when everything is fresh, one muted line in the language on screen, and free to wrap at any
 * text size.
 */

const EN = 'Couldn’t refresh · showing your last figures';

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('RefreshNote', () => {
  it('draws nothing when everything is fresh', async () => {
    await render(<RefreshNote show={false} />);
    expect(screen.toJSON()).toBeNull();
  });

  it('says the one line when a reload failed', async () => {
    await render(<RefreshNote show />);
    const note = screen.getByText(EN);
    expect(note.props.accessibilityRole).toBe('text');
  });

  it.each([
    ['es', 'No se pudo actualizar · mostrando tus últimas cifras'],
    ['fr', 'Impossible d’actualiser · voici tes derniers chiffres'],
  ] as const)('says it in %s', async (language, line) => {
    setLanguage(language);
    await render(<RefreshNote show />);
    expect(screen.getByText(line)).toBeTruthy();
    expect(screen.queryByText(EN)).toBeNull();
  });

  it('wraps at large text: a reading ceiling, no line limit, no shrinking', async () => {
    await render(<RefreshNote show />);
    const note = screen.getByText(EN);
    expect(note.props.maxFontSizeMultiplier).toBe(TEXT_CAP.reading);
    expect(note.props.numberOfLines).toBeUndefined();
    expect(note.props.adjustsFontSizeToFit).toBeFalsy();
  });
});
