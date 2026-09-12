import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { BackHandler, Text } from 'react-native';

import { StepFlow } from '@/components/flow/step-flow';

/**
 * Back, on a flow whose steps are views over one piece of state.
 *
 * The whole point of the stepped flows is that going back keeps what has been
 * typed. Every way back therefore has to mean the same thing: the chevron, the
 * iOS edge swipe and the Android hardware key all step back one, and only step
 * 0 leaves the route. Tia found the chevron doing nothing at all on later
 * steps — the centred title was laid over it and swallowing the tap — while
 * the edge swipe popped the whole flow and lost three steps of typing.
 */

const mockBack = jest.fn();
const mockScreenOptions = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: (...args: unknown[]) => mockBack(...args) },
  Stack: {
    Screen: ({ options }: { options: unknown }) => {
      mockScreenOptions(options);
      return null;
    },
  },
  // The real one runs the effect while the screen is focused; in a test the
  // screen is always focused.
  useFocusEffect: (effect: () => undefined | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

const QUESTIONS = ['How much did you spend?', undefined, 'When was it?'];

/** Wired exactly as the seven add screens wire it. */
function Flow({ from }: { from: number }) {
  const [step, setStep] = useState(from);
  return (
    <StepFlow
      title="Add a receipt"
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
  // Every spy in here is installed inside a test. Restoring them centrally
  // means a failed assertion cannot leave one on `BackHandler` for the next
  // test to read somebody else's call out of.
  jest.restoreAllMocks();
});

/**
 * Mounts the flow and hands back the hardware-back handler it registered.
 *
 * The `await act` is the point. `useFocusEffect` is a passive effect here, and
 * a passive effect is only guaranteed to have run once an async act has been
 * awaited — reading `addEventListener`'s calls straight after `render` is a
 * race with React's own scheduling, which is how this file managed to fail
 * roughly once in seven full runs while passing on its own every time. The
 * handler is then found by filtering for the event name and insisting on
 * exactly one registration, rather than trusting whichever call happened to
 * land last.
 */
async function renderFlow(from: number) {
  const add = jest.spyOn(BackHandler, 'addEventListener');

  const view = await render(<Flow from={from} />);
  // `render` in this version is async and already awaits an `act`, so the
  // commit has happened by here; this second, empty `act` drains anything the
  // commit itself scheduled before the spy is read. Effects are the whole
  // subject of these two cases, so they are waited for on purpose rather than
  // assumed.
  await act(async () => {});

  const registered = add.mock.calls.filter(([event]) => event === 'hardwareBackPress');
  // Exactly one, asserted rather than taken with `.at(-1)`: a listener list
  // that is still empty used to surface as "not a function" against whichever
  // line called it, and one that had two entries would silently test the
  // wrong flow.
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

  it('is not covered by the title, which is laid out across the whole header', async () => {
    const { getByText } = await render(<Flow from={1} />);
    expect(getByText('Add a receipt').props.pointerEvents).toBe('none');
  });
});

describe('the gesture and the hardware key', () => {
  it('turns the dismiss gesture off on every step but the first', async () => {
    // One tree at a time, each one taken down before the next goes up. Two
    // mounted flows both re-render whenever anything above them does, and
    // "the last call" would then be whichever tree rendered most recently
    // rather than the one the assertion is about.
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
