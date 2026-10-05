import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SetupScreen from '@/app/setup';
import type { SetupStep } from '@/api/onboarding';

/**
 * The walk-in gate: a returning account (anything saved, or the guide dismissed) passes straight to
 * Home without a frame of setup; a fresh account gets the steps with Continue aimed at the first;
 * and the arrival decision is taken once, so saving a step mid-flow does not yank the screen away.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

// The redirect is asserted through committed output, not a render side effect, which concurrent
// rendering is free to replay or discard.
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      canDismiss: jest.fn(() => false),
      dismissAll: jest.fn(),
    },
    Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>,
  };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    onControl: '#FFFFFF',
    accent: '#6E3E5C',
  }),
}));

// The screen is tested against the hook's contract; its derivations live in onboarding.ts.
const mockGettingStarted = {
  steps: [] as SetupStep[],
  requiredDone: false,
  settled: true,
  dismissed: false,
  doneCount: 0,
  visible: true,
  dismiss: jest.fn(),
};
jest.mock('@/api/onboarding', () => ({
  useGettingStarted: () => ({
    ...mockGettingStarted,
    doneCount: mockGettingStarted.steps.filter((step) => step.done).length,
  }),
}));

function makeSteps(done: {
  salary?: boolean;
  wallet?: boolean;
  bill?: boolean;
  subscription?: boolean;
  receipt?: boolean;
}) {
  return [
    {
      id: 'salary',
      title: 'Set your pay',
      detail: 'd',
      done: Boolean(done.salary),
      href: '/salary',
    },
    {
      id: 'wallet',
      title: 'Add your credit card and bank account',
      detail: 'd',
      done: Boolean(done.wallet),
      href: '/add-card',
    },
    {
      id: 'bill',
      title: 'Add your bills',
      detail: 'd',
      done: Boolean(done.bill),
      href: '/add-bill',
    },
    {
      id: 'subscription',
      title: 'Add your subscriptions',
      detail: 'd',
      done: Boolean(done.subscription),
      href: '/add-subscription',
    },
    {
      id: 'receipt',
      title: 'Add a receipt',
      detail: 'd',
      done: Boolean(done.receipt),
      href: '/add-receipt',
      optional: true,
    },
  ] as SetupStep[];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGettingStarted.steps = makeSteps({});
  mockGettingStarted.requiredDone = false;
  mockGettingStarted.settled = true;
  mockGettingStarted.dismissed = false;
});

it('shows the five steps to a fresh account, with Continue aimed at the first', async () => {
  const screen = await render(<SetupScreen />);

  expect(screen.getByText('Set your pay')).toBeTruthy();
  expect(screen.getByText('Add your credit card and bank account')).toBeTruthy();
  expect(screen.getByText('Add your bills')).toBeTruthy();
  expect(screen.getByText('Add your subscriptions')).toBeTruthy();
  expect(screen.getByText('Add a receipt')).toBeTruthy();
  expect(screen.getByText('Optional')).toBeTruthy();

  await fireEvent.press(screen.getByText('Continue'));
  expect(router.push).toHaveBeenCalledWith('/salary');

  await fireEvent.press(screen.getByText('Set up later'));
  expect(router.replace).toHaveBeenCalledWith('/home');
});

it('opens the bills step on its own page, not straight on the form', async () => {
  const screen = await render(<SetupScreen />);
  mockGettingStarted.steps = makeSteps({ salary: true, wallet: true });
  await screen.rerender(<SetupScreen />);

  await fireEvent.press(screen.getByText('Continue'));
  expect(router.push).toHaveBeenCalledWith('/setup-bills');
});

it('opens the subscriptions step on its own page too', async () => {
  const screen = await render(<SetupScreen />);
  mockGettingStarted.steps = makeSteps({ salary: true, wallet: true, bill: true });
  await screen.rerender(<SetupScreen />);

  await fireEvent.press(screen.getByText('Continue'));
  expect(router.push).toHaveBeenCalledWith('/setup-subscriptions');
});

it('passes a finished account straight to Home without rendering the flow', async () => {
  mockGettingStarted.steps = makeSteps({
    salary: true,
    wallet: true,
    bill: true,
    subscription: true,
  });
  mockGettingStarted.requiredDone = true;

  const screen = await render(<SetupScreen />);

  expect(screen.getByText('redirect:/home')).toBeTruthy();
  expect(screen.queryByText('Set your pay')).toBeNull();
});

it('passes a returning account straight to Home even with required steps left', async () => {
  // Pay, a card and a bill saved but no subscription: a returning user, not a new one.
  mockGettingStarted.steps = makeSteps({ salary: true, wallet: true, bill: true });

  const screen = await render(<SetupScreen />);

  expect(screen.getByText('redirect:/home')).toBeTruthy();
  expect(screen.queryByText('Add your subscriptions')).toBeNull();
});

it('passes an account whose only entry is a receipt straight to Home', async () => {
  mockGettingStarted.steps = makeSteps({ receipt: true });

  const screen = await render(<SetupScreen />);

  expect(screen.getByText('redirect:/home')).toBeTruthy();
});

it('passes a dismissed account straight to Home even with steps undone', async () => {
  mockGettingStarted.dismissed = true;

  const screen = await render(<SetupScreen />);

  expect(screen.getByText('redirect:/home')).toBeTruthy();
});

it('renders nothing until the rows are in, rather than flashing the flow', async () => {
  mockGettingStarted.settled = false;

  const screen = await render(<SetupScreen />);

  expect(screen.queryByText('redirect:/home')).toBeNull();
  expect(screen.queryByText('Set your pay')).toBeNull();
});

it('holds the arrival decision: finishing the bills mid-flow offers the receipt, not Home', async () => {
  const screen = await render(<SetupScreen />);

  mockGettingStarted.steps = makeSteps({
    salary: true,
    wallet: true,
    bill: true,
    subscription: true,
  });
  mockGettingStarted.requiredDone = true;
  await screen.rerender(<SetupScreen />);

  expect(screen.queryByText('redirect:/home')).toBeNull();
  // Twice on purpose: the step row and the footer button both offer it.
  await fireEvent.press(screen.getAllByText('Add a receipt')[1]);
  expect(router.push).toHaveBeenCalledWith('/add-receipt');

  await fireEvent.press(screen.getByText('Skip the receipt — open Skip'));
  expect(router.replace).toHaveBeenCalledWith('/home');
});
