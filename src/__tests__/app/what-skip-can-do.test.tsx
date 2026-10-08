import { render } from '@testing-library/react-native';

import WhatSkipCanDoScreen from '@/app/what-skip-can-do';

/**
 * The welcome's list of what Skip does, shown before there is an account: it promises only what
 * this app can do.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
}));

const ITEMS: [string, string][] = [
  ['No bank connection needed', 'Your bank details always stay private.'],
  ['Scan receipts instantly', 'Read on your phone, never uploaded.'],
  ['Accurate loan tracking', 'Daily interest, just like your bank.'],
  ['Clear, automatic savings', 'Leftovers saved, with the math shown.'],
  ['Reminders before it’s due', 'Bills, renewals and payday, ahead of time.'],
];

describe('What Skip can do', () => {
  it('lists the five things this app does, in order, and nothing about splitting', async () => {
    const screen = await render(<WhatSkipCanDoScreen />);

    expect(screen.getByText('What Skip can do')).toBeTruthy();
    expect(screen.getByText('Simple money tracking, built for privacy.')).toBeTruthy();
    const titles = screen
      .getAllByText(new RegExp(`^(${ITEMS.map(([title]) => title).join('|')})$`))
      .map((node) => node.props.children);
    expect(titles).toEqual(ITEMS.map(([title]) => title));
    expect(screen.queryByText(/split|friend|running total/i)).toBeNull();
  });

  it('reads each line out whole, title and detail together', async () => {
    const screen = await render(<WhatSkipCanDoScreen />);

    for (const [title, detail] of ITEMS) {
      expect(screen.getByLabelText(`${title}. ${detail}`)).toBeTruthy();
    }
  });
});
