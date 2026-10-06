import { fireEvent, render } from '@testing-library/react-native';

import FaqScreen from '@/app/faq';

/** Common questions answer only for what this app does. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
}));

const SECTIONS = [
  'Getting started',
  'Your money',
  'Receipts',
  'Loans',
  'Reminders',
  'Skip Pro and billing',
  'Privacy and your data',
];

describe('Common questions', () => {
  it('keeps its sections in order, with none about splitting', async () => {
    const screen = await render(<FaqScreen />);

    const headings = screen
      .getAllByText(new RegExp(`^(${SECTIONS.join('|')})$`))
      .map((node) => node.props.children);
    expect(headings).toEqual(SECTIONS);
    expect(screen.queryByText(/split/i)).toBeNull();
  });

  it('mentions no splitting, friends or groups in any answer', async () => {
    const screen = await render(<FaqScreen />);

    const questions = screen
      .getAllByRole('button')
      .filter((node) => node.props.accessibilityHint === 'Shows the answer');
    expect(questions).toHaveLength(16);
    for (const question of questions) {
      await fireEvent.press(question);
    }

    expect(screen.queryAllByText(/split|friend|\bgroup/i)).toEqual([]);
    // The answers that did name them now end without them.
    expect(screen.getByText(/the loan calculator, Insights, early access/)).toBeTruthy();
    expect(screen.getByText(/the bills, receipts and cards on your account/)).toBeTruthy();
    expect(screen.getByText(/there is no grace copy kept\.$/)).toBeTruthy();
  });
});
