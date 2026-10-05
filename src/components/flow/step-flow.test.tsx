import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { BackHandler, Text } from 'react-native';

import { StepFlow } from '@/components/flow/step-flow';

/** Steps are views over one piece of state: the chevron, edge swipe and Android key all step back one, and only step 0 leaves the route. */

const mockBack = jest.fn();
const mockScreenOptions = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
    canGoBack: () => true,
    replace: jest.fn(),
  },
  Stack: {
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions(options);
      return null;
    },
  },
  // The real one runs the effect while the screen is focused; in a test it always is.
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

const QUESTIONS = ['How much did you spend?', undefined, 'When was it?'];

function Flow({ from }: { from: number }) {
  const [step, setStep] = useState(from);
  return (
    <StepFlow
      title="Add a receipt"
      closePrompt="Cancel adding this receipt?"
      steps={3}
      current={step}
      onBack={() => {
        if (step === 0) router.back();
        else setStep((current) => current - 1);
      }}
      question={QUESTIONS[step]}
      primaryLabel="Continue"
      onPrimary={() => {}}
    >
      <Text>{`On step ${step}`}</Text>
    </StepFlow>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  // Spies are installed inside tests; restoring here means a failed assertion cannot leak one.
  jest.restoreAllMocks();
});

/**
 * Mounts the flow and hands back the hardware-back handler it registered. `useFocusEffect` is a
 * passive effect, so only the awaited `act` guarantees it has run; reading the spy straight after
 * `render` raced React's scheduling and flaked.
 */
async function renderFlow(from: number) {
  const add = jest.spyOn(BackHandler, 'addEventListener');

  const view = await render(<Flow from={from} />);
  await act(async () => {});

  const registered = add.mock.calls.filter(([event]) => event === 'hardwareBackPress');
  // Exactly one, so an empty or doubled listener list cannot silently test the wrong flow.
  expect(registered).toHaveLength(1);

  return { view, onHardwareBack: registered[0][1] };
}

describe('the back control', () => {
  it('steps back one instead of leaving the flow, from a later step', async () => {
    const { getByText, getByLabelText } = await render(<Flow from={2} />);
    expect(getByText('On step 2')).toBeTruthy();

    await fireEvent.press(getByLabelText('Back'));

    expect(getByText('On step 1')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('leaves the route only from the first step', async () => {
    const { getByLabelText } = await render(<Flow from={0} />);

    await fireEvent.press(getByLabelText('Back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('sits beside the title, not under it', async () => {
    const { getByText, getByLabelText } = await render(<Flow from={1} />);

    // The controls are siblings of the title, so nothing laid over them can swallow a tap.
    const title = getByText('Add a receipt');
    const back = getByLabelText('Back');
    let node = back.parent;
    while (node) {
      expect(node).not.toBe(title);
      node = node.parent;
    }
  });
});

describe('the gesture and the hardware key', () => {
  it('turns the dismiss gesture off on every step but the first', async () => {
    // One tree at a time: with two mounted, "the last call" is whichever rendered most recently.
    const first = await render(<Flow from={0} />);
    expect(mockScreenOptions).toHaveBeenCalledWith({ gestureEnabled: true });
    expect(mockScreenOptions).not.toHaveBeenCalledWith({ gestureEnabled: false });
    await first.unmount();

    mockScreenOptions.mockClear();

    const later = await render(<Flow from={1} />);
    expect(mockScreenOptions).toHaveBeenCalledWith({ gestureEnabled: false });
    expect(mockScreenOptions).not.toHaveBeenCalledWith({ gestureEnabled: true });
    await later.unmount();
  });

  it('handles the Android back key as one step back, and claims the press', async () => {
    const { view, onHardwareBack } = await renderFlow(2);

    let claimed: boolean | null | undefined;
    await act(async () => {
      claimed = onHardwareBack({ type: 'hardwareBackPress', timeStamp: 0 });
    });

    // True: the press was ours, so the navigator must not also pop the route.
    expect(claimed).toBe(true);
    expect(view.getByText('On step 1')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('leaves the back key alone on the first step, so it exits as it always did', async () => {
    const { onHardwareBack } = await renderFlow(0);

    let claimed: boolean | null | undefined;
    await act(async () => {
      claimed = onHardwareBack({ type: 'hardwareBackPress', timeStamp: 0 });
    });

    expect(claimed).toBe(false);
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('the close control', () => {
  it('asks before leaving, in the words the screen gave it', async () => {
    mockConfirm.mockResolvedValue(true);
    const { getByLabelText } = await render(<Flow from={2} />);

    await fireEvent.press(getByLabelText('Close'));

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cancel adding this receipt?',
        confirmLabel: 'Yes',
        cancelLabel: 'Go back',
      }),
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('stays on the step it was on when told to go back', async () => {
    mockConfirm.mockResolvedValue(false);
    const { getByLabelText, getByText } = await render(<Flow from={2} />);

    await fireEvent.press(getByLabelText('Close'));

    expect(mockBack).not.toHaveBeenCalled();
    expect(getByText('On step 2')).toBeTruthy();
  });
});

describe('the header', () => {
  const insideScroll = (node: { type?: unknown; parent?: unknown } | null): boolean => {
    for (let at = node; at; at = at.parent as typeof node) {
      if (at.type === 'RCTScrollView') return true;
    }
    return false;
  };

  it('sits outside the scrolling content, while the step itself scrolls', async () => {
    const { getByLabelText, getByText } = await render(<Flow from={1} />);

    expect(insideScroll(getByLabelText('Back'))).toBe(false);
    expect(insideScroll(getByLabelText('Close'))).toBe(false);
    expect(insideScroll(getByText('On step 1'))).toBe(true);
  });
});
