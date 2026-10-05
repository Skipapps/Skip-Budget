import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { VoiceFab } from '@/components/voice/voice-fab';

/**
 * The round Voice button at the end of the tab bar: who sees it, and where a tap goes. Absent
 * without the speech module; drawn but inert until Pro is known, so a paying person is never sent
 * to the explainer by an early tap; free accounts see the PRO pill and land on the explainer, Pro
 * accounts go straight to the voice page.
 */

// Every icon draws an empty View named after itself, so the test can tell
// which glyph the button wears.
jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    { get: (_, name) => () => React.createElement(View, { testID: `icon-${String(name)}` }) },
  );
});

/** The tabs' focus effects, so a test can play coming back to them. */
const mockFocusEffects = new Set<() => unknown>();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (effect: () => unknown) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      mockFocusEffects.add(effect);
      effect();
      return () => {
        mockFocusEffects.delete(effect);
      };
    }, [effect]);
  },
}));

jest.mock('@/lib/haptics', () => ({ tap: jest.fn() }));

jest.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({
    colors: { control: '#905479', onControl: '#FFFFFF', surface: '#FFFFFF', muted: '#777777' },
    scheme: 'light',
  }),
}));

let mockPro = { pro: false, ready: true };
jest.mock('@/api/pro', () => ({ usePro: () => mockPro }));

let mockSpeechAvailable = true;
jest.mock('@/lib/speech', () => ({ isSpeechAvailable: () => mockSpeechAvailable }));

beforeEach(() => {
  jest.clearAllMocks();
  mockFocusEffects.clear();
  mockPro = { pro: false, ready: true };
  mockSpeechAvailable = true;
});

describe('VoiceFab', () => {
  it('is not there in a build without speech recognition', async () => {
    mockSpeechAvailable = false;
    const screen = await render(<VoiceFab />);
    expect(screen.queryByLabelText('Add by voice')).toBeNull();
  });

  it('is drawn but does nothing until Pro is known', async () => {
    mockPro = { pro: false, ready: false };
    const screen = await render(<VoiceFab />);

    fireEvent.press(screen.getByLabelText('Add by voice'));
    expect(router.push).not.toHaveBeenCalled();
    // No PRO pill either: nobody is told it is locked before that is known.
    expect(screen.queryByText('PRO', { includeHiddenElements: true })).toBeNull();
  });

  it('wears the sound-wave glyph, not a mic', async () => {
    mockPro = { pro: true, ready: true };
    const screen = await render(<VoiceFab />);

    expect(screen.getByTestId('icon-AudioLines', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('icon-Mic', { includeHiddenElements: true })).toBeNull();
  });

  it('shows a free account the PRO pill, and opens the explainer', async () => {
    const screen = await render(<VoiceFab />);
    const fab = screen.getByLabelText('Add by voice');

    expect(fab.props.accessibilityHint).toBe(
      'Part of Skip Pro. Shows what adding by voice can do.',
    );
    // Drawn for the eye; VoiceOver hears "Part of Skip Pro" in the hint instead.
    expect(screen.getByText('PRO', { includeHiddenElements: true })).toBeTruthy();

    fireEvent.press(fab);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/pro-feature', params: { id: 'voice' } });
  });

  it('takes a Pro account straight to the voice page, with no pill', async () => {
    mockPro = { pro: true, ready: true };
    const screen = await render(<VoiceFab />);
    const fab = screen.getByLabelText('Add by voice');

    expect(fab.props.accessibilityHint).toBe(
      'Say a receipt, bill or subscription. You check it before it’s saved.',
    );
    expect(screen.queryByText('PRO', { includeHiddenElements: true })).toBeNull();

    fireEvent.press(fab);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/voice');
  });

  it('opens one page for a double tap, and opens again once the tabs are back', async () => {
    mockPro = { pro: true, ready: true };
    const screen = await render(<VoiceFab />);
    const fab = screen.getByLabelText('Add by voice');

    await act(async () => {
      fireEvent.press(fab);
      fireEvent.press(fab);
    });
    expect(router.push).toHaveBeenCalledTimes(1);

    // Back from the voice page: the tabs are in focus again.
    await act(async () => {
      mockFocusEffects.forEach((effect) => effect());
    });
    await act(async () => {
      fireEvent.press(fab);
    });
    expect(router.push).toHaveBeenCalledTimes(2);
  });
});
